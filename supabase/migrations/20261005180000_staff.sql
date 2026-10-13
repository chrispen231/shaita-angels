-- Staff: coaches and support staff, managed in the admin area and shown on
-- /team/staff with the same card layout as players.
--
-- Simpler than the squad table: no shirt numbers, no date of birth, no
-- is_minor trigger. Staff are not match participants so they have no lineup
-- or goal rows to link to.

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,
  bio text,
  photo_url text,
  photo_url_alt text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint staff_name_length check (char_length(full_name) between 1 and 120),
  constraint staff_role_length check (char_length(role) between 1 and 120)
);

comment on table public.staff is
  'Coaches and support staff. Public cards mirror the player card layout with photo and role.';
comment on column public.staff.role is
  'Staff role, e.g. Head Coach, Physiotherapist. Displayed on the public card.';
comment on column public.staff.photo_url is
  'Primary photo URL. Falls back to a placeholder when null.';
comment on column public.staff.photo_url_alt is
  'Alternate photo shown on hover, matching the player card double-photo effect.';

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.staff enable row level security;

-- Anyone can read published staff.
create policy "Anyone can read published staff"
  on public.staff for select to anon, authenticated
  using (is_published = true);

-- Content admins and super admins can manage staff.
create policy "Content admins can manage staff"
  on public.staff for all to authenticated
  using (exists (
    select 1 from public.site_admins
    where email = lower((select auth.jwt() ->> 'email'))
      and role in ('super_admin', 'content')
  ))
  with check (exists (
    select 1 from public.site_admins
    where email = lower((select auth.jwt() ->> 'email'))
      and role in ('super_admin', 'content')
  ));

-- =============================================================================
-- Grants
-- =============================================================================

grant select on public.staff to anon, authenticated;
grant insert, update, delete on public.staff to authenticated;

-- Revoke insert/update/delete from anon (the policy above is the boundary).
revoke insert, update, delete on public.staff from anon;

-- =============================================================================
-- Trigger: updated_at
-- =============================================================================

drop trigger if exists staff_set_updated_at on public.staff;
create trigger staff_set_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();
