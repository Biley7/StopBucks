"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, FastForward, Loader2, ShoppingBag, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { TRIGGER_LABELS } from "@/domain/runway-insights";
import type { UserProfile, VaultItem } from "@/domain/types";

interface CoolingItemCardProps {
  item: VaultItem;
  profile: UserProfile;
  isGuest: boolean;
  isResolving: boolean;
  isSimulating: boolean;
  onRescue: (item: VaultItem) => void;
  onPurchase: (item: VaultItem) => void;
  onSimulate: (item: VaultItem) => void;
}

export function formatRemaining(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m remaining`;
}

export function CoolingItemCard({
  item,
  profile,
  isGuest,
  isResolving,
  isSimulating,
  onRescue,
  onPurchase,
  onSimulate,
}: CoolingItemCardProps) {
  const { formatAmount } = useDisplayPreference();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const unlockMs = new Date(item.unlockAt).getTime();
  const createdMs = new Date(item.createdAt).getTime();
  const remainingMs = now === null ? null : unlockMs - now;
  const isUnlocked = remainingMs !== null && remainingMs <= 0;

  const totalWindowMs = Math.max(1, unlockMs - createdMs);
  const elapsedMs = now === null ? 0 : Math.min(totalWindowMs, Math.max(0, now - createdMs));
  const progressPercent = Math.round((elapsedMs / totalWindowMs) * 100);

  return (
    <Card
      className={
        isUnlocked
          ? "border-emerald-300 bg-emerald-50/40"
          : "border-amber-200 bg-amber-50/30"
      }
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{item.itemName}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {TRIGGER_LABELS[item.triggerTag]} · parked{" "}
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <Badge
            className={
              isUnlocked
                ? "border-transparent bg-emerald-100 text-[10px] text-emerald-800"
                : "border-transparent bg-amber-100 text-[10px] text-amber-800"
            }
          >
            {isUnlocked ? "Unlocked" : "Cooling"}
          </Badge>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <p className="text-lg font-bold tabular-nums text-slate-900">
            {formatAmount(item.priceMinor, profile.currency, profile.hourlyRateMinor)}
          </p>
          <p className="text-[11px] text-slate-500">
            Unlocks{" "}
            {new Date(item.unlockAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/80">
            <div
              className={`h-full rounded-full transition-all ${
                isUnlocked ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 tabular-nums">
            <Timer className="h-3 w-3" />
            {remainingMs === null
              ? "Calculating cool-off..."
              : isUnlocked
                ? "Cool-off complete"
                : formatRemaining(remainingMs)}
          </p>
        </div>

        {isUnlocked ? (
          <div className="space-y-2">
            <p className="text-[11px] text-emerald-900">
              Still want it? Decide with a calm head.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onRescue(item)}
                disabled={isResolving}
              >
                {isResolving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Skipped It
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onPurchase(item)}
                disabled={isResolving}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Still Bought It
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-slate-500">Actions appear when the timer ends.</p>
            {isGuest && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px] text-amber-800 hover:bg-amber-100"
                onClick={() => onSimulate(item)}
                disabled={isSimulating}
              >
                {isSimulating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <FastForward className="h-3 w-3" />
                )}
                Simulate 48h Elapsed
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
