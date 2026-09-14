/**
 * Access rules for doctor share links.
 *
 * Pulled out of the /share/<token> page so the rule that decides whether a
 * clinician sees a patient's records is a pure function that can be tested
 * directly. Every branch here is a privacy decision, so the default is to
 * deny: anything we cannot positively confirm as a live link is refused.
 */

export type ShareAccessState = "ok" | "not_found" | "revoked" | "expired";

/** The subset of a share token the access decision depends on. */
export type ShareAccessInput = {
  expiresAt: string;
  revokedAt: string | null;
} | null;

/**
 * Decide whether a share token currently grants access.
 *
 * Revocation is checked before expiry so a revoked link always reads as
 * revoked, which is what the owner just did to it.
 */
export function shareAccessState(
  share: ShareAccessInput,
  now: Date = new Date(),
): ShareAccessState {
  if (!share) return "not_found";
  if (share.revokedAt) return "revoked";

  const expiresAt = new Date(share.expiresAt).getTime();
  // Fail closed. `new Date("nonsense") < new Date()` is false, so comparing
  // dates directly would treat an unparseable expiry as "not expired" and
  // hand out a link that never dies. Refuse it instead.
  if (!Number.isFinite(expiresAt)) return "expired";
  if (expiresAt <= now.getTime()) return "expired";

  return "ok";
}
