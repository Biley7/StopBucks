/**
 * StopBucks Dojo Research Library Helper
 *
 * Pure utility for extracting and deduplicating verified research citations
 * directly from the Phase 5A DOJO_LEVELS curriculum.
 */

import { DOJO_LEVELS, DOJO_WORLDS } from "@/domain/dojo-curriculum";
import type {
  DojoCitation,
  DojoLevel,
  DojoLevelId,
  DojoWorld,
  DojoWorldId,
} from "@/domain/dojo-types";

export interface DojoLibraryStudy {
  id: string;
  citation: DojoCitation;
  worldId: DojoWorldId;
  worldNumber: 1 | 2 | 3;
  worldTitle: string;
  referencedBy: Array<{
    levelId: DojoLevelId;
    levelTitle: string;
    role: "primary" | "secondary";
  }>;
}

export interface DojoWorldStudyGroup {
  worldId: DojoWorldId;
  worldNumber: 1 | 2 | 3;
  worldTitle: string;
  worldSubtitle: string;
  studies: DojoLibraryStudy[];
}

/**
 * Deterministic key combining bibliographic fields to deduplicate citations.
 */
export function buildCitationKey(citation: DojoCitation): string {
  const normalize = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, " ");
  return `${normalize(citation.authors)}|${citation.year}|${normalize(citation.title)}`;
}

/**
 * Extracts all unique research studies from the curriculum without dropping or duplicating any study.
 */
export function getUniqueDojoCitations(
  levels: readonly DojoLevel[] = DOJO_LEVELS,
  worlds: readonly DojoWorld[] = DOJO_WORLDS
): DojoLibraryStudy[] {
  const worldMap = new Map(worlds.map((world) => [world.id, world]));
  const studyMap = new Map<string, DojoLibraryStudy>();
  const orderedLevels = [...levels].sort((a, b) => a.id - b.id);

  const registerCitation = (
    citation: DojoCitation,
    level: DojoLevel,
    role: "primary" | "secondary"
  ) => {
    const key = buildCitationKey(citation);
    const existing = studyMap.get(key);
    const ref = {
      levelId: level.id,
      levelTitle: level.title,
      role,
    };

    if (existing) {
      existing.referencedBy.push(ref);
      return;
    }

    const world = worldMap.get(level.worldId);
    studyMap.set(key, {
      id: key,
      citation,
      worldId: level.worldId,
      worldNumber: world?.worldNumber ?? 1,
      worldTitle: world?.title ?? "StopBucks Dojo",
      referencedBy: [ref],
    });
  };

  for (const level of orderedLevels) {
    registerCitation(level.citation, level, "primary");
    if (level.secondaryCitation) {
      registerCitation(level.secondaryCitation, level, "secondary");
    }
  }

  return Array.from(studyMap.values());
}

/**
 * Groups unique curriculum studies under their primary world headings.
 */
export function getGroupedDojoResearchLibrary(
  levels: readonly DojoLevel[] = DOJO_LEVELS,
  worlds: readonly DojoWorld[] = DOJO_WORLDS
): DojoWorldStudyGroup[] {
  const studies = getUniqueDojoCitations(levels, worlds);
  const orderedWorlds = [...worlds].sort((a, b) => a.worldNumber - b.worldNumber);

  return orderedWorlds.map((world) => ({
    worldId: world.id,
    worldNumber: world.worldNumber,
    worldTitle: world.title,
    worldSubtitle: world.subtitle,
    studies: studies.filter((study) => study.worldId === world.id),
  }));
}
