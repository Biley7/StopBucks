import { describe, expect, it, vi } from "vitest";
import { createInitialDojoProgress } from "@/domain/dojo-engine";
import {
  SupabaseRepository,
  mapDojoProgressRow,
  mapProfileRow,
  mapTransactionRow,
  mapVaultItemRow,
  mapWeeklyNudgeRow,
} from "@/repositories/supabase.repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Supabase Repository Row Mappers (DATA-002, ARCH-003)", () => {
  it("maps valid profile rows to UserProfile domain types", () => {
    const row = {
      user_id: "u-123",
      currency: "INR",
      monthly_budget_minor: 2500000,
      self_invest_target_minor: 500000,
      hourly_rate_minor: 25000,
      created_at: "2026-01-01T00:00:00Z",
    };

    const profile = mapProfileRow(row);
    expect(profile.userId).toBe("u-123");
    expect(profile.currency).toBe("INR");
    expect(profile.monthlyBudgetMinor).toBe(2500000);
    expect(profile.selfInvestTargetMinor).toBe(500000);
    expect(profile.hourlyRateMinor).toBe(25000);
  });

  it("rejects corrupted profile rows with missing or invalid fields", () => {
    expect(() =>
      mapProfileRow({
        user_id: "u-123",
        currency: "INVALID_CURRENCY",
        monthly_budget_minor: "not-a-number",
      })
    ).toThrow();
  });

  it("maps valid transaction rows to Transaction domain types", () => {
    const row = {
      id: "tx-456",
      user_id: "u-123",
      amount_minor: 18000,
      note: "Late night iced coffee",
      trigger_tag: "stress_late_night",
      payment_mode: "cashless",
      logged_at: "2026-11-20T23:30:00Z",
      created_at: "2026-11-20T23:30:05Z",
    };

    const tx = mapTransactionRow(row);
    expect(tx.id).toBe("tx-456");
    expect(tx.userId).toBe("u-123");
    expect(tx.amountMinor).toBe(18000);
    expect(tx.triggerTag).toBe("stress_late_night");
    expect(tx.paymentMode).toBe("cashless");
    expect(tx.loggedAt).toBe("2026-11-20T23:30:00Z");
  });

  it("rejects transaction rows with invalid trigger tags or payment modes", () => {
    expect(() =>
      mapTransactionRow({
        id: "tx-bad",
        user_id: "u-123",
        amount_minor: 5000,
        note: "Bad tag",
        trigger_tag: "nonexistent_trigger",
        payment_mode: "cashless",
        logged_at: "2026-11-20T23:30:00Z",
      })
    ).toThrow();
  });

  it("maps valid vault item rows to VaultItem domain types", () => {
    const row = {
      id: "vault-789",
      user_id: "u-123",
      item_name: "Mechanical Keyboard",
      price_minor: 450000,
      trigger_tag: "convenience",
      unlock_at: "2026-11-22T10:00:00Z",
      status: "cooling",
      resolved_at: null,
      created_at: "2026-11-20T10:00:00Z",
    };

    const item = mapVaultItemRow(row);
    expect(item.id).toBe("vault-789");
    expect(item.itemName).toBe("Mechanical Keyboard");
    expect(item.priceMinor).toBe(450000);
    expect(item.status).toBe("cooling");
  });

  it("maps valid weekly nudge rows to WeeklyNudge domain types", () => {
    const row = {
      id: "nudge-1",
      user_id: "u-123",
      week_key: "2026-W47",
      bias_snapshot: { overallRiskScore: 30 },
      coach_response: {
        headline: "Pause midnight food orders",
        primary_bias: "Late-Night Drift",
        three_day_experiment: "Brew herbal tea after 10 PM.",
        projected_savings_minor: 35000,
        source: "gemini",
      },
      created_at: "2026-11-20T08:00:00Z",
    };

    const nudge = mapWeeklyNudgeRow(row);
    expect(nudge.weekKey).toBe("2026-W47");
    expect(nudge.coachResponse.headline).toBe("Pause midnight food orders");
    expect(nudge.coachResponse.projected_savings_minor).toBe(35000);
  });
});

