"use client";

import React from "react";
import {
  Award,
  Brain,
  CreditCard,
  Crown,
  Flame,
  Layers,
  LifeBuoy,
  Scale,
  Shield,
  TrendingUp,
} from "lucide-react";
import type { DojoBelt, DojoCitation, DojoWorldId } from "@/domain/dojo-types";

export interface DojoBeltVisualStyle {
  badgeClass: string;
  swatchClass: string;
  progressBarClass: string;
  activeBorderClass: string;
  label: string;
}

export const DOJO_BELT_STYLES: Record<DojoBelt, DojoBeltVisualStyle> = {
  "White Belt": {
    badgeClass: "border-stone-300 bg-stone-50 text-stone-800",
    swatchClass: "border border-stone-300 bg-white",
    progressBarClass: "bg-slate-700",
    activeBorderClass: "border-stone-400 bg-stone-50/70",
    label: "White",
  },
  "Yellow Belt": {
    badgeClass: "border-amber-300 bg-amber-50 text-amber-900",
    swatchClass: "border border-amber-500/40 bg-amber-400",
    progressBarClass: "bg-amber-500",
    activeBorderClass: "border-amber-300 bg-amber-50/70",
    label: "Yellow",
  },
  "Green Belt": {
    badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-900",
    swatchClass: "border border-emerald-700/30 bg-emerald-600",
    progressBarClass: "bg-emerald-600",
    activeBorderClass: "border-emerald-300 bg-emerald-50/70",
    label: "Green",
  },
  "Blue Belt": {
    badgeClass: "border-blue-300 bg-blue-50 text-blue-900",
    swatchClass: "border border-blue-700/30 bg-blue-600",
    progressBarClass: "bg-blue-600",
    activeBorderClass: "border-blue-300 bg-blue-50/70",
    label: "Blue",
  },
  "Black Belt": {
    badgeClass: "border-amber-400/70 bg-slate-900 text-amber-300",
    swatchClass: "border border-amber-400 bg-slate-950",
    progressBarClass: "bg-slate-900",
    activeBorderClass: "border-slate-900 bg-slate-900 text-white",
    label: "Black",
  },
};

export const DOJO_WORLD_STYLES: Record<
  DojoWorldId,
  {
    bannerBorderClass: string;
    bannerLeftAccentClass: string;
    bannerAccentBg: string;
    worldPillClass: string;
    progressBarClass: string;
  }
> = {
  "world-1": {
    bannerBorderClass: "border-amber-200 bg-white",
    bannerLeftAccentClass: "border-l-4 border-l-amber-500",
    bannerAccentBg: "bg-amber-50 text-amber-900 border-amber-200",
    worldPillClass: "border-amber-200 bg-amber-50 text-amber-800",
    progressBarClass: "bg-amber-500",
  },
  "world-2": {
    bannerBorderClass: "border-sky-200 bg-white",
    bannerLeftAccentClass: "border-l-4 border-l-sky-600",
    bannerAccentBg: "bg-sky-50 text-sky-900 border-sky-200",
    worldPillClass: "border-sky-200 bg-sky-50 text-sky-800",
    progressBarClass: "bg-sky-600",
  },
  "world-3": {
    bannerBorderClass: "border-emerald-200 bg-white",
    bannerLeftAccentClass: "border-l-4 border-l-emerald-600",
    bannerAccentBg: "bg-emerald-50 text-emerald-900 border-emerald-200",
    worldPillClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    progressBarClass: "bg-emerald-600",
  },
};

const BADGE_ICON_MAP = {
  shield: Shield,
  "credit-card": CreditCard,
  flame: Flame,
  scale: Scale,
  brain: Brain,
  layers: Layers,
  "life-buoy": LifeBuoy,
  "trending-up": TrendingUp,
  crown: Crown,
} as const;

export function DojoBadgeIcon({
  iconName,
  className,
}: {
  iconName: string;
  className?: string;
}) {
  const Icon =
    BADGE_ICON_MAP[iconName as keyof typeof BADGE_ICON_MAP] ?? Award;
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * Formats curriculum estimatedSeconds accurately without inventing estimates.
 */
export function formatEstimatedDuration(estimatedSeconds: number): string {
  if (!Number.isFinite(estimatedSeconds) || estimatedSeconds <= 0) {
    return "~3 min";
  }
  const minutes = Math.floor(estimatedSeconds / 60);
  const seconds = Math.round(estimatedSeconds % 60);
  if (minutes === 0) {
    return `${seconds}s`;
  }
  if (seconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes}m ${seconds}s`;
}

export function formatCitationChipLabel(citation: DojoCitation): string {
  return `${citation.authors} (${citation.year})`;
}
