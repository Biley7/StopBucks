"use client";

import React from "react";
import { Coins, Clock, TrendingUp } from "lucide-react";
import { useDisplayPreference } from "@/lib/display-preference-context";
import { SharedPillTabs } from "@/components/shared/motion-primitives";
import type { DisplayUnitMode } from "@/domain/types";

export function PainOfPayingToggle() {
  const { displayMode, setDisplayMode } = useDisplayPreference();

  const items: Array<{
    value: DisplayUnitMode;
    label: string;
    icon: React.ReactNode;
    title: string;
  }> = [
    {
      value: "currency",
      label: "Currency",
      icon: <Coins className="h-3.5 w-3.5" />,
      title: "Switch display unit to Currency",
    },
    {
      value: "work_hours",
      label: "Work Hours",
      icon: <Clock className="h-3.5 w-3.5" />,
      title: "Switch display unit to Work Hours",
    },
    {
      value: "compounded_4yr",
      label: "4-Yr Cost",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      title: "Switch display unit to 4-Yr Cost",
    },
  ];

  return (
    <SharedPillTabs
      items={items.map((item) => ({
        value: item.value,
        label: item.label,
        ariaLabel: item.label,
        title: item.title,
        icon: item.icon,
      }))}
      value={displayMode}
      onChange={setDisplayMode}
      ariaLabel="Display unit mode"
      layoutId="pain-of-paying-active-pill"
      hideLabelOnMobile
      pillClassName="px-2 sm:px-2.5"
      className="text-xs font-medium"
    />
  );
}
