import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_RATE_LIMIT_BUCKETS,
  checkRateLimit,
  getBucketCount,
  resetRateLimits,
} from "@/lib/rate-limit";

describe("Rate Limiter (SEC-001)", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests under the limit and tracks usage", () => {
    const key = "test-user-1";
    const windowMs = 60_000;
    const limit = 5;

    for (let i = 1; i <= limit; i++) {
      const result = checkRateLimit(key, limit, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - i);
    }
  });

  it("blocks requests when the limit is exceeded and provides retryAfterSeconds", () => {
    const key = "test-user-block";
    const windowMs = 60_000;
    const limit = 3;

    for (let i = 0; i < limit; i++) {
      checkRateLimit(key, limit, windowMs);
    }

    const blocked = checkRateLimit(key, limit, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("expires old timestamps outside the sliding window", () => {
    const key = "test-user-expire";
    const windowMs = 1000;
    const limit = 2;

    const baseTime = 1_000_000;
    checkRateLimit(key, limit, windowMs, baseTime);
    checkRateLimit(key, limit, windowMs, baseTime + 100);

    // At baseTime + 200, it should be blocked
    const blocked = checkRateLimit(key, limit, windowMs, baseTime + 200);
    expect(blocked.allowed).toBe(false);

    // After windowMs has passed (baseTime + 1101), the first timestamp has expired
    const afterWindow = checkRateLimit(key, limit, windowMs, baseTime + 1101);
    expect(afterWindow.allowed).toBe(true);
  });

  it("sweeps completely expired buckets from memory", () => {
    const windowMs = 1000;
    const baseTime = 1_000_000;

    checkRateLimit("temp-key-1", 5, windowMs, baseTime);
    checkRateLimit("temp-key-2", 5, windowMs, baseTime);
    expect(getBucketCount()).toBe(2);

    // Access after window expires: sweep should clean them up
    checkRateLimit("temp-key-3", 5, windowMs, baseTime + 2000);
    // temp-key-1 and temp-key-2 had timestamps at baseTime (< 1002000 - 1000), so they got swept!
    expect(getBucketCount()).toBe(1);
  });

  it("enforces MAX_RATE_LIMIT_BUCKETS ceiling and evicts oldest entries to prevent memory leak", () => {
    const windowMs = 60_000;
    const now = Date.now();

    // Populate MAX_RATE_LIMIT_BUCKETS + 50 distinct keys
    const totalToInsert = MAX_RATE_LIMIT_BUCKETS + 50;
    for (let i = 0; i < totalToInsert; i++) {
      checkRateLimit(`ip-${i}`, 10, windowMs, now);
    }

    // Size must never exceed MAX_RATE_LIMIT_BUCKETS (2000)
    expect(getBucketCount()).toBeLessThanOrEqual(MAX_RATE_LIMIT_BUCKETS);
    expect(getBucketCount()).toBe(MAX_RATE_LIMIT_BUCKETS);
  });

  it("resets all rate limits via resetRateLimits", () => {
    checkRateLimit("k1", 5, 60_000);
    checkRateLimit("k2", 5, 60_000);
    expect(getBucketCount()).toBe(2);

    resetRateLimits();
    expect(getBucketCount()).toBe(0);
  });
});
