import { describe, expect, it } from "vitest";
import { getQuickLogPresets } from "@/domain/quick-log-presets";

describe("Phase 4C: 1-Tap Student Quick Presets", () => {
  it("returns exactly 5 presets for INR with positive integer minor units", () => {
    const presets = getQuickLogPresets("INR");
    expect(presets).toHaveLength(5);

    for (const preset of presets) {
      expect(preset.amountMinor).toBeGreaterThan(0);
      expect(Number.isSafeInteger(preset.amountMinor)).toBe(true);
      expect(preset.emoji).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.note).toBeTruthy();
      expect(["cash", "cashless"]).toContain(preset.paymentMode);
      expect([
        "need",
        "convenience",
        "stress_late_night",
        "social_fomo",
        "invest_self",
      ]).toContain(preset.triggerTag);
    }

    const canteen = presets.find((p) => p.id === "preset-canteen");
    expect(canteen?.amountMinor).toBe(8000); // ₹80.00
    expect(canteen?.triggerTag).toBe("need");

    const course = presets.find((p) => p.id === "preset-course");
    expect(course?.amountMinor).toBe(50000); // ₹500.00
    expect(course?.triggerTag).toBe("invest_self");
  });

  it("returns exactly 5 presets for HKD with positive integer minor units", () => {
    const presets = getQuickLogPresets("HKD");
    expect(presets).toHaveLength(5);

    for (const preset of presets) {
      expect(preset.amountMinor).toBeGreaterThan(0);
      expect(Number.isSafeInteger(preset.amountMinor)).toBe(true);
    }

    const canteen = presets.find((p) => p.id === "preset-canteen");
    expect(canteen?.amountMinor).toBe(4500); // HK$45.00
  });

  it("returns exactly 5 presets for USD with positive integer minor units", () => {
    const presets = getQuickLogPresets("USD");
    expect(presets).toHaveLength(5);

    for (const preset of presets) {
      expect(preset.amountMinor).toBeGreaterThan(0);
      expect(Number.isSafeInteger(preset.amountMinor)).toBe(true);
    }

    const canteen = presets.find((p) => p.id === "preset-canteen");
    expect(canteen?.amountMinor).toBe(800); // $8.00
  });

  it("gracefully falls back to INR for unsupported currencies", () => {
    const presets = getQuickLogPresets("EUR");
    expect(presets).toHaveLength(5);
    expect(presets[0]?.amountMinor).toBe(8000);
  });
});
