import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyDojoLevelCompletion, getLevelStatus } from "@/domain/dojo-engine";
import { GuestSandboxRepository } from "@/repositories/guest-sandbox.repository";

describe("StopBucks Guest Sandbox Repository", () => {
  let repo: GuestSandboxRepository;

  beforeEach(() => {
    repo = new GuestSandboxRepository();
  });

  it("identifies as guest repository", () => {
    expect(repo.isGuest).toBe(true);
  });

  it("initializes with realistic seed profile", async () => {
    const profile = await repo.getProfile();
    expect(profile).not.toBeNull();
    expect(profile?.userId).toBe("guest-sandbox-user");
    expect(profile?.currency).toBe("INR");
    expect(profile?.monthlyBudgetMinor).toBe(2000000);
    expect(profile?.hourlyRateMinor).toBe(20000);
  });

  it("initializes with 30-day seed transactions", async () => {
    const txs = await repo.getTransactions();
    expect(txs.length).toBeGreaterThanOrEqual(20);

    // Verify all 5 trigger tags exist in seed data
    const tags = new Set(txs.map((t) => t.triggerTag));
    expect(tags.has("need")).toBe(true);
    expect(tags.has("convenience")).toBe(true);
    expect(tags.has("stress_late_night")).toBe(true);
    expect(tags.has("social_fomo")).toBe(true);
    expect(tags.has("invest_self")).toBe(true);

    // Verify both cash and cashless payment modes exist
    const modes = new Set(txs.map((t) => t.paymentMode));
    expect(modes.has("cash")).toBe(true);
    expect(modes.has("cashless")).toBe(true);
  });

  it("initializes with 2 rescued vault items and 1 cooling vault item", async () => {
    const vaultItems = await repo.getVaultItems();
    expect(vaultItems).toHaveLength(3);

    const cooling = vaultItems.filter((v) => v.status === "cooling");
    const rescued = vaultItems.filter((v) => v.status === "rescued");

    expect(cooling).toHaveLength(1);
    expect(rescued).toHaveLength(2);
  });

  it("supports adding and updating transactions during guest session", async () => {
    const initialTxs = await repo.getTransactions();
    const countBefore = initialTxs.length;

    const added = await repo.addTransaction({
      amountMinor: 15000,
      note: "Library coffee",
      triggerTag: "convenience",
      paymentMode: "cashless",
    });

    expect(added.id).toBeDefined();
    expect(added.amountMinor).toBe(15000);

    const afterAdd = await repo.getTransactions();
    expect(afterAdd.length).toBe(countBefore + 1);

    const updated = await repo.updateTransaction(added.id, {
      note: "Library coffee with snack",
      amountMinor: 20000,
    });

    expect(updated.note).toBe("Library coffee with snack");
    expect(updated.amountMinor).toBe(20000);

    await repo.deleteTransaction(added.id);
    const afterDelete = await repo.getTransactions();
    expect(afterDelete.length).toBe(countBefore);
  });

  it("supports adding and resolving cool-off vault items", async () => {
    const item = await repo.addVaultItem({
      itemName: "Noise Cancelling Headphones",
      priceMinor: 499900,
      triggerTag: "convenience",
    });

    expect(item.status).toBe("cooling");
    expect(item.unlockAt).toBeDefined();

    await repo.simulateVaultUnlock(item.id);

    const resolved = await repo.resolveVaultItem(item.id, {
      status: "rescued",
    });

    expect(resolved.status).toBe("rescued");
    expect(resolved.resolvedAt).toBeDefined();
  });

  it("resets demo to pristine seed dataset cleanly", async () => {
    // Add custom mutation
    await repo.addTransaction({
      amountMinor: 999999,
      note: "Huge outlier test transaction",
      triggerTag: "social_fomo",
      paymentMode: "cashless",
    });

    // Reset demo
    await repo.resetDemo();

    const txs = await repo.getTransactions();
    const outlier = txs.find((t) => t.note === "Huge outlier test transaction");
    expect(outlier).toBeUndefined();

    const profile = await repo.getProfile();
    expect(profile?.monthlyBudgetMinor).toBe(2000000);
  });
});

