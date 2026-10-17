-- Add gallery to the media_purpose CHECK constraint.
--
-- The original constraint only allowed the original purposes plus 'site'.
-- Gallery uploads were reaching storage but the audit row insert failed
-- because purpose='gallery' violated the constraint.

alter table public.media_uploads drop constraint if exists media_purpose;
alter table public.media_uploads add constraint media_purpose
  check (purpose = any (array['sponsor', 'news', 'player', 'opponent', 'site', 'gallery']));
