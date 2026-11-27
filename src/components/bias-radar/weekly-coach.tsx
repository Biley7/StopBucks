"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { queryKeys } from "@/lib/query-keys";
import { getIsoWeekKey } from "@/domain/runway-insights";
import { buildDeterministicNudge } from "@/domain/nudge";
import { coachNudgeApiResponseSchema, type CoachNudgeResponse } from "@/lib/schemas";
import type { BiasAnalysisResult, RunwayMetrics, UserProfile } from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WeeklyCoachProps {
  bias: BiasAnalysisResult;
  runway: RunwayMetrics;
  profile: UserProfile;
}

export function WeeklyCoach({ bias, runway, profile }: WeeklyCoachProps) {
  const { repository, cacheIdentity, isGuest } = useRepository();
  const { formatAmount } = useDisplayPreference();
  const queryClient = useQueryClient();
  const weekKey = useMemo(() => getIsoWeekKey(new Date()), []);
  const [offlineNudge, setOfflineNudge] = useState<CoachNudgeResponse | null>(null);

  const nudgeQuery = useQuery({
    queryKey: queryKeys.weeklyNudge(cacheIdentity, weekKey),
    queryFn: () => repository.getWeeklyNudge(weekKey),
  });

  const cachedNudge = useMemo<CoachNudgeResponse | null>(() => {
    const record = nudgeQuery.data;
    if (!record) return null;
    const parsed = coachNudgeApiResponseSchema.safeParse(record.coachResponse);
    return parsed.success ? parsed.data : null;
  }, [nudgeQuery.data]);

  const generateMutation = useMutation({
    mutationFn: async (): Promise<CoachNudgeResponse> => {
      const response = await fetch("/api/coach/nudge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isGuest ? { "x-stopbucks-guest": "1" } : {}),
        },
        body: JSON.stringify({
          week_key: weekKey,
          currency: profile.currency,
          bias_analysis: bias,
          runway_metrics: runway,
        }),
      });

      if (!response.ok) {
        throw new Error(`Coach request failed with status ${response.status}.`);
      }

      const payload: unknown = await response.json();
      const parsed = coachNudgeApiResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("The coach returned an unexpected response.");
      }

      await repository.saveWeeklyNudge({
        weekKey,
        biasSnapshot: bias,
        coachResponse: parsed.data,
      });

      return parsed.data;
    },

    onSuccess: async (nudge) => {
      setOfflineNudge(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.weeklyNudge(cacheIdentity, weekKey) });
      toast.success(
        nudge.source === "gemini"
          ? "Your weekly experiment is ready."
          : "Weekly experiment ready (offline plan)."
      );
    },

    onError: async () => {
      // Never leave the student without a plan: persist the deterministic nudge.
      const fallback: CoachNudgeResponse = {
        ...buildDeterministicNudge(bias),
        source: "fallback",
      };
      setOfflineNudge(fallback);
      try {
        await repository.saveWeeklyNudge({
          weekKey,
          biasSnapshot: bias,
          coachResponse: fallback,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.weeklyNudge(cacheIdentity, weekKey) });
      } catch {
        // Local state still shows the plan for this session.
      }
      toast("The online coach is unavailable, so we generated a deterministic plan.");
    },
  });

  const nudge = cachedNudge ?? offlineNudge ?? generateMutation.data ?? null;
  const isGenerating = generateMutation.isPending;

  return (
    <Card className="border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-white">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <CardTitle as="h2" className="text-base">Weekly Behavioral Coach</CardTitle>
              <CardDescription className="text-xs">
                One small experiment for ISO week {weekKey}
              </CardDescription>
            </div>
          </div>

          {nudge && (
            <div className="flex items-center gap-2">
              <Badge
                className={
                  nudge.source === "gemini"
                    ? "border-transparent bg-sky-100 text-sky-800 text-[10px]"
                    : "border-transparent bg-slate-100 text-slate-700 text-[10px]"
                }
              >
                {nudge.source === "gemini" ? "Gemini" : "Deterministic"}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateMutation.mutate()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {nudgeQuery.isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        ) : !nudge ? (
          <div className="rounded-lg border border-dashed border-sky-200 bg-white/70 p-5 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-sky-500" />
            <p className="mt-2 text-sm font-medium text-slate-800">
              Your weekly experiment is not generated yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              The coach uses only aggregated bias scores and runway totals to design one
              three-day habit experiment. Nothing personal is shared.
            </p>
            <Button
              className="mt-3"
              onClick={() => generateMutation.mutate()}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? "Designing your experiment..." : "Generate this week's plan"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-base font-semibold leading-snug text-slate-900">
              {nudge.headline}
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
                Primary bias: {nudge.primary_bias}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium tabular-nums text-emerald-800">
                Projected savings:{" "}
                {formatAmount(
                  nudge.projected_savings_minor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Three-day experiment
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {nudge.three_day_experiment}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
