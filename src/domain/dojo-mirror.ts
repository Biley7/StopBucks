/**
 * StopBucks Dojo Live Personal Data Mirror Engine
 *
 * Connects the 9 research-backed lessons to the student's actual StopBucks
 * financial ledger, fixed commitments, 48-Hour Vault, and profile—reusing
 * canonical domain formulas with zero React, Supabase, or browser dependencies.
 */

import {
  analyzeBiases,
  calculateDailyRunway,
  categorizeTransactions,
  filterCurrentMonthTransactionsToDate,
  getCashlessMicroThresholdMinor,
} from "./behavioral-engine";
import { convertTo4YearCompounded } from "./currency";
import {
  calculateMoneyRescuedMinor,
  getRunwayPaceStatus,
} from "./runway-insights";
import type {
  DojoLevelId,
  DojoPersonalMirror,
  DojoPersonalMirrorMetric,
} from "./dojo-types";
import type {
  FixedCommitment,
  Transaction,
  UserProfile,
  VaultItem,
} from "./types";

export interface DojoMirrorInput {
  profile: UserProfile | null;
  transactions: Transaction[];
  fixedCommitments: FixedCommitment[];
  vaultItems: VaultItem[];
  referenceDate: Date;
  timeZone: string;
}

const HEDONIC_TRIGGERS = new Set([
  "convenience",
  "stress_late_night",
  "social_fomo",
]);

function safeSumMinor(values: number[]): number {
  let total = 0;
  for (const val of values) {
    if (typeof val === "number" && Number.isSafeInteger(val) && val > 0) {
      total += val;
    }
  }
  return total;
}

function buildMissingProfileBaseline(
  headline: string,
  insight: string,
  actionLabel: string,
  href: "/runway" | "/log" | "/radar" | "/vault",
  extraMetric?: DojoPersonalMirrorMetric
): DojoPersonalMirror {
  const metrics: DojoPersonalMirrorMetric[] = [
    {
      label: "Budget Baseline",
      valueType: "text",
      numericValue: null,
      textValue: "Not configured",
      tone: "neutral",
    },
    extraMetric ?? {
      label: "Live Activity",
      valueType: "count",
      numericValue: 0,
      tone: "neutral",
    },
  ];

  return {
    headline,
    insight,
    metrics,
    hasLiveSignal: false,
    actionLink: { label: actionLabel, href },
  };
}

/**
 * Generates a deterministic, timezone-aware personal behavioral mirror for any
 * Dojo level (1–9), strictly using current-month non-future data.
 */
