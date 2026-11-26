"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Crown,
  Flame,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import type {
  DojoLevel,
  DojoLevelCompletionResult,
  DojoLevelId,
  DojoRankInfo,
} from "@/domain/dojo-types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DOJO_BELT_STYLES, DojoBadgeIcon } from "../dojo-theme";

interface LevelClearOverlayProps {
  level: DojoLevel;
  completionResult: DojoLevelCompletionResult;
  previousRank: DojoRankInfo;
  nextLevel: { id: DojoLevelId; title: string; isUnlocked: boolean } | null;
  onBackToMap: () => void;
  onStartNextLevel: (nextId: DojoLevelId) => void;
}

const CELEBRATION_DOTS = [
  { x: -72, y: -42, color: "bg-emerald-500" },
  { x: 68, y: -46, color: "bg-amber-400" },
  { x: -96, y: 12, color: "bg-sky-500" },
  { x: 96, y: 18, color: "bg-emerald-400" },
  { x: -44, y: -74, color: "bg-amber-500" },
  { x: 46, y: -76, color: "bg-sky-400" },
];

export function LevelClearOverlay({
  level,
  completionResult,
  previousRank,
  nextLevel,
  onBackToMap,
  onStartNextLevel,
}: LevelClearOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const targetXp = completionResult.xpAwarded;
  const [displayXp, setDisplayXp] = useState(
    shouldReduceMotion ? targetXp : 0
  );

  useEffect(() => {
    if (shouldReduceMotion || targetXp <= 0) {
      setDisplayXp(targetXp);
      return;
    }

    let rafId = 0;
    const durationMs = 280;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setDisplayXp(Math.round(targetXp * eased));
      if (ratio < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [targetXp, shouldReduceMotion]);

  const completionRecord = completionResult.nextProgress.completedLevels.find(
    (entry) => entry.levelId === level.id
  );
  const bestAccuracyPct =
    completionRecord?.bestAccuracyPct ?? completionResult.accuracyPct;
  const streak = completionResult.nextProgress.currentStreak;
  const isFinalLevel = level.id === 9;
  const isReplayZeroXp =
    !completionResult.isFirstCompletion && completionResult.xpAwarded === 0;
  const hasNewBadge = completionResult.newlyUnlockedBadgeId !== null;
  const rankUpTo = completionResult.rankUpTo;

  return (
    <div className="space-y-5">
      {/* Hero Victory Header */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 280, damping: 24 }
        }
        className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-xs"
      >
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700">
          {!shouldReduceMotion &&
            CELEBRATION_DOTS.map((dot, idx) => (
              <motion.span
                key={idx}
                aria-hidden="true"
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 0.95 }}
                animate={{ x: dot.x, y: dot.y, scale: 1, opacity: 0 }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                className={cn("absolute h-2.5 w-2.5 rounded-full", dot.color)}
              />
            ))}

          {isFinalLevel ? (
            <Crown className="h-8 w-8 text-amber-600" aria-hidden="true" />
          ) : (
            <Trophy className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          )}
        </div>

        <div className="mt-4 space-y-1.5">
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-[11px] font-bold uppercase tracking-wider text-emerald-800"
          >
            {isFinalLevel
              ? "All 9 Dojo Drills Mastered"
              : `Level ${level.id} Completed`}
          </Badge>

          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {level.title}
          </h2>

          {/* XP Award or Replay Protection Notice */}
          <div className="pt-2">
            {completionResult.xpAwarded > 0 ? (
              <div className="inline-flex flex-col items-center gap-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-base font-extrabold tabular-nums text-sky-800">
                  <Sparkles className="h-4 w-4 text-sky-600" aria-hidden="true" />
                  <span>+{displayXp} XP</span>
                </div>
                {!completionResult.isFirstCompletion && (
                  <span className="text-xs font-semibold text-emerald-700">
                    Perfect Bonus Unlocked on Replay!
                  </span>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>
                  {isReplayZeroXp
                    ? "Replay Complete — Best Score Preserved"
                    : "Drill Complete"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Core Accuracy, Streak & Best Score Tiles */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-left sm:gap-2.5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 sm:p-3">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Target className="h-3 w-3 shrink-0 text-sky-600" aria-hidden="true" />
              <span>Accuracy</span>
            </div>
            <div className="mt-1 text-base font-extrabold tabular-nums text-slate-900 sm:text-lg">
              {completionResult.accuracyPct}%
            </div>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-2.5 sm:p-3">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
              <Flame className="h-3 w-3 shrink-0 text-amber-600" aria-hidden="true" />
              <span>Streak</span>
            </div>
            <div className="mt-1 text-base font-extrabold tabular-nums text-slate-900 sm:text-lg">
              {streak} day{streak === 1 ? "" : "s"}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-2.5 sm:p-3">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>Best Score</span>
            </div>
            <div className="mt-1 text-base font-extrabold tabular-nums text-emerald-900 sm:text-lg">
              {bestAccuracyPct}%
            </div>
          </div>
        </div>
      </motion.div>

      {/* Belt Rank-Up Banner */}
      {rankUpTo && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
        >
          <Card
            className={cn(
              "border-2",
              rankUpTo.belt === "Black Belt"
                ? "border-amber-400 bg-slate-900 text-white"
                : "border-amber-300 bg-amber-50/80 text-slate-900"
            )}
          >
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <div
                  className={cn(
                    "text-[10px] font-extrabold uppercase tracking-wider",
                    rankUpTo.belt === "Black Belt"
                      ? "text-amber-300"
                      : "text-amber-800"
                  )}
                >
                  Belt Rank-Up Achieved
                </div>
                <div className="text-sm font-bold sm:text-base">
                  {previousRank.belt} → {rankUpTo.belt}
                </div>
                <div
                  className={cn(
                    "text-xs font-medium",
                    rankUpTo.belt === "Black Belt"
                      ? "text-slate-200"
                      : "text-slate-700"
                  )}
                >
                  New Title: {rankUpTo.title}
                </div>
              </div>

              <span
                className={cn(
                  "h-4 w-9 shrink-0 rounded-sm",
                  DOJO_BELT_STYLES[rankUpTo.belt].swatchClass
                )}
                aria-hidden="true"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Newly Unlocked Badge Showcase */}
      {hasNewBadge && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
        >
          <Card className="border-emerald-200 bg-white">
            <CardContent className="flex items-start gap-3.5 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                <DojoBadgeIcon iconName={level.badgeIcon} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                  <Award className="h-3 w-3" aria-hidden="true" />
                  <span>New Mastery Badge Unlocked</span>
                </div>
                <h3 className="mt-0.5 text-sm font-bold text-slate-900">
                  {level.badgeName}
                </h3>
                <p className="mt-0.5 text-xs leading-snug text-slate-600">
                  {level.badgeDescription}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Level 9 Final Curriculum Completion Message */}
      {isFinalLevel && (
        <Card className="border-slate-200 bg-slate-900 text-white">
          <CardContent className="space-y-1.5 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Curriculum Complete
            </div>
            <p className="text-sm font-semibold">
              You have mastered all 9 behavioral-finance drills across The Impulse
              Mind, Mental Buckets &amp; Framing, and Resilience &amp; Commitment.
            </p>
            <p className="text-xs text-slate-300">
              Replay any level from the skill map anytime to sharpen your reflexes or
              revisit your Live Wallet Mirror.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Primary Actions */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBackToMap}
          className="h-11 gap-2 border-slate-300 border-b-[3px] border-b-slate-300 bg-white font-semibold text-slate-800 hover:bg-slate-50 active:translate-y-px"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Dojo Map</span>
        </Button>

        {nextLevel && nextLevel.isUnlocked && (
          <Button
            type="button"
            onClick={() => onStartNextLevel(nextLevel.id)}
            className="h-11 gap-2 border-b-[3px] border-b-sky-800 bg-sky-600 font-bold text-white hover:bg-sky-500 active:translate-y-px"
          >
            <span>Start Level {nextLevel.id}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
