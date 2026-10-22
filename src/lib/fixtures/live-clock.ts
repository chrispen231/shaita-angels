/**
 * The live match clock.
 *
 * A match is marked live by hand, because kickoff can be delayed. So the minute
 * counter runs from went_live_at (when an official pressed the button), not from
 * kickoff_time. A match that starts 40 minutes late therefore shows 1' when it
 * really is 1', instead of reading 41'.
 *
 * Everything here is a pure function of the timestamps and a "now", so the same
 * logic can run on the server for the first paint and in the browser for the
 * ticking minute, and the two cannot disagree.
 *
 * Why compute rather than store the minute: there is no scheduler on this site,
 * so a stored minute would only advance when somebody saved the fixture. A
 * derived minute is always correct, costs nothing, and cannot drift.
 */

/** A football half is 45 minutes; the clock runs to 90 plus stoppage. */
const HALF = 45;
const FULL = 90;
/** Real minutes between kickoff and the second-half restart on this clock. */
export const SECOND_HALF_OFFSET_MINUTES = HALF + 15;

export type LiveClock = {
  /** Display string, e.g. "23'", "45+2'", "90+3'". */
  label: string;
  /** Minutes elapsed, uncapped, for sorting and for tests. */
  minutes: number;
  /** True once the match has passed 90 minutes plus the stoppage allowance. */
  over: boolean;
};

/**
 * Minutes elapsed since the match went live.
 *
 * Returns null when the fixture is not live, or has no went_live_at - a live
 * fixture with no start time cannot show an honest minute, so it shows none
 * rather than inventing 0'.
 */
export function elapsedMinutes(wentLiveAt: string | null, now: Date): number | null {
  if (!wentLiveAt) return null;
  const started = Date.parse(wentLiveAt);
  if (Number.isNaN(started)) return null;
  const diff = now.getTime() - started;
  // A clock in the future means the two machines disagree, or the row was set
  // wrong. Clamp to 0 rather than rendering a negative minute.
  if (diff < 0) return 0;
  return Math.floor(diff / 60_000);
}

/**
 * The clock as a fan reads it.
 *
 * The clock reserves 15 real minutes after 45' for first-half stoppage and the
 * break. Half time itself is the explicit "halftime" status, not a guess from
 * the clock, so 45-59 minutes elapsed reads as first-half stoppage (45+1' to
 * 45+15'). When a match goes from halftime back to live, went_live_at is set
 * SECOND_HALF_OFFSET_MINUTES in the past (see secondHalfStart), so the second
 * half restarts at 46' however long the first half actually ran.
 */
export function liveClock(wentLiveAt: string | null, now: Date): LiveClock | null {
  const elapsed = elapsedMinutes(wentLiveAt, now);
  if (elapsed === null) return null;

  if (elapsed >= HALF && elapsed < SECOND_HALF_OFFSET_MINUTES) {
    return { label: `45+${elapsed - HALF + 1}'`, minutes: elapsed, over: false };
  }

  // After the reserved 15 minutes, the second half runs from 46' (the clock does
  // not count the break, because football minutes do not).
  //
  // Both halves are 1-based: football has no minute 0, so the first minute of the
  // match is 1'. Elapsed 0-44 minutes therefore reads 1'-45'.
  const footballMinute = elapsed < HALF ? elapsed + 1 : elapsed - SECOND_HALF_OFFSET_MINUTES + HALF + 1;

  if (footballMinute > FULL) {
    // Stoppage time, capped so a forgotten fixture does not read 400'.
    const added = Math.min(footballMinute - FULL, 15);
    return { label: `90+${added}'`, minutes: elapsed, over: true };
  }

  return { label: `${Math.max(footballMinute, 0)}'`, minutes: elapsed, over: false };
}

/**
 * The went_live_at that makes the clock read 46' at `now`: used when a match
 * moves from halftime back to live.
 */
export function secondHalfStart(now: Date): string {
  return new Date(now.getTime() - SECOND_HALF_OFFSET_MINUTES * 60_000).toISOString();
}

/**
 * Whether a live fixture has been live long enough that it has probably finished.
 *
 * Nothing flips the status automatically - the club decides when a match is over.
 * This is only used to flag it in the admin list, so a fixture left live after
 * everyone went home is visible rather than silently wrong.
 */
export function looksFinished(wentLiveAt: string | null, now: Date): boolean {
  const elapsed = elapsedMinutes(wentLiveAt, now);
  if (elapsed === null) return false;
  return elapsed > FULL + 15 + 20; // 90' + 15' interval + 20' stoppage allowance
}
