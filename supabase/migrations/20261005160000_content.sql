-- News articles and honours, plus the real squad and the 24 confirmed players.
--
-- Phase 4 of docs/admin-spec.md. This is the phase that changes who can publish
-- the site: articles, honours and the squad list move out of src/data/site.ts and
-- into the database, so the club publishes without a developer.
--
-- What deliberately does NOT move:
--
--   * navigation and sections (src/data/site.ts) stay in code. They are part of
--     the site's structure rather than its content: changing them is a design
--     decision, and putting them behind an editor would mean a mistyped click
--     could remove a page from the navigation.
--
--   * gallery stays in code for now. It is a small fixed set tied to bundled
--     image assets, and the media library in Phase 5 is the right home for it.
--
-- On the squad: public.squad already exists, created in
-- 20261005150000_match_content.sql for match lineups. This migration seeds it with
-- the club's 24 confirmed players rather than creating a second table, so a
-- player added here is immediately available to the match editor's lineup.
--
-- The squad rows below set no date_of_birth, because the club has not supplied
-- one for any player. is_minor therefore stays false for all of them, which is the
-- honest value: an unknown birth date is not evidence that a player is an adult.
-- A contributor entering a date of birth later triggers squad_sync_is_minor and
-- the flag corrects itself.

-- =============================================================================
-- Articles
-- =============================================================================
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  category text not null,
  -- Stored as a date so the newsroom can order and filter properly. The public
  -- pages render it in the club's existing long form ("14 July 2026").
  published_on date not null,
  title text not null,
  excerpt text not null,
  image_path text,
  image_alt text,
  -- One paragraph per array element, matching how the articles are written and
  -- rendered. An empty string is a deliberate paragraph break in an article.
  body text[] not null default '{}',
  is_featured boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint article_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint article_slug_length check (char_length(slug) between 1 and 120),
  constraint article_title_length check (char_length(title) between 1 and 200),
  constraint article_excerpt_length check (char_length(excerpt) between 1 and 400),
  constraint article_category_length check (char_length(category) between 1 and 60),
  constraint article_image_alt_length check (image_alt is null or char_length(image_alt) <= 200),
  -- An article with no paragraphs would render as an empty page.
  constraint article_body_present check (array_length(body, 1) between 1 and 60)
);

-- Slugs are the public URL, so they must be unique. Only among published rows:
-- an unpublished draft may reuse a slug, because it is not reachable, and forcing
-- uniqueness there would block the common "duplicate this to revise it" workflow.
create unique index articles_published_slug_unique
  on public.articles (slug)
  where is_published;

create index articles_published_on_idx
  on public.articles (published_on desc)
  where is_published;

comment on column public.articles.body is
  'One paragraph per element. Rendered in order; an empty string is a paragraph break.';

-- =============================================================================
-- Honours
-- =============================================================================
create table public.honors (
  id uuid primary key default gen_random_uuid(),
  -- Free text because honours span single seasons ("2026") and campaigns
  -- ("2022–23"), and forcing one format would lose real history.
  year_label text not null,
  name text not null,
  detail text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),

  constraint honor_year_length check (char_length(year_label) between 1 and 20),
  constraint honor_name_length check (char_length(name) between 1 and 120),
  constraint honor_detail_length check (detail is null or char_length(detail) <= 200)
);

create index honors_sort_idx on public.honors (sort_order);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.articles enable row level security;
alter table public.honors enable row level security;

create policy "Anyone can read published articles"
  on public.articles for select to anon, authenticated
  using (is_published);

create policy "Anyone can read published honours"
  on public.honors for select to anon, authenticated
  using (is_published);

-- Content editors and super admins, matching SCREEN_ACCESS in
-- src/lib/admin/role-constants.ts. A fixtures admin cannot publish a story.
create policy "Content editors can manage articles"
  on public.articles for all to authenticated
  using (public.has_any_role(array['content', 'super_admin']))
  with check (public.has_any_role(array['content', 'super_admin']));

create policy "Content editors can manage honours"
  on public.honors for all to authenticated
  using (public.has_any_role(array['content', 'super_admin']))
  with check (public.has_any_role(array['content', 'super_admin']));

grant usage on schema public to anon, authenticated;
grant select on public.articles, public.honors to anon, authenticated;
grant insert, update, delete on public.articles, public.honors to authenticated;

-- =============================================================================
-- Seed: the club's honours
-- =============================================================================
insert into public.honors (year_label, name, detail, sort_order, is_published) values
  ('2026', 'Orange Cup', 'Winners · beat World Girls 2–1', 1, true),
  ('2024', 'Orange Cup', 'Winners · 4–3 on penalties', 2, true),
  ('2024–25', 'LFA Women''s Super Cup', 'Winners · 1–1, won 4–3 on penalties', 3, true),
  ('2022–23', 'Women''s Lower League', 'Champions · promoted to the First Division', 4, true);

