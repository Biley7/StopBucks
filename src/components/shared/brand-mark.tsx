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
    emblem: "h-9 w-9",
    px: 36,
    wordmark: "text-base font-bold tracking-tight",
    subtitle: "text-[10px] font-semibold uppercase tracking-wider",
  },
  md: {
    emblem: "h-10 w-10",
    px: 40,
    wordmark: "text-base font-bold tracking-tight sm:text-lg",
    subtitle: "text-[10px] font-semibold uppercase tracking-wider",
  },
  lg: {
    emblem: "h-[68px] w-[68px] sm:h-[72px] sm:w-[72px]",
    px: 72,
    wordmark: "text-xl font-extrabold tracking-tight",
    subtitle: "text-xs font-semibold uppercase tracking-wider",
  },
} as const;

/**
 * Reusable StopBucks brand mark backed by the tightly cropped octagonal emblem.
 * Sits directly on the application surface without an enclosing container,
 * preserves aspect ratio (object-contain), and avoids duplicate screen-reader
 * announcements when the adjacent wordmark renders.
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
      <Image
        src="/stopbucks-emblem.png"
        width={cfg.px}
        height={cfg.px}
        alt={showWordmark ? "" : "StopBucks"}
        aria-hidden={showWordmark ? true : undefined}
        className={cn("shrink-0 object-contain", cfg.emblem)}
        priority={size === "lg"}
      />

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
