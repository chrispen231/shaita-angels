-- Role-aware fixture writes, and super-admin management of other admins.
--
-- Written after the first two phases were applied and signed in to. Two changes:
--
--   1. The fixture write policies created in 20260928202929 check membership of
--      site_admins but not the role, so a content-only admin could write to the
--      fixture list. They now require the fixtures role or super admin.
--
--   2. Super admins can add and remove admins and change roles. This reverses
--      the earlier decision to leave it to the dashboard, at the club's
--      request. The column-level guard from 20261005130000 is replaced with one
--      that keeps `role` writable but only through a policy gated on
--      super_admin, and a trigger refuses to remove the last super admin.

-- =============================================================================
-- 1. Role-aware fixture writes
-- =============================================================================
drop policy if exists "Admins can insert fixtures" on public.fixtures;
drop policy if exists "Admins can update fixtures" on public.fixtures;

create policy "Fixture editors can add fixtures"
  on public.fixtures
  for insert
  to authenticated
  with check (public.has_any_role(array['fixtures', 'super_admin']));

create policy "Fixture editors can update fixtures"
  on public.fixtures
  for update
  to authenticated
  using (public.has_any_role(array['fixtures', 'super_admin']))
  with check (public.has_any_role(array['fixtures', 'super_admin']));

-- =============================================================================
-- 2. Super-admin management of admins
-- =============================================================================
-- role becomes writable again, but only for a super admin: RLS gates the rows,
-- and unlike the 20261005130000 approach the guard is now the policy rather than
-- a column grant. The trigger below is what prevents the real hazard.
revoke update on public.site_admins from authenticated;
grant update (email, role) on public.site_admins to authenticated;

create policy "Super admins can add admins"
  on public.site_admins
  for insert
  to authenticated
  with check (public.has_role('super_admin'));

create policy "Super admins can update admins"
  on public.site_admins
  for update
  to authenticated
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

create policy "Super admins can remove admins"
  on public.site_admins
  for delete
  to authenticated
  using (public.has_role('super_admin'));

-- =============================================================================
-- Last-super-admin guard
-- =============================================================================
-- Without this, a super admin can delete or demote themselves and lock every
-- other admin out of the site permanently: the fix would be a direct database
-- edit, which is exactly what this phase set out to avoid.
--
-- The check runs on the row being removed or changed, and counts the remaining
-- super admins. security definer is required so the count is not blocked by the
-- caller's own RLS, and search_path is pinned for the same reason as has_role.
create function public.prevent_last_super_admin() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  remaining integer;
begin
  -- Only fire when a super admin is being removed or demoted.
  if tg_op = 'DELETE' then
    if old.role <> 'super_admin' then
      return old;
    end if;
  else
    if old.role = 'super_admin' and new.role is distinct from 'super_admin' then
      null;
    else
      return new;
    end if;
  end if;

  select count(*) into remaining
    from public.site_admins
   where role = 'super_admin'
     and email <> coalesce(old.email, '');

  if remaining = 0 then
    raise exception 'Cannot remove or demote the last super admin. Promote another admin first.'
      using errcode = '42501';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger site_admins_guard_last_super_admin
  before delete or update of role on public.site_admins
  for each row
  execute function public.prevent_last_super_admin();

comment on function public.prevent_last_super_admin() is
  'Refuses to remove or demote the final super admin, which would lock everyone out.';

grant execute on function public.prevent_last_super_admin() to authenticated;

-- =============================================================================
-- Note for Phase 3
-- =============================================================================
-- When the match editor lands, goals, cards and lineups tables get the same
-- has_any_role(array['fixtures','super_admin']) treatment, so a content admin
-- cannot alter a scoreline.