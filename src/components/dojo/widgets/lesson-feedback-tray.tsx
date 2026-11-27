"use client";

import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface LessonFeedbackState {
  open: boolean;
  isCorrect: boolean;
  headline: string;
  explanation: string;
  continueLabel?: string;
  onContinue: () => void;
}

interface LessonFeedbackTrayProps {
  open: boolean;
  isCorrect: boolean;
  headline: string;
  explanation: string;
  continueLabel?: string;
  onContinue: () => void;
}

export function LessonFeedbackTray({
  open,
  isCorrect,
  headline,
  explanation,
  continueLabel = "Continue",
  onContinue,
}: LessonFeedbackTrayProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const focusContinue = () => {
      try {
        continueButtonRef.current?.focus({ preventScroll: true });
      } catch {
        continueButtonRef.current?.focus();
      }
    };

    const frame =
      typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame(focusContinue)
        : null;

    if (frame === null) {
      focusContinue();
    }

    return () => {
      if (frame !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [open]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="lesson-feedback-tray"
          role="status"
          aria-live="polite"
          data-dojo-feedback-tray="true"
          initial={shouldReduceMotion ? { opacity: 1 } : { y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.01 }
              : { type: "spring", stiffness: 360, damping: 32 }
          }
          className={cn(
            "shrink-0 border-t-2 px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)] sm:px-6 sm:pt-3.5",
            isCorrect
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-amber-300 bg-amber-50 text-amber-950"
          )}
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isCorrect
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 max-h-[28dvh] flex-1 space-y-1 overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                      isCorrect
                        ? "bg-emerald-200/80 text-emerald-900"
                        : "bg-amber-200/80 text-amber-900"
                    )}
                  >
                    {isCorrect ? "Correct" : "Review"}
                  </span>
                  <h3 className="break-words text-sm font-bold tracking-tight sm:text-base">
                    {headline}
                  </h3>
                </div>
                <p
                  className={cn(
                    "break-words text-xs leading-relaxed sm:text-sm",
                    isCorrect ? "text-emerald-900" : "text-amber-900"
                  )}
                >
                  {explanation}
                </p>
              </div>
            </div>

            <Button
              ref={continueButtonRef}
              type="button"
              data-dojo-continue="true"
              onClick={onContinue}
              className={cn(
                "h-11 w-full shrink-0 gap-2 border-b-[3px] px-5 text-sm font-bold text-white active:translate-y-px sm:w-auto",
                isCorrect
                  ? "border-b-emerald-800 bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-600"
                  : "border-b-amber-800 bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-600"
              )}
            >
              <span>{continueLabel}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
