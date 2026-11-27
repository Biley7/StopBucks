"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Crown, Lock, Play, Shield } from "lucide-react";
import { getLevelStatus } from "@/domain/dojo-engine";
import type {
  DojoLevel,
  DojoLevelCompletion,
  DojoLevelId,
  DojoProgress,
} from "@/domain/dojo-types";
import type { DojoMapNodePosition } from "@/lib/dojo-map-layout";
import { cn } from "@/lib/utils";

interface DojoLevelNodeProps {
  level: DojoLevel;
  progress: DojoProgress;
  position: DojoMapNodePosition;
  completionRecord?: DojoLevelCompletion;
  onSelectLevel: (levelId: DojoLevelId) => void;
}

export function DojoLevelNode({
  level,
  progress,
  position,
  completionRecord,
  onSelectLevel,
}: DojoLevelNodeProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  // Phase 5A domain function is the sole authority for level launchability
  const status = getLevelStatus(level.id, progress);
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isFinalBoss = level.isBoss && level.id === 9;

  const bossLabel = isFinalBoss
    ? "FINAL BOSS"
    : level.isBoss
      ? "WORLD BOSS"
      : null;

  const hasValidAccuracy =
    isCompleted &&
    completionRecord !== undefined &&
    typeof completionRecord.bestAccuracyPct === "number" &&
    Number.isFinite(completionRecord.bestAccuracyPct);

  const ariaLabel = [
    `Level ${level.id}: ${level.title}`,
    bossLabel,
    status === "completed"
      ? `Completed${hasValidAccuracy ? ` (${completionRecord.bestAccuracyPct}% accuracy)` : ""}`
      : status === "active"
        ? "Ready to train"
        : `Locked — finish Level ${level.id - 1} to unlock`,
    `+${level.baseXp} XP`,
  ]
    .filter(Boolean)
    .join(", ");

  const renderNodeIcon = () => {
    if (isLocked) {
      return <Lock className="h-6 w-6" aria-hidden="true" />;
    }
    if (level.isBoss) {
      return isFinalBoss ? (
        <Crown className="h-7 w-7" aria-hidden="true" />
      ) : (
        <Shield className="h-7 w-7" aria-hidden="true" />
      );
    }
    if (isCompleted) {
      return <Check className="h-7 w-7 stroke-[2.75]" aria-hidden="true" />;
    }
    return <Play className="h-6 w-6 fill-current translate-x-0.5" aria-hidden="true" />;
  };

  const { halfButtonPx, labelAnchor, labelOffsetPx } = position;
  const buttonSizeClass = level.isBoss ? "h-[74px] w-[74px]" : "h-16 w-16";

  const buttonSurfaceClass = isCompleted
    ? level.isBoss
      ? "bg-emerald-700 border-2 border-emerald-800 border-b-[5px] border-b-emerald-950 text-white hover:bg-emerald-600"
      : "bg-emerald-600 border-2 border-emerald-700 border-b-[5px] border-b-emerald-800 text-white hover:bg-emerald-500"
    : isActive
      ? level.isBoss
        ? "bg-slate-900 border-2 border-amber-400/80 border-b-[5px] border-b-slate-950 text-amber-300 hover:bg-slate-800 ring-4 ring-amber-200/80"
        : "bg-sky-600 border-2 border-sky-700 border-b-[5px] border-b-sky-800 text-white hover:bg-sky-500 ring-4 ring-sky-200"
      : "bg-slate-100 border-2 border-slate-200 border-b-[5px] border-b-slate-300 text-slate-400 cursor-not-allowed";

  const labelPositionStyle: React.CSSProperties =
    labelAnchor === "below"
      ? { top: `${labelOffsetPx}px` }
      : labelAnchor === "right"
        ? { left: `${labelOffsetPx}px`, top: "0px" }
        : { right: `${labelOffsetPx}px`, top: "0px" };

  const labelPositionClass =
    labelAnchor === "below"
      ? "left-0 w-[204px] -translate-x-1/2 text-center sm:w-[232px]"
      : labelAnchor === "right"
        ? "w-[188px] -translate-y-1/2 text-left sm:w-[228px]"
        : "w-[188px] -translate-y-1/2 text-right sm:w-[228px]";

  const labelRowJustifyClass =
    labelAnchor === "below"
      ? "justify-center"
      : labelAnchor === "right"
        ? "justify-start"
        : "justify-end";

  return (
    <div
      style={{
        left: `${position.xPct}%`,
        top: `${position.yPx}px`,
      }}
      className="absolute z-20"
    >
      {/* Zero-size geometric anchor so circle center and all labels align cleanly to (xPct%, yPx) */}
      <div className="relative h-0 w-0">
        {/* Top Tag Pills (NEXT DRILL / BOSS) */}
        {(isActive || bossLabel) && (
          <div
            style={{ bottom: `${halfButtonPx + 10}px` }}
            className="pointer-events-none absolute left-0 z-20 flex -translate-x-1/2 flex-col items-center gap-1"
          >
            {isActive && (
              <span className="whitespace-nowrap rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-sky-700 uppercase shadow-xs">
                NEXT DRILL
              </span>
            )}
            {bossLabel && (
              <span
                className={cn(
                  "whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-extrabold tracking-wider uppercase",
                  isLocked
                    ? "border-slate-200 bg-slate-100 text-slate-500"
                    : isFinalBoss
                      ? "border-amber-400/70 bg-slate-900 text-amber-300"
                      : "border-amber-300 bg-amber-50 text-amber-900"
                )}
              >
                {bossLabel}
              </span>
            )}
          </div>
        )}

        {/* Active subtle animated ring (disabled under reduced motion) */}
        {isActive && !shouldReduceMotion && (
          <div className="pointer-events-none absolute left-0 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
            <motion.span
              aria-hidden="true"
              initial={{ scale: 0.96, opacity: 0.55 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{
                duration: 1.8,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeOut",
              }}
              className={cn(
                "block rounded-full border-2",
                level.isBoss
                  ? "h-[82px] w-[82px] border-amber-400/70"
                  : "h-[72px] w-[72px] border-sky-400/70"
              )}
            />
          </div>
        )}

        {/* Tactile Node Button centered directly on anchor point */}
        <div className="absolute left-0 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          <motion.button
            type="button"
            disabled={isLocked}
            aria-disabled={isLocked}
            aria-label={ariaLabel}
            onClick={() => {
              if (!isLocked) {
                onSelectLevel(level.id);
              }
            }}
            whileHover={isLocked || shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={isLocked || shouldReduceMotion ? undefined : { y: 2 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 450, damping: 28 }
            }
            className={cn(
              "relative flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
              buttonSizeClass,
              buttonSurfaceClass,
              !isLocked && "cursor-pointer"
            )}
          >
            {renderNodeIcon()}

            {/* Completed checkmark corner seal for completed Bosses */}
            {isCompleted && level.isBoss && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-xs"
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
            )}
          </motion.button>

          {/* Accuracy pill on completed nodes when real accuracy data exists */}
          {hasValidAccuracy && (
            <span className="pointer-events-none absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800 shadow-xs">
              {completionRecord.bestAccuracyPct}%
            </span>
          )}
        </div>

        {/* Opaque High-Contrast Level Label Card positioned from shared layout geometry */}
        <div
          data-label-anchor={labelAnchor}
          data-testid={`dojo-node-label-${level.id}`}
          style={labelPositionStyle}
          className={cn(
            "pointer-events-none absolute z-20 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-xs backdrop-blur-sm",
            isActive && "ring-1 ring-sky-200/80",
            labelPositionClass
          )}
        >
          <div
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500",
              labelRowJustifyClass
            )}
          >
            <span>Level {level.id}</span>
            <span aria-hidden="true">·</span>
            <span
              className={cn(
                isCompleted
                  ? "text-emerald-700"
                  : isActive
                    ? "text-sky-700"
                    : "text-slate-500"
              )}
            >
              {isCompleted ? "Done" : isActive ? "Ready" : "Locked"}
            </span>
          </div>

          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-xs font-semibold leading-tight",
              isLocked ? "text-slate-600" : "text-slate-900"
            )}
          >
            {level.title}
          </p>

          <div
            className={cn(
              "mt-0.5 text-[11px] font-semibold tabular-nums text-slate-600",
              labelAnchor === "below"
                ? "text-center"
                : labelAnchor === "right"
                  ? "text-left"
                  : "text-right"
            )}
          >
            +{level.baseXp} XP
          </div>

          {isLocked && level.id > 1 && (
            <p className="mt-0.5 text-[10px] font-medium leading-tight text-slate-400">
              Finish Level {level.id - 1} to unlock
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
