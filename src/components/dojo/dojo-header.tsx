"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Crown,
  Flame,
  Shield,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { DOJO_LEVELS, getDojoWorld } from "@/domain/dojo-curriculum";
import { getDojoRank } from "@/domain/dojo-engine";
import type { DojoLevelId, DojoProgress } from "@/domain/dojo-types";
import { getUniqueDojoCitations } from "@/lib/dojo-citations";
import { getActiveDojoLevel } from "@/lib/dojo-map-layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DOJO_BELT_STYLES } from "./dojo-theme";

interface DojoHeaderProps {
  progress: DojoProgress;
  onSelectLevel?: (levelId: DojoLevelId) => void;
  onOpenTrophyCase: () => void;
  onOpenResearchLibrary: () => void;
  onToggleSound: () => void;
  isSavingSound?: boolean;
}

export function DojoHeader({
  progress,
  onSelectLevel,
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

  const activeLevel = React.useMemo(
    () => getActiveDojoLevel(progress, DOJO_LEVELS),
    [progress]
  );
  const activeWorld = activeLevel ? getDojoWorld(activeLevel.worldId) : null;

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
    <Card className="border-slate-200/90 bg-white">
      <CardContent className="p-3.5 sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Mobile & Tablet (< lg): Compact Belt, Rank, XP Progress & Streak */}
          <div className="min-w-0 flex-1 space-y-2.5 lg:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-tight shadow-2xs",
                    beltStyle.badgeClass
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-4 rounded-xs shrink-0",
                      beltStyle.swatchClass
                    )}
                    aria-hidden="true"
                  />
                  <span>{rank.belt}</span>
                </span>

                <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  {rank.title}
                </h1>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-900">
                <Flame className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                <span>
                  {progress.currentStreak}d
                </span>
              </div>
            </div>

            <div className="space-y-1">
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
                className="h-2.5 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100"
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

          {/* Desktop (>= lg): Single-Row Action Strip (Command Rail owns Belt/XP/Streak) */}
          <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
            {activeLevel ? (
              <button
                type="button"
                onClick={() => onSelectLevel?.(activeLevel.id)}
                className="group inline-flex min-w-0 items-center gap-2 rounded-full border border-sky-200/90 bg-sky-50/80 py-1.5 pl-2.5 pr-3 text-xs font-semibold text-sky-950 transition-all hover:border-sky-300 hover:bg-sky-100/80 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
              >
                <span
                  className={cn(
                    "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-extrabold uppercase tracking-wider",
                    activeLevel.isBoss
                      ? "bg-slate-900 text-amber-300"
                      : "bg-sky-700 text-white"
                  )}
                >
                  {activeLevel.isBoss ? (
                    activeLevel.id === 9 ? (
                      <Crown className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <Shield className="h-3 w-3" aria-hidden="true" />
                    )
                  ) : (
                    <Swords className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>Active Drill</span>
                </span>
                <span className="truncate font-bold text-slate-900">
                  Level {activeLevel.id}: {activeLevel.title}
                </span>
                {activeWorld && (
                  <span className="hidden xl:inline text-[11px] font-medium text-slate-500">
                    · W{activeWorld.worldNumber}
                  </span>
                )}
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-sky-700 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>All 9 Dojo Drills Mastered</span>
              </div>
            )}
          </div>

          {/* Shared Action Controls (Single DOM set across breakpoints) */}
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenTrophyCase}
              className="h-9 gap-2 border-slate-300 border-b-[3px] border-b-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:translate-y-px"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
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
              className="h-9 gap-2 border-slate-300 border-b-[3px] border-b-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:translate-y-px"
            >
              <BookOpen className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
              <span className="lg:sr-only">Research Library</span>
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
                "h-9 w-9 border-slate-300 border-b-[3px] border-b-slate-300 p-0 text-slate-700 hover:bg-slate-50 active:translate-y-px",
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
      </CardContent>
    </Card>
  );
}
