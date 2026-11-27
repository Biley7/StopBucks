"use client";

import React from "react";
import { ShieldCheck, ShoppingBag } from "lucide-react";
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
    <Card className="min-w-0 border-slate-900/[0.08]">
      <CardHeader className="pb-3">
        <CardTitle as="h2" className="text-base">Vault History</CardTitle>
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
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <Badge
                      className={
                        item.status === "rescued"
                          ? "gap-1 border-transparent bg-emerald-100 text-[10px] text-emerald-900"
                          : "gap-1 border-transparent bg-slate-200 text-[10px] text-slate-800"
                      }
                    >
                      {item.status === "rescued" ? (
                        <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
                      ) : (
                        <ShoppingBag className="h-2.5 w-2.5" aria-hidden="true" />
                      )}
                      <span>{item.status === "rescued" ? "Rescued" : "Purchased"}</span>
                    </Badge>
                    <span>{TRIGGER_LABELS[item.triggerTag]}</span>
                    <span className="tabular-nums text-slate-500">
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
