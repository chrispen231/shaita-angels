-- Add a "live" match status, plus the timestamp the clock runs from.
--
-- Option C by design: the club marks a match live by hand, because kickoff can be
-- delayed. The site therefore does NOT derive live from the scheduled time - a
-- match that kicks off 40 minutes late would otherwise show the wrong minute, and
-- a match that never kicks off would sit "live" forever.
--
-- went_live_at is stamped when the status first becomes 'live', so the minute
-- counter runs from the real kickoff rather than the scheduled one. It is only
-- set on the transition into live, so editing a live fixture does not restart the
-- clock.

-- 1. Allow the new status.
alter table public.fixtures drop constraint if exists fixtures_status_check;
alter table public.fixtures add constraint fixtures_status_check
  check (status = any (array['scheduled', 'played', 'live', 'postponed', 'cancelled']));

-- 2. The minute clock's start point.
alter table public.fixtures
  add column if not exists went_live_at timestamptz;

comment on column public.fixtures.went_live_at is
  'Set when the status becomes live, so the minute counter runs from the real kickoff. Null when the match has never been live.';

-- 3. Relax the score constraint for live matches.
--
-- The old rule was "played needs both scores, every other status carries neither",
-- which made a live scoreline impossible to store. A live match now accepts either
-- a complete scoreline or none at all - marking a match live at 0-0 should not
-- require typing the score first - but still refuses a half-filled pair, which is
-- always a mistake rather than a state.
alter table public.fixtures drop constraint if exists fixtures_scores_match_status;
alter table public.fixtures add constraint fixtures_scores_match_status
  check (
    (status = 'played'
      and shaita_goals is not null
      and opponent_goals is not null)
    or (status = 'live'
      and ((shaita_goals is null and opponent_goals is null)
        or (shaita_goals is not null and opponent_goals is not null)))
    or (status not in ('played', 'live')
      and shaita_goals is null
      and opponent_goals is null)
  );

-- 4. Correct the kickoff times.
--
-- Every stored time was 12 hours out: the club meant PM and the values were
-- entered as AM. 01:30 -> 13:30 and 04:00 -> 16:00. This matters beyond
-- cosmetics - the match page prints "Kick-off 04:00 local time", which was
-- telling fans the wrong hour.
update public.fixtures set kickoff_time = '13:30' where kickoff_time = '01:30';
update public.fixtures set kickoff_time = '16:00' where kickoff_time = '04:00';
