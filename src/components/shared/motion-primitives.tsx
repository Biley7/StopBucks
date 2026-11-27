"use client";

import React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

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
          : { duration: 0.3, delay, ease: EASE_OUT }
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
      staggerChildren: 0.05,
    },
  },
};

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASE_OUT,
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
  trackClassName?: string;
  barClassName?: string;
  className?: string;
}

/**
 * Smoothly animates a bounded 0–100 progress bar from 0% on initial mount and
 * interpolates across subsequent data/month changes without remount loops.
 */
export function AnimatedProgressBar({
  value,
  ariaLabel,
  trackClassName,
  barClassName,
  className,
}: AnimatedProgressBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);

  const safeValue = Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : 0;

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-200/90",
        trackClassName,
        className
      )}
    >
      <motion.div
        initial={shouldReduceMotion ? { width: `${safeValue}%` } : { width: "0%" }}
        animate={{ width: `${safeValue}%` }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.45, ease: EASE_OUT }
        }
        className={cn("h-full rounded-full bg-sky-600", barClassName)}
      />
    </div>
  );
}
