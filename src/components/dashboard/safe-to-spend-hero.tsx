"use client";

import React from "react";
import { CalendarClock, Gauge, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { getRunwayPaceStatus } from "@/domain/runway-insights";
import type { RunwayMetrics, UserProfile } from "@/domain/types";

interface SafeToSpendHeroProps {
  runway: RunwayMetrics;
  profile: UserProfile;
}

const STATUS_STYLES = {
  on_track: {
    badge: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
    amount: "text-emerald-950",
  },
  tight_runway: {
    badge: "bg-amber-100 text-amber-800",
    bar: "bg-amber-500",
    amount: "text-amber-950",
  },
  overspent: {
    badge: "bg-red-100 text-red-800",
    bar: "bg-red-500",
    amount: "text-red-950",
  },
} as const;

export function SafeToSpendHero({ runway, profile }: SafeToSpendHeroProps) {
  const { formatAmount } = useDisplayPreference();
  const pace = getRunwayPaceStatus(runway);
  const styles = STATUS_STYLES[pace.status];

  const dailyBaselineMinor = Math.round(
    runway.consumptionBudgetMinor / Math.max(1, runway.daysInMonth)
  );
  const averageDailySpendMinor = Math.round(
    runway.monthToDateConsumptionMinor / Math.max(1, runway.currentDayOfMonth)
  );

  return (
    <Card className="overflow-hidden border-slate-200">
      <CardHeader className="gap-3 bg-gradient-to-br from-sky-50/80 via-white to-white pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
              Safe to Spend Today
            </CardDescription>
            <CardTitle className={`mt-1 text-3xl font-extrabold sm:text-4xl ${styles.amount}`}>
              {formatAmount(
                runway.safeToSpendTodayMinor,
                profile.currency,
                profile.hourlyRateMinor
              )}
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Recalculated across {runway.daysRemainingInMonth} remaining day
              {runway.daysRemainingInMonth === 1 ? "" : "s"} in this month.
            </p>
          </div>

          <Badge className={`${styles.badge} px-3 py-1 text-xs font-semibold`}>
            {pace.label}
          </Badge>
        </div>

        <p className="text-xs text-slate-600">{pace.description}</p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Consumption budget used</span>
            <span className="tabular-nums">
              {pace.spentPercentOfBudget}% · linear pace {pace.expectedPercentOfBudget}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${styles.bar}`}
              style={{ width: `${pace.spentPercentOfBudget}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-4 pt-4 lg:grid-cols-4">
        <Metric
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Days remaining"
          value={String(runway.daysRemainingInMonth)}
        />
        <Metric
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Consumption budget"
          value={formatAmount(
            runway.consumptionBudgetMinor,
            profile.currency,
            profile.hourlyRateMinor
          )}
        />
        <Metric
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Average daily spend"
          value={formatAmount(
            averageDailySpendMinor,
            profile.currency,
            profile.hourlyRateMinor
          )}
        />
        <Metric
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Daily baseline"
          value={formatAmount(
            dailyBaselineMinor,
            profile.currency,
            profile.hourlyRateMinor
          )}
        />
      </CardContent>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}
