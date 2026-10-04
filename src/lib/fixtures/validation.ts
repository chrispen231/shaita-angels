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
};

const VENUE_TYPES = ["home", "away", "neutral"] as const;
const STATUSES = ["scheduled", "played", "postponed", "cancelled"] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
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

  return null;
}