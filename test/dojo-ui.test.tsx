import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { DOJO_LEVELS } from "@/domain/dojo-curriculum";
import {
  applyDojoLevelCompletion,
  createGuestSeededDojoProgress,
  createInitialDojoProgress,
} from "@/domain/dojo-engine";
import type { DojoLevelId, DojoProgress } from "@/domain/dojo-types";
import { buildDojoSkillMapLayout } from "@/lib/dojo-map-layout";
import {
  buildSoundToggledProgress,
  createDojoSoundMutationOptions,
} from "@/lib/dojo-sound-mutation";
import { queryKeys } from "@/lib/query-keys";
import { GuestSandboxRepository } from "@/repositories/guest-sandbox.repository";

// Mock Next.js navigation, React Query context hooks, and Radix Dialog Portal for SSR rendering checks
vi.mock("next/navigation", () => ({
  usePathname: () => "/dojo",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query"
  );
  return {
    ...actual,
    useQueryClient: () => ({ clear: vi.fn() }),
  };
});

vi.mock("@/repositories/repository-provider", () => ({
  useRepository: () => ({
    isGuest: true,
    user: null,
    exitGuestMode: vi.fn(),
  }),
}));

vi.mock("@radix-ui/react-dialog", async () => {
  const actual = await vi.importActual<typeof import("@radix-ui/react-dialog")>(
    "@radix-ui/react-dialog"
  );
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { AppSidebar, NAV_ITEMS } from "@/components/shared/app-sidebar";
import { MobileBottomNav } from "@/components/shared/app-topbar";
import { DojoHeader } from "@/components/dojo/dojo-header";
import { DojoLevelNode } from "@/components/dojo/dojo-level-node";
import { DojoSkillMap } from "@/components/dojo/dojo-skill-map";
import { DojoLevelBriefing } from "@/components/dojo/dojo-level-briefing";
import { DojoTrophyDrawer } from "@/components/dojo/dojo-trophy-drawer";
import { DojoCitationModal } from "@/components/dojo/dojo-citation-modal";
import { DojoLessonHandoffDialog } from "@/components/dojo/dojo-lesson-handoff-dialog";

describe("Phase 5B: Navigation Integration", () => {
  it("includes all five destinations in order with /dojo as the 5th tab", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/runway",
      "/log",
      "/radar",
      "/vault",
      "/dojo",
    ]);
    expect(NAV_ITEMS.map((item) => item.shortName)).toEqual([
      "Runway",
      "Log",
      "Radar",
      "Vault",
      "Dojo",
    ]);
  });

  it("renders all five mobile bottom tabs and marks /dojo active with aria-current=page", () => {
    const mobileHtml = renderToStaticMarkup(React.createElement(MobileBottomNav));
    expect(mobileHtml).toContain('href="/runway"');
    expect(mobileHtml).toContain('href="/log"');
    expect(mobileHtml).toContain('href="/radar"');
    expect(mobileHtml).toContain('href="/vault"');
    expect(mobileHtml).toContain('href="/dojo"');
    expect(mobileHtml).toContain('aria-current="page"');
    expect(mobileHtml).toContain("Dojo");
    expect(mobileHtml).toContain("grid-cols-5");

    const sidebarHtml = renderToStaticMarkup(React.createElement(AppSidebar));
    expect(sidebarHtml).toContain('href="/dojo"');
    expect(sidebarHtml).toContain('aria-current="page"');
  });
});

