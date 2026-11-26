/**
 * StopBucks Behavioral Finance Engine
 * Pure, deterministic functions: No React, No Supabase, No network, No random values.
 *
 * Philosophy:
 * "Expense trackers tell you what you spent. Behavioral finance changes why you spend."
 */

import type {
  BiasAnalysisResult,
  BiasMetric,
  BiasRiskLevel,
  RunwayMetrics,
  Transaction,
  TriggerTag,
  UserProfile,
} from "./types";

/**
 * Separates transactions into:
 * 1. Invest-in-Self Capital (trigger_tag === 'invest_self') - does not reduce consumption runway.
 * 2. Consumption Burn (need, convenience, stress_late_night, social_fomo) - reduces consumption budget.
 */
export function categorizeTransactions(transactions: Transaction[]) {
  const investSelf: Transaction[] = [];
  const consumption: Transaction[] = [];

  let investSelfTotalMinor = 0;
  let consumptionTotalMinor = 0;

  for (const t of transactions) {
    if (t.triggerTag === "invest_self") {
      investSelf.push(t);
      investSelfTotalMinor += t.amountMinor;
    } else {
      consumption.push(t);
      consumptionTotalMinor += t.amountMinor;
    }
  }

  return {
    investSelf,
    consumption,
    investSelfTotalMinor,
    consumptionTotalMinor,
  };
}

/**
 * Mental Accounting:
 * consumption_budget = max(0, monthly_budget - self_invest_target - fixed_commitments)
 */
export function calculateMentalAccounting(
  monthlyBudgetMinor: number,
  selfInvestTargetMinor: number,
  fixedCommitmentsMinor: number = 0
): {
  monthlyBudgetMinor: number;
  selfInvestTargetMinor: number;
  fixedCommitmentsMinor: number;
  consumptionBudgetMinor: number;
} {
  const safeBudget = Math.max(0, monthlyBudgetMinor);
  const safeTarget = Math.min(safeBudget, Math.max(0, selfInvestTargetMinor));
  const totalFixedCommitmentsMinor = Math.max(0, fixedCommitmentsMinor);
  const consumptionBudgetMinor = Math.max(
    0,
    safeBudget - safeTarget - totalFixedCommitmentsMinor
  );

  return {
    monthlyBudgetMinor: safeBudget,
    selfInvestTargetMinor: safeTarget,
    fixedCommitmentsMinor: totalFixedCommitmentsMinor,
    consumptionBudgetMinor,
  };
}

/**
 * Growth-to-Burn Ratio:
 * Ratio between intentional self-investment spending and consumption spending.
 * Safely handles division by zero.
 */
export function calculateGrowthToBurnRatio(
  selfInvestMinor: number,
  consumptionMinor: number
): number {
  if (consumptionMinor <= 0) {
    return selfInvestMinor > 0 ? 1.0 : 0.0;
  }
  const ratio = selfInvestMinor / consumptionMinor;
  return Math.round(ratio * 100) / 100;
}

/**
 * Helper to get local date components in a specified timezone.
 * Defaults to UTC if invalid or unspecified to guarantee deterministic behavior.
 */
export function getLocalDateParts(date: Date, timeZone?: string): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
} {
  try {
    const tz = timeZone || "UTC";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1;
    let day = date.getUTCDate();
    let hour = date.getUTCHours();

    for (const part of parts) {
      if (part.type === "year") year = parseInt(part.value, 10);
      if (part.type === "month") month = parseInt(part.value, 10);
      if (part.type === "day") day = parseInt(part.value, 10);
      if (part.type === "hour") {
        const val = parseInt(part.value, 10);
        hour = val === 24 ? 0 : val;
      }
    }
    return { year, month, day, hour };
  } catch {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
    };
  }
}

/**
 * Calculates days in a specific calendar month (handles leap years correctly).
 */
