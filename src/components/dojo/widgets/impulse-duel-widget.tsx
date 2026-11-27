"use client";

import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  MessageCircleWarning,
  Shield,
  Swords,
  XCircle,
} from "lucide-react";
import type {
  ImpulseDuelMechanicStep,
  ImpulseDuelRound,
} from "@/domain/dojo-types";
import { playCorrect, playWrong } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  LessonFeedbackTray,
  type LessonFeedbackState,
} from "./lesson-feedback-tray";

interface ImpulseDuelWidgetProps {
  mechanic: ImpulseDuelMechanicStep;
  muted: boolean;
  combo?: number;
  onAnswer: (isCorrect: boolean) => void;
  onRevealChange?: (revealState: LessonFeedbackState | null) => void;
  onComplete: () => void;
}

export function ImpulseDuelWidget({
  mechanic,
  muted,
  combo = 0,
  onAnswer,
  onRevealChange,
  onComplete,
}: ImpulseDuelWidgetProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const rounds: ImpulseDuelRound[] = useMemo(() => {
    if (mechanic.rounds && mechanic.rounds.length > 0) {
      return mechanic.rounds;
    }
    return [
      {
        scenario: mechanic.scenario,
        system1Excuse: mechanic.system1Excuse,
        choices: mechanic.choices,
      },
    ];
  }, [mechanic]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(
    null
  );
  const [deliberativeWins, setDeliberativeWins] = useState(0);
  const [localFeedback, setLocalFeedback] =
    useState<LessonFeedbackState | null>(null);

  const currentRound = rounds[roundIndex];
  if (!currentRound) {
    return null;
  }

  const hasAnswered = selectedChoiceIndex !== null;
  const isFinalRound = roundIndex >= rounds.length - 1;
  const shieldChargePct = Math.round((deliberativeWins / rounds.length) * 100);

  const handleSelectChoice = (choiceIndex: number) => {
    if (selectedChoiceIndex !== null) return;
    const chosen = currentRound.choices[choiceIndex];
    if (!chosen) return;

    setSelectedChoiceIndex(choiceIndex);
    const isCorrect = chosen.isDeliberative;
    if (isCorrect) {
      setDeliberativeWins((prev) => prev + 1);
      playCorrect(muted, combo + 1);
    } else {
      playWrong(muted);
    }

    onAnswer(isCorrect);

    const advance = () => {
      if (onRevealChange) {
        onRevealChange(null);
      } else {
        setLocalFeedback(null);
      }

      if (isFinalRound) {
        onComplete();
      } else {
        setRoundIndex((prev) => prev + 1);
        setSelectedChoiceIndex(null);
      }
    };

    const nextFeedback: LessonFeedbackState = {
      open: true,
      isCorrect,
      headline: isCorrect ? "Planner Shield Charged!" : "Doer Shortcut Spotted",
      explanation: chosen.feedback,
      continueLabel: isFinalRound ? "See Live Wallet Mirror" : "Next Round",
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
      {/* Header & Planner Shield Charge Meter */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-amber-200 bg-amber-50 text-[11px] font-bold text-amber-900"
          >
            <Swords className="h-3 w-3" aria-hidden="true" />
            Beat 2 · Impulse Duel
          </Badge>

          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-700">
            Round {roundIndex + 1} / {rounds.length}
          </span>
        </div>

        {/* Planner Shield Charge Meter */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
              <Shield className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Planner Shield Charge
            </span>
            <span className="font-bold tabular-nums text-emerald-700">
              {deliberativeWins}/{rounds.length} Defended ({shieldChargePct}%)
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Planner Shield charge"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={shieldChargePct}
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <motion.div
              initial={false}
              animate={{ width: `${shieldChargePct}%` }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 260, damping: 24 }
              }
              className="h-full rounded-full bg-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Scenario Card */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="space-y-3.5 p-4 sm:p-5">
          <p className="text-sm font-semibold leading-relaxed text-slate-900 sm:text-base">
            {currentRound.scenario}
          </p>

          {/* System 1 / Doer Excuse Speech Bubble */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
              <MessageCircleWarning className="h-3.5 w-3.5" aria-hidden="true" />
              <span>System 1 / Doer Excuse</span>
            </div>
            <p className="mt-1 text-sm font-medium italic leading-snug text-amber-950">
              &ldquo;{currentRound.system1Excuse}&rdquo;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Deliberative Counter-Move Choices */}
      <div
        className="space-y-2.5"
        role="radiogroup"
        aria-label={`Round ${roundIndex + 1} counter-moves`}
      >
        {currentRound.choices.map((choice, index) => {
          const isSelected = selectedChoiceIndex === index;
          const isDeliberative = choice.isDeliberative;

          return (
            <motion.button
              key={`${roundIndex}-${index}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={hasAnswered}
              onClick={() => handleSelectChoice(index)}
              whileTap={hasAnswered || shouldReduceMotion ? undefined : { y: 2 }}
              animate={
                hasAnswered && isSelected && !isDeliberative && !shouldReduceMotion
                  ? { x: [0, -5, 5, -3, 3, 0] }
                  : undefined
              }
              transition={
                hasAnswered && isSelected && !isDeliberative
                  ? { duration: 0.32 }
                  : { type: "spring", stiffness: 520, damping: 32 }
              }
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border-2 border-b-4 px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
                !hasAnswered &&
                  "cursor-pointer border-slate-200 border-b-slate-300 bg-white hover:border-sky-300 hover:bg-sky-50/40 active:border-b-2",
                hasAnswered &&
                  isDeliberative &&
                  "border-emerald-500 border-b-emerald-600 bg-emerald-50/90 text-emerald-950",
                hasAnswered &&
                  isSelected &&
                  !isDeliberative &&
                  "border-amber-400 border-b-amber-500 bg-amber-50/90 text-amber-950",
                hasAnswered &&
                  !isSelected &&
                  !isDeliberative &&
                  "border-slate-200 border-b-slate-200 bg-slate-50/70 text-slate-500 opacity-75"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                  !hasAnswered && "border-slate-200 bg-slate-50 text-slate-600",
                  hasAnswered &&
                    isDeliberative &&
                    "border-emerald-500 bg-emerald-600 text-white",
                  hasAnswered &&
                    isSelected &&
                    !isDeliberative &&
                    "border-amber-500 bg-amber-500 text-white",
                  hasAnswered &&
                    !isSelected &&
                    !isDeliberative &&
                    "border-slate-200 bg-white text-slate-400"
                )}
              >
                {hasAnswered && isDeliberative ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : hasAnswered && isSelected && !isDeliberative ? (
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </span>

              <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                {choice.label}
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
