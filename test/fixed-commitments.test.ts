import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateDailyRunway,
  calculateMentalAccounting,
} from "@/domain/behavioral-engine";
import { buildRunwayPreview } from "@/domain/runway-insights";
import { createInitialGuestState } from "@/domain/seed-data";
import type {
  FixedCommitment,
  Transaction,
  UserProfile,
} from "@/domain/types";
import { createFixedCommitmentSchema } from "@/lib/schemas";
import { queryKeys } from "@/lib/query-keys";
import { GuestSandboxRepository } from "@/repositories/guest-sandbox.repository";
import {
  SupabaseRepository,
  mapFixedCommitmentRow,
} from "@/repositories/supabase.repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Phase 4A: Fixed Monthly Commitments — Financial Domain Engine", () => {
  const profile: UserProfile = {
    userId: "u-student-1",
    currency: "INR",
    monthlyBudgetMinor: 2000000, // ₹20,000.00
    selfInvestTargetMinor: 350000, // ₹3,500.00
    hourlyRateMinor: 20000, // ₹200.00/hr
    createdAt: "2026-11-01T00:00:00Z",
  };

  const refDate = new Date("2026-11-15T12:00:00Z"); // 30 days in Nov, day 15, 16 days remaining
  const tz = "UTC";

  const transactions: Transaction[] = [
    {
      id: "tx-1",
      userId: profile.userId,
      amountMinor: 25000, // ₹250
      note: "Groceries",
      triggerTag: "need",
      paymentMode: "cashless",
      loggedAt: "2026-11-05T10:00:00Z",
      createdAt: "2026-11-05T10:00:00Z",
    },
    {
      id: "tx-2",
      userId: profile.userId,
      amountMinor: 49900, // ₹499
      note: "Course",
      triggerTag: "invest_self",
      paymentMode: "cashless",
      loggedAt: "2026-11-10T10:00:00Z",
      createdAt: "2026-11-10T10:00:00Z",
    },
  ];

  // 1. No fixed commitments
  it("preserves exact existing calculation when no fixed commitments are supplied", () => {
    const withoutParam = calculateDailyRunway(profile, transactions, refDate, tz);
    const withZero = calculateDailyRunway(profile, transactions, refDate, tz, 0);

    expect(withoutParam.monthlyBudgetMinor).toBe(2000000);
    expect(withoutParam.selfInvestTargetMinor).toBe(350000);
    expect(withoutParam.fixedCommitmentsMinor).toBe(0);
    expect(withoutParam.consumptionBudgetMinor).toBe(1650000); // 20,000 - 3,500
    expect(withoutParam.monthToDateConsumptionMinor).toBe(25000);
    expect(withoutParam.monthToDateSelfInvestMinor).toBe(49900);
    expect(withoutParam.remainingConsumptionMinor).toBe(1625000); // 1,650,000 - 25,000
    expect(withoutParam.daysRemainingInMonth).toBe(16);
    expect(withoutParam.safeToSpendTodayMinor).toBe(Math.round(1625000 / 16)); // 101563
    expect(withZero).toEqual(withoutParam);
  });

  // 2. One fixed commitment
  it("deducts a single fixed commitment correctly from consumption budget", () => {
    const fixedMinor = 450000; // Mess plan: ₹4,500.00
    const runway = calculateDailyRunway(profile, transactions, refDate, tz, fixedMinor);

    expect(runway.fixedCommitmentsMinor).toBe(450000);
    // True disposable: 2,000,000 - 350,000 - 450,000 = 1,200,000
    expect(runway.consumptionBudgetMinor).toBe(1200000);
    expect(runway.remainingConsumptionMinor).toBe(1175000); // 1,200,000 - 25,000
    expect(runway.safeToSpendTodayMinor).toBe(Math.round(1175000 / 16)); // 73438
  });

  // 3. Multiple fixed commitments
  it("deducts the sum of multiple fixed commitments correctly", () => {
    // Mess: ₹4,500, Wi-Fi: ₹800, Gym: ₹700 (Total ₹6,000 = 600,000 paise)
    const totalFixed = 450000 + 80000 + 70000;
    const runway = calculateDailyRunway(profile, transactions, refDate, tz, totalFixed);

    expect(runway.fixedCommitmentsMinor).toBe(600000);
    // True disposable: 2,000,000 - 350,000 - 600,000 = 1,050,000
    expect(runway.consumptionBudgetMinor).toBe(1050000);
    expect(runway.remainingConsumptionMinor).toBe(1025000); // 1,050,000 - 25,000
    expect(runway.safeToSpendTodayMinor).toBe(Math.round(1025000 / 16)); // 64063
  });

  // 4. Fixed commitments equal monthly budget
  it("handles fixed commitments equal to monthly budget without negative values", () => {
    const runway = calculateDailyRunway(profile, transactions, refDate, tz, 2000000);

    expect(runway.consumptionBudgetMinor).toBe(0);
    expect(runway.remainingConsumptionMinor).toBe(0);
    expect(runway.safeToSpendTodayMinor).toBe(0);
    expect(runway.isOverBudget).toBe(true);
  });

  // 5. Fixed commitments exceed monthly budget
  it("handles fixed commitments exceeding monthly budget cleanly clamped to 0", () => {
    const runway = calculateDailyRunway(profile, transactions, refDate, tz, 2500000);

    expect(runway.consumptionBudgetMinor).toBe(0);
    expect(runway.remainingConsumptionMinor).toBe(0);
    expect(runway.safeToSpendTodayMinor).toBe(0);
    expect(runway.isOverBudget).toBe(true);
  });

  // 6. Fixed commitments plus protected investment equal monthly budget
  it("handles fixed commitments + protected investment equal to monthly budget", () => {
    // 350,000 + 1,650,000 = 2,000,000
    const runway = calculateDailyRunway(profile, transactions, refDate, tz, 1650000);

    expect(runway.consumptionBudgetMinor).toBe(0);
    expect(runway.remainingConsumptionMinor).toBe(0);
    expect(runway.safeToSpendTodayMinor).toBe(0);
  });

  // 7. Fixed commitments plus protected investment exceed monthly budget
  it("handles fixed commitments + protected investment exceeding monthly budget", () => {
    // 350,000 + 1,800,000 = 2,150,000 > 2,000,000
    const runway = calculateDailyRunway(profile, transactions, refDate, tz, 1800000);

    expect(runway.consumptionBudgetMinor).toBe(0);
    expect(runway.remainingConsumptionMinor).toBe(0);
    expect(runway.safeToSpendTodayMinor).toBe(0);
  });

  // 8. Negative fixed commitment input is safely normalized
  it("safely normalizes negative fixed commitment input to zero", () => {
    const mental = calculateMentalAccounting(2000000, 350000, -50000);
    expect(mental.fixedCommitmentsMinor).toBe(0);
    expect(mental.consumptionBudgetMinor).toBe(1650000);

    const runway = calculateDailyRunway(profile, transactions, refDate, tz, -50000);
    expect(runway.fixedCommitmentsMinor).toBe(0);
    expect(runway.consumptionBudgetMinor).toBe(1650000);
  });

  // 9. Future-dated transactions remain excluded
  it("excludes future-dated transactions from consumption burn", () => {
    const futureTx: Transaction = {
      id: "tx-future",
      userId: profile.userId,
      amountMinor: 500000,
      note: "Planned purchase",
      triggerTag: "convenience",
      paymentMode: "cashless",
      loggedAt: "2026-11-25T10:00:00Z", // Future relative to refDate (Nov 15)
      createdAt: "2026-11-25T10:00:00Z",
    };

    const runway = calculateDailyRunway(
      profile,
      [...transactions, futureTx],
      refDate,
      tz,
      600000
    );

    // Month to date consumption still only 25,000
    expect(runway.monthToDateConsumptionMinor).toBe(25000);
  });

  // 10. Timezone behavior preservation
  it("respects local timezone boundary for month and days remaining", () => {
    const runwayUTC = calculateDailyRunway(profile, transactions, refDate, "UTC", 600000);
    const runwayIST = calculateDailyRunway(profile, transactions, refDate, "Asia/Kolkata", 600000);

    expect(runwayUTC.daysInMonth).toBe(30);
    expect(runwayIST.daysInMonth).toBe(30);
    expect(runwayUTC.daysRemainingInMonth).toBe(16);
    expect(runwayIST.daysRemainingInMonth).toBe(16);
  });
});

