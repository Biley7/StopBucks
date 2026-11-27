"use client";

import React from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Crown,
  Flame,
  Lock,
  Shield,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { DOJO_LEVELS, getDojoWorld } from "@/domain/dojo-curriculum";
import { DOJO_BELT_TIERS, getDojoRank } from "@/domain/dojo-engine";
import type { DojoBelt, DojoLevelId, DojoProgress } from "@/domain/dojo-types";
import { getUniqueDojoCitations } from "@/lib/dojo-citations";
import { getActiveDojoLevel } from "@/lib/dojo-map-layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AnimatedProgressBar,
  RollingNumber,
} from "@/components/shared/motion-primitives";
import {
  DOJO_BELT_STYLES,
  DOJO_WORLD_STYLES,
  DojoBadgeIcon,
  formatCitationChipLabel,
} from "./dojo-theme";

interface DojoSideRailProps {
  progress: DojoProgress;
  onSelectLevel: (levelId: DojoLevelId) => void;
  onOpenTrophyCase: () => void;
  onOpenResearchLibrary: () => void;
}

const BELT_STRAP_TREATMENT: Record<
  DojoBelt,
  { strap: string; knot: string; trim: string }
> = {
  "White Belt": {
    strap: "border border-stone-300 bg-white",
    knot: "border border-stone-300 bg-stone-100",
    trim: "bg-stone-300",
  },
  "Yellow Belt": {
    strap: "border border-amber-400 bg-amber-400",
    knot: "border border-amber-500 bg-amber-500",
    trim: "bg-amber-200",
  },
  "Green Belt": {
    strap: "border border-emerald-700 bg-emerald-600",
    knot: "border border-emerald-800 bg-emerald-700",
    trim: "bg-emerald-300",
  },
  "Blue Belt": {
    strap: "border border-blue-700 bg-blue-600",
    knot: "border border-blue-800 bg-blue-700",
    trim: "bg-blue-300",
  },
  "Black Belt": {
    strap: "border border-amber-400/70 bg-slate-950",
    knot: "border border-amber-400 bg-slate-900",
    trim: "bg-amber-400",
  },
};

