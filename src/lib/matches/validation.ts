/**
 * Match content validation.
 *
 * Mirrors the CHECK constraints in
 * supabase/migrations/20261005150000_match_content.sql, following the same
 * pattern as src/lib/fixtures/validation.ts: the database is the real boundary,
 * and these helpers exist so the admin forms and the schema cannot drift apart
 * silently. The tests in tests/match-content-validation.test.ts fail if one
 * changes without the other.
 *
 * Every function returns an error message, or null when the input is valid.
 */

export const SIDES = ["shaita", "opponent"] as const;
export type Side = (typeof SIDES)[number];

export const CARD_TYPES = ["yellow", "red", "second_yellow"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const FEET = ["left", "right", "both"] as const;
export type Foot = (typeof FEET)[number];

/** Goalkeeper, defender, midfielder, forward, or anything the club prefers. */
export const POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isBlank(value: string) {
  return value.trim().length === 0;
}

/** 1..120, matching goal_minute and card_minute. */
export function validateMinute(minute: number): string | null {
  if (!Number.isInteger(minute) || minute < 1 || minute > 120) {
    return "Minutes run from 1 to 120. Enter stoppage time as the total minute, so 90+3 is 93.";
  }
  return null;
}

export function validatePlayerName(name: string): string | null {
  // lineup_name_length / goal_name_length / card_name_length: 1..120
  if (isBlank(name)) return "Enter the player's name.";
  if (name.trim().length > 120) return "That name is too long.";
  return null;
}

export function validateSide(side: string): string | null {
  if (!SIDES.includes(side as Side)) return "Choose which side the player was on.";
  return null;
}

export function validateShirtNumber(value: string): string | null {
  if (isBlank(value)) return null; // null is allowed: not every player is numbered
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 99) {
    return "Shirt numbers run from 1 to 99.";
  }
  return null;
}

export function validateCardType(card: string): string | null {
  if (!CARD_TYPES.includes(card as CardType)) return "Choose yellow, red or second yellow.";
  return null;
}

export function validateAssistNote(note: string): string | null {
  // goal_note_length: <= 200
  if (note.length > 200) return "Keep the note under 200 characters.";
  return null;
}

/**
 * A goal or card minute must be plausible for the match, but the database does
 * not know the kickoff time, so this only guards against a value that cannot be
 * right. Stoppage time is entered as the running total minute.
 */
export function validateGoalForMinute(minute: number, stoppage: boolean): string | null {
  const base = validateMinute(minute);
  if (base) return base;

  // 45 minutes of play per half plus generous stoppage; beyond 110 without the
  // stoppage flag the entry is almost certainly a typo for 90+something.
  if (!stoppage && minute > 110) {
    return "That looks like stoppage time. Tick the stoppage box and enter the total minute.";
  }
  return null;
}

// =============================================================================
// Squad
// =============================================================================

export type SquadInput = {
  full_name: string;
  date_of_birth: string;
  position: string;
  preferred_foot: string;
  height_cm: string;
  weight_kg: string;
  shirt_number: string;
  bio: string;
};

const NAME_MAX = 120;
const BIO_MAX = 2000;

/**
 * Validates a squad entry.
 *
 * date_of_birth is optional but, when present, is validated strictly: a malformed
 * date would either be rejected by the column or silently mean "no date", and
 * the second outcome is worse because is_minor would then read false for a
 * minor.
 */
export function validateSquad(input: SquadInput): string | null {
  if (isBlank(input.full_name)) return "Enter the player's full name.";
  if (input.full_name.trim().length > NAME_MAX) return "That name is too long.";

  if (!isBlank(input.date_of_birth)) {
    if (!ISO_DATE.test(input.date_of_birth.trim())) {
      return "Enter the date of birth as YYYY-MM-DD.";
    }
    const parsed = Date.parse(`${input.date_of_birth.trim()}T00:00:00Z`);
    if (Number.isNaN(parsed)) return "That date of birth is not a real date.";

    const age = wholeYearsSince(parsed, new Date());

    // A plausible squad range. The club's stated minimum is 15.
    if (age < 12) return "That date of birth makes the player under 12. Check the year.";
    if (age > 60) return "That date of birth makes the player over 60. Check the year.";
  }

  if (!isBlank(input.preferred_foot) && !FEET.includes(input.preferred_foot as Foot)) {
    return "Choose left, right or both.";
  }

  if (!isBlank(input.height_cm)) {
    const height = Number(input.height_cm);
    // squad_height: 100..230
    if (!Number.isInteger(height) || height < 100 || height > 230) {
      return "Height runs from 100 to 230 cm.";
    }
  }

  if (!isBlank(input.weight_kg)) {
    const weight = Number(input.weight_kg);
    // squad_weight: 25..120
    if (!Number.isInteger(weight) || weight < 25 || weight > 120) {
      return "Weight runs from 25 to 120 kg.";
    }
  }

  const shirtError = validateShirtNumber(input.shirt_number);
  if (shirtError) return shirtError;

  if (input.bio.length > BIO_MAX) return "Keep the biography under 2000 characters.";

  return null;
}

