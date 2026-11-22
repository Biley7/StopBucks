"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Hourglass, ShieldCheck, Lock, Layers } from "lucide-react";
import { useRepository } from "@/repositories/repository-provider";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VaultPage() {
  const { repository } = useRepository();
  const { formatAmount } = useDisplayPreference();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => repository.getProfile(),
  });

  const { data: vaultItems = [], isLoading } = useQuery({
    queryKey: ["vaultItems"],
    queryFn: () => repository.getVaultItems(),
  });

  const cooling = vaultItems.filter((i) => i.status === "cooling");
  const rescued = vaultItems.filter((i) => i.status === "rescued");
  const rescuedTotalMinor = rescued.reduce((acc, i) => acc + i.priceMinor, 0);

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              48-Hour Cool-Off Vault
            </h1>
            <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 text-[11px]">
              Phase 1 Foundation
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Pause mindless impulse before regret sets in.
          </p>
        </div>
      </div>

      {/* Vault Status Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <CardDescription className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Currently Cooling Off
              </CardDescription>
            </div>
            <CardTitle className="text-2xl font-extrabold text-amber-950">
              {cooling.length} item{cooling.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-700">
            Protected by active 48-hour dopamine cool-off timers
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <CardDescription className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Rescued from Regret
              </CardDescription>
            </div>
            <CardTitle className="text-2xl font-extrabold text-emerald-950">
              {formatAmount(
                rescuedTotalMinor,
                profile?.currency || "INR",
                profile?.hourlyRateMinor
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-emerald-700">
            {rescued.length} impulsive purchase{rescued.length === 1 ? "" : "s"} avoided after cooling
          </CardContent>
        </Card>
      </div>

      {/* Phase 2 Feature Roadmap Announcement */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Phase 2 Interactive Features: Coming Next</CardTitle>
          </div>
          <CardDescription>
            The vault repository methods and status lifecycle are fully implemented. In Phase 2, this module will feature:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">Live 48-Hour Countdown</p>
              <p className="text-xs text-slate-500 mt-1">
                Visual circular timer counting down until unlocking.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">The Post-Dopamine Prompt</p>
              <p className="text-xs text-slate-500 mt-1">
                "Do you still want this?" prompt with one-click "Rescue to Runway" or "Proceed".
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 text-xs">Cumulative Savings Counter</p>
              <p className="text-xs text-slate-500 mt-1">
                Real-time tally of avoided purchases redirected to self-investment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Seed Vault Items Verification */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Vault Items in Repository ({vaultItems.length})
            </CardTitle>
            <span className="text-xs text-slate-400">Connected to Active Repository</span>
          </div>
          <CardDescription>
            Items tracked in the repository state demonstrating the cooling and rescued statuses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-slate-400">Loading vault items...</p>
          ) : vaultItems.length === 0 ? (
            <p className="text-xs text-slate-400">Vault is empty.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {vaultItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-800">{item.itemName}</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.status === "rescued" ? "success" : "warning"}
                        className="text-[10px] px-1.5 py-0 capitalize"
                      >
                        {item.status}
                      </Badge>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {item.triggerTag.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {formatAmount(
                      item.priceMinor,
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

