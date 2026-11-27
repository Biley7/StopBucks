// @vitest-environment jsdom

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOJO_LEVELS, getDojoLevel } from "@/domain/dojo-curriculum";
import {
  applyDojoLevelCompletion,
  createGuestSeededDojoProgress,
  createInitialDojoProgress,
  getDojoRank,
} from "@/domain/dojo-engine";
import * as dojoEngine from "@/domain/dojo-engine";
import * as dojoMirror from "@/domain/dojo-mirror";
import type {
  DojoLevelId,
  DojoProgress,
  InteractiveSliderMechanicStep,
} from "@/domain/dojo-types";
import { createInitialGuestState } from "@/domain/seed-data";
import { DisplayPreferenceProvider } from "@/lib/display-preference-context";
import { createDojoCompletionMutationOptions } from "@/lib/dojo-progress-mutation";
import { queryKeys } from "@/lib/query-keys";
import {
  __resetSoundEngineForTests,
  playCorrect,
  playMirrorReveal,
  playSliderTick,
  playTap,
  playVictory,
  playWrong,
} from "@/lib/sound-fx";
import { GuestSandboxRepository } from "@/repositories/guest-sandbox.repository";

// Mock Next.js Link & navigation safely in JSDOM
vi.mock("next/navigation", () => ({
  usePathname: () => "/dojo",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

import { DojoLessonArena } from "@/components/dojo/dojo-lesson-arena";
import { BucketSortWidget } from "@/components/dojo/widgets/bucket-sort-widget";
import { FeedbackLoopWidget } from "@/components/dojo/widgets/feedback-loop-widget";
import { ImpulseDuelWidget } from "@/components/dojo/widgets/impulse-duel-widget";
import { InteractiveSliderWidget } from "@/components/dojo/widgets/interactive-slider-widget";
import { LessonFeedbackTray } from "@/components/dojo/widgets/lesson-feedback-tray";
import { LevelClearOverlay } from "@/components/dojo/widgets/level-clear-overlay";
import { MasteryCheckWidget } from "@/components/dojo/widgets/mastery-check-widget";
import { MythBetWidget } from "@/components/dojo/widgets/myth-bet-widget";
import { PersonalMirrorCard } from "@/components/dojo/widgets/personal-mirror-card";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DisplayPreferenceProvider>{ui}</DisplayPreferenceProvider>
    </QueryClientProvider>
  );
}

function createMockWebAudio() {
  const createdOscillators: Array<{
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  }> = [];

  const resumeMock = vi.fn().mockResolvedValue(undefined);
  const closeMock = vi.fn().mockResolvedValue(undefined);

  const ctorSpy = vi.fn().mockImplementation(() => ({
    state: "running",
    currentTime: 0,
    destination: {},
    resume: resumeMock,
    close: closeMock,
    createOscillator: vi.fn(() => {
      const osc = {
        type: "sine",
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      createdOscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
  }));

  return { ctorSpy, createdOscillators, resumeMock, closeMock };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  __resetSoundEngineForTests();
  if (typeof window !== "undefined") {
    localStorage.clear();
    sessionStorage.clear();
  }
});

// ============================================================================
// 14.1 WEB AUDIO SOUND ENGINE TESTS
// ============================================================================

describe("Phase 5C: Web Audio Sound Engine (src/lib/sound-fx.ts)", () => {
  const originalAudioContext = window.AudioContext;
  const originalWebkit = (window as unknown as { webkitAudioContext?: unknown })
    .webkitAudioContext;

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext =
      originalWebkit;
    __resetSoundEngineForTests();
  });

  it("never creates AudioContext or audio nodes when muted", () => {
    const { ctorSpy, createdOscillators } = createMockWebAudio();
    window.AudioContext = ctorSpy as unknown as typeof AudioContext;

    playTap(true);
    playCorrect(true, 3);
    playWrong(true);
    playSliderTick(true);
    playMirrorReveal(true);
    playVictory(true);

    expect(ctorSpy).not.toHaveBeenCalled();
    expect(createdOscillators).toHaveLength(0);
  });

  it("lazily initializes and reuses a single AudioContext across sound effects", () => {
    const { ctorSpy, createdOscillators } = createMockWebAudio();
    window.AudioContext = ctorSpy as unknown as typeof AudioContext;

    playTap(false);
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    expect(createdOscillators).toHaveLength(1);

    playCorrect(false, 2);
    playWrong(false);
    playMirrorReveal(false);
    playVictory(false);

    // Still only 1 shared AudioContext
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    // 1 tap + 2 correct + 2 wrong + 3 mirror + 4 victory = 12 oscillators
    expect(createdOscillators).toHaveLength(12);
  });

  it("throttles rapid playSliderTick calls to prevent audio spam", () => {
    const { ctorSpy, createdOscillators } = createMockWebAudio();
    window.AudioContext = ctorSpy as unknown as typeof AudioContext;

    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1000);
    playSliderTick(false);
    nowSpy.mockReturnValue(1010);
    playSliderTick(false); // within 45ms throttle window -> skipped
    nowSpy.mockReturnValue(1060);
    playSliderTick(false); // outside throttle window -> plays

    expect(createdOscillators).toHaveLength(2);
  });

  it("degrades gracefully when Web Audio is unsupported or throws during initialization", () => {
    // Unsupported browser
    (window as unknown as { AudioContext?: unknown }).AudioContext = undefined;
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext =
      undefined;

    expect(() => {
      playTap(false);
      playCorrect(false, 1);
      playWrong(false);
      playVictory(false);
    }).not.toThrow();

    // Initialization throws (e.g. autoplay block)
    __resetSoundEngineForTests();
    window.AudioContext = vi.fn(() => {
      throw new Error("NotAllowedError");
    }) as unknown as typeof AudioContext;

    expect(() => {
      playTap(false);
      playVictory(false);
    }).not.toThrow();
  });

  it("remains SSR-safe when window is undefined", () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    try {
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        configurable: true,
      });
      expect(() => {
        playTap(false);
        playCorrect(false, 2);
        playWrong(false);
        playSliderTick(false);
        playMirrorReveal(false);
        playVictory(false);
      }).not.toThrow();
    } finally {
      if (windowDescriptor) {
        Object.defineProperty(globalThis, "window", windowDescriptor);
      }
    }
  });
});

