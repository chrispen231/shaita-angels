-- Club leadership profiles are managed by content admins and super admins,
-- then shown on the public /team/leadership page.

create table public.leadership (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,
  bio text,
  photo_url text,
  photo_alt text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint leadership_name_length check (char_length(full_name) between 1 and 120),
  constraint leadership_role_length check (char_length(role) between 1 and 120),
  constraint leadership_bio_length check (bio is null or char_length(bio) <= 2400),
  constraint leadership_photo_url_length check (photo_url is null or char_length(photo_url) <= 2048),
  constraint leadership_photo_alt_length check (photo_alt is null or char_length(photo_alt) <= 250),
  constraint leadership_sort_order check (sort_order between 0 and 9999)
);

comment on table public.leadership is
  'Public-facing Shaita Angels club leadership profiles, managed by content admins.';

create index leadership_order_idx on public.leadership (sort_order, full_name);

alter table public.leadership enable row level security;

create policy "Anyone can read published leadership profiles"
  on public.leadership for select to anon, authenticated
  using (is_published = true);

create policy "Content admins can manage leadership profiles"
  on public.leadership for all to authenticated
  using (public.has_any_role(array['content', 'super_admin']))
  with check (public.has_any_role(array['content', 'super_admin']));

-- Explicit grants keep the table available to the Data API as Supabase changes
-- the default exposure behavior for newly created public tables.
grant select on public.leadership to anon, authenticated;
grant insert, update, delete on public.leadership to authenticated;
revoke insert, update, delete on public.leadership from anon;

drop trigger if exists leadership_set_updated_at on public.leadership;
create trigger leadership_set_updated_at
  before update on public.leadership
  for each row execute function public.set_updated_at();

-- Give portraits a dedicated public bucket rather than classifying them as player
-- photos in the media library.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadership', 'leadership', true, 4194304,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "Public can view leadership portraits"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'leadership');

create policy "Content admins can upload leadership portraits"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'leadership'
    and public.has_any_role(array['content', 'super_admin'])
  );

-- Keep the image upload audit row aligned with the new bucket and purpose.
alter table public.media_uploads drop constraint if exists media_bucket;
alter table public.media_uploads add constraint media_bucket
  check (bucket = any (array['sponsor-logos', 'news', 'players', 'opponents', 'gallery', 'leadership']));

alter table public.media_uploads drop constraint if exists media_purpose;
alter table public.media_uploads add constraint media_purpose
  check (purpose = any (array['sponsor', 'news', 'player', 'opponent', 'site', 'gallery', 'leadership']));
