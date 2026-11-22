"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Sparkles,
  ArrowRight,
  Shield,
  Calendar,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { calculateDailyRunway } from "@/domain/behavioral-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RunwayPage() {
  const { repository, isGuest } = useRepository();
  const { formatAmount } = useDisplayPreference();

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => repository.getProfile(),
  });

  const { data: transactions = [], isLoading: isTxsLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => repository.getTransactions(),
  });

  const isLoading = isProfileLoading || isTxsLoading;

  const runway = profile
    ? calculateDailyRunway(profile, transactions)
    : null;

  return (
    <div className="space-y-6">
      {/* Module Header & Phase Boundary Indicator */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daily Runway Dashboard
            </h1>
            <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 text-[11px]">
              Phase 1 Foundation
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Dynamic safe-to-spend allowance protecting your intentional self-investment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href="/onboarding">Adjust Baseline</Link>
          </Button>
        </div>
      </div>

      {/* Main Calculation Snapshot */}
      {isLoading ? (
        <Card className="p-8 text-center text-slate-400">Loading financial runway...</Card>
      ) : !profile ? (
        <Card className="border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-amber-900">Baseline Profile Needed</h3>
              <p className="text-xs text-amber-700 mt-1">
                Please complete your initial 4-input baseline to calculate your Daily Runway.
              </p>
            </div>
            <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              <Link href="/onboarding">Complete Baseline</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Safe to Spend Today */}
          <Card className="border-sky-200 bg-gradient-to-br from-white to-sky-50/50 shadow-xs">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-sky-700">
                Safe to Spend Today
              </CardDescription>
              <CardTitle className="text-2xl font-extrabold text-sky-950">
                {formatAmount(
                  runway?.safeToSpendTodayMinor ?? 0,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Recalculated daily over {runway?.daysRemainingInMonth ?? 0} remaining days
            </CardContent>
          </Card>

          {/* Consumption Budget */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Monthly Consumption
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {formatAmount(
                  runway?.remainingConsumptionMinor ?? 0,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Remaining of {formatAmount(runway?.consumptionBudgetMinor ?? 0, profile.currency, profile.hourlyRateMinor)}
            </CardContent>
          </Card>

          {/* Protected Self-Investment */}
          <Card className="border-emerald-200 bg-emerald-50/30 shadow-xs">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                Protected Self-Investment
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-950">
                {formatAmount(
                  runway?.monthToDateSelfInvestMinor ?? 0,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-emerald-700">
              Target: {formatAmount(profile.selfInvestTargetMinor, profile.currency, profile.hourlyRateMinor)}
            </CardContent>
          </Card>

          {/* Growth-to-Burn Ratio */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Growth-to-Burn Ratio
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {runway?.growthToBurnRatio ?? 0}x
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Intentional capital vs lifestyle burn
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phase 2 Feature Roadmap Announcement */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-sky-600" />
            <CardTitle className="text-base">Phase 2 Interactive Features: Coming Next</CardTitle>
          </div>
          <CardDescription>
            The foundation engine and data models are fully wired. In Phase 2, this view will feature:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">Dynamic Daily Burn Bar</p>
              <p className="text-xs text-slate-500 mt-1">
                Visual progress bar tracking today's real-time spend against your safe allowance.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">Pacing Trajectory Curve</p>
              <p className="text-xs text-slate-500 mt-1">
                Recharts curve comparing linear month pacing vs actual spending velocity.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">Gemini Behavioral Coach</p>
              <p className="text-xs text-slate-500 mt-1">
                Weekly proactive nudges calibrated by the deterministic bias engine.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">CSV Data Export</p>
              <p className="text-xs text-slate-500 mt-1">
                Instant student export for personal analysis or financial aid records.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