describe("SupabaseRepository (SEC-005, PERF-001, SEC-003)", () => {
  it("reuses fixedUserId without querying auth.getUser on operations (PERF-001)", async () => {
    const mockGetUser = vi.fn();
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        user_id: "fixed-u1",
        currency: "INR",
        monthly_budget_minor: 2000000,
        self_invest_target_minor: 400000,
        hourly_rate_minor: 20000,
        created_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: mockSingle,
      }),
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
    });

    const mockClient = {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient, "fixed-u1");
    const profile = await repo.getProfile();

    expect(profile?.userId).toBe("fixed-u1");
    // Verify auth.getUser was NOT called because fixedUserId was passed
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("upserts profile with onConflict: user_id to prevent duplicate collisions (SEC-005)", async () => {
    let capturedOptions: unknown = null;
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        user_id: "fixed-u1",
        currency: "INR",
        monthly_budget_minor: 2000000,
        self_invest_target_minor: 400000,
        hourly_rate_minor: 20000,
        created_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    const mockUpsert = vi.fn().mockImplementation((_payload, options) => {
      capturedOptions = options;
      return { select: () => ({ single: mockSingle }) };
    });
    const mockFrom = vi.fn().mockReturnValue({
      upsert: mockUpsert,
    });

    const mockClient = {
      from: mockFrom,
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient, "fixed-u1");
    await repo.createProfile({
      currency: "INR",
      monthlyBudgetMinor: 2000000,
      selfInvestTargetMinor: 400000,
      hourlyRateMinor: 20000,
    });

    expect(mockUpsert).toHaveBeenCalled();
    expect(capturedOptions).toEqual({ onConflict: "user_id" });
  });

  it("sanitizes database error messages without exposing Postgres internals (SEC-003)", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: "42P01",
              message: "relation \"public.profiles\" does not exist on postgres instance",
              details: "FATAL: internal schema corruption",
            },
          }),
        }),
      }),
    });

    const mockClient = {
      from: mockFrom,
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient, "fixed-u1");
    await expect(repo.getProfile()).rejects.toThrow("Unable to fetch user profile. Please try again.");
  });

  it("refuses client-side resolveVaultItem for purchased without atomic RPC", async () => {
    const mockClient = {} as unknown as SupabaseClient;
    const repo = new SupabaseRepository(mockClient, "fixed-u1");

    await expect(
      repo.resolveVaultItem("item-1", { status: "purchased" })
    ).rejects.toThrow(
      "Purchased resolutions must use resolveVaultPurchase() so the transaction stays in sync."
    );
  });
});

