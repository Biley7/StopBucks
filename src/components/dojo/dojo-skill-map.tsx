"use client";

import React from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { DOJO_LEVELS, DOJO_WORLDS } from "@/domain/dojo-curriculum";
import type { DojoLevelId, DojoProgress, DojoWorld } from "@/domain/dojo-types";
import {
  buildDojoSkillMapLayout,
  getDojoConnectorState,
  getDojoWorldCompletionStats,
  type DojoWorldCompletionStat,
} from "@/lib/dojo-map-layout";
import { cn } from "@/lib/utils";
import { DojoLevelNode } from "./dojo-level-node";
import { DOJO_WORLD_STYLES } from "./dojo-theme";

interface DojoSkillMapProps {
  progress: DojoProgress;
  onSelectLevel: (levelId: DojoLevelId) => void;
}

function WorldBanner({
  world,
  stat,
}: {
  world: DojoWorld;
  stat: DojoWorldCompletionStat;
}) {
  const worldStyle = DOJO_WORLD_STYLES[world.id];

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 shadow-xs",
        worldStyle.bannerBorderClass,
        !stat.isUnlocked && "bg-slate-50/95 opacity-90"
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

          <h2 className="mt-1.5 text-sm font-bold text-slate-900 sm:text-base">
            {world.title}
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-slate-600">
            {world.subtitle}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-800">
            {stat.completedCount}/{stat.totalCount}
          </div>
          <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
            Levels
          </span>
        </div>
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

  return (
    <section aria-label="StopBucks Dojo 3-World Skill Map" className="space-y-4">
      {/* World 1 Banner sits cleanly above the winding track */}
      {firstWorld && firstWorldStat && (
        <WorldBanner world={firstWorld} stat={firstWorldStat} />
      )}

      {/* Responsive Winding S-Curve Map Track */}
      <div
        style={{ height: `${layout.canvasHeightPx}px` }}
        className="relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
      >
        {/* Decorative S-Curve SVG Connectors behind nodes */}
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
                stroke={
                  isCompleted ? "#059669" : isUpcoming ? "#64748b" : "#cbd5e1"
                }
                strokeWidth={isCompleted ? 3.5 : 2.75}
                strokeDasharray={isCompleted ? undefined : "7 7"}
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

        {/* Nine Tactile Level Nodes */}
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
