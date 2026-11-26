import { describe, expect, it } from "vitest";
import { DOJO_LEVELS, DOJO_WORLDS } from "@/domain/dojo-curriculum";
import {
  applyDojoLevelCompletion,
  createGuestSeededDojoProgress,
  createInitialDojoProgress,
} from "@/domain/dojo-engine";
import type { DojoLevelId } from "@/domain/dojo-types";
import {
  DOJO_S_CURVE_LANES,
  buildDojoSkillMapLayout,
  getDojoConnectorState,
  getDojoWorldCompletionStats,
} from "@/lib/dojo-map-layout";
import {
  getGroupedDojoResearchLibrary,
  getUniqueDojoCitations,
} from "@/lib/dojo-citations";

function completeLevelsUpTo(targetLevelId: DojoLevelId) {
  let progress = createInitialDojoProgress("2026-11-01T09:00:00.000Z");
  for (let id = 1; id <= targetLevelId; id += 1) {
    progress = applyDojoLevelCompletion(progress, {
      levelId: id as DojoLevelId,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: `2026-11-${String(id).padStart(2, "0")}`,
      nowIso: `2026-11-${String(id).padStart(2, "0")}T10:00:00.000Z`,
    }).nextProgress;
  }
  return progress;
}

describe("Phase 5B: Deterministic 9-Level S-Curve Map Layout", () => {
  it("positions all nine levels in curriculum order using only supported lanes", () => {
    const layout = buildDojoSkillMapLayout(DOJO_LEVELS, DOJO_WORLDS);

    expect(layout.nodes).toHaveLength(9);
    expect(layout.nodes.map((node) => node.levelId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(layout.nodes.map((node) => node.lane)).toEqual([
      ...DOJO_S_CURVE_LANES,
    ]);

    for (const node of layout.nodes) {
      expect([-1, 0, 1]).toContain(node.lane);
      expect(node.xPct).toBeGreaterThan(0);
      expect(node.xPct).toBeLessThan(100);
      expect(node.yPx).toBeGreaterThan(0);
    }

    // Y coordinates strictly increase down the skill map
    for (let i = 1; i < layout.nodes.length; i += 1) {
      expect(layout.nodes[i].yPx).toBeGreaterThan(layout.nodes[i - 1].yPx);
    }
  });

  it("produces identical deterministic layout across repeated calls", () => {
    const first = buildDojoSkillMapLayout(DOJO_LEVELS, DOJO_WORLDS);
    const second = buildDojoSkillMapLayout(
      [...DOJO_LEVELS].reverse(),
      [...DOJO_WORLDS].reverse()
    );

    expect(second).toEqual(first);
  });

  it("aligns world banner slots for worlds 2 and 3 inside cross-world gaps", () => {
    const layout = buildDojoSkillMapLayout(DOJO_LEVELS, DOJO_WORLDS);
    expect(layout.worldBanners).toHaveLength(3);
    expect(layout.worldBanners[0].bannerCenterYPx).toBeNull();

    const w2BannerY = layout.worldBanners[1].bannerCenterYPx;
    const w3BannerY = layout.worldBanners[2].bannerCenterYPx;
    expect(w2BannerY).not.toBeNull();
    expect(w3BannerY).not.toBeNull();

    // World 2 banner sits strictly between Level 3 and Level 4
    expect(w2BannerY!).toBeGreaterThan(layout.nodes[2].yPx);
    expect(w2BannerY!).toBeLessThan(layout.nodes[3].yPx);

    // World 3 banner sits strictly between Level 6 and Level 7
    expect(w3BannerY!).toBeGreaterThan(layout.nodes[5].yPx);
    expect(w3BannerY!).toBeLessThan(layout.nodes[6].yPx);
  });
});

describe("Phase 5B: Sequential Cubic Bézier SVG Connectors", () => {
  it("generates exactly 8 sequential connectors matching node coordinates", () => {
    const layout = buildDojoSkillMapLayout(DOJO_LEVELS, DOJO_WORLDS);
    expect(layout.connectors).toHaveLength(8);

    const nodeById = new Map(layout.nodes.map((node) => [node.levelId, node]));

    for (let i = 0; i < layout.connectors.length; i += 1) {
      const connector = layout.connectors[i];
      const expectedFromId = (i + 1) as DojoLevelId;
      const expectedToId = (i + 2) as DojoLevelId;
      const fromNode = nodeById.get(expectedFromId)!;
      const toNode = nodeById.get(expectedToId)!;

      expect(connector.fromLevelId).toBe(expectedFromId);
      expect(connector.toLevelId).toBe(expectedToId);
      expect(connector.fromX).toBe(fromNode.xSvg);
      expect(connector.fromY).toBe(fromNode.yPx);
      expect(connector.toX).toBe(toNode.xSvg);
      expect(connector.toY).toBe(toNode.yPx);

      // Verify path string begins at (fromX, fromY) and ends at (toX, toY)
      expect(connector.pathData.startsWith(`M ${fromNode.xSvg} ${fromNode.yPx} C`)).toBe(
        true
      );
      expect(connector.pathData.endsWith(`${toNode.xSvg} ${toNode.yPx}`)).toBe(true);

      const expectedCrossWorld =
        (expectedFromId === 3 && expectedToId === 4) ||
        (expectedFromId === 6 && expectedToId === 7);
      expect(connector.crossesWorldBoundary).toBe(expectedCrossWorld);

      // No connector targets a nonexistent level ID
      expect(nodeById.has(connector.fromLevelId)).toBe(true);
      expect(nodeById.has(connector.toLevelId)).toBe(true);
    }
  });

  it("distinguishes completed, upcoming, and locked connector segments accurately", () => {
    const guest = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );
    // Level 1 completed, Level 2 active, Level 3+ locked
    expect(getDojoConnectorState(1, 2, guest)).toBe("upcoming");
    expect(getDojoConnectorState(2, 3, guest)).toBe("locked");

    const afterL2 = completeLevelsUpTo(2);
    expect(getDojoConnectorState(1, 2, afterL2)).toBe("completed");
    expect(getDojoConnectorState(2, 3, afterL2)).toBe("upcoming");
    expect(getDojoConnectorState(3, 4, afterL2)).toBe("locked");
  });
});

describe("Phase 5B: World Completion Counts & Mastery", () => {
  it("computes counts accurately for initial, guest-seeded, partial, and full progress", () => {
    const initial = createInitialDojoProgress();
    const initialStats = getDojoWorldCompletionStats(initial);
    expect(initialStats.map((s) => s.completedCount)).toEqual([0, 0, 0]);
    expect(initialStats.map((s) => s.totalCount)).toEqual([3, 3, 3]);
    expect(initialStats.map((s) => s.isMastered)).toEqual([false, false, false]);
    expect(initialStats.map((s) => s.isUnlocked)).toEqual([true, false, false]);

    const guest = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );
    const guestStats = getDojoWorldCompletionStats(guest);
    expect(guestStats.map((s) => s.completedCount)).toEqual([1, 0, 0]);
    expect(guestStats.map((s) => s.isMastered)).toEqual([false, false, false]);
    expect(guestStats.map((s) => s.isUnlocked)).toEqual([true, false, false]);

    // Complete World 1 + first level of World 2 (Levels 1..4)
    const partial = completeLevelsUpTo(4);
    const partialStats = getDojoWorldCompletionStats(partial);
    expect(partialStats.map((s) => s.completedCount)).toEqual([3, 1, 0]);
    expect(partialStats.map((s) => s.isMastered)).toEqual([true, false, false]);
    expect(partialStats.map((s) => s.isUnlocked)).toEqual([true, true, false]);

    // Complete all 9 levels
    const full = completeLevelsUpTo(9);
    const fullStats = getDojoWorldCompletionStats(full);
    expect(fullStats.map((s) => s.completedCount)).toEqual([3, 3, 3]);
    expect(fullStats.map((s) => s.isMastered)).toEqual([true, true, true]);
    expect(fullStats.map((s) => s.isUnlocked)).toEqual([true, true, true]);
  });

  it("never infers world completion from totalXp alone", () => {
    const xpOnlyProgress = {
      ...createInitialDojoProgress(),
      totalXp: 1200,
    };
    const stats = getDojoWorldCompletionStats(xpOnlyProgress);
    expect(stats.map((s) => s.completedCount)).toEqual([0, 0, 0]);
    expect(stats.map((s) => s.isMastered)).toEqual([false, false, false]);
  });
});

describe("Phase 5B: Curriculum Research Library Deduplication", () => {
  it("extracts all unique studies from DOJO_LEVELS without duplicates or drops", () => {
    const studies = getUniqueDojoCitations(DOJO_LEVELS, DOJO_WORLDS);
    const grouped = getGroupedDojoResearchLibrary(DOJO_LEVELS, DOJO_WORLDS);

    // 9 primary citations + 3 secondary citations (Levels 1, 3, 7) = 12 distinct studies
    expect(studies).toHaveLength(12);
    expect(new Set(studies.map((s) => s.id)).size).toBe(12);
    expect(
      grouped.reduce((sum, group) => sum + group.studies.length, 0)
    ).toBe(studies.length);

    // Deduplicates identical bibliographic citations referenced in multiple levels
    const duplicatedInput = [
      DOJO_LEVELS[0],
      {
        ...DOJO_LEVELS[1],
        citation: { ...DOJO_LEVELS[0].citation },
      },
    ];
    const deduped = getUniqueDojoCitations(duplicatedInput, DOJO_WORLDS);
    const stromback = deduped.find((s) =>
      s.citation.authors.includes("Strömbäck")
    );
    expect(stromback?.referencedBy).toHaveLength(2);
  });
});
