-- Admin action audit log
-- Super admins can monitor what other admins do: fixture edits, score changes,
-- media publishes, user role changes, sponsor/site-settings edits, etc.

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  -- The admin who performed the action (email from auth)
  actor_email text not null,
  -- The admin's role at the time of the action
  actor_role text not null,
  -- What was affected: fixture, match_content, news, sponsor, site_settings, user, media
  target_type text not null,
  -- Stable identifier of the affected row (fixture id, article slug, user email, etc.)
  target_id text not null,
  -- Human-readable description: "Updated score to 2-1", "Published article X", "Changed user Y role to fixtures"
  action text not null,
  -- Optional: the before/after values for significant changes (JSONB)
  details jsonb,
  created_at timestamptz not null default now(),

  constraint admin_audit_action_length check (char_length(action) between 1 and 200),
  constraint admin_audit_target_type check (target_type in (
    'fixture', 'match_content', 'news', 'sponsor', 'site_settings', 'user', 'media', 'staff', 'honour', 'squad'
  )),
  constraint admin_audit_actor_role check (actor_role in ('super_admin', 'fixtures', 'content'))
);

create index admin_audit_log_actor_idx on public.admin_audit_log (actor_email, created_at desc);
create index admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id, created_at desc);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

comment on table public.admin_audit_log is
  'Immutable audit trail of admin actions. Written by server actions; read-only to super admins.';

alter table public.admin_audit_log enable row level security;

-- Super admins can read everything
create policy "Super admins can read audit log"
  on public.admin_audit_log for select to authenticated
  using (public.has_role('super_admin'));

grant select on public.admin_audit_log to authenticated;