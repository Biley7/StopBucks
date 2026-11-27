"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import type { MasteryQuestion } from "@/domain/dojo-types";
import { playCorrect, playWrong } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  LessonFeedbackTray,
  type LessonFeedbackState,
} from "./lesson-feedback-tray";

interface MasteryCheckWidgetProps {
  questions: MasteryQuestion[];
  muted: boolean;
  combo?: number;
  onAnswer: (isCorrect: boolean) => void;
  onRevealChange?: (revealState: LessonFeedbackState | null) => void;
  onComplete: () => void;
}

export function MasteryCheckWidget({
  questions,
  muted,
  combo = 0,
  onAnswer,
  onRevealChange,
  onComplete,
}: MasteryCheckWidgetProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [localFeedback, setLocalFeedback] = useState<LessonFeedbackState | null>(
    null
  );

  const currentQuestion = questions[questionIndex];
  if (!currentQuestion) {
    return null;
  }

  const hasAnswered = selectedIndex !== null;
  const isFinalQuestion = questionIndex >= questions.length - 1;

  const handleSelectOption = (optionIndex: number) => {
    if (selectedIndex !== null) return;
    setSelectedIndex(optionIndex);

    const isCorrect = optionIndex === currentQuestion.correctIndex;
    onAnswer(isCorrect);

    if (isCorrect) {
      playCorrect(muted, combo + 1);
    } else {
      playWrong(muted);
    }

    const advance = () => {
      if (onRevealChange) {
        onRevealChange(null);
      } else {
        setLocalFeedback(null);
      }

      if (isFinalQuestion) {
        onComplete();
      } else {
        setQuestionIndex((prev) => prev + 1);
        setSelectedIndex(null);
      }
    };

    const nextFeedback: LessonFeedbackState = {
      open: true,
      isCorrect,
      headline: isCorrect ? "Mastery Confirmed!" : "Key Concept Check",
      explanation: currentQuestion.explanation,
      continueLabel: isFinalQuestion ? "Complete Drill" : "Next Question",
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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-sky-200 bg-sky-50 text-[11px] font-bold text-sky-800"
          >
            <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
            Beat 4 · Applied Mastery Check
          </Badge>

          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-700">
            Question {questionIndex + 1} / {questions.length}
          </span>
        </div>

        <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
          {currentQuestion.prompt}
        </h2>
      </div>

      <div
        className="space-y-2.5"
        role="radiogroup"
        aria-label={`Mastery question ${questionIndex + 1}`}
      >
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isTrueAnswer = index === currentQuestion.correctIndex;

          return (
            <motion.button
              key={`${questionIndex}-${index}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={hasAnswered}
              onClick={() => handleSelectOption(index)}
              whileTap={hasAnswered || shouldReduceMotion ? undefined : { y: 2 }}
              animate={
                hasAnswered && isSelected && !isTrueAnswer && !shouldReduceMotion
                  ? { x: [0, -5, 5, -3, 3, 0] }
                  : undefined
              }
              transition={
                hasAnswered && isSelected && !isTrueAnswer
                  ? { duration: 0.32 }
                  : { type: "spring", stiffness: 520, damping: 32 }
              }
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border-2 border-b-4 px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
                !hasAnswered &&
                  "cursor-pointer border-slate-200 border-b-slate-300 bg-white hover:border-sky-300 hover:bg-sky-50/40 active:border-b-2",
                hasAnswered &&
                  isTrueAnswer &&
                  "border-emerald-500 border-b-emerald-600 bg-emerald-50/90 text-emerald-950",
                hasAnswered &&
                  isSelected &&
                  !isTrueAnswer &&
                  "border-amber-400 border-b-amber-500 bg-amber-50/90 text-amber-950",
                hasAnswered &&
                  !isSelected &&
                  !isTrueAnswer &&
                  "border-slate-200 border-b-slate-200 bg-slate-50/70 text-slate-500 opacity-75"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                  !hasAnswered && "border-slate-200 bg-slate-50 text-slate-600",
                  hasAnswered &&
                    isTrueAnswer &&
                    "border-emerald-500 bg-emerald-600 text-white",
                  hasAnswered &&
                    isSelected &&
                    !isTrueAnswer &&
                    "border-amber-500 bg-amber-500 text-white",
                  hasAnswered &&
                    !isSelected &&
                    !isTrueAnswer &&
                    "border-slate-200 bg-white text-slate-400"
                )}
              >
                {hasAnswered && isTrueAnswer ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : hasAnswered && isSelected && !isTrueAnswer ? (
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </span>

              <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                {option}
              </span>
            </motion.button>
          );
        })}
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
