"use client";

import React from "react";
import { AlertOctagon, AlertTriangle, Calendar, CheckCircle2, CreditCard, Moon, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedProgressBar } from "@/components/shared/motion-primitives";
import { useDisplayPreference } from "@/lib/display-preference-context";
import type { BiasAnalysisResult, BiasMetric, UserProfile } from "@/domain/types";

interface BiasCardsProps {
  bias: BiasAnalysisResult;
  profile: UserProfile;
}

interface BiasCardDefinition {
  key: string;
  title: string;
  icon: React.ReactNode;
  metric: BiasMetric;
}

const LEVEL_LABELS = {
  low: "Low",
  moderate: "Moderate",
  high: "High Risk",
} as const;

const LEVEL_TONES = {
  low: "bg-emerald-100 text-emerald-800",
  moderate: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
} as const;

const LEVEL_ICONS = {
  low: CheckCircle2,
  moderate: AlertTriangle,
  high: AlertOctagon,
} as const;

export function BiasCards({ bias, profile }: BiasCardsProps) {
  const { formatAmount } = useDisplayPreference();

  const definitions: BiasCardDefinition[] = [
    {
      key: "late-night",
      title: "Present Bias / Late-Night Drift",
      icon: <Moon className="h-4 w-4 text-indigo-600" aria-hidden="true" />,
      metric: bias.lateNightDrift,
    },
    {
      key: "cashless",
      title: "Cashless Numbness",
      icon: <CreditCard className="h-4 w-4 text-sky-600" aria-hidden="true" />,
      metric: bias.cashlessNumbness,
    },
    {
      key: "payday",
      title: "Early-Month Windfall Burn",
      icon: <Calendar className="h-4 w-4 text-amber-600" aria-hidden="true" />,
      metric: bias.paydayBurn,
    },
    {
      key: "fomo",
      title: "Social FOMO Ratio",
      icon: <Users className="h-4 w-4 text-rose-600" aria-hidden="true" />,
      metric: bias.socialFomo,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {definitions.map((definition) => {
        const { metric } = definition;
        const LevelIcon = LEVEL_ICONS[metric.level];
        return (
          <Card key={definition.key} className="flex flex-col border-slate-200/80">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {definition.icon}
                  <CardTitle as="h2" className="text-sm font-semibold leading-snug">
                    {definition.title}
                  </CardTitle>
                </div>
                <Badge
                  className={`${LEVEL_TONES[metric.level]} shrink-0 gap-1 border-transparent text-[10px]`}
                >
                  <LevelIcon className="h-3 w-3" aria-hidden="true" />
                  {LEVEL_LABELS[metric.level]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-2 text-xs text-slate-600">
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
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11px] tabular-nums text-slate-600">
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

                <p className="text-[11px] leading-relaxed text-slate-500">
                  {metric.interpretation}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
