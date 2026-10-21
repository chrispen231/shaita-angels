/**
 * Duplicate fixture detection.
 *
 * A duplicate is the same opponent in the same competition within a few days of
 * an existing fixture. That is almost always the same match entered twice - once
 * by hand and once from a pasted schedule, or a postponement re-entered as a new
 * row instead of edited - so the editor warns and lets the admin confirm or
 * cancel. It is a warning, not a rule: a cup tie and a league game against the
 * same club in one week are rare but real, so nothing here blocks a save.
 *
 * Pure so the client preview and the server check give the same answer.
 */

export const DUPLICATE_WINDOW_DAYS = 3;

export type DuplicateCandidate = {
  opponent: string;
  competition: string;
  match_date: string;
};

export type ExistingFixture = DuplicateCandidate & { id: string };

/** Case, apostrophe style, punctuation and spacing do not make a different club. */
export function normaliseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Competition compared without its round suffix: "Women's Orange Cup · Final" and
 * "Women's Orange Cup" are the same competition, and a round typed on one entry
 * but not the other should not hide the duplicate.
 */
function normaliseCompetition(value: string) {
  return normaliseName(value.split(/\s*[·–—|]\s*/)[0] ?? value);
}

function dayNumber(date: string) {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

export function isSameFixture(a: DuplicateCandidate, b: DuplicateCandidate, windowDays = DUPLICATE_WINDOW_DAYS) {
  const da = dayNumber(a.match_date);
  const db = dayNumber(b.match_date);
  if (Number.isNaN(da) || Number.isNaN(db)) return false;
  return (
    Math.abs(da - db) <= windowDays &&
    normaliseName(a.opponent) === normaliseName(b.opponent) &&
    normaliseCompetition(a.competition) === normaliseCompetition(b.competition)
  );
}

/**
 * Existing fixtures that look like the same match as the candidate. `excludeId`
 * leaves out the fixture being edited, which would otherwise match itself.
 */
export function findDuplicates(
  candidate: DuplicateCandidate,
  existing: ExistingFixture[],
  { windowDays = DUPLICATE_WINDOW_DAYS, excludeId }: { windowDays?: number; excludeId?: string } = {},
): ExistingFixture[] {
  return existing.filter((fixture) => fixture.id !== excludeId && isSameFixture(candidate, fixture, windowDays));
}

export type BatchDuplicate = {
  /** Existing fixtures this entry matches. */
  existing: ExistingFixture[];
  /** Indexes of earlier entries in the same batch that it matches. */
  earlier: number[];
};

/**
 * Duplicate check for a batch (bulk paste or a recurring series): each entry
 * against what is already saved, and against the entries before it, so a line
 * pasted twice is caught as well as one already in the database.
 */
export function findBatchDuplicates(
  candidates: DuplicateCandidate[],
  existing: ExistingFixture[],
  windowDays = DUPLICATE_WINDOW_DAYS,
): BatchDuplicate[] {
  return candidates.map((candidate, index) => ({
    existing: findDuplicates(candidate, existing, { windowDays }),
    earlier: candidates
      .slice(0, index)
      .flatMap((other, otherIndex) => (isSameFixture(candidate, other, windowDays) ? [otherIndex] : [])),
  }));
}

export function hasAnyDuplicate(results: BatchDuplicate[]) {
  return results.some((result) => result.existing.length > 0 || result.earlier.length > 0);
}

/** The date range a duplicate query must cover for these candidates. */
export function duplicateSearchRange(dates: string[], windowDays = DUPLICATE_WINDOW_DAYS) {
  const days = dates.map(dayNumber).filter((day) => !Number.isNaN(day));
  if (days.length === 0) return null;
  const toDate = (day: number) => new Date(day * 86_400_000).toISOString().slice(0, 10);
  return { from: toDate(Math.min(...days) - windowDays), to: toDate(Math.max(...days) + windowDays) };
}
