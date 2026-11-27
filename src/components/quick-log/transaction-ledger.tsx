"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { queryKeys } from "@/lib/query-keys";
import { getLocalDateParts } from "@/domain/behavioral-engine";
import { TRIGGER_LABELS, TRIGGER_ORDER } from "@/domain/runway-insights";
import { getClientTimeZone } from "@/lib/timezone";
import {
  buildTransactionsCsv,
  buildTransactionsCsvFilename,
  downloadCsv,
} from "@/lib/csv";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import type { PaymentMode, Transaction, TriggerTag, UserProfile } from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TransactionLedgerProps {
  profile: UserProfile;
  transactions: Transaction[];
  isLoading: boolean;
}

function formatTimeOnly(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TransactionLedger({
  profile,
  transactions,
  isLoading,
}: TransactionLedgerProps) {
  const { repository, cacheIdentity } = useRepository();
  const { formatAmount } = useDisplayPreference();
  const queryClient = useQueryClient();
  const timeZone = useMemo(getClientTimeZone, []);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<"all" | TriggerTag>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentMode>("all");
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const availableMonths = useMemo(() => {
    const monthKeys = new Set<string>();
    for (const tx of transactions) {
      const d = new Date(tx.loggedAt);
      if (isNaN(d.getTime())) continue;
      const parts = getLocalDateParts(d, timeZone);
      monthKeys.add(`${parts.year}-${String(parts.month).padStart(2, "0")}`);
    }
    return Array.from(monthKeys)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const [yearStr, monthStr] = key.split("-");
        const label = new Intl.DateTimeFormat(undefined, {
          month: "short",
          year: "numeric",
        }).format(new Date(Number(yearStr), Number(monthStr) - 1, 1));
        return { key, label };
      });
  }, [transactions, timeZone]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (query && !tx.note.toLowerCase().includes(query)) return false;
        if (triggerFilter !== "all" && tx.triggerTag !== triggerFilter) return false;
        if (paymentFilter !== "all" && tx.paymentMode !== paymentFilter) return false;
        if (monthFilter !== "all") {
          const d = new Date(tx.loggedAt);
          if (isNaN(d.getTime())) return false;
          const parts = getLocalDateParts(d, timeZone);
          const key = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
          if (key !== monthFilter) return false;
        }
        return true;
      })
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  }, [transactions, search, triggerFilter, paymentFilter, monthFilter, timeZone]);

  const groupedByDay = useMemo(() => {
    const groups = new Map<
      string,
      { dayKey: string; label: string; totalMinor: number; items: Transaction[] }
    >();
    const todayParts = getLocalDateParts(new Date(), timeZone);
    const todayKey = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;

    for (const tx of filtered) {
      const d = new Date(tx.loggedAt);
      let dayKey = tx.loggedAt.slice(0, 10);
      let label = dayKey;
      if (!isNaN(d.getTime())) {
        const parts = getLocalDateParts(d, timeZone);
        dayKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
        const formatted = new Intl.DateTimeFormat(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: parts.year !== todayParts.year ? "numeric" : undefined,
        }).format(new Date(parts.year, parts.month - 1, parts.day));
        label = dayKey === todayKey ? `Today · ${formatted}` : formatted;
      }

      const existing = groups.get(dayKey);
      if (existing) {
        existing.items.push(tx);
        existing.totalMinor += tx.amountMinor;
      } else {
        groups.set(dayKey, {
          dayKey,
          label,
          totalMinor: tx.amountMinor,
          items: [tx],
        });
      }
    }

    return Array.from(groups.values());
  }, [filtered, timeZone]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.deleteTransaction(id),
    onSuccess: () => {
      setPendingDelete(null);
      toast.success("Transaction deleted.");
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(cacheIdentity) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(cacheIdentity) });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not delete this transaction."
      );
    },
  });

  const handleExport = () => {
    if (transactions.length === 0) {
      toast.error("There are no transactions to export yet.");
      return;
    }
    const csv = buildTransactionsCsv(
      [...transactions].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
      profile.currency
    );
    downloadCsv(csv, buildTransactionsCsvFilename());
    toast.success(`Exported ${transactions.length} transactions as CSV.`);
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    monthFilter !== "all" ||
    triggerFilter !== "all" ||
    paymentFilter !== "all";

  return (
    <Card className="border-slate-200/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle as="h2" className="text-base">Transaction Ledger</CardTitle>
            <CardDescription className="text-xs tabular-nums">
              {filtered.length} of {transactions.length} transaction
              {transactions.length === 1 ? "" : "s"} in {profile.currency}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </Button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search descriptions"
              className="h-9 pl-8 text-xs"
              aria-label="Search transactions"
            />
          </div>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-9 text-xs lg:w-36" aria-label="Filter by month">
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {availableMonths.map((month) => (
                <SelectItem key={month.key} value={month.key}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={triggerFilter}
            onValueChange={(value) => setTriggerFilter(value as "all" | TriggerTag)}
          >
            <SelectTrigger className="h-9 text-xs lg:w-40" aria-label="Filter by trigger">
              <SelectValue placeholder="All triggers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All triggers</SelectItem>
              {TRIGGER_ORDER.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {TRIGGER_LABELS[tag]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={paymentFilter}
            onValueChange={(value) => setPaymentFilter(value as "all" | PaymentMode)}
          >
            <SelectTrigger className="h-9 text-xs lg:w-32" aria-label="Filter by payment mode">
              <SelectValue placeholder="All modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="cashless">Cashless</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2.5" aria-busy="true" aria-label="Loading transactions">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              {transactions.length === 0 ? "No transactions yet" : "Nothing matches these filters"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {transactions.length === 0
                ? "Log your first expense above to start the ledger."
                : "Try clearing the search or filter selections."}
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearch("");
                  setMonthFilter("all");
                  setTriggerFilter("all");
                  setPaymentFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {groupedByDay.map((group) => (
              <section key={group.dayKey} className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 text-xs">
                  <h3 className="font-semibold text-slate-700">{group.label}</h3>
                  <span className="font-semibold tabular-nums text-slate-600">
                    {formatAmount(group.totalMinor, profile.currency, profile.hourlyRateMinor)}
                  </span>
                </div>

                {/* Desktop table (lg+ to avoid 768px tablet overflow alongside sidebar) */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                        <th className="py-1.5 pr-3 font-semibold">Time</th>
                        <th className="py-1.5 pr-3 font-semibold">Description</th>
                        <th className="py-1.5 pr-3 font-semibold">Trigger</th>
                        <th className="py-1.5 pr-3 font-semibold">Mode</th>
                        <th className="py-1.5 pr-3 text-right font-semibold">Amount</th>
                        <th className="py-1.5 text-right font-semibold sr-only">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((tx) => (
                        <tr
                          key={tx.id}
                          className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-slate-500">
                            {formatTimeOnly(tx.loggedAt)}
                          </td>
                          <td className="max-w-[18rem] truncate py-2.5 pr-3 font-medium text-slate-900">
                            {tx.note || "Untitled expense"}
                          </td>
                          <td className="py-2.5 pr-3">
                            <TriggerBadge trigger={tx.triggerTag} />
                          </td>
                          <td className="py-2.5 pr-3 capitalize text-slate-600">
                            {tx.paymentMode}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-900">
                            {formatAmount(tx.amountMinor, profile.currency, profile.hourlyRateMinor)}
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-500 hover:bg-sky-50 hover:text-sky-700"
                                onClick={() => setEditingTx(tx)}
                                aria-label={`Edit ${tx.note || "transaction"}`}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setPendingDelete(tx)}
                                aria-label={`Delete ${tx.note || "transaction"}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile & tablet cards */}
                <div className="space-y-2 lg:hidden">
                  {group.items.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3 text-xs shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {tx.note || "Untitled expense"}
                          </p>
                          <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                            {formatTimeOnly(tx.loggedAt)} ·{" "}
                            <span className="capitalize">{tx.paymentMode}</span>
                          </p>
                        </div>
                        <p className="whitespace-nowrap font-bold tabular-nums text-slate-900">
                          {formatAmount(tx.amountMinor, profile.currency, profile.hourlyRateMinor)}
                        </p>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <TriggerBadge trigger={tx.triggerTag} />
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 text-xs text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                            onClick={() => setEditingTx(tx)}
                            aria-label={`Edit ${tx.note || "transaction"}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 text-xs text-slate-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setPendingDelete(tx)}
                            aria-label={`Delete ${tx.note || "transaction"}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this transaction?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `“${pendingDelete.note || "Untitled expense"}” will be removed and your runway will recalculate.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditTransactionDialog
        transaction={editingTx}
        open={editingTx !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTx(null);
        }}
        profile={profile}
      />
    </Card>
  );
}

function TriggerBadge({ trigger }: { trigger: TriggerTag }) {
  const tone =
    trigger === "invest_self"
      ? "bg-emerald-100 text-emerald-800"
      : trigger === "stress_late_night"
        ? "bg-indigo-100 text-indigo-800"
        : trigger === "social_fomo"
          ? "bg-rose-100 text-rose-800"
          : trigger === "convenience"
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-700";

  return (
    <Badge className={cn("border-transparent px-2 py-0.5 text-[10px] font-semibold", tone)}>
      {TRIGGER_LABELS[trigger]}
    </Badge>
  );
}