export function buildDojoPersonalMirror(
  levelId: DojoLevelId,
  input: DojoMirrorInput
): DojoPersonalMirror {
  if (!(input.referenceDate instanceof Date) || Number.isNaN(input.referenceDate.getTime())) {
    throw new RangeError("buildDojoPersonalMirror requires a valid referenceDate.");
  }

  const { profile, transactions, fixedCommitments, vaultItems, referenceDate, timeZone } =
    input;

  // Exclude future-dated transactions and isolate current local calendar month
  const mtdTransactions = filterCurrentMonthTransactionsToDate(
    transactions,
    referenceDate,
    timeZone
  );
  const categorized = categorizeTransactions(mtdTransactions);

  const totalFixedMinor = safeSumMinor(fixedCommitments.map((fc) => fc.amountMinor));
  const moneyRescuedMinor = calculateMoneyRescuedMinor(vaultItems);

  const rescuedItems = vaultItems.filter((item) => item.status === "rescued");
  const coolingItems = vaultItems.filter((item) => item.status === "cooling");
  const purchasedVaultItems = vaultItems.filter((item) => item.status === "purchased");

  const runway = profile
    ? calculateDailyRunway(
        profile,
        transactions,
        referenceDate,
        timeZone,
        totalFixedMinor
      )
    : null;

  const bias = profile
    ? analyzeBiases(profile, mtdTransactions, timeZone)
    : null;

  switch (levelId) {
    // -----------------------------------------------------------------------
    // LEVEL 1: Planner vs. Doer
    // -----------------------------------------------------------------------
    case 1: {
      // Non-overlapping counting rule:
      // 1) invest_self transactions come strictly from transactions
      // 2) active fixed bills live in fixedCommitments (not logged as transactions)
      // 3) rescued Vault items never create transactions (only 'purchased' creates a tx)
      const plannerMovesCount =
        categorized.investSelf.length +
        fixedCommitments.length +
        rescuedItems.length;

      const doerImpulseTxs = categorized.consumption.filter((t) =>
        HEDONIC_TRIGGERS.has(t.triggerTag)
      );
      const doerImpulsesCount = doerImpulseTxs.length;

      const convenienceTotalMinor = safeSumMinor(
        categorized.consumption
          .filter((t) => t.triggerTag === "convenience")
          .map((t) => t.amountMinor)
      );

      const hasLiveSignal =
        mtdTransactions.length > 0 ||
        fixedCommitments.length > 0 ||
        rescuedItems.length > 0;

      return {
        headline: hasLiveSignal
          ? "Your Planner vs. Doer Scoreboard"
          : "Ready to Spot Your Money Scripts",
        insight: hasLiveSignal
          ? `This month shows ${plannerMovesCount} Planner move${plannerMovesCount === 1 ? "" : "s"} (self-investment, reserved bills, and Vault rescues) alongside ${doerImpulsesCount} Doer impulse trigger${doerImpulsesCount === 1 ? "" : "s"}. Pausing convenience buys keeps your Planner in front.`
          : "Log a few campus expenses or park a recurring bill to watch how your Planner habits compare with day-to-day convenience impulses.",
        metrics: [
          {
            label: "Planner Moves",
            valueType: "count",
            numericValue: plannerMovesCount,
            tone: plannerMovesCount > 0 ? "positive" : "neutral",
          },
          {
            label: "Doer Impulses",
            valueType: "count",
            numericValue: doerImpulsesCount,
            tone:
              doerImpulsesCount > plannerMovesCount && doerImpulsesCount > 0
                ? "caution"
                : "neutral",
          },
          {
            label: "Convenience Spend",
            valueType: "money_minor",
            numericValue: convenienceTotalMinor,
            tone: convenienceTotalMinor > 0 ? "caution" : "positive",
          },
        ],
        hasLiveSignal,
        actionLink: { label: "Review Expense Log", href: "/log" },
      };
    }

    // -----------------------------------------------------------------------
    // LEVEL 2: Pain of Paying
    // -----------------------------------------------------------------------
    case 2: {
      if (!profile || !runway || !bias) {
        return buildMissingProfileBaseline(
          "Set a Budget to Measure Tap Coupling",
          "Once your monthly budget is configured, StopBucks measures how much of your spending flows through frictionless cashless taps versus your Prepaid Shield.",
          "Configure Runway",
          "/runway"
        );
      }

      const cashlessTxCount = mtdTransactions.filter(
        (t) => t.paymentMode === "cashless"
      ).length;
      const cashlessSharePct =
        mtdTransactions.length > 0
          ? Math.round((cashlessTxCount / mtdTransactions.length) * 100)
          : null;

      // Reuse canonical Cashless Numbness detector (<= 1.5% of monthly budget)
      const microTapsCount =
        profile.monthlyBudgetMinor > 0 ? bias.cashlessNumbness.count : null;
      const microTapsTotalMinor =
        profile.monthlyBudgetMinor > 0
          ? bias.cashlessNumbness.totalAmountMinor
          : null;

      // Phase 4A non-double-counted Mental Prepayment Shield
      const mentalPrepaymentShieldMinor =
        runway.fixedCommitmentsMinor + runway.selfInvestTargetMinor;

      const hasLiveSignal = mtdTransactions.length > 0;

      return {
        headline: hasLiveSignal
          ? "Your Payment Coupling Profile"
          : "Zero Transactions Logged This Month",
        insight: hasLiveSignal
          ? `${cashlessSharePct ?? 0}% of your logged transactions this month were cashless, including ${microTapsCount ?? 0} micro-tap${microTapsCount === 1 ? "" : "s"} at or below 1.5% of budget. Your Mental Prepayment Shield rings off commitments and growth first.`
          : "Your Mental Prepayment Shield is already structured—log a few cash or UPI purchases to see whether painless micro-taps sneak past your awareness.",
        metrics: [
          {
            label: "Cashless Share",
            valueType: "percent",
            numericValue: cashlessSharePct,
            ...(cashlessSharePct === null ? { textValue: "No logs yet" } : {}),
            tone:
              cashlessSharePct !== null && cashlessSharePct >= 80
                ? "caution"
                : "neutral",
          },
          {
            label:
              microTapsCount !== null
                ? `Micro-Taps (${microTapsCount})`
                : "Micro-Taps",
            valueType: "money_minor",
            numericValue: microTapsTotalMinor,
            ...(microTapsCount !== null
              ? { textValue: `${microTapsCount} tap${microTapsCount === 1 ? "" : "s"}` }
              : { textValue: "Set budget" }),
            tone:
              microTapsCount !== null && microTapsCount >= 4
                ? "caution"
                : "neutral",
          },
          {
            label: "Prepayment Shield",
            valueType: "money_minor",
            numericValue: mentalPrepaymentShieldMinor,
            tone: mentalPrepaymentShieldMinor > 0 ? "positive" : "neutral",
          },
        ],
        hasLiveSignal,
        actionLink: { label: "Inspect Bias Radar", href: "/radar" },
      };
    }

    // -----------------------------------------------------------------------
    // LEVEL 3: Hedonic Spending (World 1 Boss)
    // -----------------------------------------------------------------------
    case 3: {
      const hedonicSpendMinor = safeSumMinor(
        categorized.consumption
          .filter((t) => HEDONIC_TRIGGERS.has(t.triggerTag))
          .map((t) => t.amountMinor)
      );

      // Consumption denominator strictly excludes invest_self
      const hedonicSharePct =
        categorized.consumptionTotalMinor > 0
          ? Math.round(
              (hedonicSpendMinor / categorized.consumptionTotalMinor) * 100
            )
          : null;

      // Reuse canonical Late-Night Drift detector when profile exists
      const lateNightTotalMinor = bias
        ? bias.lateNightDrift.totalAmountMinor
        : safeSumMinor(
            categorized.consumption
              .filter((t) => t.triggerTag === "stress_late_night")
              .map((t) => t.amountMinor)
          );

      const hasLiveSignal = categorized.consumption.length > 0;

      let benchmarkComparison =
        "Log consumption entries to see how your discretionary trigger mix compares with research benchmarks.";
      if (hedonicSharePct !== null) {
        if (hedonicSharePct <= 55) {
          benchmarkComparison = `As a research benchmark comparison (not an individual diagnosis), your ${hedonicSharePct}% hedonic share sits below the 55.6% low-anxiety BNPL cohort benchmark (vs. 79.9% high-anxiety cohort) in Ma et al. (2026).`;
        } else if (hedonicSharePct < 80) {
          benchmarkComparison = `As a research benchmark comparison (not an individual diagnosis), your ${hedonicSharePct}% hedonic share lies between Ma et al.'s (2026) 55.6% low-anxiety and 79.9% high-anxiety BNPL benchmarks—routing evening urges to the Vault adds protective friction.`;
        } else {
          benchmarkComparison = `As a research benchmark comparison (not an individual diagnosis), your ${hedonicSharePct}% hedonic share exceeds the 79.9% high-anxiety BNPL benchmark in Ma et al. (2026) (vs. 55.6% low-anxiety); adding a 48-hour pause helps reset emotional triggers.`;
        }
      }

      return {
        headline: hasLiveSignal
          ? "Your Hedonic vs. Essential Trigger Split"
          : "No Consumption Burn Recorded Yet",
        insight: benchmarkComparison,
        metrics: [
          {
            label: "Hedonic Spend",
            valueType: "money_minor",
            numericValue: hedonicSpendMinor,
            tone: hedonicSpendMinor > 0 ? "neutral" : "positive",
          },
          {
            label: "Hedonic Share",
            valueType: "percent",
            numericValue: hedonicSharePct,
            ...(hedonicSharePct === null ? { textValue: "No consumption yet" } : {}),
            tone:
              hedonicSharePct !== null && hedonicSharePct >= 75
                ? "caution"
                : hedonicSharePct !== null
                  ? "neutral"
                  : "neutral",
          },
          {
            label: "Late-Night Spend",
            valueType: "money_minor",
            numericValue: lateNightTotalMinor,
            tone: lateNightTotalMinor > 0 ? "caution" : "positive",
          },
        ],
        hasLiveSignal,
        actionLink: { label: "Park Urge in Vault", href: "/vault" },
      };
    }

    // -----------------------------------------------------------------------
    // LEVEL 4: Broad Bracketing
    // -----------------------------------------------------------------------
    case 4: {
      if (!profile || !runway || profile.monthlyBudgetMinor <= 0) {
        return buildMissingProfileBaseline(
          "Set Your Monthly Budget to Zoom Out",
          "Broad bracketing scales small routine consumption under 2% of your monthly budget using observed multi-occurrence pace—configure a budget to compute your 4-year view.",
          "Open Runway",
          "/runway"
        );
      }

      const routineThresholdMinor = Math.max(
        1,
        Math.round(profile.monthlyBudgetMinor * 0.02)
      );
      const routineTxs = categorized.consumption.filter(
        (t) => t.amountMinor <= routineThresholdMinor
      );
      const routineTotalMinor = safeSumMinor(routineTxs.map((t) => t.amountMinor));
      const routineCount = routineTxs.length;

      // Guard against extrapolating a single isolated purchase as recurring behavior
      const elapsedDays = Math.max(1, runway.currentDayOfMonth);
      const annualizedMinor =
        routineCount >= 2
          ? Math.round((routineTotalMinor / elapsedDays) * 365)
          : routineCount === 0
            ? 0
            : null;

      // Reuse canonical convertTo4YearCompounded (8% p.a.)
      const compoundedBaseMinor =
        annualizedMinor !== null ? annualizedMinor : routineTotalMinor;
      const compounded4YrMinor = convertTo4YearCompounded(compoundedBaseMinor);

      const protectedSplitMinor =
        runway.fixedCommitmentsMinor + runway.selfInvestTargetMinor;
      const temptingSplitMinor = safeSumMinor(
        categorized.consumption
          .filter((t) => HEDONIC_TRIGGERS.has(t.triggerTag))
          .map((t) => t.amountMinor)
      );

      const hasLiveSignal = mtdTransactions.length > 0;

      let insight: string;
      if (routineCount === 0) {
        insight = `No routine consumption purchases at or below 2% of budget are logged this month yet, leaving your protected allocation ahead of tempting discretionary triggers.`;
      } else if (routineCount === 1) {
        insight = `You logged 1 small purchase under 2% of budget—an isolated entry isn't extrapolated into an annual habit. Even unscaled, your protected bills and growth pool remain distinct from tempting triggers (${temptingSplitMinor > 0 ? "active" : "zero"} this month).`;
      } else {
        insight = `${routineCount} small routine buys under 2% of budget scale over ${elapsedDays} elapsed days into a broad annual pace—while your protected bucket holds ${protectedSplitMinor > temptingSplitMinor ? "comfortably above" : "alongside"} tempting discretionary triggers.`;
      }

      return {
        headline: hasLiveSignal
          ? "Zoomed-Out Petty Cash & Protected Split"
          : "Ready for Broad-Bracket Zoom",
        insight,
        metrics: [
          {
            label: "Routine Small Spend",
            valueType: "money_minor",
            numericValue: routineTotalMinor,
            textValue: `${routineCount} item${routineCount === 1 ? "" : "s"}`,
            tone: routineCount >= 5 ? "caution" : "neutral",
          },
          {
            label: "Annualized Estimate",
            valueType: "money_minor",
            numericValue: annualizedMinor,
            ...(annualizedMinor === null
              ? { textValue: "1 isolated item" }
              : {}),
            tone: "neutral",
          },
          {
            label:
              routineCount === 1
                ? "4-Yr Value (Single Item)"
                : "4-Yr Compounded (8% p.a.)",
            valueType: "money_minor",
            numericValue: compounded4YrMinor,
            tone: compounded4YrMinor > 0 ? "neutral" : "positive",
          },
        ],
        hasLiveSignal,
        actionLink: { label: "View Runway Allocation", href: "/runway" },
      };
    }

    // -----------------------------------------------------------------------
    // LEVEL 5: Deliberative Planning
    // -----------------------------------------------------------------------
    case 5: {
      const fixedBillsReservedCount = fixedCommitments.length;
      const vaultParkedOrRescuedCount =
        coolingItems.length + rescuedItems.length;

      // Bounded 0–100 Deliberative Planning Index combining bills, Vault pauses, and deliberate tx share
      const billsScore = Math.min(30, fixedBillsReservedCount * 10);
      const vaultScore = Math.min(35, vaultParkedOrRescuedCount * 12);
      const deliberateTxCount = mtdTransactions.filter(
        (t) => t.triggerTag === "need" || t.triggerTag === "invest_self"
      ).length;
      const deliberateRatioScore =
        mtdTransactions.length > 0
          ? Math.round((deliberateTxCount / mtdTransactions.length) * 35)
          : 0;
      const deliberativePlanningIndex = Math.min(
        100,
        billsScore + vaultScore + deliberateRatioScore
      );

      const mtdSelfInvestMinor = runway
        ? runway.monthToDateSelfInvestMinor
        : categorized.investSelfTotalMinor;

      const zeroGuiltSelfWorthTotalMinor =
        moneyRescuedMinor + mtdSelfInvestMinor;

      const hasLiveSignal =
        fixedBillsReservedCount > 0 ||
        vaultParkedOrRescuedCount > 0 ||
        mtdTransactions.length > 0;

      return {
        headline: hasLiveSignal
          ? "Your System 2 Deliberative Footprint"
          : "Build Your Deliberative Planning Index",
        insight: hasLiveSignal
          ? `${fixedBillsReservedCount} reserved bill${fixedBillsReservedCount === 1 ? "" : "s"} and ${vaultParkedOrRescuedCount} parked or rescued Vault item${vaultParkedOrRescuedCount === 1 ? "" : "s"} reinforce calm planning over wishful thinking, building a zero-guilt self-worth pool.`
          : "Reserving fixed bills, pausing impulses in the Vault, and logging intentional Invest-in-Self moves builds steady financial security without shame.",
        metrics: [
          {
            label: "Planning Index",
            valueType: "count",
            numericValue: deliberativePlanningIndex,
            textValue: `${deliberativePlanningIndex} / 100`,
            tone:
              deliberativePlanningIndex >= 60
                ? "positive"
                : deliberativePlanningIndex > 0
                  ? "neutral"
                  : "neutral",
          },
          {
            label: "Bills + Vault Moves",
            valueType: "count",
            numericValue: fixedBillsReservedCount + vaultParkedOrRescuedCount,
            textValue: `${fixedBillsReservedCount} bills · ${vaultParkedOrRescuedCount} vault`,
            tone:
              fixedBillsReservedCount + vaultParkedOrRescuedCount > 0
                ? "positive"
                : "neutral",
          },
          {
            label: "Zero-Guilt Total",
            valueType: "money_minor",
            numericValue: zeroGuiltSelfWorthTotalMinor,
            tone: zeroGuiltSelfWorthTotalMinor > 0 ? "positive" : "neutral",
          },
        ],
        hasLiveSignal,
        actionLink: { label: "Use 48-Hour Vault", href: "/vault" },
      };
    }

    // -----------------------------------------------------------------------
    // LEVEL 6: Three-Bucket Split (World 2 Boss)
    // -----------------------------------------------------------------------
    case 6: {
      if (!profile || !runway) {
        return buildMissingProfileBaseline(
          "Configure Buckets to Prevent Category Blur",
          "Set your monthly budget and self-investment goal to track Fixed Commitments, Consumption Burn, and Protected Invest-in-Self side by side.",
          "Configure Runway",
          "/runway"
        );
      }

      const mtdConsumptionMinor = runway.monthToDateConsumptionMinor;
      const mtdSelfInvestMinor = runway.monthToDateSelfInvestMinor;
      const investProgressPct =
        runway.selfInvestTargetMinor > 0
          ? Math.round(
              (mtdSelfInvestMinor / runway.selfInvestTargetMinor) * 100
            )
          : null;

      const discretionaryImpulseMinor = safeSumMinor(
        categorized.consumption
          .filter((t) => HEDONIC_TRIGGERS.has(t.triggerTag))
          .map((t) => t.amountMinor)
      );

      const hasLiveSignal =
        totalFixedMinor > 0 || mtdTransactions.length > 0;

      // Only surface a cognitive-dissonance observation when the ledger genuinely supports it
      const showsGoalVsImpulseGap =
        runway.selfInvestTargetMinor > 0 &&
        mtdSelfInvestMinor < runway.selfInvestTargetMinor &&
        discretionaryImpulseMinor > mtdSelfInvestMinor &&
        mtdTransactions.length >= 2;

      let insight: string;
      if (!hasLiveSignal) {
        insight =
          "Your three mental buckets are ready—add fixed bills or log expenses to keep commitments, everyday burn, and growth clearly separated.";
      } else if (showsGoalVsImpulseGap) {
        insight = `Noticeable category gap: impulse-tagged consumption currently outpaces Invest-in-Self (${investProgressPct ?? 0}% of your growth target). Keeping buckets visible helps realign spending with what you value—without harsh deprivation.`;
      } else {
        insight = `Your three buckets remain clearly separated (${investProgressPct !== null ? `${investProgressPct}% of your self-investment target logged` : "no fixed self-invest target required"}), reducing mental category blur across the month.`;
      }

      return {
        headline: hasLiveSignal
          ? "Your Live Three-Bucket Separation"
          : "Three-Bucket Architecture Ready",
        insight,
        metrics: [
          {
            label: "Fixed Commitments",
            valueType: "money_minor",
            numericValue: totalFixedMinor,
            tone: "neutral",
          },
          {
            label: "MTD Consumption",
            valueType: "money_minor",
            numericValue: mtdConsumptionMinor,
            tone: runway.isOverBudget ? "caution" : "neutral",
          },
          {
            label: "MTD Invest-in-Self",
            valueType: "money_minor",
            numericValue: mtdSelfInvestMinor,
            ...(investProgressPct !== null
              ? { textValue: `${investProgressPct}% of target` }
              : {}),
            tone: mtdSelfInvestMinor > 0 ? "positive" : "neutral",
          },
        ],
        hasLiveSignal,
        actionLink: { label: "Inspect Three Buckets", href: "/runway" },
      };
    }

    // -----------------------------------------------------------------------
    // LEVEL 7: Robb's Four-Habit Self-Efficacy Score
    // -----------------------------------------------------------------------
    case 7: {
      if (!profile || !runway) {
        return buildMissingProfileBaseline(
          "Configure Baseline to Score Self-Efficacy Habits",
          "Your four-habit resilience check measures budget setup, healthy pacing, Vault rescues, and Invest-in-Self momentum once your monthly baseline is configured.",
          "Configure Runway",
          "/runway"
        );
      }

      const pace = getRunwayPaceStatus(runway);
      const impulseSpendMinor = safeSumMinor(
        categorized.consumption
          .filter((t) => HEDONIC_TRIGGERS.has(t.triggerTag))
          .map((t) => t.amountMinor)
      );
      const impulseSharePct =
        categorized.consumptionTotalMinor > 0
          ? Math.round(
              (impulseSpendMinor / categorized.consumptionTotalMinor) * 100
            )
          : null;

      // 4 deterministic habit indicators
      const habit1BudgetAndBills =
        profile.monthlyBudgetMinor > 0 && fixedCommitments.length > 0;
      const habit2HealthyPace =
        profile.monthlyBudgetMinor > 0 &&
        runway.consumptionBudgetMinor > 0 &&
        mtdTransactions.length > 0 &&
        pace.status === "on_track";
      const habit3RescueOrLowImpulse =
        rescuedItems.length > 0 ||
        (impulseSharePct !== null && impulseSharePct <= 35);
      const habit4GrowthOrSurplus =
        runway.monthToDateSelfInvestMinor > 0 ||
        (mtdTransactions.length > 0 &&
          !runway.isOverBudget &&
          runway.remainingConsumptionMinor > 0);

      const habitScore =
        (habit1BudgetAndBills ? 1 : 0) +
        (habit2HealthyPace ? 1 : 0) +
        (habit3RescueOrLowImpulse ? 1 : 0) +
        (habit4GrowthOrSurplus ? 1 : 0);

      const shockCushionMinor =
        runway.remainingConsumptionMinor + moneyRescuedMinor;

      const hasLiveSignal =
        mtdTransactions.length > 0 ||
        fixedCommitments.length > 0 ||
        rescuedItems.length > 0;

      return {
        headline: hasLiveSignal
          ? `Campus Self-Efficacy Score: ${habitScore}/4`
          : "Build Your 4-Habit Buffer Shield",
        insight: hasLiveSignal
          ? `You currently meet ${habitScore}/4 practical self-efficacy indicators with a combined Unexpected-Shock Cushion from remaining disposable runway plus Vault rescues—protecting your semester momentum against sudden expenses.`
          : "Start by adding fixed commitments, logging expenses, or rescuing an impulse in the Vault to build an active Unexpected-Shock Cushion.",
        metrics: [
          {
            label: "Habit Score",
            valueType: "text",
            numericValue: habitScore,
            textValue: `${habitScore}/4`,
            tone:
              habitScore >= 3
                ? "positive"
                : habitScore >= 1
                  ? "neutral"
                  : "caution",
          },
          {
            label: "Shock Cushion",
            valueType: "money_minor",
            numericValue: shockCushionMinor,
            tone: shockCushionMinor > 0 ? "positive" : "caution",
          },
          {
            label: "Vault Rescues",
            valueType: "count",
            numericValue: rescuedItems.length,
            tone: rescuedItems.length > 0 ? "positive" : "neutral",
          },
        ],
        hasLiveSignal,
        actionLink: { label: "Check Runway Shield", href: "/runway" },
      };
    }

    // -----------------------------------------------------------------------
    // LEVEL 8: Hardship Domino
    // -----------------------------------------------------------------------
    case 8: {
      if (!profile || !runway) {
        return buildMissingProfileBaseline(
          "Configure Baseline for Mid-Month Pace Check",
          "Monitor–Compare–Adjust needs your monthly budget baseline so StopBucks can project month-end pace and extra buffer runway days safely.",
          "Configure Runway",
          "/runway"
        );
      }

      const elapsedDays = Math.max(1, runway.currentDayOfMonth);
      const projectedConsumptionMinor = Math.round(
        (runway.monthToDateConsumptionMinor / elapsedDays) * runway.daysInMonth
      );
      const projectedSurplusOrDeficitMinor =
        runway.consumptionBudgetMinor - projectedConsumptionMinor;

      const shockCushionMinor =
        runway.remainingConsumptionMinor + moneyRescuedMinor;
      const rawDailyBaseline = runway.monthToDateConsumptionMinor / elapsedDays;

      // Guard strictly against zero or negative denominator
      const extraBufferRunwayDays =
        rawDailyBaseline > 0
          ? Math.round((shockCushionMinor / rawDailyBaseline) * 10) / 10
          : null;

      const pace = getRunwayPaceStatus(runway);
      const isDeficitWatch =
        runway.isOverBudget ||
        projectedSurplusOrDeficitMinor < 0 ||
        pace.status !== "on_track";

      const watchLabel =
        mtdTransactions.length === 0
          ? "No Pace Data Yet"
          : projectedSurplusOrDeficitMinor < 0 || runway.isOverBudget
            ? "Deficit Watch"
            : pace.status === "tight_runway"
              ? "Tight Watch"
              : "Surplus Pace";

      const hasLiveSignal = mtdTransactions.length > 0;

      return {
        headline: hasLiveSignal
          ? "Mid-Month Pace & Buffer Telemetry"
          : "Monitor–Compare–Adjust Ready",
        insight: hasLiveSignal
          ? projectedSurplusOrDeficitMinor < 0
            ? "Early telemetry flags a projected budget deficit watch—this is a pacing signal, not confirmed hardship. Adjusting daily discretionary burn over the remaining days can swing month-end back to surplus."
            : "Your current burn pace projects a month-end surplus while your shock cushion buys extra runway days against surprises."
          : "Log expenses as the month unfolds to unlock projected month-end balance and buffer runway days.",
        metrics: [
          {
            label: "Projected Month-End",
            valueType: "money_minor",
            numericValue: hasLiveSignal ? projectedSurplusOrDeficitMinor : null,
            ...(!hasLiveSignal ? { textValue: "Needs burn data" } : {}),
            tone:
              !hasLiveSignal
                ? "neutral"
                : projectedSurplusOrDeficitMinor < 0
                  ? "caution"
                  : "positive",
          },
          {
            label: "Buffer Runway Days",
            valueType: "text",
            numericValue: extraBufferRunwayDays,
            textValue:
              extraBufferRunwayDays !== null
                ? `${extraBufferRunwayDays} days`
                : "No burn baseline",
            tone:
              extraBufferRunwayDays === null
                ? "neutral"
                : extraBufferRunwayDays >= runway.daysRemainingInMonth
                  ? "positive"
                  : "caution",
          },
          {
            label: "Deficit Watch",
            valueType: "text",
            numericValue: null,
            textValue: watchLabel,
            tone: !hasLiveSignal
              ? "neutral"
              : isDeficitWatch
                ? "caution"
                : "positive",
          },
        ],
        hasLiveSignal,
        actionLink: { label: "Adjust Runway Pace", href: "/runway" },
      };
    }

    // -----------------------------------------------------------------------
    // LEVEL 9: Laibson Two-Asset Split (Final Boss)
    // -----------------------------------------------------------------------
    case 9: {
      if (!profile || !runway) {
        return buildMissingProfileBaseline(
          "Configure Baseline for Your Golden Egg Split",
          "StopBucks models your protected commitments, growth target, and Vault rescues as a practical behavioral-design analogy to Laibson's illiquid Golden Eggs.",
          "Configure Runway",
          "/runway"
        );
      }

      const protectedGoldenEggsMinor =
        runway.fixedCommitmentsMinor +
        runway.selfInvestTargetMinor +
        moneyRescuedMinor;
      const exposedLiquidPoolMinor = runway.consumptionBudgetMinor;

      const resolvedCount = rescuedItems.length + purchasedVaultItems.length;
      const vaultRescueRatePct =
        resolvedCount > 0
          ? Math.round((rescuedItems.length / resolvedCount) * 100)
          : null;

      const hasLiveSignal =
        protectedGoldenEggsMinor > 0 ||
        exposedLiquidPoolMinor > 0 ||
        resolvedCount > 0;

      return {
        headline: hasLiveSignal
          ? "Your Protected Golden Eggs vs. Liquid Pool"
          : "Build Your Commitment Assets",
        insight:
          resolvedCount > 0
            ? `As a practical behavioral-design analogy (not an experimental measurement of your discount rate), you've ring-fenced commitments, growth, and ${rescuedItems.length} of ${resolvedCount} resolved Vault items away from impulse liquidity.`
            : "As a behavioral-design analogy to Laibson's illiquid commitment assets, your fixed bills and Invest-in-Self goal stay separate from your liquid pool—try cooling an impulse in the 48-Hour Vault to measure your rescue rate.",
        metrics: [
          {
            label: "Protected Golden Eggs",
            valueType: "money_minor",
            numericValue: protectedGoldenEggsMinor,
            tone: protectedGoldenEggsMinor > 0 ? "positive" : "neutral",
          },
          {
            label: "Exposed Liquid Pool",
            valueType: "money_minor",
            numericValue: exposedLiquidPoolMinor,
            tone: "neutral",
          },
          {
            label: "Vault Rescue Rate",
            valueType: "percent",
            numericValue: vaultRescueRatePct,
            textValue:
              resolvedCount > 0
                ? `${rescuedItems.length}/${resolvedCount} rescued`
                : "No resolved items",
            tone:
              vaultRescueRatePct === null
                ? "neutral"
                : vaultRescueRatePct >= 50
                  ? "positive"
                  : "caution",
          },
        ],
        hasLiveSignal,
        actionLink: { label: "Open 48-Hour Vault", href: "/vault" },
      };
    }
  }
}

// Re-export micro threshold check helper for mirror unit assertions if needed
export { getCashlessMicroThresholdMinor };
