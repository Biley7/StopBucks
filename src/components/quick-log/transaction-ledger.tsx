"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { queryKeys } from "@/lib/query-keys";
import { TRIGGER_LABELS, TRIGGER_ORDER } from "@/domain/runway-insights";
import {
  buildTransactionsCsv,
  buildTransactionsCsvFilename,
  downloadCsv,
} from "@/lib/csv";
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

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
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

  const [search, setSearch] = useState("");
  const [triggerFilter, setTriggerFilter] = useState<"all" | TriggerTag>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentMode>("all");
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (query && !tx.note.toLowerCase().includes(query)) return false;
      if (triggerFilter !== "all" && tx.triggerTag !== triggerFilter) return false;
      if (paymentFilter !== "all" && tx.paymentMode !== paymentFilter) return false;
      return true;
    });
  }, [transactions, search, triggerFilter, paymentFilter]);

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

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Transaction Ledger</CardTitle>
            <CardDescription className="text-xs">
              {transactions.length} transaction{transactions.length === 1 ? "" : "s"} in{" "}
              {profile.currency}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search descriptions"
              className="h-9 pl-8 text-xs"
              aria-label="Search transactions"
            />
          </div>

          <Select
            value={triggerFilter}
            onValueChange={(value) => setTriggerFilter(value as "all" | TriggerTag)}
          >
            <SelectTrigger className="h-9 text-xs sm:w-40" aria-label="Filter by trigger">
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
            <SelectTrigger className="h-9 text-xs sm:w-36" aria-label="Filter by payment mode">
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
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              {transactions.length === 0 ? "No transactions yet" : "Nothing matches these filters"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {transactions.length === 0
                ? "Log your first expense above to start the ledger."
                : "Try clearing the search or filter selections."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Logged</th>
                    <th className="py-2 pr-3 font-semibold">Description</th>
                    <th className="py-2 pr-3 font-semibold">Trigger</th>
                    <th className="py-2 pr-3 font-semibold">Mode</th>
                    <th className="py-2 pr-3 text-right font-semibold">Amount</th>
                    <th className="py-2 text-right font-semibold sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap py-2.5 pr-3 text-slate-500">
                        {formatDateTime(tx.loggedAt)}
                      </td>
                      <td className="max-w-[18rem] truncate py-2.5 pr-3 font-medium text-slate-800">
                        {tx.note || "Untitled expense"}
                      </td>
                      <td className="py-2.5 pr-3">
                        <TriggerBadge trigger={tx.triggerTag} />
                      </td>
                      <td className="py-2.5 pr-3 capitalize text-slate-500">
                        {tx.paymentMode}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatAmount(tx.amountMinor, profile.currency, profile.hourlyRateMinor)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => setPendingDelete(tx)}
                          aria-label={`Delete ${tx.note || "transaction"}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {filtered.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-lg border border-slate-200 p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {tx.note || "Untitled expense"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {formatDateTime(tx.loggedAt)} · {tx.paymentMode}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-semibold tabular-nums text-slate-900">
                      {formatAmount(tx.amountMinor, profile.currency, profile.hourlyRateMinor)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <TriggerBadge trigger={tx.triggerTag} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-slate-400 hover:text-red-600"
                      onClick={() => setPendingDelete(tx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
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
