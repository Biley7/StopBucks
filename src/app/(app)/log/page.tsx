"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { queryKeys } from "@/lib/query-keys";
import { QuickLogForm } from "@/components/quick-log/quick-log-form";
import { TransactionLedger } from "@/components/quick-log/transaction-ledger";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QuickLogPage() {
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

  if (profileQuery.isLoading || transactionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (profileQuery.isError || transactionsQuery.isError) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-base font-semibold text-slate-900">Could not load the ledger</h2>
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

  const profile = profileQuery.data;

  if (!profile) {
    return (
      <Card className="border-amber-200 bg-amber-50 p-6">
        <h2 className="text-base font-semibold text-amber-900">Set your baseline first</h2>
        <p className="mt-1 text-xs text-amber-700">
          Your runway needs a budget and hourly rate before expenses can be logged.
        </p>
        <Button asChild size="sm" className="mt-4 bg-amber-600 hover:bg-amber-700">
          <Link href="/onboarding">Complete baseline</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Log an expense
        </h1>
        <p className="text-xs text-slate-500 sm:text-sm">
          Capture the trigger behind the spend, not just the amount.
        </p>
      </div>

      <QuickLogForm profile={profile} transactions={transactionsQuery.data ?? []} />

      <TransactionLedger
        profile={profile}
        transactions={transactionsQuery.data ?? []}
        isLoading={transactionsQuery.isFetching}
      />
    </div>
  );
}
