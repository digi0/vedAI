/**
 * What a doctor share link is allowed to expose, and for how long.
 *
 * The `share_tokens` table has carried include_records / include_metrics /
 * include_profile since 0001 and the share view honours them, but nothing
 * could ever set them — every link shared everything. These helpers are the
 * write half, kept pure so the rules are testable on their own.
 */

export type ShareScope = {
  includeRecords: boolean;
  includeMetrics: boolean;
  includeProfile: boolean;
};

/** Sharing everything — the behaviour every existing link already has. */
export const DEFAULT_SHARE_SCOPE: ShareScope = {
  includeRecords: true,
  includeMetrics: true,
  includeProfile: true,
};

/** Link lifetime bounds, in hours: 1 hour to 30 days. */
export const MIN_SHARE_HOURS = 1;
export const MAX_SHARE_HOURS = 720;
export const DEFAULT_SHARE_HOURS = 72;

/**
 * Fill in a partial scope from the client. An omitted section stays shared,
 * so an older caller that passes nothing keeps the current behaviour.
 */
export function normalizeShareScope(input?: Partial<ShareScope> | null): ShareScope {
  return {
    includeRecords: input?.includeRecords ?? DEFAULT_SHARE_SCOPE.includeRecords,
    includeMetrics: input?.includeMetrics ?? DEFAULT_SHARE_SCOPE.includeMetrics,
    includeProfile: input?.includeProfile ?? DEFAULT_SHARE_SCOPE.includeProfile,
  };
}

/** A link that exposes no section is a dead link — refuse to mint one. */
export function hasAnySection(scope: ShareScope): boolean {
  return scope.includeRecords || scope.includeMetrics || scope.includeProfile;
}

/**
 * Clamp a requested lifetime into range. `hoursValid` reaches the server
 * action from the browser, so a hand-rolled call could otherwise mint a link
 * lasting centuries, or one already expired.
 */
export function clampShareHours(hours?: number): number {
  if (typeof hours !== "number" || !Number.isFinite(hours)) {
    return DEFAULT_SHARE_HOURS;
  }
  return Math.min(MAX_SHARE_HOURS, Math.max(MIN_SHARE_HOURS, Math.floor(hours)));
}
