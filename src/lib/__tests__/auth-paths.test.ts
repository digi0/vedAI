import { describe, it, expect } from "vitest";
import { safeNextPath, DEFAULT_NEXT_PATH } from "../auth-paths";

describe("safeNextPath", () => {
  it("keeps an ordinary in-app path", () => {
    expect(safeNextPath("/records")).toBe("/records");
    expect(safeNextPath("/share")).toBe("/share");
  });

  it("keeps a path with a query string or fragment", () => {
    expect(safeNextPath("/records?type=lab")).toBe("/records?type=lab");
    expect(safeNextPath("/metrics#ldl")).toBe("/metrics#ldl");
  });

  it("falls back when next is missing or not a string", () => {
    expect(safeNextPath(undefined)).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath(null)).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath(42)).toBe(DEFAULT_NEXT_PATH);
  });

  it("refuses an absolute URL to another origin", () => {
    expect(safeNextPath("https://evil.com")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("http://evil.com/steal")).toBe(DEFAULT_NEXT_PATH);
  });

  // Regression: the old guard was `next.startsWith("/")`, which both of these
  // pass — and both leave the site, because a browser reads them as
  // protocol-relative. `next` comes from the query string, so anyone can set it.
  it("refuses a protocol-relative path", () => {
    expect(safeNextPath("//evil.com")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("//evil.com/phish")).toBe(DEFAULT_NEXT_PATH);
  });

  it("refuses a backslash path that browsers normalise to a host", () => {
    expect(safeNextPath("/\\evil.com")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("\\\\evil.com")).toBe(DEFAULT_NEXT_PATH);
  });

  it("refuses a scheme-relative payload that isn't a path at all", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("records")).toBe(DEFAULT_NEXT_PATH);
  });

  it("resolves everything it accepts to the same origin", () => {
    const origin = "https://vedai.app";
    for (const candidate of [
      "/records",
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "javascript:alert(1)",
    ]) {
      const resolved = new URL(safeNextPath(candidate), origin);
      expect(resolved.origin).toBe(origin);
    }
  });
});
