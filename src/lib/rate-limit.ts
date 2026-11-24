/**
 * Bounded in-memory rate limiter for expensive server endpoints.
 *
 * Intentionally process-local: it protects against accidental request storms
 * (for example a re-rendering client) without introducing external state.
 *
 * Hard bounded to MAX_RATE_LIMIT_BUCKETS with automatic expiration sweeping
 * and oldest-entry LRU-style eviction to prevent unbounded memory growth.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export const MAX_RATE_LIMIT_BUCKETS = 2000;
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  sweepExpired(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_RATE_LIMIT_BUCKETS) {
      // Evict oldest entry (Map maintains insertion order)
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) {
        buckets.delete(oldestKey);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Test helper: returns current bucket count. */
export function getBucketCount(): number {
  return buckets.size;
}

/** Test helper: clears all buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}
