"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Loader2,
  Plus,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { queryKeys } from "@/lib/query-keys";
import { parseAmountStringToMinor } from "@/domain/expense-parser";
import type { FixedCommitment, UserProfile } from "@/domain/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RollingNumber } from "@/components/shared/motion-primitives";

interface FixedCommitmentsCardProps {
  profile: UserProfile;
}

export function FixedCommitmentsCard({ profile }: FixedCommitmentsCardProps) {
  const { repository, cacheIdentity, activeMode } = useRepository();
  const { formatAmount } = useDisplayPreference();
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [titleText, setTitleText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const commitmentsQuery = useQuery({
    queryKey: queryKeys.fixedCommitments(cacheIdentity),
    queryFn: () => repository.getFixedCommitments(),
    enabled: activeMode !== "none",
  });

  const commitments = commitmentsQuery.data ?? [];
  const totalCommitmentsMinor = commitments.reduce(
    (sum, c) => sum + c.amountMinor,
    0
  );

  const addMutation = useMutation({
    mutationFn: (input: { title: string; amountMinor: number }) =>
      repository.addFixedCommitment(input),
    onSuccess: (newCommitment) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.fixedCommitments(cacheIdentity),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile(cacheIdentity),
      });
      toast.success("Fixed commitment added", {
        description: `${newCommitment.title} · ${formatAmount(
          newCommitment.amountMinor,
          profile.currency,
          profile.hourlyRateMinor
        )}`,
      });
      setTitleText("");
      setAmountText("");
      setFormError(null);
      setIsAdding(false);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not add this fixed commitment. Please try again."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.deleteFixedCommitment(id),
    onMutate: (id) => {
      setDeletingId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.fixedCommitments(cacheIdentity),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile(cacheIdentity),
      });
      toast.success("Fixed commitment removed");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove fixed commitment."
      );
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = titleText.trim();
    if (!trimmedTitle) {
      setFormError("Commitment title is required.");
      return;
    }
    if (trimmedTitle.length > 80) {
      setFormError("Title cannot exceed 80 characters.");
      return;
    }

    const trimmedAmount = amountText.trim();
    if (!trimmedAmount) {
      setFormError("Monthly amount is required.");
      return;
    }

    const minor = parseAmountStringToMinor(trimmedAmount);
    if (minor === null || minor <= 0) {
      setFormError("Please enter a valid positive monetary amount.");
      return;
    }
    if (!Number.isSafeInteger(minor) || minor > Number.MAX_SAFE_INTEGER) {
      setFormError("Amount exceeds safe monetary boundary.");
      return;
    }

    addMutation.mutate({
      title: trimmedTitle,
      amountMinor: minor,
    });
  };

  return (
    <Card className="border-slate-900/[0.08]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-600/15 bg-sky-50 text-sky-600">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <CardTitle as="h2" className="text-base text-slate-900">
                Fixed Bills Reserved
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Unavoidable monthly obligations reserved before calculating your disposable runway.
              </CardDescription>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <div className="sm:text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Total Reserved
              </div>
              <div className="text-sm font-bold tabular-nums tracking-[-0.025em] text-slate-900 sm:text-base">
                <RollingNumber
                  value={formatAmount(
                    totalCommitmentsMinor,
                    profile.currency,
                    profile.hourlyRateMinor
                  )}
                  hierarchy="subtle"
                />
              </div>
            </div>

            {!isAdding && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAdding(true)}
                className="h-9 gap-1.5 text-xs sm:h-8"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Fixed Bill
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Inline Add Form */}
        {isAdding && (
          <form
            onSubmit={handleAddSubmit}
            className="rounded-lg border border-sky-100 bg-sky-50/50 p-3 space-y-3"
          >
            <div className="text-xs font-semibold text-sky-900">
              New Recurring Monthly Commitment
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fc-title" className="text-xs text-slate-700">
                  Obligation Title
                </Label>
                <Input
                  id="fc-title"
                  type="text"
                  placeholder="e.g. Mess Plan, Wi-Fi, Gym"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  maxLength={80}
                  className="h-8 text-xs bg-white"
                  autoFocus
                  disabled={addMutation.isPending}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="fc-amount" className="text-xs text-slate-700">
                  Monthly Amount ({profile.currency})
                </Label>
                <Input
                  id="fc-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 4500"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  className="h-9 text-xs tabular-nums bg-white"
                  disabled={addMutation.isPending}
                />
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setFormError(null);
                  setTitleText("");
                  setAmountText("");
                }}
                disabled={addMutation.isPending}
                className="h-7 text-xs"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addMutation.isPending}
                className="h-7 text-xs bg-sky-600 hover:bg-sky-700 text-white"
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Add Fixed Bill
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Loading state */}
        {commitmentsQuery.isLoading && (
          <div className="space-y-2 py-2">
            <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
          </div>
        )}

        {/* Error state */}
        {commitmentsQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700">
            <p className="font-semibold">Unable to load fixed commitments.</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={() => commitmentsQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!commitmentsQuery.isLoading &&
          !commitmentsQuery.isError &&
          commitments.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
              <Receipt className="mx-auto h-7 w-7 text-slate-400" />
              <p className="mt-2 text-xs font-semibold text-slate-700">
                No fixed commitments recorded
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                Adding recurring obligations like mess fees, hostel Wi-Fi, or gym subscriptions improves the accuracy of your true disposable Safe-to-Spend runway.
              </p>
              {!isAdding && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 h-8 text-xs gap-1.5"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add your first fixed bill
                </Button>
              )}
            </div>
          )}

        {/* List of commitments */}
        {!commitmentsQuery.isLoading && commitments.length > 0 && (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {commitments.map((commitment) => (
              <FixedCommitmentRow
                key={commitment.id}
                commitment={commitment}
                currency={profile.currency}
                hourlyRateMinor={profile.hourlyRateMinor}
                isDeleting={deletingId === commitment.id}
                onDelete={() => deleteMutation.mutate(commitment.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FixedCommitmentRow({
  commitment,
  currency,
  hourlyRateMinor,
  isDeleting,
  onDelete,
}: {
  commitment: FixedCommitment;
  currency: UserProfile["currency"];
  hourlyRateMinor: number;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  const { formatAmount } = useDisplayPreference();

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs transition-colors hover:bg-slate-50/70">
      <div className="min-w-0 flex-1">
        <span className="truncate font-medium text-slate-800">
          {commitment.title}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-semibold tabular-nums text-slate-900">
          {formatAmount(commitment.amountMinor, currency, hourlyRateMinor)}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          className="h-9 w-9 text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:text-red-700 sm:h-8 sm:w-8"
          title={`Delete ${commitment.title}`}
          aria-label={`Delete ${commitment.title}`}
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" aria-hidden="true" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}
