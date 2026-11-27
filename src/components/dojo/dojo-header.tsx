"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Flame, Trophy, Volume2, VolumeX } from "lucide-react";
import { DOJO_LEVELS } from "@/domain/dojo-curriculum";
import { getDojoRank } from "@/domain/dojo-engine";
import type { DojoProgress } from "@/domain/dojo-types";
import { getUniqueDojoCitations } from "@/lib/dojo-citations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DOJO_BELT_STYLES } from "./dojo-theme";

interface DojoHeaderProps {
  progress: DojoProgress;
  onOpenTrophyCase: () => void;
  onOpenResearchLibrary: () => void;
  onToggleSound: () => void;
  isSavingSound?: boolean;
}

export function DojoHeader({
  progress,
  onOpenTrophyCase,
  onOpenResearchLibrary,
  onToggleSound,
  isSavingSound = false,
}: DojoHeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const rank = getDojoRank(progress.totalXp);
  const beltStyle = DOJO_BELT_STYLES[rank.belt];
  const isMaxRank = rank.nextBeltXp === null;

  const completedLevelIds = new Set(
    progress.completedLevels.map((entry) => entry.levelId)
  );
  const unlockedBadgesCount = DOJO_LEVELS.filter((level) =>
    completedLevelIds.has(level.id)
  ).length;
  const totalBadgeCount = DOJO_LEVELS.length;
  const studyCount = React.useMemo(() => getUniqueDojoCitations().length, []);

  const xpLabel = isMaxRank
    ? `Max Rank Achieved · ${rank.currentXp} XP`
    : `${rank.currentXp} / ${rank.nextBeltXp} XP (${rank.progressPct}%)`;

  return (
    <Card className="border-slate-200/90 bg-white shadow-xs">
      <CardContent className="p-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Belt, Rank, and XP Progress */}
          <div className="min-w-0 flex-1 space-y-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-tight shadow-2xs",
                  beltStyle.badgeClass
                )}
              >
                <span
                  className={cn("h-2.5 w-5 rounded-xs shrink-0", beltStyle.swatchClass)}
                  aria-hidden="true"
                />
                <span>{rank.belt}</span>
              </span>

              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {rank.title}
              </h1>

              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
                {rank.currentXp} XP
              </span>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-600">
                  {isMaxRank ? (
                    <span className="font-semibold text-slate-900">
                      Max Rank Achieved
                    </span>
                  ) : (
                    <>Next Belt Progress</>
                  )}
                </span>
                <span className="font-semibold tabular-nums text-slate-700">
                  {isMaxRank
                    ? `${rank.currentXp} XP · 100%`
                    : `${rank.currentXp} / ${rank.nextBeltXp} XP (${rank.progressPct}%)`}
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="XP progress toward next belt"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={rank.progressPct}
                aria-valuetext={xpLabel}
                className="h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100"
              >
                <motion.div
                  initial={false}
                  animate={{ width: `${rank.progressPct}%` }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 180, damping: 24 }
                  }
                  className={cn("h-full rounded-full", beltStyle.progressBarClass)}
                />
              </div>
            </div>
          </div>

          {/* Streak + Quick Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            {/* Daily Streak Indicator */}
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Flame className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="text-xs font-bold tabular-nums text-slate-900">
                  {progress.currentStreak} day{progress.currentStreak === 1 ? "" : "s"} streak
                </div>
                <div className="text-[11px] font-medium tabular-nums text-slate-600">
                  Best: {progress.longestStreak} day{progress.longestStreak === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenTrophyCase}
                className="h-10 gap-2 border-slate-300 border-b-[3px] border-b-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:translate-y-px"
              >
                <Trophy className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <span>Trophy Case</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-700">
                  {unlockedBadgesCount}/{totalBadgeCount}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenResearchLibrary}
                className="h-10 gap-2 border-slate-300 border-b-[3px] border-b-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:translate-y-px"
              >
                <BookOpen className="h-4 w-4 text-sky-600" aria-hidden="true" />
                <span>Research Library</span>
                <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-sky-800">
                  {studyCount} Studies
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggleSound}
                disabled={isSavingSound}
                aria-pressed={progress.soundMuted}
                aria-label={
                  progress.soundMuted
                    ? "Unmute Dojo sound effects"
                    : "Mute Dojo sound effects"
                }
                title={
                  progress.soundMuted
                    ? "Sound muted — click to unmute"
                    : "Sound enabled — click to mute"
                }
                className={cn(
                  "h-10 w-10 border-slate-300 border-b-[3px] border-b-slate-300 p-0 text-slate-700 hover:bg-slate-50 active:translate-y-px",
                  progress.soundMuted && "bg-slate-100 text-slate-500"
                )}
              >
                {progress.soundMuted ? (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-4 w-4 text-sky-600" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
