"use client";

import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type TokenKind =
  | "coin-gold-inr"
  | "coin-gold-usd"
  | "coin-emerald-usd"
  | "coin-emerald-inr"
  | "textbook"
  | "chart-bar"
  | "chart-line"
  | "grad-cap"
  | "percent"
  | "growth-arrow";

interface AmbientTokenSpec {
  id: string;
  kind: TokenKind;
  /** Responsive horizontal placement classes (left 2%–24% or right 76%–98% on desktop). */
  positionClass: string;
  /** Responsive visibility class (outer-edge tokens remain visible on mobile). */
  visibilityClass?: string;
  sizePx: number;
  durationSec: number;
  delaySec: number;
  swayPx: number;
  rotStartDeg: number;
  rotMidDeg: number;
  rotEndDeg: number;
  peakOpacity: number;
  staticTopPct: number;
}

type TokenCssProperties = React.CSSProperties & Record<`--${string}`, string | number>;

const AMBIENT_TOKENS: ReadonlyArray<AmbientTokenSpec> = [
  // Left margin (2%–24% on desktop, outer edge 1.5%–2.5% on mobile)
  {
    id: "l-coin-gold-inr",
    kind: "coin-gold-inr",
    positionClass: "left-[1.5%] sm:left-[3.5%]",
    sizePx: 34,
    durationSec: 18,
    delaySec: -4.2,
    swayPx: 10,
    rotStartDeg: -7,
    rotMidDeg: 6,
    rotEndDeg: -4,
    peakOpacity: 0.78,
    staticTopPct: 11,
  },
  {
    id: "l-chart-bar",
    kind: "chart-bar",
    positionClass: "left-[2%] sm:left-[8.5%]",
    sizePx: 36,
    durationSec: 22,
    delaySec: -14.5,
    swayPx: -9,
    rotStartDeg: -5,
    rotMidDeg: 7,
    rotEndDeg: -3,
    peakOpacity: 0.68,
    staticTopPct: 43,
  },
  {
    id: "l-notebook",
    kind: "textbook",
    positionClass: "left-[13.5%]",
    visibilityClass: "hidden sm:block",
    sizePx: 38,
    durationSec: 24,
    delaySec: -8.8,
    swayPx: 8,
    rotStartDeg: 6,
    rotMidDeg: -6,
    rotEndDeg: 4,
    peakOpacity: 0.64,
    staticTopPct: 72,
  },
  {
    id: "l-growth-arrow",
    kind: "growth-arrow",
    positionClass: "left-[18.5%]",
    visibilityClass: "hidden md:block",
    sizePx: 30,
    durationSec: 16,
    delaySec: -11.2,
    swayPx: -8,
    rotStartDeg: -4,
    rotMidDeg: 8,
    rotEndDeg: -5,
    peakOpacity: 0.72,
    staticTopPct: 24,
  },
  {
    id: "l-coin-emerald-usd",
    kind: "coin-emerald-usd",
    positionClass: "left-[2%] sm:left-[5%]",
    sizePx: 30,
    durationSec: 15.5,
    delaySec: -12.8,
    swayPx: 11,
    rotStartDeg: 8,
    rotMidDeg: -5,
    rotEndDeg: 6,
    peakOpacity: 0.76,
    staticTopPct: 59,
  },
  {
    id: "l-grad-cap",
    kind: "grad-cap",
    positionClass: "left-[21%]",
    visibilityClass: "hidden lg:block",
    sizePx: 36,
    durationSec: 25,
    delaySec: -3.5,
    swayPx: -10,
    rotStartDeg: -8,
    rotMidDeg: 5,
    rotEndDeg: -6,
    peakOpacity: 0.6,
    staticTopPct: 51,
  },
  {
    id: "l-percent",
    kind: "percent",
    positionClass: "left-[11%]",
    visibilityClass: "hidden sm:block",
    sizePx: 26,
    durationSec: 17,
    delaySec: -1.8,
    swayPx: 7,
    rotStartDeg: -6,
    rotMidDeg: 9,
    rotEndDeg: -4,
    peakOpacity: 0.65,
    staticTopPct: 30,
  },
  {
    id: "l-chart-line",
    kind: "chart-line",
    positionClass: "left-[16%]",
    visibilityClass: "hidden md:block",
    sizePx: 34,
    durationSec: 20.5,
    delaySec: -17.4,
    swayPx: -10,
    rotStartDeg: 5,
    rotMidDeg: -7,
    rotEndDeg: 6,
    peakOpacity: 0.66,
    staticTopPct: 81,
  },

  // Right margin (76%–98% on desktop, outer edge 1.5%–2.5% from right on mobile)
  {
    id: "r-coin-gold-usd",
    kind: "coin-gold-usd",
    positionClass: "right-[1.5%] sm:right-[4%]",
    sizePx: 34,
    durationSec: 19,
    delaySec: -6.4,
    swayPx: -10,
    rotStartDeg: 7,
    rotMidDeg: -6,
    rotEndDeg: 4,
    peakOpacity: 0.78,
    staticTopPct: 14,
  },
  {
    id: "r-chart-line",
    kind: "chart-line",
    positionClass: "right-[2%] sm:right-[9%]",
    sizePx: 36,
    durationSec: 23,
    delaySec: -16.2,
    swayPx: 9,
    rotStartDeg: -6,
    rotMidDeg: 6,
    rotEndDeg: -5,
    peakOpacity: 0.68,
    staticTopPct: 47,
  },
  {
    id: "r-grad-cap",
    kind: "grad-cap",
    positionClass: "right-[14%]",
    visibilityClass: "hidden sm:block",
    sizePx: 36,
    durationSec: 21.5,
    delaySec: -2.4,
    swayPx: -8,
    rotStartDeg: 8,
    rotMidDeg: -5,
    rotEndDeg: 6,
    peakOpacity: 0.64,
    staticTopPct: 75,
  },
  {
    id: "r-coin-emerald-inr",
    kind: "coin-emerald-inr",
    positionClass: "right-[19%]",
    visibilityClass: "hidden md:block",
    sizePx: 30,
    durationSec: 15,
    delaySec: -9.6,
    swayPx: 9,
    rotStartDeg: -8,
    rotMidDeg: 7,
    rotEndDeg: -4,
    peakOpacity: 0.76,
    staticTopPct: 26,
  },
  {
    id: "r-textbook",
    kind: "textbook",
    positionClass: "right-[2%] sm:right-[5.5%]",
    sizePx: 36,
    durationSec: 24.5,
    delaySec: -19.5,
    swayPx: -11,
    rotStartDeg: -5,
    rotMidDeg: 7,
    rotEndDeg: -6,
    peakOpacity: 0.62,
    staticTopPct: 62,
  },
  {
    id: "r-growth-arrow",
    kind: "growth-arrow",
    positionClass: "right-[21.5%]",
    visibilityClass: "hidden lg:block",
    sizePx: 30,
    durationSec: 16.5,
    delaySec: -13.1,
    swayPx: 8,
    rotStartDeg: -5,
    rotMidDeg: 8,
    rotEndDeg: -3,
    peakOpacity: 0.72,
    staticTopPct: 53,
  },
  {
    id: "r-percent",
    kind: "percent",
    positionClass: "right-[11.5%]",
    visibilityClass: "hidden sm:block",
    sizePx: 26,
    durationSec: 14.5,
    delaySec: -7.5,
    swayPx: -8,
    rotStartDeg: 9,
    rotMidDeg: -6,
    rotEndDeg: 5,
    peakOpacity: 0.66,
    staticTopPct: 33,
  },
  {
    id: "r-chart-bar",
    kind: "chart-bar",
    positionClass: "right-[16.5%]",
    visibilityClass: "hidden md:block",
    sizePx: 32,
    durationSec: 20,
    delaySec: -11.8,
    swayPx: 9,
    rotStartDeg: -7,
    rotMidDeg: 5,
    rotEndDeg: -4,
    peakOpacity: 0.65,
    staticTopPct: 82,
  },
];

