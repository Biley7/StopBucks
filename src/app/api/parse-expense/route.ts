/**
 * POST /api/parse-expense
 *
 * Turns a natural-language expense description into structured transaction
 * fields. Gemini is attempted first; the deterministic parser is the guaranteed
 * fallback so the endpoint works without GEMINI_API_KEY.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ExpenseParseError,
  MAX_EXPENSE_INPUT_LENGTH,
  amountAppearsInInput,
  buildCleanNote,
  inferTriggerTag,
  parseAmountStringToMinor,
  parseExpenseFallback,
} from "@/domain/expense-parser";
import { CURRENCY_CONFIGS } from "@/domain/currency";
import type { CurrencyCode } from "@/domain/types";
import {
  parseExpenseRequestSchema,
  parseExpenseResponseSchema,
  paymentModeSchema,
  triggerTagSchema,
} from "@/lib/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { authorizeAiRoute } from "@/lib/route-auth";
import { Type, generateStructuredJson, isGeminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const geminiExpenseSchema = z.object({
  amount: z.string().trim().min(1),
  note: z.string().trim().min(1).max(MAX_EXPENSE_INPUT_LENGTH),
  trigger: triggerTagSchema,
  payment_mode: paymentModeSchema,
});

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    amount: {
      type: Type.STRING,
      description:
        "The exact amount the user wrote, as a plain decimal string with at most two decimals (e.g. \"180\", \"1499.50\").",
    },
    note: {
      type: Type.STRING,
      description: "A short clean description of what was bought, without the amount.",
    },
    trigger: {
      type: Type.STRING,
      enum: ["need", "convenience", "stress_late_night", "social_fomo", "invest_self"],
      description: "The most likely psychological spending trigger.",
    },
    payment_mode: {
      type: Type.STRING,
      enum: ["cash", "cashless"],
      description: "Payment mode. Default to cashless unless cash is explicit.",
    },
  },
  required: ["amount", "note", "trigger", "payment_mode"],
};

function buildPrompt(input: string, currency: CurrencyCode): string {
  const config = CURRENCY_CONFIGS[currency];
  return [
    "You extract structured expense data for a student behavioral-finance app.",
    `The student's currency is ${config.code} (${config.displayName}).`,
    "",
    "Rules:",
    "- Only use an amount that literally appears in the description below. Never invent, infer, round or estimate an amount.",
    "- If no amount is present, return an empty amount string.",
    "- Keep the note short, neutral and under 280 characters, without the amount.",
    "- Choose the single most likely trigger from: need, convenience, stress_late_night, social_fomo, invest_self.",
    "- Use payment_mode cash only if the description explicitly says cash; otherwise cashless.",
    "",
    `Description: ${JSON.stringify(input)}`,
  ].join("\n");
}


async function parseWithGemini(input: string, currency: CurrencyCode) {
  if (!isGeminiConfigured()) return null;

  let raw: unknown;
  try {
    raw = await generateStructuredJson(
      buildPrompt(input, currency),
      RESPONSE_SCHEMA
    );
  } catch {
    return null;
  }
  if (!raw) return null;

  const parsed = geminiExpenseSchema.safeParse(raw);
  if (!parsed.success) return null;

  const amountMinor = parseAmountStringToMinor(parsed.data.amount);
  if (amountMinor === null) return null;
  if (!amountAppearsInInput(amountMinor, input)) return null;

  const candidate = {
    amount_minor: amountMinor,
    note: buildCleanNote(parsed.data.note, parsed.data.amount),
    suggested_trigger: parsed.data.trigger,
    suggested_payment_mode: parsed.data.payment_mode,
    source: "gemini" as const,
  };

  const validated = parseExpenseResponseSchema.safeParse(candidate);
  return validated.success ? validated.data : null;
}

export async function POST(request: Request) {
  // Authorization check: requires Supabase session or explicit Guest Sandbox header
  const auth = await authorizeAiRoute(request, "parse-expense");
  if (!auth.authorized) {
    return NextResponse.json(
      { error: "Unauthorized. An authenticated session or Guest Sandbox header is required." },
      { status: 401 }
    );
  }

  // Rate limiting: authenticated users get 30/min, guest IP gets 15/min
  const limit = auth.isGuest ? 15 : 30;
  const rate = checkRateLimit(auth.rateLimitKey, limit, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many parsing requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = parseExpenseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 }
    );
  }

  const { input, currency } = parsed.data;

  const geminiResult = await parseWithGemini(input, currency);
  if (geminiResult) {
    return NextResponse.json(geminiResult);
  }

  try {
    const fallback = parseExpenseFallback(input);
    const response = parseExpenseResponseSchema.parse({
      amount_minor: fallback.amountMinor,
      note: fallback.note,
      suggested_trigger: fallback.suggestedTrigger,
      suggested_payment_mode: fallback.suggestedPaymentMode,
      source: "fallback",
    });
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ExpenseParseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "no_amount" ? 422 : 400 }
      );
    }

    // Last-resort deterministic inference so the UI always gets a usable error.
    return NextResponse.json(
      {
        error: "Could not parse this expense. Please enter the details manually.",
        code: "no_amount",
        suggested_trigger: inferTriggerTag(input),
      },
      { status: 422 }
    );
  }
}
