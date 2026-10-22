-- Audit logging moves into the database.
--
-- Until now the admin_audit_log was written by the server actions after each
-- write. That left three gaps: an admin could write through the REST API with
-- their own session and leave no entry, a failed log insert was ignored, and
-- the insert policy from 20261020160000 let any admin add entries of their own
-- making. Triggers now write every entry, and no client role can insert.
--
--   1. The audit log accepts 'leadership' and 'competition' targets, and the
--      'system' / 'none' actor roles (a migration or service-role write has no
--      signed-in email; 'none' is a signed-in account that is not an admin).
--   2. audit_write() is the single writer. It takes the actor from the JWT, so
--      a caller cannot choose who an entry is attributed to. No client role can
--      execute it; only the triggers and functions below, which run as owner.
--   3. audit_row_change() logs INSERT / UPDATE / DELETE on each admin-managed
--      table. Updates record only the columns that changed; an update that
--      changes nothing but updated_at is not logged. date_of_birth values are
--      never written to the log, only the fact that the column changed.
--   4. Lineups, goals and cards are replaced wholesale, so a row trigger would
--      log one entry per player. replace_lineups / replace_match_goals /
--      replace_match_cards become the only write path (direct writes are
--      revoked) and log one entry per save.
--   5. Super admins can delete media_uploads rows, so deleting an image also
--      removes it from the Media Library.

-- =============================================================================
-- 1. Audit log constraints
-- =============================================================================
alter table public.admin_audit_log drop constraint admin_audit_target_type;
alter table public.admin_audit_log add constraint admin_audit_target_type check (target_type in (
  'fixture', 'match_content', 'news', 'sponsor', 'site_settings', 'user', 'media', 'staff', 'honour', 'squad',
  'leadership', 'competition'
));

alter table public.admin_audit_log drop constraint admin_audit_actor_role;
alter table public.admin_audit_log add constraint admin_audit_actor_role
  check (actor_role in ('super_admin', 'fixtures', 'content', 'system', 'none'));

-- Nobody writes to the log directly any more.
drop policy if exists "Admins can record their own actions" on public.admin_audit_log;
revoke insert on public.admin_audit_log from authenticated;

comment on table public.admin_audit_log is
  'Immutable audit trail of admin actions. Written only by database triggers through audit_write(); read-only to super admins.';

