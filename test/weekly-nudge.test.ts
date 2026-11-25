import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDeterministicNudge, calculateSavingsCapMinor } from "@/domain/nudge";
import { analyzeBiases, calculateDailyRunway } from "@/domain/behavioral-engine";
import { POST as coachRoute } from "@/app/api/coach/nudge/route";
import * as geminiModule from "@/lib/gemini";
import { resetRateLimits } from "@/lib/rate-limit";
import type {
  BiasAnalysisResult,
  BiasMetric,
  RunwayMetrics,
  Transaction,
  UserProfile,
} from "@/domain/types";

const profile: UserProfile = {
  userId: "u1",
  currency: "INR",
  monthlyBudgetMinor: 2000000,
  selfInvestTargetMinor: 400000,
  hourlyRateMinor: 20000,
  createdAt: "2026-01-01T00:00:00Z",
};

function metric(overrides: Partial<BiasMetric> = {}): BiasMetric {
  return {
    name: "Bias",
    score: 0,
    level: "low",
    evidenceSummary: "none",
    count: 0,
    totalAmountMinor: 0,
    percentage: 0,
    interpretation: "",
    ...overrides,
  };
}

function makeBias(overrides: Partial<BiasAnalysisResult> = {}): BiasAnalysisResult {
  return {
    lateNightDrift: metric({ name: "Late-Night Drift" }),
    cashlessNumbness: metric({ name: "Cashless Numbness" }),
    paydayBurn: metric({ name: "Payday Burn" }),
    socialFomo: metric({ name: "Social FOMO" }),
    overallRiskScore: 0,
    deterministicAdvice: ["Steady pacing."],
    analyzedAt: "2026-11-22T10:00:00.000Z",
    ...overrides,
  };
}

const runway: RunwayMetrics = {
  monthlyBudgetMinor: 2000000,
  selfInvestTargetMinor: 400000,
  fixedCommitmentsMinor: 0,
  consumptionBudgetMinor: 1600000,
  monthToDateConsumptionMinor: 240000,
  monthToDateSelfInvestMinor: 100000,
  remainingConsumptionMinor: 1360000,
  daysInMonth: 30,
  currentDayOfMonth: 10,
  daysRemainingInMonth: 21,
  safeToSpendTodayMinor: 64762,
  growthToBurnRatio: 0.42,
  isOverBudget: false,
};

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/coach/nudge", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-stopbucks-guest": "1",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("Deterministic weekly nudge", () => {
  it("selects the highest-impact bias as the primary bias", () => {
    const nudge = buildDeterministicNudge(
      makeBias({
        lateNightDrift: metric({ score: 20, level: "low", totalAmountMinor: 10000 }),
        socialFomo: metric({
          score: 80,
          level: "high",
          totalAmountMinor: 200000,
          percentage: 40,
        }),
      })
    );
    expect(nudge.primary_bias).toBe("Social FOMO");
    expect(nudge.three_day_experiment.length).toBeGreaterThan(20);
    expect(nudge.headline.split(/\s+/).length).toBeLessThanOrEqual(15);
    expect(nudge.projected_savings_minor).toBe(40000); // 20% of 200,000 rounded
  });

  it("returns a calm plan with zero savings when every bias is low", () => {
    const nudge = buildDeterministicNudge(makeBias());
    expect(nudge.primary_bias).toBe("Balanced habits");
    expect(nudge.projected_savings_minor).toBe(0);
  });

  it("is deterministic and never returns negative savings", () => {
    const bias = makeBias({
      cashlessNumbness: metric({
        score: 55,
        level: "moderate",
        totalAmountMinor: 12345,
      }),
    });
    const first = buildDeterministicNudge(bias);
    const second = buildDeterministicNudge(bias);
    expect(first).toEqual(second);
    expect(first.projected_savings_minor).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(first.projected_savings_minor)).toBe(true);
  });

  it("keeps headlines within the 15-word limit", () => {
    const bias = makeBias({
      paydayBurn: metric({ score: 70, level: "high", totalAmountMinor: 10000 }),
    });
    expect(buildDeterministicNudge(bias).headline.split(/\s+/).length).toBeLessThanOrEqual(15);
  });
});

describe("POST /api/coach/nudge authorization & security", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("returns 401 Unauthorized when neither session nor guest header is provided", async () => {
    const unauthReq = new Request("http://localhost/api/coach/nudge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        week_key: "2026-W47",
        currency: "INR",
        bias_analysis: makeBias(),
        runway_metrics: runway,
      }),
    });
    const response = await coachRoute(unauthReq);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain("Unauthorized");
  });

  it("permits access with x-stopbucks-guest: 1 header", async () => {
    const response = await coachRoute(
      makeRequest({
        week_key: "2026-W47",
        currency: "INR",
        bias_analysis: makeBias(),
        runway_metrics: runway,
      })
    );
    expect(response.status).toBe(200);
  });
});

