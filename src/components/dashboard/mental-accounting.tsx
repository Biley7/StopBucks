"use client";

import React from "react";
import { Flame, Sprout } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Consumption burn */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Consumption Burn</CardTitle>
              <CardDescription className="text-xs">
                Lifestyle spending that draws down your runway.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
            <Stat label="Budget consumed" value={`${consumedPercent}%`} />
          </div>

          <div className="space-y-2">
            {CONSUMPTION_TRIGGERS.map((trigger) => (
              <div
                key={trigger}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-slate-600">{TRIGGER_LABELS[trigger]}</span>
                <span className="font-medium tabular-nums text-slate-900">
                  {formatAmount(
                    byTrigger.get(trigger) ?? 0,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invest-in-self */}
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Sprout className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-emerald-950">
                Invest-in-Self Capital
              </CardTitle>
              <CardDescription className="text-xs text-emerald-800">
                Books, courses and health never shrink your runway.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
            <Stat label="Growth-to-Burn" value={`${runway.growthToBurnRatio}x`} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-emerald-900">
              <span>Self-investment goal progress</span>
              <span className="tabular-nums">{investmentProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${investmentProgress}%` }}
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-emerald-900">
            {runway.monthToDateSelfInvestMinor > 0
              ? "Every rupee here compounds into capability. That is capital, not burn."
              : "Your self-investment target is untouched so far. A course, a book or a gym pass still fits."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
