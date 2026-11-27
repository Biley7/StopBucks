"use client";

import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Crown,
  Flame,
  Layers,
  Lock,
  Play,
  Shield,
} from "lucide-react";
import { DOJO_LEVELS, DOJO_WORLDS } from "@/domain/dojo-curriculum";
import type {
  DojoLevelId,
  DojoProgress,
  DojoWorld,
  DojoWorldId,
} from "@/domain/dojo-types";
import {
  buildDojoSkillMapLayout,
  getActiveDojoLevel,
  getDojoConnectorState,
  getDojoWorldCompletionStats,
  type DojoWorldCompletionStat,
} from "@/lib/dojo-map-layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedProgressBar } from "@/components/shared/motion-primitives";
import { DojoLevelNode } from "./dojo-level-node";
import { DOJO_WORLD_STYLES } from "./dojo-theme";

interface DojoSkillMapProps {
  progress: DojoProgress;
  onSelectLevel: (levelId: DojoLevelId) => void;
}

const WORLD_WATERMARK: Record<
  DojoWorldId,
  {
    bgClass: string;
    iconColorClass: string;
    Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  }
> = {
  "world-1": {
    bgClass: "bg-amber-50/35",
    iconColorClass: "text-amber-900/[0.045]",
    Icon: Flame,
  },
  "world-2": {
    bgClass: "bg-sky-50/35",
    iconColorClass: "text-sky-900/[0.045]",
    Icon: Layers,
  },
  "world-3": {
    bgClass: "bg-emerald-50/35",
    iconColorClass: "text-emerald-900/[0.045]",
    Icon: Compass,
  },
};

function WorldBanner({
  world,
  stat,
}: {
  world: DojoWorld;
  stat: DojoWorldCompletionStat;
}) {
  const worldStyle = DOJO_WORLD_STYLES[world.id];
  const pct =
    stat.totalCount > 0
      ? Math.round((stat.completedCount / stat.totalCount) * 100)
      : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        worldStyle.bannerBorderClass,
        stat.isUnlocked
          ? worldStyle.bannerLeftAccentClass
          : "border-slate-900/[0.08] bg-slate-50/95"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                worldStyle.worldPillClass
              )}
            >
              World {world.worldNumber}
            </span>
            {stat.isMastered && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Mastered
              </span>
            )}
            {!stat.isUnlocked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Not Yet Unlocked
              </span>
            )}
          </div>

          <h2
            className={cn(
              "mt-1.5 text-sm font-bold sm:text-base",
              stat.isUnlocked ? "text-slate-900" : "text-slate-700"
            )}
          >
            {world.title}
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-slate-600">
            {world.subtitle}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-800">
            {stat.completedCount}/{stat.totalCount} Levels
          </div>
        </div>
      </div>

      {/* Tactile World Progress Bar */}
      <div className="mt-2.5 flex items-center gap-2.5">
        <AnimatedProgressBar
          value={pct}
          ariaLabel={`World ${world.worldNumber} completion progress`}
          ariaValueNow={stat.completedCount}
          ariaValueMax={stat.totalCount}
          trackClassName="h-2 flex-1 border border-slate-900/[0.06] bg-slate-100"
          barClassName={stat.isMastered ? "bg-emerald-600" : worldStyle.progressBarClass}
        />
        <span className="w-8 text-right text-[11px] font-bold tabular-nums text-slate-600">
          {pct}%
        </span>
      </div>
    </div>
  );
}

