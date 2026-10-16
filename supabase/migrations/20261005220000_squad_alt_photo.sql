-- Alternate squad photo, so an uploaded player can have the same hover
-- portrait the bundled players already have.
--
-- The staff table has carried photo_url_alt since 20261005180000, so the column
-- name and behaviour match rather than inventing a second convention.
--
-- The public grant on squad is column-level (date_of_birth is withheld), so the
-- new column has to be added to that list explicitly. A column added later is not
-- covered by an earlier grant, and without this the public query fails with
-- permission denied rather than returning null.

alter table public.squad
  add column if not exists photo_url_alt text;

comment on column public.squad.photo_url_alt is
  'Alternate portrait shown on hover, matching the player card double-photo effect. Optional.';

grant select (photo_url_alt) on public.squad to anon, authenticated;
