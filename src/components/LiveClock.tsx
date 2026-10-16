"use client";

import { useEffect, useState } from "react";
import { liveClock } from "@/lib/fixtures/live-clock";

/**
 * The live minute, ticking.
 *
 * A client component because the minute has to advance without a reload. The
 * server renders the first value (so the badge is correct before hydration and
 * for a reader with JavaScript off), then this takes over.
 *
 * The tick is aligned to the wall clock rather than a fixed interval: a 60s
 * setInterval started at 12:00:47 would show a new minute 47 seconds late. This
 * waits for the next minute boundary, then every 60 seconds after it, so the
 * displayed minute matches the real one.
 *
 * The value is computed from went_live_at on every tick, never incremented, so a
 * laptop that sleeps for ten minutes wakes up showing the right minute instead of
 * ten minutes behind.
 */
export default function LiveClock({ wentLiveAt }: { wentLiveAt: string | null }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    // First tick lands on the next minute boundary, so the change is not late.
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMinute + 50); // a hair past the boundary, to avoid re-reading the old minute

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const clock = liveClock(wentLiveAt, now);
  if (!clock) return <span className="live-minute">LIVE</span>;

  return (
    <span className="live-minute" aria-label={`${clock.label} played`}>
      {clock.label}
    </span>
  );
}
