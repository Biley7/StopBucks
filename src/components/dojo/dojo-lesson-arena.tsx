"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Flame,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { getDojoLevel, getDojoWorld } from "@/domain/dojo-curriculum";
import {
  applyDojoLevelCompletion,
  formatLocalDateKey,
  getDojoRank,
  getLevelStatus,
} from "@/domain/dojo-engine";
import type {
  DojoLevelCompletionResult,
  DojoLevelId,
  DojoProgress,
  DojoRankInfo,
} from "@/domain/dojo-types";
import type {
  FixedCommitment,
  Transaction,
  UserProfile,
  VaultItem,
} from "@/domain/types";
import { playTap, playVictory } from "@/lib/sound-fx";
import { getClientTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DOJO_WORLD_STYLES } from "./dojo-theme";
import { BucketSortWidget } from "./widgets/bucket-sort-widget";
import { FeedbackLoopWidget } from "./widgets/feedback-loop-widget";
import { ImpulseDuelWidget } from "./widgets/impulse-duel-widget";
import { InteractiveSliderWidget } from "./widgets/interactive-slider-widget";
import {
  LessonFeedbackTray,
  type LessonFeedbackState,
} from "./widgets/lesson-feedback-tray";
import { LevelClearOverlay } from "./widgets/level-clear-overlay";
import { MasteryCheckWidget } from "./widgets/mastery-check-widget";
import { MythBetWidget } from "./widgets/myth-bet-widget";
import { PersonalMirrorCard } from "./widgets/personal-mirror-card";

export type DojoArenaBeat =
  | "wager"
  | "mechanic"
  | "mirror"
  | "mastery"
  | "victory";

const BEAT_ORDER: readonly DojoArenaBeat[] = [
  "wager",
  "mechanic",
  "mirror",
  "mastery",
  "victory",
] as const;

const BEAT_LABELS: Record<DojoArenaBeat, string> = {
  wager: "Research Wager",
  mechanic: "Concept Drill",
  mirror: "Live Mirror",
  mastery: "Mastery Check",
  victory: "Level Clear",
};

const MAX_FOCUS_SHIELDS = 3;

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName;
  if (tagName === "TEXTAREA" || tagName === "SELECT") return true;
  if (tagName === "INPUT") {
    const inputType = (target as HTMLInputElement).type?.toLowerCase();
    return inputType !== "button" && inputType !== "submit" && inputType !== "reset";
  }
  return false;
}

function hasBlockingExternalDialog(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector('[role="dialog"]:not([data-dojo-arena="true"])') !== null;
}

export interface DojoLessonArenaProps {
  levelId: DojoLevelId;
  progress: DojoProgress;
  profile: UserProfile | null;
  transactions: Transaction[];
  fixedCommitments: FixedCommitment[];
  vaultItems: VaultItem[];
  isMirrorLoading?: boolean;
  isMirrorError?: boolean;
  onRetryMirror?: () => void;
  onToggleMute: () => void;
  isSavingMute?: boolean;
  onCompleteProgress: (
    nextProgress: DojoProgress
  ) => Promise<DojoProgress | void>;
  onExitToMap: () => void;
  onStartNextLevel: (nextLevelId: DojoLevelId) => void;
}

type CompletionLifecycle =
  | { status: "idle" }
  | {
      status: "saving" | "saved" | "error";
      result: DojoLevelCompletionResult;
      previousRank: DojoRankInfo;
      errorMessage?: string;
    };

