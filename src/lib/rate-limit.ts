/**
 * In-memory rate limiter, and the pure helpers shared with the database-backed
 * one in rate-limit-store.ts.
 *
 * This counter lives in one process, so on Vercel every serverless instance
 * keeps its own — the effective limit is (limit x live instances). Prefer
 * consumeRateLimit() from rate-limit-store.ts, which counts in Postgres so all
 * instances share one view. This stays as the fallback for when that store is
 * unreachable, and as a dependency-free unit under test.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Prune old entries every 5 minutes to avoid unbounded memory growth.
const pruneTimer = setInterval(
  () => {
    const now = Date.now();
    for (const [key, w] of store) {
      if (w.resetAt < now) store.delete(key);
    }
  },
  5 * 60 * 1000,
);
// Housekeeping should never be the reason a process stays alive.
pruneTimer.unref?.();

/**
 * Check and increment a rate-limit counter.
 *
 * @param key      - Unique key, e.g. `"ved:<userId>"` or `"insights:<userId>"`
 * @param limit    - Max requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 * @returns `{ allowed: boolean; remaining: number; resetAt: number }`
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let w = store.get(key);

  if (!w || w.resetAt < now) {
    w = { count: 0, resetAt: now + windowMs };
    store.set(key, w);
  }

  w.count += 1;
  const allowed = w.count <= limit;
  const remaining = Math.max(0, limit - w.count);
  return { allowed, remaining, resetAt: w.resetAt };
}

/**
 * Shape a `consume_rate_limit()` row into a RateLimitResult.
 *
 * Returns null when the row isn't what we expect — a missing migration, say —
 * so the caller can fall back rather than treat a malformed reply as a verdict.
 */
export function fromRpcRow(row: unknown, limit: number): RateLimitResult | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;

  if (typeof r.allowed !== "boolean") return null;

  const resetAt = Date.parse(String(r.reset_at));
  if (!Number.isFinite(resetAt)) return null;

  const remaining =
    typeof r.remaining === "number" && Number.isFinite(r.remaining)
      ? Math.max(0, r.remaining)
      : limit;

  return { allowed: r.allowed, remaining, resetAt };
}
