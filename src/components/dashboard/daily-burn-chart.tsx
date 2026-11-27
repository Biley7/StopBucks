"use client";

import React from "react";
import { useReducedMotion } from "framer-motion";
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

interface BurnTooltipPayloadItem {
  dataKey?: string;
  name?: string;
  value?: number | null;
  color?: string;
  payload?: DailyBurnPoint;
}

interface BurnTooltipProps {
  active?: boolean;
  payload?: BurnTooltipPayloadItem[];
  label?: string | number;
  formatValue: (minorUnits: number) => string;
}

function DailyBurnTooltip({ active, payload, label, formatValue }: BurnTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload;
  const actualMinor = point?.actualMinor;
  const idealMinor = point?.idealMinor ?? 0;

  return (
    <div className="min-w-[170px] rounded-xl border border-slate-900/[0.08] bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur-xs">
      <p className="font-semibold text-slate-900">Day {label}</p>
      <div className="mt-1.5 space-y-1">
        {actualMinor !== null && actualMinor !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-sky-600" aria-hidden="true" />
              Actual
            </span>
            <span className="font-semibold tabular-nums tracking-[-0.025em] text-slate-900">
              {formatValue(actualMinor)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
            Linear pace
          </span>
          <span className="font-medium tabular-nums tracking-[-0.025em] text-slate-700">
            {formatValue(idealMinor)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DailyBurnChart({ series, profile }: DailyBurnChartProps) {
  const { formatAmount, displayMode } = useDisplayPreference();
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const hasActualSpend = series.some((point) => (point.actualMinor ?? 0) > 0);
  const latestActualPoint = [...series]
    .reverse()
    .find((point) => point.actualMinor !== null);

  return (
    <Card className="border-slate-900/[0.08]">
      <CardHeader className="pb-2">
        <CardTitle as="h2" className="text-base">Daily Burn vs Linear Pace</CardTitle>
        <CardDescription className="text-xs">
          Cumulative consumption this month against a healthy straight-line budget.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasActualSpend ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-900/[0.12] bg-slate-50/90 px-6 text-center">
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
              <ComposedChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: -4 }}>
                <defs>
                  <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.01} />
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
                  isAnimationActive={false}
                  cursor={{
                    stroke: "#0284c7",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                    strokeOpacity: 0.5,
                  }}
                  content={({ active, payload, label }) => (
                    <DailyBurnTooltip
                      active={active}
                      payload={payload as BurnTooltipPayloadItem[] | undefined}
                      label={label}
                      formatValue={(minor) =>
                        formatAmount(minor, profile.currency, profile.hourlyRateMinor)
                      }
                    />
                  )}
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
                  activeDot={{
                    r: 5,
                    fill: "#0284c7",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                  isAnimationActive={!shouldReduceMotion}
                  animationBegin={0}
                  animationDuration={450}
                  animationEasing="ease-out"
                />
                <Line
                  type="linear"
                  dataKey="idealMinor"
                  name="Linear budget pace"
                  stroke="#94a3b8"
                  strokeWidth={1.75}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{
                    r: 3.5,
                    fill: "#94a3b8",
                    stroke: "#ffffff",
                    strokeWidth: 1.5,
                  }}
                  isAnimationActive={!shouldReduceMotion}
                  animationBegin={0}
                  animationDuration={450}
                  animationEasing="ease-out"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-sky-600" aria-hidden="true" />
              Actual cumulative consumption
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-slate-400" aria-hidden="true" />
              Linear budget pace
            </span>
          </div>

          {hasActualSpend && latestActualPoint && latestActualPoint.actualMinor !== null && (
            <div className="tabular-nums text-slate-600">
              Latest (Day {latestActualPoint.label}):{" "}
              <strong className="font-semibold text-slate-900">
                {formatAmount(
                  latestActualPoint.actualMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              </strong>{" "}
              vs{" "}
              <span className="font-medium text-slate-700">
                {formatAmount(
                  latestActualPoint.idealMinor,
                  profile.currency,
                  profile.hourlyRateMinor
                )}
              </span>{" "}
              pace
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