-- =============================================================================
-- 2. The single writer
-- =============================================================================
create function public.audit_write(
  p_target_type text,
  p_target_id text,
  p_action text,
  p_details jsonb
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_role text;
begin
  if v_email is null then
    v_email := 'system';
    v_role := 'system';
  else
    select role into v_role from public.site_admins where email = v_email;
    v_role := coalesce(v_role, 'none');
  end if;

  insert into public.admin_audit_log (actor_email, actor_role, target_type, target_id, action, details)
  values (v_email, v_role, p_target_type, left(coalesce(p_target_id, 'unknown'), 200), left(p_action, 200), p_details);
end;
$$;

comment on function public.audit_write(text, text, text, jsonb) is
  'Writes one audit entry attributed to the JWT caller. Not executable by any client role; called by audit triggers and the replace_* functions.';

-- Shortens long values and withholds date_of_birth so the log never stores it.
create function public.audit_value(p_key text, p_value jsonb) returns jsonb
  language sql
  immutable
  set search_path = public
as $$
  select case
    when p_value is null or p_value = 'null'::jsonb then 'null'::jsonb
    when p_key = 'date_of_birth' then to_jsonb('(withheld)'::text)
    when jsonb_typeof(p_value) = 'string' and char_length(p_value #>> '{}') > 300
      then to_jsonb(left(p_value #>> '{}', 300) || '…')
    when jsonb_typeof(p_value) in ('array', 'object') and char_length(p_value::text) > 600
      then to_jsonb('(long value, ' || char_length(p_value::text) || ' characters)')
    else p_value
  end;
$$;

-- =============================================================================
-- 3. Row-level audit trigger
-- =============================================================================
-- Trigger arguments: target_type, noun for the action label, key column for
-- target_id ('' means the singleton settings row), label column ('' for none).
create function public.audit_row_change() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_target_type text := tg_argv[0];
  v_noun text := tg_argv[1];
  v_key text := tg_argv[2];
  v_label_col text := tg_argv[3];
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_snapshot jsonb := '{}'::jsonb;
  v_changed text[];
  v_col text;
  v_label text;
  v_action text;
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);

  if tg_op = 'UPDATE' then
    for v_col in select jsonb_object_keys(v_new) loop
      continue when v_col in ('updated_at', 'created_at');
      if (v_old -> v_col) is distinct from (v_new -> v_col) then
        v_changes := v_changes || jsonb_build_object(v_col, jsonb_build_object(
          'from', public.audit_value(v_col, v_old -> v_col),
          'to', public.audit_value(v_col, v_new -> v_col)
        ));
      end if;
    end loop;

    -- Only updated_at moved: nothing an admin would recognise as a change.
    if v_changes = '{}'::jsonb then return null; end if;

    select array_agg(k order by k) into v_changed from jsonb_object_keys(v_changes) as k;

    v_action := case
      when v_changed <@ array['is_featured', 'is_published'] and v_changes ? 'is_published' then
        case when (v_new ->> 'is_published')::boolean then 'Published ' else 'Unpublished ' end || v_noun
      when v_changed = array['is_featured'] then
        case when (v_new ->> 'is_featured')::boolean then 'Featured ' else 'Unfeatured ' end || v_noun
      when v_changed = array['sort_order'] then 'Reordered ' || v_noun
      else 'Updated ' || v_noun
    end;
  else
    for v_col in select jsonb_object_keys(v_row) loop
      continue when v_col in ('updated_at', 'created_at');
      v_snapshot := v_snapshot || jsonb_build_object(v_col, public.audit_value(v_col, v_row -> v_col));
    end loop;
    v_action := case when tg_op = 'INSERT' then 'Added ' else 'Removed ' end || v_noun;
  end if;

  if v_label_col <> '' then
    v_label := nullif(left(v_row ->> v_label_col, 80), '');
    if v_label is not null then v_action := v_action || ': ' || v_label; end if;
  end if;

  perform public.audit_write(
    v_target_type,
    case when v_key = '' then 'singleton' else v_row ->> v_key end,
    v_action,
    case when tg_op = 'UPDATE'
      then jsonb_build_object('changes', v_changes)
      else jsonb_build_object('row', v_snapshot)
    end
  );
  return null;
end;
$$;

create trigger audit_fixtures after insert or update or delete on public.fixtures
  for each row execute function public.audit_row_change('fixture', 'fixture', 'id', 'opponent');
create trigger audit_squad after insert or update or delete on public.squad
  for each row execute function public.audit_row_change('squad', 'player', 'id', 'full_name');
create trigger audit_staff after insert or update or delete on public.staff
  for each row execute function public.audit_row_change('staff', 'staff member', 'id', 'full_name');
create trigger audit_leadership after insert or update or delete on public.leadership
  for each row execute function public.audit_row_change('leadership', 'leadership profile', 'id', 'full_name');
create trigger audit_articles after insert or update or delete on public.articles
  for each row execute function public.audit_row_change('news', 'article', 'id', 'title');
create trigger audit_honors after insert or update or delete on public.honors
  for each row execute function public.audit_row_change('honour', 'honour', 'id', 'name');
create trigger audit_sponsors after insert or update or delete on public.sponsors
  for each row execute function public.audit_row_change('sponsor', 'sponsor', 'id', 'name');
create trigger audit_site_settings after insert or update or delete on public.site_settings
  for each row execute function public.audit_row_change('site_settings', 'site settings', '', '');
create trigger audit_site_admins after insert or update or delete on public.site_admins
  for each row execute function public.audit_row_change('user', 'administrator', 'email', '');
create trigger audit_competitions after insert or update or delete on public.competitions
  for each row execute function public.audit_row_change('competition', 'competition', 'id', 'name');
create trigger audit_match_reports after insert or update or delete on public.match_reports
  for each row execute function public.audit_row_change('match_content', 'match report', 'fixture_id', '');
-- Uploads are their own log (media_uploads); publishing and deleting are the
-- decisions worth auditing.
create trigger audit_media_uploads after update or delete on public.media_uploads
  for each row execute function public.audit_row_change('media', 'image', 'id', 'original_filename');

-- =============================================================================
-- 4. Lineups, goals and cards: one entry per save
-- =============================================================================
-- These become SECURITY DEFINER so they can call audit_write(). RLS no longer
-- applies inside them, so each checks the role itself, and direct writes to the
-- three tables are revoked: the functions are the only way to change them, so
-- every change is logged.

create or replace function public.replace_lineups(p_fixture_id uuid, p_rows jsonb)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count integer;
  v_opponent text;
begin
  if not public.has_any_role(array['fixtures', 'super_admin']) then
    raise exception 'Your role does not include match content.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fixture_id::text, 0));

  delete from public.lineups where fixture_id = p_fixture_id;

  insert into public.lineups
    (fixture_id, player_id, player_name, shirt_number, position, pitch_x, pitch_y, is_starter, sort_order)
  select p_fixture_id, r.player_id, r.player_name, r.shirt_number, r.position,
         r.pitch_x, r.pitch_y, coalesce(r.is_starter, true), coalesce(r.sort_order, 0)
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(
      player_id uuid,
      player_name text,
      shirt_number integer,
      position text,
      pitch_x numeric,
      pitch_y numeric,
      is_starter boolean,
      sort_order integer
    );
  get diagnostics v_count = row_count;

  select opponent into v_opponent from public.fixtures where id = p_fixture_id;
  perform public.audit_write(
    'match_content',
    p_fixture_id::text,
    case when v_count = 0 then 'Cleared lineup' else format('Saved lineup (%s players)', v_count) end
      || coalesce(': vs ' || v_opponent, ''),
    jsonb_build_object('players', v_count)
  );
end;
$$;

create or replace function public.replace_match_goals(p_fixture_id uuid, p_rows jsonb)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count integer;
  v_opponent text;
begin
  if not public.has_any_role(array['fixtures', 'super_admin']) then
    raise exception 'Your role does not include match content.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fixture_id::text, 0));

  delete from public.match_goals where fixture_id = p_fixture_id;

  insert into public.match_goals
    (fixture_id, player_id, player_name, side, minute, added_stoppage_minutes, is_own_goal, assist_note, sort_order)
  select p_fixture_id, r.player_id, r.player_name, r.side, r.minute,
         coalesce(r.added_stoppage_minutes, false), coalesce(r.is_own_goal, false),
         r.assist_note, coalesce(r.sort_order, 0)
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(
      player_id uuid,
      player_name text,
      side text,
      minute integer,
      added_stoppage_minutes boolean,
      is_own_goal boolean,
      assist_note text,
      sort_order integer
    );
  get diagnostics v_count = row_count;

  select opponent into v_opponent from public.fixtures where id = p_fixture_id;
  perform public.audit_write(
    'match_content',
    p_fixture_id::text,
    case when v_count = 0 then 'Cleared goals' else format('Saved goals (%s)', v_count) end
      || coalesce(': vs ' || v_opponent, ''),
    jsonb_build_object('goals', v_count)
  );
end;
$$;

create or replace function public.replace_match_cards(p_fixture_id uuid, p_rows jsonb)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count integer;
  v_opponent text;
begin
  if not public.has_any_role(array['fixtures', 'super_admin']) then
    raise exception 'Your role does not include match content.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fixture_id::text, 0));

  delete from public.match_cards where fixture_id = p_fixture_id;

  insert into public.match_cards
    (fixture_id, player_id, player_name, side, card, minute, added_stoppage_minutes, sort_order)
  select p_fixture_id, r.player_id, r.player_name, r.side, r.card, r.minute,
         coalesce(r.added_stoppage_minutes, false), coalesce(r.sort_order, 0)
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(
      player_id uuid,
      player_name text,
      side text,
      card text,
      minute integer,
      added_stoppage_minutes boolean,
      sort_order integer
    );
  get diagnostics v_count = row_count;

  select opponent into v_opponent from public.fixtures where id = p_fixture_id;
  perform public.audit_write(
    'match_content',
    p_fixture_id::text,
    case when v_count = 0 then 'Cleared cards' else format('Saved cards (%s)', v_count) end
      || coalesce(': vs ' || v_opponent, ''),
    jsonb_build_object('cards', v_count)
  );
end;
$$;

revoke insert, update, delete on public.lineups, public.match_goals, public.match_cards from authenticated;

-- =============================================================================
-- 5. Deleting upload records
-- =============================================================================
create policy "Super admins can delete upload records"
  on public.media_uploads for delete to authenticated
  using (public.has_role('super_admin'));

grant delete on public.media_uploads to authenticated;

-- =============================================================================
-- Function privileges
-- =============================================================================
-- Supabase grants EXECUTE on new public functions to anon and authenticated by
-- default. The audit helpers must not be callable from the API: audit_write
-- would let a caller add entries, and the others are internal.
revoke execute on function public.audit_write(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.audit_value(text, jsonb) from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;

-- create or replace keeps the existing grants, restated here for clarity.
revoke execute on function public.replace_lineups(uuid, jsonb) from public, anon;
revoke execute on function public.replace_match_goals(uuid, jsonb) from public, anon;
revoke execute on function public.replace_match_cards(uuid, jsonb) from public, anon;
grant execute on function public.replace_lineups(uuid, jsonb) to authenticated;
grant execute on function public.replace_match_goals(uuid, jsonb) to authenticated;
grant execute on function public.replace_match_cards(uuid, jsonb) to authenticated;

-- =============================================================================
-- Super admins can read every admin
-- =============================================================================
-- site_admins only ever had "Admins can read their own membership". Postgres
-- applies SELECT policies to the rows an UPDATE or DELETE filters on, so a super
-- admin could not see, re-role or remove any other admin: the Users screen listed
-- only the signed-in super admin, and role changes and removals matched zero rows
-- and silently did nothing. has_role() is SECURITY DEFINER, so the policy does
-- not recurse into site_admins' own RLS.
create policy "Super admins can read all admins"
  on public.site_admins for select to authenticated
  using (public.has_role('super_admin'));

-- The add and remove policies from 20261005140000 never had matching grants:
-- 20260928202929 revoked everything and granted back only SELECT, so adding or
-- removing an admin from /admin/users failed with "permission denied". The
-- policies above still limit both to super admins, and the
-- site_admins_guard_last_super_admin trigger still protects the last one.
grant insert, delete on public.site_admins to authenticated;
