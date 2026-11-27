"use client";

import React from "react";
import { Coins, Clock, TrendingUp } from "lucide-react";
import { useDisplayPreference } from "@/lib/display-preference-context";
import type { DisplayUnitMode } from "@/domain/types";

export function PainOfPayingToggle() {
  const { displayMode, setDisplayMode } = useDisplayPreference();

  const options: { mode: DisplayUnitMode; label: string; icon: React.ReactNode }[] = [
    { mode: "currency", label: "Currency", icon: <Coins className="h-3.5 w-3.5" /> },
    { mode: "work_hours", label: "Work Hours", icon: <Clock className="h-3.5 w-3.5" /> },
    { mode: "compounded_4yr", label: "4-Yr Cost", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      role="group"
      aria-label="Display unit mode"
      className="flex items-center rounded-xl border border-slate-200 bg-slate-100/90 p-0.5 text-xs font-medium"
    >
      {options.map((opt) => {
        const isActive = displayMode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            aria-pressed={isActive}
            aria-label={opt.label}
            onClick={() => setDisplayMode(opt.mode)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2 transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:px-2.5 ${
              isActive
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title={`Switch display unit to ${opt.label}`}
          >
            <span aria-hidden="true">{opt.icon}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

