/**
 * Recurring fixtures: one form creates a series of matches on the same weekday,
 * every week or every few weeks, e.g. every Saturday for 8 weeks.
 *
 * Dates are computed in UTC day arithmetic, matching how match_date (a plain
 * date column) is read everywhere else, so no time zone can shift a match onto
 * the wrong day.
 */

export const MAX_SERIES_LENGTH = 52;
export const MAX_SERIES_INTERVAL_WEEKS = 4;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SeriesResult = { dates: string[]; error: null } | { dates: []; error: string };

export function generateSeriesDates(firstDate: string, everyWeeks: number, count: number): SeriesResult {
  const start = Date.parse(`${firstDate}T00:00:00Z`);
  if (!ISO_DATE.test(firstDate) || Number.isNaN(start) || new Date(start).toISOString().slice(0, 10) !== firstDate) {
    return { dates: [], error: "Enter a valid first match date." };
  }
  if (!Number.isInteger(everyWeeks) || everyWeeks < 1 || everyWeeks > MAX_SERIES_INTERVAL_WEEKS) {
    return { dates: [], error: `Repeat every 1 to ${MAX_SERIES_INTERVAL_WEEKS} weeks.` };
  }
  if (!Number.isInteger(count) || count < 2 || count > MAX_SERIES_LENGTH) {
    return { dates: [], error: `A series needs between 2 and ${MAX_SERIES_LENGTH} matches.` };
  }

  const step = everyWeeks * 7 * 86_400_000;
  return {
    dates: Array.from({ length: count }, (_, index) => new Date(start + index * step).toISOString().slice(0, 10)),
    error: null,
  };
}

/** "Saturday" for a match date, for the "every Saturday" label. */
export function weekdayName(date: string) {
  const time = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(time)) return null;
  return new Intl.DateTimeFormat("en-LR", { weekday: "long", timeZone: "UTC" }).format(new Date(time));
}
