/**
 * Values the club already knows, offered as dropdowns instead of free text.
 *
 * Two sources, deliberately:
 *
 *   * competitions come from the database, because a super admin can add one at
 *     /admin/media without a deploy. The built-in list below is the fallback for
 *     an unconfigured build or a failed read, for the admin and public site alike.
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

/*
 * The built-in list. The same four competitions, with the same slugs, are seeded
 * into the competitions table (20261005170000 and 20261005190000), so a filtered
 * URL like /matches?competition=womens-orange-cup works whether or not the
 * database is reachable.
 */
const BUILT_IN: Competition[] = [
  { slug: "lfa-womens-first-division", name: "LFA Women\u2019s First Division", short: "First Division" },
  { slug: "womens-orange-cup", name: "Women\u2019s Orange Cup", short: "Orange Cup" },
  { slug: "lfa-super-cup", name: "LFA Super Cup", short: "Super Cup" },
  { slug: "club-friendlies", name: "Club Friendlies", short: "Friendlies" },
];

function fromCode(): Competition[] {
  return BUILT_IN.map((competition) => ({ ...competition }));
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

/** "LFA Women’s First Division" -> "lfa-womens-first-division": case, apostrophes and punctuation ignored. */
function competitionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Finds the competition a free-text fixture value belongs to.
 *
 * The one matcher for the whole site: the admin dropdowns, bulk paste and the
 * public /matches filter all resolve a stored value through here, so a fixture
 * cannot land under one competition in the admin and another on the public page.
 *
 * In order, ignoring case, apostrophes and punctuation:
 *   1. the whole value against each name, short name and slug
 *   2. the value without a round suffix ("Women's Orange Cup · Final")
 *   3. a value containing a short name ("LFA Women's Super Cup" -> Super Cup,
 *      "Friendly" -> Friendlies), the longest short name winning
 *
 * Returns null for anything unrecognised, so callers show the fixture rather than
 * hide it behind a filter.
 */
export function matchCompetition(
  competitions: Competition[],
  stored: string | null | undefined,
): Competition | null {
  if (!stored) return null;

  const byKey = (key: string) =>
    key
      ? competitions.find(
          (competition) =>
            competitionKey(competition.name) === key ||
            competitionKey(competition.short) === key ||
            competition.slug === key,
        ) ?? null
      : null;

  const exact = byKey(competitionKey(stored));
  if (exact) return exact;

  const base = competitionKey(stored.split(/\s*[·–—]\s*/)[0]);
  const withoutRound = byKey(base);
  if (withoutRound) return withoutRound;

  // Singular forms, so "Friendly" still finds "Friendlies".
  const singular = (key: string) =>
    key.split("-").map((word) => word.replace(/ies$/, "y").replace(/(?<!s)s$/, "")).join("-");
  const haystack = `-${singular(base)}-`;

  let best: Competition | null = null;
  for (const competition of competitions) {
    const short = singular(competitionKey(competition.short));
    if (!short || !haystack.includes(`-${short}-`)) continue;
    if (!best || short.length > singular(competitionKey(best.short)).length) best = competition;
  }
  return best;
}

/** The competition a ?competition= slug names, or null when it is not in the list. */
export function competitionBySlug(
  competitions: Competition[],
  slug: string | null | undefined,
): Competition | null {
  if (!slug) return null;
  return competitions.find((competition) => competition.slug === slug) ?? null;
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
  { value: "live", label: "Live" },
  { value: "played", label: "Played" },
  { value: "halftime", label: "Halftime" },
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
  "Press release",
  "Announcement",
] as const;

/**
 * Which categories the public news page offers as filters.
 *
 * Every category the club publishes gets a chip. A category with no published
 * articles is not rendered at all (the archive filters against live counts), so
 * listing them all here cannot produce a tab that leads to an empty list.
 */
export const NEWS_FILTER_CATEGORIES = [
  "Match report",
  "Transfer news",
  "Trophy room",
  "Press release",
  "Announcement",
  "Club history",
  "Community",
] as const;
