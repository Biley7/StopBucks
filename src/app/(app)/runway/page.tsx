"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, Hourglass, PlusCircle, RefreshCw } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { queryKeys } from "@/lib/query-keys";
import { calculateDailyRunway } from "@/domain/behavioral-engine";
import {
  buildDailyBurnSeries,
  buildTriggerBreakdown,
} from "@/domain/runway-insights";
import { SafeToSpendHero } from "@/components/dashboard/safe-to-spend-hero";
import { MentalAccounting } from "@/components/dashboard/mental-accounting";
import { DailyBurnChart } from "@/components/dashboard/daily-burn-chart";
import { TriggerBreakdown } from "@/components/dashboard/trigger-breakdown";
import type { Transaction, UserProfile } from "@/domain/types";
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

  const isLoading = profileQuery.isLoading || transactionsQuery.isLoading;
  const isError = profileQuery.isError || transactionsQuery.isError;
  const profile = profileQuery.data ?? null;
  const transactions = transactionsQuery.data ?? [];

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

  return <RunwayDashboard profile={profile} transactions={transactions} />;
}

function RunwayDashboard({
  profile,
  transactions,
}: {
  profile: UserProfile;
  transactions: Transaction[];
}) {
  const { formatAmount } = useDisplayPreference();
  const [referenceDate, setReferenceDate] = React.useState(() => new Date());
  const timeZone = React.useMemo(getClientTimeZone, []);
  React.useEffect(() => {
    const interval = window.setInterval(() => setReferenceDate(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const runway = calculateDailyRunway(profile, transactions, referenceDate, timeZone);
  const series = buildDailyBurnSeries(
    runway.consumptionBudgetMinor,
    transactions,
    referenceDate,
    timeZone
  );
  const triggerEntries = buildTriggerBreakdown(transactions);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            How much can I safely spend today?
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            {profile.currency} · {runway.daysRemainingInMonth} days left ·{" "}
            {formatAmount(
              runway.remainingConsumptionMinor,
              profile.currency,
              profile.hourlyRateMinor
            )}{" "}
            remaining consumption budget
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/onboarding">Adjust baseline</Link>
        </Button>
      </div>

      <SafeToSpendHero runway={runway} profile={profile} />
      <MentalAccounting runway={runway} profile={profile} transactions={transactions} />
      <DailyBurnChart series={series} profile={profile} />
      <TriggerBreakdown entries={triggerEntries} profile={profile} />

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/log"
          icon={<PlusCircle className="h-4 w-4" />}
          title="Log an expense"
          description="Capture the amount and the trigger behind it."
        />
        <QuickAction
          href="/vault"
          icon={<Hourglass className="h-4 w-4" />}
          title="Pause an impulse"
          description="Park it for 48 hours before deciding."
        />
        <QuickAction
          href="/radar"
          icon={<Compass className="h-4 w-4" />}
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
      className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/40"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
          {title}
          <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600" />
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
    </Link>
  );
}

function RunwaySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
