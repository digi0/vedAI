import "server-only";

import { serverAdmin } from "./supabase";
import { rateLimit, fromRpcRow, type RateLimitResult } from "./rate-limit";

/**
 * Count one request against `key` using the shared Postgres counter.
 *
 * Every serverless instance counts into the same row, so the limit is the
 * limit — unlike the in-memory version, which each instance kept privately.
 *
 * If the store can't answer (migration 0007 not applied yet, database
 * unreachable), fall back to the in-memory limiter rather than either letting
 * the request through unmetered or failing a call the user is waiting on. It's
 * a weaker limit, not no limit.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const sb = serverAdmin();
    const { data, error } = await sb.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      const result = fromRpcRow(row, limit);
      if (result) return result;
    }
  } catch {
    // Fall through to the in-memory limiter below.
  }

  return rateLimit(key, limit, windowMs);
}
