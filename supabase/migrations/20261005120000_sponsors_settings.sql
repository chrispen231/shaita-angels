-- Sponsors and site settings.
--
-- Phase 1 of the admin section (docs/admin-spec.md). Moves sponsor and social
-- data out of the codebase and into the database, so the club can publish
-- without a deploy.
--
-- NOT YET APPLIED. Applying this writes to the live database.

-- =============================================================================
-- sponsors
-- =============================================================================
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  -- Presentation tier: 1 principal, 2 partner, 3 supplier. An integer rather
  -- than a lookup table because there are a handful of sponsors and the tier is
  -- a presentation concern, not an entity.
  tier smallint not null default 3 check (tier between 1 and 3),
  url text check (url is null or url ~ '^https?://'),
  -- Path within the sponsor-logos bucket. Null until artwork is supplied.
  logo_path text,
  alt_text text check (alt_text is null or char_length(alt_text) <= 200),
  starts_on date,
  ends_on date,
  sort_order integer not null default 0,
  -- Defaults false so a sponsor never appears publicly before it is reviewed.
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsors_dates_ordered check (
    ends_on is null or starts_on is null or ends_on >= starts_on
  )
);

create index sponsors_public_idx on public.sponsors (tier, sort_order, name)
  where is_published;

alter table public.sponsors enable row level security;

revoke all on table public.sponsors from anon, authenticated;
grant select on table public.sponsors to anon, authenticated;

-- Public read: published rows only. Expiry is enforced in the query so a lapsed
-- contract hides itself without needing an admin action.
create policy "Anyone can read active published sponsors"
  on public.sponsors
  for select
  to anon, authenticated
  using (
    is_published
    and (starts_on is null or starts_on <= current_date)
    and (ends_on   is null or ends_on   >= current_date)
  );

-- =============================================================================
-- site_settings
-- =============================================================================
-- Single row. `social_handles` is an ordered jsonb array of
-- { platform, url, label, is_published } so ordering is trivial to control and
-- matches how these links are actually used.
create table public.site_settings (
  id boolean primary key default true check (id),
  social_handles jsonb not null default '[]'::jsonb,
  contact_email text check (contact_email is null or contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone_orders text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id)
);

comment on table public.site_settings is
  'Single-row table (id = true). Ordered social_handles jsonb array.';

alter table public.site_settings enable row level security;

revoke all on table public.site_settings from anon, authenticated;
grant select on table public.site_settings to anon, authenticated;

-- The whole settings row is public: it holds the contact details and social
-- links the footer already displays.
create policy "Anyone can read site settings"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

-- =============================================================================
-- Write access
-- =============================================================================
-- Left deliberately empty in this migration. Writes arrive in Phase 2 alongside
-- has_role(), because the policies need the role helper and there is no point
-- granting write access to a table before anything can exercise it.
--
-- When that migration lands it will:
--   * add `role` to site_admins
--   * create public.has_role(text)
--   * grant insert/update/delete on sponsors to super admins
--   * grant update on site_settings to super admins
--   * withhold the `role` column from non-super admins via column-level grants
--
-- RLS cannot restrict which columns are updated. A non-super admin with blanket
-- update on site_admins could set their own role, so that column must be
-- withheld explicitly at that point. This is the single most important line in
-- the Phase 2 migration.

-- =============================================================================
-- Seed data
-- =============================================================================
-- Logos are uploaded separately into the sponsor-logos bucket; logo_path is left
-- null here and filled in once the artwork is in place.
--
-- Tiering is a proposal. The club knows the real commercial hierarchy and should
-- adjust it.
insert into public.sponsors (name, tier, url, sort_order, is_published) values
  ('BETTOMAX',    1, 'https://bettomax-lbr.com',                    10, false),
  ('NEEV Liberia',1, 'https://neevliberia.com',                     20, false),
  ('TLION ESTATE',2, null,                                          30, false),
  ('Ambivert',    2, 'https://web.facebook.com/luxuryGraphiX',      40, false);

insert into public.site_settings (id, social_handles) values (true, '[]'::jsonb);