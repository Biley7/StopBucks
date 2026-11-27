"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { onboardingSchema } from "@/lib/schemas";
import { fromMinorUnits, CURRENCY_CONFIGS } from "@/domain/currency";
import { parseAmountStringToMinor } from "@/domain/expense-parser";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { CurrencyCode } from "@/domain/types";
import { useRepository } from "@/repositories/repository-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OnboardingPage() {
  const router = useRouter();
  const { repository, isGuest, isLoading: isRepoLoading, cacheIdentity } = useRepository();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("INR");
  const [monthlyBudget, setMonthlyBudget] = useState("20000");
  const [selfInvestTarget, setSelfInvestTarget] = useState("3500");
  const [hourlyRate, setHourlyRate] = useState("200");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preload existing profile if available
  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await repository.getProfile();
        if (profile) {
          setHasExistingProfile(true);
          setSelectedCurrency(profile.currency);
          setMonthlyBudget(String(fromMinorUnits(profile.monthlyBudgetMinor)));
          setSelfInvestTarget(String(fromMinorUnits(profile.selfInvestTargetMinor)));
          setHourlyRate(String(fromMinorUnits(profile.hourlyRateMinor)));
        }
      } catch (err) {
        console.warn("Could not preload profile for onboarding", err);
      }
    }
    if (!isRepoLoading) {
      loadProfile();
    }
  }, [repository, isRepoLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const budgetNum = parseFloat(monthlyBudget);
    const targetNum = parseFloat(selfInvestTarget);
    const rateNum = parseFloat(hourlyRate);

    // Validate using Zod schema
    const validationResult = onboardingSchema.safeParse({
      currency: selectedCurrency,
      monthlyBudget: budgetNum,
      selfInvestTarget: targetNum,
      hourlyRate: rateNum,
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = String(issue.path[0]);
        fieldErrors[fieldName] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const budgetMinor = parseAmountStringToMinor(monthlyBudget);
      const targetMinor = parseAmountStringToMinor(selfInvestTarget);
      const rateMinor = parseAmountStringToMinor(hourlyRate);
      if (budgetMinor === null || targetMinor === null || rateMinor === null) {
        setFormError("Enter amounts with no more than two decimal places.");
        return;
      }

      const existing = await repository.getProfile();
      if (existing) {
        await repository.updateProfile({
          currency: selectedCurrency,
          monthlyBudgetMinor: budgetMinor,
          selfInvestTargetMinor: targetMinor,
          hourlyRateMinor: rateMinor,
        });
      } else {
        await repository.createProfile({
          currency: selectedCurrency,
          monthlyBudgetMinor: budgetMinor,
          selfInvestTargetMinor: targetMinor,
          hourlyRateMinor: rateMinor,
        });
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(cacheIdentity) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions(cacheIdentity) });
      router.push("/runway");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save profile. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currConfig = CURRENCY_CONFIGS[selectedCurrency];
  const symbolPadClass = currConfig.symbol.length > 1 ? "pl-12" : "pl-8";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="w-full max-w-xl">
        {hasExistingProfile && (
          <div className="mb-4">
            <Button asChild variant="ghost" size="sm" className="-ml-2 text-slate-600 hover:text-slate-900">
              <Link href="/runway">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Daily Runway
              </Link>
            </Button>
          </div>
        )}

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-700 font-bold text-white shadow-xs">
            SB
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Configure Your Financial Baseline
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Four quick inputs to calculate your Daily Runway and unlock zero-guilt spending.
          </p>
        </div>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle as="h2" className="text-lg">Student Profile</CardTitle>
              {isGuest && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Guest Sandbox
                </span>
              )}
            </div>
            <CardDescription>
              We separate self-investment from consumption to protect your growth.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {formError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">1. Currency</Label>
                <Select
                  value={selectedCurrency}
                  onValueChange={(val) => setSelectedCurrency(val as CurrencyCode)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">Indian Rupee (₹ INR)</SelectItem>
                    <SelectItem value="HKD">Hong Kong Dollar (HK$ HKD)</SelectItem>
                    <SelectItem value="USD">US Dollar ($ USD)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.currency && (
                  <p className="text-xs text-red-600">{errors.currency}</p>
                )}
              </div>

              {/* 2. Monthly Budget */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <Label htmlFor="monthlyBudget">2. Total Monthly Budget</Label>
                  <span className="text-xs text-slate-500">Total allowance / income</span>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                    {currConfig.symbol}
                  </span>
                  <Input
                    id="monthlyBudget"
                    type="number"
                    step="any"
                    min="1"
                    required
                    className={`${symbolPadClass} tabular-nums`}
                    placeholder="20000"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                  />
                </div>
                {errors.monthlyBudget && (
                  <p className="text-xs text-red-600">{errors.monthlyBudget}</p>
                )}
              </div>

              {/* 3. Monthly Self-Investment Target */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <Label htmlFor="selfInvestTarget">3. Self-Investment Target</Label>
                  <span className="text-xs text-slate-500">Books, courses, fitness</span>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                    {currConfig.symbol}
                  </span>
                  <Input
                    id="selfInvestTarget"
                    type="number"
                    step="any"
                    min="0"
                    required
                    className={`${symbolPadClass} tabular-nums`}
                    placeholder="3500"
                    value={selfInvestTarget}
                    onChange={(e) => setSelfInvestTarget(e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Protected capital: spending on self-improvement does not reduce your daily runway.
                </p>
                {errors.selfInvestTarget && (
                  <p className="text-xs text-red-600">{errors.selfInvestTarget}</p>
                )}
              </div>

              {/* 4. Hourly Rate */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <Label htmlFor="hourlyRate">4. Hourly Time Value / Wage</Label>
                  <span className="text-xs text-slate-500">Powers Pain-of-Paying hours</span>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                    {currConfig.symbol}
                  </span>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="any"
                    min="1"
                    required
                    className={`${symbolPadClass} tabular-nums`}
                    placeholder="200"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Used by the Pain-of-Paying toggle to translate impulse purchases into hours of work.
                </p>
                {errors.hourlyRate && (
                  <p className="text-xs text-red-600">{errors.hourlyRate}</p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full bg-sky-700 text-base font-semibold text-white hover:bg-sky-800"
                >
                  {isSubmitting ? "Saving Baseline..." : "Proceed to Daily Runway"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
