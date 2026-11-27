"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, Hourglass, PlusCircle, RefreshCw, Sparkles } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { queryKeys } from "@/lib/query-keys";
import { calculateDailyRunway, getLocalDateParts } from "@/domain/behavioral-engine";
import {
  buildDailyBurnSeries,
  buildMonthEndSnapshot,
  buildTriggerBreakdown,
  filterTransactionsByMonth,
  getEndOfMonthDate,
  type MonthYear,
} from "@/domain/runway-insights";
import { SafeToSpendHero } from "@/components/dashboard/safe-to-spend-hero";
import { MonthEndSnapshotCard } from "@/components/dashboard/month-end-snapshot-card";
import { MonthSwitcher } from "@/components/shared/month-switcher";
import { MentalAccounting } from "@/components/dashboard/mental-accounting";
import { DailyBurnChart } from "@/components/dashboard/daily-burn-chart";
import { TriggerBreakdown } from "@/components/dashboard/trigger-breakdown";
import { FixedCommitmentsCard } from "@/components/dashboard/fixed-commitments-card";
import { ImpulseSimulatorDialog } from "@/components/shared/impulse-simulator-dialog";
import type { FixedCommitment, Transaction, UserProfile } from "@/domain/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClientTimeZone } from "@/lib/timezone";

export default function RunwayPage() {
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

  const fixedCommitmentsQuery = useQuery({
    queryKey: queryKeys.fixedCommitments(cacheIdentity),
    queryFn: () => repository.getFixedCommitments(),
    enabled: activeMode !== "none",
  });

  const isLoading =
    profileQuery.isLoading ||
    transactionsQuery.isLoading ||
    fixedCommitmentsQuery.isLoading;
  const isError =
    profileQuery.isError ||
    transactionsQuery.isError ||
    fixedCommitmentsQuery.isError;
  const profile = profileQuery.data ?? null;
  const transactions = transactionsQuery.data ?? [];
  const fixedCommitments = fixedCommitmentsQuery.data ?? [];

  if (isLoading) {
    return <RunwaySkeleton />;
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-base font-semibold text-slate-900">
          We could not load your runway
        </h2>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
          Your data is intact. Try again, or reload the workspace module.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => {
            profileQuery.refetch();
            transactionsQuery.refetch();
            fixedCommitmentsQuery.refetch();
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="border-amber-200 bg-amber-50 p-6">
        <h2 className="text-base font-semibold text-amber-900">Baseline profile needed</h2>
        <p className="mt-1 text-xs text-amber-700">
          Complete the four-input baseline to calculate your daily runway.
        </p>
        <Button asChild size="sm" className="mt-4 bg-amber-600 hover:bg-amber-700">
          <Link href="/onboarding">Complete baseline</Link>
        </Button>
      </Card>
    );
  }

  return (
    <RunwayDashboard
      profile={profile}
      transactions={transactions}
      fixedCommitments={fixedCommitments}
    />
  );
}

