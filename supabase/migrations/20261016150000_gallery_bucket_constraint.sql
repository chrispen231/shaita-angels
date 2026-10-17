-- Add gallery to the media_bucket CHECK constraint.
--
-- The original constraint only allowed the four original buckets.
-- The gallery bucket was added later but the constraint was not updated,
-- so INSERTs with bucket = 'gallery' fail.

alter table public.media_uploads drop constraint if exists media_bucket;
alter table public.media_uploads add constraint media_bucket
  check (bucket = any (array['sponsor-logos', 'news', 'players', 'opponents', 'gallery']));
