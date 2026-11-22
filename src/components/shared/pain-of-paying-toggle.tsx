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
    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
      {options.map((opt) => {
        const isActive = displayMode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => setDisplayMode(opt.mode)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all cursor-pointer select-none ${
              isActive
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-500 hover:text-slate-900"
            }`}
            title={`Switch display unit to ${opt.label}`}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

