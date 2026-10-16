-- Add formation to fixtures and pitch coordinates to lineups.
--
-- The club wants specific football positions (CB, RB, CDM, etc.) and a visual
-- pitch showing where each player is assigned. This migration adds:
--   1. fixtures.formation — the tactical shape (e.g. "4-4-2")
--   2. lineups.pitch_x, lineups.pitch_y — percentage coordinates (0-100) for
--      rendering the player on a pitch diagram

-- 1. Formation on the fixture.
alter table public.fixtures
  add column if not exists formation text;

comment on column public.fixtures.formation is
  'Tactical formation, e.g. "4-4-2", "4-3-3". Null when not set.';

-- 2. Pitch coordinates on each lineup row.
alter table public.lineups
  add column if not exists pitch_x numeric(5,2),
  add column if not exists pitch_y numeric(5,2);

comment on column public.lineups.pitch_x is
  'Horizontal position on the pitch diagram, 0 (left) to 100 (right).';
comment on column public.lineups.pitch_y is
  'Vertical position on the pitch diagram, 0 (goal line) to 100 (halfway line).';

-- 3. Constraints: coordinates must be within the pitch.
alter table public.lineups
  add constraint lineups_pitch_x_range check (pitch_x >= 0 and pitch_x <= 100),
  add constraint lineups_pitch_y_range check (pitch_y >= 0 and pitch_y <= 100);

-- 4. Formation must be a valid pattern (e.g. "4-4-2", "4-3-3", "3-5-2").
--    Stored as text so the club can use any shape, but the pattern is constrained.
alter table public.fixtures
  add constraint fixtures_formation_format
  check (formation is null or formation ~ '^[1-9]-[1-9](-[1-9](-[1-9])?)?$');
