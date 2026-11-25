/**
 * StopBucks Pure Domain Types
 * Completely independent of React, Supabase, or external services.
 * All monetary amounts are represented as safe integer minor units (e.g. cents/paise).
 */

export type CurrencyCode = "INR" | "HKD" | "USD";

export type TriggerTag =
  | "need"
  | "convenience"
  | "stress_late_night"
  | "social_fomo"
  | "invest_self";

export type PaymentMode = "cash" | "cashless";

export type VaultStatus = "cooling" | "rescued" | "purchased";

export type DisplayUnitMode =
  | "currency"
  | "work_hours"
  | "compounded_4yr";

export interface UserProfile {
  userId: string;
  currency: CurrencyCode;
  monthlyBudgetMinor: number;
  selfInvestTargetMinor: number;
  hourlyRateMinor: number;
  createdAt: string;
}

export interface CreateProfileInput {
  currency: CurrencyCode;
  monthlyBudgetMinor: number;
  selfInvestTargetMinor: number;
  hourlyRateMinor: number;
}

export interface UpdateProfileInput {
  currency?: CurrencyCode;
  monthlyBudgetMinor?: number;
  selfInvestTargetMinor?: number;
  hourlyRateMinor?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amountMinor: number;
  note: string;
  triggerTag: TriggerTag;
  paymentMode: PaymentMode;
  loggedAt: string; // ISO 8601 UTC
  createdAt: string; // ISO 8601 UTC
}

export interface CreateTransactionInput {
  amountMinor: number;
  note: string;
  triggerTag: TriggerTag;
  paymentMode: PaymentMode;
  loggedAt?: string; // Optional, defaults to now UTC
}

export interface UpdateTransactionInput {
  amountMinor?: number;
  note?: string;
  triggerTag?: TriggerTag;
  paymentMode?: PaymentMode;
  loggedAt?: string;
}

export interface VaultItem {
  id: string;
  userId: string;
  itemName: string;
  priceMinor: number;
  triggerTag: TriggerTag;
  unlockAt: string; // ISO 8601 UTC
  status: VaultStatus;
  resolvedAt: string | null; // ISO 8601 UTC
  createdAt: string; // ISO 8601 UTC
}

export interface CreateVaultItemInput {
  itemName: string;
  priceMinor: number;
  triggerTag: TriggerTag;
  unlockAt?: string; // Optional, defaults to now + 48 hours
}

export interface ResolveVaultItemInput {
  status: "rescued" | "purchased";
  resolvedAt?: string;
}

export interface VaultPurchaseResult {
  item: VaultItem;
  transaction: Transaction;
}

export interface WeeklyNudge {
  id: string;
  userId: string;
  weekKey: string; // e.g. "2026-W47"
  biasSnapshot: BiasAnalysisResult;
  coachResponse: Record<string, unknown>;
  createdAt: string;
}

export interface SaveWeeklyNudgeInput {
  weekKey: string;
  biasSnapshot: BiasAnalysisResult;
  coachResponse: Record<string, unknown>;
}

export interface FixedCommitment {
  id: string;
  userId: string;
  title: string;
  amountMinor: number;
  createdAt: string;
}

export interface CreateFixedCommitmentInput {
  title: string;
  amountMinor: number;
}

export interface RunwayMetrics {
  monthlyBudgetMinor: number;
  selfInvestTargetMinor: number;
  fixedCommitmentsMinor: number;
  consumptionBudgetMinor: number;
  monthToDateConsumptionMinor: number;
  monthToDateSelfInvestMinor: number;
  remainingConsumptionMinor: number;
  daysInMonth: number;
  currentDayOfMonth: number;
  daysRemainingInMonth: number;
  safeToSpendTodayMinor: number;
  growthToBurnRatio: number;
  isOverBudget: boolean;
}

export type BiasRiskLevel = "low" | "moderate" | "high";

export interface BiasMetric {
  name: string;
  score: number; // 0 to 100
  level: BiasRiskLevel;
  evidenceSummary: string;
  count: number;
  totalAmountMinor: number;
  percentage: number;
  interpretation: string;
}

export interface BiasAnalysisResult {
  lateNightDrift: BiasMetric;
  cashlessNumbness: BiasMetric;
  paydayBurn: BiasMetric;
  socialFomo: BiasMetric;
  overallRiskScore: number; // 0 to 100
  deterministicAdvice: string[];
  analyzedAt: string;
}

