/**
 * StopBucks Dojo Progression Engine & Interactive Behavioral Simulation Helpers
 * Pure TypeScript: No React, No Next.js, No Supabase, No browser APIs.
 */

import { getLocalDateParts } from "./behavioral-engine";
import { convertTo4YearCompounded } from "./currency";
import { getDojoLevel } from "./dojo-curriculum";
import type {
  BroadBracketEvaluation,
  DojoBelt,
  DojoLevelCompletion,
  DojoLevelCompletionInput,
  DojoLevelCompletionResult,
  DojoLevelId,
  DojoLevelStatus,
  DojoProgress,
  DojoRankInfo,
  DojoRankTitle,
  LaibsonCurvePoint,
  LaibsonWelfareEvaluation,
  PrelecCouplingEvaluation,
} from "./dojo-types";

interface BeltTier {
  minXp: number;
  belt: DojoBelt;
  title: DojoRankTitle;
  nextBeltXp: number | null;
}

export const DOJO_BELT_TIERS: readonly BeltTier[] = [
  { minXp: 0, belt: "White Belt", title: "Impulse Rookie", nextBeltXp: 200 },
  { minXp: 200, belt: "Yellow Belt", title: "Bias Spotter", nextBeltXp: 450 },
  { minXp: 450, belt: "Green Belt", title: "Friction Architect", nextBeltXp: 750 },
  { minXp: 750, belt: "Blue Belt", title: "Bucket Strategist", nextBeltXp: 1100 },
  { minXp: 1100, belt: "Black Belt", title: "Golden Egg Master", nextBeltXp: null },
] as const;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Validates and parses a local YYYY-MM-DD calendar date key into UTC midnight ms.
 */