export function DojoSkillMap({ progress, onSelectLevel }: DojoSkillMapProps) {
  const layout = React.useMemo(
    () => buildDojoSkillMapLayout(DOJO_LEVELS, DOJO_WORLDS),
    []
  );
  const worldStats = React.useMemo(
    () => getDojoWorldCompletionStats(progress, DOJO_LEVELS, DOJO_WORLDS),
    [progress]
  );
  const activeLevel = React.useMemo(
    () => getActiveDojoLevel(progress, DOJO_LEVELS),
    [progress]
  );

  const levelMap = React.useMemo(
    () => new Map(DOJO_LEVELS.map((level) => [level.id, level])),
    []
  );
  const completionMap = React.useMemo(
    () =>
      new Map(progress.completedLevels.map((entry) => [entry.levelId, entry])),
    [progress.completedLevels]
  );
  const worldMap = React.useMemo(
    () => new Map(DOJO_WORLDS.map((world) => [world.id, world])),
    []
  );
  const statMap = React.useMemo(
    () => new Map(worldStats.map((stat) => [stat.worldId, stat])),
    [worldStats]
  );

  const firstWorld = DOJO_WORLDS[0];
  const firstWorldStat = firstWorld ? statMap.get(firstWorld.id) : undefined;
  const activeWorld = activeLevel ? worldMap.get(activeLevel.worldId) : null;

  // Derive vertical tonal zones for the 3 worlds without altering node/connector layout
  const w2BannerY =
    layout.worldBanners.find((b) => b.worldId === "world-2")?.bannerCenterYPx ??
    Math.round(layout.canvasHeightPx / 3);
  const w3BannerY =
    layout.worldBanners.find((b) => b.worldId === "world-3")?.bannerCenterYPx ??
    Math.round((layout.canvasHeightPx * 2) / 3);

  const worldZones: Array<{
    worldId: DojoWorldId;
    topPx: number;
    heightPx: number;
  }> = [
    { worldId: "world-1", topPx: 0, heightPx: w2BannerY },
    { worldId: "world-2", topPx: w2BannerY, heightPx: w3BannerY - w2BannerY },
    {
      worldId: "world-3",
      topPx: w3BannerY,
      heightPx: Math.max(0, layout.canvasHeightPx - w3BannerY),
    },
  ];

  return (
    <section aria-label="StopBucks Dojo 3-World Skill Map" className="space-y-4">
      {/* Mobile-only (< lg) Continue Next Drill CTA (Desktop uses Action Strip + Side Rail) */}
      {activeLevel ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_18px_-6px_rgba(15,23,42,0.06)] lg:hidden">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-800">
                Active Drill · Level {activeLevel.id}
              </span>
              {activeWorld && (
                <span className="text-[11px] font-semibold text-slate-600">
                  World {activeWorld.worldNumber} · {activeWorld.title}
                </span>
              )}
              {activeLevel.isBoss && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                  {activeLevel.id === 9 ? (
                    <Crown className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Shield className="h-3 w-3" aria-hidden="true" />
                  )}
                  {activeLevel.id === 9 ? "FINAL BOSS" : "WORLD BOSS"}
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
              Level {activeLevel.id}: {activeLevel.title}
            </h2>
          </div>

          <Button
            type="button"
            onClick={() => onSelectLevel(activeLevel.id)}
            className="h-10 shrink-0 gap-2 border-b-[3px] border-b-sky-950 bg-sky-700 px-4 text-xs font-bold text-white hover:bg-sky-800 active:translate-y-px sm:text-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Continue Next Drill</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700">
              <Crown className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                All 9 Drills Mastered
              </div>
              <p className="text-sm font-bold text-slate-900">
                Full 3-World Behavioral Training Path Complete
              </p>
              <p className="text-xs text-slate-600">
                Select any node below to replay drills or revisit your Live Wallet Mirror.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800 sm:self-center">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            9/9 Complete
          </span>
        </div>
      )}

      {/* World 1 Banner sits cleanly above the winding track */}
      {firstWorld && firstWorldStat && (
        <WorldBanner world={firstWorld} stat={firstWorldStat} />
      )}

      {/* Responsive Winding S-Curve Game-Board Canvas */}
      <div
        style={{ height: `${layout.canvasHeightPx}px` }}
        className="relative w-full overflow-hidden rounded-2xl border border-slate-900/[0.08] bg-white bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"
      >
        {/* Softer ambient visual counterpart behind the Dojo map */}
        <div
          aria-hidden="true"
          className="dojo-ambient-drift pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,rgba(2,132,199,0.035),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.035),transparent_50%)]"
        />
        {/* Subtle 3-World Tonal Atmosphere + Corner Emblem Watermarks (strictly z-0 behind board) */}
        {worldZones.map((zone) => {
          const theme = WORLD_WATERMARK[zone.worldId];
          const WatermarkIcon = theme.Icon;
          return (
            <div
              key={zone.worldId}
              aria-hidden="true"
              style={{ top: `${zone.topPx}px`, height: `${zone.heightPx}px` }}
              className={cn(
                "pointer-events-none absolute inset-x-0 z-0 overflow-hidden",
                theme.bgClass
              )}
            >
              <WatermarkIcon
                aria-hidden={true}
                className={cn(
                  "absolute right-4 top-5 h-32 w-32 sm:right-8 sm:top-6 sm:h-40 sm:w-40",
                  theme.iconColorClass
                )}
              />
            </div>
          );
        })}

        {/* Decorative S-Curve SVG Connectors strictly behind world banners (z-10) and nodes/labels (z-20) */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        >
          {layout.connectors.map((connector) => {
            const state = getDojoConnectorState(
              connector.fromLevelId,
              connector.toLevelId,
              progress
            );

            const isCompleted = state === "completed";
            const isUpcoming = state === "upcoming";

            return (
              <path
                key={connector.id}
                data-connector-state={state}
                d={connector.pathData}
                fill="none"
                vectorEffect="non-scaling-stroke"
                className={isUpcoming ? "dojo-connector-active" : undefined}
                stroke={
                  isCompleted ? "#059669" : isUpcoming ? "#0284c7" : "#cbd5e1"
                }
                strokeWidth={4}
                strokeDasharray={
                  isCompleted ? undefined : isUpcoming ? "8 7" : "7 7"
                }
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* World 2 & World 3 Divider Banners positioned inside cleared track gaps */}
        {layout.worldBanners
          .filter((banner) => banner.bannerCenterYPx !== null)
          .map((banner) => {
            const world = worldMap.get(banner.worldId);
            const stat = statMap.get(banner.worldId);
            if (!world || !stat || banner.bannerCenterYPx === null) return null;

            return (
              <div
                key={world.id}
                style={{ top: `${banner.bannerCenterYPx}px` }}
                className="absolute inset-x-3 z-10 -translate-y-1/2 sm:inset-x-5"
              >
                <WorldBanner world={world} stat={stat} />
              </div>
            );
          })}

        {/* Nine Tactile 3D Level Tokens */}
        {layout.nodes.map((nodePos) => {
          const level = levelMap.get(nodePos.levelId);
          if (!level) return null;

          return (
            <DojoLevelNode
              key={level.id}
              level={level}
              progress={progress}
              position={nodePos}
              completionRecord={completionMap.get(level.id)}
              onSelectLevel={onSelectLevel}
            />
          );
        })}
      </div>
    </section>
  );
}
