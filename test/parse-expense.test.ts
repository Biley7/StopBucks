import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ExpenseParseError,
  amountAppearsInInput,
  buildCleanNote,
  extractAmountMinor,
  inferTriggerTag,
  parseAmountStringToMinor,
  parseExpenseFallback,
} from "@/domain/expense-parser";
import { parseExpenseRequestSchema } from "@/lib/schemas";
import { POST as parseExpenseRoute } from "@/app/api/parse-expense/route";
import * as geminiModule from "@/lib/gemini";
import { resetRateLimits } from "@/lib/rate-limit";

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/parse-expense", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-stopbucks-guest": "1",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("StopBucks Expense Parser — deterministic fallback", () => {
  it("extracts an integer amount as minor units", () => {
    const parsed = parseExpenseFallback("180 late night momos and iced tea");
    expect(parsed.amountMinor).toBe(18000);
    expect(parsed.note).toBe("late night momos and iced tea");
    expect(parsed.suggestedTrigger).toBe("stress_late_night");
    expect(parsed.suggestedPaymentMode).toBe("cashless");
  });

  it("prefers a final plausible amount over an item quantity and detects cash", () => {
    expect(parseExpenseFallback("2 coffees 80").amountMinor).toBe(8000);
    expect(parseExpenseFallback("3 beers 900").amountMinor).toBe(90000);
    expect(parseExpenseFallback("500 cash lunch").suggestedPaymentMode).toBe("cash");
    expect(() => parseExpenseFallback("1 coffee")).toThrow(ExpenseParseError);
  });

  it("extracts a decimal amount without floating point error", () => {
    expect(parseExpenseFallback("249.99 swiggy dinner").amountMinor).toBe(24999);
    expect(parseExpenseFallback("19.9 coffee").amountMinor).toBe(1990);
    expect(parseExpenseFallback("0.01 pen").amountMinor).toBe(1);
  });

  it("supports common thousands separators", () => {
    expect(parseExpenseFallback("1,499 udemy react course").amountMinor).toBe(149900);
    expect(parseExpenseFallback("2,00,000 tuition fee").amountMinor).toBe(20000000);
    expect(parseExpenseFallback("1,499.50 gym membership").amountMinor).toBe(149950);
  });

  it("infers each trigger keyword family", () => {
    expect(inferTriggerTag("udemy certification course")).toBe("invest_self");
    expect(inferTriggerTag("midnight stress craving")).toBe("stress_late_night");
    expect(inferTriggerTag("movie with friends")).toBe("social_fomo");
    expect(inferTriggerTag("uber to campus")).toBe("convenience");
    expect(inferTriggerTag("stationery for class")).toBe("need");
  });

  it("defaults to need and cashless when nothing matches", () => {
    const parsed = parseExpenseFallback("500 dinner with friends");
    expect(parsed.suggestedTrigger).toBe("social_fomo");
    expect(parsed.suggestedPaymentMode).toBe("cashless");

    const plain = parseExpenseFallback("120 groceries");
    expect(plain.suggestedTrigger).toBe("need");
    expect(plain.suggestedPaymentMode).toBe("cashless");
  });

  it("cleans currency tokens and punctuation out of the note", () => {
    expect(buildCleanNote("₹250 uber ride to college", "250")).toBe("uber ride to college");
    expect(parseExpenseFallback("80 coffee before class.").note).toBe(
      "coffee before class"
    );
  });

  it("rejects empty input", () => {
    expect(() => parseExpenseFallback("   ")).toThrow(ExpenseParseError);
    try {
      parseExpenseFallback("");
    } catch (error) {
      expect((error as ExpenseParseError).code).toBe("empty_input");
    }
  });

  it("rejects input without a usable amount instead of inventing one", () => {
    expect(() => parseExpenseFallback("coffee with friends")).toThrow(ExpenseParseError);
    expect(() => parseExpenseFallback("0 coffee")).toThrow(ExpenseParseError);
    expect(extractAmountMinor("no numbers here")).toBeNull();
    expect(parseAmountStringToMinor("12.345")).toBeNull();
    expect(parseAmountStringToMinor("-20")).toBeNull();
    expect(parseAmountStringToMinor("abc")).toBeNull();
  });

  it("validates request payloads with Zod", () => {
    expect(parseExpenseRequestSchema.safeParse({ input: "80 coffee", currency: "INR" }).success).toBe(true);
    expect(parseExpenseRequestSchema.safeParse({ input: "", currency: "INR" }).success).toBe(false);
    expect(parseExpenseRequestSchema.safeParse({ input: "80 coffee", currency: "EUR" }).success).toBe(false);
    expect(
      parseExpenseRequestSchema.safeParse({ input: "a".repeat(281), currency: "INR" }).success
    ).toBe(false);
  });
});