describe("Phase 5A: SupabaseRepository Dojo Progress & Row Validation", () => {
  const validDojoRow = {
    user_id: "u-dojo-1",
    completed_levels: [
      {
        levelId: 1,
        bestAccuracyPct: 100,
        earnedXp: 120,
        completedAt: "2026-11-25T10:00:00+00:00",
        replayCount: 0,
      },
    ],
    total_xp: 120,
    current_streak: 1,
    longest_streak: 2,
    last_completed_date: "2026-11-25",
    unlocked_badges: ["planners_shield"],
    sound_muted: false,
    updated_at: "2026-11-25T10:00:00+00:00",
  };

  it("maps valid dojo_progress rows correctly", () => {
    const mapped = mapDojoProgressRow(validDojoRow);
    expect(mapped.totalXp).toBe(120);
    expect(mapped.currentStreak).toBe(1);
    expect(mapped.longestStreak).toBe(2);
    expect(mapped.lastCompletedDate).toBe("2026-11-25");
    expect(mapped.unlockedBadges).toEqual(["planners_shield"]);
    expect(mapped.soundMuted).toBe(false);
    expect(mapped.completedLevels).toHaveLength(1);
  });

  it("rejects corrupted JSON, invalid XP, and invalid level completions", () => {
    // Non-array JSON for completed_levels
    expect(() =>
      mapDojoProgressRow({
        ...validDojoRow,
        completed_levels: "not-an-array",
      })
    ).toThrow("Invalid dojo progress data received from database.");

    // Negative / non-integer XP
    expect(() =>
      mapDojoProgressRow({
        ...validDojoRow,
        total_xp: -10,
      })
    ).toThrow();
    expect(() =>
      mapDojoProgressRow({
        ...validDojoRow,
        total_xp: 12.5,
      })
    ).toThrow();

    // Out-of-range level ID (10)
    expect(() =>
      mapDojoProgressRow({
        ...validDojoRow,
        completed_levels: [
          {
            levelId: 10,
            bestAccuracyPct: 100,
            earnedXp: 100,
            completedAt: "2026-11-25T10:00:00Z",
            replayCount: 0,
          },
        ],
      })
    ).toThrow();

    // Invalid calendar date in last_completed_date
    expect(() =>
      mapDojoProgressRow({
        ...validDojoRow,
        last_completed_date: "2026-02-31",
      })
    ).toThrow();
  });

  it("returns initial progress without writes when no dojo_progress row exists", async () => {
    const mockGetUser = vi.fn();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpsert = vi.fn();
    const mockFrom = vi.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
      upsert: mockUpsert,
    });

    const mockClient = {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient, "fixed-dojo-u1");
    const progress = await repo.getDojoProgress();

    expect(progress).toEqual(createInitialDojoProgress());
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith("dojo_progress");
  });

  it("upserts dojo progress with onConflict: user_id and returns mapped result", async () => {
    let capturedPayload: unknown = null;
    let capturedOptions: unknown = null;

    const mockSingle = vi.fn().mockResolvedValue({
      data: { ...validDojoRow, user_id: "fixed-dojo-u1" },
      error: null,
    });
    const mockUpsert = vi.fn().mockImplementation((payload, options) => {
      capturedPayload = payload;
      capturedOptions = options;
      return { select: () => ({ single: mockSingle }) };
    });

    const mockClient = {
      from: vi.fn().mockReturnValue({ upsert: mockUpsert }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient, "fixed-dojo-u1");
    const saved = await repo.saveDojoProgress({
      completedLevels: [
        {
          levelId: 1,
          bestAccuracyPct: 100,
          earnedXp: 120,
          completedAt: "2026-11-25T10:00:00+00:00",
          replayCount: 0,
        },
      ],
      totalXp: 120,
      currentStreak: 1,
      longestStreak: 2,
      lastCompletedDate: "2026-11-25",
      unlockedBadges: ["planners_shield"],
      soundMuted: false,
      updatedAt: "2026-11-25T10:00:00+00:00",
    });

    expect(capturedOptions).toEqual({ onConflict: "user_id" });
    expect(capturedPayload).toMatchObject({
      user_id: "fixed-dojo-u1",
      total_xp: 120,
      sound_muted: false,
    });
    expect(saved.totalXp).toBe(120);
  });

  it("sanitizes database failures on dojo reads and saves", async () => {
    const failingClient = {
      from: vi.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "42501", message: "permission denied for schema public" },
            }),
          }),
        }),
        upsert: () => ({
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "23514", message: "violates check constraint dojo_xp" },
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(failingClient, "fixed-dojo-u1");
    await expect(repo.getDojoProgress()).rejects.toThrow(
      "Unable to fetch dojo progress. Please try again."
    );
    await expect(
      repo.saveDojoProgress(createInitialDojoProgress())
    ).rejects.toThrow("Unable to save dojo progress. Please try again.");
  });

  it("rejects invalid Dojo progress on saveDojoProgress before calling Supabase", async () => {
    const mockFrom = vi.fn();
    const mockClient = { from: mockFrom } as unknown as SupabaseClient;
    const repo = new SupabaseRepository(mockClient, "fixed-dojo-u1");

    await expect(
      repo.saveDojoProgress({
        ...createInitialDojoProgress(),
        totalXp: -50,
      })
    ).rejects.toThrow();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
