"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Info, RefreshCw, ShieldCheck } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { queryKeys } from "@/lib/query-keys";
import { analyzeBiases, calculateDailyRunway, getLocalDateParts } from "@/domain/behavioral-engine";
import {
  filterTransactionsByMonth,
  getEndOfMonthDate,
  type MonthYear,
} from "@/domain/runway-insights";
import { BiasRadarChart } from "@/components/bias-radar/bias-radar-chart";
import { BiasCards } from "@/components/bias-radar/bias-cards";
import { WeeklyCoach } from "@/components/bias-radar/weekly-coach";
import { MonthSwitcher } from "@/components/shared/month-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClientTimeZone } from "@/lib/timezone";

export default function RadarPage() {
  const { repository, cacheIdentity, activeMode } = useRepository();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(cacheIdentity),
    queryFn: () => repository.getProfile(),
    enabled: activeMode !== "none",
  });

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions(cacheIdentity),
    queryFn: () => repository.getTransactions(),
    enabled: activeMode !== "none",
  });

  const profile = profileQuery.data;
  const transactions = transactionsQuery.data ?? [];
  const referenceDate = useMemo(() => new Date(), []);
  const timeZone = useMemo(getClientTimeZone, []);

  const currentMonthParts = useMemo(
    () => getLocalDateParts(referenceDate, timeZone),
    [referenceDate, timeZone]
  );
  const currentMonth: MonthYear = useMemo(
    () => ({ year: currentMonthParts.year, month: currentMonthParts.month }),
    [currentMonthParts.year, currentMonthParts.month]
  );
  const [selectedMonth, setSelectedMonth] = useState<MonthYear>(currentMonth);

  const isCurrentMonth =
    selectedMonth.year === currentMonth.year &&
    selectedMonth.month === currentMonth.month;

  const analysisTransactions = useMemo(
    () =>
      filterTransactionsByMonth(
        transactions,
        selectedMonth.year,
        selectedMonth.month,
        timeZone
      ),
    [transactions, selectedMonth.year, selectedMonth.month, timeZone]
  );

  const bias = useMemo(
    () => (profile ? analyzeBiases(profile, analysisTransactions, timeZone) : null),
    [profile, analysisTransactions, timeZone]
  );

  const endOfMonthDate = useMemo(
    () => getEndOfMonthDate(selectedMonth.year, selectedMonth.month, timeZone),
    [selectedMonth.year, selectedMonth.month, timeZone]
  );

  const runway = useMemo(
    () =>
      profile
        ? calculateDailyRunway(
            profile,
            isCurrentMonth ? transactions : analysisTransactions,
            isCurrentMonth ? referenceDate : endOfMonthDate,
            timeZone
          )
        : null,
    [profile, isCurrentMonth, transactions, analysisTransactions, referenceDate, endOfMonthDate, timeZone]
  );

  if (profileQuery.isLoading || transactionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-3" />
        </div>
        <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (profileQuery.isError || transactionsQuery.isError) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-base font-semibold text-slate-900">Could not load the radar</h2>
        <p className="mt-1 text-xs text-slate-500">
          Your data is intact. Retry, or reload the module.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => {
            profileQuery.refetch();
            transactionsQuery.refetch();
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </Card>
    );
  }

  if (!profile || !bias || !runway) {
    return (
      <Card className="border-amber-200 bg-amber-50 p-6">
        <h2 className="text-base font-semibold text-amber-900">Set your baseline first</h2>
        <p className="mt-1 text-xs text-amber-700">
          Behavioral analysis needs a budget baseline to compare your spending against.
        </p>
        <Button asChild size="sm" className="mt-4 bg-amber-600 hover:bg-amber-700">
          <Link href="/onboarding">Complete baseline</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Why do I spend?
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Four deterministic detectors · {analysisTransactions.length} transaction
            {analysisTransactions.length === 1 ? "" : "s"} analysed
          </p>
        </div>
        <MonthSwitcher
          selectedMonth={selectedMonth}
          currentMonth={currentMonth}
          onChange={setSelectedMonth}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <BiasRadarChart bias={bias} />
        </div>
        <div className="lg:col-span-3">
          <BiasCards bias={bias} profile={profile} />
        </div>
      </div>

      {isCurrentMonth ? (
        <WeeklyCoach bias={bias} runway={runway} profile={profile} />
      ) : (
        <Card className="border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <Info className="h-4 w-4 text-slate-400 shrink-0" />
            <p className="font-medium">
              Weekly coaching experiments are available for the active month. Historical months are view-only.
            </p>
          </div>
        </Card>
      )}

      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold text-emerald-950">
              Deterministic zero-guilt guidance
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-emerald-800">
            Rule-based insights computed locally from your own transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700">
            {bias.deterministicAdvice.map((advice, index) => (
              <li key={index}>{advice}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