describe("Phase 4A: GuestSandboxRepository Parity & Persistence", () => {
  let repo: GuestSandboxRepository;

  beforeEach(() => {
    repo = new GuestSandboxRepository();
  });

  it("seeds three realistic student fixed commitments in Guest Demo", async () => {
    const commitments = await repo.getFixedCommitments();
    expect(commitments).toHaveLength(3);

    const titles = commitments.map((c) => c.title);
    expect(titles).toContain("Mess & Tiffin Subscription");
    expect(titles).toContain("Hostel Wi-Fi & Mobile Recharge");
    expect(titles).toContain("Campus Gym Membership");

    const totalMinor = commitments.reduce((s, c) => s + c.amountMinor, 0);
    expect(totalMinor).toBe(600000); // ₹6,000.00
  });

  it("supports adding a new fixed commitment and returns it with generated id", async () => {
    const added = await repo.addFixedCommitment({
      title: "Laundry & Ironing Service",
      amountMinor: 50000, // ₹500.00
    });

    expect(added.id).toBeDefined();
    expect(added.title).toBe("Laundry & Ironing Service");
    expect(added.amountMinor).toBe(50000);
    expect(added.userId).toBe("guest-sandbox-user");

    const list = await repo.getFixedCommitments();
    expect(list).toHaveLength(4);
    expect(list[0].id).toBe(added.id);
  });

  it("deletes a commitment by id without affecting other commitments", async () => {
    const listBefore = await repo.getFixedCommitments();
    const idToDelete = listBefore[0].id;

    await repo.deleteFixedCommitment(idToDelete);

    const listAfter = await repo.getFixedCommitments();
    expect(listAfter).toHaveLength(listBefore.length - 1);
    expect(listAfter.find((c) => c.id === idToDelete)).toBeUndefined();
  });

  it("resetDemo() restores original deterministic seed commitments", async () => {
    // Add a custom commitment
    await repo.addFixedCommitment({
      title: "Temporary Test Fee",
      amountMinor: 10000,
    });
    expect(await repo.getFixedCommitments()).toHaveLength(4);

    // Reset demo
    await repo.resetDemo();

    const restored = await repo.getFixedCommitments();
    expect(restored).toHaveLength(3);
    expect(restored.find((c) => c.title === "Temporary Test Fee")).toBeUndefined();
    expect(restored.reduce((s, c) => s + c.amountMinor, 0)).toBe(600000);
  });
});

