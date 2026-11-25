import { describe, expect, it, beforeEach } from "vitest";
import { updateTransactionInputSchema } from "@/lib/schemas";
import { GuestSandboxRepository } from "@/repositories/guest-sandbox.repository";

describe("Phase 4C: Transaction Updates & Validation", () => {
  describe("updateTransactionInputSchema", () => {
    it("accepts valid transaction updates with positive integer amount", () => {
      const valid = updateTransactionInputSchema.safeParse({
        amountMinor: 15000,
        note: "Late-night snack updated",
        triggerTag: "stress_late_night",
        paymentMode: "cashless",
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.amountMinor).toBe(15000);
        expect(valid.data.note).toBe("Late-night snack updated");
        expect(valid.data.triggerTag).toBe("stress_late_night");
        expect(valid.data.paymentMode).toBe("cashless");
      }
    });

    it("rejects non-positive, zero, or floating-point amounts", () => {
      expect(
        updateTransactionInputSchema.safeParse({
          amountMinor: -100,
        }).success
      ).toBe(false);

      expect(
        updateTransactionInputSchema.safeParse({
          amountMinor: 0,
        }).success
      ).toBe(false);

      expect(
        updateTransactionInputSchema.safeParse({
          amountMinor: 12.34,
        }).success
      ).toBe(false);
    });

    it("rejects empty description or invalid trigger tags", () => {
      expect(
        updateTransactionInputSchema.safeParse({
          note: "",
        }).success
      ).toBe(false);

      expect(
        updateTransactionInputSchema.safeParse({
          triggerTag: "invalid_trigger",
        }).success
      ).toBe(false);
    });
  });

  describe("GuestSandboxRepository.updateTransaction", () => {
    let repo: GuestSandboxRepository;

    beforeEach(() => {
      repo = new GuestSandboxRepository();
    });

    it("updates an existing transaction successfully", async () => {
      const created = await repo.addTransaction({
        amountMinor: 10000,
        note: "Initial lunch",
        triggerTag: "need",
        paymentMode: "cash",
      });

      const updated = await repo.updateTransaction(created.id, {
        amountMinor: 12000,
        note: "Buffet lunch",
        triggerTag: "convenience",
        paymentMode: "cashless",
      });

      expect(updated.id).toBe(created.id);
      expect(updated.amountMinor).toBe(12000);
      expect(updated.note).toBe("Buffet lunch");
      expect(updated.triggerTag).toBe("convenience");
      expect(updated.paymentMode).toBe("cashless");

      // Verify persistence across repository reads
      const all = await repo.getTransactions();
      const match = all.find((t) => t.id === created.id);
      expect(match?.amountMinor).toBe(12000);
      expect(match?.note).toBe("Buffet lunch");
    });

    it("throws an error when updating a non-existent transaction", async () => {
      await expect(
        repo.updateTransaction("non-existent-id", {
          amountMinor: 5000,
        })
      ).rejects.toThrow('Transaction with id "non-existent-id" not found.');
    });
  });
});
