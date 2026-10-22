/**
 * Fixture input validation, mirroring the CHECK constraints on public.fixtures
 * in supabase/migrations/20260928202929_fixtures_results.sql.
 *
 * The database remains the real enforcement boundary. This module exists so the
 * admin form and the schema cannot drift apart silently: if one changes, the
 * tests in tests/fixture-validation.test.ts fail until the other follows.
 *
 * Returns an error message, or null when the input is valid.
 */

export type FixtureInput = {
  opponent: string;
  competition: string;
  season: string;
  match_date: string;
  kickoff_time: string;
  venue: string;
  venue_type: string;
  status: string;
  shaita_goals: number | null;
  opponent_goals: number | null;
  notes: string;
  /** Public URL of the opponent crest. Optional; null falls back to initials. */
  opponent_logo_url: string | null;
  opponent_logo_alt: string | null;
};

const VENUE_TYPES = ["home", "away", "neutral"] as const;
const STATUSES = ["scheduled", "played", "live", "halftime", "postponed", "cancelled"] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const SCORE = /^\d{1,2}$/;

/**
 * True for a YYYY-MM-DD string naming a real calendar day. Date.parse alone
 * accepts 2026-02-30 and rolls it into March, so the parsed date must also
 * round-trip to the same string.
 */
export function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

/**
 * True for an image address next/image will render: an https URL in a Supabase
 * public storage bucket, matching remotePatterns in next.config.ts, or, with
 * allowSitePath, a path to a file in public/. Anything else (http://, another
 * host, javascript:, data:) would be stored and then fail or be unsafe when
 * rendered into an image src.
 */
export function isAllowedImageUrl(value: string, { allowSitePath = false } = {}): boolean {
  if (/\s/.test(value)) return false;
  if (value.startsWith("/")) {
    // Site-relative, but not protocol-relative ("//host/..." or "/\host/...").
    return allowSitePath && !value.startsWith("//") && !value.startsWith("/\\");
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}

export function validateFixture(input: FixtureInput): string | null {
  const { opponent, competition, season } = input;

  if (
    opponent.length < 1 ||
    opponent.length > 100 ||
    competition.length < 1 ||
    competition.length > 120 ||
    season.length < 1 ||
    season.length > 30
  ) {
    return "Check opponent, competition, and season. One or more fields are empty or too long.";
  }

  if (!isRealIsoDate(input.match_date)) {
    return "Enter a valid match date.";
  }

  if (!VENUE_TYPES.includes(input.venue_type as (typeof VENUE_TYPES)[number])) {
    return "Choose a valid venue type.";
  }

  if (!STATUSES.includes(input.status as (typeof STATUSES)[number])) {
    return "Choose a valid match status.";
  }

  // fixtures_scores_match_status: a played match needs both scores (0-99). A live
  // or halftime match may carry either a complete scoreline or none at all -
  // marking a match live at 0-0 should not require typing the score first - but
  // never half a pair, which is always a mistake rather than a state. Every other
  // status carries neither.
  if (input.status === "played") {
    const for_ = input.shaita_goals;
    const against = input.opponent_goals;
    if (for_ === null || against === null || !SCORE.test(String(for_)) || !SCORE.test(String(against))) {
      return "Played matches need both scores (0–99).";
    }
  } else if (input.status === "live" || input.status === "halftime") {
    const for_ = input.shaita_goals;
    const against = input.opponent_goals;
    const bothNull = for_ === null && against === null;
    const bothSet = for_ !== null && against !== null;
    if (!bothNull && !bothSet) {
      return "A live or halftime match needs both scores or neither.";
    }
    if (bothSet && (!SCORE.test(String(for_)) || !SCORE.test(String(against)))) {
      return "Live or halftime scores must be between 0 and 99.";
    }
  } else if (input.shaita_goals !== null || input.opponent_goals !== null) {
    return "Only a played, live or halftime match can carry a score.";
  }

  if (input.venue.length > 160 || input.notes.length > 2000) {
    return "Venue or notes exceed the allowed length.";
  }

  if (input.kickoff_time && !HH_MM.test(input.kickoff_time)) {
    return "Enter kickoff time in 24-hour HH:MM format.";
  }

  // An opponent logo is optional. When present it must be an address the site's
  // image pipeline will render, because it goes straight into an image src.
  if (input.opponent_logo_url !== null) {
    if (!isAllowedImageUrl(input.opponent_logo_url)) {
      return "Upload the opponent logo rather than pasting a link from another site.";
    }
    if (input.opponent_logo_url.length > 500) return "That logo address is too long.";
    if (input.opponent_logo_alt !== null && input.opponent_logo_alt.length > 200) {
      return "Keep the logo description under 200 characters.";
    }
  }

  return null;
}