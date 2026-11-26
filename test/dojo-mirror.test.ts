import { describe, expect, it } from "vitest";
import { analyzeBiases, calculateDailyRunway } from "@/domain/behavioral-engine";
import { convertTo4YearCompounded } from "@/domain/currency";
import { buildDojoPersonalMirror } from "@/domain/dojo-mirror";
import type { DojoLevelId } from "@/domain/dojo-types";
import { calculateMoneyRescuedMinor } from "@/domain/runway-insights";
import { createInitialGuestState } from "@/domain/seed-data";
import type {
  FixedCommitment,
  Transaction,
  UserProfile,
  VaultItem,
} from "@/domain/types";

const ALL_LEVELS: DojoLevelId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ALLOWED_HREFS = new Set(["/runway", "/log", "/radar", "/vault"]);

const BASE_PROFILE: UserProfile = {
  userId: "mirror-user-1",
  currency: "INR",
  monthlyBudgetMinor: 2000000, // ₹20,000
  selfInvestTargetMinor: 350000, // ₹3,500
  hourlyRateMinor: 20000, // ₹200/hr
  createdAt: "2026-10-01T00:00:00.000Z",
};

function makeTx(
  overrides: Partial<Transaction> & Pick<Transaction, "id" | "amountMinor" | "triggerTag">
): Transaction {
  return {
    userId: BASE_PROFILE.userId,
    note: `Tx ${overrides.id}`,
    paymentMode: "cashless",
    loggedAt: "2026-11-10T12:00:00.000Z",
    createdAt: "2026-11-10T12:00:00.000Z",
    ...overrides,
  };
}

function makeVault(
  overrides: Partial<VaultItem> & Pick<VaultItem, "id" | "priceMinor" | "status">
): VaultItem {
  return {
    userId: BASE_PROFILE.userId,
    itemName: `Vault ${overrides.id}`,
    triggerTag: "convenience",
    unlockAt: "2026-11-05T12:00:00.000Z",
    resolvedAt: overrides.status === "cooling" ? null : "2026-11-07T12:00:00.000Z",
    createdAt: "2026-11-03T12:00:00.000Z",
    ...overrides,
  };
}

function assertValidMirrorShape(mirror: ReturnType<typeof buildDojoPersonalMirror>) {
  expect(mirror.headline.trim().length).toBeGreaterThan(0);
  expect(mirror.insight.trim().length).toBeGreaterThan(0);
  expect(typeof mirror.hasLiveSignal).toBe("boolean");
  expect(ALLOWED_HREFS.has(mirror.actionLink.href)).toBe(true);
  expect(mirror.actionLink.label.trim().length).toBeGreaterThan(0);
  expect(mirror.metrics.length).toBeGreaterThanOrEqual(2);
  expect(mirror.metrics.length).toBeLessThanOrEqual(3);

  for (const metric of mirror.metrics) {
    expect(metric.label.trim().length).toBeGreaterThan(0);
    expect(["money_minor", "percent", "count", "text"]).toContain(metric.valueType);
    expect(["positive", "neutral", "caution"]).toContain(metric.tone);

    if (metric.numericValue !== null) {
      expect(Number.isFinite(metric.numericValue)).toBe(true);
      expect(Number.isNaN(metric.numericValue)).toBe(false);
      if (metric.valueType === "money_minor" || metric.valueType === "count") {
        expect(Number.isInteger(metric.numericValue)).toBe(true);
      }
    }
  }
}

