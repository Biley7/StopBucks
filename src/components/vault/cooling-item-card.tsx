"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, FastForward, Hourglass, Loader2, ShoppingBag, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedProgressBar } from "@/components/shared/motion-primitives";
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
          ? "rounded-xl border-emerald-300 bg-emerald-50/40 shadow-[0_2px_6px_rgba(5,150,105,0.08)] transition-shadow duration-200 hover:shadow-[0_6px_18px_-4px_rgba(5,150,105,0.16)]"
          : "rounded-xl border-amber-200 bg-amber-50/30 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-shadow duration-200 hover:shadow-[0_6px_16px_-6px_rgba(217,119,6,0.14)]"
      }
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{item.itemName}</p>
            <p className="mt-0.5 text-[11px] text-slate-600">
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
                ? "shrink-0 gap-1 border-emerald-200 bg-emerald-100 text-[11px] text-emerald-900"
                : "shrink-0 gap-1 border-amber-200 bg-amber-100 text-[11px] text-amber-900"
            }
          >
            {isUnlocked ? (
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Hourglass className="h-3 w-3" aria-hidden="true" />
            )}
            <span>{isUnlocked ? "Unlocked" : "Cooling"}</span>
          </Badge>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-lg font-bold tabular-nums text-slate-900">
            {formatAmount(item.priceMinor, profile.currency, profile.hourlyRateMinor)}
          </p>
          <p className="text-[11px] tabular-nums text-slate-600">
            Unlocks{" "}
            {new Date(item.unlockAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="space-y-1.5">
          <AnimatedProgressBar
            value={progressPercent}
            ariaLabel="48-hour cool-off progress"
            trackClassName="bg-white/90 ring-1 ring-slate-200/70"
            barClassName={isUnlocked ? "bg-emerald-500" : "bg-amber-500"}
          />
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700 tabular-nums">
            <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {remainingMs === null
                ? "Calculating cool-off..."
                : isUnlocked
                  ? "Cool-off complete"
                  : formatRemaining(remainingMs)}
            </span>
          </p>
        </div>

        {isUnlocked ? (
          <div className="space-y-2 pt-0.5">
            <p className="text-xs font-medium text-emerald-900">
              Still want it? Decide with a calm head.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                className="h-9 flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => onRescue(item)}
                disabled={isResolving}
              >
                {isResolving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Skipped It
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 flex-1 border-rose-200 bg-white text-rose-800 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-900 focus-visible:ring-rose-500"
                onClick={() => onPurchase(item)}
                disabled={isResolving}
              >
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                Still Bought It
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <p className="text-[11px] text-slate-600">Actions appear when the timer ends.</p>
            {isGuest && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-amber-200 bg-white px-2.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100/70 focus-visible:ring-amber-500"
                onClick={() => onSimulate(item)}
                disabled={isSimulating}
              >
                {isSimulating ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <FastForward className="h-3 w-3" aria-hidden="true" />
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
