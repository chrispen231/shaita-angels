-- Replace a match's lineup, goals or cards in one transaction.
--
-- The match editor saves each set wholesale: delete the fixture's rows, then
-- insert the submitted ones. Done as two PostgREST calls, a failed insert (a
-- duplicate shirt number, a dropped connection) left the match with no rows at
-- all, and two editors saving together could each insert after both deletes and
-- duplicate the set. Each function below does both steps in a single statement
-- call, so a failure rolls the delete back with it.
--
-- security invoker: the caller's own RLS policies still decide whether the
-- delete and insert are allowed, exactly as the direct table writes did.
-- Constraint errors (23505 on lineups_match_shirt_unique, CHECK violations)
-- propagate unchanged so the server action can map them to a message.
--
-- A transaction-scoped advisory lock keyed on the fixture serialises saves, so a
-- second concurrent save waits for the first to commit and then replaces its
-- rows rather than adding to them. It needs no privilege on fixtures.

create function public.replace_lineups(p_fixture_id uuid, p_rows jsonb)
  returns void
  language plpgsql
  security invoker
  set search_path = public
as $$
begin
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
end;
$$;

create function public.replace_match_goals(p_fixture_id uuid, p_rows jsonb)
  returns void
  language plpgsql
  security invoker
  set search_path = public
as $$
begin
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
end;
$$;

create function public.replace_match_cards(p_fixture_id uuid, p_rows jsonb)
  returns void
  language plpgsql
  security invoker
  set search_path = public
as $$
begin
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
end;
$$;

revoke execute on function public.replace_lineups(uuid, jsonb) from public, anon;
revoke execute on function public.replace_match_goals(uuid, jsonb) from public, anon;
revoke execute on function public.replace_match_cards(uuid, jsonb) from public, anon;
grant execute on function public.replace_lineups(uuid, jsonb) to authenticated;
grant execute on function public.replace_match_goals(uuid, jsonb) to authenticated;
grant execute on function public.replace_match_cards(uuid, jsonb) to authenticated;
