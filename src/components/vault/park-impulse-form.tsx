"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Hourglass, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { queryKeys } from "@/lib/query-keys";
import { createVaultItemSchema } from "@/lib/schemas";
import { parseAmountStringToMinor } from "@/domain/expense-parser";
import { TRIGGER_LABELS, TRIGGER_ORDER } from "@/domain/runway-insights";
import type { CurrencyCode, TriggerTag } from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ParkImpulseForm({ currency }: { currency?: CurrencyCode }) {
  const { repository, cacheIdentity } = useRepository();
  const queryClient = useQueryClient();

  const [itemName, setItemName] = useState("");
  const [priceText, setPriceText] = useState("");
  const [trigger, setTrigger] = useState<TriggerTag>("convenience");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parkMutation = useMutation({
    mutationFn: (input: {
      itemName: string;
      priceMinor: number;
      triggerTag: TriggerTag;
    }) => repository.addVaultItem(input),
    onSuccess: (item) => {
      toast.success("Impulse parked for 48 hours.", {
        description: `${item.itemName} unlocks on ${item.unlockAt.slice(0, 10)}.`,
      });
      setItemName("");
      setPriceText("");
      setTrigger("convenience");
      setErrors({});
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultItems(cacheIdentity) });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not park this impulse."
      );
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const trimmedName = itemName.trim();
    if (!trimmedName) {
      setErrors({ itemName: "What do you want? (item name required)" });
      return;
    }
    if (trimmedName.length > 100) {
      setErrors({ itemName: "Item name cannot exceed 100 characters." });
      return;
    }

    const priceMinor = parseAmountStringToMinor(priceText.trim());
    if (priceMinor === null || priceMinor <= 0) {
      setErrors({ priceMajor: "Enter a valid positive price with at most 2 decimal places." });
      return;
    }

    if (parkMutation.isPending) return;

    parkMutation.mutate({
      itemName: trimmedName,
      priceMinor,
      triggerTag: trigger,
    });
  };

  return (
    <Card className="min-w-0 border-slate-900/[0.08]">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <CardTitle as="h2" className="text-base">Park an Impulse</CardTitle>
        </div>
        <CardDescription className="text-xs">
          No purchase, no transaction — just 48 hours of perspective.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="vault-item-name">What do you want?</Label>
            <Input
              id="vault-item-name"
              placeholder="e.g. Wireless earbuds"
              maxLength={100}
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
            />
            {errors.itemName && (
              <p className="text-xs text-red-600">{errors.itemName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vault-price">
              Expected price{currency ? ` (${currency})` : ""}
            </Label>
            <Input
              id="vault-price"
              inputMode="decimal"
              placeholder="0.00"
              className="tabular-nums"
              value={priceText}
              onChange={(event) => setPriceText(event.target.value)}
            />
            {errors.priceMajor && (
              <p className="text-xs text-red-600">{errors.priceMajor}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label id="vault-trigger-label">Trigger behind it</Label>
            <div role="group" aria-labelledby="vault-trigger-label" className="flex flex-wrap gap-1.5">
              {TRIGGER_ORDER.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTrigger(tag)}
                  className={cn(
                    "min-h-[34px] rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                    trigger === tag
                      ? "border-amber-500 bg-amber-50 font-semibold text-amber-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                  aria-pressed={trigger === tag}
                >
                  {TRIGGER_LABELS[tag]}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={parkMutation.isPending}>
            {parkMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Hourglass className="h-4 w-4" />
            )}
            {parkMutation.isPending ? "Parking..." : "Start 48-hour cool-off"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
