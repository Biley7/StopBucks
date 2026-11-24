/**
 * Compact axis formatting for Recharts.
 * Respects the global Pain-of-Paying display mode while keeping tick labels short.
 */

import { convertTo4YearCompounded, CURRENCY_CONFIGS } from "@/domain/currency";
import type { CurrencyCode, DisplayUnitMode } from "@/domain/types";

export function formatAxisValue(
  minorUnits: number,
  currency: CurrencyCode,
  mode: DisplayUnitMode,
  hourlyRateMinor?: number
): string {
  const config = CURRENCY_CONFIGS[currency];
  const symbol = config?.symbol ?? "";

  switch (mode) {
    case "work_hours": {
      if (!hourlyRateMinor || hourlyRateMinor <= 0) break;
      const hours = minorUnits / hourlyRateMinor;
      const rounded = Math.round(hours * 10) / 10;
      return `${rounded}h`;
    }
    case "compounded_4yr": {
      const future = convertTo4YearCompounded(minorUnits);
      return `${symbol}${compactNumber(future / 100, config?.locale)}`;
    }
    case "currency":
    default:
      break;
  }

  return `${symbol}${compactNumber(minorUnits / 100, config?.locale)}`;
}

function compactNumber(value: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    notation: Math.abs(value) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 0,
  }).format(value);
}
