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
import {
  AnimatedProgressBar,
  RollingNumber,
} from "@/components/shared/motion-primitives";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { getRunwayPaceStatus } from "@/domain/runway-insights";
import type { RunwayMetrics, UserProfile } from "@/domain/types";

interface SafeToSpendHeroProps {
  runway: RunwayMetrics;
  profile: UserProfile;
}

const STATUS_STYLES = {
  on_track: {
    badge: "border-emerald-600/20 bg-emerald-50 text-emerald-800",
    bar: "bg-emerald-500",
    amount: "text-slate-900",
    symbolTone: "text-slate-400",
    accentLabel: "text-emerald-700",
    icon: CheckCircle2,
  },
  tight_runway: {
    badge: "border-amber-600/20 bg-amber-50 text-amber-800",
    bar: "bg-amber-500",
    amount: "text-amber-700",
    symbolTone: "text-amber-500/75",
    accentLabel: "text-amber-700",
    icon: AlertTriangle,
  },
  overspent: {
    badge: "border-rose-600/20 bg-rose-50 text-rose-800",
    bar: "bg-rose-500",
    amount: "text-rose-700",
    symbolTone: "text-rose-500/75",
    accentLabel: "text-rose-700",
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

  const heroFormatted = formatAmount(
    runway.safeToSpendTodayMinor,
    profile.currency,
    profile.hourlyRateMinor
  );

  return (
    <div className="relative">
      {/* Subtle ambient architectural backdrop behind the white hero card */}
      <div
        aria-hidden="true"
        className="hero-ambient-drift pointer-events-none absolute -inset-2 -z-0 overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_top_right,rgba(2,132,199,0.06),transparent_58%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.05),transparent_55%)]"
      />

      <Card className="relative z-10 overflow-hidden rounded-2xl border border-slate-900/[0.08] bg-white text-slate-900">
        {/* Ultra-faint architectural grid + slow restrained sheen strictly behind foreground content */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.025)_1px,transparent_1px)] [background-size:24px_24px]"
        />
        <div
          aria-hidden="true"
          className="hero-ambient-sheen pointer-events-none absolute inset-y-0 -left-1/3 z-0 w-2/3 bg-[radial-gradient(ellipse_at_center,rgba(2,132,199,0.045),transparent_70%)]"
        />

        <CardHeader className="relative z-10 gap-3.5 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardDescription
                className={`text-[11px] font-semibold uppercase tracking-wider ${styles.accentLabel}`}
              >
                Safe to Spend Today
              </CardDescription>
              <CardTitle
                as="h2"
                className={`mt-1.5 text-3xl font-extrabold tracking-[-0.025em] tabular-nums sm:text-4xl lg:text-[2.75rem] lg:leading-none ${styles.amount}`}
              >
                <RollingNumber
                  value={heroFormatted}
                  hierarchy="prominent"
                  symbolClassName={styles.symbolTone}
                  decimalClassName={styles.symbolTone}
                />
              </CardTitle>
              <p className="mt-2 text-xs tabular-nums text-slate-500">
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

          <p className="text-xs leading-relaxed text-slate-600">{pace.description}</p>

          <div className="space-y-2 pt-0.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
              <span>Consumption budget used</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {pace.spentPercentOfBudget}% · linear pace {pace.expectedPercentOfBudget}%
              </span>
            </div>
            <AnimatedProgressBar
              value={clampedPct}
              ariaLabel="Consumption budget used"
              trackClassName="h-2.5 bg-slate-100 ring-1 ring-slate-900/[0.06]"
              barClassName={styles.bar}
            />
          </div>
        </CardHeader>

        <CardContent className="relative z-10 grid grid-cols-2 gap-3 border-t border-slate-900/[0.06] pt-4 lg:grid-cols-4">
          <Metric
            icon={<CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
            label="Days remaining"
            value={String(runway.daysRemainingInMonth)}
            hierarchy="none"
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
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hierarchy = "subtle",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hierarchy?: "none" | "subtle";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-900/[0.05] bg-slate-50/90 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="shrink-0">{icon}</span>
        <span className="leading-tight">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-sm font-bold tabular-nums tracking-[-0.025em] text-slate-900 sm:text-base">
        <RollingNumber value={value} hierarchy={hierarchy} />
      </p>
    </div>
  );
}
