-- Match alerts: Web Push subscriptions, an outbox, and the triggers that fill it.
--
-- Fans subscribe from the site to four topics (kickoff, goals, results, news).
-- Alerts are not sent from the admin's request: a trigger on fixtures and
-- articles writes an outbox row, and a dispatcher (/api/push/dispatch, called
-- every minute by pg_cron) claims due rows, re-reads the current fixture and
-- sends. That gives three properties the save path alone could not:
--
--   1. A correction wins. Score, half-time and full-time rows wait 60 seconds,
--      and a second goal inside that minute pushes the same pending row out
--      rather than adding another, so a mistyped score fixed straight away is
--      never sent. The message is built at send time from the fixture as it is
--      then, not as it was when the row was queued.
--   2. Every edit counts, including ones made outside the app, exactly as the
--      audit triggers do.
--   3. Two overlapping dispatcher runs cannot double-send: rows are claimed with
--      FOR UPDATE SKIP LOCKED.
--
-- Subscriptions and the outbox are reachable only by the service role and the
-- SECURITY DEFINER functions below; no client role can read or write them.

-- =============================================================================
-- 1. Subscriptions
-- =============================================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  topics text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  failure_count integer not null default 0,

  constraint push_endpoint_https check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  constraint push_keys_length check (char_length(p256dh) between 1 and 200 and char_length(auth) between 1 and 100),
  constraint push_topics_known check (
    topics <@ array['kickoff', 'goals', 'results', 'news']::text[] and cardinality(topics) >= 1
  )
);

create index push_subscriptions_topics_idx on public.push_subscriptions using gin (topics);

comment on table public.push_subscriptions is
  'Anonymous Web Push subscriptions and the alert topics each one chose. Service role only.';

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- =============================================================================
-- 2. Outbox
-- =============================================================================
create table public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  fixture_id uuid references public.fixtures (id) on delete cascade,
  article_id uuid references public.articles (id) on delete cascade,
  send_after timestamptz not null,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),

  constraint push_outbox_kind check (kind in ('live_start', 'score', 'halftime', 'fulltime', 'news')),
  constraint push_outbox_target check (
    (kind = 'news' and article_id is not null and fixture_id is null)
    or (kind <> 'news' and fixture_id is not null and article_id is null)
  )
);

-- One pending row per fixture (or article) and kind: the debounce.
create unique index push_outbox_pending_idx
  on public.push_outbox (kind, coalesce(fixture_id, article_id))
  where sent_at is null;

create index push_outbox_due_idx on public.push_outbox (send_after) where sent_at is null;

comment on table public.push_outbox is
  'Alerts waiting to be sent. Filled by triggers on fixtures and articles, drained by the dispatcher. Service role only.';

alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;

-- =============================================================================
-- 3. Fixture columns
-- =============================================================================
alter table public.fixtures
  add column alerts_muted boolean not null default false,
  add column kickoff_reminder_sent_at timestamptz,
  add column live_alert_sent_at timestamptz,
  add column halftime_alert_sent_at timestamptz,
  add column fulltime_alert_sent_at timestamptz,
  add column last_alert_score text;

comment on column public.fixtures.alerts_muted is
  'When true, no match alerts are queued for this fixture. Set from the admin fixture form.';
comment on column public.fixtures.last_alert_score is
  'The score in the last goal alert sent, e.g. 1-0. Lets the dispatcher skip a score that went back to what fans already saw.';

/*
 * fixtures has a table-level update grant for authenticated (20260928202929),
 * which already covers alerts_muted. The bookkeeping columns are the
 * dispatcher's, so a client write to them is undone here rather than with a
 * column grant, which would mean replacing the table grant with a list of every
 * other column. This trigger is not SECURITY DEFINER, so current_user is the
 * caller's role: the dispatcher's functions run as the owner and keep their
 * writes; anon and authenticated writes are reset.
 */
