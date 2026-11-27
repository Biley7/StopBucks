"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AnimatedProgressBar,
  RollingNumber,
} from "@/components/shared/motion-primitives";
import { useDisplayPreference } from "@/lib/display-preference-context";
import type { TriggerBreakdownEntry } from "@/domain/runway-insights";
import type { UserProfile } from "@/domain/types";

interface TriggerBreakdownProps {
  entries: TriggerBreakdownEntry[];
  profile: UserProfile;
}

const BAR_COLORS: Record<string, string> = {
  need: "bg-slate-500",
  convenience: "bg-amber-500",
  stress_late_night: "bg-indigo-500",
  social_fomo: "bg-rose-500",
  invest_self: "bg-emerald-500",
};

export function TriggerBreakdown({ entries, profile }: TriggerBreakdownProps) {
  const { formatAmount } = useDisplayPreference();
  const hasSpending = entries.some((entry) => entry.totalMinor > 0);

  return (
    <Card className="border-slate-900/[0.08]">
      <CardHeader className="pb-2">
        <CardTitle as="h2" className="text-base">Behavioral Trigger Breakdown</CardTitle>
        <CardDescription className="text-xs">
          Consumption triggers are measured against consumption spend; invest-in-self
          against total spend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSpending ? (
          <p className="rounded-xl border border-dashed border-slate-900/[0.12] bg-slate-50/90 px-4 py-8 text-center text-xs text-slate-500">
            No spending recorded yet. Trigger patterns appear after your first log.
          </p>
        ) : (
          <div className="space-y-3.5">
            {entries.map((entry) => (
              <div key={entry.trigger}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                  <span className="font-medium text-slate-800">{entry.label}</span>
                  <span className="tabular-nums tracking-[-0.025em] text-slate-700">
                    <RollingNumber
                      value={formatAmount(
                        entry.totalMinor,
                        profile.currency,
                        profile.hourlyRateMinor
                      )}
                      hierarchy="subtle"
                    />{" "}
                    <span className="text-[11px] text-slate-500">
                      · {entry.count} txn{entry.count === 1 ? "" : "s"}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <AnimatedProgressBar
                    value={entry.percentage}
                    ariaLabel={`${entry.label} percentage`}
                    trackClassName="flex-1 bg-slate-100"
                    barClassName={BAR_COLORS[entry.trigger] ?? "bg-sky-500"}
                  />
                  <span className="w-28 shrink-0 text-right text-[11px] tabular-nums text-slate-500 sm:w-32">
                    {entry.percentage}% of{" "}
                    {entry.denominator === "consumption" ? "consumption" : "total"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
