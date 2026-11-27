"use client";

import React from "react";
import { CheckCircle2, Lock, Trophy } from "lucide-react";
import { DOJO_LEVELS } from "@/domain/dojo-curriculum";
import { DOJO_BELT_TIERS, getDojoRank } from "@/domain/dojo-engine";
import type { DojoProgress } from "@/domain/dojo-types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOJO_BELT_STYLES, DojoBadgeIcon } from "./dojo-theme";

interface DojoTrophyDrawerProps {
  progress: DojoProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DojoTrophyDrawer({
  progress,
  open,
  onOpenChange,
}: DojoTrophyDrawerProps) {
  const currentRank = getDojoRank(progress.totalXp);
  const completedLevelIds = new Set(
    progress.completedLevels.map((entry) => entry.levelId)
  );
  const unlockedCount = DOJO_LEVELS.filter((level) =>
    completedLevelIds.has(level.id)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-xl p-5 sm:p-6">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2 pr-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Trophy className="h-4 w-4" aria-hidden="true" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Trophy Case &amp; Belt Ladder
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs tabular-nums text-slate-600 sm:text-sm">
            {currentRank.belt} ({currentRank.title}) · {progress.totalXp} XP ·{" "}
            {unlockedCount}/{DOJO_LEVELS.length} mastery badges unlocked
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-6 pt-1">
          {/* Section 1: Five-Belt Rank Ladder */}
          <section aria-labelledby="belt-ladder-heading" className="space-y-2.5">
            <h3
              id="belt-ladder-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Five-Belt Rank Ladder
            </h3>

            <div className="space-y-2">
              {DOJO_BELT_TIERS.map((tier) => {
                const style = DOJO_BELT_STYLES[tier.belt];
                const isCurrent = tier.belt === currentRank.belt;
                const isAchieved =
                  !isCurrent && progress.totalXp >= tier.minXp;
                const isBlackCurrent =
                  isCurrent && tier.belt === "Black Belt";

                return (
                  <div
                    key={tier.belt}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 transition-colors",
                      isCurrent
                        ? isBlackCurrent
                          ? "border-amber-400/80 bg-slate-900 text-white"
                          : cn("ring-2 ring-sky-200", style.activeBorderClass)
                        : isAchieved
                          ? "border-emerald-200 bg-emerald-50/50 text-slate-900"
                          : "border-slate-200 bg-slate-50/70 text-slate-500"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "h-3 w-7 shrink-0 rounded-xs",
                          style.swatchClass
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-bold",
                              isBlackCurrent ? "text-amber-300" : undefined
                            )}
                          >
                            {tier.belt}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isBlackCurrent
                                ? "text-slate-200"
                                : "text-slate-600"
                            )}
                          >
                            {tier.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-bold tabular-nums",
                          isBlackCurrent ? "text-slate-200" : "text-slate-700"
                        )}
                      >
                        {tier.minXp.toLocaleString()} XP
                      </span>

                      {isCurrent ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            isBlackCurrent
                              ? "bg-amber-400/20 text-amber-300"
                              : "bg-sky-600 text-white"
                          )}
                        >
                          Current
                        </span>
                      ) : isAchieved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Achieved
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 2: Nine-Badge Grid */}
          <section aria-labelledby="badge-grid-heading" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3
                id="badge-grid-heading"
                className="text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Mastery Badges ({unlockedCount}/{DOJO_LEVELS.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {DOJO_LEVELS.map((level) => {
                // Badge unlock derives strictly from completed-level records, never XP
                const isUnlocked = completedLevelIds.has(level.id);

                return (
                  <div
                    key={level.badgeId}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border p-3.5",
                      isUnlocked
                        ? "border-emerald-200 bg-white shadow-2xs"
                        : "border-slate-200 border-dashed bg-slate-50/80 text-slate-500"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                            isUnlocked
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-100 text-slate-400"
                          )}
                        >
                          <DojoBadgeIcon
                            iconName={level.badgeIcon}
                            className="h-4 w-4"
                          />
                        </div>

                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            Locked
                          </span>
                        )}
                      </div>

                      <h4
                        className={cn(
                          "mt-2.5 text-xs font-bold",
                          isUnlocked ? "text-slate-900" : "text-slate-600"
                        )}
                      >
                        {level.badgeName}
                      </h4>

                      {isUnlocked ? (
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">
                          {level.badgeDescription}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500">
                          Unlock by completing Level {level.id}
                        </p>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-semibold tabular-nums text-slate-500">
                      Level {level.id}
                      {level.isBoss ? " · Boss" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
