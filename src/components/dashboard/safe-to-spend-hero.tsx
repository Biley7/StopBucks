"use client";

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Gauge,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedProgressBar } from "@/components/shared/motion-primitives";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { getRunwayPaceStatus } from "@/domain/runway-insights";
import type { RunwayMetrics, UserProfile } from "@/domain/types";

interface SafeToSpendHeroProps {
  runway: RunwayMetrics;
  profile: UserProfile;
}

const STATUS_STYLES = {
  on_track: {
    badge: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
    bar: "bg-emerald-400",
    amount: "text-white",
    accentLabel: "text-emerald-300",
    icon: CheckCircle2,
  },
  tight_runway: {
    badge: "border-amber-400/30 bg-amber-500/15 text-amber-200",
    bar: "bg-amber-400",
    amount: "text-amber-100",
    accentLabel: "text-amber-300",
    icon: AlertTriangle,
  },
  overspent: {
    badge: "border-rose-400/30 bg-rose-500/15 text-rose-200",
    bar: "bg-rose-400",
    amount: "text-rose-100",
    accentLabel: "text-rose-300",
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
    <Card className="relative overflow-hidden border-slate-800/90 bg-slate-900 text-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.45)]">
      {/* Subtle architectural grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]"
      />

      <CardHeader className="relative gap-3.5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardDescription
              className={`text-[11px] font-semibold uppercase tracking-wider ${styles.accentLabel}`}
            >
              Safe to Spend Today
            </CardDescription>
            <CardTitle
              as="h2"
              className={`mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl lg:text-[2.65rem] lg:leading-none ${styles.amount}`}
            >
              {formatAmount(
                runway.safeToSpendTodayMinor,
                profile.currency,
                profile.hourlyRateMinor
              )}
            </CardTitle>
            <p className="mt-2 text-xs tabular-nums text-slate-300">
              Recalculated across {runway.daysRemainingInMonth} remaining day
              {runway.daysRemainingInMonth === 1 ? "" : "s"} in this month.
            </p>
          </div>

          <Badge
            variant="outline"
            className={`${styles.badge} gap-1.5 px-3 py-1 text-xs font-semibold`}
          >
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{pace.label}</span>
          </Badge>
        </div>

        <p className="text-xs leading-relaxed text-slate-300">{pace.description}</p>

        <div className="space-y-2 pt-0.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-300">
            <span>Consumption budget used</span>
            <span className="font-semibold tabular-nums text-white">
              {pace.spentPercentOfBudget}% · linear pace {pace.expectedPercentOfBudget}%
            </span>
          </div>
          <AnimatedProgressBar
            value={clampedPct}
            ariaLabel="Consumption budget used"
            trackClassName="h-2.5 bg-slate-800 ring-1 ring-white/10"
            barClassName={styles.bar}
          />
        </div>
      </CardHeader>

      <CardContent className="relative grid grid-cols-2 gap-3 border-t border-white/10 pt-4 lg:grid-cols-4">
        <Metric
          icon={<CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
          label="Days remaining"
          value={String(runway.daysRemainingInMonth)}
        />
        <Metric
          icon={<Wallet className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
          label="Consumption budget"
          value={formatAmount(
            runway.consumptionBudgetMinor,
            profile.currency,
            profile.hourlyRateMinor
          )}
        />
        <Metric
          icon={<Gauge className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
          label="Average daily spend"
          value={formatAmount(
            averageDailySpendMinor,
            profile.currency,
            profile.hourlyRateMinor
          )}
        />
        <Metric
          icon={<Gauge className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
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
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <span className="shrink-0">{icon}</span>
        <span className="leading-tight">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-sm font-bold tabular-nums text-white sm:text-base">
        {value}
      </p>
    </div>
  );
}