create function public.fixtures_protect_alert_columns() returns trigger
  language plpgsql
  set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.kickoff_reminder_sent_at := null;
      new.live_alert_sent_at := null;
      new.halftime_alert_sent_at := null;
      new.fulltime_alert_sent_at := null;
      new.last_alert_score := null;
    else
      new.kickoff_reminder_sent_at := old.kickoff_reminder_sent_at;
      new.live_alert_sent_at := old.live_alert_sent_at;
      new.halftime_alert_sent_at := old.halftime_alert_sent_at;
      new.fulltime_alert_sent_at := old.fulltime_alert_sent_at;
      new.last_alert_score := old.last_alert_score;
    end if;
  end if;
  return new;
end;
$$;

create trigger fixtures_protect_alert_columns
  before insert or update on public.fixtures
  for each row execute function public.fixtures_protect_alert_columns();

-- =============================================================================
-- 4. The audit trigger ignores alert bookkeeping
-- =============================================================================
-- Same function as 20261022130000 with one change: the dispatcher's bookkeeping
-- columns are skipped like updated_at, so sending an alert writes no audit row.
-- alerts_muted is an admin decision and is still audited.
create or replace function public.audit_row_change() returns trigger
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
  v_ignored constant text[] := array[
    'updated_at', 'created_at',
    'kickoff_reminder_sent_at', 'live_alert_sent_at', 'halftime_alert_sent_at',
    'fulltime_alert_sent_at', 'last_alert_score'
  ];
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);

  if tg_op = 'UPDATE' then
    for v_col in select jsonb_object_keys(v_new) loop
      continue when v_col = any (v_ignored);
      if (v_old -> v_col) is distinct from (v_new -> v_col) then
        v_changes := v_changes || jsonb_build_object(v_col, jsonb_build_object(
          'from', public.audit_value(v_col, v_old -> v_col),
          'to', public.audit_value(v_col, v_new -> v_col)
        ));
      end if;
    end loop;

    -- Only updated_at (or alert bookkeeping) moved: nothing an admin would
    -- recognise as a change.
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
      continue when v_col = any (v_ignored);
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

-- =============================================================================
-- 5. Queueing triggers
-- =============================================================================
create function public.push_enqueue(p_kind text, p_fixture_id uuid, p_article_id uuid, p_delay interval)
  returns void
  language sql
  security definer
  set search_path = public
as $$
  insert into public.push_outbox (kind, fixture_id, article_id, send_after)
  values (p_kind, p_fixture_id, p_article_id, now() + p_delay)
  on conflict (kind, coalesce(fixture_id, article_id)) where sent_at is null
  do update set send_after = excluded.send_after, claimed_at = null;
$$;

create function public.fixtures_enqueue_alerts() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if not new.is_published or new.alerts_muted then return null; end if;

  -- Kick-off. Coming back from half time is the second half, not a kick-off.
  if new.status = 'live' and old.status in ('scheduled', 'postponed') then
    perform public.push_enqueue('live_start', new.id, null, interval '0 seconds');
  end if;

  if new.status in ('live', 'halftime')
     and (new.shaita_goals is distinct from old.shaita_goals
          or new.opponent_goals is distinct from old.opponent_goals) then
    perform public.push_enqueue('score', new.id, null, interval '60 seconds');
  end if;

  if new.status = 'halftime' and old.status is distinct from 'halftime' then
    perform public.push_enqueue('halftime', new.id, null, interval '60 seconds');
  end if;

  if new.status = 'played' and old.status is distinct from 'played' then
    perform public.push_enqueue('fulltime', new.id, null, interval '60 seconds');
  end if;

  return null;
end;
$$;

create trigger fixtures_enqueue_alerts
  after update on public.fixtures
  for each row execute function public.fixtures_enqueue_alerts();

-- News goes out once per article: a story unpublished and republished, or
-- already alerted, is not sent again.
create function public.articles_enqueue_alert() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if not new.is_published then return null; end if;
  if tg_op = 'UPDATE' and old.is_published then return null; end if;
  if exists (select 1 from public.push_outbox where kind = 'news' and article_id = new.id) then
    return null;
  end if;

  perform public.push_enqueue('news', null, new.id, interval '60 seconds');
  return null;
