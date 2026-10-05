import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Fixture } from "@/types/fixtures";

// null means Supabase is not configured; an empty array means it is configured
// but there are currently no published matches (or the query failed).
export async function getPublishedFixtures(): Promise<Fixture[] | null> {
  if (!getSupabaseConfig()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fixtures")
    .select(FIXTURE_COLUMNS)
    .eq("is_published", true)
    .order("match_date", { ascending: true });

  if (error || !data) return [];
  return data as Fixture[];
}

export function formatMatchDate(date: string) {
  return new Intl.DateTimeFormat("en-LR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatKickoff(time: string | null) {
  if (!time) return null;
  return time.slice(0, 5);
}

/**
 * Weekday + day + month + year in one block, the form club sites use above a
 * scoreline: "SATURDAY 17 OCTOBER 2026".
 */
export function formatMatchDateLong(date: string) {
  return new Intl.DateTimeFormat("en-LR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .toUpperCase();
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-07-14" -> "2026-07". */
export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function monthLabel(key: string) {
  const name = MONTHS[Number(key.slice(5, 7)) - 1];
  return name ? `${name} ${key.slice(0, 4)}` : key;
}

/**
 * The club's competitions. The competition column is free text in the database
 * (an existing row reads "Women's Orange Cup · Final"), so filtering matches on
 * a normalised pattern rather than on exact equality.
 */
/**
 * Every column the Fixture type declares.
 *
 * Three routes read fixtures - the match centre, the match page and the admin
 * editor - and each carried its own hand-written select list. Adding
 * opponent_logo_url to the type therefore left all three returning a row that did
 * not match it, and the failure surfaced as a confusing type error in a test file
 * rather than at the query. One list, imported everywhere.
 */
// One long line, and `as const` on it, are both load-bearing.
//
// `as const`: supabase-js infers the returned row type from the select argument,
// and only a string *literal* type carries that inference. A plain `const` string
// widens to `string`, the query degrades to a generic error-shaped row, and every
// `as Fixture` cast below becomes a type error instead of a checked assertion.
//
// A single line: `as const` cannot be applied to a concatenation, so the column
// list cannot be wrapped for readability. That is why this is one long line
// rather than the tidier wrapped form.
export const FIXTURE_COLUMNS = "id, opponent, competition, season, match_date, kickoff_time, venue, venue_type, status, shaita_goals, opponent_goals, notes, opponent_logo_url, opponent_logo_alt, is_published, created_at, updated_at" as const;

export const COMPETITIONS = [
  { slug: "lfa-womens-first-division", label: "LFA Women’s First Division", short: "First Division" },
  { slug: "womens-orange-cup", label: "Women’s Orange Cup", short: "Orange Cup" },
  { slug: "club-friendlies", label: "Club Friendlies", short: "Friendlies" },
] as const;

export type CompetitionSlug = (typeof COMPETITIONS)[number]["slug"];

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Best-effort mapping from a free-text competition value to a known competition.
 * Returns null for anything unrecognised so the fixture is still shown rather
 * than silently hidden by a filter.
 */
export function matchCompetition(competition: string): CompetitionSlug | null {
  const flat = normalise(competition);

  if (/first-division/.test(flat)) return "lfa-womens-first-division";
  if (/orange-cup/.test(flat)) return "womens-orange-cup";
  if (/friendl/.test(flat)) return "club-friendlies";
  return null;
}

export function isCompetitionSlug(value: string): value is CompetitionSlug {
  return COMPETITIONS.some((entry) => entry.slug === value);
}

/** Badge text for a fixture: "Women's Orange Cup · Final" -> "ORANGE CUP". */
export function competitionBadge(competition: string) {
  return competition.replace(/\s*[·–—]\s*.*$/, "").toUpperCase();
}

/** Round label, only when the club has recorded one in the notes field. */
export function roundLabel(fixture: Fixture) {
  const match = fixture.notes?.match(/(?:round|matchweek|week)\s*[:\-]?\s*(\d+)/i);
  return match ? `Matchweek ${match[1]}` : null;
}

/** Full time, upcoming, postponed or cancelled, in the site's vocabulary. */
export const STATUS_LABEL: Record<Fixture["status"], string> = {
  scheduled: "Upcoming",
  played: "Full time",
  postponed: "Postponed",
  cancelled: "Cancelled",
};

export function hasScore(fixture: Fixture) {
  return fixture.status === "played" && fixture.shaita_goals !== null && fixture.opponent_goals !== null;
}

export function opponentInitials(opponent: string) {
  return opponent.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "FC";
}

/** Whole days until a fixture, or null when it is not in the future. */
export function daysUntil(date: string) {
  const now = new Date();
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  const diff = Math.round((target - startOfToday) / 86_400_000);
  return diff > 0 ? diff : null;
}