function parseLocalDateKeyToUtcMs(dateKey: string): number {
  if (typeof dateKey !== "string" || !DATE_KEY_PATTERN.test(dateKey)) {
    throw new RangeError(`Expected YYYY-MM-DD local date key, received: ${String(dateKey)}`);
  }
  const [yearStr, monthStr, dayStr] = dateKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() + 1 !== month ||
    utcDate.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date key: ${dateKey}`);
  }
  return utcDate.getTime();
}

/**
 * Computes signed whole-day difference (currentDateKey - previousDateKey).
 */
export function diffLocalCalendarDays(
  previousDateKey: string,
  currentDateKey: string
): number {
  const prevMs = parseLocalDateKeyToUtcMs(previousDateKey);
  const currMs = parseLocalDateKeyToUtcMs(currentDateKey);
  return Math.round((currMs - prevMs) / DAY_MS);
}

/**
 * Formats a Date into a local YYYY-MM-DD key in the explicitly supplied timezone.
 */
export function formatLocalDateKey(referenceDate: Date, timeZone?: string): string {
  if (!(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) {
    throw new RangeError("formatLocalDateKey requires a valid Date instance.");
  }
  const { year, month, day } = getLocalDateParts(referenceDate, timeZone);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Computes the student's 5-Belt Rank Ladder standing from total XP.
 */
export function getDojoRank(totalXp: number): DojoRankInfo {
  if (typeof totalXp !== "number" || !Number.isFinite(totalXp)) {
    throw new TypeError(`totalXp must be a finite number, received: ${totalXp}`);
  }
  if (!Number.isSafeInteger(totalXp) || totalXp < 0) {
    throw new RangeError(`totalXp must be a non-negative safe integer, received: ${totalXp}`);
  }

  let matched = DOJO_BELT_TIERS[0];
  for (const tier of DOJO_BELT_TIERS) {
    if (totalXp >= tier.minXp) {
      matched = tier;
    }
  }

  if (matched.nextBeltXp === null) {
    return {
      belt: matched.belt,
      title: matched.title,
      currentXp: totalXp,
      nextBeltXp: null,
      progressPct: 100,
    };
  }

  const span = matched.nextBeltXp - matched.minXp;
  const rawPct = Math.floor(((totalXp - matched.minXp) / span) * 100);
  const progressPct = Math.min(99, Math.max(0, rawPct));

  return {
    belt: matched.belt,
    title: matched.title,
    currentXp: totalXp,
    nextBeltXp: matched.nextBeltXp,
    progressPct,
  };
}

/**
 * Creates a clean initial Dojo progress state for a fresh authenticated account.
 */
export function createInitialDojoProgress(
  nowIso: string = "1970-01-01T00:00:00.000Z"
): DojoProgress {
  if (typeof nowIso !== "string" || Number.isNaN(Date.parse(nowIso))) {
    throw new RangeError(`nowIso must be a valid ISO timestamp, received: ${nowIso}`);
  }

  return {
    completedLevels: [],
    totalXp: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    unlockedBadges: [],
    soundMuted: false,
    updatedAt: nowIso,
  };
}

/**
 * Creates the one-time Guest Sandbox Dojo seed with Level 1 mastered (100% accuracy)
 * so Level 2 is immediately unlocked while keeping Level 1 replayable.
 */
export function createGuestSeededDojoProgress(
  referenceDate: Date,
  timeZone: string
): DojoProgress {
  if (!(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) {
    throw new RangeError("createGuestSeededDojoProgress requires a valid referenceDate.");
  }

  const level1 = getDojoLevel(1);
  const seededXp = level1.baseXp + level1.perfectBonusXp;
  const iso = referenceDate.toISOString();
  const localDateKey = formatLocalDateKey(referenceDate, timeZone);

  return {
    completedLevels: [
      {
        levelId: 1,
        bestAccuracyPct: 100,
        earnedXp: seededXp,
        completedAt: iso,
        replayCount: 0,
      },
    ],
    totalXp: seededXp,
    currentStreak: 1,
    longestStreak: 1,
    lastCompletedDate: localDateKey,
    unlockedBadges: [level1.badgeId],
    soundMuted: false,
    updatedAt: iso,
  };
}

/**
 * Evaluates whether a level is completed, currently active (unlocked), or locked.
 */
export function getLevelStatus(
  levelId: DojoLevelId,
  progress: DojoProgress
): DojoLevelStatus {
  const completedSet = new Set(progress.completedLevels.map((entry) => entry.levelId));

  if (completedSet.has(levelId)) {
    return "completed";
  }
  if (levelId === 1) {
    return "active";
  }
  const prevLevelId = (levelId - 1) as DojoLevelId;
  return completedSet.has(prevLevelId) ? "active" : "locked";
}

/**
 * Applies a completed lesson attempt deterministically with replay XP protection,
 * badge deduplication, belt rank-up detection, and timezone-safe streak tracking.
 */
export function applyDojoLevelCompletion(
  progress: DojoProgress,
  input: DojoLevelCompletionInput
): DojoLevelCompletionResult {
  const level = getDojoLevel(input.levelId);

  if (
    typeof input.totalQuestions !== "number" ||
    !Number.isSafeInteger(input.totalQuestions) ||
    input.totalQuestions <= 0
  ) {
    throw new RangeError(
      `totalQuestions must be a positive safe integer, received: ${input.totalQuestions}`
    );
  }
  if (
    typeof input.correctCount !== "number" ||
    !Number.isSafeInteger(input.correctCount) ||
    input.correctCount < 0 ||
    input.correctCount > input.totalQuestions
  ) {
    throw new RangeError(
      `correctCount must be between 0 and ${input.totalQuestions}, received: ${input.correctCount}`
    );
  }
  parseLocalDateKeyToUtcMs(input.localDateKey);
  if (typeof input.nowIso !== "string" || Number.isNaN(Date.parse(input.nowIso))) {
    throw new RangeError(`nowIso must be a valid ISO timestamp, received: ${input.nowIso}`);
  }

  const currentStatus = getLevelStatus(input.levelId, progress);
  if (currentStatus === "locked") {
    throw new Error(
      `Level ${input.levelId} is locked. Complete Level ${input.levelId - 1} first.`
    );
  }

  const previousRank = getDojoRank(progress.totalXp);
  const accuracyPct = Math.round((input.correctCount / input.totalQuestions) * 100);
  const isPerfect = input.correctCount === input.totalQuestions;

  const existingIndex = progress.completedLevels.findIndex(
    (entry) => entry.levelId === input.levelId
  );
  const existing = existingIndex >= 0 ? progress.completedLevels[existingIndex] : null;

  let xpAwarded = 0;
  let isFirstCompletion = false;
  let nextCompletedLevels: DojoLevelCompletion[];

  if (!existing) {
    isFirstCompletion = true;
    xpAwarded = level.baseXp + (isPerfect ? level.perfectBonusXp : 0);
    const created: DojoLevelCompletion = {
      levelId: input.levelId,
      bestAccuracyPct: accuracyPct,
      earnedXp: xpAwarded,
      completedAt: input.nowIso,
      replayCount: 0,
    };
    nextCompletedLevels = [...progress.completedLevels, created].sort(
      (a, b) => a.levelId - b.levelId
    );
  } else {
    isFirstCompletion = false;
    const earnedMissingPerfectBonus =
      isPerfect && existing.bestAccuracyPct < 100 ? level.perfectBonusXp : 0;
    xpAwarded = earnedMissingPerfectBonus;

    const updated: DojoLevelCompletion = {
      ...existing,
      bestAccuracyPct: Math.max(existing.bestAccuracyPct, accuracyPct),
      earnedXp: existing.earnedXp + xpAwarded,
      replayCount: existing.replayCount + 1,
    };
    nextCompletedLevels = progress.completedLevels.map((entry, idx) =>
      idx === existingIndex ? updated : entry
    );
  }

  const hasBadgeAlready = progress.unlockedBadges.includes(level.badgeId);
  const newlyUnlockedBadgeId =
    isFirstCompletion && !hasBadgeAlready ? level.badgeId : null;
  const nextUnlockedBadges = hasBadgeAlready
    ? [...progress.unlockedBadges]
    : [...progress.unlockedBadges, level.badgeId];

  // Timezone-safe local calendar streak calculation
  let nextCurrentStreak: number;
  let nextLastCompletedDate = input.localDateKey;

  if (!progress.lastCompletedDate) {
    nextCurrentStreak = 1;
  } else {
    const dayDiff = diffLocalCalendarDays(
      progress.lastCompletedDate,
      input.localDateKey
    );
    if (dayDiff === 0) {
      nextCurrentStreak = Math.max(1, progress.currentStreak);
    } else if (dayDiff === 1) {
      nextCurrentStreak = Math.max(1, progress.currentStreak + 1);
    } else if (dayDiff > 1) {
      nextCurrentStreak = 1;
    } else {
      // Defensive handling if a completion carries an earlier local date than stored
      nextCurrentStreak = Math.max(1, progress.currentStreak);
      nextLastCompletedDate = progress.lastCompletedDate;
    }
  }

  const nextLongestStreak = Math.max(progress.longestStreak, nextCurrentStreak);
  const nextTotalXp = progress.totalXp + xpAwarded;
  const nextRank = getDojoRank(nextTotalXp);

  const rankUpTo =
    xpAwarded > 0 && nextRank.belt !== previousRank.belt ? nextRank : null;

  return {
    nextProgress: {
      completedLevels: nextCompletedLevels,
      totalXp: nextTotalXp,
      currentStreak: nextCurrentStreak,
      longestStreak: nextLongestStreak,
      lastCompletedDate: nextLastCompletedDate,
      unlockedBadges: nextUnlockedBadges,
      soundMuted: progress.soundMuted,
      updatedAt: input.nowIso,
    },
    xpAwarded,
    newlyUnlockedBadgeId,
    accuracyPct,
    isFirstCompletion,
    rankUpTo,
  };
}

// ============================================================================
// INTERACTIVE MECHANIC SIMULATION HELPERS
// ============================================================================

const PRELEC_ILLUSTRATIVE_DISCLAIMER =
  "Illustrative normalized scale (0–100) grounded in Prelec & Loewenstein's (1998) qualitative coupling hierarchy; not an empirical coefficient from the paper.";

/**
 * Evaluates payment-consumption coupling across Cash (0), UPI/Card (1), and Flat-Rate/BNPL (2).
 */
export function evaluatePrelecCoupling(
  modeIndex: 0 | 1 | 2
): PrelecCouplingEvaluation {
  switch (modeIndex) {
    case 0:
      return {
        modeIndex: 0,
        modeLabel: "Cash",
        couplingLevel: "high",
        couplingStrengthPct: 95,
        painSaliencePct: 90,
        isIllustrativeScale: true,
        scaleDisclaimer: PRELEC_ILLUSTRATIVE_DISCLAIMER,
        behavioralExplanation:
          "Handing over physical currency tightly couples payment to consumption. Seeing bills leave your wallet creates immediate 'red-ink' pain salience that slows down low-value impulse buys.",
        comparisonSummary:
          "Tightest coupling on the spectrum. Prelec & Loewenstein (1998) found double-entry mental accounting explained choices better than standard discounting for 60% vs. 29% of subjects.",
      };
    case 1:
      return {
        modeIndex: 1,
        modeLabel: "UPI / Card",
        couplingLevel: "moderate",
        couplingStrengthPct: 45,
        painSaliencePct: 40,
        isIllustrativeScale: true,
        scaleDisclaimer: PRELEC_ILLUSTRATIVE_DISCLAIMER,
        behavioralExplanation:
          "Instant QR scans and card taps strip away physical handling and often bundle dozens of small purchases into one summary feed, dulling immediate pain salience.",
        comparisonSummary:
          "Moderate/weakened coupling: micro-taps feel frictionless individually, which is why StopBucks flags cashless taps under 1.5% of budget as Cashless Numbness.",
      };
    case 2:
      return {
        modeIndex: 2,
        modeLabel: "Flat-Rate / BNPL",
        couplingLevel: "low",
        couplingStrengthPct: 15,
        painSaliencePct: 12,
        isIllustrativeScale: true,
        scaleDisclaimer: PRELEC_ILLUSTRATIVE_DISCLAIMER,
        behavioralExplanation:
          "Flat-rate bundles and deferred 'Buy Now, Pay Later' installments decouple the moment of enjoyment from payment, letting consumption feel nearly free now while shifting pain onto future months.",
        comparisonSummary:
          "Weakest immediate coupling: Prelec & Loewenstein note decoupling lets consumers enjoy consumption 'as if free'—beneficial when genuinely prepaid, risky when debt is pushed forward.",
      };
    default:
      throw new RangeError(
        `modeIndex must be 0, 1, or 2, received: ${String(modeIndex)}`
      );
  }
}

const LAIBSON_TABLE_II_ANCHORS: ReadonlyArray<{ beta: number; lossPct: number }> = [
  { beta: 0.4, lossPct: 29.5 },
  { beta: 0.6, lossPct: 9.0 },
  { beta: 0.8, lossPct: 1.6 },
  { beta: 1.0, lossPct: 0.0 },
];

// Documented illustrative long-run exponential discount factor for period 0–10 curves.
const LAIBSON_CURVE_DELTA = 0.95;

/**
 * Evaluates quasi-hyperbolic welfare loss using piecewise linear interpolation between
 * David Laibson (1997) Table II reference points (β = 1.0, 0.8, 0.6, 0.4) and generates
 * comparative exponential vs. quasi-hyperbolic discount curves for periods 0–10.
 */
export function evaluateLaibsonWelfareLoss(beta: number): LaibsonWelfareEvaluation {
  if (typeof beta !== "number" || !Number.isFinite(beta)) {
    throw new TypeError(`beta must be a finite number, received: ${beta}`);
  }

  const clampedBeta = Math.min(1.0, Math.max(0.4, Math.round(beta * 1000) / 1000));

  let welfareLossPct = 0;
  for (let i = 0; i < LAIBSON_TABLE_II_ANCHORS.length - 1; i += 1) {
    const low = LAIBSON_TABLE_II_ANCHORS[i];
    const high = LAIBSON_TABLE_II_ANCHORS[i + 1];

    if (clampedBeta >= low.beta && clampedBeta <= high.beta) {
      const ratio = (clampedBeta - low.beta) / (high.beta - low.beta);
      const interpolated = low.lossPct + ratio * (high.lossPct - low.lossPct);
      welfareLossPct = Math.round(interpolated * 100) / 100;
      break;
    }
  }

  const curvePoints: LaibsonCurvePoint[] = [];
  for (let period = 0; period <= 10; period += 1) {
    const expFactor = Math.pow(LAIBSON_CURVE_DELTA, period);
    const exponential = Math.round(expFactor * 1000) / 1000;
    const hyperbolic =
      period === 0
        ? 1
        : Math.round(clampedBeta * expFactor * 1000) / 1000;

    curvePoints.push({
      period,
      exponential,
      hyperbolic,
    });
  }

  const exponentialDiscountAtPeriod1 = LAIBSON_CURVE_DELTA;
  const hyperbolicDiscountAtPeriod1 =
    Math.round(clampedBeta * LAIBSON_CURVE_DELTA * 1000) / 1000;

  let insight: string;
  if (clampedBeta >= 0.99) {
    insight =
      "At β = 1.0, discounting is purely exponential (time-consistent): your future self and present self agree, so instant liquidity carries 0.0% Table II welfare loss.";
  } else if (clampedBeta >= 0.75) {
    insight =
      "Mild present bias (β near 0.8) creates a modest 1.6% Table II welfare loss when illiquid commitment mechanisms are replaced by frictionless instant liquidity.";
  } else if (clampedBeta >= 0.55) {
    insight =
      "Moderate present bias (β near 0.6) drives a sharp drop right after Period 0, raising Table II welfare loss toward 9.0% of output without commitment guardrails like delayed access.";
  } else {
    insight =
      "Strong present bias (β near 0.4) heavily discounts tomorrow relative to right now, scaling Laibson's Table II welfare loss up to 29.5% of output when commitment barriers vanish.";
  }

  return {
    beta: clampedBeta,
    welfareLossPct,
    exponentialDelta: LAIBSON_CURVE_DELTA,
    exponentialDiscountAtPeriod1,
    hyperbolicDiscountAtPeriod1,
    interpolationMethod: "piecewise_linear_laibson_1997_table_ii",
    curvePoints,
    insight,
  };
}

/**
 * Broad-bracket helper converting a daily minor-unit habit into weekly, monthly,
 * annual, and 4-year compounded opportunity cost using StopBucks's canonical 8% p.a. utility.
 */
export function evaluateBroadBracketZoom(dailyMinor: number): BroadBracketEvaluation {
  if (typeof dailyMinor !== "number" || !Number.isFinite(dailyMinor)) {
    throw new TypeError(`dailyMinor must be a finite number, received: ${dailyMinor}`);
  }
  if (!Number.isSafeInteger(dailyMinor) || dailyMinor < 0) {
    throw new RangeError(
      `dailyMinor must be a non-negative safe integer, received: ${dailyMinor}`
    );
  }

  const weeklyMinor = dailyMinor * 7;
  const monthlyMinor = dailyMinor * 30;
  const annualMinor = dailyMinor * 365;
  const compounded4YearMinor = convertTo4YearCompounded(annualMinor);

  return {
    dailyMinor,
    weeklyMinor,
    monthlyMinor,
    annualMinor,
    compounded4YearMinor,
  };
}
