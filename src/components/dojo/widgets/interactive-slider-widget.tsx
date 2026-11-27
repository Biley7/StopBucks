"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, SlidersHorizontal, Sparkles } from "lucide-react";
import {
  evaluateBroadBracketZoom,
  evaluateLaibsonWelfareLoss,
  evaluatePrelecCoupling,
} from "@/domain/dojo-engine";
import type { InteractiveSliderMechanicStep } from "@/domain/dojo-types";
import type { CurrencyCode } from "@/domain/types";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { playCorrect, playSliderTick, playWrong } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LessonFeedbackTray,
  type LessonFeedbackState,
} from "./lesson-feedback-tray";

interface InteractiveSliderWidgetProps {
  mechanic: InteractiveSliderMechanicStep;
  currency?: CurrencyCode;
  hourlyRateMinor?: number;
  muted: boolean;
  combo?: number;
  onAnswer: (isCorrect: boolean) => void;
  onRevealChange?: (revealState: LessonFeedbackState | null) => void;
  onComplete: () => void;
}

function getStepPrecision(step: number): number {
  const stepText = String(step);
  const dotIdx = stepText.indexOf(".");
  if (dotIdx === -1) return 0;
  return stepText.length - dotIdx - 1;
}

export function normalizeSliderValue(
  rawValue: number,
  min: number,
  max: number,
  step: number
): number {
  const clamped = Math.min(max, Math.max(min, rawValue));
  const precision = getStepPrecision(step);
  const factor = Math.pow(10, precision);
  const stepsFromMin = Math.round((clamped - min) / step);
  const snapped = min + stepsFromMin * step;
  const bounded = Math.min(max, Math.max(min, snapped));
  return Math.round(bounded * factor) / factor;
}

function toMinorFromSlider(value: number, unit: string): number {
  const normalizedUnit = unit.trim().toLowerCase();
  if (
    normalizedUnit === "minor" ||
    normalizedUnit === "paise" ||
    normalizedUnit === "cents"
  ) {
    return Math.max(0, Math.round(value));
  }
  return Math.max(0, Math.round(value * 100));
}

