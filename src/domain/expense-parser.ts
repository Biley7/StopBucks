/**
 * StopBucks Deterministic Expense Parser
 *
 * Pure TypeScript, network-free fallback used whenever Gemini is unavailable,
 * unconfigured, rate-limited, or returns malformed output.
 *
 * All monetary values are returned as integer minor units. Decimal amounts are
 * parsed from their decimal string representation (never via float multiplication).
 */

import type { PaymentMode, TriggerTag } from "./types";

export type ExpenseParseErrorCode =
  | "empty_input"
  | "no_amount"
  | "invalid_amount"
  | "input_too_long";

export class ExpenseParseError extends Error {
  public readonly code: ExpenseParseErrorCode;

  constructor(code: ExpenseParseErrorCode, message: string) {
    super(message);
    this.name = "ExpenseParseError";
    this.code = code;
  }
}

export interface ParsedExpense {
  amountMinor: number;
  note: string;
  suggestedTrigger: TriggerTag;
  suggestedPaymentMode: PaymentMode;
}

export const MAX_EXPENSE_INPUT_LENGTH = 280;

/** Currency tokens stripped out of the human-readable note. */
const CURRENCY_TOKEN_PATTERN = /(?:hk\$|₹|₨|\$|rs\.?|inr|hkd|usd)/gi;

/**
 * Matches either a thousands-separated number (1,499 / 2,00,000) or a plain
 * integer/decimal amount with at most two decimal places.
 */
const AMOUNT_PATTERN = /(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;

const TRIGGER_KEYWORDS: { trigger: TriggerTag; keywords: string[] }[] = [
  {
    trigger: "invest_self",
    keywords: [
      "course",
      "book",
      "gym",
      "udemy",
      "certification",
      "tuition",
      "textbook",
      "workshop",
      "training",
    ],
  },
  {
    trigger: "stress_late_night",
    keywords: [
      "late",
      "night",
      "midnight",
      "stress",
      "craving",
      "swiggy",
      "zomato",
      "cram",
    ],
  },
  {
    trigger: "social_fomo",
    keywords: ["friends", "party", "hangout", "movie", "treat", "outing", "birthday"],
  },
  {
    trigger: "convenience",
    keywords: ["uber", "cab", "delivery", "auto", "rickshaw", "taxi", "quick"],
  },
];

/**
 * Converts a decimal string (e.g. "1499", "1,499.50", "19.9") to integer minor
 * units using exact digit manipulation. Returns null for invalid/zero amounts.
 */
export function parseAmountStringToMinor(raw: string): number | null {
  if (typeof raw !== "string") return null;

  const cleaned = raw.trim().replace(/\s/g, "").replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;

  const [integerPart, fractionPart = ""] = cleaned.split(".");
  const paddedFraction = `${fractionPart}00`.slice(0, 2);
  const digits = `${integerPart}${paddedFraction}`;

  const minor = Number(digits);
  if (!Number.isSafeInteger(minor) || minor <= 0) return null;
  return minor;
}

/**
 * Extracts a defensible monetary amount. Currency-prefixed values win; without
 * one, the final numeric token is normally the amount ("2 coffees 80").
 */
export function extractAmountMinor(
  input: string
): { amountMinor: number; matchedText: string } | null {
  const matches = [...input.matchAll(AMOUNT_PATTERN)];
  if (matches.length === 0) return null;
  const currencyPrefixed = matches.find((match) => {
    const before = input.slice(Math.max(0, (match.index ?? 0) - 8), match.index ?? 0);
    return /(?:₹|\$|hk\$|rs\.?|inr|hkd|usd)\s*$/i.test(before);
  });
  const match = currencyPrefixed ?? matches.at(-1)!;
  // A lone quantity ("1 coffee") is not enough evidence for an amount.
  if (
    matches.length === 1 &&
    !currencyPrefixed &&
    match[1] === "1" &&
    /\b(?:coffee|coffees|beer|beers)\b/i.test(input)
  ) {
    return null;
  }
  const amountMinor = parseAmountStringToMinor(match[1]);
  if (amountMinor === null) return null;

  return { amountMinor, matchedText: match[1] };
}

/**
 * Infers a behavioral trigger from the transaction description keywords.
 * Defaults to "need" when nothing matches.
 */
export function inferTriggerTag(input: string): TriggerTag {
  const normalized = input.toLowerCase();

  for (const { trigger, keywords } of TRIGGER_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return trigger;
    }
  }

  return "need";
}

/**
 * Builds a clean transaction description by removing the raw amount and any
 * currency tokens from the original input.
 */
export function buildCleanNote(input: string, matchedAmountText?: string): string {
  let note = matchedAmountText ? input.replace(matchedAmountText, " ") : input;

  note = note.replace(CURRENCY_TOKEN_PATTERN, " ");
  note = note.replace(/\s+/g, " ").trim();
  note = note.replace(/^[,.;:!?\-–—]+/, "").replace(/[,.;:!?\-–—]+$/, "").trim();

  return note.length > 0 ? note : "Expense";
}

/**
 * Deterministic natural-language expense parser.
 * Throws ExpenseParseError rather than inventing an amount.
 */
export function parseExpenseFallback(input: string): ParsedExpense {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new ExpenseParseError("empty_input", "Please describe the expense first.");
  }
  if (input.length > MAX_EXPENSE_INPUT_LENGTH) {
    throw new ExpenseParseError(
      "input_too_long",
      `Expense descriptions cannot exceed ${MAX_EXPENSE_INPUT_LENGTH} characters.`
    );
  }

  const extracted = extractAmountMinor(input);
  if (!extracted) {
    throw new ExpenseParseError(
      "no_amount",
      "We could not find an amount. Please enter the amount manually."
    );
  }

  return {
    amountMinor: extracted.amountMinor,
    note: buildCleanNote(input, extracted.matchedText),
    suggestedTrigger: inferTriggerTag(input),
    suggestedPaymentMode: /\b(?:cash|paid\s+cash|by\s+cash)\b/i.test(input)
      ? "cash"
      : "cashless",
  };
}

/**
 * Strict anti-hallucination check: verifies that the proposed amount strictly appears
 * at a token/word boundary in the input text. Prevents hallucinated "180" from matching "1800".
 */
export function amountAppearsInInput(amountMinor: number, input: string): boolean {
  if (amountMinor <= 0 || !Number.isSafeInteger(amountMinor)) return false;

  const major = amountMinor / 100;
  const isWhole = amountMinor % 100 === 0;

  const candidateStrings = new Set<string>();

  if (isWhole) {
    const intStr = String(major);
    candidateStrings.add(intStr);
    candidateStrings.add(`${intStr}.00`);
    candidateStrings.add(`${intStr}.0`);
    candidateStrings.add(major.toLocaleString("en-US"));
    candidateStrings.add(major.toLocaleString("en-IN"));
  } else {
    const dec2 = major.toFixed(2);
    candidateStrings.add(dec2);
    if (dec2.endsWith("0")) {
      candidateStrings.add(dec2.slice(0, -1));
    }
    candidateStrings.add(
      major.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    );
    candidateStrings.add(
      major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    candidateStrings.add(
      major.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    );
    candidateStrings.add(
      major.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  for (const str of candidateStrings) {
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<![\\d])${escaped}(?![\\d])`);
    if (regex.test(input)) {
      return true;
    }
  }

  const numberTokens = input.match(/\d[\d,]*(?:\.\d+)?/g);
  if (numberTokens) {
    for (const token of numberTokens) {
      const parsedMinor = parseAmountStringToMinor(token);
      if (parsedMinor === amountMinor) {
        return true;
      }
    }
  }

  return false;
}

