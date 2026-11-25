import { describe, expect, it } from "vitest";
import {
  buildMonthEndSnapshot,
  filterTransactionsByMonth,
  getEndOfMonthDate,
} from "@/domain/runway-insights";
import { getDaysInMonth, getLocalDateParts } from "@/domain/behavioral-engine";
import type { Transaction, UserProfile } from "@/domain/types";

const mockProfile: Pick<UserProfile, "monthlyBudgetMinor" | "selfInvestTargetMinor"> = {
  monthlyBudgetMinor: 2000000, // ₹20,000.00
  selfInvestTargetMinor: 350000, // ₹3,500.00
};

function createTx(
  id: string,
  amountMinor: number,
  triggerTag: Transaction["triggerTag"],
  loggedAt: string
): Transaction {
  return {
    id,
    userId: "test-user",
    amountMinor,
    note: `Tx ${id}`,
    triggerTag,
    paymentMode: "cashless",
    loggedAt,
    createdAt: loggedAt,
  };
}

describe("Phase 4C: Month-End Snapshots & Filtering", () => {
  it("filters transactions strictly by target month and year in given timezone", () => {
    const txs: Transaction[] = [
      createTx("1", 50000, "need", "2026-01-15T12:00:00Z"),
      createTx("2", 30000, "convenience", "2026-01-31T23:30:00Z"), // Jan 31 in UTC
      createTx("3", 40000, "stress_late_night", "2026-02-01T00:30:00Z"), // Feb 1 in UTC
      createTx("4", 10000, "social_fomo", "2025-01-15T12:00:00Z"), // 2025
    ];

    const jan2026 = filterTransactionsByMonth(txs, 2026, 1, "UTC");
    expect(jan2026.map((t) => t.id)).toEqual(["1", "2"]);

    const feb2026 = filterTransactionsByMonth(txs, 2026, 2, "UTC");
    expect(feb2026.map((t) => t.id)).toEqual(["3"]);
  });

  it("handles timezone boundary shifts accurately", () => {
    // 2026-01-31T23:30:00Z is Feb 1 in Asia/Kolkata (05:00 AM)
    const tx = createTx("edge", 10000, "need", "2026-01-31T23:30:00Z");

    const utcJan = filterTransactionsByMonth([tx], 2026, 1, "UTC");
    expect(utcJan).toHaveLength(1);

    const kolkataJan = filterTransactionsByMonth([tx], 2026, 1, "Asia/Kolkata");
    expect(kolkataJan).toHaveLength(0);

    const kolkataFeb = filterTransactionsByMonth([tx], 2026, 2, "Asia/Kolkata");
    expect(kolkataFeb).toHaveLength(1);
  });

  it("builds a snapshot with SURPLUS when consumption is under consumption budget", () => {
    // Monthly Budget: ₹20,000 (2,000,000 minor)
    // Self Invest Target: ₹3,500 (350,000 minor)
    // Fixed Bills: ₹2,000 (200,000 minor)
    // Consumption Budget = 2,000,000 - 350,000 - 200,000 = 1,450,000 minor
    const fixedBillsMinor = 200000;

    const txs: Transaction[] = [
      createTx("1", 400000, "need", "2026-01-05T10:00:00Z"),
      createTx("2", 300000, "convenience", "2026-01-12T10:00:00Z"),
      createTx("3", 250000, "invest_self", "2026-01-20T10:00:00Z"), // Self-invest
    ];

    const snapshot = buildMonthEndSnapshot(
      txs,
      mockProfile,
      fixedBillsMinor,
      2026,
      1,
      "UTC"
    );

    expect(snapshot.year).toBe(2026);
    expect(snapshot.month).toBe(1);
    expect(snapshot.consumptionBudgetMinor).toBe(1450000);
    // Consumption spend = 400,000 + 300,000 = 700,000 minor
    expect(snapshot.totalConsumptionMinor).toBe(700000);
    // Invest self spend = 250,000 minor
    expect(snapshot.totalSelfInvestMinor).toBe(250000);
    expect(snapshot.fixedCommitmentsMinor).toBe(200000);
    // Surplus = 1,450,000 - 700,000 = 750,000 minor
    expect(snapshot.surplusOrDeficitMinor).toBe(750000);
    expect(snapshot.isSurplus).toBe(true);
    expect(snapshot.isDeficit).toBe(false);
    expect(snapshot.topTrigger).toBe("need"); // 400,000 > 300,000
    expect(snapshot.transactionCount).toBe(3);
  });

  it("builds a snapshot with DEFICIT when consumption exceeds consumption budget", () => {
    const fixedBillsMinor = 200000;
    // Consumption Budget = 1,450,000 minor

    const txs: Transaction[] = [
      createTx("1", 1000000, "social_fomo", "2026-01-05T10:00:00Z"),
      createTx("2", 600000, "stress_late_night", "2026-01-12T10:00:00Z"),
    ];

    const snapshot = buildMonthEndSnapshot(
      txs,
      mockProfile,
      fixedBillsMinor,
      2026,
      1,
      "UTC"
    );

    // Consumption spend = 1,600,000 minor > 1,450,000
    expect(snapshot.totalConsumptionMinor).toBe(1600000);
    expect(snapshot.surplusOrDeficitMinor).toBe(-150000);
    expect(snapshot.isSurplus).toBe(false);
    expect(snapshot.isDeficit).toBe(true);
    expect(snapshot.topTrigger).toBe("social_fomo");
  });

  it("tie-breaks dominant consumption trigger using canonical TRIGGER_ORDER", () => {
    const txs: Transaction[] = [
      createTx("1", 200000, "convenience", "2026-01-05T10:00:00Z"),
      createTx("2", 200000, "need", "2026-01-06T10:00:00Z"),
    ];

    const snapshot = buildMonthEndSnapshot(txs, mockProfile, 0, 2026, 1, "UTC");
    // "need" precedes "convenience" in canonical order
    expect(snapshot.topTrigger).toBe("need");
  });

  it("excludes invest_self from top consumption trigger even if it is the largest spend", () => {
    const txs: Transaction[] = [
      createTx("1", 1000000, "invest_self", "2026-01-05T10:00:00Z"),
      createTx("2", 50000, "stress_late_night", "2026-01-06T10:00:00Z"),
    ];

    const snapshot = buildMonthEndSnapshot(txs, mockProfile, 0, 2026, 1, "UTC");
    expect(snapshot.topTrigger).toBe("stress_late_night");
    expect(snapshot.totalSelfInvestMinor).toBe(1000000);
    expect(snapshot.totalConsumptionMinor).toBe(50000);
  });

  it("handles empty transactions gracefully", () => {
    const snapshot = buildMonthEndSnapshot([], mockProfile, 0, 2026, 1, "UTC");
    expect(snapshot.totalConsumptionMinor).toBe(0);
    expect(snapshot.totalSelfInvestMinor).toBe(0);
    expect(snapshot.topTrigger).toBeNull();
    expect(snapshot.transactionCount).toBe(0);
    expect(snapshot.isSurplus).toBe(true); // budget - 0 > 0
  });

  it("clamps consumption budget cleanly to 0 when fixed bills exceed monthly budget", () => {
    // Budget: ₹20,000 (2,000,000 minor)
    // Fixed bills: ₹25,000 (2,500,000 minor)
    const snapshot = buildMonthEndSnapshot([], mockProfile, 2500000, 2026, 1, "UTC");
    expect(snapshot.consumptionBudgetMinor).toBe(0);
    expect(snapshot.surplusOrDeficitMinor).toBe(0);
    expect(snapshot.isSurplus).toBe(false);
    expect(snapshot.isDeficit).toBe(false);
    expect(Number.isNaN(snapshot.consumptionBudgetMinor)).toBe(false);
  });

  it("calculates accurate end-of-month dates", () => {
    const endJan = getEndOfMonthDate(2026, 1, "UTC");
    const parts = getLocalDateParts(endJan, "UTC");
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(1);
    expect(parts.day).toBe(31);
    expect(parts.hour).toBe(23);

    const endFebLeap = getEndOfMonthDate(2024, 2, "UTC");
    expect(getDaysInMonth(2024, 1)).toBe(29);
    const febParts = getLocalDateParts(endFebLeap, "UTC");
    expect(febParts.day).toBe(29);
  });
});
