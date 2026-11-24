/**
 * POST /api/coach/nudge
 *
 * Generates one weekly behavioral experiment. Only aggregated behavioral
 * metrics are sent to Gemini — never raw transactions or identifiers.
 * A deterministic nudge is always available as a fallback.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildDeterministicNudge,
  calculateSavingsCapMinor,
  pickPrimaryBias,
} from "@/domain/nudge";
import type { BiasAnalysisResult, CurrencyCode, RunwayMetrics } from "@/domain/types";
import { coachNudgeRequestSchema, coachNudgeResponseSchema } from "@/lib/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { authorizeAiRoute } from "@/lib/route-auth";
import { Type, generateStructuredJson, isGeminiConfigured } from "@/lib/gemini";
import { parseAmountStringToMinor } from "@/domain/expense-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HEADLINE_WORDS = 15;

const geminiNudgeSchema = z.object({
  headline: z.string().trim().min(1).max(160),
  primary_bias: z.string().trim().min(1).max(80),
  three_day_experiment: z.string().trim().min(1).max(600),
  projected_savings: z.string().trim().min(1),
});

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: {
      type: Type.STRING,
      description: "Calm, specific headline of at most 15 words.",
    },
    primary_bias: {
      type: Type.STRING,
      description: "The single highest-impact bias name from the provided scores.",
    },
    three_day_experiment: {
      type: Type.STRING,
      description:
        "One concrete three-day habit experiment a college student can actually complete.",
    },
    projected_savings: {
      type: Type.STRING,
      description:
        "Realistic non-negative projected savings in major currency units as a plain decimal string.",
    },
  },
  required: ["headline", "primary_bias", "three_day_experiment", "projected_savings"],
};

function limitHeadlineWords(headline: string): string {
  const words = headline.trim().split(/\s+/);
  if (words.length <= MAX_HEADLINE_WORDS) return headline.trim();
  return words.slice(0, MAX_HEADLINE_WORDS).join(" ");
}

function buildPrompt(
  currency: CurrencyCode,
  bias: BiasAnalysisResult,
  runway: RunwayMetrics
): string {
  const metrics = {
    currency,
    overall_risk_score: bias.overallRiskScore,
    biases: [
      { name: "Late-Night Drift", score: bias.lateNightDrift.score, level: bias.lateNightDrift.level },
      { name: "Cashless Numbness", score: bias.cashlessNumbness.score, level: bias.cashlessNumbness.level },
      { name: "Payday Windfall Burn", score: bias.paydayBurn.score, level: bias.paydayBurn.level },
      { name: "Social FOMO", score: bias.socialFomo.score, level: bias.socialFomo.level },
    ],
    consumption_budget_major: runway.consumptionBudgetMinor / 100,
    consumption_spent_major: runway.monthToDateConsumptionMinor / 100,
    days_remaining_in_month: runway.daysRemainingInMonth,
    safe_to_spend_today_major: runway.safeToSpendTodayMinor / 100,
  };

  return [
    "You are a calm, non-judgmental behavioral finance coach for a college student.",
    "Write one small weekly experiment that helps them notice an impulse pattern.",
    "Never shame the student. No generic motivational paragraphs. No emojis.",
    "Ground everything in the aggregated metrics below; do not invent spending figures.",
    "",
    "Metrics (aggregated only, no personal data):",
    JSON.stringify(metrics),
    "",
    "Return: headline (max 15 words), primary_bias (highest score), three_day_experiment (one specific action), projected_savings (realistic, no more than 20% of monthly consumption budget).",
  ].join("\n");
}

async function generateWithGemini(
  currency: CurrencyCode,
  bias: BiasAnalysisResult,
  runway: RunwayMetrics
) {
  if (!isGeminiConfigured()) return null;

  let raw: unknown;
  try {
    raw = await generateStructuredJson(
      buildPrompt(currency, bias, runway),
      RESPONSE_SCHEMA
    );
  } catch {
    return null;
  }
  if (!raw) return null;

  const parsed = geminiNudgeSchema.safeParse(raw);
  if (!parsed.success) return null;

  const projectedSavingsMinor =
    parseAmountStringToMinor(parsed.data.projected_savings) ?? 0;

  // Use the exact same cap formula as buildDeterministicNudge so Gemini and fallback
  // never promise contradictory savings numbers.
  const primaryCandidate = pickPrimaryBias(bias);
  const capMinor = calculateSavingsCapMinor(
    primaryCandidate.metric.totalAmountMinor,
    runway
  );
  const safeSavingsMinor = Math.min(projectedSavingsMinor, capMinor);

  const candidate = {
    headline: limitHeadlineWords(parsed.data.headline),
    primary_bias: parsed.data.primary_bias,
    three_day_experiment: parsed.data.three_day_experiment,
    projected_savings_minor: safeSavingsMinor,
  };

  const validated = coachNudgeResponseSchema.safeParse(candidate);
  return validated.success ? validated.data : null;
}

export async function POST(request: Request) {
  // Authorization check: requires Supabase session or explicit Guest Sandbox header
  const auth = await authorizeAiRoute(request, "coach-nudge");
  if (!auth.authorized) {
    return NextResponse.json(
      { error: "Unauthorized. An authenticated session or Guest Sandbox header is required." },
      { status: 401 }
    );
  }

  // Rate limiting: authenticated users get 10/min, guest IP gets 5/min
  const limit = auth.isGuest ? 5 : 10;
  const rate = checkRateLimit(auth.rateLimitKey, limit, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many coach requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = coachNudgeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 }
    );
  }

  const { currency, bias_analysis, runway_metrics } = parsed.data;

  const geminiResult = await generateWithGemini(currency, bias_analysis, runway_metrics);
  if (geminiResult) {
    return NextResponse.json({ ...geminiResult, source: "gemini" });
  }

  const fallback = buildDeterministicNudge(bias_analysis, runway_metrics);
  const validatedFallback = coachNudgeResponseSchema.parse(fallback);

  return NextResponse.json({ ...validatedFallback, source: "fallback" });
}
