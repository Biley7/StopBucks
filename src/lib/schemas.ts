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
