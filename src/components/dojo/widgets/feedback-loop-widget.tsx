"use client";

import React, { useState } from "react";
import { Activity, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import type { FeedbackLoopMechanicStep } from "@/domain/dojo-types";
import { playCorrect, playWrong } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  LessonFeedbackTray,
  type LessonFeedbackState,
} from "./lesson-feedback-tray";

interface FeedbackLoopWidgetProps {
  mechanic: FeedbackLoopMechanicStep;
  muted: boolean;
  combo?: number;
  onAnswer: (isCorrect: boolean) => void;
  onRevealChange?: (revealState: LessonFeedbackState | null) => void;
  onComplete: () => void;
}

type StageOutcome = "optimal" | "strained";

export function FeedbackLoopWidget({
  mechanic,
  muted,
  combo = 0,
  onAnswer,
  onRevealChange,
  onComplete,
}: FeedbackLoopWidgetProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    null
  );
  const [stageOutcomes, setStageOutcomes] = useState<StageOutcome[]>([]);
  const [localFeedback, setLocalFeedback] =
    useState<LessonFeedbackState | null>(null);

  const currentStep = mechanic.steps[stepIndex];
  if (!currentStep) {
    return null;
  }

  const hasSelected = selectedOptionIndex !== null;
  const isFinalStep = stepIndex >= mechanic.steps.length - 1;

  const handleSelectOption = (optionIndex: number) => {
    if (selectedOptionIndex !== null) return;
    const option = currentStep.options[optionIndex];
    if (!option) return;

    setSelectedOptionIndex(optionIndex);
    const isOptimal = option.isOptimal;

    setStageOutcomes((prev) => [
      ...prev,
      isOptimal ? "optimal" : "strained",
    ]);

    if (isOptimal) {
      playCorrect(muted, combo + 1);
    } else {
      playWrong(muted);
    }

    onAnswer(isOptimal);

    const advance = () => {
      if (onRevealChange) {
        onRevealChange(null);
      } else {
        setLocalFeedback(null);
      }

      if (isFinalStep) {
        onComplete();
      } else {
        setStepIndex((prev) => prev + 1);
        setSelectedOptionIndex(null);
      }
    };

    const nextFeedback: LessonFeedbackState = {
      open: true,
      isCorrect: isOptimal,
      headline: isOptimal
        ? `Stage ${stepIndex + 1} Stabilized!`
        : `Stage ${stepIndex + 1} — Caution`,
      explanation: option.feedback,
      continueLabel: isFinalStep ? "See Live Wallet Mirror" : "Next Stage",
      onContinue: advance,
    };

    if (onRevealChange) {
      onRevealChange(nextFeedback);
    } else {
      setLocalFeedback(nextFeedback);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="gap-1 border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-800"
        >
          <Activity className="h-3 w-3" aria-hidden="true" />
          Beat 2 · Resilience Feedback Loop
        </Badge>

        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-700">
          Stage {stepIndex + 1} / {mechanic.steps.length}
        </span>
      </div>

      {/* Shock Scenario Banner */}
      <Card className="border-amber-200 bg-amber-50/70">
        <CardContent className="space-y-1.5 p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
            Active Shock Scenario
          </div>
          <h2 className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
            {mechanic.shockTitle}
          </h2>
          <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">
            {mechanic.shockDescription}
          </p>
        </CardContent>
      </Card>

      {/* Multi-Stage Stability Meter */}
      <div
        className="rounded-xl border border-slate-200 bg-white p-3.5"
        aria-label="Stability meter"
      >
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck
              className="h-3.5 w-3.5 text-emerald-600"
              aria-hidden="true"
            />
            {mechanic.steps.length}-Stage Stability Meter
          </span>
          <span className="tabular-nums text-slate-500">
            {stageOutcomes.filter((s) => s === "optimal").length}/
            {mechanic.steps.length} Optimal
          </span>
        </div>

        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${mechanic.steps.length}, minmax(0, 1fr))`,
          }}
        >
          {mechanic.steps.map((_, idx) => {
            const outcome = stageOutcomes[idx];
            const isCurrent = idx === stepIndex;

            return (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-center text-[11px] font-bold transition-colors",
                  outcome === "optimal" &&
                    "border-emerald-300 bg-emerald-50 text-emerald-800",
                  outcome === "strained" &&
                    "border-amber-300 bg-amber-50 text-amber-800",
                  !outcome &&
                    isCurrent &&
                    "border-sky-400 bg-sky-50 text-sky-900",
                  !outcome &&
                    !isCurrent &&
                    "border-slate-200 bg-slate-50 text-slate-400"
                )}
              >
                Stage {idx + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Prompt & Options */}
      <div className="space-y-3">
        <h3 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
          {currentStep.prompt}
        </h3>

        <div
          className="space-y-2.5"
          role="radiogroup"
          aria-label={`Stage ${stepIndex + 1} tactical choices`}
        >
          {currentStep.options.map((option, index) => {
            const isSelected = selectedOptionIndex === index;
            const isOptimal = option.isOptimal;

            return (
              <button
                key={`${stepIndex}-${index}`}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={hasSelected}
                onClick={() => handleSelectOption(index)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border-2 border-b-4 px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
                  !hasSelected &&
                    "cursor-pointer border-slate-200 border-b-slate-300 bg-white hover:border-sky-300 hover:bg-sky-50/40 active:translate-y-px",
                  hasSelected &&
                    isOptimal &&
                    "border-emerald-500 border-b-emerald-600 bg-emerald-50/90 text-emerald-950",
                  hasSelected &&
                    isSelected &&
                    !isOptimal &&
                    "border-amber-400 border-b-amber-500 bg-amber-50/90 text-amber-950",
                  hasSelected &&
                    !isSelected &&
                    !isOptimal &&
                    "border-slate-200 border-b-slate-200 bg-slate-50/70 text-slate-500 opacity-75"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                    !hasSelected &&
                      "border-slate-200 bg-slate-50 text-slate-600",
                    hasSelected &&
                      isOptimal &&
                      "border-emerald-500 bg-emerald-600 text-white",
                    hasSelected &&
                      isSelected &&
                      !isOptimal &&
                      "border-amber-500 bg-amber-500 text-white",
                    hasSelected &&
                      !isSelected &&
                      !isOptimal &&
                      "border-slate-200 bg-white text-slate-400"
                  )}
                >
                  {hasSelected && isOptimal ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : hasSelected && isSelected && !isOptimal ? (
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </span>

                <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!onRevealChange && localFeedback && (
        <LessonFeedbackTray
          open={localFeedback.open}
          isCorrect={localFeedback.isCorrect}
          headline={localFeedback.headline}
          explanation={localFeedback.explanation}
          continueLabel={localFeedback.continueLabel}
          onContinue={localFeedback.onContinue}
        />
      )}
    </div>
  );
}