export function getDaysInMonth(year: number, monthIndex0Based: number): number {
  return new Date(Date.UTC(year, monthIndex0Based + 1, 0)).getUTCDate();
}

/**
 * Filters transactions falling within the current local calendar month up to
 * and including the reference instant. Future-dated entries remain in the ledger
 * but are excluded from month-to-date runway and mirror calculations.
 */
export function filterCurrentMonthTransactionsToDate(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
  timeZone?: string
): Transaction[] {
  const refTime = referenceDate.getTime();
  const refParts = getLocalDateParts(referenceDate, timeZone);

  return transactions.filter((t) => {
    const tDate = new Date(t.loggedAt);
    const tTime = tDate.getTime();
    if (Number.isNaN(tTime) || tTime > refTime) {
      return false;
    }
    const tParts = getLocalDateParts(tDate, timeZone);
    return tParts.year === refParts.year && tParts.month === refParts.month;
  });
}

/**
 * Returns the 1.5%-of-monthly-budget threshold (in integer minor units) used to
 * classify painless micro-taps for Cashless Numbness and Dojo Pain-of-Paying mirrors.
 */
export function getCashlessMicroThresholdMinor(monthlyBudgetMinor: number): number {
  return Math.max(1, Math.round(monthlyBudgetMinor * 0.015));
}

/**
 * Daily Runway calculation.
 * Safe to spend today = max(0, consumption_budget - month_to_date_consumption) / days_remaining_in_month
 * Calendar month boundaries are evaluated in the user's local timezone.
 */
export function calculateDailyRunway(
  profile: Pick<UserProfile, "monthlyBudgetMinor" | "selfInvestTargetMinor">,
  transactions: Transaction[],
  referenceDate: Date = new Date(),
  timeZone?: string,
  fixedCommitmentsMinor: number = 0
): RunwayMetrics {
  const { monthlyBudgetMinor, selfInvestTargetMinor, consumptionBudgetMinor } =
    calculateMentalAccounting(
      profile?.monthlyBudgetMinor ?? 0,
      profile?.selfInvestTargetMinor ?? 0,
      fixedCommitmentsMinor
    );

  const refParts = getLocalDateParts(referenceDate, timeZone);
  const daysInMonth = getDaysInMonth(refParts.year, refParts.month - 1);
  const currentDayOfMonth = Math.min(Math.max(1, refParts.day), daysInMonth);
  // Count current day in remaining days so today's allowance is not artificially squeezed
  const daysRemainingInMonth = Math.max(1, daysInMonth - currentDayOfMonth + 1);

  // Filter transactions that fall within current calendar month up to reference date
  const mtdTransactions = filterCurrentMonthTransactionsToDate(
    transactions,
    referenceDate,
    timeZone
  );
  const {
    investSelfTotalMinor: monthToDateSelfInvestMinor,
    consumptionTotalMinor: monthToDateConsumptionMinor,
  } = categorizeTransactions(mtdTransactions);

  const remainingConsumptionMinor = Math.max(
    0,
    consumptionBudgetMinor - monthToDateConsumptionMinor
  );

  const safeToSpendTodayMinor = Math.round(
    remainingConsumptionMinor / daysRemainingInMonth
  );

  const isOverBudget = monthToDateConsumptionMinor > consumptionBudgetMinor;
  const growthToBurnRatio = calculateGrowthToBurnRatio(
    monthToDateSelfInvestMinor,
    monthToDateConsumptionMinor
  );

  return {
    monthlyBudgetMinor,
    selfInvestTargetMinor,
    fixedCommitmentsMinor: Math.max(0, fixedCommitmentsMinor),
    consumptionBudgetMinor,
    monthToDateConsumptionMinor,
    monthToDateSelfInvestMinor,
    remainingConsumptionMinor,
    daysInMonth,
    currentDayOfMonth,
    daysRemainingInMonth,
    safeToSpendTodayMinor,
    growthToBurnRatio,
    isOverBudget,
  };
}

