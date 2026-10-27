-- Faster match alerts.
--
-- A goal used to take up to two minutes to reach a phone: the outbox held it
-- for 60 seconds (so a mistyped score could be corrected before it went out),
-- then it waited for the dispatcher, which ran once a minute.
--
--   1. The correction window is now 15 seconds. A fix made straight after a
--      wrong save still wins, as before; the hold is just shorter.
--   2. The dispatcher runs every 10 seconds (pg_cron's sub-minute schedule).
--      A run with nothing due returns straight away, so this costs little.
--
-- Kick-off now arrives within about 10 seconds; goals, half time, full time and
-- news within about 25.

create or replace function public.fixtures_enqueue_alerts() returns trigger
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
    perform public.push_enqueue('score', new.id, null, interval '15 seconds');
  end if;

  if new.status = 'halftime' and old.status is distinct from 'halftime' then
    perform public.push_enqueue('halftime', new.id, null, interval '15 seconds');
  end if;

  if new.status = 'played' and old.status is distinct from 'played' then
    perform public.push_enqueue('fulltime', new.id, null, interval '15 seconds');
  end if;

  return null;
end;
$$;

create or replace function public.articles_enqueue_alert() returns trigger
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

  perform public.push_enqueue('news', null, new.id, interval '15 seconds');
  return null;
end;
$$;

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
    '10 seconds',
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
