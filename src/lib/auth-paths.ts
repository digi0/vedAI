/**
 * Safe handling of the post-login `next` path.
 *
 * `next` is attacker-controllable: middleware puts it in the query string, so
 * anyone can hand out /login?next=<whatever>. A bare `startsWith("/")` check is
 * not enough — browsers read "//evil.com" as protocol-relative and "/\evil.com"
 * the same way, so both leave the site while looking like local paths.
 */

/** Where we land when `next` is missing or untrustworthy. */
export const DEFAULT_NEXT_PATH = "/";

/**
 * Reduce `next` to a path on this origin, or fall back to the default.
 *
 * Accepts only a single leading "/" followed by something that is not another
 * "/" or "\". Backslashes are rejected outright rather than normalized, since
 * no legitimate route in this app contains one.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || next === "") return DEFAULT_NEXT_PATH;
  if (next.includes("\\")) return DEFAULT_NEXT_PATH;
  if (!next.startsWith("/")) return DEFAULT_NEXT_PATH;
  if (next.startsWith("//")) return DEFAULT_NEXT_PATH;
  return next;
}