// -------------------------------------------------------------
// FOUR BEHAVIORAL BIAS DETECTORS
// -------------------------------------------------------------

function classifyRisk(score: number): BiasRiskLevel {
  if (score >= 65) return "high";
  if (score >= 35) return "moderate";
  return "low";
}

/**
 * 1. Present Bias / Late-Night Drift
 * Signals:
 * - Discretionary spending between 22:00 and 04:00 local time.
 * - Spending tagged stress_late_night.
 * Strictly avoids double-counting a transaction that satisfies both conditions.
 */
export function detectLateNightDrift(
  transactions: Transaction[],
  timeZone?: string
): BiasMetric {
  const { consumption } = categorizeTransactions(transactions);

  let matchCount = 0;
  let matchAmountMinor = 0;
  let totalConsumptionMinor = 0;

  for (const t of consumption) {
    totalConsumptionMinor += t.amountMinor;
    const tDate = new Date(t.loggedAt);
    const parts = getLocalDateParts(tDate, timeZone);
    const isLateHour = parts.hour >= 22 || parts.hour < 4;
    const isStressTag = t.triggerTag === "stress_late_night";

    if (isLateHour || isStressTag) {
      matchCount += 1;
      matchAmountMinor += t.amountMinor;
    }
  }

  const countPercentage =
    consumption.length > 0
      ? Math.round((matchCount / consumption.length) * 100)
      : 0;

  const spendPercentage =
    totalConsumptionMinor > 0
      ? Math.round((matchAmountMinor / totalConsumptionMinor) * 100)
      : 0;

  // Deterministic scoring curve:
  // Weighted blend of transaction proportion and monetary exposure (anchor: >30% is high risk)
  const rawScore = spendPercentage * 2.0 + countPercentage * 1.0;
  const score = Math.min(100, Math.round((rawScore / 300) * 100));

  let interpretation = "No significant late-night impulse drift detected.";
  if (score >= 65) {
    interpretation =
      "High vulnerability: late-night and stress-driven spending represents a critical drain on your runway.";
  } else if (score >= 35) {
    interpretation =
      "Moderate drift: occasional late-night or stress purchases are eroding your daily comfort buffer.";
  }

  return {
    name: "Late-Night Drift",
    score,
    level: classifyRisk(score),
    evidenceSummary: `${matchCount} late-night/stress purchases (${spendPercentage}% of consumption spend)`,
    count: matchCount,
    totalAmountMinor: matchAmountMinor,
    percentage: spendPercentage,
    interpretation,
  };
}

/**
 * 2. Cashless Numbness
 * Signals:
 * - payment_mode === "cashless"
 * - Amount <= 1.5% of monthly budget (micro-transactions that bypass pain-of-paying)
 */
export function detectCashlessNumbness(
  transactions: Transaction[],
  monthlyBudgetMinor: number
): BiasMetric {
  const { consumption, consumptionTotalMinor } =
    categorizeTransactions(transactions);

  const microThresholdMinor = getCashlessMicroThresholdMinor(monthlyBudgetMinor);

  let microCount = 0;
  let microAmountMinor = 0;

  for (const t of consumption) {
    if (t.paymentMode === "cashless" && t.amountMinor <= microThresholdMinor) {
      microCount += 1;
      microAmountMinor += t.amountMinor;
    }
  }

  const spendPercentage =
    consumptionTotalMinor > 0
      ? Math.round((microAmountMinor / consumptionTotalMinor) * 100)
      : 0;

  // Deterministic score curve:
  // Micro-transactions feel painless individually. High count (>8) or high cumulative spend (>15%) raises numbness risk.
  const countFactor = Math.min(50, microCount * 6);
  const spendFactor = Math.min(50, spendPercentage * 2.5);
  const score = Math.min(100, Math.round(countFactor + spendFactor));

  let interpretation = "Cashless friction is healthy; micro-purchases are well controlled.";
  if (score >= 65) {
    interpretation =
      "Significant cashless numbness: frequent small digital taps are silently draining your allowance.";
  } else if (score >= 35) {
    interpretation =
      "Noticeable micro-spending: digital payments under 1.5% of budget are quietly adding up.";
  }

  return {
    name: "Cashless Numbness",
    score,
    level: classifyRisk(score),
    evidenceSummary: `${microCount} frictionless cashless taps totaling ${spendPercentage}% of consumption`,
    count: microCount,
    totalAmountMinor: microAmountMinor,
    percentage: spendPercentage,
    interpretation,
  };
}

