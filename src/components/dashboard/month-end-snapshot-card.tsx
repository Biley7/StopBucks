"use client";

import React from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Flame,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedProgressBar } from "@/components/shared/motion-primitives";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { TRIGGER_LABELS } from "@/domain/runway-insights";
import type { MonthEndSnapshot } from "@/domain/runway-insights";
import type { UserProfile } from "@/domain/types";
import { cn } from "@/lib/utils";

interface MonthEndSnapshotCardProps {
  snapshot: MonthEndSnapshot;
  profile: UserProfile;
}

export function MonthEndSnapshotCard({
  snapshot,
  profile,
}: MonthEndSnapshotCardProps) {
  const { formatAmount } = useDisplayPreference();

  const dateForFormatting = new Date(snapshot.year, snapshot.month - 1, 1);
  const monthName = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(dateForFormatting);

  const consumptionPercent =
    snapshot.consumptionBudgetMinor > 0
      ? Math.round(
        (snapshot.totalConsumptionMinor / snapshot.consumptionBudgetMinor) * 100
      )
      : 0;

  const investPercent =
    profile.selfInvestTargetMinor > 0
      ? Math.round(
        (snapshot.totalSelfInvestMinor / profile.selfInvestTargetMinor) * 100
      )
      : 0;

  const isInvestTargetReached =
    snapshot.totalSelfInvestMinor >= profile.selfInvestTargetMinor &&
    profile.selfInvestTargetMinor > 0;

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle as="h2" className="text-base text-slate-900">
                Month-End Snapshot · {monthName}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Completed historical financial summary · {snapshot.transactionCount}{" "}
                transaction{snapshot.transactionCount === 1 ? "" : "s"} recorded
              </CardDescription>
            </div>
          </div>

          <div>
            {snapshot.isSurplus ? (
              <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1">
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                SURPLUS +
                {formatAmount(
                  snapshot.surplusOrDeficitMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              </Badge>
            ) : snapshot.isDeficit ? (
              <Badge className="border-rose-200 bg-rose-100 text-rose-800 text-xs font-semibold px-2.5 py-1">
                <TrendingDown className="mr-1 h-3.5 w-3.5" />
                DEFICIT -
                {formatAmount(
                  Math.abs(snapshot.surplusOrDeficitMinor),
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              </Badge>
            ) : (
              <Badge className="border-slate-200 bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1">
                <Scale className="mr-1 h-3.5 w-3.5" />
                BALANCED
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metric tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Consumption tile */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Consumption Spend
              </span>
              <Flame className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-1 text-sm font-bold tabular-nums text-slate-900 sm:text-base">
              {formatAmount(
                snapshot.totalConsumptionMinor,
                profile.currency,
                profile.hourlyRateMinor
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              of{" "}
              {formatAmount(
                snapshot.consumptionBudgetMinor,
                profile.currency,
                profile.hourlyRateMinor
              )}{" "}
              budget ({consumptionPercent}%)
            </p>
            <AnimatedProgressBar
              value={consumptionPercent}
              ariaLabel="Historical month consumption used"
              className="mt-2 h-1.5"
              trackClassName="bg-slate-200"
              barClassName={snapshot.isDeficit ? "bg-rose-500" : "bg-sky-500"}
            />
          </div>

          {/* Invest-in-Self tile */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                Invest-in-Self
              </span>
              {isInvestTargetReached ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>
            <div className="mt-1 text-sm font-bold tabular-nums text-emerald-900 sm:text-base">
              {formatAmount(
                snapshot.totalSelfInvestMinor,
                profile.currency,
                profile.hourlyRateMinor
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-700">
              of{" "}
              {formatAmount(
                profile.selfInvestTargetMinor,
                profile.currency,
                profile.hourlyRateMinor
              )}{" "}
              target ({investPercent}%)
            </p>
            <AnimatedProgressBar
              value={investPercent}
              ariaLabel="Historical month self-investment progress"
              className="mt-2 h-1.5"
              trackClassName="bg-emerald-100"
              barClassName="bg-emerald-500"
            />
          </div>

          {/* Growth-to-burn ratio tile */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Growth-to-Burn
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-1 text-sm font-bold tabular-nums text-slate-900 sm:text-base">
              {snapshot.growthToBurnRatio.toFixed(2)}x
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {snapshot.growthToBurnRatio >= 0.25
                ? "Strong growth investment"
                : "Higher consumption burn"}
            </p>
          </div>

          {/* Top Trigger tile */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Top Consumption
              </span>
              <Scale className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-1 truncate text-sm font-bold text-slate-900 sm:text-base">
              {snapshot.topTrigger ? TRIGGER_LABELS[snapshot.topTrigger] : "None"}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {snapshot.topTrigger ? "Primary consumption driver" : "Zero consumption logged"}
            </p>
          </div>
        </div>

        {/* Informative footer statement */}
        <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
          <p>
            {snapshot.isSurplus ? (
              <>
                You closed {monthName} with a{" "}
                <span className="font-semibold text-emerald-700">
                  {formatAmount(
                    snapshot.surplusOrDeficitMinor,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}{" "}
                  surplus
                </span>
                .{" "}
                {isInvestTargetReached
                  ? "You achieved 100% of your self-investment target!"
                  : "Great discipline on everyday consumption."}
              </>
            ) : snapshot.isDeficit ? (
              <>
                You closed {monthName} with a{" "}
                <span className="font-semibold text-rose-700">
                  {formatAmount(
                    Math.abs(snapshot.surplusOrDeficitMinor),
                    profile.currency,
                    profile.hourlyRateMinor
                  )}{" "}
                  deficit
                </span>
                . Check your trigger breakdown below to identify what drove the overrun.
              </>
            ) : (
              <>
                You closed {monthName} exactly balanced with your nominal consumption budget.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
