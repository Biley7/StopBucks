import { describe, expect, it } from "vitest";
import {
  buildDailyBurnSeries,
  buildRunwayPreview,
  buildTriggerBreakdown,
  calculateMoneyRescuedMinor,
  getIsoWeekKey,
  getRunwayPaceStatus,
} from "@/domain/runway-insights";
import { formatMinorUnits } from "@/domain/currency";
import type { RunwayMetrics, Transaction, VaultItem } from "@/domain/types";

function makeRunway(overrides: Partial<RunwayMetrics> = {}): RunwayMetrics {
  return {
    monthlyBudgetMinor: 2000000,
    selfInvestTargetMinor: 400000,
    fixedCommitmentsMinor: 0,
    consumptionBudgetMinor: 1600000,
    monthToDateConsumptionMinor: 0,
    monthToDateSelfInvestMinor: 0,
    remainingConsumptionMinor: 1600000,
    daysInMonth: 30,
    currentDayOfMonth: 10,
    daysRemainingInMonth: 21,
    safeToSpendTodayMinor: 76190,
    growthToBurnRatio: 0,
    isOverBudget: false,
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction> & Pick<Transaction, "id" | "amountMinor" | "triggerTag">): Transaction {
  return {
    userId: "u1",
    note: "test",
    paymentMode: "cashless",
    loggedAt: "2026-11-05T12:00:00Z",
    createdAt: "2026-11-05T12:00:00Z",
    ...overrides,
  };
}

describe("Runway pace status (central thresholds)", () => {
  it("is on track when spending follows the linear trajectory", () => {
    // Day 10 of 30 => ~33% expected. 30% spent stays on track.
    const pace = getRunwayPaceStatus(
      makeRunway({
        monthToDateConsumptionMinor: 480000, // 30%
        remainingConsumptionMinor: 1120000,
      })
    );
    expect(pace.status).toBe("on_track");
    expect(pace.expectedPercentOfBudget).toBe(33);
    expect(pace.spentPercentOfBudget).toBe(30);
  });

  it("is tight when spending runs ahead of pace", () => {
    const pace = getRunwayPaceStatus(
      makeRunway({
        monthToDateConsumptionMinor: 720000, // 45%
        remainingConsumptionMinor: 880000,
      })
    );
    expect(pace.status).toBe("tight_runway");
  });

  it("is overspent once the consumption budget is exhausted", () => {
    const pace = getRunwayPaceStatus(
      makeRunway({
        monthToDateConsumptionMinor: 1700000,
        remainingConsumptionMinor: 0,
        isOverBudget: true,
      })
    );
    expect(pace.status).toBe("overspent");
    expect(pace.spentPercentOfBudget).toBe(100);
  });

  it("never reports a negative or above-100 progress", () => {
    const pace = getRunwayPaceStatus(
      makeRunway({
        monthToDateConsumptionMinor: 5000000,
        remainingConsumptionMinor: 0,
        isOverBudget: true,
      })
    );
    expect(pace.spentPercentOfBudget).toBe(100);
  });
});

describe("Daily burn series", () => {
  const refDate = new Date(Date.UTC(2026, 10, 10, 12, 0, 0)); // Nov 10, 2026

  const transactions: Transaction[] = [
    makeTx({ id: "a", amountMinor: 100000, triggerTag: "need", loggedAt: "2026-11-02T12:00:00Z" }),
    makeTx({ id: "b", amountMinor: 50000, triggerTag: "convenience", loggedAt: "2026-11-05T12:00:00Z" }),
    makeTx({ id: "c", amountMinor: 200000, triggerTag: "invest_self", loggedAt: "2026-11-04T12:00:00Z" }),
    makeTx({ id: "d", amountMinor: 99999, triggerTag: "need", loggedAt: "2026-10-31T12:00:00Z" }),
  ];

  it("builds one point per day of the current month", () => {
    const series = buildDailyBurnSeries(1600000, transactions, refDate, "UTC");
    expect(series).toHaveLength(30);
  });

  it("accumulates only current-month consumption and excludes invest_self", () => {
    const series = buildDailyBurnSeries(1600000, transactions, refDate, "UTC");
    expect(series[0].actualMinor).toBe(0);
    expect(series[1].actualMinor).toBe(100000);
    expect(series[2].actualMinor).toBe(100000);
    expect(series[4].actualMinor).toBe(150000);
    // No jump on the invest-in-self day.
    expect(series[3].actualMinor).toBe(100000);
    // Nothing from October leaks in.
    expect(series[9].actualMinor).toBe(150000);
  });

  it("never marks future days as actual spending", () => {
    const series = buildDailyBurnSeries(1600000, transactions, refDate, "UTC");
    expect(series[9].actualMinor).toBe(150000);
    expect(series[10].actualMinor).toBeNull();
    expect(series[29].actualMinor).toBeNull();
  });

  it("draws a linear ideal trajectory using the consumption budget", () => {
    const series = buildDailyBurnSeries(1600000, transactions, refDate, "UTC");
    expect(series[0].idealMinor).toBe(Math.round(1600000 / 30));
    expect(series[14].idealMinor).toBe(800000);
    expect(series[29].idealMinor).toBe(1600000);
  });
});

describe("Trigger breakdown", () => {
  const transactions: Transaction[] = [
    makeTx({ id: "n", amountMinor: 10000, triggerTag: "need" }),
    makeTx({ id: "c", amountMinor: 20000, triggerTag: "convenience" }),
    makeTx({ id: "s", amountMinor: 30000, triggerTag: "stress_late_night" }),
    makeTx({ id: "f", amountMinor: 40000, triggerTag: "social_fomo" }),
    makeTx({ id: "i", amountMinor: 50000, triggerTag: "invest_self" }),
  ];

  it("returns all five triggers in canonical order", () => {
    const entries = buildTriggerBreakdown(transactions);
    expect(entries.map((entry) => entry.trigger)).toEqual([
      "need",
      "convenience",
      "stress_late_night",
      "social_fomo",
      "invest_self",
    ]);
  });

  it("uses consumption as the denominator for consumption triggers", () => {
    const entries = buildTriggerBreakdown(transactions);
    const need = entries.find((entry) => entry.trigger === "need")!;
    expect(need.percentage).toBe(10);
    expect(need.denominator).toBe("consumption");

    const social = entries.find((entry) => entry.trigger === "social_fomo")!;
    expect(social.percentage).toBe(40);
    expect(social.count).toBe(1);
    expect(social.totalMinor).toBe(40000);
  });

  it("uses total spend as the denominator for invest-in-self", () => {
    const entries = buildTriggerBreakdown(transactions);
    const invest = entries.find((entry) => entry.trigger === "invest_self")!;
    expect(invest.denominator).toBe("total");
    expect(invest.percentage).toBe(33); // 50,000 / 150,000
  });

  it("handles an empty ledger without NaN", () => {
    const entries = buildTriggerBreakdown([]);
    expect(entries).toHaveLength(5);
    expect(entries.every((entry) => entry.percentage === 0)).toBe(true);
  });
});

describe("Money Rescued", () => {
  const base: Omit<VaultItem, "id" | "priceMinor" | "status"> = {
    userId: "u1",
    itemName: "item",
    triggerTag: "convenience",
    unlockAt: "2026-11-01T00:00:00Z",
    resolvedAt: "2026-11-02T00:00:00Z",
    createdAt: "2026-10-30T00:00:00Z",
  };

  it("sums only rescued items", () => {
    const items: VaultItem[] = [
      { ...base, id: "1", priceMinor: 10000, status: "rescued" },
      { ...base, id: "2", priceMinor: 25000, status: "rescued" },
      { ...base, id: "3", priceMinor: 99999, status: "purchased" },
      { ...base, id: "4", priceMinor: 5000, status: "cooling" },
    ];
    expect(calculateMoneyRescuedMinor(items)).toBe(35000);
  });

  it("returns zero with no resolved items", () => {
    expect(calculateMoneyRescuedMinor([])).toBe(0);
  });
});

describe("Pre-log runway preview", () => {
  const profile = { monthlyBudgetMinor: 2000000, selfInvestTargetMinor: 400000 };
  const refDate = new Date(Date.UTC(2026, 10, 10, 12, 0, 0));

  it("reduces the safe-to-spend allowance for consumption", () => {
    const preview = buildRunwayPreview(profile, [], 100000, "convenience", refDate);
    expect(preview.current.safeToSpendTodayMinor).toBe(76190);
    expect(preview.projected.safeToSpendTodayMinor).toBe(71429);
    expect(preview.safeToSpendDeltaMinor).toBeLessThan(0);
    expect(preview.remainingConsumptionDeltaMinor).toBe(-100000);
  });

  it("leaves consumption runway untouched for invest_self", () => {
    const preview = buildRunwayPreview(profile, [], 100000, "invest_self", refDate);
    expect(preview.projected.safeToSpendTodayMinor).toBe(
      preview.current.safeToSpendTodayMinor
    );
    expect(preview.projected.remainingConsumptionMinor).toBe(
      preview.current.remainingConsumptionMinor
    );
    expect(preview.remainingConsumptionDeltaMinor).toBe(0);
  });

  it("is stable for an empty/invalid amount", () => {
    const preview = buildRunwayPreview(profile, [], 0, "need", refDate);
    expect(preview.safeToSpendDeltaMinor).toBe(0);
  });
});

describe("ISO week key", () => {
  it("computes the ISO week for the first day of 2026", () => {
    expect(getIsoWeekKey(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-W01");
  });

  it("uses a consistent format and groups a Mon–Sun week together", () => {
    const monday = new Date(Date.UTC(2026, 10, 16));
    const sunday = new Date(Date.UTC(2026, 10, 22));
    expect(getIsoWeekKey(monday)).toMatch(/^2026-W\d{2}$/);
    expect(getIsoWeekKey(monday)).toBe(getIsoWeekKey(sunday));
  });
});

describe("Global Pain-of-Paying display conversion", () => {
  it("converts the same amount across all three display modes", () => {
    const minor = 100000; // ₹1,000
    expect(formatMinorUnits(minor, "INR", "currency")).toBe("₹1,000.00");
    expect(formatMinorUnits(minor, "INR", "work_hours", 20000)).toBe("5.0 hrs of work");
    expect(formatMinorUnits(minor, "INR", "compounded_4yr")).toBe("₹1,360.49 in 4 yrs");
  });
});