/**
 * 3. Payday / Early-Month Windfall Burn
 * Signal:
 * - Consumption spending during days 1–7 of the calendar month.
 * - Reference: ~23% is healthy linear pacing (7 days / 30.4 days).
 * - Exceeding 40% produces a high-burn warning.
 */
export function detectPaydayBurn(
  transactions: Transaction[],
  timeZone?: string
): BiasMetric {
  const { consumption, consumptionTotalMinor } =
    categorizeTransactions(transactions);

  let earlyCount = 0;
  let earlyAmountMinor = 0;

  for (const t of consumption) {
    const tDate = new Date(t.loggedAt);
    const parts = getLocalDateParts(tDate, timeZone);
    if (parts.day >= 1 && parts.day <= 7) {
      earlyCount += 1;
      earlyAmountMinor += t.amountMinor;
    }
  }

  const earlyPercentage =
    consumptionTotalMinor > 0
      ? Math.round((earlyAmountMinor / consumptionTotalMinor) * 100)
      : 0;

  // Deterministic scoring curve anchored to:
  // <= 23% (healthy linear) -> score 0-30
  // 24%-40% (moderate acceleration) -> score 31-64
  // > 40% (high early exhaustion) -> score 65-100
  let score = 0;
  if (earlyPercentage <= 23) {
    score = Math.round((earlyPercentage / 23) * 30);
  } else if (earlyPercentage <= 40) {
    score = 30 + Math.round(((earlyPercentage - 23) / 17) * 34);
  } else {
    score = 65 + Math.min(35, Math.round(((earlyPercentage - 40) / 30) * 35));
  }
  score = Math.min(100, Math.max(0, score));

  let interpretation = "Pacing is steady: early month burn adheres to the healthy linear runway.";
  if (score >= 65) {
    interpretation =
      "High windfall burn: spending in days 1–7 heavily exceeded healthy pacing, threatening month-end safety.";
  } else if (score >= 35) {
    interpretation =
      "Moderate early burn: spending was front-loaded during the first week of the month.";
  }

  return {
    name: "Payday Burn",
    score,
    level: classifyRisk(score),
    evidenceSummary: `${earlyPercentage}% of consumption spent in days 1–7 (healthy reference: ~23%)`,
    count: earlyCount,
    totalAmountMinor: earlyAmountMinor,
    percentage: earlyPercentage,
    interpretation,
  };
}

/**
 * 4. Social FOMO Ratio
 * Signal:
 * - Consumption spending tagged 'social_fomo'.
 * - Calculates its percentage of total consumption spending.
 */
export function detectSocialFomo(transactions: Transaction[]): BiasMetric {
  const { consumption, consumptionTotalMinor } =
    categorizeTransactions(transactions);

  let fomoCount = 0;
  let fomoAmountMinor = 0;

  for (const t of consumption) {
    if (t.triggerTag === "social_fomo") {
      fomoCount += 1;
      fomoAmountMinor += t.amountMinor;
    }
  }

  const fomoPercentage =
    consumptionTotalMinor > 0
      ? Math.round((fomoAmountMinor / consumptionTotalMinor) * 100)
      : 0;

  // Deterministic score curve:
  // 0% -> 0 score
  // 25% -> 50 score
  // >= 50% -> 100 score
  const score = Math.min(100, Math.round(fomoPercentage * 2.0));

  let interpretation = "Social spending is intentional and well-balanced.";
  if (score >= 65) {
    interpretation =
      "High FOMO pressure: group activities and peer pressure represent a dominant expenditure driver.";
  } else if (score >= 35) {
    interpretation =
      "Moderate FOMO influence: social outings occasionally exceed your planned daily runway.";
  }

  return {
    name: "Social FOMO",
    score,
    level: classifyRisk(score),
    evidenceSummary: `${fomoCount} social FOMO purchases (${fomoPercentage}% of consumption spend)`,
    count: fomoCount,
    totalAmountMinor: fomoAmountMinor,
    percentage: fomoPercentage,
    interpretation,
  };
}

