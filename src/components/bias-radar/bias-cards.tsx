"use client";

import React from "react";
import { Calendar, CreditCard, Moon, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function BiasCards({ bias, profile }: BiasCardsProps) {
  const { formatAmount } = useDisplayPreference();

  const definitions: BiasCardDefinition[] = [
    {
      key: "late-night",
      title: "Present Bias / Late-Night Drift",
      icon: <Moon className="h-4 w-4 text-indigo-600" />,
      metric: bias.lateNightDrift,
    },
    {
      key: "cashless",
      title: "Cashless Numbness",
      icon: <CreditCard className="h-4 w-4 text-sky-600" />,
      metric: bias.cashlessNumbness,
    },
    {
      key: "payday",
      title: "Early-Month Windfall Burn",
      icon: <Calendar className="h-4 w-4 text-amber-600" />,
      metric: bias.paydayBurn,
    },
    {
      key: "fomo",
      title: "Social FOMO Ratio",
      icon: <Users className="h-4 w-4 text-rose-600" />,
      metric: bias.socialFomo,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {definitions.map((definition) => {
        const { metric } = definition;
        return (
          <Card key={definition.key} className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {definition.icon}
                  <CardTitle className="text-sm font-semibold leading-snug">
                    {definition.title}
                  </CardTitle>
                </div>
                <Badge
                  className={`${LEVEL_TONES[metric.level]} border-transparent text-[10px]`}
                >
                  {LEVEL_LABELS[metric.level]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      metric.level === "high"
                        ? "bg-rose-500"
                        : metric.level === "moderate"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, metric.score))}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-800">
                  {metric.score}
                </span>
              </div>

              <p className="leading-relaxed">{metric.evidenceSummary}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                <span>
                  {metric.count} transaction{metric.count === 1 ? "" : "s"}
                </span>
                <span className="tabular-nums">
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
