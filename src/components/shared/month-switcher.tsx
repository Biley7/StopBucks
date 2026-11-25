"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MonthYear } from "@/domain/runway-insights";

interface MonthSwitcherProps {
  selectedMonth: MonthYear;
  currentMonth: MonthYear;
  onChange: (month: MonthYear) => void;
  className?: string;
}

export function MonthSwitcher({
  selectedMonth,
  currentMonth,
  onChange,
  className,
}: MonthSwitcherProps) {
  const isCurrentMonth =
    selectedMonth.year === currentMonth.year &&
    selectedMonth.month === currentMonth.month;

  const canGoNext =
    selectedMonth.year < currentMonth.year ||
    (selectedMonth.year === currentMonth.year &&
      selectedMonth.month < currentMonth.month);

  const handlePrev = () => {
    if (selectedMonth.month === 1) {
      onChange({ year: selectedMonth.year - 1, month: 12 });
    } else {
      onChange({ year: selectedMonth.year, month: selectedMonth.month - 1 });
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (selectedMonth.month === 12) {
      onChange({ year: selectedMonth.year + 1, month: 1 });
    } else {
      onChange({ year: selectedMonth.year, month: selectedMonth.month + 1 });
    }
  };

  const dateForFormatting = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
  const monthName = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(dateForFormatting);

  return (
    <nav
      aria-label="Month navigation"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-xs",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        onClick={handlePrev}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        className="flex items-center gap-2 px-2.5 py-1 text-xs font-semibold text-slate-800"
        aria-live="polite"
      >
        <Calendar className="h-3.5 w-3.5 text-slate-400" />
        <span>{monthName}</span>
        {isCurrentMonth ? (
          <Badge
            variant="secondary"
            className="border-transparent bg-sky-100 text-[10px] font-medium text-sky-800 px-1.5 py-0"
          >
            Active
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-slate-200 text-[10px] font-normal text-slate-500 px-1.5 py-0"
          >
            Historical
          </Badge>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
