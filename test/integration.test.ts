import { beforeEach, describe, expect, it } from "vitest";
import { GuestSandboxRepository } from "@/repositories/guest-sandbox.repository";
import { analyzeBiases, calculateDailyRunway } from "@/domain/behavioral-engine";
import { buildTriggerBreakdown, calculateMoneyRescuedMinor } from "@/domain/runway-insights";
import type { UserProfile } from "@/domain/types";

const PAST_ISO = new Date(Date.now() - 60_000).toISOString();

async function loadProfile(repo: GuestSandboxRepository): Promise<UserProfile> {
  const profile = await repo.getProfile();
  if (!profile) throw new Error("Guest profile missing");
  return profile;
}

describe("Cross-view integration (Guest Sandbox)", () => {
  let repo: GuestSandboxRepository;

  beforeEach(() => {
    repo = new GuestSandboxRepository();
  });

  it("logging a consumption expense updates the ledger and the runway", async () => {
    const profile = await loadProfile(repo);
    const transactionsBefore = await repo.getTransactions();
    const runwayBefore = calculateDailyRunway(profile, transactionsBefore);

    await repo.addTransaction({
      amountMinor: 100000,
      note: "Integration dinner",
      triggerTag: "need",
      paymentMode: "cashless",
    });

    const transactionsAfter = await repo.getTransactions();
    expect(transactionsAfter.length).toBe(transactionsBefore.length + 1);
    expect(transactionsAfter[0].note).toBe("Integration dinner");

    const runwayAfter = calculateDailyRunway(profile, transactionsAfter);
    expect(runwayAfter.monthToDateConsumptionMinor).toBe(
      runwayBefore.monthToDateConsumptionMinor + 100000
    );
    expect(runwayAfter.remainingConsumptionMinor).toBeLessThan(
      runwayBefore.remainingConsumptionMinor
    );
  });

  it("logging an invest_self expense never reduces the consumption runway", async () => {
    const profile = await loadProfile(repo);
    const transactionsBefore = await repo.getTransactions();
    const runwayBefore = calculateDailyRunway(profile, transactionsBefore);

    await repo.addTransaction({
      amountMinor: 150000,
      note: "React mastery course",
      triggerTag: "invest_self",
      paymentMode: "cashless",
    });

    const runwayAfter = calculateDailyRunway(profile, await repo.getTransactions());
    expect(runwayAfter.consumptionBudgetMinor).toBe(runwayBefore.consumptionBudgetMinor);
    expect(runwayAfter.remainingConsumptionMinor).toBe(runwayBefore.remainingConsumptionMinor);
    expect(runwayAfter.safeToSpendTodayMinor).toBe(runwayBefore.safeToSpendTodayMinor);
    expect(runwayAfter.monthToDateSelfInvestMinor).toBe(
      runwayBefore.monthToDateSelfInvestMinor + 150000
    );
  });

  it("deleting an expense restores dependent metrics", async () => {
    const profile = await loadProfile(repo);
    const baseline = calculateDailyRunway(profile, await repo.getTransactions());

    const created = await repo.addTransaction({
      amountMinor: 75000,
      note: "Temporary expense",
      triggerTag: "convenience",
      paymentMode: "cashless",
    });

    const withExpense = calculateDailyRunway(profile, await repo.getTransactions());
    expect(withExpense.remainingConsumptionMinor).toBeLessThan(
      baseline.remainingConsumptionMinor
    );

    await repo.deleteTransaction(created.id);

    const restored = calculateDailyRunway(profile, await repo.getTransactions());
    expect(restored.remainingConsumptionMinor).toBe(baseline.remainingConsumptionMinor);
    expect(restored.monthToDateConsumptionMinor).toBe(baseline.monthToDateConsumptionMinor);
  });

  it("resolving a vault purchase creates exactly one transaction that reaches the runway", async () => {
    const profile = await loadProfile(repo);
    const item = await repo.addVaultItem({
      itemName: "Integration impulse",
      priceMinor: 88000,
      triggerTag: "need",
      unlockAt: PAST_ISO,
    });

    const before = calculateDailyRunway(profile, await repo.getTransactions());
    const txCountBefore = (await repo.getTransactions()).length;

    await repo.resolveVaultPurchase(item.id);
    const after = calculateDailyRunway(profile, await repo.getTransactions());

    const txs = await repo.getTransactions();
    expect(txs.length).toBe(txCountBefore + 1);
    expect(txs.filter((tx) => tx.note === "Integration impulse")).toHaveLength(1);
    expect(after.monthToDateConsumptionMinor).toBe(
      before.monthToDateConsumptionMinor + 88000
    );
  });

  it("rescuing a vault item increases Money Rescued without touching spending", async () => {
    const profile = await loadProfile(repo);
    const item = await repo.addVaultItem({
      itemName: "Rescued impulse",
      priceMinor: 66000,
      triggerTag: "social_fomo",
      unlockAt: PAST_ISO,
    });

    const before = calculateDailyRunway(profile, await repo.getTransactions());
    const rescuedBefore = calculateMoneyRescuedMinor(await repo.getVaultItems());
    const txCountBefore = (await repo.getTransactions()).length;

    await repo.resolveVaultItem(item.id, { status: "rescued" });

    const after = calculateDailyRunway(profile, await repo.getTransactions());
    expect(after.monthToDateConsumptionMinor).toBe(before.monthToDateConsumptionMinor);
    expect((await repo.getTransactions()).length).toBe(txCountBefore);
    expect(calculateMoneyRescuedMinor(await repo.getVaultItems())).toBe(
      rescuedBefore + 66000
    );
  });

  it("reflects a new expense in the trigger breakdown and bias analysis", async () => {
    const profile = await loadProfile(repo);
    const txsBefore = await repo.getTransactions();

    const fomoBefore = buildTriggerBreakdown(txsBefore).find(
      (entry) => entry.trigger === "social_fomo"
    )!;
    const biasBefore = analyzeBiases(profile, txsBefore, "UTC");

    await repo.addTransaction({
      amountMinor: 90000,
      note: "Late night party",
      triggerTag: "social_fomo",
      paymentMode: "cashless",
    });

    const txsAfter = await repo.getTransactions();
    const fomoAfter = buildTriggerBreakdown(txsAfter).find(
      (entry) => entry.trigger === "social_fomo"
    )!;
    const biasAfter = analyzeBiases(profile, txsAfter, "UTC");

    expect(fomoAfter.count).toBe(fomoBefore.count + 1);
    expect(fomoAfter.totalMinor).toBe(fomoBefore.totalMinor + 90000);
    expect(biasAfter.socialFomo.count).toBe(biasBefore.socialFomo.count + 1);
  });

  it("keeps separate guest repository instances isolated", async () => {
    const other = new GuestSandboxRepository();

    await repo.addTransaction({
      amountMinor: 4200,
      note: "Only in repo A",
      triggerTag: "convenience",
      paymentMode: "cashless",
    });

    const otherTransactions = await other.getTransactions();
    expect(otherTransactions.some((tx) => tx.note === "Only in repo A")).toBe(false);

    const otherProfile = await other.getProfile();
    expect(otherProfile?.userId).toBe("guest-sandbox-user");
    expect(repo.isGuest).toBe(true);
    expect(other.isGuest).toBe(true);
  });

  it("reset demo clears a vault purchase and its transaction together", async () => {
    const item = await repo.addVaultItem({
      itemName: "Reset me",
      priceMinor: 30000,
      triggerTag: "need",
      unlockAt: PAST_ISO,
    });
    await repo.resolveVaultPurchase(item.id);

    await repo.resetDemo();

    const items = await repo.getVaultItems();
    expect(items.some((entry) => entry.itemName === "Reset me")).toBe(false);
    const txs = await repo.getTransactions();
    expect(txs.some((tx) => tx.note === "Reset me")).toBe(false);
  });
});
