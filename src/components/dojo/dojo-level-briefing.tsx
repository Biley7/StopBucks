"use client";

import React from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Crown,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";
import { getDojoLevel, getDojoWorld } from "@/domain/dojo-curriculum";
import { getLevelStatus } from "@/domain/dojo-engine";
import type { DojoLevelId, DojoProgress } from "@/domain/dojo-types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DOJO_WORLD_STYLES,
  DojoBadgeIcon,
  formatCitationChipLabel,
  formatEstimatedDuration,
} from "./dojo-theme";

interface DojoLevelBriefingProps {
  levelId: DojoLevelId | null;
  progress: DojoProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartLesson: (levelId: DojoLevelId) => void;
  onOpenCitation: (levelId: DojoLevelId) => void;
}

export function DojoLevelBriefing({
  levelId,
  progress,
  open,
  onOpenChange,
  onStartLesson,
  onOpenCitation,
}: DojoLevelBriefingProps) {
  if (levelId === null) return null;

  const level = getDojoLevel(levelId);
  const world = getDojoWorld(level.worldId);
  const status = getLevelStatus(level.id, progress);

  // Defense-in-depth: locked levels must never launch through the briefing
  if (status === "locked") return null;

  const isCompleted = status === "completed";
  const completionRecord = progress.completedLevels.find(
    (entry) => entry.levelId === level.id
  );
  const worldStyle = DOJO_WORLD_STYLES[world.id];
  const isFinalBoss = level.isBoss && level.id === 9;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-xl p-5 sm:p-6">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <Badge
              variant="outline"
              className={cn("text-[11px] font-semibold", worldStyle.worldPillClass)}
            >
              World {world.worldNumber} · {world.title}
            </Badge>

            <Badge variant="secondary" className="text-[11px] font-semibold">
              Level {level.id}
            </Badge>

            {level.isBoss && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-[11px] font-bold",
                  isFinalBoss
                    ? "border-amber-400/70 bg-slate-900 text-amber-300"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                )}
              >
                {isFinalBoss ? (
                  <Crown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Shield className="h-3 w-3" aria-hidden="true" />
                )}
                {isFinalBoss ? "FINAL BOSS" : "WORLD BOSS"}
              </Badge>
            )}
          </div>

          <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {level.title}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            {level.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Rewards & Duration Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>Est. Time</span>
              </div>
              <div className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                {formatEstimatedDuration(level.estimatedSeconds)}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Base Reward
              </div>
              <div className="mt-1 text-sm font-bold tabular-nums text-sky-700">
                +{level.baseXp} XP
              </div>
            </div>

            <div className="col-span-2 rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-2.5 sm:col-span-1">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>Perfect Bonus</span>
              </div>
              <div className="mt-1 text-sm font-bold tabular-nums text-emerald-800">
                +{level.perfectBonusXp} XP
              </div>
            </div>
          </div>

          {/* Real Completion Telemetry (shown only when exposed by persisted progress) */}
          {isCompleted && completionRecord && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>Completed</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 tabular-nums text-emerald-900">
                <span>
                  Best Accuracy:{" "}
                  <strong>{completionRecord.bestAccuracyPct}%</strong>
                </span>
                <span>
                  Replays: <strong>{completionRecord.replayCount}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Badge Preview */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
              <DojoBadgeIcon iconName={level.badgeIcon} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Mastery Badge
              </div>
              <div className="text-sm font-bold text-slate-900">
                {level.badgeName}
              </div>
              <p className="mt-0.5 text-xs leading-snug text-slate-600">
                {level.badgeDescription}
              </p>
            </div>
          </div>

          {/* Research Citation Chips */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Empirical Research Basis
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenCitation(level.id)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-1.5 text-left text-xs font-semibold text-sky-900 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden="true" />
                <span className="truncate">
                  {formatCitationChipLabel(level.citation)}
                </span>
              </button>

              {level.secondaryCitation && (
                <button
                  type="button"
                  onClick={() => onOpenCitation(level.id)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="truncate">
                    + {formatCitationChipLabel(level.secondaryCitation)}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-300"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => onStartLesson(level.id)}
            className={cn(
              "gap-2 border-b-[3px] font-semibold",
              isCompleted
                ? "border-b-emerald-800 bg-emerald-600 text-white hover:bg-emerald-500"
                : "border-b-sky-800 bg-sky-600 text-white hover:bg-sky-500"
            )}
          >
            {isCompleted ? (
              <>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Replay for Mastery</span>
              </>
            ) : (
              <>
                <Swords className="h-4 w-4" aria-hidden="true" />
                <span>Start Training</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
