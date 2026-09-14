import { describe, it, expect } from "vitest";
import {
  clampShareHours,
  hasAnySection,
  normalizeShareScope,
  DEFAULT_SHARE_HOURS,
  MAX_SHARE_HOURS,
  MIN_SHARE_HOURS,
} from "../share-scope";

describe("normalizeShareScope", () => {
  it("shares everything when the caller says nothing", () => {
    expect(normalizeShareScope()).toEqual({
      includeRecords: true,
      includeMetrics: true,
      includeProfile: true,
    });
    expect(normalizeShareScope(null)).toEqual(normalizeShareScope());
  });

  it("keeps an explicit false instead of defaulting it back on", () => {
    expect(normalizeShareScope({ includeRecords: false })).toEqual({
      includeRecords: false,
      includeMetrics: true,
      includeProfile: true,
    });
  });

  it("carries every section through independently", () => {
    expect(
      normalizeShareScope({
        includeRecords: false,
        includeMetrics: true,
        includeProfile: false,
      }),
    ).toEqual({
      includeRecords: false,
      includeMetrics: true,
      includeProfile: false,
    });
  });
});

describe("hasAnySection", () => {
  it("accepts a scope with at least one section", () => {
    expect(
      hasAnySection({
        includeRecords: false,
        includeMetrics: false,
        includeProfile: true,
      }),
    ).toBe(true);
  });

  it("rejects a link that would show nothing", () => {
    expect(
      hasAnySection({
        includeRecords: false,
        includeMetrics: false,
        includeProfile: false,
      }),
    ).toBe(false);
  });
});

describe("clampShareHours", () => {
  it("defaults when no lifetime is given", () => {
    expect(clampShareHours()).toBe(DEFAULT_SHARE_HOURS);
  });

  it("passes a sane lifetime through", () => {
    expect(clampShareHours(72)).toBe(72);
  });

  // hoursValid crosses the wire from the browser, so a hand-rolled call
  // must not be able to mint a link lasting centuries — or one born expired.
  it("clamps a lifetime beyond the maximum", () => {
    expect(clampShareHours(100_000)).toBe(MAX_SHARE_HOURS);
  });

  it("clamps zero and negative lifetimes up to the minimum", () => {
    expect(clampShareHours(0)).toBe(MIN_SHARE_HOURS);
    expect(clampShareHours(-5)).toBe(MIN_SHARE_HOURS);
  });

  it("falls back to the default on non-finite input", () => {
    expect(clampShareHours(NaN)).toBe(DEFAULT_SHARE_HOURS);
    expect(clampShareHours(Infinity)).toBe(DEFAULT_SHARE_HOURS);
    expect(clampShareHours("72" as never)).toBe(DEFAULT_SHARE_HOURS);
  });

  it("truncates a fractional lifetime to whole hours", () => {
    expect(clampShareHours(72.9)).toBe(72);
  });
});