describe("Phase 5B: Level Node, Briefing, and Phase 5C Handoff", () => {
  const layout = buildDojoSkillMapLayout();

  it("blocks locked levels from launching and prevents briefing rendering", () => {
    const guest = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );
    const level3 = DOJO_LEVELS[2];
    const level3Pos = layout.nodes[2];

    const lockedNodeHtml = renderToStaticMarkup(
      React.createElement(DojoLevelNode, {
        level: level3,
        progress: guest,
        position: level3Pos,
        onSelectLevel: vi.fn(),
      })
    );

    expect(lockedNodeHtml).toContain("disabled");
    expect(lockedNodeHtml).toContain('aria-disabled="true"');
    expect(lockedNodeHtml).toContain("Finish Level 2 to unlock");
    expect(lockedNodeHtml).toContain("WORLD BOSS");

    // Briefing refuses to render for a locked level even if opened
    const lockedBriefingHtml = renderToStaticMarkup(
      React.createElement(DojoLevelBriefing, {
        levelId: 3,
        progress: guest,
        open: true,
        onOpenChange: vi.fn(),
        onStartLesson: vi.fn(),
        onOpenCitation: vi.fn(),
      })
    );
    expect(lockedBriefingHtml).toBe("");
  });

  it("renders active briefing with Start Training and completed briefing with Replay + real accuracy", () => {
    const initial = createInitialDojoProgress();
    const afterL1 = applyDojoLevelCompletion(initial, {
      levelId: 1,
      correctCount: 2,
      totalQuestions: 3,
      localDateKey: "2026-11-26",
      nowIso: "2026-11-26T10:00:00.000Z",
    }).nextProgress;

    const completedNodeHtml = renderToStaticMarkup(
      React.createElement(DojoLevelNode, {
        level: DOJO_LEVELS[0],
        progress: afterL1,
        position: layout.nodes[0],
        completionRecord: afterL1.completedLevels[0],
        onSelectLevel: vi.fn(),
      })
    );
    expect(completedNodeHtml).toContain("67%");
    expect(completedNodeHtml).not.toContain("100%");
    expect(completedNodeHtml).not.toContain('aria-disabled="true"');

    const completedBriefingHtml = renderToStaticMarkup(
      React.createElement(DojoLevelBriefing, {
        levelId: 1,
        progress: afterL1,
        open: true,
        onOpenChange: vi.fn(),
        onStartLesson: vi.fn(),
        onOpenCitation: vi.fn(),
      })
    );
    expect(completedBriefingHtml).toContain("Replay for Mastery");
    expect(completedBriefingHtml).toContain("67%");
    expect(completedBriefingHtml).toContain("Strömbäck, Lind, Skagerlund, Västfjäll &amp; Tinghög (2017)");

    const activeBriefingHtml = renderToStaticMarkup(
      React.createElement(DojoLevelBriefing, {
        levelId: 2,
        progress: afterL1,
        open: true,
        onOpenChange: vi.fn(),
        onStartLesson: vi.fn(),
        onOpenCitation: vi.fn(),
      })
    );
    expect(activeBriefingHtml).toContain("Start Training");
    expect(activeBriefingHtml).toContain("Prelec &amp; Loewenstein (1998)");
  });

  it("renders the Phase 5C lesson handoff dialog with selected level details", () => {
    const html = renderToStaticMarkup(
      React.createElement(DojoLessonHandoffDialog, {
        levelId: 4,
        onClose: vi.fn(),
      })
    );
    expect(html).toContain("Training Room Ready — Phase 5C");
    expect(html).toContain("Level 4");
    expect(html).toContain("The Deal Trap &amp; Broad Brackets");
    expect(html).toContain("Back to Map");
  });

  it("renders all 3 worlds, 8 connectors, and 9 nodes in DojoSkillMap", () => {
    const guest = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );
    const mapHtml = renderToStaticMarkup(
      React.createElement(DojoSkillMap, {
        progress: guest,
        onSelectLevel: vi.fn(),
      })
    );

    expect(mapHtml).toContain("The Impulse Mind");
    expect(mapHtml).toContain("Mental Buckets &amp; Framing");
    expect(mapHtml).toContain("Resilience &amp; Commitment");
    expect(mapHtml).toContain("FINAL BOSS");
    expect(mapHtml).toContain("NEXT DRILL");
    expect(mapHtml.match(/data-connector-state=/g)).toHaveLength(8);
    expect(mapHtml.match(/data-connector-state="upcoming"/g)).toHaveLength(1);
    expect(mapHtml.match(/data-connector-state="locked"/g)).toHaveLength(7);
  });
});

