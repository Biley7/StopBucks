/**
 * StopBucks Validation Schemas (Zod)
 * Validates domain boundaries, onboarding inputs, and transaction mutations.
 */

import { z } from "zod";

export const currencySchema = z.enum(["INR", "HKD", "USD"], {
  errorMap: () => ({ message: "Supported currencies are INR, HKD, and USD only." }),
});

export const triggerTagSchema = z.enum([
  "need",
  "convenience",
  "stress_late_night",
  "social_fomo",
  "invest_self",
]);

export const paymentModeSchema = z.enum(["cash", "cashless"]);

export const vaultStatusSchema = z.enum(["cooling", "rescued", "purchased"]);

export const displayUnitModeSchema = z.enum([
  "currency",
  "work_hours",
  "compounded_4yr",
]);

/**
 * Onboarding Schema: exactly four primary inputs.
 * Takes inputs in major currency units from the form and validates domain rules.
 */
export const onboardingSchema = z
  .object({
    currency: currencySchema,
    monthlyBudget: z
      .number({ invalid_type_error: "Monthly budget must be a number" })
      .positive("Monthly budget must be greater than zero"),
    selfInvestTarget: z
      .number({ invalid_type_error: "Self-investment target must be a number" })
      .min(0, "Self-investment target cannot be negative"),
    hourlyRate: z
      .number({ invalid_type_error: "Hourly rate must be a number" })
      .positive("Hourly rate must be greater than zero"),
  })
  .refine(
    (data) => data.selfInvestTarget <= data.monthlyBudget,
    {
      message: "Self-investment target cannot exceed total monthly budget",
      path: ["selfInvestTarget"],
    }
  );

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

/**
 * Transaction Creation Schema
 */
export const createTransactionSchema = z.object({
  amountMajor: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than zero"),
  note: z.string().max(280, "Note cannot exceed 280 characters").default(""),
  triggerTag: triggerTagSchema,
  paymentMode: paymentModeSchema,
  loggedAt: z.string().datetime().optional(),
});

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>;

/**
 * Vault Item Creation Schema
 */
export const createVaultItemSchema = z.object({
  itemName: z
    .string()
    .trim()
    .min(1, "Item name is required")
    .max(100, "Item name cannot exceed 100 characters"),
  priceMajor: z
    .number({ invalid_type_error: "Price must be a number" })
    .positive("Price must be greater than zero"),
  triggerTag: triggerTagSchema,
  unlockAt: z.string().datetime().optional(),
});

export type CreateVaultItemFormValues = z.infer<typeof createVaultItemSchema>;

/**
 * API: Natural-language expense parser
 */
export const parseExpenseRequestSchema = z.object({
  input: z
    .string({ required_error: "Expense description is required" })
    .trim()
    .min(1, "Expense description is required")
    .max(280, "Expense description cannot exceed 280 characters"),
  currency: currencySchema,
});

export type ParseExpenseRequest = z.infer<typeof parseExpenseRequestSchema>;

export const parseExpenseResponseSchema = z.object({
  amount_minor: z.number().int().positive(),
  note: z.string().min(1).max(280),
  suggested_trigger: triggerTagSchema,
  suggested_payment_mode: paymentModeSchema,
  source: z.enum(["gemini", "fallback"]),
});

export type ParseExpenseResponse = z.infer<typeof parseExpenseResponseSchema>;

/**
 * API: Weekly behavioral coach
 */
export const biasRiskLevelSchema = z.enum(["low", "moderate", "high"]);

export const biasMetricSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  level: biasRiskLevelSchema,
  evidenceSummary: z.string(),
  count: z.number().int().nonnegative(),
  totalAmountMinor: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
  interpretation: z.string(),
});

export const biasAnalysisResultSchema = z.object({
  lateNightDrift: biasMetricSchema,
  cashlessNumbness: biasMetricSchema,
  paydayBurn: biasMetricSchema,
  socialFomo: biasMetricSchema,
  overallRiskScore: z.number().min(0).max(100),
  deterministicAdvice: z.array(z.string()),
  analyzedAt: z.string(),
});

export const runwayMetricsSchema = z.object({
  monthlyBudgetMinor: z.number().int().nonnegative(),
  selfInvestTargetMinor: z.number().int().nonnegative(),
  consumptionBudgetMinor: z.number().int().nonnegative(),
  monthToDateConsumptionMinor: z.number().int().nonnegative(),
  monthToDateSelfInvestMinor: z.number().int().nonnegative(),
  remainingConsumptionMinor: z.number().int().nonnegative(),
  daysInMonth: z.number().int().positive(),
  currentDayOfMonth: z.number().int().positive(),
  daysRemainingInMonth: z.number().int().positive(),
  safeToSpendTodayMinor: z.number().int().nonnegative(),
  growthToBurnRatio: z.number().nonnegative(),
  isOverBudget: z.boolean(),
});

export const coachNudgeRequestSchema = z.object({
  week_key: z
    .string()
    .regex(/^\d{4}-W\d{2}$/, "Week key must be an ISO week (e.g. 2026-W47)"),
  currency: currencySchema,
  bias_analysis: biasAnalysisResultSchema,
  runway_metrics: runwayMetricsSchema,
});

export type CoachNudgeRequest = z.infer<typeof coachNudgeRequestSchema>;

export const coachNudgeResponseSchema = z.object({
  headline: z.string().min(1).max(160),
  primary_bias: z.string().min(1).max(80),
  three_day_experiment: z.string().min(1).max(600),
  projected_savings_minor: z.number().int().nonnegative(),
});

export const coachNudgeApiResponseSchema = coachNudgeResponseSchema.extend({
  source: z.enum(["gemini", "fallback"]),
});

export type CoachNudgeResponse = z.infer<typeof coachNudgeApiResponseSchema>;
