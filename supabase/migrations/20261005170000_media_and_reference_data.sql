-- Media library: storage buckets, upload policies, and a record of what was uploaded.
--
-- Phase 5 groundwork, plus the two things this adds on top of it:
--
--   * image upload for every photo field (sponsors, news, players, opponents)
--   * dropdowns for values the club already knows (competitions, positions, venues)
--
-- On buckets: one bucket per task rather than one shared bucket. The alternative is
-- a "purpose" column nobody filters on, and the alternative to a purpose column is
-- a public URL that gives no clue what it is for. Separate buckets also mean a
-- bucket-level storage quota can be set per task later.
--
-- On who can upload: fixtures editors and super admins for match imagery (opponent
-- logos), content editors and super admins for news and player photos, super admins
-- for sponsor logos, because sponsorship is a commercial relationship rather than
-- editorial content. That mirrors SCREEN_ACCESS in src/lib/admin/role-constants.ts.
--
-- Every bucket is public-read. These are brand marks, press photographs and squad
-- portraits shown on public pages; they benefit from CDN caching, and requiring a
-- signed URL would mean every public page render fetches a fresh signed URL for
-- every image. Nothing confidential goes in these buckets - player date of birth
-- lives in a table with column-level grants, not here.

-- =============================================================================
-- Buckets
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('sponsor-logos', 'sponsor-logos', true, 2097152,
   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('news', 'news', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('players', 'players', true, 4194304,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('opponents', 'opponents', true, 2097152,
   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- No comment on storage.buckets: that table belongs to Supabase's storage role and
-- COMMENT requires ownership, so the statement fails with 42501. The bucket names
-- and their purposes are documented here and in the policies below instead.

-- =============================================================================
-- Public read
-- =============================================================================
-- storage.objects already has RLS enabled; these four policies are the read side.
create policy "Public can view sponsor logos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'sponsor-logos');

create policy "Public can view news images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'news');

create policy "Public can view player photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'players');

create policy "Public can view opponent logos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'opponents');

-- =============================================================================
-- Writes
-- =============================================================================
-- Insert-only on upload. Update is deliberately absent: overwriting a file in
-- place means a published page changes without anyone editing a record, which is
-- exactly the kind of silent change the audit log in Phase 5 exists to catch. To
-- replace an image, upload a new one and point the record at it.

create policy "Content editors can upload news images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'news'
    and public.has_any_role(array['content', 'super_admin'])
  );

create policy "Content editors can upload player photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'players'
    and public.has_any_role(array['content', 'fixtures', 'super_admin'])
  );

create policy "Fixture editors can upload opponent logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'opponents'
    and public.has_any_role(array['fixtures', 'super_admin'])
  );

create policy "Super admins can upload sponsor logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sponsor-logos'
    and public.has_role('super_admin')
  );

-- Deletion is super-admin only, across all four buckets. A removed image may be
-- referenced by a published article, so removing one is a judgement about live
-- pages rather than a per-task decision.
create policy "Super admins can delete media"
  on storage.objects for delete to authenticated
  using (public.has_role('super_admin'));

-- =============================================================================
-- Upload log
-- =============================================================================
-- Not the library itself: storage.objects is the library. This records WHO put a
-- file there and for which task, which storage.objects does not carry. With six
-- admins, "where did this image come from" needs an answer that survives the
-- person leaving.
create table public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  -- The storage object name, which is the path within the bucket.
  object_path text not null,
  -- The absolute public URL handed to the form.
  public_url text not null,
  -- Which form uploaded it: "sponsor", "news", "player", "opponent". Kept even
  -- though it mirrors the bucket, because a record's purpose is the useful fact
  -- and the bucket is only a storage detail.
  purpose text not null,
  original_filename text,
  -- The admin who uploaded it. Taken from the auth user, never from the form.
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),

  constraint media_bucket check (bucket in ('sponsor-logos', 'news', 'players', 'opponents')),
  constraint media_purpose check (purpose in ('sponsor', 'news', 'player', 'opponent', 'site')),
  constraint media_object_path_length check (char_length(object_path) between 1 and 400),
  constraint media_public_url_length check (char_length(public_url) between 1 and 500),
  constraint media_filename_length check (original_filename is null or char_length(original_filename) <= 255)
);

create index media_uploads_bucket_idx on public.media_uploads (bucket, uploaded_at desc);
create index media_uploads_uploaded_by_idx on public.media_uploads (uploaded_by);

comment on table public.media_uploads is
  'Audit of uploads: who put which file in which bucket. The files themselves live in storage.objects.';

alter table public.media_uploads enable row level security;

-- The log is an audit record, so it is read-only to admins and written only by the
-- upload action. There is no insert policy: uploads insert through the service of a
-- server action that sets uploaded_by from the session, and an admin cannot forge
-- that column from the browser.
create policy "Admins can read the upload log"
  on public.media_uploads for select to authenticated
  using (public.has_any_role(array['fixtures', 'content', 'super_admin']));

grant select on public.media_uploads to authenticated;

-- =============================================================================
-- Reference data for dropdowns
-- =============================================================================
-- The club competes in a known, small set of competitions. Storing them as rows
-- means adding a competition is an admin action, not a deploy, and every dropdown
-- reads the same list.
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  -- Stable identifier used by the public fixture filters, so a competition can be
  -- renamed without breaking /matches?competition=... links.
  slug text not null,
  name text not null,
  short_name text not null,
  -- Display order in dropdowns, most important first.
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint competition_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint competition_name_length check (char_length(name) between 1 and 120),
  constraint competition_short_length check (char_length(short_name) between 1 and 40)
);

create unique index competitions_slug_unique on public.competitions (slug);

insert into public.competitions (slug, name, short_name, sort_order) values
  ('lfa-womens-first-division', 'LFA Women''s First Division', 'First Division', 1),
  ('womens-orange-cup', 'Women''s Orange Cup', 'Orange Cup', 2),
  ('club-friendlies', 'Club Friendlies', 'Friendlies', 3);

alter table public.competitions enable row level security;

create policy "Anyone can read active competitions"
  on public.competitions for select to anon, authenticated
  using (is_active);

-- Super admins curate the list. A fixtures admin adding a competition would change
-- every public filter, which is a site-wide change.
create policy "Super admins can manage competitions"
  on public.competitions for all to authenticated
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

grant select on public.competitions to anon, authenticated;
grant insert, update, delete on public.competitions to authenticated;

comment on table public.competitions is
  'Competitions the club plays in. Curated by super admins so dropdowns stay consistent across every admin screen.';

-- =============================================================================
-- Opponent logos
-- =============================================================================
-- Added to fixtures rather than a separate opponents table: a logo belongs to the
-- club that was played, and the same opponent appears across many seasons. Kept on
-- the fixture so a past match can show the logo that was correct at the time.
alter table public.fixtures add column opponent_logo_url text;
alter table public.fixtures add column opponent_logo_alt text;

comment on column public.fixtures.opponent_logo_url is
  'Public URL of the opponent crest. Null falls back to the opponent initials shown on the match card.';