describe("Anti-hallucination check (amountAppearsInInput)", () => {
  it("rejects substring digits that lack proper token boundaries", () => {
    // 180 minor (18000) should not match "1800 chai"
    expect(amountAppearsInInput(18000, "1800 chai")).toBe(false);
    // 18 minor (1800) should not match "1800 chai"
    expect(amountAppearsInInput(1800, "1800 chai")).toBe(false);
    // 180 minor (18000) should not match "price is 2180"
    expect(amountAppearsInInput(18000, "price is 2180")).toBe(false);
  });

  it("accepts exact token boundary amounts with or without symbols", () => {
    expect(amountAppearsInInput(18000, "180 chai")).toBe(true);
    expect(amountAppearsInInput(18000, "₹180 chai")).toBe(true);
    expect(amountAppearsInInput(18000, "chai 180/-")).toBe(true);
    expect(amountAppearsInInput(18000, "lunch 180.00")).toBe(true);
    expect(amountAppearsInInput(180000, "1,800 dinner")).toBe(true);
  });
});

describe("POST /api/parse-expense authorization & security", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("returns 401 Unauthorized when neither Supabase session nor guest header is present", async () => {
    const unauthReq = new Request("http://localhost/api/parse-expense", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: "180 chai", currency: "INR" }),
    });
    const response = await parseExpenseRoute(unauthReq);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain("Unauthorized");
  });

  it("allows requests with x-stopbucks-guest: 1 header", async () => {
    const response = await parseExpenseRoute(
      makeRequest({ input: "180 chai", currency: "INR" })
    );
    expect(response.status).toBe(200);
  });
});

describe("POST /api/parse-expense (Gemini unavailable)", () => {
  beforeEach(() => {
    resetRateLimits();
    delete process.env.GEMINI_API_KEY;
    vi.restoreAllMocks();
  });

  it("returns a validated deterministic fallback response", async () => {
    const response = await parseExpenseRoute(
      makeRequest({ input: "180 late night momos and iced tea", currency: "INR" })
    );
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload).toMatchObject({
      amount_minor: 18000,
      suggested_trigger: "stress_late_night",
      suggested_payment_mode: "cashless",
      source: "fallback",
    });
    expect(payload.note).toContain("momos");
  });

  it("rejects invalid payloads with 400", async () => {
    const empty = await parseExpenseRoute(makeRequest({ input: "", currency: "INR" }));
    expect(empty.status).toBe(400);

    const currency = await parseExpenseRoute(
      makeRequest({ input: "80 coffee", currency: "EUR" })
    );
    expect(currency.status).toBe(400);

    const malformed = await parseExpenseRoute(
      makeRequest("not-json")
    );
    expect(malformed.status).toBe(400);
  });

  it("returns 422 with a clear message when no amount is present", async () => {
    const response = await parseExpenseRoute(
      makeRequest({ input: "dinner with friends", currency: "INR" })
    );
    expect(response.status).toBe(422);
    const payload = await response.json();
    expect(payload.code).toBe("no_amount");
    expect(typeof payload.error).toBe("string");
  });
});

describe("POST /api/parse-expense with mocked Gemini (TEST-003)", () => {
  beforeEach(() => {
    resetRateLimits();
    process.env.GEMINI_API_KEY = "test-fake-key";
    vi.restoreAllMocks();
  });

  it("returns source: gemini when Gemini returns a valid parse matching the input", async () => {
    vi.spyOn(geminiModule, "generateStructuredJson").mockResolvedValueOnce({
      amount: "180",
      note: "late night momos",
      trigger: "stress_late_night",
      payment_mode: "cashless",
    });

    const response = await parseExpenseRoute(
      makeRequest({ input: "180 late night momos", currency: "INR" })
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.source).toBe("gemini");
    expect(payload.amount_minor).toBe(18000);
    expect(payload.suggested_trigger).toBe("stress_late_night");
    expect(payload.suggested_payment_mode).toBe("cashless");
  });

  it("falls back to deterministic parse when Gemini hallucinates an amount not in input", async () => {
    // Input is "1800 chai", but Gemini returns hallucinated amount "180"
    vi.spyOn(geminiModule, "generateStructuredJson").mockResolvedValueOnce({
      amount: "180",
      note: "chai",
      trigger: "need",
      payment_mode: "cashless",
    });

    const response = await parseExpenseRoute(
      makeRequest({ input: "1800 chai", currency: "INR" })
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    // Because 180 was hallucinated for 1800, strict check fails -> falls back to deterministic parse
    expect(payload.source).toBe("fallback");
    expect(payload.amount_minor).toBe(180000); // correctly extracted from 1800 chai
  });

  it("falls back cleanly without throwing when Gemini returns malformed response or throws", async () => {
    vi.spyOn(geminiModule, "generateStructuredJson").mockRejectedValueOnce(
      new Error("Gemini upstream service unavailable")
    );

    const response = await parseExpenseRoute(
      makeRequest({ input: "250 swiggy lunch", currency: "INR" })
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.source).toBe("fallback");
    expect(payload.amount_minor).toBe(25000);
  });
});
