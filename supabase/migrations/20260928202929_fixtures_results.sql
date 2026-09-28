-- Match-centre data. Public visitors can read published rows; admins can manage
-- rows only after their verified Supabase Auth email is added to site_admins.
create table public.site_admins (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint site_admins_email_lowercase check (email = lower(email))
);

alter table public.site_admins enable row level security;
revoke all on table public.site_admins from anon, authenticated;
grant select on table public.site_admins to authenticated;

create policy "Admins can read their own membership"
  on public.site_admins
  for select
  to authenticated
  using (email = lower((select auth.jwt() ->> 'email')));

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  opponent text not null check (char_length(trim(opponent)) between 1 and 100),
  competition text not null check (char_length(trim(competition)) between 1 and 120),
  season text not null check (char_length(trim(season)) between 1 and 30),
  match_date date not null,
  kickoff_time time,
  venue text check (venue is null or char_length(trim(venue)) <= 160),
  venue_type text not null default 'home'
    check (venue_type in ('home', 'away', 'neutral')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'played', 'postponed', 'cancelled')),
  shaita_goals integer,
  opponent_goals integer,
  notes text check (notes is null or char_length(notes) <= 2000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint fixtures_scores_nonnegative check (
    (shaita_goals is null or shaita_goals >= 0)
    and (opponent_goals is null or opponent_goals >= 0)
  ),
  constraint fixtures_scores_match_status check (
    (status = 'played' and shaita_goals is not null and opponent_goals is not null)
    or (status <> 'played' and shaita_goals is null and opponent_goals is null)
  )
);

create index fixtures_match_date_idx on public.fixtures (match_date desc);
create index fixtures_published_status_date_idx
  on public.fixtures (status, match_date)
  where is_published;

alter table public.fixtures enable row level security;
revoke all on table public.fixtures from anon, authenticated;
grant select on table public.fixtures to anon, authenticated;
grant insert, update on table public.fixtures to authenticated;

create policy "Anyone can read published fixtures"
  on public.fixtures
  for select
  to anon, authenticated
  using (is_published);

create policy "Admins can read all fixtures"
  on public.fixtures
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.site_admins
      where email = lower((select auth.jwt() ->> 'email'))
    )
  );

create policy "Admins can insert fixtures"
  on public.fixtures
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.site_admins
      where email = lower((select auth.jwt() ->> 'email'))
    )
  );

create policy "Admins can update fixtures"
  on public.fixtures
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.site_admins
      where email = lower((select auth.jwt() ->> 'email'))
    )
  )
  with check (
    exists (
      select 1
      from public.site_admins
      where email = lower((select auth.jwt() ->> 'email'))
    )
  );

-- Preserve the confirmed final already shown on the site.
insert into public.fixtures (
  opponent,
  competition,
  season,
  match_date,
  venue,
  venue_type,
  status,
  shaita_goals,
  opponent_goals,
  is_published
)
values (
  'World Girls',
  'Women’s Orange Cup · Final',
  '2025–26',
  date '2026-07-14',
  'SKD Sports Complex Practice Pitch',
  'neutral',
  'played',
  2,
  1,
  true
);
