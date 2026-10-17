-- Fix the gallery publish policy.
--
-- The original policy in 20261016130000_gallery.sql used:
--   where id = auth.uid() and role = 'super_admin'
-- but site_admins has no `id` column -- it is keyed by email. The EXISTS
-- subquery was therefore always false, so the publish UPDATE matched zero
-- rows and returned success without changing anything.
--
-- Every other admin policy in this schema uses the email-based has_role()
-- helper. This replaces the broken policy with that established pattern.

drop policy if exists "Super admins can publish gallery photos" on public.media_uploads;

create policy "Super admins can publish gallery photos"
  on public.media_uploads for update
  to authenticated
  using (purpose = 'gallery' and public.has_role('super_admin'))
  with check (purpose = 'gallery' and public.has_role('super_admin'));
