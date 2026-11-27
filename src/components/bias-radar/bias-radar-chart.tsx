"use client";

import React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BiasAnalysisResult } from "@/domain/types";

interface BiasRadarChartProps {
  bias: BiasAnalysisResult;
}

export function BiasRadarChart({ bias }: BiasRadarChartProps) {
  const data = [
    { axis: "Late-Night", score: bias.lateNightDrift.score },
    { axis: "Cashless", score: bias.cashlessNumbness.score },
    { axis: "Payday Burn", score: bias.paydayBurn.score },
    { axis: "Social FOMO", score: bias.socialFomo.score },
  ];

  const hasSignal = data.some((entry) => entry.score > 0);

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-1">
        <CardTitle as="h2" className="text-base">Behavioral Footprint</CardTitle>
        <CardDescription className="text-xs">
          Four deterministic detectors, scored 0–100 from your recorded transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSignal ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
            <p className="text-sm font-medium text-slate-700">Not enough signal yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Log a few expenses and your four-axis pattern will appear here.
            </p>
          </div>
        ) : (
          <div
            className="h-64 w-full sm:h-72"
            role="img"
            aria-label={`Radar chart showing behavioral bias scores: Late-Night Drift ${bias.lateNightDrift.score} of 100, Cashless Numbness ${bias.cashlessNumbness.score} of 100, Payday Burn ${bias.paydayBurn.score} of 100, Social FOMO ${bias.socialFomo.score} of 100. Overall risk score is ${bias.overallRiskScore} of 100.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={data}
                outerRadius="56%"
                margin={{ top: 12, right: 36, bottom: 12, left: 36 }}
              >
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontSize: 10, fill: "#475569" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  tickCount={5}
                  stroke="#e2e8f0"
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(value) => [`${Number(value)} / 100`, "Score"]}
                />
                <Radar
                  name="Bias score"
                  dataKey="score"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fill="#0284c7"
                  fillOpacity={0.2}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="mt-2 text-center text-xs text-slate-600">
          Overall behavioral risk score:{" "}
          <span className="font-semibold tabular-nums text-slate-900">
            {bias.overallRiskScore}/100
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
