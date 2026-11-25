"use client";

import React, { useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Hourglass,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { queryKeys } from "@/lib/query-keys";
import { parseAmountStringToMinor } from "@/domain/expense-parser";
import { calculateDailyRunway } from "@/domain/behavioral-engine";
import {
  simulateImpulseImpact,
  type ImpulseSeverity,
  type ImpulseSimulationResult,
} from "@/domain/impulse-simulator";
import { TRIGGER_LABELS, TRIGGER_ORDER } from "@/domain/runway-insights";
import type { RunwayMetrics, TriggerTag, UserProfile } from "@/domain/types";
import { getClientTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ImpulseSimulatorDialogProps {
  profile: UserProfile;
  runwayMetrics?: RunwayMetrics;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SEVERITY_STYLES: Record<
  ImpulseSeverity,
  {
    badgeClass: string;
    borderClass: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }
> = {
  protected_growth: {
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    borderClass: "border-emerald-200 bg-emerald-50/40",
    icon: ShieldCheck,
    label: "Protected Growth",
  },
  low_impact: {
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    borderClass: "border-sky-200 bg-sky-50/40",
    icon: CheckCircle2,
    label: "Low Impact",
  },
  moderate_hit: {
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    borderClass: "border-amber-200 bg-amber-50/40",
    icon: AlertTriangle,
    label: "Moderate Hit",
  },
  runway_shock: {
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    borderClass: "border-rose-200 bg-rose-50/40",
    icon: AlertOctagon,
    label: "Runway Shock",
  },
};

export function ImpulseSimulatorDialog({
  profile,
  runwayMetrics: externalRunwayMetrics,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ImpulseSimulatorDialogProps) {
  const { repository, cacheIdentity, activeMode } = useRepository();
  const { formatAmount } = useDisplayPreference();
  const queryClient = useQueryClient();
  const triggerGroupId = useId();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setIsOpen = (nextOpen: boolean) => {
    if (isControlled) {
      setControlledOpen?.(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
  };

  const [itemName, setItemName] = useState("");
  const [priceText, setPriceText] = useState("");
  const [triggerTag, setTriggerTag] = useState<TriggerTag>("convenience");
  const [actionError, setActionError] = useState<string | null>(null);

  // If external runwayMetrics is not supplied (e.g. opened from Vault), query transactions and fixed commitments
  const timeZone = useMemo(getClientTimeZone, []);
  const needsInternalRunway = !externalRunwayMetrics;

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions(cacheIdentity),
    queryFn: () => repository.getTransactions(),
    enabled: isOpen && needsInternalRunway && activeMode !== "none",
  });

  const fixedCommitmentsQuery = useQuery({
    queryKey: queryKeys.fixedCommitments(cacheIdentity),
    queryFn: () => repository.getFixedCommitments(),
    enabled: isOpen && needsInternalRunway && activeMode !== "none",
  });

  const effectiveRunwayMetrics: RunwayMetrics | null = useMemo(() => {
    if (externalRunwayMetrics) return externalRunwayMetrics;
    if (!profile) return null;

    const txs = transactionsQuery.data ?? [];
    const fcs = fixedCommitmentsQuery.data ?? [];
    const totalFixedMinor = fcs.reduce((sum, fc) => sum + fc.amountMinor, 0);

    return calculateDailyRunway(
      profile,
      txs,
      new Date(),
      timeZone,
      totalFixedMinor
    );
  }, [
    externalRunwayMetrics,
    profile,
    transactionsQuery.data,
    fixedCommitmentsQuery.data,
    timeZone,
  ]);

  // Price parsing
  const priceMinor = useMemo(() => {
    const trimmed = priceText.trim();
    if (!trimmed) return null;
    return parseAmountStringToMinor(trimmed);
  }, [priceText]);

  // Live simulation calculation
  const simulation: ImpulseSimulationResult | null = useMemo(() => {
    if (
      !effectiveRunwayMetrics ||
      priceMinor === null ||
      priceMinor <= 0 ||
      !Number.isSafeInteger(priceMinor) ||
      itemName.trim().length === 0
    ) {
      return null;
    }

    try {
      return simulateImpulseImpact({
        itemName,
        priceMinor,
        triggerTag,
        profile,
        runwayMetrics: effectiveRunwayMetrics,
      });
    } catch {
      return null;
    }
  }, [effectiveRunwayMetrics, priceMinor, itemName, triggerTag, profile]);

  const canExecuteAction =
    priceMinor !== null &&
    priceMinor > 0 &&
    Number.isSafeInteger(priceMinor) &&
    itemName.trim().length > 0;

  const resetForm = () => {
    setItemName("");
    setPriceText("");
    setTriggerTag("convenience");
    setActionError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    setIsOpen(nextOpen);
  };

  // Action A: Park in 48h Vault
  const parkMutation = useMutation({
    mutationFn: async () => {
      if (!priceMinor || !itemName.trim()) {
        throw new Error("Please specify an item name and valid price.");
      }
      return repository.addVaultItem({
        itemName: itemName.trim(),
        priceMinor,
        triggerTag,
      });
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaultItems(cacheIdentity),
      });
      toast.success("Impulse parked. You have 48 hours to reconsider.", {
        description: `${item.itemName} · ${formatAmount(
          item.priceMinor,
          profile.currency,
          profile.hourlyRateMinor
        )}`,
      });
      handleOpenChange(false);
    },
    onError: (err) => {
      setActionError(
        err instanceof Error ? err.message : "Failed to park in vault."
      );
    },
  });

  // Action B: Buy & Log Anyway
  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!priceMinor || !itemName.trim()) {
        throw new Error("Please specify an item name and valid price.");
      }
      return repository.addTransaction({
        amountMinor: priceMinor,
        note: itemName.trim(),
        triggerTag,
        paymentMode: "cashless",
      });
    },
    onSuccess: (tx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.transactions(cacheIdentity),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile(cacheIdentity),
      });
      toast.success("Purchase logged. Your runway has been updated.", {
        description: `${tx.note} · ${formatAmount(
          tx.amountMinor,
          profile.currency,
          profile.hourlyRateMinor
        )}`,
      });
      handleOpenChange(false);
    },
    onError: (err) => {
      setActionError(
        err instanceof Error ? err.message : "Failed to log purchase."
      );
    },
  });

  const isMutating = parkMutation.isPending || buyMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-h-[92vh] overflow-y-auto w-full max-w-lg p-5 sm:p-6">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 sm:text-lg">
                Should I Buy This?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                10-second purchase consequence simulator. See the real cost before spending.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Inputs Section */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:p-3.5">
            <div className="space-y-1">
              <Label htmlFor="sim-item-name" className="text-xs font-semibold text-slate-700">
                What are you considering buying?
              </Label>
              <Input
                id="sim-item-name"
                placeholder="e.g. Wireless earbuds, hoodie, late-night delivery"
                maxLength={100}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                disabled={isMutating}
                className="h-8 text-xs bg-white"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sim-price" className="text-xs font-semibold text-slate-700">
                Price ({profile.currency})
              </Label>
              <Input
                id="sim-price"
                inputMode="decimal"
                placeholder="0.00"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                disabled={isMutating}
                className="h-8 text-xs bg-white"
              />
              {priceText.trim().length > 0 && priceMinor === null && (
                <p className="text-[11px] text-red-600">
                  Please enter a valid positive monetary price.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                id={triggerGroupId}
                className="text-xs font-semibold text-slate-700"
              >
                Why are you buying this? (Psychological Trigger)
              </Label>
              <div
                role="group"
                aria-labelledby={triggerGroupId}
                className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
              >
                {TRIGGER_ORDER.map((tag) => {
                  const isSelected = triggerTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTriggerTag(tag)}
                      disabled={isMutating}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer",
                        isSelected
                          ? tag === "invest_self"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
                            : "border-sky-500 bg-sky-50 text-sky-900 font-semibold"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100/70"
                      )}
                    >
                      {TRIGGER_LABELS[tag]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Impact Panel */}
          {simulation ? (
            <div
              className={cn(
                "rounded-xl border p-4 space-y-3.5 transition-all",
                SEVERITY_STYLES[simulation.severity].borderClass
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 text-xs font-semibold px-2.5 py-0.5",
                      SEVERITY_STYLES[simulation.severity].badgeClass
                    )}
                  >
                    {React.createElement(
                      SEVERITY_STYLES[simulation.severity].icon,
                      { className: "h-3.5 w-3.5" }
                    )}
                    {SEVERITY_STYLES[simulation.severity].label}
                  </Badge>
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-700">
                  {formatAmount(
                    simulation.priceMinor,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}
                </span>
              </div>

              <p className="text-xs font-medium text-slate-800 leading-relaxed">
                {simulation.verdictExplanation}
              </p>

              {/* 4 Core Financial & Behavioral Answers */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* 1. Days of Runway Consumed */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>Runway Consumed</span>
                  </div>
                  <div className="mt-1 text-sm font-bold tabular-nums text-slate-900 sm:text-base">
                    {simulation.isProtectedSelfInvestment ? (
                      <span className="text-emerald-700">0.0 days</span>
                    ) : simulation.daysOfRunwayConsumed !== null ? (
                      `${simulation.daysOfRunwayConsumed.toFixed(1)} days`
                    ) : (
                      <span className="text-rose-700 text-xs">Exceeds runway</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {simulation.isProtectedSelfInvestment
                      ? "Protected from daily runway"
                      : "Daily allowances used"}
                  </p>
                </div>

                {/* 2. New Safe to Spend Today */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    New Safe-to-Spend
                  </div>
                  <div className="mt-1 text-sm font-bold tabular-nums text-slate-900 sm:text-base">
                    {formatAmount(
                      simulation.safeToSpendAfterMinor,
                      profile.currency,
                      profile.hourlyRateMinor
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {simulation.dailyDropMinor > 0 ? (
                      <span className="text-rose-600 font-medium">
                        −{formatAmount(simulation.dailyDropMinor, profile.currency, profile.hourlyRateMinor)}/day
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">No daily reduction</span>
                    )}
                  </p>
                </div>

                {/* 3. Hours of Work */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Hours of Work
                  </div>
                  <div className="mt-1 text-sm font-bold tabular-nums text-slate-900 sm:text-base">
                    {simulation.workHours !== null ? (
                      `${simulation.workHours.toFixed(1)} hrs`
                    ) : (
                      <span className="text-slate-400 text-xs">Rate unset</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    At {formatAmount(profile.hourlyRateMinor, profile.currency, profile.hourlyRateMinor)}/hr
                  </p>
                </div>

                {/* 4. 4-Year Compounded Opportunity Cost */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    <span>In 4 Years</span>
                  </div>
                  <div className="mt-1 text-sm font-bold tabular-nums text-emerald-700 sm:text-base">
                    {formatAmount(
                      simulation.compounded4YearMinor,
                      profile.currency,
                      profile.hourlyRateMinor
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    If invested at 8% annual return
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
              <p className="font-medium text-slate-700">
                Enter an item name and price above to simulate.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                We will calculate the exact days of runway consumed, daily Safe-to-Spend impact, and 4-year opportunity cost.
              </p>
            </div>
          )}

          {actionError && (
            <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
              {actionError}
            </div>
          )}

          {/* Two Direct Actions (Section 5) */}
          <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {/* Action A: Park in 48h Vault */}
            <Button
              type="button"
              variant="outline"
              disabled={!canExecuteAction || isMutating}
              onClick={() => parkMutation.mutate()}
              className="gap-1.5 text-xs h-9 order-2 sm:order-1 border-sky-200 text-sky-800 hover:bg-sky-50"
            >
              {parkMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Hourglass className="h-3.5 w-3.5 text-sky-600" />
              )}
              Park in 48h Vault (Recommended)
            </Button>

            {/* Action B: Buy & Log Anyway */}
            <Button
              type="button"
              disabled={!canExecuteAction || isMutating}
              onClick={() => buyMutation.mutate()}
              className="gap-1.5 text-xs h-9 order-1 sm:order-2 bg-slate-900 text-white hover:bg-slate-800"
            >
              {buyMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Buy & Log Anyway
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
