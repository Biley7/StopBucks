/**
 * StopBucks Deterministic Weekly Coach
 *
 * Rule-based behavioral experiment generator. This is the authoritative
 * fallback when Gemini is unavailable, and it must stay independent of the
 * API route so it can be unit tested without network access.
 *
 * Every value is derived from the supplied BiasAnalysisResult; nothing random.
 */

import type { BiasAnalysisResult, BiasMetric, RunwayMetrics } from "./types";

export interface DeterministicNudge {
  headline: string;
  primary_bias: string;
  three_day_experiment: string;
  projected_savings_minor: number;
}

export interface BiasCandidate {
  key: "lateNightDrift" | "cashlessNumbness" | "paydayBurn" | "socialFomo";
  metric: BiasMetric;
}

export const BIAS_DISPLAY_NAMES: Record<BiasCandidate["key"], string> = {
  lateNightDrift: "Late-Night Drift",
  cashlessNumbness: "Cashless Numbness",
  paydayBurn: "Payday Windfall Burn",
  socialFomo: "Social FOMO",
};

export const BIAS_EXPERIMENTS: Record<BiasCandidate["key"], string> = {
  lateNightDrift:
    "For three nights, park any delivery or craving order in the 48-Hour Vault before 10 PM and review it the next morning instead of checking out.",
  cashlessNumbness:
    "Set a small daily cashless limit on your payment app and route every sub-₹100 tap through a 10-minute pause before approving it.",
  paydayBurn:
    "Split the remaining monthly consumption budget across the weeks left, then move each week's allowance into a separate envelope before spending.",
  socialFomo:
    "Plan the next group outing two days in advance with a fixed per-person budget, and suggest a student-discount or campus venue as the default.",
};

export const BIAS_HEADLINES: Record<BiasCandidate["key"], string> = {
  lateNightDrift: "Your late-night orders are quietly shaping tomorrow's runway",
  cashlessNumbness: "Small cashless taps are adding up faster than they feel",
  paydayBurn: "Your month front-loads spending before the runway settles",
  socialFomo: "Social plans are claiming more runway than you planned",
};

export const CALM_HEADLINE = "Your runway is steady; protect the habits keeping it that way";

export function pickPrimaryBias(bias: BiasAnalysisResult): BiasCandidate {
  const candidates: BiasCandidate[] = [
    { key: "lateNightDrift", metric: bias.lateNightDrift },
    { key: "cashlessNumbness", metric: bias.cashlessNumbness },
    { key: "paydayBurn", metric: bias.paydayBurn },
    { key: "socialFomo", metric: bias.socialFomo },
  ];

  return candidates.reduce((best, candidate) =>
    candidate.metric.score > best.metric.score ? candidate : best
  );
}

export function roundToNearestHundred(minorUnits: number): number {
  return Math.max(0, Math.round(minorUnits / 100) * 100);
}

/**
 * Calculates a realistic projected savings cap based on the primary bias exposure,
 * additionally bounded by remaining consumption budget if runway metrics are supplied.
 * Used identically by both Gemini and deterministic nudge paths to prevent contradictory promises.
 */
export function calculateSavingsCapMinor(
  primaryExposureMinor: number,
  runway?: RunwayMetrics | null
): number {
  const exposureCap = roundToNearestHundred(primaryExposureMinor * 0.2);
  if (runway && typeof runway.remainingConsumptionMinor === "number") {
    const remainingBudget = Math.max(0, runway.remainingConsumptionMinor);
    return Math.min(exposureCap, remainingBudget);
  }
  return exposureCap;
}

export function buildDeterministicNudge(
  bias: BiasAnalysisResult,
  runway?: RunwayMetrics | null
): DeterministicNudge {
  const primary = pickPrimaryBias(bias);

  if (primary.metric.score < 30) {
    return {
      headline: CALM_HEADLINE,
      primary_bias: "Balanced habits",
      three_day_experiment:
        "For three days, note one purchase each evening that felt genuinely worth it. Keep reinforcing the triggers behind those choices.",
      projected_savings_minor: 0,
    };
  }

  // A realistic rescue target: bounded by 20% of primary bias exposure and remaining budget
  const projected_savings_minor = calculateSavingsCapMinor(
    primary.metric.totalAmountMinor,
    runway
  );

  return {
    headline: BIAS_HEADLINES[primary.key],
    primary_bias: BIAS_DISPLAY_NAMES[primary.key],
    three_day_experiment: BIAS_EXPERIMENTS[primary.key],
    projected_savings_minor,
  };
}
