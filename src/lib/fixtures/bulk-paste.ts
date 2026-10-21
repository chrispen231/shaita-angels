import { validateFixture, type FixtureInput } from "@/lib/fixtures/validation";
import { matchCompetition, type Competition } from "@/lib/reference-data";

/**
 * Bulk paste: one fixture per line, parsed into fixture inputs and previewed with
 * a per-line error before anything is saved.
 *
 * Line format, columns separated by a tab (a row copied from a spreadsheet) or
 * a vertical bar:
 *
 *   date | opponent | competition | kickoff | venue | venue type
 *
 * Only the date (YYYY-MM-DD) and opponent are required. A blank competition or
 * venue type falls back to the defaults chosen above the text box. Blank lines
 * and lines starting with # are skipped, so a pasted header can be commented out.
 *
 * Every line passes through validateFixture, the same check the single-fixture
 * form uses, so a pasted row cannot reach the database in a shape the form would
 * refuse. Pasted fixtures are always scheduled with no score: this is for
 * entering a schedule, and results are recorded one match at a time.
 *
 * Pure: the client runs it for the preview, and the server runs it again on
 * save rather than trusting the preview.
 */

export const MAX_BULK_LINES = 100;

export type BulkDefaults = {
  season: string;
  competition: string;
  venue_type: string;
};

export type ParsedLine = {
  /** 1-based line number in the pasted text. */
  line: number;
  text: string;
  input: FixtureInput | null;
  error: string | null;
};

const VENUE_TYPE_ALIASES: Record<string, string> = {
  home: "home",
  h: "home",
  away: "away",
  a: "away",
  neutral: "neutral",
  n: "neutral",
};

/**
 * The competition as the dropdown would store it. A round suffix is kept
 * ("Orange Cup · Final" becomes "Women's Orange Cup · Final"), because the public
 * site reads rounds from it; anything unrecognised is an error rather than a new
 * bucket no filter links to.
 */
function resolveCompetition(value: string, competitions: Competition[]): string | null {
  const match = matchCompetition(competitions, value);
  if (!match) return null;
  const [, ...round] = value.split("·");
  const suffix = round.join("·").trim();
  return suffix ? `${match.name} · ${suffix}` : match.name;
}

export function parseFixtureLine(
  text: string,
  defaults: BulkDefaults,
  competitions: Competition[],
): { input: FixtureInput | null; error: string | null } {
  const cells = text.split(text.includes("\t") ? "\t" : "|").map((cell) => cell.trim());
  if (cells.length > 6) return { input: null, error: "Too many columns. Use: date | opponent | competition | kickoff | venue | venue type." };

  const [date = "", opponent = "", competitionCell = "", kickoff = "", venue = "", venueTypeCell = ""] = cells;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { input: null, error: `"${date}" is not a date. Write dates as YYYY-MM-DD.` };
  if (!opponent) return { input: null, error: "The opponent is missing." };

  const competition = resolveCompetition(competitionCell || defaults.competition, competitions);
  if (!competition) return { input: null, error: `"${competitionCell}" is not a known competition.` };

  const venueType = venueTypeCell ? VENUE_TYPE_ALIASES[venueTypeCell.toLowerCase()] : defaults.venue_type;
  if (!venueType) return { input: null, error: `"${venueTypeCell}" is not a venue type. Use home, away or neutral.` };

  const input: FixtureInput = {
    opponent,
    competition,
    season: defaults.season.trim(),
    match_date: date,
    kickoff_time: kickoff,
    venue,
    venue_type: venueType,
    status: "scheduled",
    shaita_goals: null,
    opponent_goals: null,
    notes: "",
    opponent_logo_url: null,
    opponent_logo_alt: null,
  };

  // Date.parse rolls 2026-02-30 over to March rather than failing, so check the
  // date reads back unchanged before handing it on.
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) {
    return { input: null, error: `${date} is not a real calendar date.` };
  }

  const invalid = validateFixture(input);
  return invalid ? { input: null, error: invalid } : { input, error: null };
}

export function parseBulkFixtures(text: string, defaults: BulkDefaults, competitions: Competition[]): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter(({ raw }) => raw !== "" && !raw.startsWith("#"))
    .map(({ raw, line }) => ({ line, text: raw, ...parseFixtureLine(raw, defaults, competitions) }));
}
