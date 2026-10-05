-- Role-based access control for the admin section.
--
-- Phase 2 of docs/admin-spec.md. Adds roles to site_admins, introduces the
-- has_role() helper the RLS policies depend on, and locks down who can promote
-- whom.
--
-- NOT YET APPLIED. Applying this writes to the live database.

-- =============================================================================
-- role column
-- =============================================================================
-- text with a CHECK constraint rather than a Postgres enum, so adding a role
-- later is a constraint change, not an ALTER TYPE that cannot run inside a
-- transaction with other work.
--
-- Defaults to 'content', the least-privileged role, so an admin added later is
-- never powerful by accident.
alter table public.site_admins
  add column role text not null default 'content'
    check (role in ('super_admin', 'fixtures', 'content'));

create index site_admins_role_idx on public.site_admins (role);

-- The club's existing admin becomes the super admin. This is the only row that
-- exists today, so this is the documented bootstrap rather than a silent grant.
update public.site_admins set role = 'super_admin' where email = 'chrispenwreh@gmail.com';

-- =============================================================================
-- has_role()
-- =============================================================================
-- Every RLS policy would otherwise repeat the same membership subquery. One
-- function keeps that in a single place.
create function public.has_role(required text) returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
      from public.site_admins
     where email = lower((select auth.jwt() ->> 'email'))
       and role = required
  );
$$;

comment on function public.has_role(text) is
  'True when the signed-in admin holds the given role. Callers must pass a role they intend to allow.';

-- Multi-role variant, for policies that accept either fixtures or super_admin.
create function public.has_any_role(required text[]) returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
      from public.site_admins
     where email = lower((select auth.jwt() ->> 'email'))
       and role = any(required)
  );
$$;

comment on function public.has_any_role(text[]) is
  'True when the signed-in admin holds any of the given roles.';

-- Required, or every RLS policy that calls these fails at runtime rather than
-- at creation. This is the confusing-first-failure case worth knowing about.
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_any_role(text[]) to authenticated;

-- =============================================================================
-- Privilege escalation guard
-- =============================================================================
-- RLS policies cannot restrict WHICH COLUMNS are updated. The existing grant is
-- blanket update on site_admins, so without this a 'content' admin could set
-- their own role to 'super_admin' and take over the site.
--
-- The fix is column-level grants: revoke the blanket update, then grant back
-- only the columns a non-super admin may change. `role` is never granted, so
-- only the migration owner (or a super admin using the service role) can change
-- it. The admin UI hides this too, but the UI is not the security boundary.
revoke update on public.site_admins from authenticated;
grant update (email) on public.site_admins to authenticated;

-- =============================================================================
-- Sponsors: super-admin writes, public reads
-- =============================================================================
grant insert, update, delete on public.sponsors to authenticated;

-- Sponsorship is commercially sensitive: contract terms, partner
-- relationships, deal dates. No reason an editorial admin can see or edit it.
create policy "Super admins can add sponsors"
  on public.sponsors
  for insert
  to authenticated
  with check (public.has_role('super_admin'));

create policy "Super admins can update sponsors"
  on public.sponsors
  for update
  to authenticated
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

create policy "Super admins can delete sponsors"
  on public.sponsors
  for delete
  to authenticated
  using (public.has_role('super_admin'));

-- =============================================================================
-- Site settings: super-admin writes, public reads
-- =============================================================================
grant insert, update on public.site_settings to authenticated;

create policy "Super admins can update site settings"
  on public.site_settings
  for update
  to authenticated
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

create policy "Super admins can insert site settings"
  on public.site_settings
  for insert
  to authenticated
  with check (public.has_role('super_admin'));

-- =============================================================================
-- site_admins: self-service read only
-- =============================================================================
-- Read your own row so the admin UI can show your name and role. No insert,
-- update or delete policy exists: promoting, demoting and removing admins is
-- deliberately not something the application can do. That is a service-role or
-- dashboard operation, which is the strongest guarantee available here.
create policy "Admins can read their own membership"
  on public.site_admins
  for select
  to authenticated
  using (email = lower((select auth.jwt() ->> 'email')));

-- =============================================================================
-- Fixtures: role-aware reads
-- =============================================================================
-- The public read policy already exists and is unchanged. Admins keep the
-- "read all fixtures" policy from the first migration, which is still correct:
-- anyone who is an admin can see unpublished rows, regardless of role.

-- =============================================================================
-- Note for the fixtures editor (also Phase 2)
-- =============================================================================
-- grant insert, update on public.fixtures already exists for authenticated,
-- and the policies from the first migration gate those writes on membership of
-- site_admins. That is still correct but does not distinguish roles. When the
-- fixtures editor lands, tighten those two policies to
-- public.has_any_role(array['fixtures','super_admin']) so a content-only admin
-- cannot write to the fixture list.
--
-- Left as-is here deliberately: changing an existing policy and adding roles in
-- the same migration makes it harder to tell which change caused a problem.