"use client";

import React from "react";
import { Flame, Scale, Sprout } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AnimatedProgressBar,
  RollingNumber,
} from "@/components/shared/motion-primitives";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { getConsumptionProgressPercent, TRIGGER_LABELS } from "@/domain/runway-insights";
import { categorizeTransactions } from "@/domain/behavioral-engine";
import type { RunwayMetrics, Transaction, TriggerTag, UserProfile } from "@/domain/types";

interface MentalAccountingProps {
  runway: RunwayMetrics;
  profile: UserProfile;
  transactions: Transaction[];
}

const CONSUMPTION_TRIGGERS: TriggerTag[] = [
  "need",
  "convenience",
  "stress_late_night",
  "social_fomo",
];

export function MentalAccounting({ runway, profile, transactions }: MentalAccountingProps) {
  const { formatAmount } = useDisplayPreference();
  const { consumption } = categorizeTransactions(transactions);

  const byTrigger = new Map<TriggerTag, number>();
  for (const trigger of CONSUMPTION_TRIGGERS) byTrigger.set(trigger, 0);
  for (const tx of consumption) {
    byTrigger.set(tx.triggerTag, (byTrigger.get(tx.triggerTag) ?? 0) + tx.amountMinor);
  }

  const consumedPercent = getConsumptionProgressPercent(runway);
  const remainingInvestmentMinor = Math.max(
    0,
    runway.selfInvestTargetMinor - runway.monthToDateSelfInvestMinor
  );
  const investmentProgress =
    runway.selfInvestTargetMinor > 0
      ? Math.min(
          100,
          Math.round(
            (runway.monthToDateSelfInvestMinor / runway.selfInvestTargetMinor) * 100
          )
        )
      : 0;

  return (
    <div className="space-y-4">
      {/* True Disposable Runway Allocation breakdown */}
      <Card className="border-slate-900/[0.08] bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-600/15 bg-sky-50 text-sky-700">
              <Scale className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle as="h2" className="text-base text-slate-900">
                True Disposable Runway Allocation
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Monthly Budget − Fixed Bills Reserved − Invest-in-Self Protected = True Disposable Consumption Pool
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <div className="min-w-0 rounded-xl border border-slate-900/[0.05] bg-slate-50/90 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Monthly Budget
              </div>
              <div className="mt-1 truncate text-sm font-bold tabular-nums tracking-[-0.025em] text-slate-900">
                <RollingNumber
                  value={formatAmount(
                    runway.monthlyBudgetMinor,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}
                  hierarchy="subtle"
                />
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">Total nominal budget</p>
            </div>

            <div className="min-w-0 rounded-xl border border-rose-600/15 bg-slate-50/90 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                − Fixed Bills Reserved
              </div>
              <div className="mt-1 truncate text-sm font-bold tabular-nums tracking-[-0.025em] text-rose-700">
                <RollingNumber
                  value={formatAmount(
                    runway.fixedCommitmentsMinor,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}
                  hierarchy="subtle"
                  symbolClassName="text-rose-500/75"
                  decimalClassName="text-rose-500/75"
                />
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">Unavoidable commitments</p>
            </div>

            <div className="min-w-0 rounded-xl border border-emerald-600/15 bg-slate-50/90 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                − Invest-in-Self
              </div>
              <div className="mt-1 truncate text-sm font-bold tabular-nums tracking-[-0.025em] text-emerald-700">
                <RollingNumber
                  value={formatAmount(
                    runway.selfInvestTargetMinor,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}
                  hierarchy="subtle"
                  symbolClassName="text-emerald-600/75"
                  decimalClassName="text-emerald-600/75"
                />
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">Ring-fenced growth</p>
            </div>

            <div className="min-w-0 rounded-xl border border-sky-600/20 bg-sky-50/50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-800">
                = Disposable Pool
              </div>
              <div className="mt-1 truncate text-sm font-extrabold tabular-nums tracking-[-0.025em] text-slate-900">
                <RollingNumber
                  value={formatAmount(
                    runway.consumptionBudgetMinor,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}
                  hierarchy="subtle"
                />
              </div>
              <p className="mt-0.5 text-[11px] text-sky-800">Actual consumption pool</p>
            </div>
          </div>

          {runway.consumptionBudgetMinor === 0 && (
            <div className="rounded-xl border border-amber-600/20 bg-amber-50/70 p-2.5 text-xs text-amber-900">
              Fixed commitments and protected investment account for your entire monthly budget. Your disposable consumption pool is {formatAmount(0, profile.currency, profile.hourlyRateMinor)}.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Consumption burn */}
        <Card className="min-w-0 border-slate-900/[0.08] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-600/15 bg-amber-50 text-amber-600">
                <Flame className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <CardTitle as="h2" className="text-base">Consumption Burn</CardTitle>
                <CardDescription className="text-xs">
                  Lifestyle spending that draws down your runway.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <Stat
                label="Consumed this month"
                value={formatAmount(
                  runway.monthToDateConsumptionMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              />
              <Stat
                label="Consumption budget"
                value={formatAmount(
                  runway.consumptionBudgetMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              />
              <Stat
                label="Remaining"
                value={formatAmount(
                  runway.remainingConsumptionMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              />
              <Stat label="Budget consumed" value={`${consumedPercent}%`} hierarchy="none" />
            </div>

            <div className="space-y-2 border-t border-slate-900/[0.06] pt-3">
              {CONSUMPTION_TRIGGERS.map((trigger) => (
                <div
                  key={trigger}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-slate-600">{TRIGGER_LABELS[trigger]}</span>
                  <span className="font-medium tabular-nums tracking-[-0.025em] text-slate-900">
                    <RollingNumber
                      value={formatAmount(
                        byTrigger.get(trigger) ?? 0,
                        profile.currency,
                        profile.hourlyRateMinor
                      )}
                      hierarchy="subtle"
                    />
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invest-in-self */}
        <Card className="border-emerald-600/20 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-600/15 bg-emerald-50 text-emerald-700">
                <Sprout className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <CardTitle as="h2" className="text-base text-slate-900">
                  Invest-in-Self Capital
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Books, courses and health never shrink your runway.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <Stat
                label="Invested this month"
                value={formatAmount(
                  runway.monthToDateSelfInvestMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              />
              <Stat
                label="Monthly target"
                value={formatAmount(
                  runway.selfInvestTargetMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              />
              <Stat
                label="Target remaining"
                value={formatAmount(
                  remainingInvestmentMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              />
              <Stat
                label="Growth-to-Burn"
                value={`${runway.growthToBurnRatio}x`}
                hierarchy="none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                <span>Self-investment goal progress</span>
                <span className="font-semibold tabular-nums text-emerald-700">
                  {investmentProgress}%
                </span>
              </div>
              <AnimatedProgressBar
                value={investmentProgress}
                ariaLabel="Self-investment goal progress"
                trackClassName="bg-emerald-100/80"
                barClassName="bg-emerald-500"
              />
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              {runway.monthToDateSelfInvestMinor > 0
                ? "Every rupee here compounds into capability. That is capital, not burn."
                : "Your self-investment target is untouched so far. A course, a book or a gym pass still fits."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hierarchy = "subtle",
}: {
  label: string;
  value: string;
  hierarchy?: "none" | "subtle";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-900/[0.05] bg-slate-50/90 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums tracking-[-0.025em] text-slate-900">
        <RollingNumber value={value} hierarchy={hierarchy} />
      </p>
    </div>
  );
}
