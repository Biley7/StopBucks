"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Moon,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AnimatedProgressBar,
  FINTECH_EASE,
} from "@/components/shared/motion-primitives";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { formatMinorUnits } from "@/domain/currency";
import type { BiasAnalysisResult, BiasMetric, UserProfile } from "@/domain/types";
import { cn } from "@/lib/utils";

interface BiasCardsProps {
  bias: BiasAnalysisResult;
  profile: UserProfile;
}

interface BiasCardDefinition {
  key: string;
  title: string;
  icon: React.ReactNode;
  metric: BiasMetric;
  actionHref: string;
  actionLabel: string;
}

const LEVEL_LABELS = {
  low: "Low",
  moderate: "Moderate",
  high: "High Risk",
} as const;

const LEVEL_TONES = {
  low: "bg-emerald-50 text-emerald-800 border-emerald-600/20",
  moderate: "bg-amber-50 text-amber-800 border-amber-600/20",
  high: "bg-rose-50 text-rose-800 border-rose-600/20",
} as const;

const LEVEL_ICONS = {
  low: CheckCircle2,
  moderate: AlertTriangle,
  high: AlertOctagon,
} as const;

export function BiasCards({ bias, profile }: BiasCardsProps) {
  const { formatAmount } = useDisplayPreference();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);
  const baseId = useId();

  const definitions: BiasCardDefinition[] = [
    {
      key: "late-night",
      title: "Present Bias / Late-Night Drift",
      icon: <Moon className="h-4 w-4 text-indigo-600" aria-hidden="true" />,
      metric: bias.lateNightDrift,
      actionHref: "/vault",
      actionLabel: "Park late-night wants in Vault",
    },
    {
      key: "cashless",
      title: "Cashless Numbness",
      icon: <CreditCard className="h-4 w-4 text-sky-600" aria-hidden="true" />,
      metric: bias.cashlessNumbness,
      actionHref: "/log",
      actionLabel: "Review cashless taps in Log",
    },
    {
      key: "payday",
      title: "Early-Month Windfall Burn",
      icon: <Calendar className="h-4 w-4 text-amber-600" aria-hidden="true" />,
      metric: bias.paydayBurn,
      actionHref: "/runway",
      actionLabel: "Check linear pace on Runway",
    },
    {
      key: "fomo",
      title: "Social FOMO Ratio",
      icon: <Users className="h-4 w-4 text-rose-600" aria-hidden="true" />,
      metric: bias.socialFomo,
      actionHref: "/log",
      actionLabel: "Inspect social logs",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {definitions.map((definition) => {
        const { metric } = definition;
        const LevelIcon = LEVEL_ICONS[metric.level];
        const isExpanded = expandedKey === definition.key;
        const panelId = `${baseId}-${definition.key}`;

        return (
          <Card
            key={definition.key}
            className={cn(
              "flex flex-col border-slate-900/[0.08] bg-white transition-colors duration-150",
              isExpanded && "border-sky-600/30"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {definition.icon}
                  <CardTitle as="h2" className="text-sm font-semibold leading-snug">
                    {definition.title}
                  </CardTitle>
                </div>
                <Badge
                  className={`${LEVEL_TONES[metric.level]} shrink-0 gap-1 border text-[10px]`}
                >
                  <LevelIcon className="h-3 w-3" aria-hidden="true" />
                  {LEVEL_LABELS[metric.level]}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col justify-between space-y-2.5 text-xs text-slate-600">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AnimatedProgressBar
                    value={metric.score}
                    ariaLabel={`${definition.title} score`}
                    className="h-1.5"
                    trackClassName="flex-1 bg-slate-100"
                    barClassName={
                      metric.level === "high"
                        ? "bg-rose-500"
                        : metric.level === "moderate"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }
                  />
                  <span className="w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-800">
                    {metric.score}/100
                  </span>
                </div>

                <p className="leading-relaxed">{metric.evidenceSummary}</p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/[0.06] pt-2 text-[11px] tabular-nums text-slate-600">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      {metric.count} transaction{metric.count === 1 ? "" : "s"}
                    </span>
                    <span className="font-medium text-slate-800">
                      {formatAmount(
                        metric.totalAmountMinor,
                        profile.currency,
                        profile.hourlyRateMinor
                      )}
                    </span>
                    <span>{metric.percentage}% share</span>
                  </div>

                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() =>
                      setExpandedKey((prev) =>
                        prev === definition.key ? null : definition.key
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-[0.98] cursor-pointer"
                  >
                    <span>{isExpanded ? "Less" : "Details"}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-150 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
                        isExpanded && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-500">
                  {metric.interpretation}
                </p>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      id={panelId}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -3 }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { duration: 0.18, ease: FINTECH_EASE }
                      }
                      className="space-y-2.5 rounded-xl border border-slate-900/[0.05] bg-slate-50/90 p-3 text-[11px]"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Currency
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatMinorUnits(
                              metric.totalAmountMinor,
                              profile.currency,
                              "currency",
                              profile.hourlyRateMinor
                            )}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Work Hours
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatMinorUnits(
                              metric.totalAmountMinor,
                              profile.currency,
                              "work_hours",
                              profile.hourlyRateMinor
                            )}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            4-Yr Cost
                          </span>
                          <span className="font-semibold tabular-nums text-emerald-700">
                            {formatMinorUnits(
                              metric.totalAmountMinor,
                              profile.currency,
                              "compounded_4yr",
                              profile.hourlyRateMinor
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/[0.06] pt-2">
                        <span className="text-slate-600">
                          Detector: <strong className="text-slate-900">{metric.name}</strong> ({metric.score}/100)
                        </span>
                        <Link
                          href={definition.actionHref}
                          className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-sm"
                        >
                          <span>{definition.actionLabel}</span>
                          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
