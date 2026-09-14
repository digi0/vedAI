/**
 * Password rules, shared by signup and by the reset flow so the two can't
 * drift apart and accept different passwords.
 */

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordProblem = "too_short" | "mismatch" | null;

/** Validate a new password against its confirmation. `null` means it's fine. */
export function validateNewPassword(
  password: string,
  confirm: string,
): PasswordProblem {
  if (password.length < MIN_PASSWORD_LENGTH) return "too_short";
  if (password !== confirm) return "mismatch";
  return null;
}

/** Shape check only — the mail server is the real authority on deliverability. */
export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
