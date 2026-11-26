/**
 * StopBucks Dojo Skill Map Layout Helper
 *
 * Pure presentation geometry and completion summary utilities.
 * Zero React, Next.js, or browser API dependencies.
 */

import { DOJO_LEVELS, DOJO_WORLDS } from "@/domain/dojo-curriculum";
import { getLevelStatus } from "@/domain/dojo-engine";
import type {
  DojoLevel,
  DojoLevelId,
  DojoProgress,
  DojoWorld,
  DojoWorldId,
} from "@/domain/dojo-types";

export type DojoLane = -1 | 0 | 1;

export interface DojoMapNodePosition {
  levelId: DojoLevelId;
  worldId: DojoWorldId;
  worldNumber: 1 | 2 | 3;
  orderIndex: number;
  lane: DojoLane;
  xPct: number;
  xSvg: number;
  yPx: number;
  isBoss: boolean;
}

export interface DojoMapConnector {
  id: string;
  fromLevelId: DojoLevelId;
  toLevelId: DojoLevelId;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  pathData: string;
  crossesWorldBoundary: boolean;
}

export interface DojoWorldBannerSlot {
  worldId: DojoWorldId;
  worldNumber: 1 | 2 | 3;
  bannerCenterYPx: number | null;
}

export interface DojoSkillMapLayout {
  viewBoxWidth: number;
  viewBoxHeight: number;
  canvasHeightPx: number;
  nodes: readonly DojoMapNodePosition[];
  connectors: readonly DojoMapConnector[];
  worldBanners: readonly DojoWorldBannerSlot[];
}

export interface DojoWorldCompletionStat {
  worldId: DojoWorldId;
  worldNumber: 1 | 2 | 3;
  completedCount: number;
  totalCount: number;
  isMastered: boolean;
  isUnlocked: boolean;
}

export type DojoConnectorState = "completed" | "upcoming" | "locked";

export const DOJO_MAP_VIEWBOX_WIDTH = 400;

/**
 * Balanced sinusoidal S-curve lane pattern across all 9 levels:
 * World 1: 0 -> +1 -> 0
 * World 2: -1 -> 0 -> +1
 * World 3: 0 -> -1 -> 0 (Final Boss centered)
 */
export const DOJO_S_CURVE_LANES: readonly DojoLane[] = [
  0, 1, 0, -1, 0, 1, 0, -1, 0,
] as const;

const LANE_TO_X_PCT: Record<DojoLane, number> = {
  [-1]: 22,
  [0]: 50,
  [1]: 78,
};

const TOP_NODE_OFFSET_PX = 88;
const WITHIN_WORLD_STEP_PX = 220;
const CROSS_WORLD_STEP_PX = 340;
const BOTTOM_PADDING_PX = 160;

function laneToSvgX(lane: DojoLane): number {
  return (LANE_TO_X_PCT[lane] / 100) * DOJO_MAP_VIEWBOX_WIDTH;
}

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Generates a deterministic cubic Bézier SVG path between two node centers.
 * Vertical control handles ensure smooth S-curve entry and exit tangent angles.
 */
export function buildCubicBezierConnectorPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string {
  const deltaY = toY - fromY;
  const controlOffset = deltaY * 0.48;
  const sx = roundCoord(fromX);
  const sy = roundCoord(fromY);
  const c1x = sx;
  const c1y = roundCoord(fromY + controlOffset);
  const c2x = roundCoord(toX);
  const c2y = roundCoord(toY - controlOffset);
  const ex = c2x;
  const ey = roundCoord(toY);
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
}

/**
 * Computes deterministic node coordinates, sequential cubic Bézier connectors,
 * and world banner divider positions for the 3-world winding Dojo skill map.
 */
