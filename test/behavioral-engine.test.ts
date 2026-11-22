import { describe, expect, it } from "vitest";
import {
  analyzeBiases,
  calculateDailyRunway,
  calculateGrowthToBurnRatio,
  calculateMentalAccounting,
  categorizeTransactions,
  detectCashlessNumbness,
  detectLateNightDrift,
  detectPaydayBurn,
  detectSocialFomo,
} from "@/domain/behavioral-engine";
import type { Transaction, UserProfile } from "@/domain/types";

describe("StopBucks Behavioral Finance Engine", () => {
  const mockProfile: UserProfile = {
    userId: "test-user-1",
    currency: "INR",
    monthlyBudgetMinor: 2000000, // ₹20,000.00
    selfInvestTargetMinor: 400000, // ₹4,000.00
    hourlyRateMinor: 20000, // ₹200.00/hr
    createdAt: "2026-01-01T00:00:00Z",
  };

  describe("Mental Accounting", () => {
    it("calculates consumption budget as budget minus self-invest target", () => {
      const result = calculateMentalAccounting(2000000, 400000);
      expect(result.consumptionBudgetMinor).toBe(1600000); // ₹16,000
    });

    it("clamps consumption budget to zero if target exceeds budget", () => {
      const result = calculateMentalAccounting(1000000, 1500000);
      expect(result.consumptionBudgetMinor).toBe(0);
      expect(result.selfInvestTargetMinor).toBe(1000000); // Clamped to monthly budget
    });

    it("handles zero budget cleanly", () => {
      const result = calculateMentalAccounting(0, 0);
      expect(result.consumptionBudgetMinor).toBe(0);
    });
  });

  describe("Categorize Transactions", () => {
    it("separates invest_self transactions from consumption transactions", () => {
      const txs: Transaction[] = [
        {
          id: "1",
          userId: "u1",
          amountMinor: 50000,
          note: "Textbook",
          triggerTag: "invest_self",
          paymentMode: "cashless",
          loggedAt: "2026-11-05T12:00:00Z",
          createdAt: "2026-11-05T12:00:00Z",
        },
        {
          id: "2",
          userId: "u1",
          amountMinor: 20000,
          note: "Coffee",
          triggerTag: "convenience",
          paymentMode: "cashless",
          loggedAt: "2026-11-06T12:00:00Z",
          createdAt: "2026-11-06T12:00:00Z",
        },
        {
          id: "3",
          userId: "u1",
          amountMinor: 10000,
          note: "Notebook",
          triggerTag: "need",
          paymentMode: "cash",
          loggedAt: "2026-11-07T12:00:00Z",
          createdAt: "2026-11-07T12:00:00Z",
        },
      ];

      const { investSelf, consumption, investSelfTotalMinor, consumptionTotalMinor } =
        categorizeTransactions(txs);

      expect(investSelf).toHaveLength(1);
      expect(investSelfTotalMinor).toBe(50000);
      expect(consumption).toHaveLength(2);
      expect(consumptionTotalMinor).toBe(30000);
    });
  });

  describe("Daily Runway Calculation", () => {
    it("computes safe to spend today accurately on day 10 of a 30-day month", () => {
      // Reference date: Nov 10, 2026 (November has 30 days)
      // Current day = 10 -> Days remaining = 30 - 10 + 1 = 21 days
      const refDate = new Date(Date.UTC(2026, 10, 10, 12, 0, 0)); // Month 10 is November

      // Spent 550,000 minor in consumption MTD
      // Consumption budget = 2,000,000 - 400,000 = 1,600,000
      // Remaining = 1,600,000 - 550,000 = 1,050,000 minor
      // Safe to spend today = 1,050,000 / 21 = 50,000 minor (₹500.00)
      const txs: Transaction[] = [
        {
          id: "t1",
          userId: mockProfile.userId,
          amountMinor: 550000,
          note: "Early groceries",
          triggerTag: "need",
          paymentMode: "cashless",
          loggedAt: "2026-11-04T10:00:00Z",
          createdAt: "2026-11-04T10:00:00Z",
        },
        {
          id: "t2",
          userId: mockProfile.userId,
          amountMinor: 200000,
          note: "Online certification",
          triggerTag: "invest_self", // Should NOT reduce consumption runway
          paymentMode: "cashless",
          loggedAt: "2026-11-05T10:00:00Z",
          createdAt: "2026-11-05T10:00:00Z",
        },
      ];

      const runway = calculateDailyRunway(mockProfile, txs, refDate, "UTC");

      expect(runway.consumptionBudgetMinor).toBe(1600000);
      expect(runway.monthToDateConsumptionMinor).toBe(550000);
      expect(runway.monthToDateSelfInvestMinor).toBe(200000);
      expect(runway.remainingConsumptionMinor).toBe(1050000);
      expect(runway.daysInMonth).toBe(30);
      expect(runway.currentDayOfMonth).toBe(10);
      expect(runway.daysRemainingInMonth).toBe(21);
      expect(runway.safeToSpendTodayMinor).toBe(50000);
      expect(runway.isOverBudget).toBe(false);
    });

    it("handles the last day of the month correctly", () => {
      // November 30 (last day) -> days remaining = 1
      const refDate = new Date(Date.UTC(2026, 10, 30, 12, 0, 0));
      const txs: Transaction[] = [];

      const runway = calculateDailyRunway(mockProfile, txs, refDate, "UTC");
      expect(runway.daysRemainingInMonth).toBe(1);
      expect(runway.safeToSpendTodayMinor).toBe(runway.remainingConsumptionMinor);
    });

    it("handles over-budget scenario cleanly (safeToSpendToday = 0, isOverBudget = true)", () => {
      const refDate = new Date(Date.UTC(2026, 10, 15, 12, 0, 0));
      const txs: Transaction[] = [
        {
          id: "t1",
          userId: mockProfile.userId,
          amountMinor: 2500000, // Exceeds 1,600,000 budget
          note: "Massive emergency purchase",
          triggerTag: "need",
          paymentMode: "cashless",
          loggedAt: "2026-11-02T10:00:00Z",
          createdAt: "2026-11-02T10:00:00Z",
        },
      ];

      const runway = calculateDailyRunway(mockProfile, txs, refDate, "UTC");
      expect(runway.remainingConsumptionMinor).toBe(0);
      expect(runway.safeToSpendTodayMinor).toBe(0);
      expect(runway.isOverBudget).toBe(true);
    });

    it("handles leap year February correctly", () => {
      // 2028 is a leap year (Feb has 29 days)
      const refDate = new Date(Date.UTC(2028, 1, 15, 12, 0, 0)); // Feb 15, 2028
      const runway = calculateDailyRunway(mockProfile, [], refDate, "UTC");
      expect(runway.daysInMonth).toBe(29);
      expect(runway.daysRemainingInMonth).toBe(15);
    });
  });

  describe("Growth-to-Burn Ratio", () => {
    it("computes ratio between self-invest and consumption accurately", () => {
      expect(calculateGrowthToBurnRatio(100000, 200000)).toBe(0.5);
      expect(calculateGrowthToBurnRatio(300000, 100000)).toBe(3.0);
    });

    it("handles zero consumption safely without NaN or Infinity", () => {
      expect(calculateGrowthToBurnRatio(50000, 0)).toBe(1.0);
      expect(calculateGrowthToBurnRatio(0, 0)).toBe(0.0);
    });
  });

  describe("Four Behavioral Bias Detectors", () => {
    it("1. Late-Night Drift: detects late hours (22:00-04:00) and stress tag without double counting", () => {
      const txs: Transaction[] = [
        // Satisfies BOTH late hour (23:00) and stress tag -> must be counted ONCE
        {
          id: "t1",
          userId: "u1",
          amountMinor: 30000,
          note: "Midnight craving",
          triggerTag: "stress_late_night",
          paymentMode: "cashless",
          loggedAt: "2026-11-10T23:30:00Z",
          createdAt: "2026-11-10T23:30:00Z",
        },
        // Satisfies stress tag only (during afternoon 14:00)
        {
          id: "t2",
          userId: "u1",
          amountMinor: 20000,
          note: "Exam stress snack",
          triggerTag: "stress_late_night",
          paymentMode: "cashless",
          loggedAt: "2026-11-10T14:00:00Z",
          createdAt: "2026-11-10T14:00:00Z",
        },
        // Satisfies late hour only (02:00) with convenience tag
        {
          id: "t3",
          userId: "u1",
          amountMinor: 10000,
          note: "Vending machine 2am",
          triggerTag: "convenience",
          paymentMode: "cashless",
          loggedAt: "2026-11-10T02:00:00Z",
          createdAt: "2026-11-10T02:00:00Z",
        },
        // Normal daytime need
        {
          id: "t4",
          userId: "u1",
          amountMinor: 40000,
          note: "Lunch",
          triggerTag: "need",
          paymentMode: "cash",
          loggedAt: "2026-11-10T12:00:00Z",
          createdAt: "2026-11-10T12:00:00Z",
        },
      ];

      const bias = detectLateNightDrift(txs, "UTC");
      expect(bias.count).toBe(3); // t1, t2, t3
      expect(bias.totalAmountMinor).toBe(60000); // 30k + 20k + 10k
      expect(bias.score).toBeGreaterThan(0);
      expect(bias.score).toBeLessThanOrEqual(100);
    });

    it("2. Cashless Numbness: detects cashless transactions <= 1.5% of budget", () => {
      // Monthly budget = 2,000,000 minor. 1.5% = 30,000 minor (₹300)
      const txs: Transaction[] = [
        // Cashless <= 30k (Match)
        {
          id: "c1",
          userId: "u1",
          amountMinor: 5000,
          note: "Tea",
          triggerTag: "convenience",
          paymentMode: "cashless",
          loggedAt: "2026-11-05T10:00:00Z",
          createdAt: "2026-11-05T10:00:00Z",
        },
        // Cashless <= 30k (Match)
        {
          id: "c2",
          userId: "u1",
          amountMinor: 25000,
          note: "Snack",
          triggerTag: "convenience",
          paymentMode: "cashless",
          loggedAt: "2026-11-06T10:00:00Z",
          createdAt: "2026-11-06T10:00:00Z",
        },
        // Cash <= 30k (No match: cash has tactile friction)
        {
          id: "c3",
          userId: "u1",
          amountMinor: 10000,
          note: "Cash auto",
          triggerTag: "convenience",
          paymentMode: "cash",
          loggedAt: "2026-11-07T10:00:00Z",
          createdAt: "2026-11-07T10:00:00Z",
        },
        // Cashless > 30k (No match: major purchase feels painful)
        {
          id: "c4",
          userId: "u1",
          amountMinor: 150000,
          note: "Big dinner",
          triggerTag: "convenience",
          paymentMode: "cashless",
          loggedAt: "2026-11-08T10:00:00Z",
          createdAt: "2026-11-08T10:00:00Z",
        },
      ];

      const bias = detectCashlessNumbness(txs, mockProfile.monthlyBudgetMinor);
      expect(bias.count).toBe(2);
      expect(bias.totalAmountMinor).toBe(30000);
      expect(bias.score).toBeGreaterThan(0);
      expect(bias.score).toBeLessThanOrEqual(100);
    });

    it("3. Payday Burn: detects front-loaded burn during days 1-7", () => {
      const txs: Transaction[] = [
        {
          id: "p1",
          userId: "u1",
          amountMinor: 80000,
          note: "Day 2 outing",
          triggerTag: "convenience",
          paymentMode: "cashless",
          loggedAt: "2026-11-02T12:00:00Z", // Day 2
          createdAt: "2026-11-02T12:00:00Z",
        },
        {
          id: "p2",
          userId: "u1",
          amountMinor: 20000,
          note: "Day 15 meal",
          triggerTag: "need",
          paymentMode: "cashless",
          loggedAt: "2026-11-15T12:00:00Z", // Day 15
          createdAt: "2026-11-15T12:00:00Z",
        },
      ];

      // 80k out of 100k total = 80% early month spending (>40% high burn)
      const bias = detectPaydayBurn(txs, "UTC");
      expect(bias.count).toBe(1);
      expect(bias.percentage).toBe(80);
      expect(bias.level).toBe("high");
      expect(bias.score).toBeGreaterThanOrEqual(65);
    });

    it("4. Social FOMO: detects proportion of social_fomo trigger tag", () => {
      const txs: Transaction[] = [
        {
          id: "s1",
          userId: "u1",
          amountMinor: 60000,
          note: "Concert tickets",
          triggerTag: "social_fomo",
          paymentMode: "cashless",
          loggedAt: "2026-11-10T18:00:00Z",
          createdAt: "2026-11-10T18:00:00Z",
        },
        {
          id: "s2",
          userId: "u1",
          amountMinor: 40000,
          note: "Groceries",
          triggerTag: "need",
          paymentMode: "cashless",
          loggedAt: "2026-11-11T12:00:00Z",
          createdAt: "2026-11-11T12:00:00Z",
        },
      ];

      // 60k out of 100k = 60%
      const bias = detectSocialFomo(txs);
      expect(bias.count).toBe(1);
      expect(bias.percentage).toBe(60);
      expect(bias.score).toBe(100);
      expect(bias.level).toBe("high");
    });

    it("runs analyzeBiases and produces deterministic non-guilt coaching advice", () => {
      const analysis = analyzeBiases(mockProfile, [], "UTC");
      expect(analysis.overallRiskScore).toBe(0);
      expect(analysis.deterministicAdvice.length).toBeGreaterThan(0);
      expect(analysis.deterministicAdvice[0]).toContain("well paced");
    });
  });
});