// ============================================================================
// 14.2 & 14.5 WIDGET SCORING, MECHANICS & RENDERING TESTS
// ============================================================================

describe("Phase 5C: All Four Mechanics & Interactive Scoring Rules", () => {
  it("scores Research Wager exactly once and reveals empirical comparison bars + citation", () => {
    const level1 = getDojoLevel(1);
    const onAnswer = vi.fn();
    const onComplete = vi.fn();

    renderWithProviders(
      <MythBetWidget
        wager={level1.wager}
        citation={level1.citation}
        muted={true}
        onAnswer={onAnswer}
        onComplete={onComplete}
      />
    );

    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[level1.wager.correctIndex]);
    // Rapid second click must be ignored
    fireEvent.click(radios[1]);

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByText(/Empirical Study Comparison/i)).toBeTruthy();
    expect(screen.getByText("3.61 / 5")).toBeTruthy();
    expect(
      screen.getAllByText(/Strömbäck, Lind, Skagerlund, Västfjäll & Tinghög \(2017\)/i)
        .length
    ).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: /Start Interactive Drill/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("plays through Impulse Duel rounds sequentially and charges Planner Shield", () => {
    const level1 = getDojoLevel(1);
    if (level1.mechanic.kind !== "impulse_duel") throw new Error("Expected impulse_duel");

    const onAnswer = vi.fn();
    const onComplete = vi.fn();

    renderWithProviders(
      <ImpulseDuelWidget
        mechanic={level1.mechanic}
        muted={true}
        onAnswer={onAnswer}
        onComplete={onComplete}
      />
    );

    const rounds = level1.mechanic.rounds!;
    expect(screen.getByText(`Round 1 / ${rounds.length}`)).toBeTruthy();

    // Round 1: deliberative
    const r1DelibIdx = rounds[0].choices.findIndex((c) => c.isDeliberative);
    fireEvent.click(screen.getAllByRole("radio")[r1DelibIdx]);
    expect(onAnswer).toHaveBeenNthCalledWith(1, true);
    fireEvent.click(screen.getByRole("button", { name: /Next Round/i }));

    // Round 2: non-deliberative
    const r2WrongIdx = rounds[1].choices.findIndex((c) => !c.isDeliberative);
    fireEvent.click(screen.getAllByRole("radio")[r2WrongIdx]);
    expect(onAnswer).toHaveBeenNthCalledWith(2, false);
    fireEvent.click(screen.getByRole("button", { name: /Next Round/i }));

    // Round 3: deliberative
    const r3DelibIdx = rounds[2].choices.findIndex((c) => c.isDeliberative);
    fireEvent.click(screen.getAllByRole("radio")[r3DelibIdx]);
    expect(onAnswer).toHaveBeenNthCalledWith(3, true);
    fireEvent.click(screen.getByRole("button", { name: /See Live Wallet Mirror/i }));

    expect(onAnswer).toHaveBeenCalledTimes(3);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("never scores InteractiveSliderWidget movement; scores exactly once on Lock In Target across all 3 presets", () => {
    // 1. Level 2: coupling_meter
    const level2 = getDojoLevel(2);
    if (level2.mechanic.kind !== "interactive_slider") {
      throw new Error("Expected interactive_slider");
    }
    const onAnswerCoupling = vi.fn();
    const onCompleteCoupling = vi.fn();

    renderWithProviders(
      <InteractiveSliderWidget
        mechanic={level2.mechanic}
        muted={true}
        onAnswer={onAnswerCoupling}
        onComplete={onCompleteCoupling}
      />
    );

    const slider2 = screen.getByRole("slider");
    fireEvent.change(slider2, { target: { value: "1" } });
    fireEvent.change(slider2, { target: { value: "0" } });
    // Moving slider must never count as a scored interaction
    expect(onAnswerCoupling).not.toHaveBeenCalled();

    const lockBtn = screen.getByRole("button", { name: /Lock In Target/i });
    fireEvent.click(lockBtn);
    fireEvent.click(lockBtn); // duplicate click ignored
    expect(onAnswerCoupling).toHaveBeenCalledTimes(1);
    expect(onAnswerCoupling).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: /See Live Wallet Mirror/i }));
    expect(onCompleteCoupling).toHaveBeenCalledTimes(1);
    cleanup();

    // 2. Level 9: hyperbolic_beta (check endpoints 0.4 and 1.0 have zero NaN/Infinity)
    const level9 = getDojoLevel(9);
    if (level9.mechanic.kind !== "interactive_slider") {
      throw new Error("Expected interactive_slider");
    }
    const onAnswerBeta = vi.fn();
    const { container } = renderWithProviders(
      <InteractiveSliderWidget
        mechanic={level9.mechanic}
        muted={true}
        onAnswer={onAnswerBeta}
        onComplete={vi.fn()}
      />
    );

    const slider9 = screen.getByRole("slider");
    fireEvent.change(slider9, { target: { value: "0.4" } });
    expect(screen.getByText("29.5%")).toBeTruthy();
    expect(container.innerHTML).not.toContain("NaN");
    expect(container.innerHTML).not.toContain("Infinity");

    fireEvent.change(slider9, { target: { value: "1" } });
    expect(screen.getByText("0%")).toBeTruthy();
    expect(container.innerHTML).not.toContain("NaN");
    expect(onAnswerBeta).not.toHaveBeenCalled();

    // Test floating step precision 0.8 (target min is 0.8)
    fireEvent.change(slider9, { target: { value: "0.8" } });
    fireEvent.click(screen.getByRole("button", { name: /Lock In Target/i }));
    expect(onAnswerBeta).toHaveBeenCalledTimes(1);
    expect(onAnswerBeta).toHaveBeenCalledWith(true);
    cleanup();

    // 3. broad_bracket_zoom preset
    const broadZoomMechanic: InteractiveSliderMechanicStep = {
      kind: "interactive_slider",
      sliderLabel: "Daily Habit Spend",
      min: 10,
      max: 200,
      step: 10,
      defaultValue: 50,
      unit: "₹",
      presetKey: "broad_bracket_zoom",
      challengePrompt: "Zoom out a ₹60/day coffee habit to 4 years.",
      targetRange: { min: 60, max: 60 },
      insightText: "Small daily leaks compound rapidly across 4 years.",
    };
    const onAnswerZoom = vi.fn();
    renderWithProviders(
      <InteractiveSliderWidget
        mechanic={broadZoomMechanic}
        currency="INR"
        muted={true}
        onAnswer={onAnswerZoom}
        onComplete={vi.fn()}
      />
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "60" } });
    expect(screen.getByText("1 Day")).toBeTruthy();
    expect(screen.getByText("1 Month")).toBeTruthy();
    expect(screen.getByText("1 Year")).toBeTruthy();
    expect(screen.getByText("4 Years (8%)")).toBeTruthy();
    expect(onAnswerZoom).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Lock In Target/i }));
    expect(onAnswerZoom).toHaveBeenCalledTimes(1);
    expect(onAnswerZoom).toHaveBeenCalledWith(true);
  });

  it("renders configured Bucket Sort items dynamically (2-bucket & 3-bucket) and scores each once", () => {
    const level6 = getDojoLevel(6);
    if (level6.mechanic.kind !== "bucket_sort") throw new Error("Expected bucket_sort");

    // Verify dynamic length support (5 custom items instead of hardcoded 4)
    const customFiveItems = [
      ...level6.mechanic.items,
      {
        id: "extra-item-5",
        title: "Course Lab Software License",
        subtitle: "Required semester tooling.",
        correctCategoryId: "invest_self",
        feedback: "Protected capability spend.",
      },
    ];

    const onAnswer = vi.fn();
    const onComplete = vi.fn();
    renderWithProviders(
      <BucketSortWidget
        mechanic={{ ...level6.mechanic, items: customFiveItems }}
        muted={true}
        onAnswer={onAnswer}
        onComplete={onComplete}
      />
    );

    expect(screen.getByText("1 / 5")).toBeTruthy();

    customFiveItems.forEach((item, idx) => {
      const targetCategory = level6.mechanic.kind === "bucket_sort"
        ? level6.mechanic.categories.find((c) => c.id === item.correctCategoryId)!
        : null;
      fireEvent.click(screen.getByRole("button", { name: targetCategory!.label }));
      const nextLabel =
        idx === customFiveItems.length - 1 ? /See Live Wallet Mirror/i : /Next Item/i;
      fireEvent.click(screen.getByRole("button", { name: nextLabel }));
    });

    expect(onAnswer).toHaveBeenCalledTimes(5);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("renders Feedback Loop 3-stage stability meter and continues after wrong choices", () => {
    const level7 = getDojoLevel(7);
    if (level7.mechanic.kind !== "feedback_loop") {
      throw new Error("Expected feedback_loop");
    }

    const onAnswer = vi.fn();
    const onComplete = vi.fn();
    renderWithProviders(
      <FeedbackLoopWidget
        mechanic={level7.mechanic}
        muted={true}
        onAnswer={onAnswer}
        onComplete={onComplete}
      />
    );

    expect(screen.getByText("3-Stage Stability Meter")).toBeTruthy();

    // Stage 1: pick suboptimal option -> student must still remain in drill
    const s1WrongIdx = level7.mechanic.steps[0].options.findIndex(
      (o) => !o.isOptimal
    );
    fireEvent.click(screen.getAllByRole("radio")[s1WrongIdx]);
    expect(onAnswer).toHaveBeenNthCalledWith(1, false);
    fireEvent.click(screen.getByRole("button", { name: /Next Stage/i }));

    // Stage 2 & 3: pick optimal
    const s2OptIdx = level7.mechanic.steps[1].options.findIndex((o) => o.isOptimal);
    fireEvent.click(screen.getAllByRole("radio")[s2OptIdx]);
    expect(onAnswer).toHaveBeenNthCalledWith(2, true);
    fireEvent.click(screen.getByRole("button", { name: /Next Stage/i }));

    const s3OptIdx = level7.mechanic.steps[2].options.findIndex((o) => o.isOptimal);
    fireEvent.click(screen.getAllByRole("radio")[s3OptIdx]);
    expect(onAnswer).toHaveBeenNthCalledWith(3, true);
    fireEvent.click(screen.getByRole("button", { name: /See Live Wallet Mirror/i }));

    expect(onAnswer).toHaveBeenCalledTimes(3);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("renders MasteryCheckWidget and LessonFeedbackTray cleanly", () => {
    const level4 = getDojoLevel(4);
    const onAnswer = vi.fn();
    const onComplete = vi.fn();

    renderWithProviders(
      <MasteryCheckWidget
        questions={level4.masteryQuestions}
        muted={true}
        onAnswer={onAnswer}
        onComplete={onComplete}
      />
    );

    level4.masteryQuestions.forEach((q, idx) => {
      expect(
        screen.getByText(`Question ${idx + 1} / ${level4.masteryQuestions.length}`)
      ).toBeTruthy();
      fireEvent.click(screen.getAllByRole("radio")[q.correctIndex]);
      const btnLabel =
        idx === level4.masteryQuestions.length - 1
          ? /Complete Drill/i
          : /Next Question/i;
      fireEvent.click(screen.getByRole("button", { name: btnLabel }));
    });

    expect(onAnswer).toHaveBeenCalledTimes(level4.masteryQuestions.length);
    expect(onComplete).toHaveBeenCalledTimes(1);

    cleanup();
    const trayContinue = vi.fn();
    render(
      <LessonFeedbackTray
        open={true}
        isCorrect={false}
        headline="Check"
        explanation="Explanation copy"
        onContinue={trayContinue}
      />
    );
    expect(screen.getByText("Review")).toBeTruthy();
    expect(screen.getByText("Explanation copy")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(trayContinue).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// 14.4 PERSONAL DATA MIRROR INTEGRATION TESTS
// ============================================================================

describe("Phase 5C: Live Personal Mirror Integration", () => {
  it("renders live financial mirror formatted with user currency & display preference", () => {
    const refDate = new Date("2026-11-26T12:00:00.000Z");
    const seed = createInitialGuestState(refDate);

    renderWithProviders(
      <PersonalMirrorCard
        levelId={3}
        profile={seed.profile}
        transactions={seed.transactions}
        fixedCommitments={seed.fixedCommitments}
        vaultItems={seed.vaultItems}
        referenceDate={refDate}
        timeZone="UTC"
        muted={true}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText(/YOUR LIVE WALLET MIRROR/i)).toBeTruthy();
    expect(screen.getByText(/Live Ledger Signal/i)).toBeTruthy();
    expect(screen.getByText("Hedonic Spend")).toBeTruthy();
    expect(screen.getAllByText(/₹/).length).toBeGreaterThanOrEqual(2);
  });

  it("handles empty data without guilt and shows starter baseline", () => {
    const refDate = new Date("2026-11-26T12:00:00.000Z");

    renderWithProviders(
      <PersonalMirrorCard
        levelId={1}
        profile={null}
        transactions={[]}
        fixedCommitments={[]}
        vaultItems={[]}
        referenceDate={refDate}
        timeZone="UTC"
        muted={true}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText(/Starter Baseline/i)).toBeTruthy();
    expect(screen.getByText(/No stress if your ledger is fresh/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Review Expense Log/i })).toBeTruthy();
  });

  it("never calls buildDojoPersonalMirror or invents metrics while loading, and offers non-blocking retry on error", () => {
    const mirrorSpy = vi.spyOn(dojoMirror, "buildDojoPersonalMirror");
    const refDate = new Date("2026-11-26T12:00:00.000Z");

    renderWithProviders(
      <PersonalMirrorCard
        levelId={2}
        profile={null}
        transactions={[]}
        fixedCommitments={[]}
        vaultItems={[]}
        referenceDate={refDate}
        timeZone="UTC"
        isLoading={true}
        muted={true}
        onContinue={vi.fn()}
      />
    );

    expect(mirrorSpy).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Loading your live wallet mirror/i)).toBeTruthy();
    cleanup();

    const onRetry = vi.fn();
    const onContinue = vi.fn();
    renderWithProviders(
      <PersonalMirrorCard
        levelId={2}
        profile={null}
        transactions={[]}
        fixedCommitments={[]}
        vaultItems={[]}
        referenceDate={refDate}
        timeZone="UTC"
        isError={true}
        onRetry={onRetry}
        muted={true}
        onContinue={onContinue}
      />
    );

    expect(mirrorSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Personal mirror could not be loaded/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Retry Mirror/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // Still lets student proceed
    fireEvent.click(screen.getByRole("button", { name: /Got It — Test My Mastery/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("respects work_hours display mode and produces no NaN/Infinity across all 9 levels", () => {
    localStorage.setItem("stopbucks_display_unit_mode", "work_hours");
    const refDate = new Date("2026-11-26T12:00:00.000Z");
    const seed = createInitialGuestState(refDate);

    for (let id = 1 as DojoLevelId; id <= 9; id = (id + 1) as DojoLevelId) {
      const { container } = renderWithProviders(
        <PersonalMirrorCard
          levelId={id}
          profile={seed.profile}
          transactions={seed.transactions}
          fixedCommitments={seed.fixedCommitments}
          vaultItems={seed.vaultItems}
          referenceDate={refDate}
          timeZone="Asia/Kolkata"
          muted={true}
          onContinue={vi.fn()}
        />
      );
      expect(container.innerHTML).not.toContain("NaN");
      expect(container.innerHTML).not.toContain("Infinity");
      cleanup();
    }
  });
});

// ============================================================================
// 14.3, 14.6, 14.7 FULL 5-BEAT ARENA, EXACTLY-ONCE COMPLETION, RETRY & NAV
// ============================================================================

async function playThroughLevel2InArena(options: {
  perfect?: boolean;
  progress: DojoProgress;
  onCompleteProgress: (next: DojoProgress) => Promise<DojoProgress | void>;
  onExitToMap?: () => void;
  onStartNextLevel?: (id: DojoLevelId) => void;
  strictMode?: boolean;
}) {
  const level2 = getDojoLevel(2);
  const perfect = options.perfect ?? true;
  const seed = createInitialGuestState(new Date("2026-11-26T12:00:00.000Z"));

  const arenaElement = (
    <DojoLessonArena
      levelId={2}
      progress={options.progress}
      profile={seed.profile}
      transactions={seed.transactions}
      fixedCommitments={seed.fixedCommitments}
      vaultItems={seed.vaultItems}
      onToggleMute={vi.fn()}
      onCompleteProgress={options.onCompleteProgress}
      onExitToMap={options.onExitToMap ?? vi.fn()}
      onStartNextLevel={options.onStartNextLevel ?? vi.fn()}
    />
  );

  renderWithProviders(
    options.strictMode ? (
      <React.StrictMode>{arenaElement}</React.StrictMode>
    ) : (
      arenaElement
    )
  );

  // Beat 1: Research Wager
  const wagerOptionIdx = perfect
    ? level2.wager.correctIndex
    : (level2.wager.correctIndex + 1) % level2.wager.options.length;
  fireEvent.click(screen.getAllByRole("radio")[wagerOptionIdx]);
  fireEvent.click(screen.getByRole("button", { name: /Start Interactive Drill/i }));

  // Beat 2: Interactive Slider (coupling_meter)
  fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: /Lock In Target/i }));
  fireEvent.click(screen.getByRole("button", { name: /See Live Wallet Mirror/i }));

  // Beat 3: Personal Mirror
  expect(screen.getByText(/YOUR LIVE WALLET MIRROR/i)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Got It — Test My Mastery/i }));

  // Beat 4: Mastery Check (3 questions)
  for (let i = 0; i < level2.masteryQuestions.length; i += 1) {
    const q = level2.masteryQuestions[i];
    fireEvent.click(screen.getAllByRole("radio")[q.correctIndex]);
    const label =
      i === level2.masteryQuestions.length - 1
        ? /Complete Drill/i
        : /Next Question/i;
    fireEvent.click(screen.getByRole("button", { name: label }));
  }
}

describe("Phase 5C: Full 5-Beat Arena, Domain Integration, Persistence & Navigation", () => {
  it("completes all 5 beats of Level 2 with real engine XP, badge, belt rank-up, and streak", async () => {
    const repo = new GuestSandboxRepository("UTC");
    const guestInitial = await repo.getDojoProgress();
    const saveSpy = vi.fn(async (next: DojoProgress) => repo.saveDojoProgress(next));
    const onStartNextLevel = vi.fn();

    await playThroughLevel2InArena({
      perfect: true,
      progress: guestInitial,
      onCompleteProgress: saveSpy,
      onStartNextLevel,
      strictMode: true,
    });

    await waitFor(() => {
      expect(screen.getByText(/\+135 XP/)).toBeTruthy();
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("100%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Coupling Decoder")).toBeTruthy();
    expect(screen.getByText(/White Belt → Yellow Belt/)).toBeTruthy();

    const persisted = await repo.getDojoProgress();
    expect(persisted.totalXp).toBe(255); // 120 from L1 + 135 from L2
    expect(persisted.unlockedBadges).toContain("pain_master");
    expect(getDojoRank(persisted.totalXp).belt).toBe("Yellow Belt");

    // Start Level 3 navigation
    fireEvent.click(screen.getByRole("button", { name: /Start Level 3/i }));
    expect(onStartNextLevel).toHaveBeenCalledWith(3);
  });

  it("prevents duplicate XP on replay and displays Replay Complete — Best Score Preserved", async () => {
    const afterL2 = applyDojoLevelCompletion(
      createGuestSeededDojoProgress(new Date("2026-11-26T12:00:00.000Z"), "UTC"),
      {
        levelId: 2,
        correctCount: 5,
        totalQuestions: 5,
        localDateKey: "2026-11-26",
        nowIso: "2026-11-26T12:05:00.000Z",
      }
    ).nextProgress;

    const saveSpy = vi.fn(async (next: DojoProgress) => next);

    await playThroughLevel2InArena({
      perfect: true,
      progress: afterL2,
      onCompleteProgress: saveSpy,
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Replay Complete — Best Score Preserved/i)
      ).toBeTruthy();
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0][0].totalXp).toBe(afterL2.totalXp);
    expect(screen.queryByText(/\+135 XP/)).toBeNull();
    expect(screen.queryByText(/New Mastery Badge Unlocked/i)).toBeNull();
  });

  it("blocks false victory when save fails and retries the exact calculated progress without recomputing XP", async () => {
    const completionSpy = vi.spyOn(dojoEngine, "applyDojoLevelCompletion");
    const guestInitial = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );

    let failNext = true;
    const flakySave = vi.fn(async (next: DojoProgress) => {
      if (failNext) {
        throw new Error("Network timeout");
      }
      return next;
    });

    await playThroughLevel2InArena({
      perfect: true,
      progress: guestInitial,
      onCompleteProgress: flakySave,
    });

    await waitFor(() => {
      expect(screen.getByText(/Could not save your completion yet/i)).toBeTruthy();
    });

    // Must NOT show false victory while failed
    expect(screen.queryByText(/\+135 XP/)).toBeNull();
    expect(completionSpy).toHaveBeenCalledTimes(1);

    // Retry save succeeds without recalculating rewards
    failNext = false;
    fireEvent.click(screen.getByRole("button", { name: /Retry Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/\+135 XP/)).toBeTruthy();
    });

    expect(flakySave).toHaveBeenCalledTimes(2);
    expect(completionSpy).toHaveBeenCalledTimes(1);
    expect(flakySave.mock.calls[1][0]).toEqual(flakySave.mock.calls[0][0]);
  });

  it("shows combo flame at >= 2 streak, resets on wrong answer, and tracks focus shields", () => {
    const guestInitial = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );
    const seed = createInitialGuestState(new Date("2026-11-26T12:00:00.000Z"));
    const level2 = getDojoLevel(2);

    renderWithProviders(
      <DojoLessonArena
        levelId={2}
        progress={guestInitial}
        profile={seed.profile}
        transactions={seed.transactions}
        fixedCommitments={seed.fixedCommitments}
        vaultItems={seed.vaultItems}
        onToggleMute={vi.fn()}
        onCompleteProgress={vi.fn(async (n) => n)}
        onExitToMap={vi.fn()}
        onStartNextLevel={vi.fn()}
      />
    );

    expect(screen.getByLabelText("3 of 3 focus shields intact")).toBeTruthy();

    // Correct wager -> combo 1 (pill not shown until >= 2)
    fireEvent.click(screen.getAllByRole("radio")[level2.wager.correctIndex]);
    expect(screen.queryByText(/Streak/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Start Interactive Drill/i }));

    // Correct slider lock-in -> combo 2 -> pill appears
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Lock In Target/i }));
    expect(screen.getByText("2x Streak")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /See Live Wallet Mirror/i }));
    fireEvent.click(screen.getByRole("button", { name: /Got It — Test My Mastery/i }));

    // Wrong Mastery Q1 -> combo resets, shield drops to 2 of 3
    const q1 = level2.masteryQuestions[0];
    const wrongIdx = (q1.correctIndex + 1) % q1.options.length;
    fireEvent.click(screen.getAllByRole("radio")[wrongIdx]);
    expect(screen.queryByText(/Streak/i)).toBeNull();
    expect(screen.getByLabelText("2 of 3 focus shields intact")).toBeTruthy();
  });

  it("handles mid-lesson exit confirmation, locked level guard, and Level 9 completion without Level 10", () => {
    const initial = createInitialDojoProgress();
    const onExitToMap = vi.fn();

    // 1. Locked level guard
    renderWithProviders(
      <DojoLessonArena
        levelId={5}
        progress={initial}
        profile={null}
        transactions={[]}
        fixedCommitments={[]}
        vaultItems={[]}
        onToggleMute={vi.fn()}
        onCompleteProgress={vi.fn(async (n) => n)}
        onExitToMap={onExitToMap}
        onStartNextLevel={vi.fn()}
      />
    );
    expect(screen.getByText(/Level 5 Is Locked/i)).toBeTruthy();
    cleanup();

    // 2. Immediate exit before answering -> no prompt
    const level1 = getDojoLevel(1);
    renderWithProviders(
      <DojoLessonArena
        levelId={1}
        progress={initial}
        profile={null}
        transactions={[]}
        fixedCommitments={[]}
        vaultItems={[]}
        onToggleMute={vi.fn()}
        onCompleteProgress={vi.fn(async (n) => n)}
        onExitToMap={onExitToMap}
        onStartNextLevel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Exit training arena/i }));
    expect(onExitToMap).toHaveBeenCalledTimes(1);

    // 3. Answer Beat 1 -> exit prompts confirmation -> Keep Training stays, Exit to Map leaves without saving
    onExitToMap.mockClear();
    fireEvent.click(screen.getAllByRole("radio")[level1.wager.correctIndex]);
    fireEvent.click(screen.getByRole("button", { name: /Exit training arena/i }));
    expect(screen.getByText(/Leave this training drill\?/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Keep Training/i }));
    expect(screen.queryByText(/Leave this training drill\?/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Exit training arena/i }));
    fireEvent.click(screen.getByRole("button", { name: /Exit to Map/i }));
    expect(onExitToMap).toHaveBeenCalledTimes(1);
    cleanup();

    // 4. Level 9 Victory overlay never shows Level 10
    const level9 = getDojoLevel(9);
    let progressBefore9 = createInitialDojoProgress();
    for (let id = 1 as DojoLevelId; id <= 8; id = (id + 1) as DojoLevelId) {
      progressBefore9 = applyDojoLevelCompletion(progressBefore9, {
        levelId: id,
        correctCount: 5,
        totalQuestions: 5,
        localDateKey: "2026-11-26",
        nowIso: "2026-11-26T10:00:00.000Z",
      }).nextProgress;
    }
    const prevRank = getDojoRank(progressBefore9.totalXp);
    const l9Result = applyDojoLevelCompletion(progressBefore9, {
      levelId: 9,
      correctCount: 5,
      totalQuestions: 5,
      localDateKey: "2026-11-26",
      nowIso: "2026-11-26T11:00:00.000Z",
    });

    renderWithProviders(
      <LevelClearOverlay
        level={level9}
        completionResult={l9Result}
        previousRank={prevRank}
        nextLevel={null}
        onBackToMap={vi.fn()}
        onStartNextLevel={vi.fn()}
      />
    );

    expect(screen.getByText(/All 9 Dojo Drills Mastered/i)).toBeTruthy();
    expect(screen.getByText(/Curriculum Complete/i)).toBeTruthy();
    expect(screen.queryByText(/Level 10/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Back to Dojo Map/i })).toBeTruthy();
  });

  it("renders every one of the 9 curriculum levels with its matching mechanic without runtime errors", () => {
    let progress = createInitialDojoProgress();
    for (const level of DOJO_LEVELS) {
      renderWithProviders(
        <DojoLessonArena
          levelId={level.id}
          progress={progress}
          profile={null}
          transactions={[]}
          fixedCommitments={[]}
          vaultItems={[]}
          onToggleMute={vi.fn()}
          onCompleteProgress={vi.fn(async (n) => n)}
          onExitToMap={vi.fn()}
          onStartNextLevel={vi.fn()}
        />
      );
      expect(screen.getByText(level.title)).toBeTruthy();
      cleanup();

      progress = applyDojoLevelCompletion(progress, {
        levelId: level.id,
        correctCount: 3,
        totalQuestions: 3,
        localDateKey: "2026-11-26",
        nowIso: "2026-11-26T10:00:00.000Z",
      }).nextProgress;
    }
  });

  it("scopes queryKeys.dojoProgress strictly per authenticated user vs guest", () => {
    const authA = queryKeys.dojoProgress({ mode: "authenticated", userId: "alice" });
    const authB = queryKeys.dojoProgress({ mode: "authenticated", userId: "bob" });
    const guest = queryKeys.dojoProgress({ mode: "guest", userId: "guest-sandbox-user" });

    expect(authA).not.toEqual(authB);
    expect(authA).not.toEqual(guest);
  });

  it("keeps a stable referenceDate across Arena rerenders during Beat 3 Personal Mirror", () => {
    const mirrorSpy = vi.spyOn(dojoMirror, "buildDojoPersonalMirror");
    const guestInitial = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );
    const seed = createInitialGuestState(new Date("2026-11-26T12:00:00.000Z"));
    const level2 = getDojoLevel(2);

    const { rerender } = renderWithProviders(
      <DojoLessonArena
        levelId={2}
        progress={guestInitial}
        profile={seed.profile}
        transactions={seed.transactions}
        fixedCommitments={seed.fixedCommitments}
        vaultItems={seed.vaultItems}
        onToggleMute={vi.fn()}
        onCompleteProgress={vi.fn(async (n) => n)}
        onExitToMap={vi.fn()}
        onStartNextLevel={vi.fn()}
      />
    );

    // Advance to Beat 3
    fireEvent.click(screen.getAllByRole("radio")[level2.wager.correctIndex]);
    fireEvent.click(screen.getByRole("button", { name: /Start Interactive Drill/i }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Lock In Target/i }));
    fireEvent.click(screen.getByRole("button", { name: /See Live Wallet Mirror/i }));

    expect(mirrorSpy).toHaveBeenCalledTimes(1);
    const firstRefDate = mirrorSpy.mock.calls[0][1].referenceDate;

    // Trigger rerender with toggled mute prop
    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <DisplayPreferenceProvider>
          <DojoLessonArena
            levelId={2}
            progress={{ ...guestInitial, soundMuted: true }}
            profile={seed.profile}
            transactions={seed.transactions}
            fixedCommitments={seed.fixedCommitments}
            vaultItems={seed.vaultItems}
            onToggleMute={vi.fn()}
            onCompleteProgress={vi.fn(async (n) => n)}
            onExitToMap={vi.fn()}
            onStartNextLevel={vi.fn()}
          />
        </DisplayPreferenceProvider>
      </QueryClientProvider>
    );

    // Same stable referenceDate preserved across rerenders
    expect(mirrorSpy).toHaveBeenCalledTimes(1);
    expect(mirrorSpy.mock.calls[0][1].referenceDate).toBe(firstRefDate);
  });

  it("toggles sound preference via Arena HUD button with accessible aria-pressed", () => {
    const guestInitial = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );
    const onToggleMute = vi.fn();

    renderWithProviders(
      <DojoLessonArena
        levelId={2}
        progress={guestInitial}
        profile={null}
        transactions={[]}
        fixedCommitments={[]}
        vaultItems={[]}
        onToggleMute={onToggleMute}
        onCompleteProgress={vi.fn(async (n) => n)}
        onExitToMap={vi.fn()}
        onStartNextLevel={vi.fn()}
      />
    );

    const muteBtn = screen.getByRole("button", {
      name: /Mute Dojo sound effects/i,
    });
    expect(muteBtn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(muteBtn);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("invalidates identity-scoped dojoProgress cache on completion save and leaves other identities untouched", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const authIdentity = { mode: "authenticated", userId: "user-auth-1" } as const;
    const otherIdentity = { mode: "authenticated", userId: "user-auth-2" } as const;

    const initial = createInitialDojoProgress("2026-11-26T09:00:00.000Z");
    const completed = applyDojoLevelCompletion(initial, {
      levelId: 1,
      correctCount: 7,
      totalQuestions: 7,
      localDateKey: "2026-11-26",
      nowIso: "2026-11-26T10:00:00.000Z",
    }).nextProgress;

    const saveDojoProgress = vi.fn(async (next: DojoProgress) => next);
    const mockRepo = { saveDojoProgress } as unknown as GuestSandboxRepository;

    const options = createDojoCompletionMutationOptions({
      queryClient,
      repository: mockRepo,
      cacheIdentity: authIdentity,
    });

    const saved = await options.mutationFn(completed);
    await options.onSuccess(saved);

    expect(saveDojoProgress).toHaveBeenCalledWith(completed);
    expect(queryClient.getQueryData(queryKeys.dojoProgress(authIdentity))).toEqual(
      completed
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.dojoProgress(authIdentity),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.dojoProgress(otherIdentity),
    });
  });
});