/**
 * Runs all four bias detectors and generates deterministic zero-guilt coaching advice.
 */
export function analyzeBiases(
  profile: Pick<UserProfile, "monthlyBudgetMinor">,
  transactions: Transaction[],
  timeZone?: string,
  analysisWindow?: { start: Date; end: Date }
): BiasAnalysisResult {
  const scopedTransactions = analysisWindow
    ? transactions.filter((transaction) => {
        const timestamp = new Date(transaction.loggedAt).getTime();
        return timestamp >= analysisWindow.start.getTime() && timestamp <= analysisWindow.end.getTime();
      })
    : transactions;
  const lateNight = detectLateNightDrift(scopedTransactions, timeZone);
  const cashless = detectCashlessNumbness(scopedTransactions, profile.monthlyBudgetMinor);
  const payday = detectPaydayBurn(scopedTransactions, timeZone);
  const fomo = detectSocialFomo(scopedTransactions);

  // Overall risk score (composite average)
  const overallRiskScore = Math.round(
    lateNight.score * 0.3 +
      cashless.score * 0.25 +
      payday.score * 0.25 +
      fomo.score * 0.2
  );

  const deterministicAdvice = generateDeterministicCoaching({
    lateNight,
    cashless,
    payday,
    fomo,
  });

  return {
    lateNightDrift: lateNight,
    cashlessNumbness: cashless,
    paydayBurn: payday,
    socialFomo: fomo,
    overallRiskScore,
    deterministicAdvice,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Fallback deterministic coaching suggestions:
 * Rule-based, non-judgmental, zero-guilt, student-focused insights.
 */
export function generateDeterministicCoaching(biases: {
  lateNight: BiasMetric;
  cashless: BiasMetric;
  payday: BiasMetric;
  fomo: BiasMetric;
}): string[] {
  const advice: string[] = [];

  if (biases.lateNight.level === "high") {
    advice.push(
      "Noticeable late-night orders occurred under stress. Try routing delivery apps into the 48-Hour Vault after 10 PM to create a peaceful pause."
    );
  } else if (biases.lateNight.level === "moderate") {
    advice.push(
      "Late evening cravings occasionally pull from tomorrow's runway. Pre-portioning snack supplies before study sessions protects your cash."
    );
  }

  if (biases.cashless.level === "high") {
    advice.push(
      "Frictionless QR and digital taps made small purchases invisible. Switching payment display to 'Hours of Work' can restore healthy awareness."
    );
  } else if (biases.cashless.level === "moderate") {
    advice.push(
      "Micro digital payments added up steadily this month. Keep small treats intentional rather than habitual."
    );
  }

  if (biases.payday.level === "high") {
    advice.push(
      "Front-loading spending in week one squeezed the rest of your month. Dividing your allowance across 4 weekly envelopes helps maintain steady momentum."
    );
  }

  if (biases.fomo.level === "high") {
    advice.push(
      "Peer-driven events claimed a large share of your burn. Suggesting campus cookouts or student-discount venues lets you bond without burning runway."
    );
  }

  if (advice.length === 0) {
    advice.push(
      "Your spending is remarkably well paced across the calendar month. Your Daily Runway remains resilient and your intentional habits are working."
    );
  }

  return advice;
}

