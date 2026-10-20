-- Let admins write to the audit log.
--
-- 20261020120000_admin_audit_log.sql granted only SELECT, so every
-- logAdminAction insert was rejected by RLS and the log stayed empty.
--
-- An admin may insert a row only as themselves, with the role they actually
-- hold: actor_email must be the signed-in email and has_role(actor_role) must
-- be true. No update or delete is granted, so entries stay immutable.

create policy "Admins can record their own actions"
  on public.admin_audit_log for insert to authenticated
  with check (
    actor_email = lower((select auth.jwt() ->> 'email'))
    and public.has_role(actor_role)
  );

grant insert on public.admin_audit_log to authenticated;
