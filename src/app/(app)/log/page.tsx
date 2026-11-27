"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { queryKeys } from "@/lib/query-keys";
import { QuickLogForm } from "@/components/quick-log/quick-log-form";
import { TransactionLedger } from "@/components/quick-log/transaction-ledger";
import { FadeInSection } from "@/components/shared/motion-primitives";
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

  const fixedCommitmentsQuery = useQuery({
    queryKey: queryKeys.fixedCommitments(cacheIdentity),
    queryFn: () => repository.getFixedCommitments(),
    enabled: activeMode !== "none",
  });

  if (
    profileQuery.isLoading ||
    transactionsQuery.isLoading ||
    fixedCommitmentsQuery.isLoading
  ) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Loading transaction log">
        <div className="space-y-1.5">
          <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
      </div>
    );
  }

  if (
    profileQuery.isError ||
    transactionsQuery.isError ||
    fixedCommitmentsQuery.isError
  ) {
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
            fixedCommitmentsQuery.refetch();
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </Card>
    );
  }

  const profile = profileQuery.data;
  const fixedCommitments = fixedCommitmentsQuery.data ?? [];
  const totalFixedMinor = fixedCommitments.reduce(
    (sum, fc) => sum + fc.amountMinor,
    0
  );

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
        <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
          Capture the trigger behind the spend, not just the amount.
        </p>
      </div>

      <FadeInSection>
        <QuickLogForm
          profile={profile}
          transactions={transactionsQuery.data ?? []}
          fixedCommitmentsMinor={totalFixedMinor}
        />
      </FadeInSection>

      <FadeInSection delay={0.06}>
        <TransactionLedger
          profile={profile}
          transactions={transactionsQuery.data ?? []}
          isLoading={transactionsQuery.isFetching}
        />
      </FadeInSection>
    </div>
  );
}