-- =============================================================================
-- Seed: the 24 confirmed players
-- =============================================================================
-- Position groups are collapsed to the singular position per player, because the
-- public squad page filters on a single position value. The plural group names in
-- site.ts ("Goalkeepers") were a display grouping, not a per-player attribute.
--
-- sort_order follows shirt number so the seeded order matches the squad page the
-- club is used to seeing. shirt_number is the club's squad number, which is
-- distinct from the per-match number a lineup carries.
insert into public.squad (full_name, position, shirt_number, sort_order, is_published) values
  ('Asata Dulleh',          'Goalkeeper',  1,  1, true),
  ('Rebecca Tarr',          'Defender',    2,  2, true),
  ('Blessing King',         'Goalkeeper', 30, 30, true),
  ('Francisca T. Howe',     'Defender',    4,  4, true),
  ('Esther Massalay',       'Defender',    5,  5, true),
  ('Comfort Osei Frimpong', 'Defender',    6,  6, true),
  ('Celestina Boye',        'Defender',    7,  7, true),
  ('Kumba Kuyateh',         'Forward',     8,  8, true),
  ('Sarah Abrafi',          'Forward',     9,  9, true),
  ('Lucy Gbeh Kikeh',       'Forward',    10, 10, true),
  ('Kaddy Jarju',           'Forward',    11, 11, true),
  ('Sylvia Pyne',           'Midfielder', 12, 12, true),
  ('Blessing Kerkulah',     'Defender',   13, 13, true),
  ('Malusu Blama',          'Defender',   14, 14, true),
  ('Salimata Saidykhan',    'Midfielder', 15, 15, true),
  ('Deborah Nyarko',        'Midfielder', 16, 16, true),
  ('Oretha R. Tokpah',      'Defender',   17, 17, true),
  ('Christine Kouadio',     'Midfielder', 18, 18, true),
  ('Marie Pascale Lorignon','Midfielder', 19, 19, true),
  ('Ganiyat Adeleke',       'Midfielder', 20, 20, true),
  ('Aline Capehart',        'Defender',   21, 21, true),
  ('Miatta Morris',         'Forward',    22, 22, true),
  ('Albertha N. Pratt',     'Goalkeeper', 27, 27, true),
  ('Haddy Wally',           'Forward',    29, 29, true);

-- =============================================================================
-- Seed: the three existing articles
-- =============================================================================
insert into public.articles
  (slug, category, published_on, title, excerpt, image_path, image_alt, body, is_featured, is_published, sort_order)
values
  (
    'orange-cup-champions-2026',
    'Trophy room',
    '2026-07-14',
    'The Angels bring the Orange Cup back to Careysburg',
    'Shaita Angels closed the season with a 2–1 victory over World Girls in the 2026 Orange Cup final.',
    '/orange-cup-2026.jpg',
    'Shaita Angels and supporters celebrate winning the 2026 Orange Cup',
    array[
      'Shaita Angels finished the 2025–26 campaign with silverware, defeating World Girls 2–1 in the Orange Cup final at the SKD Sports Complex Practice Pitch.',
      'The cup win followed a narrow miss in the league title race. The Angels pushed Determine Girls to the final day before a goalless draw settled the championship. The response in the cup final gave the Careysburg club a second Orange Cup title, following its 2024 triumph.',
      'The result added another chapter to a club story that began in 2019 with a group of Careysburg kickball players choosing to take on football.'
    ],
    true, true, 1
  ),
  (
    'one-point-from-history-2026',
    'Match report',
    '2026-07-10',
    'One point from history',
    'A final-day draw with Determine Girls left Shaita Angels just short of a first LFA Women''s First Division title.',
    '/gallery-3.jpg',
    'Shaita Angels players ready for a match',
    array[
      'The 2025–26 LFA Women''s First Division came down to its final fixture. Shaita Angels and Determine Girls played out a 0–0 draw, allowing Determine Girls to retain the title by a single point.',
      'Shaita entered the match knowing a win would deliver the club''s first First Division title. The campaign still ended with a major achievement: a second-place league finish and, days later, the Orange Cup trophy.'
    ],
    false, true, 2
  ),
  (
    'orange-cup-winners-2024',
    'Club history',
    '2024-01-01',
    'A first Orange Cup, decided from the spot',
    'A 0–0 final against World Girls went to penalties, where Shaita Angels claimed the 2024 cup.',
    '/gallery-1.jpg',
    'Shaita Angels players celebrate together on the pitch',
    array[
      'Shaita Angels won the 2024 Women''s Orange Cup after a goalless final against World Girls. The Angels converted four penalties to win the shootout 4–3 and secure the club''s first Orange Cup.',
      'That cup run followed the club''s 2022–23 Women''s Lower League championship and promotion to the First Division, then a runner-up finish in the 2023–24 LFA Women''s First Division.'
    ],
    false, true, 3
  );

-- =============================================================================
-- updated_at
-- =============================================================================
drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();