describe("Phase 4A: SupabaseRepository Verification & Row Mapping", () => {
  it("maps valid fixed commitment rows correctly", () => {
    const row = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      user_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      title: "Mess & Tiffin Plan",
      amount_minor: 450000,
      created_at: "2026-11-01T00:00:00Z",
    };

    const mapped = mapFixedCommitmentRow(row);
    expect(mapped.id).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    expect(mapped.userId).toBe("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    expect(mapped.title).toBe("Mess & Tiffin Plan");
    expect(mapped.amountMinor).toBe(450000);
    expect(mapped.createdAt).toBe("2026-11-01T00:00:00Z");
  });

  it("safely maps string-coerced BIGINT from database within safe integer boundaries", () => {
    const row = {
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      user_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      title: "Mess",
      amount_minor: "600000",
      created_at: "2026-11-01T00:00:00Z",
    };

    const mapped = mapFixedCommitmentRow(row);
    expect(mapped.amountMinor).toBe(600000);
  });

  it("rejects invalid rows missing fields or with invalid UUIDs", () => {
    expect(() =>
      mapFixedCommitmentRow({
        id: "not-a-uuid",
        user_id: "u-123",
        title: "Mess",
        amount_minor: 450000,
      })
    ).toThrow();
  });

  it("rejects unsafe BIGINT exceeding Number.MAX_SAFE_INTEGER", () => {
    expect(() =>
      mapFixedCommitmentRow({
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        user_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        title: "Overflow",
        amount_minor: "9999999999999999999999",
        created_at: "2026-11-01T00:00:00Z",
      })
    ).toThrow();
  });

  it("fetches commitments ordered by created_at DESC with fixedUserId reuse", async () => {
    const mockGetUser = vi.fn();
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          user_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
          title: "Mess",
          amount_minor: 450000,
          created_at: "2026-11-02T00:00:00Z",
        },
      ],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    const mockClient = {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient, "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    const result = await repo.getFixedCommitments();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Mess");
    expect(mockGetUser).not.toHaveBeenCalled(); // fixedUserId reused
    expect(mockFrom).toHaveBeenCalledWith("fixed_commitments");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("inserts commitment deriving user_id from verified identity", async () => {
    let insertedPayload: unknown = null;
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        user_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        title: "Wi-Fi",
        amount_minor: 80000,
        created_at: "2026-11-01T00:00:00Z",
      },
      error: null,
    });
    const mockInsert = vi.fn().mockImplementation((payload) => {
      insertedPayload = payload;
      return { select: () => ({ single: mockSingle }) };
    });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

    const mockClient = {
      from: mockFrom,
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient, "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    const result = await repo.addFixedCommitment({
      title: "Wi-Fi",
      amountMinor: 80000,
    });

    expect(result.title).toBe("Wi-Fi");
    expect(insertedPayload).toEqual({
      user_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      title: "Wi-Fi",
      amount_minor: 80000,
    });
  });

  it("deletes commitment filtering by both id and user_id", async () => {
    const mockEq2 = vi.fn().mockResolvedValue({ error: null });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ delete: mockDelete });

    const mockClient = {
      from: mockFrom,
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient, "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    await repo.deleteFixedCommitment("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");

    expect(mockFrom).toHaveBeenCalledWith("fixed_commitments");
    expect(mockEq1).toHaveBeenCalledWith("id", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    expect(mockEq2).toHaveBeenCalledWith("user_id", "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
  });

  it("sanitizes database error messages on failure", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: "42P01",
              message: 'relation "public.fixed_commitments" does not exist',
            },
          }),
        }),
      }),
    });

    const mockClient = {
      from: mockFrom,
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient, "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    await expect(repo.getFixedCommitments()).rejects.toThrow(
      "Unable to fetch fixed commitments. Please try again."
    );
  });
});

