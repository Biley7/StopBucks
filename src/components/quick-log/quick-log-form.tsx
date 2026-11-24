"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { queryKeys } from "@/lib/query-keys";
import { parseAmountStringToMinor } from "@/domain/expense-parser";
import { fromMinorUnits } from "@/domain/currency";
import { buildRunwayPreview, TRIGGER_LABELS, TRIGGER_ORDER } from "@/domain/runway-insights";
import { parseExpenseResponseSchema } from "@/lib/schemas";
import type {
  PaymentMode,
  Transaction,
  TriggerTag,
  UserProfile,
} from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface QuickLogFormProps {
  profile: UserProfile;
  transactions: Transaction[];
}

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "cashless", label: "Cashless" },
];

export function QuickLogForm({ profile, transactions }: QuickLogFormProps) {
  const { repository, cacheIdentity, isGuest } = useRepository();
  const { formatAmount } = useDisplayPreference();
  const queryClient = useQueryClient();

  const [naturalInput, setNaturalInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [trigger, setTrigger] = useState<TriggerTag>("need");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cashless");
  const [formError, setFormError] = useState<string | null>(null);

  const amountMinor = useMemo(() => {
    const trimmed = amountText.trim();
    if (!trimmed) return null;
    return parseAmountStringToMinor(trimmed);
  }, [amountText]);

  const preview = useMemo(
    () =>
      buildRunwayPreview(
        profile,
        transactions,
        amountMinor ?? 0,
        trigger
      ),
    [profile, transactions, amountMinor, trigger]
  );

  const addMutation = useMutation({
    mutationFn: (input: {
      amountMinor: number;
      note: string;
      triggerTag: TriggerTag;
      paymentMode: PaymentMode;
    }) => repository.addTransaction(input),

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions(cacheIdentity) });
      const previous = queryClient.getQueryData<Transaction[]>(queryKeys.transactions(cacheIdentity));

      const optimistic: Transaction = {
        id: `optimistic-${Date.now()}`,
        userId: profile.userId,
        amountMinor: input.amountMinor,
        note: input.note,
        triggerTag: input.triggerTag,
        paymentMode: input.paymentMode,
        loggedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Transaction[]>(queryKeys.transactions(cacheIdentity), [
        optimistic,
        ...(previous ?? []),
      ]);

      return { previous };
    },

    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.transactions(cacheIdentity), context.previous);
      }
      toast.error(
        error instanceof Error ? error.message : "Could not save this expense."
      );
    },

    onSuccess: (created) => {
      toast.success("Expense logged.", {
        description: `${created.note || "Expense"} · ${formatAmount(
          created.amountMinor,
          profile.currency,
          profile.hourlyRateMinor
        )}`,
      });
      setAmountText("");
      setNote("");
      setNaturalInput("");
      setTrigger("need");
      setPaymentMode("cashless");
      setFormError(null);
      setParseError(null);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(cacheIdentity) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(cacheIdentity) });
    },
  });

  const handleAutoParse = async () => {
    const input = naturalInput.trim();
    setParseError(null);
    if (!input) {
      setParseError("Describe the expense first, for example: 240 late-night delivery.");
      return;
    }

    try {
      setIsParsing(true);
      const response = await fetch("/api/parse-expense", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isGuest ? { "x-stopbucks-guest": "1" } : {}),
        },
        body: JSON.stringify({ input, currency: profile.currency }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Could not read an amount. Please enter the details manually.";
        setParseError(message);
        return;
      }

      const parsed = parseExpenseResponseSchema.safeParse(payload);
      if (!parsed.success) {
        setParseError("The parser returned an unexpected response. Enter details manually.");
        return;
      }

      setAmountText(String(fromMinorUnits(parsed.data.amount_minor)));
      setNote(parsed.data.note);
      setTrigger(parsed.data.suggested_trigger);
      setPaymentMode(parsed.data.suggested_payment_mode);

      toast.success(
        parsed.data.source === "gemini" ? "Parsed with Gemini" : "Parsed locally",
        { description: "Review the fields before saving." }
      );
    } catch {
      setParseError("The parser is unreachable right now. You can still log manually.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (amountMinor === null) {
      setFormError("Enter a valid amount greater than zero.");
      return;
    }
    if (note.trim().length === 0) {
      setFormError("Add a short description for this expense.");
      return;
    }
    if (addMutation.isPending) return;

    addMutation.mutate({
      amountMinor,
      note: note.trim(),
      triggerTag: trigger,
      paymentMode,
    });
  };

  const safeDelta = preview.safeToSpendDeltaMinor;
  const isInvestSelf = trigger === "invest_self";

  return (
    <div className="space-y-4">
      <Card className="border-sky-200 bg-sky-50/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600" />
            <CardTitle className="text-base">Smart Quick Log</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Describe it naturally. Nothing is saved until you confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={naturalInput}
              onChange={(event) => setNaturalInput(event.target.value)}
              placeholder="e.g. 240 late-night delivery after studying"
              maxLength={280}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (!isParsing) handleAutoParse();
                }
              }}
              disabled={isParsing}
              aria-label="Natural language expense"
            />
            <Button
              type="button"
              onClick={handleAutoParse}
              disabled={isParsing}
              className="shrink-0"
            >
              {isParsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {isParsing ? "Parsing..." : "Auto-Parse"}
            </Button>
          </div>
          {parseError && (
            <p className="text-xs text-amber-700">{parseError}</p>
          )}
          <p className="text-[11px] text-slate-500">
            Manual entry always works, even when the parser is unavailable.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Expense Details</CardTitle>
          <CardDescription className="text-xs">
            Everything remains editable before it reaches your ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expense-amount">Amount</Label>
                <Input
                  id="expense-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountText}
                  onChange={(event) => setAmountText(event.target.value)}
                />
                {amountText.trim().length > 0 && amountMinor === null && (
                  <p className="text-xs text-red-600">
                    Enter a positive amount with at most two decimals.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label id="payment-mode-label">Payment mode</Label>
                <div role="group" aria-labelledby="payment-mode-label" className="flex gap-2">
                  {PAYMENT_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setPaymentMode(mode.value)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        paymentMode === mode.value
                          ? "border-sky-500 bg-sky-50 text-sky-800"
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
              <Label htmlFor="expense-note">Description</Label>
              <Input
                id="expense-note"
                placeholder="What was this for?"
                maxLength={280}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label id="behavioral-trigger-label">Behavioral trigger</Label>
              <div role="group" aria-labelledby="behavioral-trigger-label" className="flex flex-wrap gap-2">
                {TRIGGER_ORDER.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTrigger(tag)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      trigger === tag
                        ? tag === "invest_self"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-sky-500 bg-sky-50 text-sky-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                    aria-pressed={trigger === tag}
                  >
                    {TRIGGER_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>

            {/* Runway impact preview */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Runway impact preview
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <PreviewStat
                  label="Safe to spend now"
                  value={formatAmount(
                    preview.current.safeToSpendTodayMinor,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}
                />
                <PreviewStat
                  label="After this expense"
                  value={formatAmount(
                    preview.projected.safeToSpendTodayMinor,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}
                  emphasis={safeDelta < 0 ? "warning" : "success"}
                />
                <PreviewStat
                  label="Remaining budget change"
                  value={`${
                    preview.remainingConsumptionDeltaMinor > 0
                      ? "+"
                      : preview.remainingConsumptionDeltaMinor < 0
                        ? "−"
                        : ""
                  }${formatAmount(
                    Math.abs(preview.remainingConsumptionDeltaMinor),
                    profile.currency,
                    profile.hourlyRateMinor
                  )}`}
                  emphasis={preview.remainingConsumptionDeltaMinor < 0 ? "warning" : "neutral"}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                {isInvestSelf
                  ? "Invest-in-Self is protected: this expense does not reduce your consumption runway."
                  : "This expense is consumption and will draw from today's safe-to-spend allowance."}
              </p>
            </div>

            {formError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}

            <Button
              type="submit"
              disabled={addMutation.isPending}
              className="w-full sm:w-auto"
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {addMutation.isPending ? "Saving..." : "Log expense"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  emphasis = "neutral",
}: {
  label: string;
  value: string;
  emphasis?: "neutral" | "success" | "warning";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-semibold tabular-nums",
          emphasis === "warning"
            ? "text-amber-700"
            : emphasis === "success"
              ? "text-emerald-700"
              : "text-slate-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