end;
$$;

create trigger articles_enqueue_alert
  after insert or update on public.articles
  for each row execute function public.articles_enqueue_alert();

-- =============================================================================
-- 6. Dispatcher functions (service role only)
-- =============================================================================
create function public.push_claim_due(p_limit integer default 50)
  returns setof public.push_outbox
  language sql
  security definer
  set search_path = public
as $$
  update public.push_outbox o
     set claimed_at = now()
   where o.id in (
     select id from public.push_outbox
      where sent_at is null
        and send_after <= now()
        and (claimed_at is null or claimed_at < now() - interval '5 minutes')
      order by send_after
      limit greatest(p_limit, 1)
      for update skip locked
   )
  returning o.*;
$$;

create function public.push_mark_sent(p_ids uuid[]) returns void
  language sql
  security definer
  set search_path = public
as $$
  update public.push_outbox set sent_at = now() where id = any (p_ids) and sent_at is null;
$$;

create function public.push_claim_kickoff_reminders()
  returns table (fixture_id uuid)
  language sql
  security definer
  set search_path = public
as $$
  update public.fixtures f
     set kickoff_reminder_sent_at = now()
   where f.id in (
     select id from public.fixtures
      where is_published
        and not alerts_muted
        and status = 'scheduled'
        and kickoff_time is not null
        and kickoff_reminder_sent_at is null
        and ((match_date + kickoff_time) at time zone 'UTC') between now() and now() + interval '65 minutes'
      for update skip locked
   )
  returning f.id;
$$;

create function public.push_record_alert(p_fixture_id uuid, p_kind text, p_score text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.fixtures set
    live_alert_sent_at = case when p_kind = 'live_start' then now() else live_alert_sent_at end,
    halftime_alert_sent_at = case when p_kind = 'halftime' then now() else halftime_alert_sent_at end,
    fulltime_alert_sent_at = case when p_kind = 'fulltime' then now() else fulltime_alert_sent_at end,
    last_alert_score = case when p_kind in ('score', 'halftime', 'fulltime') and p_score is not null
                            then p_score else last_alert_score end
  where id = p_fixture_id;
end;
$$;

create function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_topics text[])
  returns void
  language sql
  security definer
  set search_path = public
as $$
  insert into public.push_subscriptions (endpoint, p256dh, auth, topics)
  values (p_endpoint, p_p256dh, p_auth, p_topics)
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    topics = excluded.topics,
    updated_at = now(),
    failure_count = 0;
$$;

create function public.push_unsubscribe(p_endpoint text) returns void
  language sql
  security definer
  set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.push_enqueue(text, uuid, uuid, interval)',
    'public.push_claim_due(integer)',
    'public.push_mark_sent(uuid[])',
    'public.push_claim_kickoff_reminders()',
    'public.push_record_alert(uuid, text, text)',
    'public.push_subscribe(text, text, text, text[])',
    'public.push_unsubscribe(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end;
$$;

-- =============================================================================
-- 7. Schedule the dispatcher
-- =============================================================================
-- Every minute, pg_cron asks pg_net to POST to the dispatcher. The URL and the
-- bearer secret live in Supabase Vault (push_dispatch_url,
-- push_dispatch_secret), created by a one-off command and never in git; until
-- they exist the job does nothing. Skipped entirely where pg_cron or pg_net is
-- unavailable (local test databases), and safe to re-run.
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron or pg_net unavailable: push dispatcher not scheduled';
    return;
  end if;

  create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;

  if exists (select 1 from cron.job where jobname = 'push-dispatch') then
    perform cron.unschedule('push-dispatch');
  end if;

  perform cron.schedule(
    'push-dispatch',
    '* * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_url'),
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      )
      where exists (select 1 from vault.decrypted_secrets where name = 'push_dispatch_url')
        and exists (select 1 from vault.decrypted_secrets where name = 'push_dispatch_secret');
    $job$
  );
end;
$$;
