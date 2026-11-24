import { describe, expect, it } from "vitest";
import {
  buildTransactionsCsv,
  buildTransactionsCsvFilename,
} from "@/lib/csv";
import type { Transaction } from "@/domain/types";

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    userId: "u1",
    amountMinor: 250050,
    note: "Campus stationery",
    triggerTag: "need",
    paymentMode: "cash",
    loggedAt: "2026-11-22T09:15:30.000Z",
    createdAt: "2026-11-22T09:15:30.000Z",
    ...overrides,
  };
}

describe("CSV export", () => {
  it("writes the documented header row", () => {
    const csv = buildTransactionsCsv([], "INR");
    expect(csv.split("\r\n")[0]).toBe(
      "Date (UTC),Time (UTC),Description,Amount,Currency,Trigger,Payment Mode"
    );
  });

  it("exports original currency amounts, not display-mode conversions", () => {
    const csv = buildTransactionsCsv([makeTx()], "INR");
    const row = csv.split("\r\n")[1];
    expect(row).toContain("2026-11-22");
    expect(row).toContain("09:15:30");
    expect(row).toContain("2500.50");
    expect(row).toContain("INR");
    expect(row).toContain("need");
    expect(row).toContain("cash");
  });

  it("escapes commas, quotes and newlines", () => {
    const csv = buildTransactionsCsv(
      [makeTx({ note: 'Chai, biscuits and "study" snacks\nlate night' })],
      "INR"
    );
    expect(csv).toContain('"Chai, biscuits and ""study"" snacks\nlate night"');
  });

  it("falls back to a placeholder for an empty description", () => {
    const csv = buildTransactionsCsv([makeTx({ note: "" })], "HKD");
    expect(csv).toContain("Untitled expense");
    expect(csv).toContain("HKD");
  });

  it("produces one row per transaction", () => {
    const rows = buildTransactionsCsv(
      [makeTx({ id: "a" }), makeTx({ id: "b" })],
      "INR"
    ).split("\r\n");
    expect(rows).toHaveLength(3);
  });

  it("uses a dated, .csv filename", () => {
    const filename = buildTransactionsCsvFilename(new Date(Date.UTC(2026, 10, 22)));
    expect(filename).toBe("stopbucks-transactions-2026-11-22.csv");
  });
});
