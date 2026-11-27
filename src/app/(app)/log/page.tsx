"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { queryKeys } from "@/lib/query-keys";
import { QuickLogForm } from "@/components/quick-log/quick-log-form";
import { TransactionLedger } from "@/components/quick-log/transaction-ledger";
import { FadeInSection, ShimmerBlock } from "@/components/shared/motion-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/domain/types";

export default function QuickLogPage() {
  const { repository, cacheIdentity, activeMode } = useRepository();
  const [confirmedTxId, setConfirmedTxId] = useState<string | null>(null);
  const confirmTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current !== null) {
        window.clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  const handleTransactionCreated = (created: Transaction) => {
    setConfirmedTxId(created.id);
    if (confirmTimerRef.current !== null) {
      window.clearTimeout(confirmTimerRef.current);
    }
    confirmTimerRef.current = window.setTimeout(() => {
      setConfirmedTxId((current) => (current === created.id ? null : current));
      confirmTimerRef.current = null;
    }, 3400);
  };

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
        <div className="space-y-2">
          <ShimmerBlock className="h-7 w-44" />
          <ShimmerBlock className="h-4 w-72 bg-slate-200/50" />
        </div>
        <div className="rounded-2xl border border-slate-900/[0.08] bg-white p-6 space-y-3">
          <ShimmerBlock className="h-5 w-36" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <ShimmerBlock className="h-10 flex-1 rounded-lg bg-slate-100" />
            <ShimmerBlock className="h-10 w-28 rounded-lg" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-900/[0.08] bg-white p-6 space-y-4">
          <ShimmerBlock className="h-5 w-32" />
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((idx) => (
              <ShimmerBlock key={idx} className="h-9 w-28 rounded-full bg-slate-100" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ShimmerBlock className="h-10 rounded-lg bg-slate-100" />
            <ShimmerBlock className="h-10 rounded-lg bg-slate-100" />
          </div>
          <ShimmerBlock className="h-24 rounded-xl bg-slate-50" />
        </div>
        <div className="rounded-2xl border border-slate-900/[0.08] bg-white p-6 space-y-3">
          <ShimmerBlock className="h-5 w-40" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ShimmerBlock className="h-9 rounded-lg bg-slate-100" />
            <ShimmerBlock className="h-9 rounded-lg bg-slate-100" />
            <ShimmerBlock className="h-9 rounded-lg bg-slate-100" />
            <ShimmerBlock className="h-9 rounded-lg bg-slate-100" />
          </div>
          {[0, 1, 2, 3].map((row) => (
            <ShimmerBlock key={row} className="h-12 rounded-xl bg-slate-100" />
          ))}
        </div>
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
      <Card className="border-amber-600/20 bg-amber-50/70 p-6">
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
          onTransactionCreated={handleTransactionCreated}
        />
      </FadeInSection>

      <FadeInSection delay={0.06}>
        <TransactionLedger
          profile={profile}
          transactions={transactionsQuery.data ?? []}
          isLoading={transactionsQuery.isFetching}
          confirmedTransactionId={confirmedTxId}
        />
      </FadeInSection>
    </div>
  );
}
