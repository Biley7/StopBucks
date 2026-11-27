"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { queryKeys } from "@/lib/query-keys";
import { calculateMoneyRescuedMinor } from "@/domain/runway-insights";
import { ParkImpulseForm } from "@/components/vault/park-impulse-form";
import { CoolingItemCard } from "@/components/vault/cooling-item-card";
import { VaultHistory } from "@/components/vault/vault-history";
import { ImpulseSimulatorDialog } from "@/components/shared/impulse-simulator-dialog";
import type { VaultItem } from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ResolutionAction = "rescued" | "purchased";

export default function VaultPage() {
  const { repository, isGuest, cacheIdentity, activeMode } = useRepository();
  const { formatAmount } = useDisplayPreference();
  const queryClient = useQueryClient();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(cacheIdentity),
    queryFn: () => repository.getProfile(),
    enabled: activeMode !== "none",
  });

  const vaultQuery = useQuery({
    queryKey: queryKeys.vaultItems(cacheIdentity),
    queryFn: () => repository.getVaultItems(),
    enabled: activeMode !== "none",
  });

  const invalidateVaultData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.vaultItems(cacheIdentity) });
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions(cacheIdentity) });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile(cacheIdentity) });
  };

  const resolveMutation = useMutation({
    mutationFn: async (input: { item: VaultItem; action: ResolutionAction }) => {
      if (input.action === "rescued") {
        return repository.resolveVaultItem(input.item.id, { status: "rescued" });
      }
      const result = await repository.resolveVaultPurchase(input.item.id);
      return result.item;
    },
    onMutate: (input) => {
      setActiveItemId(input.item.id);
    },
    onSuccess: (item, input) => {
      toast.success(
        input.action === "rescued"
          ? "Money rescued — nothing was spent."
          : "Purchase recorded in your ledger.",
        {
          description:
            input.action === "rescued"
              ? `${item.itemName} stays out of your runway.`
              : `${item.itemName} created exactly one transaction.`,
        }
      );
      invalidateVaultData();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not resolve this vault item."
      );
    },
    onSettled: () => {
      setActiveItemId(null);
    },
  });

  const simulateMutation = useMutation({
    mutationFn: (item: VaultItem) => repository.simulateVaultUnlock(item.id),
    onMutate: (item) => setActiveItemId(item.id),
    onSuccess: () => {
      toast.success("Demo: 48 hours have elapsed.");
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultItems(cacheIdentity) });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not simulate the cool-off."
      );
    },
    onSettled: () => setActiveItemId(null),
  });

  if (profileQuery.isLoading || vaultQuery.isLoading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Loading cool-off vault">
        <div className="space-y-1.5">
          <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
        </div>
      </div>
    );
  }

  if (profileQuery.isError || vaultQuery.isError) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-base font-semibold text-slate-900">Could not load the vault</h2>
        <p className="mt-1 text-xs text-slate-500">
          Your saved items are intact. Retry, or reload the module.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => {
            profileQuery.refetch();
            vaultQuery.refetch();
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
          The vault translates prices using your currency and hourly rate.
        </p>
        <Button asChild size="sm" className="mt-4 bg-amber-600 hover:bg-amber-700">
          <Link href="/onboarding">Complete baseline</Link>
        </Button>
      </Card>
    );
  }

  const vaultItems = vaultQuery.data ?? [];
  const cooling = vaultItems.filter((item) => item.status === "cooling");
  const resolved = vaultItems.filter((item) => item.status !== "cooling");
  const moneyRescuedMinor = calculateMoneyRescuedMinor(vaultItems);
  const coolingTotalMinor = cooling.reduce((sum, item) => sum + item.priceMinor, 0);
  const rescuedCount = resolved.filter((item) => item.status === "rescued").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            48-Hour Cool-Off Vault
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
            Pause mindless impulse. Protect self-investment.
          </p>
        </div>
        <ImpulseSimulatorDialog
          profile={profile}
          trigger={
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-sky-200 text-sky-800 hover:bg-sky-50 self-start sm:self-auto"
            >
              <Sparkles className="h-4 w-4 text-sky-600" aria-hidden="true" />
              Should I Buy This?
            </Button>
          }
        />
      </div>

      {/* Money Rescued hero */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Money Rescued
            </CardDescription>
          </div>
          <CardTitle as="h2" className="text-3xl font-extrabold tracking-tight tabular-nums text-emerald-950 sm:text-4xl">
            {formatAmount(moneyRescuedMinor, profile.currency, profile.hourlyRateMinor)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs tabular-nums text-emerald-900">
          <span>
            {rescuedCount} impulse{rescuedCount === 1 ? "" : "s"} released after cooling
          </span>
          {cooling.length > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
              {cooling.length} currently cooling (
              {formatAmount(coolingTotalMinor, profile.currency, profile.hourlyRateMinor)})
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Still available for your runway or self-investment.
          </span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ParkImpulseForm currency={profile.currency} />

        <Card className="min-w-0 border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle as="h2" className="text-base">Cooling Off</CardTitle>
            <CardDescription className="text-xs">
              {cooling.length === 0
                ? "Nothing is cooling right now."
                : `${cooling.length} impulse${cooling.length === 1 ? "" : "s"} waiting for perspective.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cooling.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">Vault is clear</p>
                <p className="mt-1 text-xs text-slate-500">
                  Park something from the left when an impulse shows up.
                </p>
              </div>
            ) : (
              cooling.map((item) => (
                <CoolingItemCard
                  key={item.id}
                  item={item}
                  profile={profile}
                  isGuest={isGuest}
                  isResolving={resolveMutation.isPending && activeItemId === item.id}
                  isSimulating={simulateMutation.isPending && activeItemId === item.id}
                  onRescue={(target) =>
                    resolveMutation.mutate({ item: target, action: "rescued" })
                  }
                  onPurchase={(target) =>
                    resolveMutation.mutate({ item: target, action: "purchased" })
                  }
                  onSimulate={(target) => simulateMutation.mutate(target)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <VaultHistory items={resolved} profile={profile} />
    </div>
  );
}
