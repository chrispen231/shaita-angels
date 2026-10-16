-- Fix the media_uploads audit log.
--
-- 20261005170000 enabled RLS on media_uploads and created only a SELECT policy,
-- with a comment claiming the upload action "inserts through the service of a
-- server action" and so needs no insert policy. That is wrong: the upload action
-- runs with the admin's own session, not the service role, so with RLS on and no
-- INSERT policy every audit row was denied. Storage received the file (40 objects
-- exist) while media_uploads stayed empty, so the audit trail silently never
-- worked.
--
-- The policy grants insert to signed-in admins and pins uploaded_by to the
-- caller's own address, so the column still cannot be forged from the browser.
-- Reads stay restricted to the roles that already had them.

create policy "Admins can log their own uploads"
  on public.media_uploads for insert to authenticated
  with check (
    public.has_any_role(array['fixtures', 'content', 'super_admin'])
    and lower(uploaded_by) = lower((select auth.jwt() ->> 'email'))
  );

grant insert on public.media_uploads to authenticated;

comment on table public.media_uploads is
  'Audit of uploads: who put which file in which bucket. Insert is restricted to signed-in admins and uploaded_by must equal the caller, so an upload cannot be attributed to someone else.';
