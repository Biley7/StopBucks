"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, Layers, Clock, Zap, Tag } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function QuickLogPage() {
  const { repository } = useRepository();
  const { formatAmount } = useDisplayPreference();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => repository.getProfile(),
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => repository.getTransactions(),
  });

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quick Log & Trigger Tagging
            </h1>
            <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 text-[11px]">
              Phase 1 Foundation
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Psychological trigger tagging before spending habits solidify.
          </p>
        </div>
      </div>

      {/* Phase 2 Feature Roadmap Announcement */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Phase 2 Interactive Features: Coming Next</CardTitle>
          </div>
          <CardDescription>
            The repository transaction contracts and schema validations are active. In Phase 2, this module will feature:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">Natural-Language Parsing</p>
              <p className="text-xs text-slate-500 mt-1">
                Type "₹60 chai at 11pm" or "250 swiggy dinner" and let Gemini extract amount, trigger, and time.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">One-Tap Trigger Selector</p>
              <p className="text-xs text-slate-500 mt-1">
                Instant categorization across need, convenience, stress, FOMO, and invest-in-self.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">Immediate Runway Feedback</p>
              <p className="text-xs text-slate-500 mt-1">
                See today's safe allowance recalculate instantly upon logging without refresh.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Seed Transactions Verification */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Recent Transactions ({transactions.length} Recorded)
            </CardTitle>
            <span className="text-xs text-slate-400">Connected to Active Repository</span>
          </div>
          <CardDescription>
            Real data from the repository illustrating all 5 trigger tags and both payment modes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-slate-400">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-slate-400">No transactions recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.slice(0, 6).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-800">{tx.note || "Untitled expense"}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                        {tx.triggerTag.replace("_", " ")}
                      </Badge>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {tx.paymentMode}
                      </span>
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {formatAmount(
                      tx.amountMinor,
                      profile?.currency || "INR",
                      profile?.hourlyRateMinor
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