export function buildDojoSkillMapLayout(
  levels: readonly DojoLevel[] = DOJO_LEVELS,
  worlds: readonly DojoWorld[] = DOJO_WORLDS
): DojoSkillMapLayout {
  const orderedLevels = [...levels].sort((a, b) => a.id - b.id);
  const worldMap = new Map(worlds.map((world) => [world.id, world]));

  const nodes: DojoMapNodePosition[] = [];
  const worldBannerMap = new Map<DojoWorldId, number | null>();

  if (worlds.length > 0) {
    worldBannerMap.set(worlds[0].id, null);
  }

  let currentY = TOP_NODE_OFFSET_PX;

  for (let index = 0; index < orderedLevels.length; index += 1) {
    const level = orderedLevels[index];
    const prevLevel = index > 0 ? orderedLevels[index - 1] : null;
    const crossesWorld = prevLevel !== null && prevLevel.worldId !== level.worldId;

    if (index > 0) {
      if (crossesWorld) {
        // Place the incoming world banner in the cleared zone between previous label and next node pill
        const prevNodeY = nodes[index - 1].yPx;
        const nextNodeY = prevNodeY + CROSS_WORLD_STEP_PX;
        const zoneStart = prevNodeY + 144;
        const zoneEnd = nextNodeY - 72;
        const bannerCenter = Math.round((zoneStart + zoneEnd) / 2);
        worldBannerMap.set(level.worldId, bannerCenter);
        currentY = nextNodeY;
      } else {
        currentY += WITHIN_WORLD_STEP_PX;
      }
    }

    const lane =
      index < DOJO_S_CURVE_LANES.length
        ? DOJO_S_CURVE_LANES[index]
        : (([0, 1, 0, -1][index % 4] ?? 0) as DojoLane);
    const world = worldMap.get(level.worldId);
    const worldNumber = world?.worldNumber ?? (1 as const);
    const xPct = LANE_TO_X_PCT[lane];

    nodes.push({
      levelId: level.id,
      worldId: level.worldId,
      worldNumber,
      orderIndex: index,
      lane,
      xPct,
      xSvg: laneToSvgX(lane),
      yPx: currentY,
      isBoss: level.isBoss,
    });
  }

  const connectors: DojoMapConnector[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const from = nodes[i];
    const to = nodes[i + 1];
    connectors.push({
      id: `connector-${from.levelId}-${to.levelId}`,
      fromLevelId: from.levelId,
      toLevelId: to.levelId,
      fromX: from.xSvg,
      fromY: from.yPx,
      toX: to.xSvg,
      toY: to.yPx,
      pathData: buildCubicBezierConnectorPath(from.xSvg, from.yPx, to.xSvg, to.yPx),
      crossesWorldBoundary: from.worldId !== to.worldId,
    });
  }

  const lastY = nodes.length > 0 ? nodes[nodes.length - 1].yPx : 0;
  const canvasHeightPx = nodes.length > 0 ? lastY + BOTTOM_PADDING_PX : 0;

  const worldBanners: DojoWorldBannerSlot[] = [...worlds]
    .sort((a, b) => a.worldNumber - b.worldNumber)
    .map((world) => ({
      worldId: world.id,
      worldNumber: world.worldNumber,
      bannerCenterYPx: worldBannerMap.get(world.id) ?? null,
    }));

  return {
    viewBoxWidth: DOJO_MAP_VIEWBOX_WIDTH,
    viewBoxHeight: canvasHeightPx,
    canvasHeightPx,
    nodes,
    connectors,
    worldBanners,
  };
}

/**
 * Evaluates visual connector segment state strictly from Phase 5A level statuses.
 */
export function getDojoConnectorState(
  fromLevelId: DojoLevelId,
  toLevelId: DojoLevelId,
  progress: DojoProgress
): DojoConnectorState {
  const fromStatus = getLevelStatus(fromLevelId, progress);
  const toStatus = getLevelStatus(toLevelId, progress);

  if (fromStatus === "completed" && toStatus === "completed") {
    return "completed";
  }
  if (fromStatus === "completed" && toStatus === "active") {
    return "upcoming";
  }
  return "locked";
}

/**
 * Calculates deterministic per-world completion counts and mastery status
 * strictly from persisted completed-level records.
 */
export function getDojoWorldCompletionStats(
  progress: DojoProgress,
  levels: readonly DojoLevel[] = DOJO_LEVELS,
  worlds: readonly DojoWorld[] = DOJO_WORLDS
): DojoWorldCompletionStat[] {
  const completedSet = new Set(progress.completedLevels.map((entry) => entry.levelId));
  const orderedWorlds = [...worlds].sort((a, b) => a.worldNumber - b.worldNumber);

  const stats: DojoWorldCompletionStat[] = [];
  let precedingWorldMastered = true;

  for (const world of orderedWorlds) {
    const worldLevels = levels.filter((level) => level.worldId === world.id);
    const completedCount = worldLevels.filter((level) =>
      completedSet.has(level.id)
    ).length;
    const totalCount = worldLevels.length;
    const isMastered = totalCount > 0 && completedCount === totalCount;
    const isUnlocked = world.worldNumber === 1 ? true : precedingWorldMastered;

    stats.push({
      worldId: world.id,
      worldNumber: world.worldNumber,
      completedCount,
      totalCount,
      isMastered,
      isUnlocked,
    });

    precedingWorldMastered = isMastered;
  }

  return stats;
}