describe("Phase 5A: Guest Sandbox Dojo Progression Persistence", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("seeds Level 1 mastered (120 XP, planners_shield) with Level 2 immediately unlocked", async () => {
    const repo = new GuestSandboxRepository("UTC");
    const progress = await repo.getDojoProgress();

    expect(progress.totalXp).toBe(120);
    expect(progress.currentStreak).toBe(1);
    expect(progress.longestStreak).toBe(1);
    expect(progress.unlockedBadges).toEqual(["planners_shield"]);
    expect(progress.completedLevels).toHaveLength(1);
    expect(progress.completedLevels[0].levelId).toBe(1);
    expect(progress.completedLevels[0].bestAccuracyPct).toBe(100);
    expect(progress.completedLevels[0].replayCount).toBe(0);

    expect(getLevelStatus(1, progress)).toBe("completed");
    expect(getLevelStatus(2, progress)).toBe("active");
    expect(getLevelStatus(3, progress)).toBe("locked");
  });

  it("persists Dojo progress across repository reconstruction without reseeding XP", async () => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    };

    const firstRepo = new GuestSandboxRepository("UTC");
    const seeded = await firstRepo.getDojoProgress();
    const afterLevel2 = applyDojoLevelCompletion(seeded, {
      levelId: 2,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: seeded.lastCompletedDate ?? "2026-11-25",
      nowIso: "2026-11-25T12:00:00.000Z",
    }).nextProgress;

    await firstRepo.saveDojoProgress(afterLevel2);

    // Reconstruct repository in the same browser session
    const secondRepo = new GuestSandboxRepository("UTC");
    const restored = await secondRepo.getDojoProgress();

    expect(restored.totalXp).toBe(255); // 120 + 110 + 25 (never double-seeded!)
    expect(restored.completedLevels).toHaveLength(2);
    expect(restored.unlockedBadges).toEqual(["planners_shield", "pain_master"]);
    expect(getLevelStatus(3, restored)).toBe("active");

    // Financial seed remains intact and resetDemo restores Level 1 Dojo seed cleanly
    await secondRepo.resetDemo();
    const afterReset = await secondRepo.getDojoProgress();
    expect(afterReset.totalXp).toBe(120);
    expect(afterReset.completedLevels).toHaveLength(1);
    expect(afterReset.unlockedBadges).toEqual(["planners_shield"]);
    expect((await secondRepo.getProfile())?.monthlyBudgetMinor).toBe(2000000);
  });

  it("preserves Dojo progress when resolving a Vault purchase", async () => {
    const repo = new GuestSandboxRepository("UTC");
    const seeded = await repo.getDojoProgress();
    const updated = applyDojoLevelCompletion(seeded, {
      levelId: 2,
      correctCount: 3,
      totalQuestions: 3,
      localDateKey: seeded.lastCompletedDate ?? "2026-11-25",
      nowIso: "2026-11-25T12:00:00.000Z",
    }).nextProgress;
    await repo.saveDojoProgress(updated);

    const item = await repo.addVaultItem({
      itemName: "Dojo Vault Check",
      priceMinor: 50000,
      triggerTag: "convenience",
      unlockAt: new Date(Date.now() - 60_000).toISOString(),
    });
    await repo.resolveVaultPurchase(item.id);

    const afterPurchase = await repo.getDojoProgress();
    expect(afterPurchase.totalXp).toBe(255);
    expect(afterPurchase.completedLevels).toHaveLength(2);
  });

  it("hydrates legacy v1 guest sessionStorage payloads missing dojoProgress once without erasing financial state", async () => {
    const legacyRepo = new GuestSandboxRepository("UTC");
    const legacyProfile = await legacyRepo.getProfile();
    const legacyTxs = await legacyRepo.getTransactions();

    const store = new Map<string, string>();
    store.set(
      "stopbucks_guest_sandbox_v1",
      JSON.stringify({
        version: 1,
        state: {
          profile: legacyProfile,
          transactions: legacyTxs,
          vaultItems: [],
          fixedCommitments: [],
        },
        weeklyNudges: {},
      })
    );

    (globalThis as { window?: unknown }).window = {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    };

    const hydratedRepo = new GuestSandboxRepository("UTC");
    const progress = await hydratedRepo.getDojoProgress();
    expect(progress.totalXp).toBe(120);
    expect(progress.completedLevels).toHaveLength(1);
    expect((await hydratedRepo.getTransactions()).length).toBe(legacyTxs.length);
  });
});

