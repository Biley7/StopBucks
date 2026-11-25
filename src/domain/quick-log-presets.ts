/**
 * StopBucks 1-Tap Student Quick Presets
 * Pure domain definitions: No React, No network, No browser APIs.
 *
 * Provides exactly five student-focused preset expense templates
 * with positive integer minor-unit amounts configured per currency.
 */

import type { CurrencyCode, PaymentMode, TriggerTag } from "./types";

export interface QuickLogPreset {
  id: string;
  emoji: string;
  label: string;
  amountMinor: number;
  note: string;
  triggerTag: TriggerTag;
  paymentMode: PaymentMode;
}

/**
 * Currency-aware preset amount lookup.
 * Amounts are in integer minor units (paise for INR, cents for HKD and USD).
 */
const PRESET_AMOUNTS: Record<
  CurrencyCode,
  {
    canteen: number;
    coffee: number;
    transit: number;
    snack: number;
    course: number;
  }
> = {
  INR: {
    canteen: 8000, // ₹80.00
    coffee: 3000, // ₹30.00
    transit: 4000, // ₹40.00
    snack: 15000, // ₹150.00
    course: 50000, // ₹500.00
  },
  HKD: {
    canteen: 4500, // HK$45.00
    coffee: 2000, // HK$20.00
    transit: 1500, // HK$15.00
    snack: 5000, // HK$50.00
    course: 15000, // HK$150.00
  },
  USD: {
    canteen: 800, // $8.00
    coffee: 350, // $3.50
    transit: 275, // $2.75
    snack: 1000, // $10.00
    course: 2500, // $25.00
  },
};

/**
 * Generates the five standard student presets in the user's active currency.
 * If currency is unsupported, falls back to INR gracefully.
 */
export function getQuickLogPresets(currency: string): QuickLogPreset[] {
  const safeCurrency: CurrencyCode =
    currency === "HKD" || currency === "USD" ? currency : "INR";

  const amounts = PRESET_AMOUNTS[safeCurrency];

  return [
    {
      id: "preset-canteen",
      emoji: "🍱",
      label: "Canteen / Campus Meal",
      amountMinor: amounts.canteen,
      note: "Canteen / Campus Meal",
      triggerTag: "need",
      paymentMode: "cashless",
    },
    {
      id: "preset-coffee",
      emoji: "☕",
      label: "Chai / Coffee Break",
      amountMinor: amounts.coffee,
      note: "Chai / Coffee Break",
      triggerTag: "convenience",
      paymentMode: "cashless",
    },
    {
      id: "preset-transit",
      emoji: "🚌",
      label: "Metro / Bus / Auto",
      amountMinor: amounts.transit,
      note: "Metro / Bus / Auto",
      triggerTag: "need",
      paymentMode: "cash",
    },
    {
      id: "preset-snack",
      emoji: "🌙",
      label: "Late-Night Snack",
      amountMinor: amounts.snack,
      note: "Late-Night Snack",
      triggerTag: "stress_late_night",
      paymentMode: "cashless",
    },
    {
      id: "preset-course",
      emoji: "📚",
      label: "Book / Course / Tool",
      amountMinor: amounts.course,
      note: "Book / Course / Tool",
      triggerTag: "invest_self",
      paymentMode: "cashless",
    },
  ];
}
