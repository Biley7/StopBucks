import { describe, expect, it } from "vitest";
import {
  DOJO_LEVELS,
  DOJO_WORLDS,
  getDojoLevel,
  getDojoWorld,
} from "@/domain/dojo-curriculum";
import {
  applyDojoLevelCompletion,
  createGuestSeededDojoProgress,
  createInitialDojoProgress,
  evaluateBroadBracketZoom,
  evaluateLaibsonWelfareLoss,
  evaluatePrelecCoupling,
  formatLocalDateKey,
  getDojoRank,
  getLevelStatus,
} from "@/domain/dojo-engine";
import { convertTo4YearCompounded } from "@/domain/currency";
import type { DojoLevelId } from "@/domain/dojo-types";
import { queryKeys } from "@/lib/query-keys";

describe("Phase 5A: Dojo Research Curriculum Integrity", () => {
  it("defines exactly 3 worlds and 9 ordered levels (3 per world)", () => {
    expect(DOJO_WORLDS).toHaveLength(3);
    expect(DOJO_LEVELS).toHaveLength(9);

    expect(DOJO_WORLDS.map((w) => w.worldNumber)).toEqual([1, 2, 3]);
    expect(DOJO_LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const world of DOJO_WORLDS) {
      const levelsInWorld = DOJO_LEVELS.filter((l) => l.worldId === world.id);
      expect(levelsInWorld).toHaveLength(3);
      expect(getDojoWorld(world.id)).toEqual(world);
      expect(getDojoWorld(world.worldNumber)).toEqual(world);
    }
  });

  it("places bosses strictly on levels 3, 6, and 9 with unique IDs and badges", () => {
    const levelIds = new Set(DOJO_LEVELS.map((l) => l.id));
    const slugs = new Set(DOJO_LEVELS.map((l) => l.slug));
    const badgeIds = new Set(DOJO_LEVELS.map((l) => l.badgeId));

    expect(levelIds.size).toBe(9);
    expect(slugs.size).toBe(9);
    expect(badgeIds.size).toBe(9);

    for (const level of DOJO_LEVELS) {
      expect(getDojoLevel(level.id)).toEqual(level);
      const shouldBeBoss = level.id === 3 || level.id === 6 || level.id === 9;
      expect(level.isBoss).toBe(shouldBeBoss);
      expect(level.baseXp).toBeGreaterThan(0);
      expect(level.perfectBonusXp).toBeGreaterThan(0);
    }
  });

  it("validates every citation, wager, mechanic union, and mastery question", () => {
    for (const level of DOJO_LEVELS) {
      // Primary citation completeness
      expect(level.citation.authors.trim().length).toBeGreaterThan(0);
      expect(level.citation.year).toBeGreaterThanOrEqual(1990);
      expect(level.citation.title.trim().length).toBeGreaterThan(0);
      expect(level.citation.journal.trim().length).toBeGreaterThan(0);
      expect(level.citation.sampleSummary.trim().length).toBeGreaterThan(0);
      expect(level.citation.keyFinding.trim().length).toBeGreaterThan(0);

      if (level.secondaryCitation) {
        expect(level.secondaryCitation.authors.trim().length).toBeGreaterThan(0);
        expect(level.secondaryCitation.title.trim().length).toBeGreaterThan(0);
        expect(level.secondaryCitation.journal.trim().length).toBeGreaterThan(0);
      }

      // Wager validation
      expect(level.wager.prompt.trim().length).toBeGreaterThan(0);
      expect(level.wager.options.length).toBeGreaterThanOrEqual(2);
      expect(level.wager.correctIndex).toBeGreaterThanOrEqual(0);
      expect(level.wager.correctIndex).toBeLessThan(level.wager.options.length);
      expect(level.wager.comparisonBars.length).toBeGreaterThanOrEqual(2);

      // Mechanic discriminated union validation
      switch (level.mechanic.kind) {
        case "impulse_duel": {
          expect(level.mechanic.scenario.trim().length).toBeGreaterThan(0);
          expect(level.mechanic.system1Excuse.trim().length).toBeGreaterThan(0);
          expect(level.mechanic.choices.length).toBeGreaterThanOrEqual(2);
          expect(level.mechanic.choices.some((c) => c.isDeliberative)).toBe(true);
          expect(level.mechanic.choices.some((c) => !c.isDeliberative)).toBe(true);
          if (level.mechanic.rounds) {
            expect(level.mechanic.rounds.length).toBe(3);
            for (const round of level.mechanic.rounds) {
              expect(round.choices.some((c) => c.isDeliberative)).toBe(true);
              expect(round.choices.some((c) => !c.isDeliberative)).toBe(true);
            }
          }
          break;
        }
        case "interactive_slider": {
          expect(level.mechanic.min).toBeLessThan(level.mechanic.max);
          expect(level.mechanic.step).toBeGreaterThan(0);
          expect(level.mechanic.defaultValue).toBeGreaterThanOrEqual(level.mechanic.min);
          expect(level.mechanic.defaultValue).toBeLessThanOrEqual(level.mechanic.max);
          expect(level.mechanic.targetRange.min).toBeLessThanOrEqual(
            level.mechanic.targetRange.max
          );
          expect(level.mechanic.targetRange.min).toBeGreaterThanOrEqual(level.mechanic.min);
          expect(level.mechanic.targetRange.max).toBeLessThanOrEqual(level.mechanic.max);
          expect(["coupling_meter", "broad_bracket_zoom", "hyperbolic_beta"]).toContain(
            level.mechanic.presetKey
          );
          break;
        }
        case "bucket_sort": {
          const categoryIds = new Set(level.mechanic.categories.map((c) => c.id));
          expect(categoryIds.size).toBe(level.mechanic.categories.length);
          expect(categoryIds.size).toBeGreaterThanOrEqual(2);
          expect(level.mechanic.items.length).toBeGreaterThanOrEqual(4);
          for (const item of level.mechanic.items) {
            expect(categoryIds.has(item.correctCategoryId)).toBe(true);
          }
          break;
        }
        case "feedback_loop": {
          expect(level.mechanic.shockTitle.trim().length).toBeGreaterThan(0);
          expect(level.mechanic.shockDescription.trim().length).toBeGreaterThan(0);
          expect(level.mechanic.steps.length).toBeGreaterThanOrEqual(3);
          for (const step of level.mechanic.steps) {
            expect(step.options.length).toBeGreaterThanOrEqual(2);
            expect(step.options.some((o) => o.isOptimal)).toBe(true);
          }
          break;
        }
      }

      // Mastery questions validation
      expect(level.masteryQuestions.length).toBeGreaterThanOrEqual(1);
      for (const question of level.masteryQuestions) {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThan(question.options.length);
        expect(question.explanation.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Phase 5A: 5-Belt Rank Ladder Boundaries", () => {
  it("maps every exact XP threshold boundary accurately", () => {
    expect(getDojoRank(0)).toEqual({
      belt: "White Belt",
      title: "Impulse Rookie",
      currentXp: 0,
      nextBeltXp: 200,
      progressPct: 0,
    });
    expect(getDojoRank(199)).toEqual({
      belt: "White Belt",
      title: "Impulse Rookie",
      currentXp: 199,
      nextBeltXp: 200,
      progressPct: 99,
    });

    expect(getDojoRank(200)).toEqual({
      belt: "Yellow Belt",
      title: "Bias Spotter",
      currentXp: 200,
      nextBeltXp: 450,
      progressPct: 0,
    });
    expect(getDojoRank(449)).toEqual({
      belt: "Yellow Belt",
      title: "Bias Spotter",
      currentXp: 449,
      nextBeltXp: 450,
      progressPct: 99,
    });

    expect(getDojoRank(450)).toEqual({
      belt: "Green Belt",
      title: "Friction Architect",
      currentXp: 450,
      nextBeltXp: 750,
      progressPct: 0,
    });
    expect(getDojoRank(749)).toEqual({
      belt: "Green Belt",
      title: "Friction Architect",
      currentXp: 749,
      nextBeltXp: 750,
      progressPct: 99,
    });

    expect(getDojoRank(750)).toEqual({
      belt: "Blue Belt",
      title: "Bucket Strategist",
      currentXp: 750,
      nextBeltXp: 1100,
      progressPct: 0,
    });
    expect(getDojoRank(1099)).toEqual({
      belt: "Blue Belt",
      title: "Bucket Strategist",
      currentXp: 1099,
      nextBeltXp: 1100,
      progressPct: 99,
    });

    expect(getDojoRank(1100)).toEqual({
      belt: "Black Belt",
      title: "Golden Egg Master",
      currentXp: 1100,
      nextBeltXp: null,
      progressPct: 100,
    });
    expect(getDojoRank(1480)).toEqual({
      belt: "Black Belt",
      title: "Golden Egg Master",
      currentXp: 1480,
      nextBeltXp: null,
      progressPct: 100,
    });
  });

  it("rejects invalid XP values", () => {
    expect(() => getDojoRank(-1)).toThrow(RangeError);
    expect(() => getDojoRank(10.5)).toThrow(RangeError);
    expect(() => getDojoRank(Number.NaN)).toThrow(TypeError);
    expect(() => getDojoRank(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

describe("Phase 5A: Initial Progress, Guest Seeding, Unlocking & Replay Protection", () => {
  it("creates empty initial progress cleanly", () => {
    const initial = createInitialDojoProgress();
    expect(initial.completedLevels).toEqual([]);
    expect(initial.totalXp).toBe(0);
    expect(initial.currentStreak).toBe(0);
    expect(initial.longestStreak).toBe(0);
    expect(initial.lastCompletedDate).toBeNull();
    expect(initial.unlockedBadges).toEqual([]);
    expect(initial.soundMuted).toBe(false);
  });

  it("seeds Guest Sandbox with Level 1 mastered in the explicit timezone", () => {
    const refDate = new Date("2026-11-30T20:00:00.000Z");
    const kolkataSeed = createGuestSeededDojoProgress(refDate, "Asia/Kolkata");
    const utcSeed = createGuestSeededDojoProgress(refDate, "UTC");

    expect(kolkataSeed.lastCompletedDate).toBe("2026-12-01");
    expect(utcSeed.lastCompletedDate).toBe("2026-11-30");

    expect(kolkataSeed.totalXp).toBe(120); // Level 1: 100 + 20
    expect(kolkataSeed.currentStreak).toBe(1);
    expect(kolkataSeed.longestStreak).toBe(1);
    expect(kolkataSeed.unlockedBadges).toEqual(["planners_shield"]);
    expect(kolkataSeed.completedLevels).toEqual([
      {
        levelId: 1,
        bestAccuracyPct: 100,
        earnedXp: 120,
        completedAt: refDate.toISOString(),
        replayCount: 0,
      },
    ]);

    expect(getLevelStatus(1, kolkataSeed)).toBe("completed");
    expect(getLevelStatus(2, kolkataSeed)).toBe("active");
    expect(getLevelStatus(3, kolkataSeed)).toBe("locked");
  });

  it("enforces sequential level unlocking and blocks locked levels", () => {
    const initial = createInitialDojoProgress();
    expect(getLevelStatus(1, initial)).toBe("active");
    for (let id = 2 as DojoLevelId; id <= 9; id = (id + 1) as DojoLevelId) {
      expect(getLevelStatus(id, initial)).toBe("locked");
    }

    expect(() =>
      applyDojoLevelCompletion(initial, {
        levelId: 2,
        correctCount: 3,
        totalQuestions: 3,
        localDateKey: "2026-11-25",
        nowIso: "2026-11-25T10:00:00.000Z",
      })
    ).toThrow(/locked/i);

    const afterL1 = applyDojoLevelCompletion(initial, {
      levelId: 1,
      correctCount: 2,
      totalQuestions: 3,
      localDateKey: "2026-11-25",
      nowIso: "2026-11-25T10:00:00.000Z",
    });

    expect(getLevelStatus(1, afterL1.nextProgress)).toBe("completed");
    expect(getLevelStatus(2, afterL1.nextProgress)).toBe("active");
    expect(getLevelStatus(3, afterL1.nextProgress)).toBe("locked");
  });

  it("awards base + perfect bonus accurately and prevents XP farming on replays", () => {
    const start = createInitialDojoProgress();

    // 1. Imperfect first completion of Level 1 (2/3 = 67%) -> baseXp only (100)
    const first = applyDojoLevelCompletion(start, {
      levelId: 1,
      correctCount: 2,
      totalQuestions: 3,
      localDateKey: "2026-11-25",
      nowIso: "2026-11-25T09:00:00.000Z",
    });
    expect(first.isFirstCompletion).toBe(true);
    expect(first.accuracyPct).toBe(67);
    expect(first.xpAwarded).toBe(100);
    expect(first.newlyUnlockedBadgeId).toBe("planners_shield");
    expect(first.rankUpTo).toBeNull();
    expect(first.nextProgress.totalXp).toBe(100);
    expect(first.nextProgress.completedLevels[0].replayCount).toBe(0);

    // 2. Imperfect replay (1/3 = 33%) -> 0 XP, bestAccuracyPct stays 67, replayCount = 1
    const replayFail = applyDojoLevelCompletion(first.nextProgress, {
      levelId: 1,
      correctCount: 1,
      totalQuestions: 3,
      localDateKey: "2026-11-25",
      nowIso: "2026-11-25T10:00:00.000Z",
    });
    expect(replayFail.isFirstCompletion).toBe(false);
    expect(replayFail.xpAwarded).toBe(0);
    expect(replayFail.newlyUnlockedBadgeId).toBeNull();
    expect(replayFail.rankUpTo).toBeNull();
    expect(replayFail.nextProgress.totalXp).toBe(100);
    expect(replayFail.nextProgress.completedLevels[0].bestAccuracyPct).toBe(67);
    expect(replayFail.nextProgress.completedLevels[0].replayCount).toBe(1);
    expect(replayFail.nextProgress.unlockedBadges).toEqual(["planners_shield"]);

    // 3. Perfect replay after imperfect completion -> ONLY missing perfectBonusXp (20), NOT baseXp
    const replayPerfect = applyDojoLevelCompletion(replayFail.nextProgress, {
      levelId: 1,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: "2026-11-25",
      nowIso: "2026-11-25T11:00:00.000Z",
    });
    expect(replayPerfect.isFirstCompletion).toBe(false);
    expect(replayPerfect.xpAwarded).toBe(20);
    expect(replayPerfect.newlyUnlockedBadgeId).toBeNull();
    expect(replayPerfect.nextProgress.totalXp).toBe(120);
    expect(replayPerfect.nextProgress.completedLevels[0].bestAccuracyPct).toBe(100);
    expect(replayPerfect.nextProgress.completedLevels[0].replayCount).toBe(2);
    expect(replayPerfect.nextProgress.completedLevels[0].completedAt).toBe(
      "2026-11-25T09:00:00.000Z"
    );

    // 4. Second perfect replay -> 0 XP (no farming!), badges never duplicated
    const replayPerfectAgain = applyDojoLevelCompletion(replayPerfect.nextProgress, {
      levelId: 1,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: "2026-11-25",
      nowIso: "2026-11-25T12:00:00.000Z",
    });
    expect(replayPerfectAgain.xpAwarded).toBe(0);
    expect(replayPerfectAgain.nextProgress.totalXp).toBe(120);
    expect(replayPerfectAgain.nextProgress.completedLevels).toHaveLength(1);
    expect(replayPerfectAgain.nextProgress.unlockedBadges).toEqual(["planners_shield"]);

    // 5. Completing Level 2 (110 + 25 = 135) crosses 200 XP -> rankUpTo Yellow Belt
    const level2Complete = applyDojoLevelCompletion(replayPerfectAgain.nextProgress, {
      levelId: 2,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: "2026-11-25",
      nowIso: "2026-11-25T13:00:00.000Z",
    });
    expect(level2Complete.xpAwarded).toBe(135);
    expect(level2Complete.nextProgress.totalXp).toBe(255);
    expect(level2Complete.rankUpTo?.belt).toBe("Yellow Belt");

    // Replaying Level 2 must NOT report rankUpTo again
    const level2Replay = applyDojoLevelCompletion(level2Complete.nextProgress, {
      levelId: 2,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: "2026-11-25",
      nowIso: "2026-11-25T14:00:00.000Z",
    });
    expect(level2Replay.xpAwarded).toBe(0);
    expect(level2Replay.rankUpTo).toBeNull();
  });

  it("tracks streaks safely across same day, consecutive days, missed days, and timezones", () => {
    const start = createInitialDojoProgress();

    // Day 1
    const day1 = applyDojoLevelCompletion(start, {
      levelId: 1,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: "2026-11-28",
      nowIso: "2026-11-28T10:00:00.000Z",
    }).nextProgress;
    expect(day1.currentStreak).toBe(1);
    expect(day1.longestStreak).toBe(1);

    // Same day Level 2 -> streak stays 1
    const sameDay = applyDojoLevelCompletion(day1, {
      levelId: 2,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: "2026-11-28",
      nowIso: "2026-11-28T15:00:00.000Z",
    }).nextProgress;
    expect(sameDay.currentStreak).toBe(1);
    expect(sameDay.longestStreak).toBe(1);

    // Next consecutive day (Nov 29) -> streak 2
    const day2 = applyDojoLevelCompletion(sameDay, {
      levelId: 3,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: "2026-11-29",
      nowIso: "2026-11-29T09:00:00.000Z",
    }).nextProgress;
    expect(day2.currentStreak).toBe(2);
    expect(day2.longestStreak).toBe(2);

    // Consecutive across month boundary (Nov 30) -> streak 3
    const day3 = applyDojoLevelCompletion(day2, {
      levelId: 4,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: "2026-11-30",
      nowIso: "2026-11-30T09:00:00.000Z",
    }).nextProgress;
    expect(day3.currentStreak).toBe(3);
    expect(day3.longestStreak).toBe(3);

    // Missed Dec 1, completes on Dec 2 -> streak resets to 1, longest stays 3
    const afterMiss = applyDojoLevelCompletion(day3, {
      levelId: 5,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: "2026-12-02",
      nowIso: "2026-12-02T09:00:00.000Z",
    }).nextProgress;
    expect(afterMiss.currentStreak).toBe(1);
    expect(afterMiss.longestStreak).toBe(3);
    expect(afterMiss.lastCompletedDate).toBe("2026-12-02");

    // Timezone boundary check for formatLocalDateKey
    const boundaryInstant = new Date("2026-11-30T22:30:00.000Z");
    expect(formatLocalDateKey(boundaryInstant, "UTC")).toBe("2026-11-30");
    expect(formatLocalDateKey(boundaryInstant, "Asia/Kolkata")).toBe("2026-12-01");
    expect(formatLocalDateKey(boundaryInstant, "America/New_York")).toBe("2026-11-30");
  });

  it("rejects invalid completion inputs", () => {
    const progress = createInitialDojoProgress();
    expect(() =>
      applyDojoLevelCompletion(progress, {
        levelId: 1,
        correctCount: 0,
        totalQuestions: 0,
        localDateKey: "2026-11-25",
        nowIso: "2026-11-25T10:00:00.000Z",
      })
    ).toThrow(RangeError);

    expect(() =>
      applyDojoLevelCompletion(progress, {
        levelId: 1,
        correctCount: 4,
        totalQuestions: 3,
        localDateKey: "2026-11-25",
        nowIso: "2026-11-25T10:00:00.000Z",
      })
    ).toThrow(RangeError);

    expect(() =>
      applyDojoLevelCompletion(progress, {
        levelId: 1,
        correctCount: 2,
        totalQuestions: 3,
        localDateKey: "2026-02-30",
        nowIso: "2026-11-25T10:00:00.000Z",
      })
    ).toThrow(RangeError);
  });
});

describe("Phase 5A: Pure Interactive Mechanic Simulation Helpers", () => {
  it("evaluates Prelec & Loewenstein coupling spectrum cleanly", () => {
    const cash = evaluatePrelecCoupling(0);
    const upi = evaluatePrelecCoupling(1);
    const bnpl = evaluatePrelecCoupling(2);

    expect(cash.isIllustrativeScale).toBe(true);
    expect(cash.couplingStrengthPct).toBeGreaterThan(upi.couplingStrengthPct);
    expect(upi.couplingStrengthPct).toBeGreaterThan(bnpl.couplingStrengthPct);
    expect(cash.painSaliencePct).toBeGreaterThan(upi.painSaliencePct);
    expect(upi.painSaliencePct).toBeGreaterThan(bnpl.painSaliencePct);
    expect(cash.couplingLevel).toBe("high");
    expect(upi.couplingLevel).toBe("moderate");
    expect(bnpl.couplingLevel).toBe("low");
  });

  it("evaluates Laibson Table II welfare loss anchors, interpolation, and curves", () => {
    const b10 = evaluateLaibsonWelfareLoss(1.0);
    const b08 = evaluateLaibsonWelfareLoss(0.8);
    const b06 = evaluateLaibsonWelfareLoss(0.6);
    const b04 = evaluateLaibsonWelfareLoss(0.4);

    expect(b10.welfareLossPct).toBe(0.0);
    expect(b08.welfareLossPct).toBe(1.6);
    expect(b06.welfareLossPct).toBe(9.0);
    expect(b04.welfareLossPct).toBe(29.5);

    // Midpoint linear interpolation checks
    expect(evaluateLaibsonWelfareLoss(0.9).welfareLossPct).toBe(0.8);
    expect(evaluateLaibsonWelfareLoss(0.7).welfareLossPct).toBe(5.3);
    expect(evaluateLaibsonWelfareLoss(0.5).welfareLossPct).toBe(19.25);

    // Clamping outside [0.4, 1.0]
    expect(evaluateLaibsonWelfareLoss(0.1).beta).toBe(0.4);
    expect(evaluateLaibsonWelfareLoss(0.1).welfareLossPct).toBe(29.5);
    expect(evaluateLaibsonWelfareLoss(1.5).beta).toBe(1.0);
    expect(evaluateLaibsonWelfareLoss(1.5).welfareLossPct).toBe(0.0);

    // Curve points 0..10
    expect(b10.curvePoints).toHaveLength(11);
    for (const point of b10.curvePoints) {
      expect(point.hyperbolic).toBe(point.exponential);
      expect(Number.isFinite(point.hyperbolic)).toBe(true);
    }

    expect(b04.curvePoints[0].hyperbolic).toBe(1);
    expect(b04.curvePoints[1].hyperbolic).toBeLessThan(b04.curvePoints[1].exponential);

    expect(() => evaluateLaibsonWelfareLoss(Number.NaN)).toThrow(TypeError);
    expect(() => evaluateLaibsonWelfareLoss(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it("evaluates broad-bracket zoom using canonical 4-year compounding", () => {
    const zoom = evaluateBroadBracketZoom(5000); // ₹50/day
    expect(zoom.weeklyMinor).toBe(35000);
    expect(zoom.monthlyMinor).toBe(150000);
    expect(zoom.annualMinor).toBe(1825000);
    expect(zoom.compounded4YearMinor).toBe(convertTo4YearCompounded(1825000));
  });

  it("scopes queryKeys.dojoProgress strictly by identity mode and userId", () => {
    const guestKey = queryKeys.dojoProgress({
      mode: "guest",
      userId: "guest-sandbox-user",
    });
    const userAKey = queryKeys.dojoProgress({
      mode: "authenticated",
      userId: "user-a",
    });
    const userBKey = queryKeys.dojoProgress({
      mode: "authenticated",
      userId: "user-b",
    });
    const noneKey = queryKeys.dojoProgress({
      mode: "none",
      userId: null,
    });

    expect(guestKey).toEqual(["dojo-progress", "guest", "guest-sandbox-user"]);
    expect(userAKey).toEqual(["dojo-progress", "authenticated", "user-a"]);
    expect(userBKey).toEqual(["dojo-progress", "authenticated", "user-b"]);
    expect(noneKey).toEqual(["dojo-progress", "none", null]);
    expect(userAKey).not.toEqual(userBKey);
    expect(guestKey).not.toEqual(userAKey);
  });

  it("completes all 9 curriculum levels sequentially with accurate XP, Black Belt rank, and replay protection", () => {
    let progress = createInitialDojoProgress("2026-11-01T08:00:00.000Z");
    let expectedTotalXp = 0;

    for (const level of DOJO_LEVELS) {
      const scoredMechanicCount =
        level.mechanic.kind === "impulse_duel"
          ? level.mechanic.rounds?.length ?? 1
          : level.mechanic.kind === "bucket_sort"
            ? level.mechanic.items.length
            : level.mechanic.kind === "feedback_loop"
              ? level.mechanic.steps.length
              : 1;
      const totalQuestions = 1 + scoredMechanicCount + level.masteryQuestions.length;

      const res = applyDojoLevelCompletion(progress, {
        levelId: level.id,
        correctCount: totalQuestions,
        totalQuestions,
        localDateKey: `2026-11-${String(level.id).padStart(2, "0")}`,
        nowIso: `2026-11-${String(level.id).padStart(2, "0")}T12:00:00.000Z`,
      });

      expectedTotalXp += level.baseXp + level.perfectBonusXp;
      expect(res.accuracyPct).toBe(100);
      expect(res.isFirstCompletion).toBe(true);
      expect(res.newlyUnlockedBadgeId).toBe(level.badgeId);
      progress = res.nextProgress;
    }

    expect(progress.completedLevels).toHaveLength(9);
    expect(progress.unlockedBadges).toHaveLength(9);
    expect(progress.totalXp).toBe(expectedTotalXp);
    expect(getDojoRank(progress.totalXp).belt).toBe("Black Belt");
    expect(getDojoRank(progress.totalXp).nextBeltXp).toBeNull();

    // Replaying Level 9 with a lower score preserves 100% bestAccuracyPct and grants 0 XP
    const l9Replay = applyDojoLevelCompletion(progress, {
      levelId: 9,
      correctCount: 2,
      totalQuestions: 5,
      localDateKey: "2026-11-10",
      nowIso: "2026-11-10T12:00:00.000Z",
    });
    expect(l9Replay.accuracyPct).toBe(40);
    expect(l9Replay.xpAwarded).toBe(0);
    expect(l9Replay.nextProgress.totalXp).toBe(expectedTotalXp);
    expect(
      l9Replay.nextProgress.completedLevels.find((c) => c.levelId === 9)
        ?.bestAccuracyPct
    ).toBe(100);
  });
});
