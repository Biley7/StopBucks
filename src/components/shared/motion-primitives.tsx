"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { splitFormattedDisplayParts } from "@/lib/format-parts";
import { cn } from "@/lib/utils";

export const FINTECH_EASE = [0.16, 1, 0.3, 1] as const;

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FadeInSection({
  children,
  className,
  delay = 0,
}: FadeInSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.3, delay, ease: FINTECH_EASE }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

const GRID_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045,
    },
  },
};

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: FINTECH_EASE,
    },
  },
};

interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerGrid({ children, className }: StaggerGridProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  return (
    <motion.div
      variants={GRID_VARIANTS}
      initial={shouldReduceMotion ? false : "hidden"}
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={ITEM_VARIANTS} className={className}>
      {children}
    </motion.div>
  );
}

interface AnimatedProgressBarProps {
  value: number;
  ariaLabel: string;
  ariaValueNow?: number;
  ariaValueMax?: number;
  ariaValueText?: string;
  trackClassName?: string;
  barClassName?: string;
  className?: string;
}

/**
 * GPU-composited progress bar animating only `scaleX` from left origin.
 * Never animates layout geometry (`width`). Clamps only visual fill to [0, 100].
 */
export function AnimatedProgressBar({
  value,
  ariaLabel,
  ariaValueNow,
  ariaValueMax = 100,
  ariaValueText,
  trackClassName,
  barClassName,
  className,
}: AnimatedProgressBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const clampedPct = Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : 0;
  const scaleX = clampedPct / 100;
  const accessibleNow =
    ariaValueNow !== undefined && Number.isFinite(ariaValueNow)
      ? ariaValueNow
      : clampedPct;

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={ariaValueMax}
      aria-valuenow={accessibleNow}
      aria-valuetext={ariaValueText}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-200/80",
        trackClassName,
        className
      )}
    >
      <motion.div
        initial={shouldReduceMotion ? { scaleX } : { scaleX: 0 }}
        animate={{ scaleX }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.45, ease: FINTECH_EASE }
        }
        style={{ transformOrigin: "left" }}
        className={cn("h-full w-full rounded-full bg-sky-600 will-change-transform", barClassName)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RollingNumber — GPU-composited odometer transition for formatted values
// ---------------------------------------------------------------------------

export interface RollingNumberProps {
  /** Pre-formatted display string (e.g. "₹1,240.00", "4.5 hrs of work", "120"). */
  value: string;
  /** Optional static trailing suffix (e.g. " XP", "%", "x"). */
  suffix?: string;
  /** Visual hierarchy for currency symbols, decimals, and unit suffixes. */
  hierarchy?: "none" | "subtle" | "prominent";
  className?: string;
  symbolClassName?: string;
  decimalClassName?: string;
  suffixClassName?: string;
}

interface RollTransitionState {
  from: string;
  to: string;
  nonce: number;
  direction: 1 | -1;
}

const DIGIT_RE = /^[0-9]$/;

function extractNumericHint(formatted: string): number | null {
  const cleaned = formatted.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function getHierarchyClasses(
  hierarchy: "none" | "subtle" | "prominent",
  symbolClassName?: string,
  decimalClassName?: string,
  suffixClassName?: string
) {
  if (hierarchy === "none") {
    return {
      symbol: symbolClassName ?? "",
      decimal: decimalClassName ?? "",
      suffix: cn("whitespace-pre", suffixClassName),
    };
  }
  if (hierarchy === "prominent") {
    return {
      symbol: cn("text-[0.62em] font-semibold text-slate-400 mr-[0.06em]", symbolClassName),
      decimal: cn("text-[0.62em] font-semibold text-slate-400", decimalClassName),
      suffix: cn("whitespace-pre text-[0.5em] font-medium text-slate-500 tracking-normal", suffixClassName),
    };
  }
  return {
    symbol: cn("text-[0.82em] font-medium text-slate-400 mr-[0.04em]", symbolClassName),
    decimal: cn("text-[0.84em] font-medium text-slate-400", decimalClassName),
    suffix: cn("whitespace-pre text-[0.82em] font-medium text-slate-500 tracking-normal", suffixClassName),
  };
}

/**
 * Pure presentation odometer component for already-formatted numbers/currencies.
 * Animates only changed numeric digits vertically (`y` + `opacity`) without
 * altering precision, rounding, locale punctuation, or screen-reader output.
 */
export function RollingNumber({
  value,
  suffix = "",
  hierarchy = "none",
  className,
  symbolClassName,
  decimalClassName,
  suffixClassName,
}: RollingNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const fullValue = `${value}${suffix}`;
  const prevValueRef = useRef<string>(fullValue);
  const nonceRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const [transition, setTransition] = useState<RollTransitionState | null>(null);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (prev === fullValue) return;
    prevValueRef.current = fullValue;

    if (shouldReduceMotion) {
      setTransition(null);
      return;
    }

    const prevNum = extractNumericHint(prev);
    const nextNum = extractNumericHint(fullValue);
    const direction: 1 | -1 =
      prevNum !== null && nextNum !== null && nextNum < prevNum ? -1 : 1;

    nonceRef.current += 1;
    setTransition({
      from: prev,
      to: fullValue,
      nonce: nonceRef.current,
      direction,
    });

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setTransition(null);
      timerRef.current = null;
    }, 260);
  }, [fullValue, shouldReduceMotion]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const styles = getHierarchyClasses(
    hierarchy,
    symbolClassName,
    decimalClassName,
    suffixClassName
  );

  const nextParts = splitFormattedDisplayParts(value);
  const activeTransition =
    !shouldReduceMotion && transition && transition.to === fullValue
      ? transition
      : null;

  const isSingleCharAtRest = !activeTransition && fullValue.length <= 1;
  if (isSingleCharAtRest) {
    return (
      <span
        className={cn(
          "inline-flex items-baseline tabular-nums tracking-[-0.025em]",
          className
        )}
      >
        {fullValue}
      </span>
    );
  }

  // Determine whether we can roll digits individually or roll the formatted value block
  const prevValueOnly = activeTransition
    ? suffix && activeTransition.from.endsWith(suffix)
      ? activeTransition.from.slice(0, -suffix.length)
      : activeTransition.from
    : null;
  const prevParts = prevValueOnly !== null ? splitFormattedDisplayParts(prevValueOnly) : null;

  const canRollPerDigit =
    Boolean(activeTransition && prevParts) &&
    prevParts !== null &&
    prevParts.prefix === nextParts.prefix &&
    prevParts.suffix === nextParts.suffix &&
    Boolean(prevParts.integer) &&
    Boolean(nextParts.integer);

  const renderAnimatedChar = (
    char: string,
    prevChar: string | null,
    key: string,
    slotClassName?: string
  ) => {
    const changed =
      activeTransition !== null &&
      prevChar !== null &&
      prevChar !== char &&
      DIGIT_RE.test(char);

    if (!changed || !activeTransition) {
      return (
        <span key={key} aria-hidden="true" className={slotClassName}>
          {char}
        </span>
      );
    }

    const enterY = activeTransition.direction * 10;
    const exitY = -activeTransition.direction * 10;

    return (
      <span
        key={key}
        aria-hidden="true"
        className={cn(
          "relative inline-block overflow-hidden align-baseline",
          slotClassName
        )}
      >
        <motion.span
          key={`in-${activeTransition.nonce}-${char}`}
          initial={{ y: enterY, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.22, ease: FINTECH_EASE }}
          className="inline-block will-change-transform"
        >
          {char}
        </motion.span>
        <motion.span
          key={`out-${activeTransition.nonce}-${prevChar}`}
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: exitY, opacity: 0 }}
          transition={{ duration: 0.2, ease: FINTECH_EASE }}
          className="pointer-events-none absolute inset-0 inline-block select-none will-change-transform"
        >
          {prevChar}
        </motion.span>
      </span>
    );
  };

  if (activeTransition && !canRollPerDigit) {
    const enterY = activeTransition.direction * 10;
    const exitY = -activeTransition.direction * 10;

    return (
      <span
        className={cn(
          "relative inline-flex items-baseline overflow-hidden tabular-nums tracking-[-0.025em]",
          className
        )}
      >
        <span className="sr-only">{fullValue}</span>
        <motion.span
          key={`block-in-${activeTransition.nonce}`}
          aria-hidden="true"
          initial={{ y: enterY, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.22, ease: FINTECH_EASE }}
          className="inline-flex items-baseline will-change-transform"
        >
          {nextParts.prefix && (
            <span className={styles.symbol}>{nextParts.prefix}</span>
          )}
          {nextParts.integer && <span>{nextParts.integer}</span>}
          {nextParts.decimal && (
            <span className={styles.decimal}>{nextParts.decimal}</span>
          )}
          {(nextParts.suffix || suffix) && (
            <span className={styles.suffix}>
              {nextParts.suffix}
              {suffix}
            </span>
          )}
        </motion.span>
        <motion.span
          key={`block-out-${activeTransition.nonce}`}
          aria-hidden="true"
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: exitY, opacity: 0 }}
          transition={{ duration: 0.18, ease: FINTECH_EASE }}
          className="pointer-events-none absolute inset-0 inline-flex items-baseline select-none whitespace-nowrap will-change-transform"
        >
          {activeTransition.from}
        </motion.span>
      </span>
    );
  }

  const intChars = Array.from(nextParts.integer);
  const prevIntChars = prevParts ? Array.from(prevParts.integer) : [];
  const decChars = Array.from(nextParts.decimal);
  const prevDecChars = prevParts ? Array.from(prevParts.decimal) : [];

  return (
    <span
      className={cn(
        "inline-flex items-baseline tabular-nums tracking-[-0.025em]",
        className
      )}
    >
      <span className="sr-only">{fullValue}</span>
      {nextParts.prefix && (
        <span aria-hidden="true" className={styles.symbol}>
          {nextParts.prefix}
        </span>
      )}
      {intChars.map((ch, idx) => {
        const fromRight = intChars.length - 1 - idx;
        const prevIdx = prevIntChars.length - 1 - fromRight;
        const prevChar =
          prevParts && prevIdx >= 0 ? (prevIntChars[prevIdx] ?? "") : prevParts ? "" : null;
        return renderAnimatedChar(ch, prevChar, `int-r${fromRight}`);
      })}
      {decChars.map((ch, idx) => {
        const prevChar = prevParts ? (prevDecChars[idx] ?? "") : null;
        return renderAnimatedChar(ch, prevChar, `dec-${idx}`, styles.decimal);
      })}
      {(nextParts.suffix || suffix) && (
        <span aria-hidden="true" className={styles.suffix}>
          {nextParts.suffix}
          {suffix}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SharedPillTabs — Reusable sliding indicator pill control via Framer layoutId
// ---------------------------------------------------------------------------

export interface SharedPillTabItem<T extends string = string> {
  value: T;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  activeClassName?: string;
  activeIndicatorClassName?: string;
}

export interface SharedPillTabsProps<T extends string = string> {
  items: ReadonlyArray<SharedPillTabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  role?: "group" | "tablist";
  layoutId?: string;
  size?: "sm" | "md";
  wrap?: boolean;
  fullWidth?: boolean;
  hideLabelOnMobile?: boolean;
  className?: string;
  pillClassName?: string;
  indicatorClassName?: string;
}

/**
 * Reusable pill switcher with GPU-composited sliding active indicator (`layoutId`).
 * Preserves semantic `role="group"` (`aria-pressed`) or `role="tablist"` (`aria-selected`),
 * full keyboard support, disabled states, and `useReducedMotion()`.
 */
export function SharedPillTabs<T extends string = string>({
  items,
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  role = "group",
  layoutId,
  size = "sm",
  wrap = false,
  fullWidth = false,
  hideLabelOnMobile = false,
  className,
  pillClassName,
  indicatorClassName,
}: SharedPillTabsProps<T>) {
  const autoId = useId();
  const resolvedLayoutId = layoutId ?? `pill-tabs-${autoId}`;
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }

    const enabledIndices = items
      .map((item, idx) => (item.disabled ? -1 : idx))
      .filter((idx) => idx !== -1);
    if (enabledIndices.length === 0) return;

    let nextIndex: number | undefined;
    if (event.key === "Home") {
      nextIndex = enabledIndices[0];
    } else if (event.key === "End") {
      nextIndex = enabledIndices[enabledIndices.length - 1];
    } else {
      const pos = enabledIndices.indexOf(index);
      if (pos !== -1) {
        const delta = event.key === "ArrowRight" ? 1 : -1;
        nextIndex =
          enabledIndices[(pos + delta + enabledIndices.length) % enabledIndices.length];
      }
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      buttonRefs.current[nextIndex]?.focus();
      onChange(items[nextIndex].value);
    }
  };

  return (
    <div
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        wrap
          ? "flex flex-wrap items-center gap-1.5"
          : "inline-flex items-center overflow-hidden rounded-xl border border-slate-900/[0.08] bg-slate-100/90 p-0.5",
        fullWidth && !wrap && "flex w-full",
        className
      )}
    >
      {items.map((item, idx) => {
        const isActive = item.value === value;
        const sizeClasses = wrap
          ? "min-h-[34px] rounded-full px-3 py-1.5 text-xs"
          : size === "md"
            ? "min-h-[36px] rounded-lg px-3 py-1.5 text-xs sm:text-sm"
            : "h-7 rounded-lg px-2 text-xs sm:px-2.5";

        return (
          <button
            key={item.value}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            type="button"
            disabled={item.disabled}
            role={role === "tablist" ? "tab" : undefined}
            aria-selected={role === "tablist" ? isActive : undefined}
            aria-pressed={role === "group" ? isActive : undefined}
            aria-label={item.ariaLabel ?? item.label}
            title={item.title}
            onClick={() => {
              if (!item.disabled) onChange(item.value);
            }}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 font-medium select-none cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
              fullWidth && !wrap && "flex-1",
              wrap &&
                "border border-slate-900/[0.08] bg-white text-slate-600 hover:bg-slate-50",
              !wrap && (isActive ? "text-slate-900 font-semibold" : "text-slate-600 hover:text-slate-900"),
              wrap && isActive && (item.activeClassName ?? "border-sky-500/70 text-sky-900 font-semibold"),
              !wrap && isActive && item.activeClassName,
              sizeClasses,
              pillClassName
            )}
          >
            {isActive && (
              <motion.span
                layoutId={resolvedLayoutId}
                aria-hidden="true"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 0.2, ease: FINTECH_EASE }
                }
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-[inherit]",
                  wrap
                    ? item.activeIndicatorClassName ?? "bg-sky-50 ring-1 ring-sky-500/50"
                    : item.activeIndicatorClassName ??
                        "bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
                  indicatorClassName
                )}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap">
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              {hideLabelOnMobile ? (
                <span className="hidden sm:inline">{item.label}</span>
              ) : item.shortLabel ? (
                <>
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </>
              ) : (
                <span>{item.label}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShimmerSkeleton — GPU-composited loading block matching card geometry
// ---------------------------------------------------------------------------

export function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-shimmer relative overflow-hidden rounded-lg bg-slate-200/70",
        className
      )}
    />
  );
}
