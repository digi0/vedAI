/**
 * Lightweight in-memory rate limiter for server-side use.
 *
 * Uses a sliding-window counter per key. Good enough for a single-process
 * deployment (Vercel serverless, single instance per region). For multi-region
 * or high-scale deployments, swap the Map for a Redis-backed store.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Prune old entries every 5 minutes to avoid unbounded memory growth.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, w] of store) {
      if (w.resetAt < now) store.delete(key);
    }
  },
  5 * 60 * 1000,
);

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
): { allowed: boolean; remaining: number; resetAt: number } {
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
