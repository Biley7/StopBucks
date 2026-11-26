/**
 * StopBucks Validation Schemas (Zod)
 * Validates domain boundaries, onboarding inputs, and transaction mutations.
 */

import { z } from "zod";
import type { DojoLevelId, DojoProgress } from "@/domain/dojo-types";

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

export const updateTransactionInputSchema = z.object({
  amountMinor: z
    .number({ invalid_type_error: "Amount must be a number" })
    .int("Amount must be an integer")
    .positive("Amount must be greater than zero")
    .max(Number.MAX_SAFE_INTEGER, "Amount exceeds safe range")
    .optional(),
  note: z
    .string()
    .trim()
    .min(1, "Description cannot be empty")
    .max(280, "Note cannot exceed 280 characters")
    .optional(),
  triggerTag: triggerTagSchema.optional(),
  paymentMode: paymentModeSchema.optional(),
  loggedAt: z.string().datetime().optional(),
});

export type UpdateTransactionInputFormValues = z.infer<typeof updateTransactionInputSchema>;

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
 * Fixed Commitment Creation Schema
 */
export const createFixedCommitmentSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(80, "Title cannot exceed 80 characters"),
  amountMinor: z
    .number({ invalid_type_error: "Amount must be a number" })
    .int("Amount must be an integer")
    .positive("Amount must be greater than zero")
    .max(Number.MAX_SAFE_INTEGER, "Amount exceeds safe range"),
});

export type CreateFixedCommitmentFormValues = z.infer<typeof createFixedCommitmentSchema>;

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
  fixedCommitmentsMinor: z.number().int().nonnegative().default(0),
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

/**
 * StopBucks Dojo Progression Validation & Row Mapping
 */
export const dojoDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine((value) => {
    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const utc = new Date(Date.UTC(year, month - 1, day));
    return (
      utc.getUTCFullYear() === year &&
      utc.getUTCMonth() + 1 === month &&
      utc.getUTCDate() === day
    );
  }, "Date must be a valid calendar date");

export const dojoIsoTimestampSchema = z
  .string()
  .min(1, "Timestamp is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid ISO timestamp");

export const dojoLevelIdSchema = z
  .number()
  .int("Level ID must be an integer")
  .min(1, "Level ID must be between 1 and 9")
  .max(9, "Level ID must be between 1 and 9");

export const dojoBadgeIdSchema = z
  .string()
  .trim()
  .min(1, "Badge ID cannot be empty")
  .max(64, "Badge ID cannot exceed 64 characters");

export const dojoUnlockedBadgesSchema = z.array(dojoBadgeIdSchema);

export const dojoLevelCompletionSchema = z.object({
  levelId: dojoLevelIdSchema,
  bestAccuracyPct: z
    .number()
    .refine(Number.isFinite, "Accuracy must be finite")
    .refine((n) => n >= 0 && n <= 100, "Accuracy must be between 0 and 100"),
  earnedXp: z
    .number()
    .int("Earned XP must be an integer")
    .nonnegative("Earned XP cannot be negative")
    .max(Number.MAX_SAFE_INTEGER, "Earned XP exceeds safe range"),
  completedAt: dojoIsoTimestampSchema,
  replayCount: z
    .number()
    .int("Replay count must be an integer")
    .nonnegative("Replay count cannot be negative")
    .max(Number.MAX_SAFE_INTEGER, "Replay count exceeds safe range"),
});

export const dojoCompletedLevelsSchema = z
  .array(dojoLevelCompletionSchema)
  .refine(
    (entries) => new Set(entries.map((entry) => entry.levelId)).size === entries.length,
    "Duplicate level completion records are not allowed"
  );

export const dojoProgressSchema = z.object({
  completedLevels: dojoCompletedLevelsSchema,
  totalXp: z
    .number()
    .int("Total XP must be an integer")
    .nonnegative("Total XP cannot be negative")
    .max(Number.MAX_SAFE_INTEGER, "Total XP exceeds safe range"),
  currentStreak: z
    .number()
    .int("Current streak must be an integer")
    .nonnegative("Current streak cannot be negative")
    .max(Number.MAX_SAFE_INTEGER, "Current streak exceeds safe range"),
  longestStreak: z
    .number()
    .int("Longest streak must be an integer")
    .nonnegative("Longest streak cannot be negative")
    .max(Number.MAX_SAFE_INTEGER, "Longest streak exceeds safe range"),
  lastCompletedDate: dojoDateKeySchema.nullable(),
  unlockedBadges: dojoUnlockedBadgesSchema,
  soundMuted: z.boolean(),
  updatedAt: dojoIsoTimestampSchema,
});

export const dbDojoProgressRowSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  completed_levels: dojoCompletedLevelsSchema,
  total_xp: z
    .number()
    .int("total_xp must be an integer")
    .nonnegative("total_xp cannot be negative")
    .max(Number.MAX_SAFE_INTEGER, "total_xp exceeds safe range"),
  current_streak: z
    .number()
    .int("current_streak must be an integer")
    .nonnegative("current_streak cannot be negative")
    .max(Number.MAX_SAFE_INTEGER, "current_streak exceeds safe range"),
  longest_streak: z
    .number()
    .int("longest_streak must be an integer")
    .nonnegative("longest_streak cannot be negative")
    .max(Number.MAX_SAFE_INTEGER, "longest_streak exceeds safe range"),
  last_completed_date: dojoDateKeySchema.nullable(),
  unlocked_badges: dojoUnlockedBadgesSchema,
  sound_muted: z.boolean(),
  updated_at: dojoIsoTimestampSchema,
});

export function mapDojoProgressRow(raw: unknown): DojoProgress {
  const parsed = dbDojoProgressRowSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[SupabaseRepository] Invalid dojo progress row data:", parsed.error);
    throw new Error("Invalid dojo progress data received from database.");
  }

  return {
    completedLevels: parsed.data.completed_levels.map((entry) => ({
      levelId: entry.levelId as DojoLevelId,
      bestAccuracyPct: entry.bestAccuracyPct,
      earnedXp: entry.earnedXp,
      completedAt: entry.completedAt,
      replayCount: entry.replayCount,
    })),
    totalXp: parsed.data.total_xp,
    currentStreak: parsed.data.current_streak,
    longestStreak: parsed.data.longest_streak,
    lastCompletedDate: parsed.data.last_completed_date,
    unlockedBadges: [...parsed.data.unlocked_badges],
    soundMuted: parsed.data.sound_muted,
    updatedAt: parsed.data.updated_at,
  };
}
