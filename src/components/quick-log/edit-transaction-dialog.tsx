"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { queryKeys } from "@/lib/query-keys";
import { parseAmountStringToMinor } from "@/domain/expense-parser";
import { fromMinorUnits } from "@/domain/currency";
import { TRIGGER_LABELS, TRIGGER_ORDER } from "@/domain/runway-insights";
import { updateTransactionInputSchema } from "@/lib/schemas";
import type { PaymentMode, Transaction, TriggerTag, UserProfile } from "@/domain/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
}

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "cashless", label: "Cashless" },
];

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  profile,
}: EditTransactionDialogProps) {
  const { repository, cacheIdentity } = useRepository();
  const queryClient = useQueryClient();

  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [triggerTag, setTriggerTag] = useState<TriggerTag>("need");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cashless");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setAmountText(String(fromMinorUnits(transaction.amountMinor)));
      setNote(transaction.note);
      setTriggerTag(transaction.triggerTag);
      setPaymentMode(transaction.paymentMode);
      setFormError(null);
    }
  }, [transaction]);

  const updateMutation = useMutation({
    mutationFn: (updates: {
      amountMinor: number;
      note: string;
      triggerTag: TriggerTag;
      paymentMode: PaymentMode;
    }) => {
      if (!transaction) throw new Error("No transaction selected");
      return repository.updateTransaction(transaction.id, updates);
    },
    onSuccess: () => {
      toast.success("Transaction updated.");
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(cacheIdentity) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(cacheIdentity) });
      onOpenChange(false);
    },
    onError: (err) => {
      setFormError(
        err instanceof Error ? err.message : "Could not update transaction. Try again."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmed = amountText.trim();
    if (!trimmed) {
      setFormError("Enter a valid positive amount.");
      return;
    }

    const amountMinor = parseAmountStringToMinor(trimmed);
    if (amountMinor === null) {
      setFormError("Enter a valid positive amount with at most two decimals.");
      return;
    }

    const parsed = updateTransactionInputSchema.safeParse({
      amountMinor,
      note: note.trim(),
      triggerTag,
      paymentMode,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? "Invalid transaction details.";
      setFormError(issue);
      return;
    }

    updateMutation.mutate(parsed.data as {
      amountMinor: number;
      note: string;
      triggerTag: TriggerTag;
      paymentMode: PaymentMode;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update the amount, description, or trigger for this expense.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Amount ({profile.currency})</Label>
              <Input
                id="edit-amount"
                inputMode="decimal"
                placeholder="0.00"
                className="tabular-nums"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label id="edit-payment-mode-label">Payment Mode</Label>
              <div
                role="group"
                aria-labelledby="edit-payment-mode-label"
                className="flex gap-2"
              >
                {PAYMENT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPaymentMode(mode.value)}
                    className={cn(
                      "flex-1 min-h-[40px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                      paymentMode === mode.value
                        ? "border-sky-500 bg-sky-50 font-semibold text-sky-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                    aria-pressed={paymentMode === mode.value}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-note">Description</Label>
            <Input
              id="edit-note"
              placeholder="What was this for?"
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label id="edit-trigger-label">Behavioral Trigger</Label>
            <div
              role="group"
              aria-labelledby="edit-trigger-label"
              className="flex flex-wrap gap-1.5"
            >
              {TRIGGER_ORDER.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTriggerTag(tag)}
                  className={cn(
                    "min-h-[34px] rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                    triggerTag === tag
                      ? tag === "invest_self"
                        ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-900"
                        : "border-sky-500 bg-sky-50 font-semibold text-sky-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                  aria-pressed={triggerTag === tag}
                >
                  {TRIGGER_LABELS[tag]}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <p className="rounded-md bg-red-50 p-2 text-xs text-red-600">{formError}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
