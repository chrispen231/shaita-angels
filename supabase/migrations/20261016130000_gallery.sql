-- Add gallery bucket and is_published column to media_uploads.
--
-- The public /media page will query published gallery photos from the
-- media_uploads table instead of using hardcoded image paths.

-- 1. New bucket for gallery photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery',
  'gallery',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- 2. is_published column on media_uploads.
alter table public.media_uploads
  add column if not exists is_published boolean not null default false;

comment on column public.media_uploads.is_published is
  'Whether this upload is visible on the public site. Only super admins can change this.';

-- 3. RLS: anyone can read published gallery photos.
create policy "Anyone can read published gallery photos"
  on public.media_uploads for select
  to anon, authenticated
  using (purpose = 'gallery' and is_published = true);

-- 4. RLS: super admins can update is_published.
create policy "Super admins can publish gallery photos"
  on public.media_uploads for update
  to authenticated
  using (purpose = 'gallery' and exists (
    select 1 from public.site_admins
    where id = auth.uid() and role = 'super_admin'
  ))
  with check (purpose = 'gallery' and exists (
    select 1 from public.site_admins
    where id = auth.uid() and role = 'super_admin'
  ));
