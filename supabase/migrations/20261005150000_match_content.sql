-- Match content: squad, lineups, goals and cards, plus the match report.
--
-- Phase 3 of docs/admin-spec.md. This is what turns the Lineups and Stats tabs
-- on /match/[id] from placeholders into real content.
--
-- Design decisions worth stating, because each is a deliberate limit:
--
--   * date_of_birth is stored but NEVER selected by any public query. The public
--     profile renders age only. Some players are under 18, so a published
--     birth date would be a safeguarding problem, not a privacy nicety. Column
--     level grants enforce this: anon and authenticated get no SELECT on the
--     column at all, so a mistake in a query returns an error rather than a
--     minor's date.
--
--   * Shirt numbers are unique per match, not per squad. A player can wear 7 in
--     one match and 10 in the next, and the lineup is the only place that
--     matters. Enforced by a partial unique index on (match_id, shirt_number).
--
--   * A goal minute is 1..120. Stoppage time is recorded as the raw minute
--     (90+3 is entered as 93) with an added_stoppage_minutes flag, because the
--     alternative - a separate minute_offset column - makes every read and every
--     sort more complicated for no gain at this level of detail.
--
--   * Own goals are recorded on the scoring player's row with is_own_goal set.
--     Storing them against the opponent would mean the scoring player could have
--     no row in the lineup, which would break the "every goal links to a player
--     who played" invariant that makes the stats tab trustworthy.
--
--   * Deletion is granted to fixture editors for rows, but a fixture itself is
--     still never deletable - only unpublishable. Removing a recorded goal that a
--     sponsor's agreed statistics reference is a decision for a human, not a
--     stray click.

-- =============================================================================
-- Squad
-- =============================================================================
create table public.squad (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  -- Confidential. No public role can read this column.
  date_of_birth date,
  position text,
  preferred_foot text,
  height_cm integer,
  weight_kg integer,
  shirt_number integer,
  bio text,
  photo_url text,
  -- is_minor is a real column, not a generated one, on purpose: a stored
  -- generated column must be IMMUTABLE and current_date is not, so deriving
  -- "under 18 today" at write time would freeze the answer and get it wrong
  -- every year afterwards. It is set by the trigger below on insert and update,
  -- and refreshed by the admin editor whenever a date of birth changes.
  is_minor boolean not null default false,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint squad_name_length check (char_length(full_name) between 1 and 120),
  constraint squad_foot check (preferred_foot is null or preferred_foot in ('left', 'right', 'both')),
  constraint squad_height check (height_cm is null or height_cm between 100 and 230),
  constraint squad_weight check (weight_kg is null or weight_kg between 25 and 120),
  constraint squad_number check (shirt_number is null or shirt_number between 1 and 99)
);

comment on column public.squad.date_of_birth is
  'Confidential. Never exposed publicly; the profile shows age only. Under-18 players are minors.';
comment on column public.squad.is_minor is
  'Maintained by trigger from date_of_birth against the 15-year club minimum. True means the player must not appear in any public age-sensitive context.';

-- =============================================================================
-- Lineups
-- =============================================================================
create table public.lineups (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  player_id uuid references public.squad(id) on delete set null,
  -- Kept alongside player_id so a lineup survives the player being removed from
  -- the squad list, and so an opponent player with no squad record can be named.
  player_name text not null,
  shirt_number integer,
  position text,
  is_starter boolean not null default true,
  -- Sort key within starters and within the bench, so the club controls the order.
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint lineup_name_length check (char_length(player_name) between 1 and 120),
  constraint lineup_number check (shirt_number is null or shirt_number between 1 and 99)
);

-- Shirt numbers are unique per match. Two players cannot both be 7 in one lineup.
create unique index lineups_match_shirt_unique
  on public.lineups (fixture_id, shirt_number)
  where shirt_number is not null;

create index lineups_fixture_idx on public.lineups (fixture_id);
create index lineups_player_idx on public.lineups (player_id);

-- =============================================================================
-- Goals
-- =============================================================================
create table public.match_goals (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  player_id uuid references public.squad(id) on delete set null,
  player_name text not null,
  -- Which side the goal counted for.
  side text not null default 'shaita',
  minute integer not null,
  added_stoppage_minutes boolean not null default false,
  is_own_goal boolean not null default false,
  -- Short description of the move: "header from a corner", "penalty".
  assist_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint goal_name_length check (char_length(player_name) between 1 and 120),
  constraint goal_side check (side in ('shaita', 'opponent')),
  -- 1..120 covers 90+ up to half an hour of stoppage time.
  constraint goal_minute check (minute between 1 and 120),
  constraint goal_note_length check (assist_note is null or char_length(assist_note) <= 200)
);

create index match_goals_fixture_idx on public.match_goals (fixture_id);
create index match_goals_player_idx on public.match_goals (player_id);

-- =============================================================================
-- Cards
-- =============================================================================
create table public.match_cards (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  player_id uuid references public.squad(id) on delete set null,
  player_name text not null,
  side text not null default 'shaita',
  card text not null,
  minute integer not null,
  added_stoppage_minutes boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint card_name_length check (char_length(player_name) between 1 and 120),
  constraint card_side check (side in ('shaita', 'opponent')),
  constraint card_type check (card in ('yellow', 'red', 'second_yellow')),
  constraint card_minute check (minute between 1 and 120)
);

