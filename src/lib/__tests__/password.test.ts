import { describe, it, expect } from "vitest";
import {
  validateNewPassword,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
} from "../password";

describe("validateNewPassword", () => {
  const ok = "correct-horse";

  it("accepts a long enough matching pair", () => {
    expect(validateNewPassword(ok, ok)).toBeNull();
  });

  it("accepts a password exactly at the minimum length", () => {
    const exact = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(validateNewPassword(exact, exact)).toBeNull();
  });

  it("rejects one character below the minimum", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validateNewPassword(short, short)).toBe("too_short");
  });

  it("rejects an empty password", () => {
    expect(validateNewPassword("", "")).toBe("too_short");
  });

  it("rejects a mismatched confirmation", () => {
    expect(validateNewPassword(ok, ok + "!")).toBe("mismatch");
  });

  it("reports length before mismatch, so the user fixes the real problem", () => {
    expect(validateNewPassword("short", "different")).toBe("too_short");
  });

  it("treats the confirmation as case- and whitespace-sensitive", () => {
    expect(validateNewPassword(ok, ok.toUpperCase())).toBe("mismatch");
    expect(validateNewPassword(ok, ok + " ")).toBe("mismatch");
  });
});

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmail("jane@example.com")).toBe(true);
    expect(isValidEmail("jane.doe+labs@clinic.co.in")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    for (const bad of ["", "jane", "jane@", "@example.com", "jane@example", "a b@c.com"]) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });
});