function RunwayDashboard({
  profile,
  transactions,
  fixedCommitments,
}: {
  profile: UserProfile;
  transactions: Transaction[];
  fixedCommitments: FixedCommitment[];
}) {
  const { formatAmount } = useDisplayPreference();
  const [referenceDate, setReferenceDate] = React.useState(() => new Date());
  const timeZone = React.useMemo(getClientTimeZone, []);
  React.useEffect(() => {
    const interval = window.setInterval(() => setReferenceDate(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const totalFixedMinor = fixedCommitments.reduce(
    (sum, fc) => sum + fc.amountMinor,
    0
  );

  const currentParts = getLocalDateParts(referenceDate, timeZone);
  const currentMonth: MonthYear = React.useMemo(
    () => ({ year: currentParts.year, month: currentParts.month }),
    [currentParts.year, currentParts.month]
  );
  const [selectedMonth, setSelectedMonth] = React.useState<MonthYear>(currentMonth);

  const isCurrentMonth =
    selectedMonth.year === currentMonth.year &&
    selectedMonth.month === currentMonth.month;

  const liveRunway = calculateDailyRunway(
    profile,
    transactions,
    referenceDate,
    timeZone,
    totalFixedMinor
  );

  const monthTransactions = React.useMemo(
    () => filterTransactionsByMonth(transactions, selectedMonth.year, selectedMonth.month, timeZone),
    [transactions, selectedMonth.year, selectedMonth.month, timeZone]
  );

  const snapshot = React.useMemo(
    () =>
      buildMonthEndSnapshot(
        transactions,
        profile,
        totalFixedMinor,
        selectedMonth.year,
        selectedMonth.month,
        timeZone
      ),
    [transactions, profile, totalFixedMinor, selectedMonth.year, selectedMonth.month, timeZone]
  );

  const endOfMonthDate = React.useMemo(
    () => getEndOfMonthDate(selectedMonth.year, selectedMonth.month, timeZone),
    [selectedMonth.year, selectedMonth.month, timeZone]
  );

  const historicalRunway = React.useMemo(
    () =>
      calculateDailyRunway(
        profile,
        monthTransactions,
        endOfMonthDate,
        timeZone,
        totalFixedMinor
      ),
    [profile, monthTransactions, endOfMonthDate, timeZone, totalFixedMinor]
  );

  const effectiveRunway = isCurrentMonth ? liveRunway : historicalRunway;

  const series = React.useMemo(
    () =>
      buildDailyBurnSeries(
        effectiveRunway.consumptionBudgetMinor,
        isCurrentMonth ? transactions : monthTransactions,
        isCurrentMonth ? referenceDate : endOfMonthDate,
        timeZone
      ),
    [
      effectiveRunway.consumptionBudgetMinor,
      isCurrentMonth,
      transactions,
      monthTransactions,
      referenceDate,
      endOfMonthDate,
      timeZone,
    ]
  );

  const triggerEntries = React.useMemo(
    () => buildTriggerBreakdown(isCurrentMonth ? transactions : monthTransactions),
    [isCurrentMonth, transactions, monthTransactions]
  );

  const selectedMonthName = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(selectedMonth.year, selectedMonth.month - 1, 1));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {isCurrentMonth
              ? "How much can I safely spend today?"
              : `Runway Review · ${selectedMonthName}`}
          </h1>
          <p className="mt-0.5 text-xs tabular-nums text-slate-600 sm:text-sm">
            {isCurrentMonth ? (
              <>
                {profile.currency} · {liveRunway.daysRemainingInMonth} days left ·{" "}
                {formatAmount(
                  liveRunway.remainingConsumptionMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}{" "}
                remaining consumption budget
              </>
            ) : (
              <>
                {profile.currency} · Closed {selectedMonthName} ·{" "}
                {snapshot.transactionCount} transaction
                {snapshot.transactionCount === 1 ? "" : "s"} logged
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSwitcher
            selectedMonth={selectedMonth}
            currentMonth={currentMonth}
            onChange={setSelectedMonth}
          />
          {isCurrentMonth && (
            <Button asChild size="sm" variant="outline">
              <Link href="/onboarding">Adjust baseline</Link>
            </Button>
          )}
        </div>
      </div>

      {isCurrentMonth ? (
        <SafeToSpendHero runway={liveRunway} profile={profile} />
      ) : (
        <MonthEndSnapshotCard snapshot={snapshot} profile={profile} />
      )}
      <MentalAccounting
        runway={effectiveRunway}
        profile={profile}
        transactions={isCurrentMonth ? transactions : monthTransactions}
      />
      <FixedCommitmentsCard profile={profile} />
      <DailyBurnChart series={series} profile={profile} />
      <TriggerBreakdown entries={triggerEntries} profile={profile} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ImpulseSimulatorDialog
          profile={profile}
          runwayMetrics={effectiveRunway}
          trigger={
            <button
              type="button"
              className="group flex w-full items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-left shadow-2xs transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-sm font-semibold text-slate-900">Should I Buy This?</h3>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-sky-500 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
                <p className="mt-0.5 text-xs leading-snug text-slate-600">
                  Simulate days of runway consumed before you spend.
                </p>
              </div>
            </button>
          }
        />
        <QuickAction
          href="/log"
          icon={<PlusCircle className="h-4 w-4" aria-hidden="true" />}
          title="Log an expense"
          description="Capture the amount and the trigger behind it."
        />
        <QuickAction
          href="/vault"
          icon={<Hourglass className="h-4 w-4" aria-hidden="true" />}
          title="Pause an impulse"
          description="Park it for 48 hours before deciding."
        />
        <QuickAction
          href="/radar"
          icon={<Compass className="h-4 w-4" aria-hidden="true" />}
          title="View behavioral insights"
          description="See which patterns shape your spending."
        />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-colors hover:border-sky-300 hover:bg-sky-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-1 text-sm font-semibold text-slate-900">
          <span className="truncate">{title}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600" aria-hidden="true" />
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{description}</span>
      </span>
    </Link>
  );
}

function RunwaySkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading daily runway">
      <div className="space-y-1.5">
        <div className="h-7 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-52 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
      <div className="h-36 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
        <div className="h-56 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
      </div>
    </div>
  );
}
