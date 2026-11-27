import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  subtitle?: string;
  tone?: "light" | "dark";
  className?: string;
};

const SIZE_MAP = {
  sm: {
    box: "h-9 w-9 rounded-lg",
    px: 36,
    wordmark: "text-base font-bold tracking-tight",
    subtitle: "text-[10px] font-semibold uppercase tracking-wider",
  },
  md: {
    box: "h-10 w-10 rounded-xl",
    px: 40,
    wordmark: "text-base font-bold tracking-tight sm:text-lg",
    subtitle: "text-[10px] font-semibold uppercase tracking-wider",
  },
  lg: {
    box: "h-16 w-16 rounded-2xl",
    px: 64,
    wordmark: "text-xl font-extrabold tracking-tight",
    subtitle: "text-xs font-semibold uppercase tracking-wider",
  },
} as const;

/**
 * Reusable StopBucks brand mark backed by the canonical supplied logo asset.
 * Preserves aspect ratio (object-contain), supports light/dark surfaces, and
 * avoids duplicate screen-reader announcements when the adjacent wordmark renders.
 */
export function BrandMark({
  size = "md",
  showWordmark = false,
  subtitle,
  tone = "light",
  className,
}: BrandMarkProps) {
  const cfg = SIZE_MAP[size];
  const isDark = tone === "dark";

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white p-0.5 shadow-2xs",
          isDark ? "ring-1 ring-white/20" : "ring-1 ring-slate-200/80",
          cfg.box
        )}
      >
        <Image
          src="/stopbucks-logo.png"
          width={cfg.px}
          height={cfg.px}
          alt={showWordmark ? "" : "StopBucks"}
          aria-hidden={showWordmark ? true : undefined}
          className="h-full w-full object-contain"
          priority={size === "lg"}
        />
      </span>

      {showWordmark && (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              "block truncate",
              cfg.wordmark,
              isDark ? "text-white" : "text-slate-900"
            )}
          >
            StopBucks
          </span>
          {subtitle && (
            <span
              className={cn(
                "block truncate",
                cfg.subtitle,
                isDark ? "text-emerald-300" : "text-emerald-700"
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