describe("POST /api/coach/nudge (Gemini unavailable)", () => {
  beforeEach(() => {
    resetRateLimits();
    delete process.env.GEMINI_API_KEY;
    vi.restoreAllMocks();
  });

  it("returns a validated deterministic nudge", async () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        userId: "u1",
        amountMinor: 200000,
        note: "Club dinner",
        triggerTag: "social_fomo",
        paymentMode: "cashless",
        loggedAt: "2026-11-05T20:00:00Z",
        createdAt: "2026-11-05T20:00:00Z",
      },
    ];
    const bias = analyzeBiases(profile, transactions, "UTC");

    const response = await coachRoute(
      makeRequest({
        week_key: "2026-W47",
        currency: "INR",
        bias_analysis: bias,
        runway_metrics: calculateDailyRunway(profile, transactions, new Date(Date.UTC(2026, 10, 10, 12))),
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.source).toBe("fallback");
    expect(typeof payload.headline).toBe("string");
    expect(payload.headline.length).toBeGreaterThan(0);
    expect(Number.isInteger(payload.projected_savings_minor)).toBe(true);
    expect(payload.projected_savings_minor).toBeGreaterThanOrEqual(0);
    expect(payload.primary_bias.length).toBeGreaterThan(0);
  });

  it("rejects an invalid ISO week key", async () => {
    const response = await coachRoute(
      makeRequest({
        week_key: "week 47",
        currency: "INR",
        bias_analysis: makeBias(),
        runway_metrics: runway,
      })
    );
    expect(response.status).toBe(400);
  });

  it("rejects an unsupported currency and malformed metrics", async () => {
    const currency = await coachRoute(
      makeRequest({
        week_key: "2026-W47",
        currency: "EUR",
        bias_analysis: makeBias(),
        runway_metrics: runway,
      })
    );
    expect(currency.status).toBe(400);

    const malformed = await coachRoute(
      makeRequest({
        week_key: "2026-W47",
        currency: "INR",
        bias_analysis: { lateNightDrift: { score: "high" } },
        runway_metrics: runway,
      })
    );
    expect(malformed.status).toBe(400);
  });
});

describe("POST /api/coach/nudge with mocked Gemini (TEST-003)", () => {
  beforeEach(() => {
    resetRateLimits();
    process.env.GEMINI_API_KEY = "test-fake-key";
    vi.restoreAllMocks();
  });

  it("returns source: gemini with savings strictly capped by domain cap", async () => {
    const biasWithLateNight = makeBias({
      lateNightDrift: metric({
        name: "Late-Night Drift",
        score: 75,
        level: "high",
        totalAmountMinor: 50000, // 500 INR
        count: 3,
      }),
    });

    // Gemini proposes exorbitant savings of 1,000,000 units
    vi.spyOn(geminiModule, "generateStructuredJson").mockResolvedValueOnce({
      headline: "Pause midnight food orders for three days",
      primary_bias: "Late-Night Drift",
      three_day_experiment: "Brew warm tea after 10 PM instead of opening delivery apps.",
      projected_savings: "1000000", // Hallucinated excessive savings
    });

    const response = await coachRoute(
      makeRequest({
        week_key: "2026-W47",
        currency: "INR",
        bias_analysis: biasWithLateNight,
        runway_metrics: runway,
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.source).toBe("gemini");
    expect(payload.headline).toBe("Pause midnight food orders for three days");
    // Verify savings was capped: maximum savings cannot exceed calculateSavingsCapMinor(50000, runway)
    const expectedCap = calculateSavingsCapMinor(50000, runway);
    expect(payload.projected_savings_minor).toBe(expectedCap);
    expect(payload.projected_savings_minor).toBeLessThan(100000000);
  });

  it("falls back to deterministic nudge cleanly when Gemini throws an error", async () => {
    vi.spyOn(geminiModule, "generateStructuredJson").mockRejectedValueOnce(
      new Error("Gemini quota exceeded")
    );

    const response = await coachRoute(
      makeRequest({
        week_key: "2026-W47",
        currency: "INR",
        bias_analysis: makeBias({
          socialFomo: metric({
            score: 70,
            level: "high",
            totalAmountMinor: 100000,
          }),
        }),
        runway_metrics: runway,
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.source).toBe("fallback");
    expect(payload.primary_bias).toBe("Social FOMO");
    expect(payload.projected_savings_minor).toBe(20000);
  });
});