export function InteractiveSliderWidget({
  mechanic,
  currency = "INR",
  hourlyRateMinor,
  muted,
  combo = 0,
  onAnswer,
  onRevealChange,
  onComplete,
}: InteractiveSliderWidgetProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);
  const { formatAmount } = useDisplayPreference();

  const initialValue = normalizeSliderValue(
    mechanic.defaultValue,
    mechanic.min,
    mechanic.max,
    mechanic.step
  );
  const [value, setValue] = useState<number>(initialValue);
  const [lockedIn, setLockedIn] = useState(false);
  const [localFeedback, setLocalFeedback] =
    useState<LessonFeedbackState | null>(null);
  const lastValueRef = useRef<number>(initialValue);

  const handleSliderChange = (nextRaw: number) => {
    if (lockedIn || !Number.isFinite(nextRaw)) return;
    const normalized = normalizeSliderValue(
      nextRaw,
      mechanic.min,
      mechanic.max,
      mechanic.step
    );
    if (normalized !== lastValueRef.current) {
      lastValueRef.current = normalized;
      setValue(normalized);
      playSliderTick(muted);
    }
  };

  const handleLockIn = () => {
    if (lockedIn) return;
    setLockedIn(true);

    const epsilon = 1e-9;
    const isCorrect =
      value >= mechanic.targetRange.min - epsilon &&
      value <= mechanic.targetRange.max + epsilon;

    onAnswer(isCorrect);

    if (isCorrect) {
      playCorrect(muted, combo + 1);
    } else {
      playWrong(muted);
    }

    const explanation = isCorrect
      ? mechanic.insightText
      : `Target range was ${formatRangeText(mechanic)}. ${mechanic.insightText}`;

    const nextFeedback: LessonFeedbackState = {
      open: true,
      isCorrect,
      headline: isCorrect ? "Target Locked In!" : "Target Missed — Key Insight",
      explanation,
      continueLabel: "See Live Wallet Mirror",
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

  // Evaluate preset-specific model data
  const couplingModes = useMemo(() => {
    if (mechanic.presetKey !== "coupling_meter") return null;
    return ([0, 1, 2] as const).map((idx) => evaluatePrelecCoupling(idx));
  }, [mechanic.presetKey]);

  const activeCoupling = useMemo(() => {
    if (!couplingModes) return null;
    const idx = Math.min(2, Math.max(0, Math.round(value))) as 0 | 1 | 2;
    return couplingModes[idx];
  }, [couplingModes, value]);

  const laibsonEvaluation = useMemo(() => {
    if (mechanic.presetKey !== "hyperbolic_beta") return null;
    return evaluateLaibsonWelfareLoss(value);
  }, [mechanic.presetKey, value]);

  const broadBracketEvaluation = useMemo(() => {
    if (mechanic.presetKey !== "broad_bracket_zoom") return null;
    return evaluateBroadBracketZoom(toMinorFromSlider(value, mechanic.unit));
  }, [mechanic.presetKey, value, mechanic.unit]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-sky-200 bg-sky-50 text-[11px] font-bold text-sky-800"
          >
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
            Beat 2 · Interactive Model Lab
          </Badge>

          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-600">
            Target: {formatRangeText(mechanic)}
          </span>
        </div>

        <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
          {mechanic.challengePrompt}
        </h2>
      </div>

      {/* Variant 1: Prelec & Loewenstein Coupling Meter */}
      {mechanic.presetKey === "coupling_meter" &&
        couplingModes &&
        activeCoupling && (
          <Card className="border-slate-200 bg-white">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {mechanic.sliderLabel}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] font-bold uppercase",
                    activeCoupling.couplingLevel === "high"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : activeCoupling.couplingLevel === "moderate"
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-slate-300 bg-slate-100 text-slate-800"
                  )}
                >
                  {activeCoupling.modeLabel} · {activeCoupling.couplingLevel} coupling
                </Badge>
              </div>

              {/* Three Mode Selector Buttons synced with slider */}
              <div className="grid grid-cols-3 gap-2">
                {couplingModes.map((mode) => {
                  const isSelected = mode.modeIndex === activeCoupling.modeIndex;
                  return (
                    <button
                      key={mode.modeIndex}
                      type="button"
                      disabled={lockedIn}
                      onClick={() => handleSliderChange(mode.modeIndex)}
                      className={cn(
                        "rounded-xl border-2 px-2 py-2 text-center text-[11px] font-bold leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 sm:px-2.5 sm:text-xs",
                        isSelected
                          ? "border-sky-600 bg-sky-50 text-sky-950 shadow-2xs"
                          : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100",
                        !lockedIn && "cursor-pointer"
                      )}
                    >
                      <div>{mode.modeLabel}</div>
                      <div className="mt-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
                        {mode.couplingStrengthPct}% couple
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Coupling & Pain Salience Live Bars */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Coupling Indicator
                    </span>
                    <span className="font-bold tabular-nums text-sky-700">
                      {activeCoupling.couplingStrengthPct} / 100
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      initial={false}
                      animate={{
                        width: `${activeCoupling.couplingStrengthPct}%`,
                      }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 260, damping: 24 }
                      }
                      className="h-full rounded-full bg-sky-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Pain-of-Paying Salience
                    </span>
                    <span className="font-bold tabular-nums text-emerald-700">
                      {activeCoupling.painSaliencePct} / 100
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      initial={false}
                      animate={{
                        width: `${activeCoupling.painSaliencePct}%`,
                      }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 260, damping: 24 }
                      }
                      className="h-full rounded-full bg-emerald-600"
                    />
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-700">
                  {activeCoupling.behavioralExplanation}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {activeCoupling.comparisonSummary}
                </p>
              </div>

              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                <strong className="text-slate-800">Modeled comparison:</strong>{" "}
                {activeCoupling.scaleDisclaimer}
              </p>
            </CardContent>
          </Card>
        )}

      {/* Variant 2: Laibson Quasi-Hyperbolic Discounting */}
      {mechanic.presetKey === "hyperbolic_beta" && laibsonEvaluation && (
        <Card className="border-slate-200 bg-white">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {mechanic.sliderLabel}
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-extrabold tabular-nums text-sky-900">
                β = {laibsonEvaluation.beta.toFixed(1)}
              </span>
            </div>

            {/* Responsive SVG Chart comparing δ^t vs βδ^t */}
            <HyperbolicCurveSvg
              curvePoints={laibsonEvaluation.curvePoints}
              beta={laibsonEvaluation.beta}
              delta={laibsonEvaluation.exponentialDelta}
              shouldReduceMotion={shouldReduceMotion}
            />

            {/* Welfare Loss & Period 1 Readouts */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Table II Welfare Loss
                </div>
                <div className="mt-1 text-lg font-extrabold tabular-nums text-amber-950">
                  {laibsonEvaluation.welfareLossPct}%
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Exponential (t=1)
                </div>
                <div className="mt-1 text-lg font-extrabold tabular-nums text-slate-800">
                  {laibsonEvaluation.exponentialDiscountAtPeriod1.toFixed(2)}
                </div>
              </div>

              <div className="col-span-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3 sm:col-span-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                  Hyperbolic (t=1)
                </div>
                <div className="mt-1 text-lg font-extrabold tabular-nums text-sky-950">
                  {laibsonEvaluation.hyperbolicDiscountAtPeriod1.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Reference Points */}
            <div className="flex flex-wrap gap-1.5">
              {[0.4, 0.6, 0.8, 1.0].map((anchor) => {
                const isAtAnchor = Math.abs(laibsonEvaluation.beta - anchor) < 0.01;
                return (
                  <button
                    key={anchor}
                    type="button"
                    disabled={lockedIn}
                    onClick={() => handleSliderChange(anchor)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-bold tabular-nums transition-colors",
                      isAtAnchor
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                      !lockedIn && "cursor-pointer"
                    )}
                  >
                    β = {anchor.toFixed(1)}
                  </button>
                );
              })}
            </div>

            <p className="text-xs leading-relaxed text-slate-700">
              {laibsonEvaluation.insight}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Variant 3: Broad Bracket Zoom */}
      {mechanic.presetKey === "broad_bracket_zoom" &&
        broadBracketEvaluation && (
          <Card className="border-slate-200 bg-white">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {mechanic.sliderLabel}
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-extrabold tabular-nums text-sky-900">
                  {formatAmount(
                    broadBracketEvaluation.dailyMinor,
                    currency,
                    hourlyRateMinor
                  )}
                  /day
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    1 Day
                  </div>
                  <div className="mt-1 text-sm font-extrabold tabular-nums text-slate-900">
                    {formatAmount(
                      broadBracketEvaluation.dailyMinor,
                      currency,
                      hourlyRateMinor
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    1 Month
                  </div>
                  <div className="mt-1 text-sm font-extrabold tabular-nums text-slate-900">
                    {formatAmount(
                      broadBracketEvaluation.monthlyMinor,
                      currency,
                      hourlyRateMinor
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                    1 Year
                  </div>
                  <div className="mt-1 text-sm font-extrabold tabular-nums text-sky-950">
                    {formatAmount(
                      broadBracketEvaluation.annualMinor,
                      currency,
                      hourlyRateMinor
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    4 Years (8%)
                  </div>
                  <div className="mt-1 text-sm font-extrabold tabular-nums text-emerald-950">
                    {formatAmount(
                      broadBracketEvaluation.compounded4YearMinor,
                      currency,
                      hourlyRateMinor
                    )}
                  </div>
                </div>
              </div>

              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                Illustrative habit projection only — not your measured ledger
                spending.
              </p>
            </CardContent>
          </Card>
        )}

      {/* Range Slider + Lock In Target Control */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <label htmlFor="dojo-mechanic-slider">{mechanic.sliderLabel}</label>
              <span className="tabular-nums font-bold text-slate-900">
                {formatSliderReadout(value, mechanic)}
              </span>
            </div>

            <input
              id="dojo-mechanic-slider"
              type="range"
              min={mechanic.min}
              max={mechanic.max}
              step={mechanic.step}
              value={value}
              disabled={lockedIn}
              aria-label={mechanic.sliderLabel}
              onChange={(event) => handleSliderChange(Number(event.target.value))}
              className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <div className="flex justify-between text-[11px] font-medium tabular-nums text-slate-500">
              <span>{formatBoundLabel(mechanic.min, mechanic)}</span>
              <span>{formatBoundLabel(mechanic.max, mechanic)}</span>
            </div>
          </div>

          <Button
            type="button"
            disabled={lockedIn}
            onClick={handleLockIn}
            className="h-11 w-full gap-2 border-b-[3px] border-b-sky-800 bg-sky-600 text-sm font-bold text-white hover:bg-sky-500 active:translate-y-px"
          >
            {lockedIn ? (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Target Locked In</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" aria-hidden="true" />
                <span>Lock In Target</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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

function formatSliderReadout(
  value: number,
  mechanic: InteractiveSliderMechanicStep
): string {
  if (mechanic.presetKey === "coupling_meter") {
    const idx = Math.min(2, Math.max(0, Math.round(value))) as 0 | 1 | 2;
    return evaluatePrelecCoupling(idx).modeLabel;
  }
  if (mechanic.presetKey === "hyperbolic_beta") {
    return `β = ${value.toFixed(1)}`;
  }
  return `${value} ${mechanic.unit}`;
}

function formatBoundLabel(
  bound: number,
  mechanic: InteractiveSliderMechanicStep
): string {
  if (mechanic.presetKey === "coupling_meter") {
    const idx = Math.min(2, Math.max(0, Math.round(bound))) as 0 | 1 | 2;
    return evaluatePrelecCoupling(idx).modeLabel;
  }
  if (mechanic.presetKey === "hyperbolic_beta") {
    return `β = ${bound.toFixed(1)}`;
  }
  return `${bound} ${mechanic.unit}`;
}

function formatRangeText(mechanic: InteractiveSliderMechanicStep): string {
  const { min, max } = mechanic.targetRange;
  if (mechanic.presetKey === "coupling_meter") {
    const minLabel = evaluatePrelecCoupling(
      Math.min(2, Math.max(0, Math.round(min))) as 0 | 1 | 2
    ).modeLabel;
    const maxLabel = evaluatePrelecCoupling(
      Math.min(2, Math.max(0, Math.round(max))) as 0 | 1 | 2
    ).modeLabel;
    return min === max ? minLabel : `${minLabel} – ${maxLabel}`;
  }
  if (mechanic.presetKey === "hyperbolic_beta") {
    return min === max
      ? `β = ${min.toFixed(1)}`
      : `β ${min.toFixed(1)} – ${max.toFixed(1)}`;
  }
  return min === max
    ? `${min} ${mechanic.unit}`
    : `${min}–${max} ${mechanic.unit}`;
}

function HyperbolicCurveSvg({
  curvePoints,
  beta,
  delta,
  shouldReduceMotion,
}: {
  curvePoints: Array<{ period: number; exponential: number; hyperbolic: number }>;
  beta: number;
  delta: number;
  shouldReduceMotion: boolean;
}) {
  const width = 360;
  const height = 180;
  const padLeft = 36;
  const padRight = 14;
  const padTop = 16;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const toX = (period: number) => {
    const safePeriod = Number.isFinite(period) ? period : 0;
    return Math.round((padLeft + (safePeriod / 10) * plotW) * 100) / 100;
  };
  const toY = (discount: number) => {
    const safe = Number.isFinite(discount)
      ? Math.min(1, Math.max(0, discount))
      : 0;
    return Math.round((padTop + (1 - safe) * plotH) * 100) / 100;
  };

  const expPath = curvePoints
    .map(
      (pt, idx) =>
        `${idx === 0 ? "M" : "L"} ${toX(pt.period)} ${toY(pt.exponential)}`
    )
    .join(" ");

  const hypPath = curvePoints
    .map(
      (pt, idx) =>
        `${idx === 0 ? "M" : "L"} ${toX(pt.period)} ${toY(pt.hyperbolic)}`
    )
    .join(" ");

  const p1 = curvePoints.find((pt) => pt.period === 1) ?? curvePoints[0];
  const p1X = toX(1);
  const p1ExpY = toY(p1?.exponential ?? delta);
  const p1HypY = toY(p1?.hyperbolic ?? beta * delta);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span
            className="inline-block h-0.5 w-4 border-t-2 border-dashed border-slate-500"
            aria-hidden="true"
          />
          Exponential (δᵗ, δ={delta})
        </span>
        <span className="inline-flex items-center gap-1.5 text-sky-800">
          <span
            className="inline-block h-0.5 w-4 rounded bg-sky-600"
            aria-hidden="true"
          />
          Quasi-Hyperbolic (βδᵗ, β={beta.toFixed(1)})
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Discounting curves comparing exponential ${delta}^t against quasi-hyperbolic ${beta.toFixed(1)} times ${delta}^t across periods 0 to 10`}
        className="h-auto w-full"
      >
        {/* Horizontal reference lines */}
        {[0, 0.5, 1].map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="#64748b"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Period X ticks */}
        {[0, 1, 2, 4, 6, 8, 10].map((period) => (
          <text
            key={period}
            x={toX(period)}
            y={height - 8}
            textAnchor="middle"
            fontSize="9"
            fill="#64748b"
          >
            t={period}
          </text>
        ))}

        {/* Present-bias drop connector at t=1 */}
        {Math.abs(p1HypY - p1ExpY) > 1 && (
          <line
            x1={p1X}
            y1={p1ExpY}
            x2={p1X}
            y2={p1HypY}
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Exponential Curve */}
        <path
          d={expPath}
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          strokeDasharray="5 4"
        />

        {/* Quasi-Hyperbolic Curve */}
        <motion.path
          d={hypPath}
          animate={{ d: hypPath }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 220, damping: 26 }
          }
          fill="none"
          stroke="#0284c7"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Period 0 and Period 1 points */}
        <circle cx={toX(0)} cy={toY(1)} r="3.5" fill="#0284c7" />
        <circle cx={p1X} cy={p1HypY} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