describe("Phase 5A: Dojo Live Personal Data Mirror Engine", () => {
  it("produces valid, finite mirror outputs for all 9 levels on rich seeded data", () => {
    const refDate = new Date("2026-11-25T10:00:00.000Z");
    const seed = createInitialGuestState(refDate);

    // Snapshot input lengths to ensure zero mutation
    const txLen = seed.transactions.length;
    const fcLen = seed.fixedCommitments.length;
    const vaultLen = seed.vaultItems.length;

    for (const levelId of ALL_LEVELS) {
      const mirror = buildDojoPersonalMirror(levelId, {
        profile: seed.profile,
        transactions: seed.transactions,
        fixedCommitments: seed.fixedCommitments,
        vaultItems: seed.vaultItems,
        referenceDate: refDate,
        timeZone: "Asia/Kolkata",
      });

      assertValidMirrorShape(mirror);
      expect(mirror.hasLiveSignal).toBe(true);
    }

    expect(seed.transactions).toHaveLength(txLen);
    expect(seed.fixedCommitments).toHaveLength(fcLen);
    expect(seed.vaultItems).toHaveLength(vaultLen);
  });

  it("handles empty-ledger and null-profile accounts safely with no NaN or Infinity", () => {
    const refDate = new Date("2026-11-25T10:00:00.000Z");

    for (const levelId of ALL_LEVELS) {
      const emptyLedgerMirror = buildDojoPersonalMirror(levelId, {
        profile: BASE_PROFILE,
        transactions: [],
        fixedCommitments: [],
        vaultItems: [],
        referenceDate: refDate,
        timeZone: "UTC",
      });
      assertValidMirrorShape(emptyLedgerMirror);
      if (levelId !== 9) {
        expect(emptyLedgerMirror.hasLiveSignal).toBe(false);
      }

      const nullProfileMirror = buildDojoPersonalMirror(levelId, {
        profile: null,
        transactions: [],
        fixedCommitments: [],
        vaultItems: [],
        referenceDate: refDate,
        timeZone: "UTC",
      });
      assertValidMirrorShape(nullProfileMirror);
      expect(nullProfileMirror.hasLiveSignal).toBe(false);
    }
  });

  it("excludes future-dated transactions and respects timezone month boundaries", () => {
    // 2026-11-30T20:00:00Z is Dec 1 in Asia/Kolkata, Nov 30 in UTC
    const refDate = new Date("2026-11-30T20:00:00.000Z");
    const txs: Transaction[] = [
      makeTx({
        id: "nov-only",
        amountMinor: 50000,
        triggerTag: "convenience",
        loggedAt: "2026-11-20T12:00:00.000Z",
      }),
      makeTx({
        id: "ist-dec-1",
        amountMinor: 90000,
        triggerTag: "social_fomo",
        loggedAt: "2026-11-30T19:00:00.000Z", // 00:30 AM Dec 1 in Kolkata!
      }),
      makeTx({
        id: "future-tx",
        amountMinor: 500000,
        triggerTag: "stress_late_night",
        loggedAt: "2026-12-05T12:00:00.000Z", // Strictly future!
      }),
    ];

    const utcMirrorL3 = buildDojoPersonalMirror(3, {
      profile: BASE_PROFILE,
      transactions: txs,
      fixedCommitments: [],
      vaultItems: [],
      referenceDate: refDate,
      timeZone: "UTC",
    });
    // In UTC, Nov 20 (50k) + Nov 30 19:00 UTC (90k) = 140k; future 500k excluded
    expect(utcMirrorL3.metrics[0].numericValue).toBe(140000);

    const kolkataMirrorL3 = buildDojoPersonalMirror(3, {
      profile: BASE_PROFILE,
      transactions: txs,
      fixedCommitments: [],
      vaultItems: [],
      referenceDate: refDate,
      timeZone: "Asia/Kolkata",
    });
    // In Kolkata, it is Dec 1, so only ist-dec-1 (90k) falls in Dec 2026 up to refDate!
    expect(kolkataMirrorL3.metrics[0].numericValue).toBe(90000);
  });

  it("maintains exact mathematical parity across Levels 1–9 with canonical domain engines", () => {
    const refDate = new Date("2026-11-15T12:00:00.000Z"); // Day 15 of 30
    const tz = "UTC";
    const fixedCommitments: FixedCommitment[] = [
      {
        id: "fc-1",
        userId: BASE_PROFILE.userId,
        title: "Hostel Mess",
        amountMinor: 400000,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
      {
        id: "fc-2",
        userId: BASE_PROFILE.userId,
        title: "Wi-Fi",
        amountMinor: 100000,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ];
    const totalFixedMinor = 500000;

    const transactions: Transaction[] = [
      // Micro cashless convenience <= 1.5% (30,000 minor) & <= 2% (40,000 minor)
      makeTx({
        id: "t1",
        amountMinor: 15000,
        triggerTag: "convenience",
        paymentMode: "cashless",
        loggedAt: "2026-11-02T14:00:00.000Z",
      }),
      makeTx({
        id: "t2",
        amountMinor: 25000,
        triggerTag: "convenience",
        paymentMode: "cashless",
        loggedAt: "2026-11-04T14:00:00.000Z",
      }),
      // Stress late night (at 23:30)
      makeTx({
        id: "t3",
        amountMinor: 60000,
        triggerTag: "stress_late_night",
        paymentMode: "cashless",
        loggedAt: "2026-11-06T23:30:00.000Z",
      }),
      // Need (cash)
      makeTx({
        id: "t4",
        amountMinor: 100000,
        triggerTag: "need",
        paymentMode: "cash",
        loggedAt: "2026-11-08T12:00:00.000Z",
      }),
      // Invest in self (excluded from consumption!)
      makeTx({
        id: "t5",
        amountMinor: 175000,
        triggerTag: "invest_self",
        paymentMode: "cashless",
        loggedAt: "2026-11-09T10:00:00.000Z",
      }),
      // Purchased vault transaction (matches vault item status="purchased")
      makeTx({
        id: "t6",
        amountMinor: 80000,
        triggerTag: "social_fomo",
        paymentMode: "cashless",
        loggedAt: "2026-11-12T18:00:00.000Z",
      }),
    ];

    const vaultItems: VaultItem[] = [
      makeVault({ id: "v1", priceMinor: 200000, status: "rescued" }),
      makeVault({ id: "v2", priceMinor: 80000, status: "purchased" }),
      makeVault({ id: "v3", priceMinor: 150000, status: "cooling" }),
    ];

    const runway = calculateDailyRunway(
      BASE_PROFILE,
      transactions,
      refDate,
      tz,
      totalFixedMinor
    );
    const biases = analyzeBiases(BASE_PROFILE, transactions, tz);
    const rescuedMinor = calculateMoneyRescuedMinor(vaultItems);

    const commonInput = {
      profile: BASE_PROFILE,
      transactions,
      fixedCommitments,
      vaultItems,
      referenceDate: refDate,
      timeZone: tz,
    };

    // Level 1: Planner Moves = 1 invest_self + 2 fixed + 1 rescued = 4; Doer = 4 (t1,t2,t3,t6)
    const l1 = buildDojoPersonalMirror(1, commonInput);
    expect(l1.metrics[0].numericValue).toBe(4);
    expect(l1.metrics[1].numericValue).toBe(4);
    expect(l1.metrics[2].numericValue).toBe(40000); // convenience only: 15k + 25k

    // Level 2: Cashless share 5/6 = 83%, micro taps match biases.cashlessNumbness, shield = 500k + 350k
    const l2 = buildDojoPersonalMirror(2, commonInput);
    expect(l2.metrics[0].numericValue).toBe(83);
    expect(l2.metrics[1].numericValue).toBe(biases.cashlessNumbness.totalAmountMinor);
    expect(l2.metrics[2].numericValue).toBe(totalFixedMinor + BASE_PROFILE.selfInvestTargetMinor);

    // Level 3: Hedonic = 15k + 25k + 60k + 80k = 180k; consumption = 280k -> 64%
    const l3 = buildDojoPersonalMirror(3, commonInput);
    expect(l3.metrics[0].numericValue).toBe(180000);
    expect(l3.metrics[1].numericValue).toBe(64);
    expect(l3.metrics[2].numericValue).toBe(biases.lateNightDrift.totalAmountMinor);

    // Level 4: 2 small items <= 40,000 (t1 15k + t2 25k = 40k); annualized over 15 days = round(40k/15*365)
    const l4 = buildDojoPersonalMirror(4, commonInput);
    const expectedAnnual = Math.round((40000 / 15) * 365);
    expect(l4.metrics[0].numericValue).toBe(40000);
    expect(l4.metrics[1].numericValue).toBe(expectedAnnual);
    expect(l4.metrics[2].numericValue).toBe(convertTo4YearCompounded(expectedAnnual));

    // Level 5: Zero-guilt total = rescued (200k) + mtdSelfInvest (175k) = 375k
    const l5 = buildDojoPersonalMirror(5, commonInput);
    expect(l5.metrics[1].numericValue).toBe(4); // 2 fixed bills + 2 cooling/rescued vault items
    expect(l5.metrics[2].numericValue).toBe(rescuedMinor + runway.monthToDateSelfInvestMinor);

    // Level 6: Three buckets match runway exactly
    const l6 = buildDojoPersonalMirror(6, commonInput);
    expect(l6.metrics[0].numericValue).toBe(runway.fixedCommitmentsMinor);
    expect(l6.metrics[1].numericValue).toBe(runway.monthToDateConsumptionMinor);
    expect(l6.metrics[2].numericValue).toBe(runway.monthToDateSelfInvestMinor);

    // Level 7: All 4 habits hold (budget+bills, on_track 280k/1150k=24% <= 50%+8%, rescued>0, invest_self>0)
    const l7 = buildDojoPersonalMirror(7, commonInput);
    expect(l7.metrics[0].textValue).toBe("4/4");
    expect(l7.metrics[1].numericValue).toBe(runway.remainingConsumptionMinor + rescuedMinor);

    // Level 8: Projected surplus/deficit and extra buffer days match runway
    const l8 = buildDojoPersonalMirror(8, commonInput);
    const expectedProjected =
      runway.consumptionBudgetMinor -
      Math.round((runway.monthToDateConsumptionMinor / 15) * 30);
    const expectedCushionDays =
      Math.round(
        ((runway.remainingConsumptionMinor + rescuedMinor) /
          (runway.monthToDateConsumptionMinor / 15)) *
          10
      ) / 10;
    expect(l8.metrics[0].numericValue).toBe(expectedProjected);
    expect(l8.metrics[1].numericValue).toBe(expectedCushionDays);

    // Level 9: Two-asset split + Vault rescue rate (1 rescued / 2 resolved = 50%)
    const l9 = buildDojoPersonalMirror(9, commonInput);
    expect(l9.metrics[0].numericValue).toBe(
      runway.fixedCommitmentsMinor + runway.selfInvestTargetMinor + rescuedMinor
    );
    expect(l9.metrics[1].numericValue).toBe(runway.consumptionBudgetMinor);
    expect(l9.metrics[2].numericValue).toBe(50);
  });

  it("does not extrapolate a single isolated small purchase in Level 4", () => {
    const refDate = new Date("2026-11-15T12:00:00.000Z");
    const singleTx = [
      makeTx({
        id: "solo",
        amountMinor: 20000,
        triggerTag: "convenience",
        loggedAt: "2026-11-10T12:00:00.000Z",
      }),
    ];

    const l4 = buildDojoPersonalMirror(4, {
      profile: BASE_PROFILE,
      transactions: singleTx,
      fixedCommitments: [],
      vaultItems: [],
      referenceDate: refDate,
      timeZone: "UTC",
    });

    expect(l4.metrics[0].numericValue).toBe(20000);
    expect(l4.metrics[1].numericValue).toBeNull();
    expect(l4.metrics[1].textValue).toBe("1 isolated item");
    expect(l4.metrics[2].numericValue).toBe(convertTo4YearCompounded(20000));
  });

  it("guards zero denominators safely in Levels 6, 8, and 9", () => {
    const refDate = new Date("2026-11-15T12:00:00.000Z");
    const zeroTargetProfile: UserProfile = {
      ...BASE_PROFILE,
      selfInvestTargetMinor: 0,
    };

    const l6 = buildDojoPersonalMirror(6, {
      profile: zeroTargetProfile,
      transactions: [],
      fixedCommitments: [],
      vaultItems: [],
      referenceDate: refDate,
      timeZone: "UTC",
    });
    expect(l6.metrics[2].textValue).toBeUndefined();

    // Level 8 with 0 MTD consumption -> dailyBaseline = 0 -> Buffer Runway Days = null
    const l8 = buildDojoPersonalMirror(8, {
      profile: BASE_PROFILE,
      transactions: [
        makeTx({
          id: "invest-only",
          amountMinor: 100000,
          triggerTag: "invest_self",
          loggedAt: "2026-11-10T12:00:00.000Z",
        }),
      ],
      fixedCommitments: [],
      vaultItems: [],
      referenceDate: refDate,
      timeZone: "UTC",
    });
    expect(l8.metrics[1].numericValue).toBeNull();
    expect(l8.metrics[1].textValue).toBe("No burn baseline");

    // Level 9 with only a cooling vault item (0 resolved) -> rescue rate = null (never NaN)
    const l9 = buildDojoPersonalMirror(9, {
      profile: BASE_PROFILE,
      transactions: [],
      fixedCommitments: [],
      vaultItems: [makeVault({ id: "cooling-only", priceMinor: 100000, status: "cooling" })],
      referenceDate: refDate,
      timeZone: "UTC",
    });
    expect(l9.metrics[2].numericValue).toBeNull();
    expect(l9.metrics[2].textValue).toBe("No resolved items");
  });
});
