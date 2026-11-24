import { beforeEach, describe, expect, it } from "vitest";
import { GuestSandboxRepository } from "@/repositories/guest-sandbox.repository";
import { calculateMoneyRescuedMinor } from "@/domain/runway-insights";

const PAST_ISO = new Date(Date.now() - 60_000).toISOString();
const FUTURE_ISO = new Date(Date.now() + 60 * 60 * 1000).toISOString();

describe("StopBucks Vault Resolution — Guest Sandbox", () => {
  let repo: GuestSandboxRepository;

  beforeEach(() => {
    repo = new GuestSandboxRepository();
  });

  it("Skipped It: rescues the item without creating a transaction", async () => {
    const item = await repo.addVaultItem({
      itemName: "Mechanical keyboard",
      priceMinor: 250000,
      triggerTag: "convenience",
      unlockAt: PAST_ISO,
    });

    const rescuedBefore = calculateMoneyRescuedMinor(await repo.getVaultItems());
    const txBefore = (await repo.getTransactions()).length;

    const resolved = await repo.resolveVaultItem(item.id, { status: "rescued" });

    expect(resolved.status).toBe("rescued");
    expect(resolved.resolvedAt).not.toBeNull();

    const items = await repo.getVaultItems();
    expect(calculateMoneyRescuedMinor(items)).toBe(rescuedBefore + 250000);
    expect((await repo.getTransactions()).length).toBe(txBefore);
  });

  it("Still Bought It: creates exactly one transaction with the original price and trigger", async () => {
    const item = await repo.addVaultItem({
      itemName: "Noise-cancelling earbuds",
      priceMinor: 279900,
      triggerTag: "stress_late_night",
      unlockAt: PAST_ISO,
    });

    const txBefore = (await repo.getTransactions()).length;

    const result = await repo.resolveVaultPurchase(item.id);

    expect(result.item.status).toBe("purchased");
    expect(result.item.resolvedAt).not.toBeNull();
    expect(result.item.priceMinor).toBe(279900);
    expect(result.item.triggerTag).toBe("stress_late_night");

    expect(result.transaction.amountMinor).toBe(279900);
    expect(result.transaction.triggerTag).toBe("stress_late_night");
    expect(result.transaction.paymentMode).toBe("cashless");
    expect(result.transaction.note).toBe("Noise-cancelling earbuds");

    const txs = await repo.getTransactions();
    expect(txs.length).toBe(txBefore + 1);
    expect(txs.filter((tx) => tx.id === result.transaction.id)).toHaveLength(1);
  });

  it("rejects repeated purchase attempts (double-click safe)", async () => {
    const item = await repo.addVaultItem({
      itemName: "Festival ticket",
      priceMinor: 50000,
      triggerTag: "social_fomo",
      unlockAt: PAST_ISO,
    });

    await repo.resolveVaultPurchase(item.id);

    await expect(repo.resolveVaultPurchase(item.id)).rejects.toThrow(/already resolved/i);

    const txs = await repo.getTransactions();
    expect(txs.filter((tx) => tx.note === "Festival ticket")).toHaveLength(1);
  });

  it("rejects an unknown vault item", async () => {
    await expect(repo.resolveVaultPurchase("does-not-exist")).rejects.toThrow(/not found/i);
    await expect(
      repo.resolveVaultItem("does-not-exist", { status: "rescued" })
    ).rejects.toThrow(/not found/i);
  });

  it("rejects an already-resolved item", async () => {
    const item = await repo.addVaultItem({
      itemName: "Impulse jacket",
      priceMinor: 300000,
      triggerTag: "social_fomo",
      unlockAt: PAST_ISO,
    });

    await repo.resolveVaultItem(item.id, { status: "rescued" });

    await expect(repo.resolveVaultPurchase(item.id)).rejects.toThrow(/already resolved/i);
    await expect(
      repo.resolveVaultItem(item.id, { status: "rescued" })
    ).rejects.toThrow(/already resolved/i);
  });

  it("rejects purchase while the item is still cooling", async () => {
    const item = await repo.addVaultItem({
      itemName: "Still cooling",
      priceMinor: 100000,
      triggerTag: "convenience",
      unlockAt: FUTURE_ISO,
    });

    await expect(repo.resolveVaultPurchase(item.id)).rejects.toThrow(/still cooling/i);
  });

  it("rejects rescue while the item is still cooling", async () => {
    const item = await repo.addVaultItem({
      itemName: "Still cooling rescue", priceMinor: 100000, triggerTag: "convenience", unlockAt: FUTURE_ISO,
    });
    await expect(repo.resolveVaultItem(item.id, { status: "rescued" })).rejects.toThrow(/still cooling/i);
    expect((await repo.getVaultItems()).find((entry) => entry.id === item.id)?.status).toBe("cooling");
  });

  it("never routes purchased status through resolveVaultItem", async () => {
    const item = await repo.addVaultItem({
      itemName: "Book",
      priceMinor: 90000,
      triggerTag: "invest_self",
      unlockAt: PAST_ISO,
    });

    await expect(
      repo.resolveVaultItem(item.id, { status: "purchased" })
    ).rejects.toThrow(/resolveVaultPurchase/i);
  });

  it("leaves both records untouched when persistence fails", async () => {
    const item = await repo.addVaultItem({
      itemName: "Fragile transition",
      priceMinor: 120000,
      triggerTag: "need",
      unlockAt: PAST_ISO,
    });

    const txBefore = (await repo.getTransactions()).length;
    const target = repo as unknown as { saveToStorage: (payload: unknown) => void };
    const original = target.saveToStorage;
    target.saveToStorage = () => {
      throw new Error("storage failure");
    };

    try {
      await expect(repo.resolveVaultPurchase(item.id)).rejects.toThrow(/storage failure/i);
    } finally {
      target.saveToStorage = original;
    }

    const items = await repo.getVaultItems();
    const stored = items.find((entry) => entry.id === item.id);
    expect(stored?.status).toBe("cooling");
    expect((await repo.getTransactions()).length).toBe(txBefore);
  });

  it("Simulate 48h Elapsed unlocks the guest demo item", async () => {
    const item = await repo.addVaultItem({
      itemName: "Demo headphones",
      priceMinor: 199900,
      triggerTag: "convenience",
      unlockAt: FUTURE_ISO,
    });

    const unlocked = await repo.simulateVaultUnlock(item.id);
    expect(new Date(unlocked.unlockAt).getTime()).toBeLessThanOrEqual(Date.now());

    // No system clock change: the item is still cooling until unlock time passes.
    expect(unlocked.status).toBe("cooling");

    const result = await repo.resolveVaultPurchase(item.id);
    expect(result.item.status).toBe("purchased");
  });

  it("counts only rescued items toward Money Rescued", async () => {
    const rescued = await repo.addVaultItem({
      itemName: "Rescued item",
      priceMinor: 11100,
      triggerTag: "convenience",
      unlockAt: PAST_ISO,
    });
    const purchased = await repo.addVaultItem({
      itemName: "Purchased item",
      priceMinor: 22200,
      triggerTag: "need",
      unlockAt: PAST_ISO,
    });

    await repo.resolveVaultItem(rescued.id, { status: "rescued" });
    await repo.resolveVaultPurchase(purchased.id);

    const items = await repo.getVaultItems();
    const total = calculateMoneyRescuedMinor(items);
    const rescuedOnly = items
      .filter((entry) => entry.status === "rescued")
      .reduce((sum, entry) => sum + entry.priceMinor, 0);

    expect(total).toBe(rescuedOnly);
    expect(items.find((entry) => entry.id === purchased.id)?.status).toBe("purchased");
  });
});