describe("Phase 4A: Zod Validation & Identity-Scoped Query Keys", () => {
  it("validates createFixedCommitmentSchema with proper boundaries", () => {
    expect(() =>
      createFixedCommitmentSchema.parse({
        title: "",
        amountMinor: 5000,
      })
    ).toThrow();

    expect(() =>
      createFixedCommitmentSchema.parse({
        title: "Valid",
        amountMinor: 0,
      })
    ).toThrow();

    expect(() =>
      createFixedCommitmentSchema.parse({
        title: "Valid",
        amountMinor: -100,
      })
    ).toThrow();

    expect(() =>
      createFixedCommitmentSchema.parse({
        title: "Valid",
        amountMinor: 50.5,
      })
    ).toThrow();

    const valid = createFixedCommitmentSchema.parse({
      title: "  Mess Fee  ",
      amountMinor: 450000,
    });
    expect(valid.title).toBe("Mess Fee"); // Trimmed
    expect(valid.amountMinor).toBe(450000);
  });

  it("scopes queryKeys.fixedCommitments by identity mode and user ID", () => {
    const guestKey = queryKeys.fixedCommitments({
      mode: "guest",
      userId: "guest-sandbox-user",
    });
    expect(guestKey).toEqual(["fixed-commitments", "guest", "guest-sandbox-user"]);

    const authKey = queryKeys.fixedCommitments({
      mode: "authenticated",
      userId: "u-auth-123",
    });
    expect(authKey).toEqual(["fixed-commitments", "authenticated", "u-auth-123"]);

    const noneKey = queryKeys.fixedCommitments({
      mode: "none",
      userId: null,
    });
    expect(noneKey).toEqual(["fixed-commitments", "none", null]);
  });
});

