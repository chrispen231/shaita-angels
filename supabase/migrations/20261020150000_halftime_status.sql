-- Add a "halftime" match status.
--
-- A match at halftime has started but is paused. It carries a scoreline (the
-- score at the break) but the clock is stopped. It is not "live" (the minute
-- counter does not run) and not "played" (the match is not over).

-- 1. Allow the new status.
alter table public.fixtures drop constraint if exists fixtures_status_check;
alter table public.fixtures add constraint fixtures_status_check
  check (status = any (array['scheduled', 'played', 'live', 'halftime', 'postponed', 'cancelled']));

-- 2. Relax the score constraint for halftime matches.
--
-- Like a live match, a halftime match accepts either a complete scoreline or
-- none at all, but never half a pair.
alter table public.fixtures drop constraint if exists fixtures_scores_match_status;
alter table public.fixtures add constraint fixtures_scores_match_status
  check (
    (status = 'played'
      and shaita_goals is not null
      and opponent_goals is not null)
    or (status in ('live', 'halftime')
      and ((shaita_goals is null and opponent_goals is null)
        or (shaita_goals is not null and opponent_goals is not null)))
    or (status not in ('played', 'live', 'halftime')
      and shaita_goals is null
      and opponent_goals is null)
  );