-- Security fixes from the 2026-10-21 review.
--
--   1. Gallery deletes. 20261016140000 created "Super admins can delete gallery
--      photos" with no role check, so any signed-in user could delete every
--      gallery object. Storage policies are OR'd, and "Super admins can delete
--      media" (20261005170000) already covers every bucket for super admins, so
--      the gallery policy is dropped rather than repaired.
--
--   2. Upload log inserts. The insert policy from 20261005210000 let any admin
--      insert a row with is_published = true, publishing straight to /media and
--      skipping the super-admin publish step. New rows must now start
--      unpublished. The public page also stops trusting public_url and derives
--      the URL from bucket and object_path.
--
--   3. date_of_birth. 20261005150000 granted the column to every authenticated
--      user, and the published-squad read policy applies to authenticated too, so
--      any signed-in account could read players' birth dates. The grant is
--      revoked; squad editors read it through squad_dates_of_birth(), which
--      checks the role.
--
--   4. Squad role. The admin UI, role descriptions and spec give the squad to
--      content editors, but RLS gave it to fixture editors. Writes move to
--      content and super admin. Fixture editors keep read access because the
--      match editor matches lineup names against the squad.

-- =============================================================================
-- 1. Gallery deletes
-- =============================================================================
drop policy if exists "Super admins can delete gallery photos" on storage.objects;

-- =============================================================================
-- 2. Upload log inserts start unpublished
-- =============================================================================
drop policy if exists "Admins can log their own uploads" on public.media_uploads;

create policy "Admins can log their own uploads"
  on public.media_uploads for insert to authenticated
  with check (
    public.has_any_role(array['fixtures', 'content', 'super_admin'])
    and lower(uploaded_by) = lower((select auth.jwt() ->> 'email'))
    and is_published = false
  );

-- =============================================================================
-- 3. date_of_birth
-- =============================================================================
revoke select (date_of_birth) on public.squad from authenticated;

create function public.squad_dates_of_birth()
  returns table (id uuid, date_of_birth date)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select s.id, s.date_of_birth
    from public.squad s
   where public.has_any_role(array['content', 'super_admin']);
$$;

comment on function public.squad_dates_of_birth() is
  'Dates of birth for the admin squad screen. Returns no rows unless the caller is a content editor or super admin; no role has a column grant on squad.date_of_birth.';

revoke execute on function public.squad_dates_of_birth() from public, anon;
grant execute on function public.squad_dates_of_birth() to authenticated;

comment on table public.squad is
  'Squad list. date_of_birth is club-confidential: no role has a column grant on it, and editors read it through squad_dates_of_birth(). is_minor is derived, not stored.';

-- =============================================================================
-- 4. Squad writes belong to content editors
-- =============================================================================
drop policy if exists "Fixture editors can manage the squad" on public.squad;

create policy "Content editors can manage the squad"
  on public.squad for all to authenticated
  using (public.has_any_role(array['content', 'super_admin']))
  with check (public.has_any_role(array['content', 'super_admin']));

create policy "Fixture editors can read the squad"
  on public.squad for select to authenticated
  using (public.has_role('fixtures'));