/** True when the entered date of birth means the player is under 18 today. */
export function isMinorFromDob(dateOfBirth: string, today = new Date()): boolean {
  if (isBlank(dateOfBirth)) return false;
  const parsed = Date.parse(`${dateOfBirth.trim()}T00:00:00Z`);
  if (Number.isNaN(parsed)) return false;
  return wholeYearsSince(parsed, today) < 18;
}

/**
 * Whole calendar years from a UTC date to today.
 *
 * Calendar arithmetic, not a day count. Dividing by 365.2425 looks equivalent and
 * is not: fifteen mean years is about ten days shorter than fifteen calendar
 * years, because the interval contains leap days. Using it here made a
 * 16-year-old read as 15 and therefore "not a minor", which is the exact opposite
 * of the safe answer when the flag gates a safeguarding decision.
 */
function wholeYearsSince(fromUtcMs: number, today: Date): number {
  const from = new Date(fromUtcMs);
  let years = today.getUTCFullYear() - from.getUTCFullYear();

  // Not yet had their birthday this year.
  const monthDiff = today.getUTCMonth() - from.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < from.getUTCDate())) {
    years -= 1;
  }
  return years;
}

// =============================================================================
// Report
// =============================================================================

export const REPORT_MAX = 8000;

export function validateReport(body: string): string | null {
  if (isBlank(body)) return "Write the match report, or clear it to remove the existing one.";
  // report_length: <= 8000
  if (body.trim().length > REPORT_MAX) {
    return `Keep the report under ${REPORT_MAX} characters.`;
  }
  return null;
}

// =============================================================================
// Lineup
// =============================================================================

export type LineupInput = {
  player_name: string;
  shirt_number: string;
  position: string;
  is_starter: boolean;
};

/**
 * Validates a whole lineup rather than one row, because the constraints that
 * matter are between rows: a number cannot appear twice in one match. The
 * database enforces this with a partial unique index; this gives the editor a
 * message before the round trip.
 */
export function validateLineup(rows: LineupInput[]): string | null {
  if (rows.length === 0) return "Add at least one player to the lineup.";

  const seen = new Map<number, string>();

  for (const row of rows) {
    const nameError = validatePlayerName(row.player_name);
    if (nameError) return nameError;

    const numberError = validateShirtNumber(row.shirt_number);
    if (numberError) return numberError;

    if (!isBlank(row.shirt_number)) {
      const number = Number(row.shirt_number);
      const existing = seen.get(number);
      if (existing) {
        return `Shirt number ${number} is used by both ${existing} and ${row.player_name.trim()}.`;
      }
      seen.set(number, row.player_name.trim());
    }
  }

  const starters = rows.filter((row) => row.is_starter).length;
  // Eleven is the usual number of starters. Not enforced by the database: a
  // five-a-side or a red-card-shortened lineup is legitimate, so this only warns
  // when there are more than eleven, which is always an error.
  if (starters > 11) return "A starting lineup cannot have more than eleven players.";

  return null;
}

/** Formats a minute for display: 93 with stoppage reads as 90+3'. */
export function formatMinute(minute: number, addedStoppage: boolean): string {
  if (!addedStoppage) return `${minute}'`;
  // The bands are explicit because the boundaries are the whole problem. A goal
  // at 47 is 45+2, not 47; a goal at 93 is 90+3; and 90 itself is 90', never
  // 45+45. Ordering these as nested comparisons gets at least one of the three
  // wrong, which the tests in match-content-validation.test.ts pin down.
  if (minute > 90) return `90+${minute - 90}'`;
  if (minute > 45 && minute < 90) return `45+${minute - 45}'`;
  return `${minute}'`;
}

/** A goal's public label, including own goals. */
export function describeGoal(goal: {
  player_name: string;
  side: Side;
  is_own_goal: boolean;
}): string {
  if (goal.is_own_goal) {
    return goal.side === "shaita"
      ? `Own goal, ${goal.player_name}`
      : `${goal.player_name} (own goal)`;
  }
  return goal.player_name;
}