describe("Phase 5B: Trophy Case, Belt Ladder, Header, and Research Library", () => {
  it("highlights the correct belt and reflects exact badge unlock counts from completedLevels", () => {
    const highXpNoCompletion: DojoProgress = {
      ...createInitialDojoProgress(),
      totalXp: 500, // Green Belt XP, but 0 completed levels
    };

    const headerHtml = renderToStaticMarkup(
      React.createElement(DojoHeader, {
        progress: highXpNoCompletion,
        onOpenTrophyCase: vi.fn(),
        onOpenResearchLibrary: vi.fn(),
        onToggleSound: vi.fn(),
      })
    );
    expect(headerHtml).toContain("Green Belt");
    expect(headerHtml).toContain("Friction Architect");
    expect(headerHtml).toContain("0/9");
    expect(headerHtml).toContain("12 Studies");

    const trophyHtml = renderToStaticMarkup(
      React.createElement(DojoTrophyDrawer, {
        progress: highXpNoCompletion,
        open: true,
        onOpenChange: vi.fn(),
      })
    );
    expect(trophyHtml).toContain("0/9 mastery badges unlocked");
    expect(trophyHtml).toContain("Unlock by completing Level 1");
    expect(trophyHtml).toContain('aria-current="step"');

    const blackBelt: DojoProgress = {
      ...createGuestSeededDojoProgress(
        new Date("2026-11-26T12:00:00.000Z"),
        "UTC"
      ),
      totalXp: 1150,
    };
    const maxHeaderHtml = renderToStaticMarkup(
      React.createElement(DojoHeader, {
        progress: blackBelt,
        onOpenTrophyCase: vi.fn(),
        onOpenResearchLibrary: vi.fn(),
        onToggleSound: vi.fn(),
      })
    );
    expect(maxHeaderHtml).toContain("Black Belt");
    expect(maxHeaderHtml).toContain("Golden Egg Master");
    expect(maxHeaderHtml).toContain("Max Rank Achieved");
    expect(maxHeaderHtml).toContain("1/9");
  });

  it("renders single-level citations and the deduplicated 12-study Research Library", () => {
    const levelModalHtml = renderToStaticMarkup(
      React.createElement(DojoCitationModal, {
        target: { mode: "level", levelId: 3 },
        onClose: vi.fn(),
      })
    );
    expect(levelModalHtml).toContain("Ma, Ge, Gu &amp; Ding");
    expect(levelModalHtml).toContain("Liu &amp; Zhang");

    const libraryHtml = renderToStaticMarkup(
      React.createElement(DojoCitationModal, {
        target: { mode: "library" },
        onClose: vi.fn(),
      })
    );
    expect(libraryHtml).toContain("12 verified peer-reviewed");
    expect(libraryHtml).toContain("StopBucks Dojo research curriculum");
    expect(libraryHtml).toContain("David Laibson");
    expect(libraryHtml).toContain("Richard H. Thaler");
  });
});

describe("Phase 5B: Sound Preference Optimistic Persistence & Rollback", () => {
  it("persists soundMuted via repository while preserving all other DojoProgress fields", async () => {
    const repo = new GuestSandboxRepository("UTC");
    const identity = { mode: "guest", userId: "guest-sandbox-user" } as const;
    const queryClient = new QueryClient();
    const initial = await repo.getDojoProgress();
    const key = queryKeys.dojoProgress(identity);
    queryClient.setQueryData(key, initial);

    const options = createDojoSoundMutationOptions({
      queryClient,
      repository: repo,
      cacheIdentity: identity,
    });

    const nextProgress = buildSoundToggledProgress(
      initial,
      true,
      "2026-11-26T14:00:00.000Z"
    );

    const ctx = await options.onMutate(nextProgress);
    expect(queryClient.getQueryData<DojoProgress>(key)?.soundMuted).toBe(true);

    const saved = await options.mutationFn(nextProgress);
    options.onSuccess(saved);
    await options.onSettled();

    const persisted = await repo.getDojoProgress();
    expect(persisted.soundMuted).toBe(true);
    expect(persisted.totalXp).toBe(initial.totalXp);
    expect(persisted.completedLevels).toEqual(initial.completedLevels);
    expect(persisted.unlockedBadges).toEqual(initial.unlockedBadges);
    expect(persisted.currentStreak).toBe(initial.currentStreak);
    expect(persisted.longestStreak).toBe(initial.longestStreak);
    expect(ctx.previousProgress?.soundMuted).toBe(false);
  });

  it("rolls back optimistic cache and invalidates identity query key on persistence failure", async () => {
    const identity = { mode: "authenticated", userId: "user-123" } as const;
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const initial = createInitialDojoProgress("2026-11-26T09:00:00.000Z");
    const key = queryKeys.dojoProgress(identity);
    queryClient.setQueryData(key, initial);

    const failingRepo = {
      saveDojoProgress: vi
        .fn()
        .mockRejectedValue(new Error("Unable to save dojo progress. Please try again.")),
    } as unknown as GuestSandboxRepository;

    const onErrorSpy = vi.fn();
    const options = createDojoSoundMutationOptions({
      queryClient,
      repository: failingRepo,
      cacheIdentity: identity,
      onError: onErrorSpy,
    });

    const optimistic = buildSoundToggledProgress(
      initial,
      true,
      "2026-11-26T10:00:00.000Z"
    );
    const context = await options.onMutate(optimistic);
    expect(queryClient.getQueryData<DojoProgress>(key)?.soundMuted).toBe(true);

    try {
      await options.mutationFn(optimistic);
    } catch (err) {
      options.onError(err, optimistic, context);
    } finally {
      await options.onSettled();
    }

    expect(queryClient.getQueryData<DojoProgress>(key)?.soundMuted).toBe(false);
    expect(onErrorSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key });
  });
});
