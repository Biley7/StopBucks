"use client";

import React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { formatAxisValue } from "@/lib/chart-format";
import type { DailyBurnPoint } from "@/domain/runway-insights";
import type { UserProfile } from "@/domain/types";

interface DailyBurnChartProps {
  series: DailyBurnPoint[];
  profile: UserProfile;
}

export function DailyBurnChart({ series, profile }: DailyBurnChartProps) {
  const { formatAmount, displayMode } = useDisplayPreference();
  const hasActualSpend = series.some((point) => (point.actualMinor ?? 0) > 0);

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle as="h2" className="text-base">Daily Burn vs Linear Pace</CardTitle>
        <CardDescription className="text-xs">
          Cumulative consumption this month against a healthy straight-line budget.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasActualSpend ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
            <p className="text-sm font-medium text-slate-700">No consumption logged this month</p>
            <p className="mt-1 text-xs text-slate-500">
              Add an expense in Quick Log and your burn curve will appear here.
            </p>
          </div>
        ) : (
          <div
            className="h-64 w-full sm:h-72"
            role="img"
            aria-label="Line chart comparing cumulative actual consumption against healthy linear budget pacing across the calendar month."
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
                <defs>
                  <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={(value: number) =>
                    formatAxisValue(
                      value,
                      profile.currency,
                      displayMode,
                      profile.hourlyRateMinor
                    )
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => `Day ${label}`}
                  formatter={(value, name) => [
                    formatAmount(
                      Number(value),
                      profile.currency,
                      profile.hourlyRateMinor
                    ),
                    String(name),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="actualMinor"
                  name="Actual consumption"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fill="url(#burnFill)"
                  connectNulls={false}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="idealMinor"
                  name="Linear budget pace"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-sky-600" aria-hidden />
            Actual cumulative consumption
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-slate-400" aria-hidden />
            Linear budget pace
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
