/**
 * StopBucks CSV Export Utilities
 * Pure functions: safe escaping, UTF-8 friendly, original currency amounts.
 */

import { formatCurrency } from "@/domain/currency";
import type { CurrencyCode, Transaction } from "@/domain/types";

const CSV_HEADERS = [
  "Date (UTC)",
  "Time (UTC)",
  "Description",
  "Amount",
  "Currency",
  "Trigger",
  "Payment Mode",
];

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function amountToPlainDecimal(amountMinor: number): string {
  const isNegative = amountMinor < 0;
  const abs = Math.abs(amountMinor);
  const major = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${isNegative ? "-" : ""}${major}.${fraction}`;
}

/**
 * Builds a CSV document from real transaction records.
 * Amounts are exported as original currency major units (never the active
 * display mode).
 */
export function buildTransactionsCsv(
  transactions: Transaction[],
  currency: CurrencyCode
): string {
  const rows = transactions.map((tx) => {
    const iso = tx.loggedAt;
    return [
      iso.slice(0, 10),
      iso.slice(11, 19),
      tx.note || "Untitled expense",
      amountToPlainDecimal(tx.amountMinor),
      currency,
      tx.triggerTag,
      tx.paymentMode,
    ]
      .map(escapeCsvField)
      .join(",");
  });

  return [CSV_HEADERS.join(","), ...rows].join("\r\n");
}

export function buildTransactionsCsvFilename(referenceDate: Date = new Date()): string {
  return `stopbucks-transactions-${referenceDate.toISOString().slice(0, 10)}.csv`;
}

/**
 * Triggers a browser download for the given CSV content.
 */
export function downloadCsv(content: string, filename: string): void {
  // Prepend BOM so spreadsheet apps detect UTF-8 reliably.
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Re-exported for convenience in the ledger summary. */
export { formatCurrency };