describe("Phase 4A: Mandatory Financial Consistency Regression Test (Section 13.5)", () => {
  it("guarantees mathematical identity between Runway Safe-to-Spend and Quick-Log preview", () => {
    const profile: UserProfile = {
      userId: "u-consistency-1",
      currency: "INR",
      monthlyBudgetMinor: 2500000, // ₹25,000.00
      selfInvestTargetMinor: 500000, // ₹5,000.00
      hourlyRateMinor: 25000, // ₹250.00/hr
      createdAt: "2026-11-01T00:00:00Z",
    };

    const refDate = new Date("2026-11-10T14:30:00Z");
    const tz = "UTC";
    const totalFixedMinor = 600000; // ₹6,000.00

    const transactions: Transaction[] = [
      {
        id: "tx-c1",
        userId: profile.userId,
        amountMinor: 80000, // ₹800.00
        note: "Supplies",
        triggerTag: "need",
        paymentMode: "cashless",
        loggedAt: "2026-11-03T10:00:00Z",
        createdAt: "2026-11-03T10:00:00Z",
      },
    ];

    // Authoritative calculation on /runway
    const runway = calculateDailyRunway(
      profile,
      transactions,
      refDate,
      tz,
      totalFixedMinor
    );

    // Pre-log preview on /log with 0 amount (before proposed expense is entered)
    const previewZero = buildRunwayPreview(
      profile,
      transactions,
      0,
      "need",
      refDate,
      tz,
      totalFixedMinor
    );

    // Mathematical equivalence check
    expect(previewZero.current.safeToSpendTodayMinor).toBe(runway.safeToSpendTodayMinor);
    expect(previewZero.current.consumptionBudgetMinor).toBe(runway.consumptionBudgetMinor);
    expect(previewZero.current.remainingConsumptionMinor).toBe(runway.remainingConsumptionMinor);
    expect(previewZero.current.fixedCommitmentsMinor).toBe(runway.fixedCommitmentsMinor);

    // Now propose a 500 INR consumption expense
    const proposedMinor = 50000;
    const previewProposed = buildRunwayPreview(
      profile,
      transactions,
      proposedMinor,
      "convenience",
      refDate,
      tz,
      totalFixedMinor
    );

    // Baseline current must still match runway exactly
    expect(previewProposed.current.safeToSpendTodayMinor).toBe(runway.safeToSpendTodayMinor);
    expect(previewProposed.current.consumptionBudgetMinor).toBe(runway.consumptionBudgetMinor);

    // Projected must deduct from remaining consumption
    expect(previewProposed.projected.remainingConsumptionMinor).toBe(
      runway.remainingConsumptionMinor - proposedMinor
    );
    expect(previewProposed.remainingConsumptionDeltaMinor).toBe(-proposedMinor);

    // Safe to spend delta must reflect the division over remaining days
    const expectedNewSafe = Math.round(
      (runway.remainingConsumptionMinor - proposedMinor) / runway.daysRemainingInMonth
    );
    expect(previewProposed.projected.safeToSpendTodayMinor).toBe(expectedNewSafe);
    expect(previewProposed.safeToSpendDeltaMinor).toBe(expectedNewSafe - runway.safeToSpendTodayMinor);
  });
});
