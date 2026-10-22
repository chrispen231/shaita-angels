"use client";

import { useCallback, useSyncExternalStore } from "react";
import { liveClock } from "@/lib/fixtures/live-clock";

/**
 * The live minute, ticking.
 *
 * A client component because the minute has to advance without a reload.
 *
 * The label is read through useSyncExternalStore with the clock as the external
 * store. The server renders a plain "LIVE" (the server snapshot), and hydration
 * renders the same, so the two cannot disagree; the browser then swaps in the
 * minute straight after hydrating. Rendering the minute on the server instead
 * would mismatch whenever the server and browser clocks fall either side of a
 * minute boundary.
 *
 * The tick is aligned to went_live_at rather than a fixed interval: the minute
 * changes 60 seconds after the match went live, not on the wall clock's minute,
 * so the timer waits for that boundary each time.
 *
 * The value is computed from went_live_at on every tick, never incremented, so a
 * laptop that sleeps for ten minutes wakes up showing the right minute instead of
 * ten minutes behind.
 */
export default function LiveClock({ wentLiveAt }: { wentLiveAt: string | null }) {
  const subscribe = useCallback(
    (onTick: () => void) => {
      const started = wentLiveAt ? Date.parse(wentLiveAt) : NaN;
      let timeout: ReturnType<typeof setTimeout>;

      const schedule = () => {
        const sinceStart = Number.isNaN(started) ? Date.now() : Date.now() - started;
        const msToNextMinute = 60_000 - (((sinceStart % 60_000) + 60_000) % 60_000);
        // A hair past the boundary, to avoid re-reading the old minute.
        timeout = setTimeout(() => {
          onTick();
          schedule();
        }, msToNextMinute + 50);
      };

      schedule();
      return () => clearTimeout(timeout);
    },
    [wentLiveAt],
  );

  const readLabel = () => liveClock(wentLiveAt, new Date())?.label ?? null;
  const label = useSyncExternalStore(subscribe, readLabel, () => null);

  if (label === null) return <span className="live-minute">LIVE</span>;

  return (
    <span className="live-minute" aria-label={`${label} played`}>
      {label}
    </span>
  );
}