function TokenArtwork({ kind, sizePx }: { kind: TokenKind; sizePx: number }) {
  const sharedProps = {
    width: sizePx,
    height: sizePx,
    viewBox: "0 0 32 32",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: "max-sm:h-6 max-sm:w-6",
  } as const;

  switch (kind) {
    case "coin-gold-inr":
      return (
        <svg {...sharedProps}>
          <circle cx="16" cy="16" r="13.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="10.2" stroke="#F59E0B" strokeWidth="1" strokeOpacity="0.6" />
          <path
            d="M12.2 10.8H19.8M12.2 14H19.8M14.6 10.8C18.4 10.8 18.4 16.8 12.6 16.8L18.8 22"
            stroke="#B45309"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "coin-gold-usd":
      return (
        <svg {...sharedProps}>
          <circle cx="16" cy="16" r="13.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="10.2" stroke="#F59E0B" strokeWidth="1" strokeOpacity="0.6" />
          <path
            d="M16 9.4V22.6M19.1 12.6C19.1 11.2 17.8 10.6 16 10.6C14.1 10.6 12.9 11.4 12.9 12.9C12.9 14.4 14.3 15 16.1 15.5C17.9 16 19.3 16.7 19.3 18.4C19.3 20 17.9 21.1 16 21.1C14 21.1 12.8 20.1 12.7 18.9"
            stroke="#B45309"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "coin-emerald-usd":
      return (
        <svg {...sharedProps}>
          <circle cx="16" cy="16" r="13.5" fill="#D1FAE5" stroke="#059669" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="10.2" stroke="#10B981" strokeWidth="1" strokeOpacity="0.55" />
          <path
            d="M16 9.4V22.6M19.1 12.6C19.1 11.2 17.8 10.6 16 10.6C14.1 10.6 12.9 11.4 12.9 12.9C12.9 14.4 14.3 15 16.1 15.5C17.9 16 19.3 16.7 19.3 18.4C19.3 20 17.9 21.1 16 21.1C14 21.1 12.8 20.1 12.7 18.9"
            stroke="#047857"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "coin-emerald-inr":
      return (
        <svg {...sharedProps}>
          <circle cx="16" cy="16" r="13.5" fill="#D1FAE5" stroke="#059669" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="10.2" stroke="#10B981" strokeWidth="1" strokeOpacity="0.55" />
          <path
            d="M12.2 10.8H19.8M12.2 14H19.8M14.6 10.8C18.4 10.8 18.4 16.8 12.6 16.8L18.8 22"
            stroke="#047857"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "textbook":
      return (
        <svg {...sharedProps}>
          <path
            d="M4.5 9C8.2 7.6 12.4 8.2 16 10.2C19.6 8.2 23.8 7.6 27.5 9V23.5C23.8 22.1 19.6 22.7 16 24.5C12.4 22.7 8.2 22.1 4.5 23.5V9Z"
            fill="#FFFFFF"
            stroke="#475569"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M16 10.2V24.5" stroke="#64748B" strokeWidth="1.4" />
          <path d="M8 13H13M8 16.5H12.5" stroke="#0284C7" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M19 13H24M19.5 16.5H24" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
          <path
            d="M21.5 8.2V14L23 12.8L24.5 14V8.4"
            fill="#FEF3C7"
            stroke="#D97706"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "chart-bar":
      return (
        <svg {...sharedProps}>
          <path
            d="M7.5 4.5H20.5L24.5 8.5V26.5C24.5 27.1 24.1 27.5 23.5 27.5H7.5C6.9 27.5 6.5 27.1 6.5 26.5V5.5C6.5 4.9 6.9 4.5 7.5 4.5Z"
            fill="#FFFFFF"
            stroke="#64748B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M20.5 4.5V8.5H24.5" stroke="#64748B" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M10 9.5H16.5" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="10.2" y="18.2" width="2.6" height="5.3" rx="0.8" fill="#0284C7" fillOpacity="0.8" />
          <rect x="14.7" y="14.6" width="2.6" height="8.9" rx="0.8" fill="#059669" fillOpacity="0.85" />
          <rect x="19.2" y="12.2" width="2.6" height="11.3" rx="0.8" fill="#D97706" fillOpacity="0.8" />
        </svg>
      );

    case "chart-line":
      return (
        <svg {...sharedProps}>
          <path
            d="M7.5 4.5H20.5L24.5 8.5V26.5C24.5 27.1 24.1 27.5 23.5 27.5H7.5C6.9 27.5 6.5 27.1 6.5 26.5V5.5C6.5 4.9 6.9 4.5 7.5 4.5Z"
            fill="#FFFFFF"
            stroke="#64748B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M20.5 4.5V8.5H24.5" stroke="#64748B" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M10 9.5H16.5" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
          <path
            d="M9.8 21.8L13.8 18.2L17.2 19.6L21.8 13.8"
            stroke="#059669"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="13.8" cy="18.2" r="1.4" fill="#059669" />
          <circle cx="21.8" cy="13.8" r="1.6" fill="#0284C7" />
        </svg>
      );

    case "grad-cap":
      return (
        <svg {...sharedProps}>
          <path
            d="M16 7.5L27.5 13L16 18.5L4.5 13L16 7.5Z"
            fill="#F1F5F9"
            stroke="#475569"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 15.6V21C9.5 22.7 12.4 24 16 24C19.6 24 22.5 22.7 22.5 21V15.6"
            fill="#FFFFFF"
            stroke="#475569"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M25.2 14.2V20.8" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="25.2" cy="21.6" r="1.3" fill="#F59E0B" />
        </svg>
      );

    case "percent":
      return (
        <svg {...sharedProps}>
          <circle cx="10.5" cy="10.8" r="3.4" fill="#ECFDF5" stroke="#059669" strokeWidth="1.7" />
          <circle cx="21.5" cy="21.2" r="3.4" fill="#F0F9FF" stroke="#0284C7" strokeWidth="1.7" />
          <path d="M22.2 8.8L9.8 23.2" stroke="#475569" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );

    case "growth-arrow":
      return (
        <svg {...sharedProps}>
          <path
            d="M5.5 22.5L12.2 16L16.4 18.8L25.2 9.4"
            stroke="#059669"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.8 9.2H25.5V14.9"
            stroke="#059669"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12.2" cy="16" r="1.7" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.2" />
        </svg>
      );
  }
}

/**
 * Decorative, GPU-composited student behavioral-finance ambient layer behind the
 * landing hero. Animates strictly `transform` (`translate3d` + `rotate`) and
 * `opacity`, populates immediately via negative delays, and renders a static
 * balanced arrangement when `useReducedMotion()` is active.
 */
export function LandingAmbientMotion() {
  const prefersReducedMotion = useReducedMotion();
  const [mediaReducedMotion, setMediaReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setMediaReducedMotion(mql.matches);
    syncPreference();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", syncPreference);
      return () => mql.removeEventListener("change", syncPreference);
    }
    return undefined;
  }, []);

  const shouldReduceMotion = Boolean(prefersReducedMotion) || mediaReducedMotion;

  return (
    <div
      aria-hidden="true"
      data-testid="landing-ambient-motion"
      data-reduced-motion={shouldReduceMotion ? "true" : "false"}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
    >
      {AMBIENT_TOKENS.map((token) => {
        const innerStyle: TokenCssProperties = shouldReduceMotion
          ? {
              transform: `rotate(${token.rotStartDeg}deg)`,
              opacity: Number((token.peakOpacity * 0.85).toFixed(2)),
            }
          : {
              animationDuration: `${token.durationSec}s`,
              animationDelay: `${token.delaySec}s`,
              "--token-sway-x": `${token.swayPx}px`,
              "--token-rot-start": `${token.rotStartDeg}deg`,
              "--token-rot-mid": `${token.rotMidDeg}deg`,
              "--token-rot-end": `${token.rotEndDeg}deg`,
              "--token-opacity": token.peakOpacity,
            };

        return (
          <div
            key={token.id}
            className={cn(
              "absolute opacity-45 sm:opacity-100",
              token.positionClass,
              token.visibilityClass
            )}
            style={{ top: shouldReduceMotion ? `${token.staticTopPct}%` : 0 }}
          >
            <div
              data-ambient-token={token.id}
              className={shouldReduceMotion ? undefined : "landing-ambient-token"}
              style={innerStyle}
            >
              <TokenArtwork kind={token.kind} sizePx={token.sizePx} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