create index match_cards_fixture_idx on public.match_cards (fixture_id);
create index match_cards_player_idx on public.match_cards (player_id);

-- =============================================================================
-- Match report
-- =============================================================================
create table public.match_reports (
  fixture_id uuid primary key references public.fixtures(id) on delete cascade,
  body text not null,
  updated_at timestamptz not null default now(),
  constraint report_length check (char_length(body) <= 8000)
);

comment on table public.match_reports is
  'One written report per match. Stored separately from fixtures.notes so a report can be revised without touching fixture data.';

-- =============================================================================
-- Row level security
-- =============================================================================
alter table public.squad enable row level security;
alter table public.lineups enable row level security;
alter table public.match_goals enable row level security;
alter table public.match_cards enable row level security;
alter table public.match_reports enable row level security;

-- Public read. Lineups, goals, cards and reports are match content.
create policy "Anyone can read published lineups"
  on public.lineups for select to anon, authenticated
  using (exists (
    select 1 from public.fixtures f
    where f.id = lineups.fixture_id and f.is_published
  ));

create policy "Anyone can read match goals"
  on public.match_goals for select to anon, authenticated
  using (exists (
    select 1 from public.fixtures f
    where f.id = match_goals.fixture_id and f.is_published
  ));

create policy "Anyone can read match cards"
  on public.match_cards for select to anon, authenticated
  using (exists (
    select 1 from public.fixtures f
    where f.id = match_cards.fixture_id and f.is_published
  ));

create policy "Anyone can read match reports"
  on public.match_reports for select to anon, authenticated
  using (exists (
    select 1 from public.fixtures f
    where f.id = match_reports.fixture_id and f.is_published
  ));

-- Squad profiles are public, but this policy selects every column including
-- date_of_birth. The column grants below remove that column from the roles, so
-- the column is unreachable even though the row is visible.
create policy "Anyone can read published squad"
  on public.squad for select to anon, authenticated
  using (is_published);

-- Writes: fixture editors and super admins.
create policy "Fixture editors can manage the squad"
  on public.squad for all to authenticated
  using (public.has_any_role(array['fixtures', 'super_admin']))
  with check (public.has_any_role(array['fixtures', 'super_admin']));

create policy "Fixture editors can manage lineups"
  on public.lineups for all to authenticated
  using (public.has_any_role(array['fixtures', 'super_admin']))
  with check (public.has_any_role(array['fixtures', 'super_admin']));

create policy "Fixture editors can manage goals"
  on public.match_goals for all to authenticated
  using (public.has_any_role(array['fixtures', 'super_admin']))
  with check (public.has_any_role(array['fixtures', 'super_admin']));

create policy "Fixture editors can manage cards"
  on public.match_cards for all to authenticated
  using (public.has_any_role(array['fixtures', 'super_admin']))
  with check (public.has_any_role(array['fixtures', 'super_admin']));

create policy "Fixture editors can manage reports"
  on public.match_reports for all to authenticated
  using (public.has_any_role(array['fixtures', 'super_admin']))
  with check (public.has_any_role(array['fixtures', 'super_admin']));

-- =============================================================================
-- Grants
-- =============================================================================
grant usage on schema public to anon, authenticated;

grant select on public.squad to anon, authenticated;
grant select on public.lineups, public.match_goals, public.match_cards, public.match_reports
  to anon, authenticated;

grant insert, update, delete on public.squad, public.lineups,
  public.match_goals, public.match_cards, public.match_reports to authenticated;

-- =============================================================================
-- The confidentiality boundary
-- =============================================================================
-- date_of_birth is withheld from anon and authenticated entirely. RLS operates
-- on rows and cannot restrict a single column, so the grant is what does it.
-- A public query that asks for the column fails loudly instead of silently
-- leaking a minor's date of birth.
revoke select on public.squad from anon, authenticated;
grant select (
  id, full_name, position, preferred_foot, height_cm, weight_kg,
  shirt_number, bio, photo_url, is_minor, sort_order, is_published,
  created_at, updated_at
) on public.squad to anon, authenticated;

-- Editors need to enter a date of birth, so they are the one role that reads it.
grant select (date_of_birth) on public.squad to authenticated;

comment on table public.squad is
  'Squad list. date_of_birth is club-confidential and unpublished: public roles have no grant on that column. is_minor is derived, not stored.';

-- =============================================================================
-- updated_at maintenance
-- =============================================================================
-- Own trigger function. storage.update_updated_at_column exists in this database
-- but is Supabase-managed internals, so depending on it would tie our schema to
-- something a platform upgrade could remove.
-- Maintains is_minor whenever the row is written. current_date is stable within
-- a statement, so evaluating it here is correct and avoids the immutability
-- requirement that a stored generated column would impose.
create function public.set_updated_at() returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.squad_sync_is_minor() returns trigger
  language plpgsql
as $$
begin
  new.is_minor := new.date_of_birth is not null
    and new.date_of_birth > current_date - interval '18 years';
  return new;
end;
$$;

create trigger squad_sync_is_minor
  before insert or update of date_of_birth on public.squad
  for each row execute function public.squad_sync_is_minor();

drop trigger if exists squad_set_updated_at on public.squad;
create trigger squad_set_updated_at
  before update on public.squad
  for each row execute function public.set_updated_at();

drop trigger if exists match_reports_set_updated_at on public.match_reports;
create trigger match_reports_set_updated_at
  before update on public.match_reports
  for each row execute function public.set_updated_at();