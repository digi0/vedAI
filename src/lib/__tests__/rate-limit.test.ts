import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, fromRpcRow } from "../rate-limit";

const WINDOW = 60_000;
let seq = 0;
/** Unique key per test — the limiter's store is module-level state. */
const key = () => `test:${seq++}`;

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("allows requests up to the limit and refuses the next one", () => {
    const k = key();
    expect(rateLimit(k, 3, WINDOW).allowed).toBe(true);
    expect(rateLimit(k, 3, WINDOW).allowed).toBe(true);
    expect(rateLimit(k, 3, WINDOW).allowed).toBe(true);
    expect(rateLimit(k, 3, WINDOW).allowed).toBe(false);
  });

  it("counts down remaining and never reports below zero", () => {
    const k = key();
    expect(rateLimit(k, 2, WINDOW).remaining).toBe(1);
    expect(rateLimit(k, 2, WINDOW).remaining).toBe(0);
    expect(rateLimit(k, 2, WINDOW).remaining).toBe(0);
  });

  it("keeps separate budgets per key, so one user can't exhaust another's", () => {
    const a = key();
    const b = key();
    rateLimit(a, 1, WINDOW);
    expect(rateLimit(a, 1, WINDOW).allowed).toBe(false);
    expect(rateLimit(b, 1, WINDOW).allowed).toBe(true);
  });

  it("starts a fresh window once the old one elapses", () => {
    const k = key();
    rateLimit(k, 1, WINDOW);
    expect(rateLimit(k, 1, WINDOW).allowed).toBe(false);

    vi.advanceTimersByTime(WINDOW + 1);
    expect(rateLimit(k, 1, WINDOW).allowed).toBe(true);
  });

  it("does not reset partway through a window", () => {
    const k = key();
    rateLimit(k, 1, WINDOW);
    vi.advanceTimersByTime(WINDOW - 1);
    expect(rateLimit(k, 1, WINDOW).allowed).toBe(false);
  });

  it("reports when the current window resets", () => {
    const k = key();
    const { resetAt } = rateLimit(k, 5, WINDOW);
    expect(resetAt).toBe(Date.now() + WINDOW);
  });
});

describe("fromRpcRow", () => {
  const RESET = "2026-03-01T12:01:00.000Z";

  it("reads a well-formed consume_rate_limit row", () => {
    expect(fromRpcRow({ allowed: true, remaining: 4, reset_at: RESET }, 5)).toEqual({
      allowed: true,
      remaining: 4,
      resetAt: Date.parse(RESET),
    });
  });

  it("carries a refusal through", () => {
    const result = fromRpcRow({ allowed: false, remaining: 0, reset_at: RESET }, 5);
    expect(result?.allowed).toBe(false);
    expect(result?.remaining).toBe(0);
  });

  it("never reports negative remaining", () => {
    expect(fromRpcRow({ allowed: false, remaining: -3, reset_at: RESET }, 5)?.remaining)
      .toBe(0);
  });

  // A null here means "fall back to the in-memory limiter" — the caller must
  // not read a malformed reply as a verdict either way.
  it("rejects a row that isn't an object", () => {
    expect(fromRpcRow(null, 5)).toBeNull();
    expect(fromRpcRow(undefined, 5)).toBeNull();
    expect(fromRpcRow("nope", 5)).toBeNull();
  });

  it("rejects a row with no boolean verdict", () => {
    expect(fromRpcRow({ remaining: 4, reset_at: RESET }, 5)).toBeNull();
    expect(fromRpcRow({ allowed: "true", remaining: 4, reset_at: RESET }, 5)).toBeNull();
  });

  it("rejects a row whose reset time won't parse", () => {
    expect(fromRpcRow({ allowed: true, remaining: 4, reset_at: "soon" }, 5)).toBeNull();
    expect(fromRpcRow({ allowed: true, remaining: 4 }, 5)).toBeNull();
  });

  it("falls back to the full limit when remaining is missing", () => {
    expect(fromRpcRow({ allowed: true, reset_at: RESET }, 5)?.remaining).toBe(5);
  });
});
