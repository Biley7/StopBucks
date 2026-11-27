"use client";

import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Layers, XCircle } from "lucide-react";
import type { BucketSortMechanicStep } from "@/domain/dojo-types";
import { playCorrect, playWrong } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  LessonFeedbackTray,
  type LessonFeedbackState,
} from "./lesson-feedback-tray";

interface BucketSortWidgetProps {
  mechanic: BucketSortMechanicStep;
  muted: boolean;
  combo?: number;
  onAnswer: (isCorrect: boolean) => void;
  onRevealChange?: (revealState: LessonFeedbackState | null) => void;
  onComplete: () => void;
}

export function BucketSortWidget({
  mechanic,
  muted,
  combo = 0,
  onAnswer,
  onRevealChange,
  onComplete,
}: BucketSortWidgetProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const [itemIndex, setItemIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [localFeedback, setLocalFeedback] =
    useState<LessonFeedbackState | null>(null);

  const currentItem = mechanic.items[itemIndex];
  if (!currentItem) {
    return null;
  }

  const hasClassified = selectedCategoryId !== null;
  const isFinalItem = itemIndex >= mechanic.items.length - 1;

  const handleSelectCategory = (categoryId: string) => {
    if (selectedCategoryId !== null) return;
    setSelectedCategoryId(categoryId);

    const isCorrect = categoryId === currentItem.correctCategoryId;
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

      if (isFinalItem) {
        onComplete();
      } else {
        setItemIndex((prev) => prev + 1);
        setSelectedCategoryId(null);
      }
    };

    const nextFeedback: LessonFeedbackState = {
      open: true,
      isCorrect,
      headline: isCorrect ? "Bucket Sorted Cleanly!" : "Category Check",
      explanation: currentItem.feedback,
      continueLabel: isFinalItem ? "See Live Wallet Mirror" : "Next Item",
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
          className="gap-1 border-sky-200 bg-sky-50 text-[11px] font-bold text-sky-800"
        >
          <Layers className="h-3 w-3" aria-hidden="true" />
          Beat 2 · Mental Bucket Sort
        </Badge>

        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-700">
          {itemIndex + 1} / {mechanic.items.length}
        </span>
      </div>

      {/* Active Item Card */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentItem.id}
          initial={shouldReduceMotion ? false : { opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -14 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18 }}
        >
          <Card className="border-2 border-slate-200 bg-white shadow-xs">
            <CardContent className="space-y-2 p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Classify This Item
              </div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                {currentItem.title}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {currentItem.subtitle}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Dynamic Category Buttons */}
      <div
        className={cn(
          "grid gap-2.5",
          mechanic.categories.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
        )}
        role="group"
        aria-label={`Sort ${currentItem.title} into a bucket`}
      >
        {mechanic.categories.map((category) => {
          const isSelected = selectedCategoryId === category.id;
          const isTrueCategory = category.id === currentItem.correctCategoryId;

          return (
            <motion.button
              key={category.id}
              type="button"
              disabled={hasClassified}
              onClick={() => handleSelectCategory(category.id)}
              whileTap={hasClassified || shouldReduceMotion ? undefined : { y: 2 }}
              animate={
                hasClassified && isSelected && !isTrueCategory && !shouldReduceMotion
                  ? { x: [0, -5, 5, -3, 3, 0] }
                  : undefined
              }
              transition={
                hasClassified && isSelected && !isTrueCategory
                  ? { duration: 0.32 }
                  : { type: "spring", stiffness: 520, damping: 32 }
              }
              className={cn(
                "flex min-h-[56px] w-full items-center justify-between gap-2 rounded-xl border-2 border-b-4 px-4 py-3 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
                !hasClassified &&
                  "cursor-pointer border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50/50 active:border-b-2",
                hasClassified &&
                  isTrueCategory &&
                  "border-emerald-500 border-b-emerald-600 bg-emerald-50 text-emerald-950",
                hasClassified &&
                  isSelected &&
                  !isTrueCategory &&
                  "border-amber-400 border-b-amber-500 bg-amber-50 text-amber-950",
                hasClassified &&
                  !isSelected &&
                  !isTrueCategory &&
                  "border-slate-200 border-b-slate-200 bg-slate-50 text-slate-400"
              )}
            >
              <span className="min-w-0 leading-snug">{category.label}</span>

              {hasClassified && isTrueCategory && (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
              )}
              {hasClassified && isSelected && !isTrueCategory && (
                <XCircle
                  className="h-4 w-4 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
              )}
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
