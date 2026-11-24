"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { TRIGGER_LABELS } from "@/domain/runway-insights";
import type { UserProfile, VaultItem } from "@/domain/types";

interface VaultHistoryProps {
  items: VaultItem[];
  profile: UserProfile;
}

export function VaultHistory({ items, profile }: VaultHistoryProps) {
  const { formatAmount } = useDisplayPreference();

  const rescued = items.filter((item) => item.status === "rescued");
  const purchased = items.filter((item) => item.status === "purchased");

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Vault History</CardTitle>
        <CardDescription className="text-xs">
          {rescued.length} rescued · {purchased.length} purchased after cooling
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">No resolved items yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Once a cool-off ends and you decide, it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {item.itemName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    <Badge
                      className={
                        item.status === "rescued"
                          ? "border-transparent bg-emerald-100 text-[9px] text-emerald-800"
                          : "border-transparent bg-slate-200 text-[9px] text-slate-700"
                      }
                    >
                      {item.status === "rescued" ? "Rescued" : "Purchased"}
                    </Badge>
                    <span>{TRIGGER_LABELS[item.triggerTag]}</span>
                    <span>
                      {item.resolvedAt ? item.resolvedAt.slice(0, 10) : "—"}
                    </span>
                  </div>
                </div>
                <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-900">
                  {formatAmount(item.priceMinor, profile.currency, profile.hourlyRateMinor)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
