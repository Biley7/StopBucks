/**
 * StopBucks Runway Insight Builders
 * Pure, deterministic derivations used by the dashboard, ledger and radar.
 * No React, no network, no fabricated values.
 */

import {
  calculateDailyRunway,
  categorizeTransactions,
  getDaysInMonth,
  getLocalDateParts,
} from "./behavioral-engine";
import type {
  RunwayMetrics,
  Transaction,
  TriggerTag,
  UserProfile,
  VaultItem,
} from "./types";

// -------------------------------------------------------------
// Pace status (single source of truth for dashboard thresholds)
// -------------------------------------------------------------

export type RunwayPaceStatus = "on_track" | "tight_runway" | "overspent";

export const RUNWAY_PACE_THRESHOLDS = {
  /** Percentage points of overshoot above the linear trajectory before flagging. */
  tightRunwayBufferPercent: 8,
} as const;

export interface RunwayPaceInfo {
  status: RunwayPaceStatus;
  label: string;
  description: string;
  spentPercentOfBudget: number;
  expectedPercentOfBudget: number;
}

export function getConsumptionProgressPercent(runway: RunwayMetrics): number {
  if (runway.consumptionBudgetMinor <= 0) {
    return runway.monthToDateConsumptionMinor > 0 ? 100 : 0;
  }
  const raw = (runway.monthToDateConsumptionMinor / runway.consumptionBudgetMinor) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function getRunwayPaceStatus(runway: RunwayMetrics): RunwayPaceInfo {
  const spentPercentOfBudget = getConsumptionProgressPercent(runway);
  const expectedPercentOfBudget =
    runway.daysInMonth > 0
      ? Math.round((runway.currentDayOfMonth / runway.daysInMonth) * 100)
      : 0;

  if (runway.isOverBudget || spentPercentOfBudget >= 100) {
    return {
      status: "overspent",
      label: "Overspent",
      description:
        "Your monthly consumption budget is fully used. Self-investment stays protected.",
      spentPercentOfBudget,
      expectedPercentOfBudget,
    };
  }

  if (
    spentPercentOfBudget >
    expectedPercentOfBudget + RUNWAY_PACE_THRESHOLDS.tightRunwayBufferPercent
  ) {
    return {
      status: "tight_runway",
      label: "Tight Runway",
      description:
        "Spending is running ahead of the linear pace. A few calmer days will restore it.",
      spentPercentOfBudget,
      expectedPercentOfBudget,
    };
  }

  return {
    status: "on_track",
    label: "On Track",
    description:
      "Your spending pace matches a healthy linear trajectory for this point in the month.",
    spentPercentOfBudget,
    expectedPercentOfBudget,
  };
}

// -------------------------------------------------------------
// Daily burn chart series
// -------------------------------------------------------------

export interface DailyBurnPoint {
  day: number;
  label: string;
  /** null for future days so future spending is never implied. */
  actualMinor: number | null;
  idealMinor: number;
}

export function buildDailyBurnSeries(
  consumptionBudgetMinor: number,
  transactions: Transaction[],
  referenceDate: Date = new Date(),
  timeZone?: string
): DailyBurnPoint[] {
  const refParts = getLocalDateParts(referenceDate, timeZone);
  const daysInMonth = getDaysInMonth(refParts.year, refParts.month - 1);
  const dailyTotals = new Array<number>(daysInMonth).fill(0);

  for (const t of transactions) {
    if (t.triggerTag === "invest_self") continue;
    const transactionDate = new Date(t.loggedAt);
    if (transactionDate.getTime() > referenceDate.getTime()) continue;
    const parts = getLocalDateParts(transactionDate, timeZone);
    if (parts.year !== refParts.year || parts.month !== refParts.month) continue;
    if (parts.day < 1 || parts.day > daysInMonth) continue;
    dailyTotals[parts.day - 1] += t.amountMinor;
  }

  let cumulative = 0;
  const points: DailyBurnPoint[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isFuture = day > refParts.day;
    if (!isFuture) {
      cumulative += dailyTotals[day - 1];
    }

    points.push({
      day,
      label: String(day),
      actualMinor: isFuture ? null : cumulative,
      idealMinor: Math.round((consumptionBudgetMinor * day) / daysInMonth),
    });
  }

  return points;
}

// -------------------------------------------------------------
// Trigger breakdown
// -------------------------------------------------------------

export const TRIGGER_ORDER: TriggerTag[] = [
  "need",
  "convenience",
  "stress_late_night",
  "social_fomo",
  "invest_self",
];

export const TRIGGER_LABELS: Record<TriggerTag, string> = {
  need: "Need",
  convenience: "Convenience",
  stress_late_night: "Stress / Late-Night",
  social_fomo: "Social / FOMO",
  invest_self: "Invest-in-Self",
};

export interface TriggerBreakdownEntry {
  trigger: TriggerTag;
  label: string;
  totalMinor: number;
  count: number;
  percentage: number;
  denominator: "consumption" | "total";
}

export function buildTriggerBreakdown(
  transactions: Transaction[]
): TriggerBreakdownEntry[] {
  const { consumptionTotalMinor, investSelfTotalMinor } =
    categorizeTransactions(transactions);
  const totalSpendMinor = consumptionTotalMinor + investSelfTotalMinor;

  const totals = new Map<TriggerTag, { totalMinor: number; count: number }>();
  for (const trigger of TRIGGER_ORDER) {
    totals.set(trigger, { totalMinor: 0, count: 0 });
  }

  for (const t of transactions) {
    const bucket = totals.get(t.triggerTag);
    if (!bucket) continue;
    bucket.totalMinor += t.amountMinor;
    bucket.count += 1;
  }

  return TRIGGER_ORDER.map((trigger) => {
    const bucket = totals.get(trigger)!;
    const denominator: "consumption" | "total" =
      trigger === "invest_self" ? "total" : "consumption";
    const baseMinor = denominator === "total" ? totalSpendMinor : consumptionTotalMinor;
    const percentage =
      baseMinor > 0 ? Math.round((bucket.totalMinor / baseMinor) * 100) : 0;

    return {
      trigger,
      label: TRIGGER_LABELS[trigger],
      totalMinor: bucket.totalMinor,
      count: bucket.count,
      percentage,
      denominator,
    };
  });
}

// -------------------------------------------------------------
// Vault money rescued
// -------------------------------------------------------------

export function calculateMoneyRescuedMinor(vaultItems: VaultItem[]): number {
  return vaultItems
    .filter((item) => item.status === "rescued")
    .reduce((total, item) => total + item.priceMinor, 0);
}

// -------------------------------------------------------------
// Pre-log runway impact preview
// -------------------------------------------------------------

export interface RunwayPreview {
  current: RunwayMetrics;
  projected: RunwayMetrics;
  safeToSpendDeltaMinor: number;
  remainingConsumptionDeltaMinor: number;
}

export function buildRunwayPreview(
  profile: Pick<UserProfile, "monthlyBudgetMinor" | "selfInvestTargetMinor">,
  transactions: Transaction[],
  amountMinor: number,
  triggerTag: TriggerTag,
  referenceDate: Date = new Date(),
  timeZone?: string
): RunwayPreview {
  const current = calculateDailyRunway(profile, transactions, referenceDate, timeZone);

  const safeAmount = Number.isSafeInteger(amountMinor) && amountMinor > 0 ? amountMinor : 0;

  const hypothetical: Transaction = {
    id: "runway-preview",
    userId: "preview",
    amountMinor: safeAmount,
    note: "Runway preview",
    triggerTag,
    paymentMode: "cashless",
    loggedAt: referenceDate.toISOString(),
    createdAt: referenceDate.toISOString(),
  };

  const projected = calculateDailyRunway(
    profile,
    [...transactions, hypothetical],
    referenceDate,
    timeZone
  );

  return {
    current,
    projected,
    safeToSpendDeltaMinor:
      projected.safeToSpendTodayMinor - current.safeToSpendTodayMinor,
    remainingConsumptionDeltaMinor:
      projected.remainingConsumptionMinor - current.remainingConsumptionMinor,
  };
}

// -------------------------------------------------------------
// ISO week key
// -------------------------------------------------------------

export function getIsoWeekKey(date: Date = new Date()): string {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}
