/**
 * StopBucks Runway Insight Builders
 * Pure, deterministic derivations used by the dashboard, ledger and radar.
 * No React, no network, no fabricated values.
 */

import {
  calculateDailyRunway,
  calculateGrowthToBurnRatio,
  calculateMentalAccounting,
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
  timeZone?: string,
  fixedCommitmentsMinor: number = 0
): RunwayPreview {
  const current = calculateDailyRunway(
    profile,
    transactions,
    referenceDate,
    timeZone,
    fixedCommitmentsMinor
  );

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
    timeZone,
    fixedCommitmentsMinor
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

// -------------------------------------------------------------
// Month-End Snapshot & Historical Month Filtering
// -------------------------------------------------------------

export interface MonthYear {
  year: number;
  month: number; // 1-12
}

export interface MonthEndSnapshot {
  year: number;
  month: number; // 1-12
  totalConsumptionMinor: number;
  totalSelfInvestMinor: number;
  fixedCommitmentsMinor: number;
  consumptionBudgetMinor: number;
  surplusOrDeficitMinor: number; // positive = surplus, negative = deficit, 0 = on budget
  isSurplus: boolean;
  isDeficit: boolean;
  growthToBurnRatio: number;
  topTrigger: TriggerTag | null;
  transactionCount: number;
}

/**
 * Pure helper to filter transactions belonging to a specific calendar month
 * in the explicitly supplied timezone.
 */
export function filterTransactionsByMonth(
  transactions: Transaction[],
  targetYear: number,
  targetMonth: number, // 1-12
  timeZone?: string
): Transaction[] {
  return transactions.filter((t) => {
    const tDate = new Date(t.loggedAt);
    const parts = getLocalDateParts(tDate, timeZone);
    return parts.year === targetYear && parts.month === targetMonth;
  });
}

/**
 * Builds a deterministic, pure financial snapshot for a specific calendar month.
 */
export function buildMonthEndSnapshot(
  transactions: Transaction[],
  profile: Pick<UserProfile, "monthlyBudgetMinor" | "selfInvestTargetMinor">,
  fixedCommitmentsMinor: number,
  targetYear: number,
  targetMonth: number, // 1-12
  timeZone?: string
): MonthEndSnapshot {
  // 1. Filter transactions to target calendar month in explicit timezone
  const monthTransactions = filterTransactionsByMonth(
    transactions,
    targetYear,
    targetMonth,
    timeZone
  );

  // 2. Categorize transactions into consumption vs self-investment
  const {
    consumptionTotalMinor,
    investSelfTotalMinor,
    consumption,
  } = categorizeTransactions(monthTransactions);

  // 3. Compute consumption budget using Phase 4A accounting
  const { consumptionBudgetMinor, fixedCommitmentsMinor: safeFixed } =
    calculateMentalAccounting(
      profile?.monthlyBudgetMinor ?? 0,
      profile?.selfInvestTargetMinor ?? 0,
      fixedCommitmentsMinor
    );

  // 4. Surplus or Deficit
  const surplusOrDeficitMinor = consumptionBudgetMinor - consumptionTotalMinor;
  const isSurplus = surplusOrDeficitMinor > 0;
  const isDeficit = surplusOrDeficitMinor < 0;

  // 5. Growth-to-burn ratio
  const growthToBurnRatio = calculateGrowthToBurnRatio(
    investSelfTotalMinor,
    consumptionTotalMinor
  );

  // 6. Find dominant consumption trigger (tie-breaking in canonical TRIGGER_ORDER)
  // Self-investment is strictly excluded from consumption top trigger
  const triggerTotals = new Map<TriggerTag, number>();
  for (const t of consumption) {
    triggerTotals.set(t.triggerTag, (triggerTotals.get(t.triggerTag) ?? 0) + t.amountMinor);
  }

  let topTrigger: TriggerTag | null = null;
  let maxSpendMinor = 0;

  for (const tag of TRIGGER_ORDER) {
    if (tag === "invest_self") continue;
    const spend = triggerTotals.get(tag) ?? 0;
    if (spend > maxSpendMinor) {
      maxSpendMinor = spend;
      topTrigger = tag;
    }
  }

  return {
    year: targetYear,
    month: targetMonth,
    totalConsumptionMinor: consumptionTotalMinor,
    totalSelfInvestMinor: investSelfTotalMinor,
    fixedCommitmentsMinor: safeFixed,
    consumptionBudgetMinor,
    surplusOrDeficitMinor,
    isSurplus,
    isDeficit,
    growthToBurnRatio,
    topTrigger,
    transactionCount: monthTransactions.length,
  };
}

/**
 * Returns a deterministic Date object corresponding to the final millisecond (23:59:59.999)
 * of the given calendar year and month (1-12) in the specified timeZone.
 */
export function getEndOfMonthDate(
  year: number,
  month: number, // 1-12
  timeZone?: string
): Date {
  const daysInMonth = getDaysInMonth(year, month - 1);
  const localTargetUtcMs = Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999);

  if (!timeZone || timeZone === "UTC") {
    return new Date(localTargetUtcMs);
  }

  try {
    // Probe noon UTC on the target date to calculate local timezone offset
    const probe = new Date(Date.UTC(year, month - 1, daysInMonth, 12, 0, 0, 0));
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(probe);
    let y = year;
    let m = month;
    let d = daysInMonth;
    let h = 12;
    let min = 0;
    let s = 0;

    for (const part of parts) {
      if (part.type === "year") y = parseInt(part.value, 10);
      if (part.type === "month") m = parseInt(part.value, 10);
      if (part.type === "day") d = parseInt(part.value, 10);
      if (part.type === "hour") {
        const val = parseInt(part.value, 10);
        h = val === 24 ? 0 : val;
      }
      if (part.type === "minute") min = parseInt(part.value, 10);
      if (part.type === "second") s = parseInt(part.value, 10);
    }

    const localProbeMs = Date.UTC(y, m - 1, d, h, min, s);
    const offsetMs = localProbeMs - probe.getTime();

    return new Date(localTargetUtcMs - offsetMs);
  } catch {
    return new Date(localTargetUtcMs);
  }
}

