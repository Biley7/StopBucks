import { beforeEach, describe, expect, it } from "vitest";
import {
  simulateImpulseImpact,
  type ImpulseSeverity,
} from "@/domain/impulse-simulator";
import type { RunwayMetrics, UserProfile } from "@/domain/types";
import { GuestSandboxRepository } from "@/repositories/guest-sandbox.repository";

describe("Phase 4B: Impulse Simulator Domain Engine", () => {
  const profile: UserProfile = {
    userId: "test-user-1",
    currency: "INR",
    monthlyBudgetMinor: 2000000, // ₹20,000.00
    selfInvestTargetMinor: 350000, // ₹3,500.00
    hourlyRateMinor: 20000, // ₹200.00/hr (20,000 paise)
    createdAt: "2026-11-01T00:00:00Z",
  };

  const baseRunway: RunwayMetrics = {
    monthlyBudgetMinor: 2000000,
    selfInvestTargetMinor: 350000,
    fixedCommitmentsMinor: 600000, // ₹6,000.00
    consumptionBudgetMinor: 1050000, // ₹10,500.00
    monthToDateConsumptionMinor: 250000, // ₹2,500.00
    monthToDateSelfInvestMinor: 100000, // ₹1,000.00
    remainingConsumptionMinor: 800000, // ₹8,000.00 remaining
    daysInMonth: 30,
    currentDayOfMonth: 11,
    daysRemainingInMonth: 20,
    safeToSpendTodayMinor: 40000, // ₹400.00/day (800,000 / 20)
    growthToBurnRatio: 0.4,
    isOverBudget: false,
  };

  describe("Normal Consumption Purchases", () => {
    it("simulates a small, comfortable purchase (low_impact)", () => {
      // Coffee: ₹120.00 (12,000 paise). Safe-to-Spend is ₹400 (40,000 paise).
      // Days consumed: 12,000 / 40,000 = 0.3 days.
      const result = simulateImpulseImpact({
        itemName: "Cold Coffee",
        priceMinor: 12000,
        triggerTag: "convenience",
        profile,
        runwayMetrics: baseRunway,
      });

      expect(result.itemName).toBe("Cold Coffee");
      expect(result.priceMinor).toBe(12000);
      expect(result.triggerTag).toBe("convenience");
      expect(result.isProtectedSelfInvestment).toBe(false);
      expect(result.daysOfRunwayConsumed).toBe(0.3);

      // Remaining consumption becomes 800,000 - 12,000 = 788,000
      // New safe to spend: Math.round(788,000 / 20) = 39,400 (₹394.00)
      expect(result.safeToSpendAfterMinor).toBe(39400);
      expect(result.dailyDropMinor).toBe(600); // 40,000 - 39,400 = 600 (₹6.00)
      expect(result.severity).toBe<ImpulseSeverity>("low_impact");
      expect(result.verdictExplanation).toBe(
        "This purchase fits comfortably within your current runway."
      );
      expect(result.isExceedingRunway).toBe(false);

      // Pain-of-Paying translations:
      // Work hours: 12,000 / 20,000 = 0.6 hrs
      expect(result.workHours).toBe(0.6);
      // Compounded 4-yr: 12,000 * (1.08)^4 = 16,326
      expect(result.compounded4YearMinor).toBe(16326);
    });

    it("simulates a moderate purchase taking 1.5 days of runway (moderate_hit)", () => {
      // Weekend batch dinner: ₹600.00 (60,000 paise).
      // Days consumed: 60,000 / 40,000 = 1.5 days.
      const result = simulateImpulseImpact({
        itemName: "Rooftop Batch Dinner",
        priceMinor: 60000,
        triggerTag: "social_fomo",
        profile,
        runwayMetrics: baseRunway,
      });

      expect(result.daysOfRunwayConsumed).toBe(1.5);
      // Remaining consumption: 800,000 - 60,000 = 740,000
      // New safe to spend: Math.round(740,000 / 20) = 37,000
      expect(result.safeToSpendAfterMinor).toBe(37000);
      expect(result.dailyDropMinor).toBe(3000); // 40,000 - 37,000
      expect(result.severity).toBe<ImpulseSeverity>("moderate_hit");
      expect(result.verdictExplanation).toBe(
        "This takes a noticeable bite out of your remaining daily budget."
      );
      expect(result.workHours).toBe(3.0); // 60,000 / 20,000 = 3.0 hrs
      expect(result.compounded4YearMinor).toBe(81629); // 60,000 * 1.36048896
    });

    it("simulates a large purchase consuming multiple days (runway_shock)", () => {
      // Sneakers: ₹2,000.00 (200,000 paise).
      // Days consumed: 200,000 / 40,000 = 5.0 days (> 3.0 days).
      const result = simulateImpulseImpact({
        itemName: "New Sneakers",
        priceMinor: 200000,
        triggerTag: "need",
        profile,
        runwayMetrics: baseRunway,
      });

      expect(result.daysOfRunwayConsumed).toBe(5.0);
      // Remaining consumption: 800,000 - 200,000 = 600,000
      // New safe to spend: Math.round(600,000 / 20) = 30,000
      expect(result.safeToSpendAfterMinor).toBe(30000);
      expect(result.dailyDropMinor).toBe(10000);
      expect(result.severity).toBe<ImpulseSeverity>("runway_shock");
      expect(result.verdictExplanation).toBe(
        "This purchase could put pressure on the rest of your month."
      );
      expect(result.workHours).toBe(10.0);
      expect(result.compounded4YearMinor).toBe(272098);
    });
  });

  describe("Invest-in-Self Protection", () => {
    it("protects self-investment from consumption runway penalties", () => {
      // Algorithm Course: ₹1,500.00 (150,000 paise).
      const result = simulateImpulseImpact({
        itemName: "System Design Bootcamp",
        priceMinor: 150000,
        triggerTag: "invest_self",
        profile,
        runwayMetrics: baseRunway,
      });

      expect(result.isProtectedSelfInvestment).toBe(true);
      expect(result.dailyDropMinor).toBe(0);
      expect(result.daysOfRunwayConsumed).toBe(0);
      expect(result.safeToSpendAfterMinor).toBe(baseRunway.safeToSpendTodayMinor); // 40,000
      expect(result.severity).toBe<ImpulseSeverity>("protected_growth");
      expect(result.verdictExplanation).toBe(
        "Good growth spending — this is protected from your consumption runway."
      );
      expect(result.isExceedingRunway).toBe(false);

      // Work hours and compounding are still evaluated as behavioral context
      expect(result.workHours).toBe(7.5); // 150,000 / 20,000 = 7.5 hrs
      expect(result.compounded4YearMinor).toBe(204073);
    });

    it("evaluates protected growth cleanly even when safe to spend is zero", () => {
      const zeroRunway: RunwayMetrics = {
        ...baseRunway,
        remainingConsumptionMinor: 0,
        safeToSpendTodayMinor: 0,
      };

      const result = simulateImpulseImpact({
        itemName: "Calculus Textbook",
        priceMinor: 50000,
        triggerTag: "invest_self",
        profile,
        runwayMetrics: zeroRunway,
      });

      expect(result.isProtectedSelfInvestment).toBe(true);
      expect(result.safeToSpendAfterMinor).toBe(0);
      expect(result.dailyDropMinor).toBe(0);
      expect(result.severity).toBe<ImpulseSeverity>("protected_growth");
    });
  });

  describe("Zero, Depleted, and Overspent Runway Edge Cases", () => {
    it("handles zero Safe-to-Spend without division by zero, Infinity, or NaN", () => {
      const zeroRunway: RunwayMetrics = {
        ...baseRunway,
        remainingConsumptionMinor: 0,
        safeToSpendTodayMinor: 0,
      };

      const result = simulateImpulseImpact({
        itemName: "Snack",
        priceMinor: 5000,
        triggerTag: "convenience",
        profile,
        runwayMetrics: zeroRunway,
      });

      expect(result.daysOfRunwayConsumed).toBeNull();
      expect(result.safeToSpendAfterMinor).toBe(0);
      expect(result.dailyDropMinor).toBe(0);
      expect(result.isExceedingRunway).toBe(true);
      expect(result.severity).toBe<ImpulseSeverity>("runway_shock");
      expect(result.verdictExplanation).toBe(
        "This purchase exceeds your remaining disposable runway."
      );
    });

    it("handles purchase price strictly exceeding remaining consumption pool", () => {
      // Remaining consumption pool is 800,000. Price is 900,000.
      const result = simulateImpulseImpact({
        itemName: "Flagship Headphones",
        priceMinor: 900000,
        triggerTag: "convenience",
        profile,
        runwayMetrics: baseRunway,
      });

      expect(result.daysOfRunwayConsumed).toBeNull();
      expect(result.safeToSpendAfterMinor).toBe(0);
      expect(result.dailyDropMinor).toBe(40000);
      expect(result.isExceedingRunway).toBe(true);
      expect(result.severity).toBe<ImpulseSeverity>("runway_shock");
      expect(result.verdictExplanation).toBe(
        "This purchase exceeds your remaining disposable runway."
      );
    });

    it("clamps safe to spend after purchase to zero (no negative amounts)", () => {
      const tightRunway: RunwayMetrics = {
        ...baseRunway,
        remainingConsumptionMinor: 10000, // ₹100 remaining
        safeToSpendTodayMinor: 500, // ₹5/day
      };

      const result = simulateImpulseImpact({
        itemName: "Dinner",
        priceMinor: 50000, // ₹500
        triggerTag: "convenience",
        profile,
        runwayMetrics: tightRunway,
      });

      expect(result.safeToSpendAfterMinor).toBe(0);
      expect(result.safeToSpendAfterMinor).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Pain-of-Paying Translations & Hourly Rate Behavior", () => {
    it("returns null workHours when hourly rate is zero or missing", () => {
      const zeroRateProfile: UserProfile = {
        ...profile,
        hourlyRateMinor: 0,
      };

      const result = simulateImpulseImpact({
        itemName: "Book",
        priceMinor: 50000,
        triggerTag: "need",
        profile: zeroRateProfile,
        runwayMetrics: baseRunway,
      });

      expect(result.workHours).toBeNull();
    });

    it("produces an integer minor amount for 4-year compounding", () => {
      const result = simulateImpulseImpact({
        itemName: "Gadget",
        priceMinor: 33333,
        triggerTag: "convenience",
        profile,
        runwayMetrics: baseRunway,
      });

      expect(Number.isInteger(result.compounded4YearMinor)).toBe(true);
      expect(result.compounded4YearMinor).toBe(Math.round(33333 * Math.pow(1.08, 4)));
    });
  });

  describe("Input Validation & Range Boundaries", () => {
    it("rejects zero purchase price", () => {
      expect(() =>
        simulateImpulseImpact({
          itemName: "Free item",
          priceMinor: 0,
          triggerTag: "convenience",
          profile,
          runwayMetrics: baseRunway,
        })
      ).toThrow(RangeError);
    });

    it("rejects negative purchase price", () => {
      expect(() =>
        simulateImpulseImpact({
          itemName: "Refund",
          priceMinor: -5000,
          triggerTag: "convenience",
          profile,
          runwayMetrics: baseRunway,
        })
      ).toThrow(RangeError);
    });

    it("rejects non-integer price", () => {
      expect(() =>
        simulateImpulseImpact({
          itemName: "Float price",
          priceMinor: 123.45,
          triggerTag: "convenience",
          profile,
          runwayMetrics: baseRunway,
        })
      ).toThrow(RangeError);
    });

    it("rejects prices exceeding Number.MAX_SAFE_INTEGER", () => {
      expect(() =>
        simulateImpulseImpact({
          itemName: "Extreme price",
          priceMinor: Number.MAX_SAFE_INTEGER + 1000,
          triggerTag: "convenience",
          profile,
          runwayMetrics: baseRunway,
        })
      ).toThrow(RangeError);
    });

    it("trims whitespace from item name", () => {
      const result = simulateImpulseImpact({
        itemName: "   Pencil Box   ",
        priceMinor: 5000,
        triggerTag: "need",
        profile,
        runwayMetrics: baseRunway,
      });

      expect(result.itemName).toBe("Pencil Box");
    });
  });

  describe("Simulator Action Segregation & Mutation Contracts (Section 5.3, 9.7)", () => {
    let repo: GuestSandboxRepository;

    beforeEach(() => {
      repo = new GuestSandboxRepository();
    });

    it("Action A (Park in 48h Vault): adds cooling vault item and NEVER creates a transaction", async () => {
      const vaultBefore = (await repo.getVaultItems()).length;
      const txBefore = (await repo.getTransactions()).length;

      const item = await repo.addVaultItem({
        itemName: "Smart watch",
        priceMinor: 499900,
        triggerTag: "convenience",
      });

      expect(item.id).toBeDefined();
      expect(item.itemName).toBe("Smart watch");
      expect(item.priceMinor).toBe(499900);
      expect(item.status).toBe("cooling");

      const vaultAfter = await repo.getVaultItems();
      const txAfter = await repo.getTransactions();

      expect(vaultAfter.length).toBe(vaultBefore + 1);
      expect(txAfter.length).toBe(txBefore); // Strictly no transaction created
    });

    it("Action B (Buy & Log Anyway): creates a transaction with cashless mode and NEVER creates a vault item", async () => {
      const vaultBefore = (await repo.getVaultItems()).length;
      const txBefore = (await repo.getTransactions()).length;

      const tx = await repo.addTransaction({
        amountMinor: 35000,
        note: "Late-night pizza",
        triggerTag: "stress_late_night",
        paymentMode: "cashless",
      });

      expect(tx.id).toBeDefined();
      expect(tx.amountMinor).toBe(35000);
      expect(tx.note).toBe("Late-night pizza");
      expect(tx.triggerTag).toBe("stress_late_night");
      expect(tx.paymentMode).toBe("cashless");

      const vaultAfter = await repo.getVaultItems();
      const txAfter = await repo.getTransactions();

      expect(txAfter.length).toBe(txBefore + 1);
      expect(vaultAfter.length).toBe(vaultBefore); // Strictly no vault item created
    });
  });
});
