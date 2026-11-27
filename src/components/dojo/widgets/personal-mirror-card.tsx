"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Wallet,
} from "lucide-react";
import { buildDojoPersonalMirror } from "@/domain/dojo-mirror";
import type {
  DojoLevelId,
  DojoPersonalMirrorMetric,
} from "@/domain/dojo-types";
import type {
  FixedCommitment,
  Transaction,
  UserProfile,
  VaultItem,
} from "@/domain/types";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { playMirrorReveal, playTap } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PersonalMirrorCardProps {
  levelId: DojoLevelId;
  profile: UserProfile | null;
  transactions: Transaction[];
  fixedCommitments: FixedCommitment[];
  vaultItems: VaultItem[];
  referenceDate: Date;
  timeZone: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  muted: boolean;
  onContinue: () => void;
}

const TONE_STYLES: Record<
  DojoPersonalMirrorMetric["tone"],
  { card: string; value: string; badge: string }
> = {
  positive: {
    card: "border-emerald-200 bg-emerald-50/70",
    value: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800",
  },
  caution: {
    card: "border-amber-200 bg-amber-50/70",
    value: "text-amber-900",
    badge: "bg-amber-100 text-amber-800",
  },
  neutral: {
    card: "border-slate-200 bg-white",
    value: "text-slate-900",
    badge: "bg-slate-100 text-slate-700",
  },
};

export function PersonalMirrorCard({
  levelId,
  profile,
  transactions,
  fixedCommitments,
  vaultItems,
  referenceDate,
  timeZone,
  isLoading = false,
  isError = false,
  onRetry,
  muted,
  onContinue,
}: PersonalMirrorCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);
  const { formatAmount } = useDisplayPreference();

  const revealSoundPlayedRef = useRef(false);

  const mirror = useMemo(() => {
    if (isLoading || isError) return null;
    return buildDojoPersonalMirror(levelId, {
      profile,
      transactions,
      fixedCommitments,
      vaultItems,
      referenceDate,
      timeZone,
    });
  }, [
    isLoading,
    isError,
    levelId,
    profile,
    transactions,
    fixedCommitments,
    vaultItems,
    referenceDate,
    timeZone,
  ]);

  useEffect(() => {
    if (!isLoading && !isError && mirror && !revealSoundPlayedRef.current) {
      revealSoundPlayedRef.current = true;
      playMirrorReveal(muted);
    }
  }, [isLoading, isError, mirror, muted]);

  const currency = profile?.currency ?? "INR";
  const hourlyRateMinor = profile?.hourlyRateMinor;

  const formatMetricDisplay = (
    metric: DojoPersonalMirrorMetric
  ): { primary: string; secondary?: string } => {
    const hasFiniteNumber =
      metric.numericValue !== null &&
      typeof metric.numericValue === "number" &&
      Number.isFinite(metric.numericValue);

    switch (metric.valueType) {
      case "money_minor": {
        if (hasFiniteNumber) {
          return {
            primary: formatAmount(
              metric.numericValue as number,
              currency,
              hourlyRateMinor
            ),
            ...(metric.textValue ? { secondary: metric.textValue } : {}),
          };
        }
        return { primary: metric.textValue ?? "Not available" };
      }
      case "percent": {
        if (hasFiniteNumber) {
          return {
            primary: `${Math.round(metric.numericValue as number)}%`,
            ...(metric.textValue ? { secondary: metric.textValue } : {}),
          };
        }
        return { primary: metric.textValue ?? "Not enough data" };
      }
      case "count": {
        if (hasFiniteNumber) {
          const integerVal = Math.trunc(metric.numericValue as number);
          const formattedInt = String(integerVal);
          return {
            primary: formattedInt,
            ...(metric.textValue && metric.textValue !== formattedInt
              ? { secondary: metric.textValue }
              : {}),
          };
        }
        return { primary: metric.textValue ?? "0" };
      }
      case "text":
      default: {
        return {
          primary:
            metric.textValue ??
            (hasFiniteNumber ? String(metric.numericValue) : "—"),
        };
      }
    }
  };

  const handleContinueClick = () => {
    playTap(muted);
    onContinue();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Badge
          variant="outline"
          className="gap-1 border-emerald-200 bg-emerald-50 text-[11px] font-bold uppercase tracking-wider text-emerald-800"
        >
          <Wallet className="h-3 w-3" aria-hidden="true" />
          Beat 3 · Personal Mirror
        </Badge>
      </div>

      {/* Loading State — never fabricate metrics while queries resolve */}
      {isLoading && (
        <Card
          className="border-slate-200/80 bg-white"
          aria-busy="true"
          aria-label="Loading your live wallet mirror"
        >
          <CardContent className="space-y-4 p-5">
            <div className="h-5 w-48 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            </div>
            <p className="text-xs text-slate-500">
              Analyzing your live StopBucks ledger and commitments...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Non-blocking Error State */}
      {!isLoading && isError && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <h2 className="text-base font-bold text-amber-950">
                  Personal mirror could not be loaded
                </h2>
                <p className="text-xs leading-relaxed text-amber-900">
                  We could not retrieve your live wallet records right now, so we
                  have withheld personal metrics rather than showing incomplete data.
                  You can retry loading your mirror or continue straight to the
                  Mastery Check.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onRetry && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="gap-1.5 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry Mirror
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolved Live Mirror */}
      {!isLoading && !isError && mirror && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.28 }}
        >
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    YOUR LIVE WALLET MIRROR
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    {mirror.headline}
                  </h2>
                </div>

                {mirror.hasLiveSignal ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Live Ledger Signal
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    Starter Baseline
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed text-slate-700">
                {mirror.insight}
              </p>

              {/* Metric Tiles */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {mirror.metrics.map((metric) => {
                  const tone = TONE_STYLES[metric.tone];
                  const formatted = formatMetricDisplay(metric);
                  return (
                    <div
                      key={metric.label}
                      className={cn(
                        "rounded-xl border p-3.5 transition-colors",
                        tone.card
                      )}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {metric.label}
                      </div>
                      <div
                        className={cn(
                          "mt-1.5 text-lg font-extrabold tabular-nums tracking-tight",
                          tone.value
                        )}
                      >
                        {formatted.primary}
                      </div>
                      {formatted.secondary && (
                        <div className="mt-1 text-xs font-medium text-slate-600">
                          {formatted.secondary}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Zero-Guilt Empty-Signal Encouragement vs Live Action Link */}
              {!mirror.hasLiveSignal ? (
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-slate-700">
                    No stress if your ledger is fresh today — this mirror
                    personalizes automatically as you log everyday purchases,
                    fixed bills, or Vault pauses.
                  </p>
                  <Link
                    href={mirror.actionLink.href}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                  >
                    <span>{mirror.actionLink.label}</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5">
                  <span className="text-xs font-medium text-slate-600">
                    Computed from your live non-future {timeZone} ledger.
                  </span>
                  <Link
                    href={mirror.actionLink.href}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800 focus-visible:outline-none focus-visible:underline"
                  >
                    <span>{mirror.actionLink.label}</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Primary Continue CTA (Available even on mirror error so lesson isn't blocked) */}
      <div className="pt-1">
        <Button
          type="button"
          onClick={handleContinueClick}
          className="h-12 w-full gap-2 border-b-[3px] border-b-sky-800 bg-sky-600 text-sm font-bold text-white hover:bg-sky-500 active:translate-y-px sm:text-base"
        >
          <span>Got It — Test My Mastery</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
