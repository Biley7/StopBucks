import { describe, expect, it } from "vitest";
import {
  createTransactionSchema,
  createVaultItemSchema,
  onboardingSchema,
} from "@/lib/schemas";

describe("StopBucks Validation Schemas", () => {
  describe("onboardingSchema", () => {
    it("accepts valid onboarding input", () => {
      const valid = {
        currency: "INR",
        monthlyBudget: 20000,
        selfInvestTarget: 3000,
        hourlyRate: 200,
      };

      const result = onboardingSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects negative monthly budget", () => {
      const invalid = {
        currency: "INR",
        monthlyBudget: -500,
        selfInvestTarget: 200,
        hourlyRate: 100,
      };

      const result = onboardingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("greater than zero");
      }
    });

    it("rejects unsupported currency", () => {
      const invalid = {
        currency: "EUR", // Only INR, HKD, USD supported
        monthlyBudget: 20000,
        selfInvestTarget: 3000,
        hourlyRate: 200,
      };

      const result = onboardingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Supported currencies");
      }
    });

    it("rejects self-investment target exceeding monthly budget", () => {
      const invalid = {
        currency: "USD",
        monthlyBudget: 1000,
        selfInvestTarget: 1500, // Exceeds budget
        hourlyRate: 15,
      };

      const result = onboardingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "cannot exceed total monthly budget"
        );
      }
    });

    it("rejects non-positive hourly rate", () => {
      const invalid = {
        currency: "HKD",
        monthlyBudget: 10000,
        selfInvestTarget: 2000,
        hourlyRate: 0,
      };

      const result = onboardingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("greater than zero");
      }
    });
  });

  describe("createTransactionSchema", () => {
    it("accepts valid transaction", () => {
      const valid = {
        amountMajor: 250.5,
        note: "Campus stationery",
        triggerTag: "need",
        paymentMode: "cash",
      };

      const result = createTransactionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects negative amount", () => {
      const invalid = {
        amountMajor: -10,
        note: "Negative",
        triggerTag: "convenience",
        paymentMode: "cashless",
      };

      const result = createTransactionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createVaultItemSchema", () => {
    it("accepts valid vault item", () => {
      const valid = {
        itemName: "Gaming Headset",
        priceMajor: 3500,
        triggerTag: "convenience",
      };

      const result = createVaultItemSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty item name", () => {
      const invalid = {
        itemName: "   ",
        priceMajor: 3500,
        triggerTag: "convenience",
      };

      const result = createVaultItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

