import { describe, expect, it } from "vitest";
import {
  convertTo4YearCompounded,
  convertToWorkHours,
  formatCompoundedOpportunity,
  formatCurrency,
  formatMinorUnits,
  formatWorkHours,
  fromMinorUnits,
  toMinorUnits,
} from "@/domain/currency";

describe("StopBucks Currency Engine", () => {
  describe("toMinorUnits", () => {
    it("converts major currency to minor units accurately", () => {
      expect(toMinorUnits(250.0)).toBe(25000);
      expect(toMinorUnits(19.99)).toBe(1999);
      expect(toMinorUnits(0)).toBe(0);
      expect(toMinorUnits(1234.56)).toBe(123456);
    });

    it("throws an error for negative amounts", () => {
      expect(() => toMinorUnits(-10)).toThrow(RangeError);
      expect(() => toMinorUnits(-0.01)).toThrow(RangeError);
    });

    it("throws an error for non-finite values", () => {
      expect(() => toMinorUnits(NaN)).toThrow(TypeError);
      expect(() => toMinorUnits(Infinity)).toThrow(TypeError);
    });
  });

  describe("fromMinorUnits", () => {
    it("converts integer minor units back to major units", () => {
      expect(fromMinorUnits(25000)).toBe(250);
      expect(fromMinorUnits(1999)).toBe(19.99);
      expect(fromMinorUnits(0)).toBe(0);
    });

    it("throws an error for non-safe-integer values", () => {
      expect(() => fromMinorUnits(19.99)).toThrow(TypeError);
    });
  });

  describe("formatCurrency", () => {
    it("formats INR correctly", () => {
      const formatted = formatCurrency(25000, "INR");
      expect(formatted).toContain("₹");
      expect(formatted).toContain("250.00");
    });

    it("formats HKD correctly", () => {
      const formatted = formatCurrency(12550, "HKD");
      expect(formatted).toContain("HK$");
      expect(formatted).toContain("125.50");
    });

    it("formats USD correctly", () => {
      const formatted = formatCurrency(4500, "USD");
      expect(formatted).toContain("$");
      expect(formatted).toContain("45.00");
    });

    it("handles zero and negative amounts cleanly", () => {
      expect(formatCurrency(0, "USD")).toBe("$0.00");
      expect(formatCurrency(-5000, "USD")).toBe("-$50.00");
    });
  });

  describe("convertToWorkHours & formatWorkHours", () => {
    it("computes work hours correctly (amount_minor / hourly_rate_minor)", () => {
      // Spent ₹1,000 (100,000 paise), hourly rate ₹200 (20,000 paise) -> 5.0 hours
      const hours = convertToWorkHours(100000, 20000);
      expect(hours).toBe(5.0);
      expect(formatWorkHours(hours)).toBe("5.0 hrs of work");
    });

    it("handles fractional hours and singular hr", () => {
      // Spent ₹300, hourly rate ₹200 -> 1.5 hours
      expect(convertToWorkHours(30000, 20000)).toBe(1.5);
      expect(formatWorkHours(1.0)).toBe("1.0 hr of work");
    });

    it("handles zero or invalid hourly rate safely", () => {
      expect(convertToWorkHours(50000, 0)).toBe(0);
      expect(convertToWorkHours(50000, -100)).toBe(0);
    });
  });

  describe("convertTo4YearCompounded & formatCompoundedOpportunity", () => {
    it("compounds at 8% annually over 4 years accurately", () => {
      // Formula: Math.round(amount * (1.08)^4)
      // (1.08)^4 = 1.36048896
      // For 100,000 paise (₹1,000) -> 136,049 paise (₹1,360.49)
      const compounded = convertTo4YearCompounded(100000);
      expect(compounded).toBe(136049);
    });

    it("formats compounded opportunity cost", () => {
      const formatted = formatCompoundedOpportunity(100000, "INR");
      expect(formatted).toContain("₹1,360.49 in 4 yrs");
    });

    it("returns 0 for non-positive amounts", () => {
      expect(convertTo4YearCompounded(0)).toBe(0);
      expect(convertTo4YearCompounded(-500)).toBe(0);
    });
  });

  describe("formatMinorUnits with DisplayUnitMode", () => {
    it("formats currency mode", () => {
      expect(formatMinorUnits(25000, "INR", "currency")).toContain("₹250.00");
    });

    it("formats work_hours mode with hourly rate", () => {
      expect(formatMinorUnits(25000, "INR", "work_hours", 20000)).toBe(
        "1.3 hrs of work"
      );
    });

    it("falls back to currency mode if hourly rate is missing in work_hours mode", () => {
      expect(formatMinorUnits(25000, "INR", "work_hours", 0)).toContain("₹250.00");
    });

    it("formats compounded_4yr mode", () => {
      expect(formatMinorUnits(25000, "INR", "compounded_4yr")).toContain(
        "in 4 yrs"
      );
    });
  });
});