export function DojoSideRail({
  progress,
  onSelectLevel,
  onOpenTrophyCase,
  onOpenResearchLibrary,
}: DojoSideRailProps) {
  const rank = getDojoRank(progress.totalXp);
  const beltStyle = DOJO_BELT_STYLES[rank.belt];
  const strapStyle = BELT_STRAP_TREATMENT[rank.belt];
  const isMaxRank = rank.nextBeltXp === null;

  const nextBeltTier =
    rank.nextBeltXp !== null
      ? DOJO_BELT_TIERS.find((tier) => tier.minXp === rank.nextBeltXp)
      : null;
  const xpRemainingToNextBelt =
    rank.nextBeltXp !== null ? Math.max(0, rank.nextBeltXp - rank.currentXp) : 0;

  const activeLevel = React.useMemo(
    () => getActiveDojoLevel(progress, DOJO_LEVELS),
    [progress]
  );
  const activeWorld = activeLevel ? getDojoWorld(activeLevel.worldId) : null;

  const completedLevelIds = React.useMemo(
    () => new Set(progress.completedLevels.map((entry) => entry.levelId)),
    [progress.completedLevels]
  );
  const unlockedBadgesCount = DOJO_LEVELS.filter((level) =>
    completedLevelIds.has(level.id)
  ).length;

  const studyCount = React.useMemo(() => getUniqueDojoCitations().length, []);

  return (
    <aside
      aria-label="Dojo Command Rail"
      className="min-w-0 space-y-3 lg:sticky lg:top-20"
    >
      {/* Card 1: Belt & Rank Progress */}
      <Card className="border-slate-900/[0.08] bg-white">
        <CardContent className="space-y-2.5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Belt &amp; Rank
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                beltStyle.badgeClass
              )}
            >
              {rank.belt}
            </span>
          </div>

          {/* Physical Belt Visual */}
          <div
            aria-label={`Current rank belt visual: ${rank.belt}`}
            className="relative flex items-center justify-center py-1"
          >
            <div
              className={cn(
                "relative flex h-4 w-full items-center justify-center rounded-md shadow-2xs",
                strapStyle.strap
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-2 h-full w-1.5 rounded-l-xs",
                  strapStyle.trim
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 h-5 w-7 rounded-sm shadow-xs",
                  strapStyle.knot
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-2 h-full w-1.5 rounded-r-xs",
                  strapStyle.trim
                )}
              />
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">
              {rank.title}
            </h2>
            <span className="text-sm font-extrabold tabular-nums tracking-[-0.025em] text-sky-700">
              <RollingNumber value={rank.currentXp.toLocaleString()} suffix=" XP" />
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-600">
                {isMaxRank
                  ? "Maximum rank achieved"
                  : `${xpRemainingToNextBelt.toLocaleString()} XP to ${nextBeltTier?.belt ?? "Next Belt"}`}
              </span>
              <span className="font-bold tabular-nums text-slate-700">
                {rank.progressPct}%
              </span>
            </div>

            <AnimatedProgressBar
              value={rank.progressPct}
              ariaLabel="Rail belt rank progress"
              trackClassName="h-2.5 border border-slate-200 bg-slate-100"
              barClassName={beltStyle.progressBarClass}
            />
          </div>

          {/* Current & Longest Streak */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 px-2.5 py-2">
              <Flame className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="min-w-0 leading-tight">
                <div className="text-xs font-extrabold tabular-nums text-slate-900">
                  {progress.currentStreak} day{progress.currentStreak === 1 ? "" : "s"}
                </div>
                <div className="text-[10px] font-medium text-slate-600">
                  Daily Streak
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 leading-tight">
              <div className="text-xs font-extrabold tabular-nums text-slate-900">
                {progress.longestStreak} day{progress.longestStreak === 1 ? "" : "s"}
              </div>
              <div className="text-[10px] font-medium text-slate-600">
                Longest Streak
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Next Up Spotlight */}
      <Card className="border-slate-200/90 bg-white">
        <CardContent className="space-y-2.5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Next Up Spotlight
            </span>
            {activeLevel?.isBoss && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                  activeLevel.id === 9
                    ? "border-amber-400/70 bg-slate-900 text-amber-300"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                )}
              >
                {activeLevel.id === 9 ? (
                  <Crown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Shield className="h-3 w-3" aria-hidden="true" />
                )}
                {activeLevel.id === 9 ? "FINAL BOSS" : "WORLD BOSS"}
              </span>
            )}
          </div>

          {activeLevel && activeWorld ? (
            <>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      DOJO_WORLD_STYLES[activeWorld.id].worldPillClass
                    )}
                  >
                    World {activeWorld.worldNumber} · {activeWorld.title}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Level {activeLevel.id}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold leading-snug text-slate-900">
                  {activeLevel.title}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden="true" />
                  <span className="truncate">
                    {formatCitationChipLabel(activeLevel.citation)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs">
                <span className="font-bold tabular-nums text-sky-700">
                  +{activeLevel.baseXp} XP
                </span>
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-emerald-700">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  +{activeLevel.perfectBonusXp} Perfect
                </span>
              </div>

              <Button
                type="button"
                onClick={() => onSelectLevel(activeLevel.id)}
                className="h-10 w-full gap-2 border-b-[3px] border-b-sky-950 bg-sky-700 text-xs font-bold text-white hover:bg-sky-800 active:translate-y-px sm:text-sm"
              >
                <Swords className="h-4 w-4" aria-hidden="true" />
                <span>Launch Level {activeLevel.id}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Training Complete</span>
              </div>
              <p className="text-sm font-bold text-slate-900">
                All 9 Dojo Levels Completed
              </p>
              <p className="text-xs leading-relaxed text-slate-600">
                You have cleared every behavioral-finance module. Tap any node on the
                skill map to replay for mastery.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Badge Showcase Preview */}
      <Card className="border-slate-200/90 bg-white">
        <CardContent className="space-y-3 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Badge Showcase
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-700">
              {unlockedBadgesCount}/{DOJO_LEVELS.length}
            </span>
          </div>

          {/* 3x3 Compact Grid of all 9 curriculum badges */}
          <div
            className="grid grid-cols-3 gap-2"
            role="list"
            aria-label="Nine mastery badge slots"
          >
            {DOJO_LEVELS.map((level) => {
              const isUnlocked = completedLevelIds.has(level.id);

              return (
                <div
                  key={level.badgeId}
                  role="listitem"
                  aria-label={`${level.badgeName} (Level ${level.id}) — ${isUnlocked ? "Unlocked" : "Locked"
                    }`}
                  title={`${level.badgeName} (Level ${level.id}) — ${isUnlocked ? "Unlocked" : "Locked"
                    }`}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-colors",
                    isUnlocked
                      ? "border-amber-200 bg-amber-50/80 text-amber-800 shadow-2xs"
                      : "border-dashed border-slate-200 bg-slate-50/70 text-slate-400"
                  )}
                >
                  <DojoBadgeIcon iconName={level.badgeIcon} className="h-4 w-4" />
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums leading-none",
                      isUnlocked ? "text-slate-800" : "text-slate-400"
                    )}
                  >
                    L{level.id}
                  </span>
                  {!isUnlocked && (
                    <Lock
                      className="absolute right-1 top-1 h-2.5 w-2.5 text-slate-300"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenTrophyCase}
              className="h-9 w-full justify-between border-slate-300 border-b-[3px] border-b-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:translate-y-px"
            >
              <span className="inline-flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                <span>View Full Trophy Case</span>
              </span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-700">
                {unlockedBadgesCount}/{DOJO_LEVELS.length}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenResearchLibrary}
              className="h-9 w-full justify-between border-slate-300 border-b-[3px] border-b-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:translate-y-px"
            >
              <span className="inline-flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                <span>Research Library</span>
              </span>
              <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-sky-800">
                {studyCount} Studies
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
