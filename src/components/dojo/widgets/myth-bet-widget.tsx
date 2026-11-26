"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { DojoCitation, MythBetStep } from "@/domain/dojo-types";
import { playCorrect, playWrong } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  LessonFeedbackTray,
  type LessonFeedbackState,
} from "./lesson-feedback-tray";

interface MythBetWidgetProps {
  wager: MythBetStep;
  citation: DojoCitation;
  muted: boolean;
  combo?: number;
  onAnswer: (isCorrect: boolean) => void;
  onRevealChange?: (revealState: LessonFeedbackState | null) => void;
  onComplete: () => void;
}

function formatCitationTag(citation: DojoCitation): string {
  const authors = citation.authors?.trim();
  const year = citation.year;
  if (authors && Number.isFinite(year)) {
    return `${authors} (${year})`;
  }
  if (authors) return authors;
  if (Number.isFinite(year)) return `Study (${year})`;
  return "Empirical Study";
}

export function MythBetWidget({
  wager,
  citation,
  muted,
  combo = 0,
  onAnswer,
  onRevealChange,
  onComplete,
}: MythBetWidgetProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [localFeedback, setLocalFeedback] = useState<LessonFeedbackState | null>(null);
  const hasAnswered = selectedIndex !== null;
  const isCorrect = selectedIndex === wager.correctIndex;

  const maxBarValue = React.useMemo(() => {
    const finiteValues = wager.comparisonBars.map((bar) =>
      Number.isFinite(bar.value) ? Math.abs(bar.value) : 0
    );
    return Math.max(...finiteValues, 1);
  }, [wager.comparisonBars]);

  const handleSelectOption = (index: number) => {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);

    const answeredCorrectly = index === wager.correctIndex;
    onAnswer(answeredCorrectly);

    if (answeredCorrectly) {
      playCorrect(muted, combo + 1);
    } else {
      playWrong(muted);
    }

    const nextFeedback: LessonFeedbackState = {
      open: true,
      isCorrect: answeredCorrectly,
      headline: answeredCorrectly
        ? "Research Prediction Nailed!"
        : "Surprise Empirical Finding",
      explanation: wager.revealExplanation,
      continueLabel: "Start Interactive Drill",
      onContinue: () => {
        if (onRevealChange) {
          onRevealChange(null);
        } else {
          setLocalFeedback(null);
        }
        onComplete();
      },
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-sky-200 bg-sky-50 text-[11px] font-bold text-sky-800"
          >
            <HelpCircle className="h-3 w-3" aria-hidden="true" />
            Beat 1 · Research Wager
          </Badge>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            <BookOpen className="h-3 w-3 text-slate-400" aria-hidden="true" />
            <span>{formatCitationTag(citation)}</span>
          </span>
        </div>

        <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
          {wager.prompt}
        </h2>
        <p className="text-xs text-slate-500">
          Make your best prediction before we reveal the empirical finding.
        </p>
      </div>

      {/* Tactile Option Cards */}
      <div className="space-y-2.5" role="radiogroup" aria-label="Research wager choices">
        {wager.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isTrueAnswer = index === wager.correctIndex;

          return (
            <button
              key={`${index}-${option.slice(0, 24)}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={hasAnswered}
              onClick={() => handleSelectOption(index)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border-2 border-b-4 px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
                !hasAnswered &&
                  "cursor-pointer border-slate-200 border-b-slate-300 bg-white hover:border-sky-300 hover:bg-sky-50/40 active:translate-y-px",
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
            </button>
          );
        })}
      </div>

      {/* Empirical Comparison Reveal */}
      {hasAnswered && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
        >
          <Card className="border-slate-200 bg-white">
            <CardContent className="space-y-3.5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Empirical Study Comparison
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                    isCorrect
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  )}
                >
                  {formatCitationTag(citation)}
                </span>
              </div>

              <div className="space-y-2.5">
                {wager.comparisonBars.map((bar) => {
                  const rawPct =
                    bar.value === 0
                      ? 2
                      : Math.min(
                          100,
                          Math.max(8, Math.round((Math.abs(bar.value) / maxBarValue) * 100))
                        );

                  return (
                    <div key={bar.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span
                          className={cn(
                            "font-semibold",
                            bar.highlight ? "text-slate-900" : "text-slate-600"
                          )}
                        >
                          {bar.label}
                        </span>
                        <span
                          className={cn(
                            "font-bold tabular-nums",
                            bar.highlight ? "text-sky-700" : "text-slate-700"
                          )}
                        >
                          {bar.displayValue}
                        </span>
                      </div>

                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={
                            shouldReduceMotion ? { width: `${rawPct}%` } : { width: "0%" }
                          }
                          animate={{ width: `${rawPct}%` }}
                          transition={
                            shouldReduceMotion
                              ? { duration: 0 }
                              : { duration: 0.45, ease: "easeOut" }
                          }
                          className={cn(
                            "h-full rounded-full",
                            bar.highlight ? "bg-sky-600" : "bg-slate-400"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Standalone fallback feedback tray when rendered outside DojoLessonArena */}
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
