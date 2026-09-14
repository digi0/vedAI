import { describe, it, expect } from "vitest";
import { shareAccessState } from "../share-access";

const NOW = new Date("2026-03-01T12:00:00.000Z");
const iso = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

const HOUR = 3600_000;

describe("shareAccessState", () => {
  it("grants access to a live, unrevoked link", () => {
    expect(
      shareAccessState({ expiresAt: iso(HOUR), revokedAt: null }, NOW),
    ).toBe("ok");
  });

  it("reports a missing token as not_found", () => {
    expect(shareAccessState(null, NOW)).toBe("not_found");
  });

  it("refuses a link past its expiry", () => {
    expect(
      shareAccessState({ expiresAt: iso(-HOUR), revokedAt: null }, NOW),
    ).toBe("expired");
  });

  it("refuses a link at the exact moment it expires", () => {
    expect(
      shareAccessState({ expiresAt: iso(0), revokedAt: null }, NOW),
    ).toBe("expired");
  });

  it("refuses a revoked link", () => {
    expect(
      shareAccessState({ expiresAt: iso(HOUR), revokedAt: iso(-HOUR) }, NOW),
    ).toBe("revoked");
  });

  it("reports revocation even when the link has also expired", () => {
    expect(
      shareAccessState({ expiresAt: iso(-HOUR), revokedAt: iso(-2 * HOUR) }, NOW),
    ).toBe("revoked");
  });

  // Regression: comparing Dates directly made an unparseable expiry compare
  // false against every "is it expired?" test, so the link never died.
  it("fails closed on an unparseable expiry rather than granting forever", () => {
    expect(
      shareAccessState({ expiresAt: "not-a-date", revokedAt: null }, NOW),
    ).toBe("expired");
    expect(shareAccessState({ expiresAt: "", revokedAt: null }, NOW)).toBe(
      "expired",
    );
  });
});
