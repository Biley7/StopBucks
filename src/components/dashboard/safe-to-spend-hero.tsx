"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CalendarClock, CheckCircle2, Gauge, Wallet } from "lucide-react";
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
    badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
    amount: "text-emerald-950",
    icon: CheckCircle2,
  },
  tight_runway: {
    badge: "border-amber-200 bg-amber-100 text-amber-800",
    bar: "bg-amber-500",
    amount: "text-amber-950",
    icon: AlertTriangle,
  },
  overspent: {
    badge: "border-red-200 bg-red-100 text-red-800",
    bar: "bg-red-500",
    amount: "text-red-950",
    icon: AlertCircle,
  },
} as const;

export function SafeToSpendHero({ runway, profile }: SafeToSpendHeroProps) {
  const { formatAmount } = useDisplayPreference();
  const pace = getRunwayPaceStatus(runway);
  const styles = STATUS_STYLES[pace.status];
  const StatusIcon = styles.icon;
  const clampedPct = Math.min(100, Math.max(0, pace.spentPercentOfBudget));

  const dailyBaselineMinor = Math.round(
    runway.consumptionBudgetMinor / Math.max(1, runway.daysInMonth)
  );
  const averageDailySpendMinor = Math.round(
    runway.monthToDateConsumptionMinor / Math.max(1, runway.currentDayOfMonth)
  );

  return (
    <Card className="overflow-hidden border-slate-200/80">
      <CardHeader className="gap-3 bg-gradient-to-br from-sky-50/75 via-white to-white pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
              Safe to Spend Today
            </CardDescription>
            <CardTitle
              as="h2"
              className={`mt-1 text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl ${styles.amount}`}
            >
              {formatAmount(
                runway.safeToSpendTodayMinor,
                profile.currency,
                profile.hourlyRateMinor
              )}
            </CardTitle>
            <p className="mt-1 text-xs tabular-nums text-slate-600">
              Recalculated across {runway.daysRemainingInMonth} remaining day
              {runway.daysRemainingInMonth === 1 ? "" : "s"} in this month.
            </p>
          </div>

          <Badge className={`${styles.badge} gap-1.5 px-3 py-1 text-xs font-semibold`}>
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{pace.label}</span>
          </Badge>
        </div>

        <p className="text-xs leading-relaxed text-slate-600">{pace.description}</p>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-600">
            <span>Consumption budget used</span>
            <span className="tabular-nums font-semibold text-slate-700">
              {pace.spentPercentOfBudget}% · linear pace {pace.expectedPercentOfBudget}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Consumption budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={clampedPct}
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200/90"
          >
            <div
              className={`h-full rounded-full transition-all ${styles.bar}`}
              style={{ width: `${clampedPct}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-3 pt-4 lg:grid-cols-4">
        <Metric
          icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Days remaining"
          value={String(runway.daysRemainingInMonth)}
        />
        <Metric
          icon={<Wallet className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Consumption budget"
          value={formatAmount(
            runway.consumptionBudgetMinor,
            profile.currency,
            profile.hourlyRateMinor
          )}
        />
        <Metric
          icon={<Gauge className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Average daily spend"
          value={formatAmount(
            averageDailySpendMinor,
            profile.currency,
            profile.hourlyRateMinor
          )}
        />
        <Metric
          icon={<Gauge className="h-3.5 w-3.5" aria-hidden="true" />}
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
    <div className="min-w-0 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="shrink-0">{icon}</span>
        <span className="leading-tight">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-bold text-slate-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}
