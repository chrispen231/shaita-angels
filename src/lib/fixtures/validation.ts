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
const STATUSES = ["scheduled", "played", "postponed", "cancelled"] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// A logo URL is rendered into an image src, so it must be an absolute http(s) URL.
// A javascript: or data: value here would be stored and later rendered into that
// src, so the scheme is checked rather than assumed.
const HTTP_URL = /^https?:\/\/[^\s]+$/i;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const SCORE = /^\d{1,2}$/;

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

  if (!ISO_DATE.test(input.match_date) || Number.isNaN(Date.parse(`${input.match_date}T00:00:00Z`))) {
    return "Enter a valid match date.";
  }

  if (!VENUE_TYPES.includes(input.venue_type as (typeof VENUE_TYPES)[number])) {
    return "Choose a valid venue type.";
  }

  if (!STATUSES.includes(input.status as (typeof STATUSES)[number])) {
    return "Choose a valid match status.";
  }

  // fixtures_scores_match_status: a played match needs both scores (0-99), and
  // every other status must carry neither.
  if (input.status === "played") {
    const for_ = input.shaita_goals;
    const against = input.opponent_goals;
    if (for_ === null || against === null || !SCORE.test(String(for_)) || !SCORE.test(String(against))) {
      return "Played matches need both scores (0–99).";
    }
  } else if (input.shaita_goals !== null || input.opponent_goals !== null) {
    return "Played matches need both scores (0–99).";
  }

  if (input.venue.length > 160 || input.notes.length > 2000) {
    return "Venue or notes exceed the allowed length.";
  }

  if (input.kickoff_time && !HH_MM.test(input.kickoff_time)) {
    return "Enter kickoff time in 24-hour HH:MM format.";
  }

  // An opponent logo is optional. When present it must be an absolute http(s) URL,
  // because it is rendered straight into an image src.
  if (input.opponent_logo_url !== null) {
    if (!HTTP_URL.test(input.opponent_logo_url)) {
      return "The opponent logo must be a full http:// or https:// address. Upload the image rather than pasting a link.";
    }
    if (input.opponent_logo_url.length > 500) return "That logo address is too long.";
    if (input.opponent_logo_alt !== null && input.opponent_logo_alt.length > 200) {
      return "Keep the logo description under 200 characters.";
    }
  }

  return null;
}