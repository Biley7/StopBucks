"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, Moon, CreditCard, Calendar, Users, Layers } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { analyzeBiases } from "@/domain/behavioral-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RadarPage() {
  const { repository } = useRepository();
  const { formatAmount } = useDisplayPreference();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => repository.getProfile(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => repository.getTransactions(),
  });

  const biasAnalysis = profile
    ? analyzeBiases(profile, transactions)
    : null;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Behavioral Bias Radar
            </h1>
            <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 text-[11px]">
              Phase 1 Foundation
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Four deterministic detectors identifying unconscious student spending patterns.
          </p>
        </div>
      </div>

      {/* Four Deterministic Bias Detectors */}
      {biasAnalysis && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* 1. Late-Night Drift */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-600" />
                  <CardTitle className="text-sm font-semibold">Late-Night Drift</CardTitle>
                </div>
                <Badge
                  variant={
                    biasAnalysis.lateNightDrift.level === "high"
                      ? "destructive"
                      : biasAnalysis.lateNightDrift.level === "moderate"
                      ? "warning"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  Score: {biasAnalysis.lateNightDrift.score}/100
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {biasAnalysis.lateNightDrift.evidenceSummary}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              {biasAnalysis.lateNightDrift.interpretation}
            </CardContent>
          </Card>

          {/* 2. Cashless Numbness */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-sky-600" />
                  <CardTitle className="text-sm font-semibold">Cashless Numbness</CardTitle>
                </div>
                <Badge
                  variant={
                    biasAnalysis.cashlessNumbness.level === "high"
                      ? "destructive"
                      : biasAnalysis.cashlessNumbness.level === "moderate"
                      ? "warning"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  Score: {biasAnalysis.cashlessNumbness.score}/100
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {biasAnalysis.cashlessNumbness.evidenceSummary}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              {biasAnalysis.cashlessNumbness.interpretation}
            </CardContent>
          </Card>

          {/* 3. Payday Burn */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  <CardTitle className="text-sm font-semibold">Payday Windfall Burn</CardTitle>
                </div>
                <Badge
                  variant={
                    biasAnalysis.paydayBurn.level === "high"
                      ? "destructive"
                      : biasAnalysis.paydayBurn.level === "moderate"
                      ? "warning"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  Score: {biasAnalysis.paydayBurn.score}/100
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {biasAnalysis.paydayBurn.evidenceSummary}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              {biasAnalysis.paydayBurn.interpretation}
            </CardContent>
          </Card>

          {/* 4. Social FOMO */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-sm font-semibold">Social FOMO Pressure</CardTitle>
                </div>
                <Badge
                  variant={
                    biasAnalysis.socialFomo.level === "high"
                      ? "destructive"
                      : biasAnalysis.socialFomo.level === "moderate"
                      ? "warning"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  Score: {biasAnalysis.socialFomo.score}/100
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {biasAnalysis.socialFomo.evidenceSummary}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              {biasAnalysis.socialFomo.interpretation}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deterministic Zero-Guilt Advice */}
      {biasAnalysis && biasAnalysis.deterministicAdvice.length > 0 && (
        <Card className="border-sky-200 bg-sky-50/40">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-sky-950">
              Behavioral Finance Coaching Insight
            </CardTitle>
            <CardDescription className="text-xs text-sky-800">
              Deterministic, non-judgmental guidance generated by the foundation engine:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
              {biasAnalysis.deterministicAdvice.map((advice, i) => (
                <li key={i}>{advice}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Phase 2 Feature Roadmap Announcement */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base">Phase 2 Interactive Features: Coming Next</CardTitle>
          </div>
          <CardDescription>
            The 4 bias detectors and math curves are fully verified. In Phase 2, this module will feature:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">Recharts 4-Axis Radar Chart</p>
              <p className="text-xs text-slate-500 mt-1">
                Visual polygon displaying your unique psychological spending footprint.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">AI Micro-Habit Intervention</p>
              <p className="text-xs text-slate-500 mt-1">
                Gemini-powered personalized nudges to rewire impulse spending without shame.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