describe("Phase 5D: Training Arena Ergonomics, Keyboard Navigation & Level 9 Integration", () => {
  it("provides mobile bottom padding and safe-area docked feedback tray without obscuring controls", () => {
    const guestInitial = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );
    const level2 = getDojoLevel(2);

    const { container } = renderWithProviders(
      <DojoLessonArena
        levelId={2}
        progress={guestInitial}
        profile={null}
        transactions={[]}
        fixedCommitments={[]}
        vaultItems={[]}
        onToggleMute={vi.fn()}
        onCompleteProgress={vi.fn(async (n) => n)}
        onExitToMap={vi.fn()}
        onStartNextLevel={vi.fn()}
      />
    );

    const mainStage = container.querySelector("main");
    expect(mainStage?.className).toContain("overflow-y-auto");
    expect(mainStage?.className).toContain("overflow-x-hidden");
    expect(mainStage?.className).toContain("min-h-0");

    fireEvent.click(screen.getAllByRole("radio")[level2.wager.correctIndex]);
    const tray = container.querySelector('[data-dojo-feedback-tray="true"]');
    expect(tray).toBeTruthy();
    expect(tray?.className).toContain("shrink-0");
    expect(tray?.className).toContain("safe-area-inset-bottom");
    expect(mainStage?.className).toContain("pb-12");
  });

  it("activates Continue on Enter when feedback is open without resubmitting or double-advancing", () => {
    const guestInitial = createGuestSeededDojoProgress(
      new Date("2026-11-26T12:00:00.000Z"),
      "UTC"
    );
    const level2 = getDojoLevel(2);
    const onToggleMute = vi.fn();

    renderWithProviders(
      <DojoLessonArena
        levelId={2}
        progress={guestInitial}
        profile={null}
        transactions={[]}
        fixedCommitments={[]}
        vaultItems={[]}
        onToggleMute={onToggleMute}
        onCompleteProgress={vi.fn(async (n) => n)}
        onExitToMap={vi.fn()}
        onStartNextLevel={vi.fn()}
      />
    );

    // Enter while feedback tray is closed does nothing
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText(/Beat 1 · Research Wager/i)).toBeTruthy();

    // Select Beat 1 answer -> tray opens
    const firstRadio = screen.getAllByRole("radio")[level2.wager.correctIndex];
    fireEvent.click(firstRadio);
    expect(screen.getByText("1/1 Correct")).toBeTruthy();

    // Pressing Enter inside an unrelated editable input must be ignored
    const tempInput = document.createElement("input");
    tempInput.type = "text";
    const arenaEl = screen.getByRole("dialog", { name: /Training Arena: Level 2/i });
    arenaEl.appendChild(tempInput);
    fireEvent.keyDown(tempInput, { key: "Enter" });
    expect(screen.getByText(/Beat 1 · Research Wager/i)).toBeTruthy();
    tempInput.remove();

    // Pressing Enter while focused on Mute button must NOT advance Continue
    const muteBtn = screen.getByRole("button", { name: /Mute Dojo sound effects/i });
    fireEvent.keyDown(muteBtn, { key: "Enter" });
    expect(screen.getByText(/Beat 1 · Research Wager/i)).toBeTruthy();

    // Pressing Enter on Continue or disabled radio advances once to Beat 2 without double-transitioning
    const continueBtn = screen.getByRole("button", {
      name: /Start Interactive Drill/i,
    });
    fireEvent.keyDown(continueBtn, { key: "Enter" });
    fireEvent.keyDown(window, { key: "Enter" }); // Rapid second Enter must be a no-op because next tray isn't open

    expect(screen.getByText(/Beat 2 · Interactive Model Lab/i)).toBeTruthy();
    // Score stayed 1/1 (not resubmitted)
    expect(screen.getByText("1/1 Correct")).toBeTruthy();
  });

  it("handles Escape cleanly with focus management and respects external Radix Dialogs", () => {
    const initial = createInitialDojoProgress();
    const level1 = getDojoLevel(1);
    const onExitToMap = vi.fn();

    // 1. No meaningful progress yet -> Escape exits immediately
    renderWithProviders(
      <DojoLessonArena
        levelId={1}
        progress={initial}
        profile={null}
        transactions={[]}
        fixedCommitments={[]}
        vaultItems={[]}
        onToggleMute={vi.fn()}
        onCompleteProgress={vi.fn(async (n) => n)}
        onExitToMap={onExitToMap}
        onStartNextLevel={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onExitToMap).toHaveBeenCalledTimes(1);
    onExitToMap.mockClear();

    // 2. Answer Beat 1 -> Escape opens exit confirmation and focuses Keep Training
    fireEvent.click(screen.getAllByRole("radio")[level1.wager.correctIndex]);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onExitToMap).not.toHaveBeenCalled();
    expect(screen.getByText(/Leave this training drill\?/i)).toBeTruthy();
    const keepBtn = screen.getByRole("button", { name: /Keep Training/i });
    expect(document.activeElement).toBe(keepBtn);

    // 3. Pressing Escape again closes ONLY the exit confirmation and restores focus to Exit button
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText(/Leave this training drill\?/i)).toBeNull();
    expect(onExitToMap).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /Exit training arena/i })
    );

    // 4. When an external dialog (e.g. Radix Dialog) is present, Arena Escape stays dormant
    const externalDialog = document.createElement("div");
    externalDialog.setAttribute("role", "dialog");
    document.body.appendChild(externalDialog);
    try {
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByText(/Leave this training drill\?/i)).toBeNull();
      expect(onExitToMap).not.toHaveBeenCalled();
    } finally {
      externalDialog.remove();
    }
  });

  it("completes Level 9 end-to-end in the Arena, persists final progress, and never renders Level 10", async () => {
    const repo = new GuestSandboxRepository("UTC");
    let progress = await repo.getDojoProgress();
    for (let id = 2 as DojoLevelId; id <= 8; id = (id + 1) as DojoLevelId) {
      progress = applyDojoLevelCompletion(progress, {
        levelId: id,
        correctCount: 5,
        totalQuestions: 5,
        localDateKey: "2026-11-26",
        nowIso: "2026-11-26T10:00:00.000Z",
      }).nextProgress;
    }
    await repo.saveDojoProgress(progress);

    const level9 = getDojoLevel(9);
    const seed = createInitialGuestState(new Date("2026-11-26T12:00:00.000Z"));
    const saveSpy = vi.fn(async (next: DojoProgress) => repo.saveDojoProgress(next));
    const onExitToMap = vi.fn();

    renderWithProviders(
      <DojoLessonArena
        levelId={9}
        progress={progress}
        profile={seed.profile}
        transactions={seed.transactions}
        fixedCommitments={seed.fixedCommitments}
        vaultItems={seed.vaultItems}
        onToggleMute={vi.fn()}
        onCompleteProgress={saveSpy}
        onExitToMap={onExitToMap}
        onStartNextLevel={vi.fn()}
      />
    );

    // Beat 1: Research Wager
    fireEvent.click(screen.getAllByRole("radio")[level9.wager.correctIndex]);
    fireEvent.click(screen.getByRole("button", { name: /Start Interactive Drill/i }));

    // Beat 2: Laibson hyperbolic_beta slider (target 0.8..1.0)
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.8" } });
    fireEvent.click(screen.getByRole("button", { name: /Lock In Target/i }));
    fireEvent.click(screen.getByRole("button", { name: /See Live Wallet Mirror/i }));

    // Beat 3: Personal Mirror
    expect(screen.getByText(/YOUR LIVE WALLET MIRROR/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Got It — Test My Mastery/i }));

    // Beat 4: Mastery Check (3 questions)
    for (let i = 0; i < level9.masteryQuestions.length; i += 1) {
      const q = level9.masteryQuestions[i];
      fireEvent.click(screen.getAllByRole("radio")[q.correctIndex]);
      const label =
        i === level9.masteryQuestions.length - 1
          ? /Complete Drill/i
          : /Next Question/i;
      fireEvent.click(screen.getByRole("button", { name: label }));
    }

    await waitFor(() => {
      expect(screen.getByText(/All 9 Dojo Drills Mastered/i)).toBeTruthy();
      expect(screen.getByText(/\+240 XP/)).toBeTruthy();
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Curriculum Complete/i)).toBeTruthy();
    expect(screen.queryByText(/Start Level 10/i)).toBeNull();

    const persisted = await repo.getDojoProgress();
    expect(persisted.completedLevels).toHaveLength(9);
    expect(persisted.unlockedBadges).toContain("golden_egg_crown");

    fireEvent.click(screen.getByRole("button", { name: /Back to Dojo Map/i }));
    expect(onExitToMap).toHaveBeenCalledTimes(1);
  });
});