export function DojoLessonArena({
  levelId,
  progress,
  profile,
  transactions,
  fixedCommitments,
  vaultItems,
  isMirrorLoading = false,
  isMirrorError = false,
  onRetryMirror,
  onToggleMute,
  isSavingMute = false,
  onCompleteProgress,
  onExitToMap,
  onStartNextLevel,
}: DojoLessonArenaProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const level = useMemo(() => getDojoLevel(levelId), [levelId]);
  const world = useMemo(() => getDojoWorld(level.worldId), [level.worldId]);
  const worldStyle = DOJO_WORLD_STYLES[world.id];

  // Lock check captured on mount of this attempt so completion of active -> completed doesn't flicker
  const [initialLocked] = useState(
    () => getLevelStatus(levelId, progress) === "locked"
  );

  // Stable reference date and timezone for the entire lesson attempt
  const [referenceDate] = useState(() => new Date());
  const timeZone = useMemo(() => getClientTimeZone(), []);

  const [beat, setBeat] = useState<DojoArenaBeat>("wager");
  const [score, setScore] = useState({ correctCount: 0, totalQuestions: 0 });
  const scoreRef = useRef({ correctCount: 0, totalQuestions: 0 });

  const [combo, setCombo] = useState(0);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [feedbackState, setFeedbackState] =
    useState<LessonFeedbackState | null>(null);
  const [completion, setCompletion] = useState<CompletionLifecycle>({
    status: "idle",
  });

  const completionComputedRef = useRef(false);
  const savingInFlightRef = useRef(false);
  const victorySoundPlayedRef = useRef(false);
  const mutedRef = useRef(progress.soundMuted);
  const arenaDialogRef = useRef<HTMLDivElement | null>(null);
  const exitButtonRef = useRef<HTMLButtonElement | null>(null);
  const keepTrainingButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevConfirmOpenRef = useRef(false);
  const lastContinuedFeedbackRef = useRef<LessonFeedbackState | null>(null);

  useEffect(() => {
    mutedRef.current = progress.soundMuted;
  }, [progress.soundMuted]);

  // Reset one-shot continue guard when feedback tray closes or changes
  useEffect(() => {
    if (!feedbackState?.open) {
      lastContinuedFeedbackRef.current = null;
    }
  }, [feedbackState]);

  // Focus container on arena launch for accessible keyboard navigation
  useEffect(() => {
    arenaDialogRef.current?.focus();
  }, []);

  // Manage focus cleanly when the exit confirmation dialog opens and closes
  useEffect(() => {
    if (confirmExitOpen) {
      keepTrainingButtonRef.current?.focus();
    } else if (prevConfirmOpenRef.current) {
      exitButtonRef.current?.focus();
    }
    prevConfirmOpenRef.current = confirmExitOpen;
  }, [confirmExitOpen]);

  const wrongCount = score.totalQuestions - score.correctCount;
  const remainingShields = Math.max(0, MAX_FOCUS_SHIELDS - wrongCount);
  const currentBeatIndex = BEAT_ORDER.indexOf(beat);

  const triggerFeedbackContinue = useCallback(() => {
    if (!feedbackState?.open) return;
    if (lastContinuedFeedbackRef.current === feedbackState) return;
    lastContinuedFeedbackRef.current = feedbackState;
    feedbackState.onContinue();
  }, [feedbackState]);

  const handleRequestExit = useCallback(() => {
    const hasMeaningfulProgress =
      beat !== "victory" &&
      (scoreRef.current.totalQuestions > 0 || beat !== "wager");

    if (hasMeaningfulProgress) {
      setConfirmExitOpen(true);
    } else {
      onExitToMap();
    }
  }, [beat, onExitToMap]);

  // Scoped Arena keyboard ergonomics: Escape (exit/close confirm) and Enter (Continue when feedback tray is open)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (hasBlockingExternalDialog()) return;

      const target = event.target;
      const isExternalElement =
        target instanceof Element &&
        target !== document.body &&
        target !== document.documentElement &&
        !arenaDialogRef.current?.contains(target);

      if (isExternalElement) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (confirmExitOpen) {
          setConfirmExitOpen(false);
        } else {
          handleRequestExit();
        }
        return;
      }

      if (
        event.key === "Enter" &&
        feedbackState?.open &&
        !confirmExitOpen &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        if (isEditableKeyboardTarget(target)) return;

        if (target instanceof HTMLElement) {
          const interactive = target.closest(
            'button, a[href], [role="button"], [role="link"]'
          );
          if (interactive instanceof HTMLElement) {
            const isDisabled =
              interactive.hasAttribute("disabled") ||
              interactive.getAttribute("aria-disabled") === "true";
            const isContinueButton = interactive.hasAttribute("data-dojo-continue");
            // Preserve native Enter behavior on other enabled controls (e.g. Mute, Exit)
            if (!isDisabled && !isContinueButton) {
              return;
            }
          }
        }

        event.preventDefault();
        event.stopPropagation();
        triggerFeedbackContinue();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    confirmExitOpen,
    feedbackState,
    handleRequestExit,
    triggerFeedbackContinue,
  ]);

  const handleScoredAnswer = useCallback((isCorrect: boolean) => {
    const nextTotal = scoreRef.current.totalQuestions + 1;
    const nextCorrect = scoreRef.current.correctCount + (isCorrect ? 1 : 0);
    scoreRef.current = {
      correctCount: nextCorrect,
      totalQuestions: nextTotal,
    };
    setScore({ correctCount: nextCorrect, totalQuestions: nextTotal });
    setCombo((prev) => (isCorrect ? prev + 1 : 0));
  }, []);

  const persistProgress = useCallback(
    async (nextProgress: DojoProgress) => {
      if (savingInFlightRef.current) return;
      savingInFlightRef.current = true;

      setCompletion((prev) =>
        prev.status === "idle"
          ? prev
          : { ...prev, status: "saving", errorMessage: undefined }
      );

      try {
        await onCompleteProgress(nextProgress);
        setCompletion((prev) =>
          prev.status === "idle"
            ? prev
            : { ...prev, status: "saved", errorMessage: undefined }
        );
        if (!victorySoundPlayedRef.current) {
          victorySoundPlayedRef.current = true;
          playVictory(mutedRef.current);
        }
      } catch (err) {
        const message =
          err instanceof Error && err.message.trim().length > 0
            ? err.message
            : "We could not save your lesson completion. Please retry.";
        setCompletion((prev) =>
          prev.status === "idle"
            ? prev
            : { ...prev, status: "error", errorMessage: message }
        );
      } finally {
        savingInFlightRef.current = false;
      }
    },
    [onCompleteProgress]
  );

  const finalizeLesson = useCallback(() => {
    setFeedbackState(null);
    setBeat("victory");

    // Strictly guard against React Strict Mode double execution or duplicate clicks
    if (completionComputedRef.current) {
      return;
    }
    completionComputedRef.current = true;

    const { correctCount, totalQuestions } = scoreRef.current;
    const safeTotal = Math.max(1, totalQuestions);
    const safeCorrect = Math.min(safeTotal, Math.max(0, correctCount));
    const completedAt = new Date();
    const localDateKey = formatLocalDateKey(completedAt, timeZone);
    const previousRank = getDojoRank(progress.totalXp);

    const result = applyDojoLevelCompletion(progress, {
      levelId: level.id,
      correctCount: safeCorrect,
      totalQuestions: safeTotal,
      localDateKey,
      nowIso: completedAt.toISOString(),
    });

    setCompletion({
      status: "saving",
      result,
      previousRank,
    });

    void persistProgress(result.nextProgress);
  }, [level.id, persistProgress, progress, timeZone]);

  const nextLevel = useMemo(() => {
    if (level.id >= 9 || completion.status !== "saved") {
      return null;
    }
    const nextId = (level.id + 1) as DojoLevelId;
    const nextDef = getDojoLevel(nextId);
    const nextStatus = getLevelStatus(nextId, completion.result.nextProgress);
    return {
      id: nextId,
      title: nextDef.title,
      isUnlocked: nextStatus !== "locked",
    };
  }, [level.id, completion]);

  const handleToggleSoundClick = () => {
    if (isSavingMute) return;
    const willBeMuted = !progress.soundMuted;
    if (!willBeMuted) {
      playTap(false);
    }
    onToggleMute();
  };

  if (initialLocked) {
    return (
      <div
        ref={arenaDialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Level ${level.id} locked`}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 outline-none"
      >
        <Card className="w-full max-w-md border-slate-200 bg-white">
          <CardContent className="space-y-4 p-6 text-center">
            <h2 className="text-lg font-bold text-slate-900">
              Level {level.id} Is Locked
            </h2>
            <p className="text-sm text-slate-600">
              Complete Level {Math.max(1, level.id - 1)} first to unlock{" "}
              <strong>{level.title}</strong>.
            </p>
            <Button
              type="button"
              onClick={onExitToMap}
              className="gap-2 bg-sky-600 text-white hover:bg-sky-500"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back to Dojo Map</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={arenaDialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      data-dojo-arena="true"
      aria-label={`StopBucks Dojo Training Arena: Level ${level.id} — ${level.title}`}
      className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900 outline-none"
    >
      {/* Top Sticky Arena HUD */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 sm:gap-4">
          {/* Exit Control */}
          <Button
            ref={exitButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRequestExit}
            aria-label="Exit training arena"
            className="h-9 w-9 shrink-0 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>

          {/* Segmented 5-Beat Progress Bar */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
              <span className="truncate text-slate-700">
                L{level.id} · {BEAT_LABELS[beat]}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500">
                Beat {currentBeatIndex + 1}/5
              </span>
            </div>

            <div
              className="grid grid-cols-5 gap-1"
              role="progressbar"
              aria-label="Lesson beat progress"
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={currentBeatIndex + 1}
              aria-valuetext={`Beat ${currentBeatIndex + 1} of 5: ${BEAT_LABELS[beat]}`}
            >
              {BEAT_ORDER.map((beatKey, index) => {
                const isDone = index < currentBeatIndex || beat === "victory";
                const isCurrent = index === currentBeatIndex && beat !== "victory";

                return (
                  <div
                    key={beatKey}
                    className="h-2 overflow-hidden rounded-full bg-slate-200"
                  >
                    <motion.div
                      initial={false}
                      animate={{
                        width: isDone || isCurrent ? "100%" : "0%",
                      }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 260, damping: 28 }
                      }
                      className={cn(
                        "h-full rounded-full",
                        isDone
                          ? "bg-emerald-500"
                          : isCurrent
                            ? "bg-sky-600"
                            : "bg-transparent"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right HUD: Combo Flame + 3 Focus Shields + Sound Toggle */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2.5">
            {combo >= 2 && (
              <motion.div
                key="combo-pill"
                initial={
                  shouldReduceMotion ? false : { scale: 0.75, opacity: 0 }
                }
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 360, damping: 20 }
                }
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-amber-800 sm:px-2 sm:py-1 sm:text-[11px]"
              >
                <Flame className="h-3 w-3 text-amber-600 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                <span>{combo}x Streak</span>
              </motion.div>
            )}

            {/* Three Focus Shields */}
            <motion.div
              key={wrongCount}
              animate={
                !shouldReduceMotion && wrongCount > 0
                  ? { x: [0, -4, 4, -2, 2, 0] }
                  : undefined
              }
              transition={{ duration: 0.3 }}
              aria-label={`${remainingShields} of ${MAX_FOCUS_SHIELDS} focus shields intact`}
              className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-1 sm:px-2"
            >
              {Array.from({ length: MAX_FOCUS_SHIELDS }).map((_, idx) => {
                const isIntact = idx < remainingShields;
                return isIntact ? (
                  <Shield
                    key={idx}
                    data-shield-intact="true"
                    className="h-3.5 w-3.5 fill-emerald-100 text-emerald-600 sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                ) : (
                  <ShieldAlert
                    key={idx}
                    data-shield-intact="false"
                    className="h-3.5 w-3.5 text-slate-300 sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                );
              })}
            </motion.div>

            {/* Persisted Sound Toggle */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isSavingMute}
              onClick={handleToggleSoundClick}
              aria-pressed={progress.soundMuted}
              aria-label={
                progress.soundMuted
                  ? "Unmute Dojo sound effects"
                  : "Mute Dojo sound effects"
              }
              className={cn(
                "h-9 w-9 shrink-0 rounded-full border-slate-200",
                progress.soundMuted && "bg-slate-100 text-slate-500"
              )}
            >
              {progress.soundMuted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4 text-sky-600" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Lesson Stage */}
      <main
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 sm:px-6 sm:pt-8",
          feedbackState?.open
            ? "pb-12 sm:pb-12"
            : "pb-[max(3rem,calc(env(safe-area-inset-bottom)+2rem))] sm:pb-12"
        )}
      >
        <div className="mx-auto w-full max-w-2xl space-y-5">
          {/* Compact Level Title Subheader on Active Beats */}
          {beat !== "victory" && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      worldStyle.worldPillClass
                    )}
                  >
                    World {world.worldNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Level {level.id}
                  </span>
                </div>
                <h1 className="mt-1 truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                  {level.title}
                </h1>
              </div>

              {score.totalQuestions > 0 && (
                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700">
                  {score.correctCount}/{score.totalQuestions} Correct
                </span>
              )}
            </div>
          )}

          {/* Beat 1: Research Wager */}
          {beat === "wager" && (
            <MythBetWidget
              wager={level.wager}
              citation={level.citation}
              muted={progress.soundMuted}
              combo={combo}
              onAnswer={handleScoredAnswer}
              onRevealChange={setFeedbackState}
              onComplete={() => {
                setFeedbackState(null);
                setBeat("mechanic");
              }}
            />
          )}

          {/* Beat 2: Interactive Concept Mechanic (strictly from level.mechanic.kind) */}
          {beat === "mechanic" && (
            <MechanicDispatcher
              level={level}
              profile={profile}
              muted={progress.soundMuted}
              combo={combo}
              onAnswer={handleScoredAnswer}
              onRevealChange={setFeedbackState}
              onComplete={() => {
                setFeedbackState(null);
                setBeat("mirror");
              }}
            />
          )}

          {/* Beat 3: Live Personal Data Mirror */}
          {beat === "mirror" && (
            <PersonalMirrorCard
              levelId={level.id}
              profile={profile}
              transactions={transactions}
              fixedCommitments={fixedCommitments}
              vaultItems={vaultItems}
              referenceDate={referenceDate}
              timeZone={timeZone}
              isLoading={isMirrorLoading}
              isError={isMirrorError}
              onRetry={onRetryMirror}
              muted={progress.soundMuted}
              onContinue={() => setBeat("mastery")}
            />
          )}

          {/* Beat 4: Applied Mastery Check */}
          {beat === "mastery" && (
            <MasteryCheckWidget
              questions={level.masteryQuestions}
              muted={progress.soundMuted}
              combo={combo}
              onAnswer={handleScoredAnswer}
              onRevealChange={setFeedbackState}
              onComplete={finalizeLesson}
            />
          )}

          {/* Beat 5: Saving, Save Error Recovery, or Victory Celebration */}
          {beat === "victory" && completion.status === "saving" && (
            <Card className="border-slate-200 bg-white">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <Loader2
                  className="h-8 w-8 animate-spin text-sky-600"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-slate-900">
                  Recording Mastery Progress...
                </h2>
                <p className="text-xs text-slate-500">
                  Updating your XP, streak, and badge ledger safely.
                </p>
              </CardContent>
            </Card>
          )}

          {beat === "victory" && completion.status === "error" && (
            <Card className="border-amber-300 bg-white">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <AlertCircle className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900">
                      Could not save your completion yet
                    </h2>
                    <p className="text-xs leading-relaxed text-slate-600">
                      {completion.errorMessage}
                    </p>
                    <p className="text-xs font-medium text-slate-700">
                      Your {completion.result.accuracyPct}% attempt is ready to
                      retry — retrying saves the exact same result without
                      duplicating XP.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onExitToMap}
                    className="border-slate-300"
                  >
                    Back to Dojo Map
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void persistProgress(completion.result.nextProgress)}
                    className="gap-2 border-b-[3px] border-b-sky-800 bg-sky-600 font-bold text-white hover:bg-sky-500"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    <span>Retry Save</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {beat === "victory" && completion.status === "saved" && (
            <LevelClearOverlay
              level={level}
              completionResult={completion.result}
              previousRank={completion.previousRank}
              nextLevel={nextLevel}
              onBackToMap={onExitToMap}
              onStartNextLevel={onStartNextLevel}
            />
          )}

          {/* Extra bottom clearance so choices and buttons scroll comfortably above docked feedback tray */}
          <div className="h-3 shrink-0" aria-hidden="true" />
        </div>
      </main>

      {/* Shared Safe-Area Bottom Feedback Tray (Docked, never overlaps cards) */}
      {feedbackState && (
        <LessonFeedbackTray
          open={feedbackState.open}
          isCorrect={feedbackState.isCorrect}
          headline={feedbackState.headline}
          explanation={feedbackState.explanation}
          continueLabel={feedbackState.continueLabel}
          onContinue={triggerFeedbackContinue}
        />
      )}

      {/* Lightweight Mid-Lesson Exit Confirmation Modal */}
      {confirmExitOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="dojo-exit-confirm-title"
          aria-describedby="dojo-exit-confirm-desc"
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
        >
          <Card className="w-full max-w-sm border-slate-200 bg-white shadow-xl">
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <h2
                  id="dojo-exit-confirm-title"
                  className="text-base font-bold text-slate-900"
                >
                  Leave this training drill?
                </h2>
                <p
                  id="dojo-exit-confirm-desc"
                  className="text-xs leading-relaxed text-slate-600"
                >
                  Exiting before completing the Mastery Check discards this
                  session and will not award XP or mark Level {level.id} complete.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onExitToMap}
                  className="border-slate-300 text-slate-700"
                >
                  Exit to Map
                </Button>
                <Button
                  ref={keepTrainingButtonRef}
                  type="button"
                  onClick={() => setConfirmExitOpen(false)}
                  className="border-b-[3px] border-b-sky-800 bg-sky-600 font-semibold text-white hover:bg-sky-500"
                >
                  Keep Training
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MechanicDispatcher({
  level,
  profile,
  muted,
  combo,
  onAnswer,
  onRevealChange,
  onComplete,
}: {
  level: ReturnType<typeof getDojoLevel>;
  profile: UserProfile | null;
  muted: boolean;
  combo: number;
  onAnswer: (isCorrect: boolean) => void;
  onRevealChange: (state: LessonFeedbackState | null) => void;
  onComplete: () => void;
}) {
  const { mechanic } = level;

  switch (mechanic.kind) {
    case "impulse_duel":
      return (
        <ImpulseDuelWidget
          mechanic={mechanic}
          muted={muted}
          combo={combo}
          onAnswer={onAnswer}
          onRevealChange={onRevealChange}
          onComplete={onComplete}
        />
      );
    case "interactive_slider":
      return (
        <InteractiveSliderWidget
          mechanic={mechanic}
          currency={profile?.currency}
          hourlyRateMinor={profile?.hourlyRateMinor}
          muted={muted}
          combo={combo}
          onAnswer={onAnswer}
          onRevealChange={onRevealChange}
          onComplete={onComplete}
        />
      );
    case "bucket_sort":
      return (
        <BucketSortWidget
          mechanic={mechanic}
          muted={muted}
          combo={combo}
          onAnswer={onAnswer}
          onRevealChange={onRevealChange}
          onComplete={onComplete}
        />
      );
    case "feedback_loop":
      return (
        <FeedbackLoopWidget
          mechanic={mechanic}
          muted={muted}
          combo={combo}
          onAnswer={onAnswer}
          onRevealChange={onRevealChange}
          onComplete={onComplete}
        />
      );
  }
}
