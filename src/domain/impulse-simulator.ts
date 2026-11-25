/**
 * StopBucks Impulse Purchase Decision Simulator
 * Pure, deterministic domain calculation: No React, No Supabase, No external network.
 *
 * Answers four core behavioral finance questions:
 * 1. How much of my remaining daily runway would this purchase consume?
 * 2. How much would my Safe-to-Spend change?
 * 3. How many hours of work does this purchase represent?
 * 4. What could this money become over four years if invested instead?
 */

import { convertTo4YearCompounded, convertToWorkHours } from "./currency";
import type { RunwayMetrics, TriggerTag, UserProfile } from "./types";

export type ImpulseSeverity =
  | "protected_growth"
  | "low_impact"
  | "moderate_hit"
  | "runway_shock";

export interface SimulateImpulseImpactInput {
  itemName: string;
  priceMinor: number;
  triggerTag: TriggerTag;
  profile: Pick<
    UserProfile,
    "currency" | "hourlyRateMinor" | "monthlyBudgetMinor" | "selfInvestTargetMinor"
  >;
  runwayMetrics: RunwayMetrics;
}

export interface ImpulseSimulationResult {
  itemName: string;
  priceMinor: number;
  triggerTag: TriggerTag;
  daysOfRunwayConsumed: number | null;
  safeToSpendAfterMinor: number;
  dailyDropMinor: number;
  isProtectedSelfInvestment: boolean;
  workHours: number | null;
  compounded4YearMinor: number;
  severity: ImpulseSeverity;
  verdictExplanation: string;
  isExceedingRunway: boolean;
}

/**
 * Deterministically simulates the impact of a proposed purchase on the student's runway.
 */
export function simulateImpulseImpact(
  input: SimulateImpulseImpactInput
): ImpulseSimulationResult {
  const { itemName, priceMinor, triggerTag, profile, runwayMetrics } = input;

  // Validate positive integer minor price
  if (
    typeof priceMinor !== "number" ||
    !Number.isSafeInteger(priceMinor) ||
    priceMinor <= 0
  ) {
    throw new RangeError(
      `Purchase price must be a positive safe integer minor amount, received: ${priceMinor}`
    );
  }

  const isProtectedSelfInvestment = triggerTag === "invest_self";

  // Calculate Pain-of-Paying translations (always evaluated for both consumption and self-investment)
  const workHours =
    profile.hourlyRateMinor && profile.hourlyRateMinor > 0
      ? convertToWorkHours(priceMinor, profile.hourlyRateMinor)
      : null;

  const compounded4YearMinor = convertTo4YearCompounded(priceMinor);

  // Case 1: Protected Invest-in-Self Allocation
  if (isProtectedSelfInvestment) {
    return {
      itemName: itemName.trim(),
      priceMinor,
      triggerTag,
      daysOfRunwayConsumed: 0,
      safeToSpendAfterMinor: runwayMetrics.safeToSpendTodayMinor,
      dailyDropMinor: 0,
      isProtectedSelfInvestment: true,
      workHours,
      compounded4YearMinor,
      severity: "protected_growth",
      verdictExplanation:
        "Good growth spending — this is protected from your consumption runway.",
      isExceedingRunway: false,
    };
  }

  // Case 2: Ordinary Consumption Triggers (need, convenience, stress_late_night, social_fomo)
  const safeToSpend = runwayMetrics.safeToSpendTodayMinor;
  const daysRemaining = Math.max(1, runwayMetrics.daysRemainingInMonth);
  const remainingConsumption = runwayMetrics.remainingConsumptionMinor;

  // Check if runway is already zero or if purchase exceeds remaining disposable consumption pool
  if (safeToSpend <= 0 || priceMinor > remainingConsumption) {
    return {
      itemName: itemName.trim(),
      priceMinor,
      triggerTag,
      daysOfRunwayConsumed: null, // Null indicates no valid numeric days calculation possible
      safeToSpendAfterMinor: 0,
      dailyDropMinor: safeToSpend,
      isProtectedSelfInvestment: false,
      workHours,
      compounded4YearMinor,
      severity: "runway_shock",
      verdictExplanation: "This purchase exceeds your remaining disposable runway.",
      isExceedingRunway: true,
    };
  }

  // Calculate runway days consumed (rounded to 1 decimal place)
  const rawDays = priceMinor / safeToSpend;
  const daysOfRunwayConsumed = Number(rawDays.toFixed(1));

  // Calculate post-purchase safe to spend today
  const remainingAfterMinor = Math.max(0, remainingConsumption - priceMinor);
  const safeToSpendAfterMinor = Math.round(remainingAfterMinor / daysRemaining);
  const dailyDropMinor = Math.max(0, safeToSpend - safeToSpendAfterMinor);

  // Severity evaluation based on days of runway consumed and proportion of remaining budget
  const percentOfRemaining =
    remainingConsumption > 0 ? priceMinor / remainingConsumption : 1;

  let severity: ImpulseSeverity;
  let verdictExplanation: string;

  if (daysOfRunwayConsumed <= 1.0 && percentOfRemaining <= 0.2) {
    severity = "low_impact";
    verdictExplanation =
      "This purchase fits comfortably within your current runway.";
  } else if (daysOfRunwayConsumed <= 3.0 && percentOfRemaining <= 0.4) {
    severity = "moderate_hit";
    verdictExplanation =
      "This takes a noticeable bite out of your remaining daily budget.";
  } else {
    severity = "runway_shock";
    verdictExplanation =
      "This purchase could put pressure on the rest of your month.";
  }

  return {
    itemName: itemName.trim(),
    priceMinor,
    triggerTag,
    daysOfRunwayConsumed,
    safeToSpendAfterMinor,
    dailyDropMinor,
    isProtectedSelfInvestment: false,
    workHours,
    compounded4YearMinor,
    severity,
    verdictExplanation,
    isExceedingRunway: false,
  };
}
