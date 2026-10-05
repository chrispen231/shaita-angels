import { COMPETITIONS } from "@/lib/fixtures";

/**
 * Values the club already knows, offered as dropdowns instead of free text.
 *
 * Two sources, deliberately:
 *
 *   * competitions come from the database, because a super admin can add one at
 *     /admin/media without a deploy. The names are seeded identically to
 *     src/lib/fixtures.ts, which remains the fallback for an unconfigured build.
 *
 *   * positions, feet and venue types are constants in code. They are a closed set
 *     with no club-specific variation: "Goalkeeper, Defender, Midfielder, Forward"
 *     is the whole vocabulary, and a table for four values would be a table to keep
 *     in sync with a type for no gain. Putting them in the database would also mean
 *     an empty dropdown if the seed were ever absent, which is worse than a
 *     hardcoded list that cannot drift.
 *
 * Server-free: no next/headers import, so client components can use the constants.
 */

export type Competition = {
  slug: string;
  name: string;
  short: string;
};

// =============================================================================
// Competitions
// =============================================================================

function fromCode(): Competition[] {
  return COMPETITIONS.map((competition) => ({
    slug: competition.slug,
    name: competition.label,
    short: competition.short,
  }));
}

/**
 * The built-in competition list, for an unconfigured build and as the fallback.
 *
 * The database read lives in getCompetitionsForAdmin, which is server-only: this
 * module is imported by client components, so it must not reach next/headers even
 * indirectly through a dynamic import.
 */
export function builtInCompetitions(): Competition[] {
  return fromCode();
}

/**
 * Finds the competition whose name matches an existing fixture value.
 *
 * Fixtures store the competition as free text, so a dropdown selection has to be
 * mapped back to a name. Matching is on the exact stored name first, then on the
 * short name, so a legacy row reading "Women's Orange Cup · Final" still resolves.
 */
export function matchCompetition(
  competitions: Competition[],
  stored: string | null | undefined,
): Competition | null {
  if (!stored) return null;

  const exact = competitions.find((competition) => competition.name === stored);
  if (exact) return exact;

  const short = competitions.find((competition) => competition.short === stored);
  if (short) return short;

  // Fixtures may carry a round suffix, e.g. "Women's Orange Cup · Final".
  const base = stored.split("·")[0].trim();
  return (
    competitions.find((competition) => competition.name === base) ??
    competitions.find((competition) => competition.short === base) ??
    null
  );
}

// =============================================================================
// Closed sets
// =============================================================================

export const POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
] as const;

/** What the club actually calls the lines, for display rather than data. */
export const POSITION_GROUPS = [
  { key: "Goalkeeper", label: "Goalkeepers" },
  { key: "Defender", label: "Defenders" },
  { key: "Midfielder", label: "Midfielders" },
  { key: "Forward", label: "Attackers" },
] as const;

export const FEET = ["right", "left", "both"] as const;

export const VENUE_TYPES = [
  { value: "home", label: "Home" },
  { value: "away", label: "Away" },
  { value: "neutral", label: "Neutral venue" },
] as const;

export const MATCH_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "played", label: "Played" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

/**
 * News categories.
 *
 * A suggestion list rather than a closed set: the club may add "Community" or
 * "Academy" without a deploy, and the editor can still type something else. That is
 * the difference between a datalist, which suggests but does not constrain, and a
 * select, which constrains.
 */
export const ARTICLE_CATEGORIES = [
  "Match report",
  "Trophy room",
  "Club history",
  "Transfer news",
  "Community",
  "Announcement",
] as const;
