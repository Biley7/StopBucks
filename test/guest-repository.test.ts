import { beforeEach, describe, expect, it } from "vitest";
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

