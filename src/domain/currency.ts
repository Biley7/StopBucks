/**
 * StopBucks Currency & Financial Precision Utilities
 * Pure functions: No React, No network, No external state.
 *
 * All stored financial values represent integer minor units (paise/cents).
 * Financial precision is non-negotiable.
 */

import type { CurrencyCode, DisplayUnitMode } from "./types";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  minorPerMajor: number;
  decimals: number;
  locale: string;
  displayName: string;
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: "INR",
    symbol: "₹",
    minorPerMajor: 100,
    decimals: 2,
    locale: "en-IN",
    displayName: "Indian Rupee (₹)",
  },
  HKD: {
    code: "HKD",
    symbol: "HK$",
    minorPerMajor: 100,
    decimals: 2,
    locale: "zh-HK",
    displayName: "Hong Kong Dollar (HK$)",
  },
  USD: {
    code: "USD",
    symbol: "$",
    minorPerMajor: 100,
    decimals: 2,
    locale: "en-US",
    displayName: "US Dollar ($)",
  },
};

/**
 * Converts a major currency floating or decimal number to safe integer minor units.
 * Throws an error for invalid, negative, or non-finite inputs.
 */
export function toMinorUnits(amountMajor: number): number {
  if (typeof amountMajor !== "number" || !Number.isFinite(amountMajor)) {
    throw new TypeError(`toMinorUnits expects a finite number, received: ${amountMajor}`);
  }
  if (amountMajor < 0) {
    throw new RangeError(`Monetary amount cannot be negative, received: ${amountMajor}`);
  }
  // Round to nearest integer to eliminate IEEE-754 precision issues (e.g. 19.99 * 100 = 1998.9999999999998)
  const minor = Math.round(amountMajor * 100);
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError(`Amount exceeds safe integer range: ${amountMajor}`);
  }
  return minor;
}

/**
 * Converts integer minor units back to a major currency number.
 */
export function fromMinorUnits(minorUnits: number): number {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new TypeError(`fromMinorUnits expects a safe integer, received: ${minorUnits}`);
  }
  return minorUnits / 100;
}

/**
 * Formats integer minor units in standard currency format.
 */
export function formatCurrency(
  minorUnits: number,
  currency: CurrencyCode,
  options?: { hideDecimalsIfWhole?: boolean }
): string {
  const config = CURRENCY_CONFIGS[currency];
  if (!config) {
    throw new Error(`Unsupported currency code: ${currency}`);
  }

  const isNegative = minorUnits < 0;
  const absMinor = Math.abs(minorUnits);
  const major = absMinor / config.minorPerMajor;

  const hideDecimals = options?.hideDecimalsIfWhole && absMinor % config.minorPerMajor === 0;

  const formattedNumber = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: hideDecimals ? 0 : config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(major);

  const result = `${config.symbol}${formattedNumber}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Converts an amount in minor units to required work hours based on the user's hourly rate.
 * Work hours = amount_minor / hourly_rate_minor
 */
export function convertToWorkHours(
  amountMinor: number,
  hourlyRateMinor: number
): number {
  if (hourlyRateMinor <= 0) {
    return 0;
  }
  const hours = amountMinor / hourlyRateMinor;
  // Return rounded to 1 decimal place for clean reading
  return Math.round(hours * 10) / 10;
}

/**
 * Formats work hours as human-readable text.
 */
export function formatWorkHours(hours: number): string {
  if (hours === 1) {
    return "1.0 hr of work";
  }
  return `${hours.toFixed(1)} hrs of work`;
}

/**
 * Calculates 4-year compounded future value assuming an 8% annual return.
 * Future Value = amount * (1.08)^4
 * (1.08)^4 = 1.36048896 (~36% growth)
 */
export function convertTo4YearCompounded(amountMinor: number): number {
  if (amountMinor <= 0) {
    return 0;
  }
  const compounded = amountMinor * Math.pow(1.08, 4);
  return Math.round(compounded);
}

/**
 * Formats the 4-year compounded future value.
 */
export function formatCompoundedOpportunity(
  amountMinor: number,
  currency: CurrencyCode
): string {
  const futureMinor = convertTo4YearCompounded(amountMinor);
  return `${formatCurrency(futureMinor, currency)} in 4 yrs`;
}

/**
 * Global Pain-of-Paying display formatter.
 * Supports Currency, Work Hours, or 4-Year Compounded Opportunity Cost.
 */
export function formatMinorUnits(
  minorUnits: number,
  currency: CurrencyCode,
  mode: DisplayUnitMode = "currency",
  hourlyRateMinor?: number
): string {
  switch (mode) {
    case "work_hours": {
      if (hourlyRateMinor && hourlyRateMinor > 0) {
        const hours = convertToWorkHours(minorUnits, hourlyRateMinor);
        return formatWorkHours(hours);
      }
      // Graceful fallback to currency if hourly rate is missing
      return formatCurrency(minorUnits, currency);
    }
    case "compounded_4yr": {
      return formatCompoundedOpportunity(minorUnits, currency);
    }
    case "currency":
    default: {
      return formatCurrency(minorUnits, currency);
    }
  }
}

