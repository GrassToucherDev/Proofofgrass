-- Groves: PERFECT DAYS. Safe to re-run. Adds two read-only functions; changes nothing that exists.
--   * A perfect day = the grove had >= 3 members that day and EVERY one of them had a locked-in submission
--     (same "locked in" rule as the grove streak: a pending/approved submission that UTC day).
--     Shields never make a perfect day: a shield-covered day has no submission, so it cannot count.
--   * The grove streak and its two-thirds rule are NOT touched.
--   * Fairness: badge targets depend on the grove's CURRENT size (3-4 members vs 5-6 members).
--       3-4 members: tier 1 = 7, tier 2 = 30, tier 3 = 100 perfect days
--       5-6 members: tier 1 = 5, tier 2 = 20, tier 3 = 60 perfect days
--   * Looks back 400 days, like grove_streak.

create or replace function grove_perfect(p_grove uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'UTC')::date;
  v_total int; v_current int; v_best int; v_size int; v_bracket text;
  v_t1 int; v_t2 int; v_t3 int; v_tier int; v_next int; v_today_perfect boolean;
begin
  select count(*)::int into v_size from grove_members m where m.grove_id = p_grove and m.left_at is null;

  with c as (
    select day, (members >= 3 and locked = members) as perfect
    from grove_day_counts(p_grove, v_today - 400, v_today)
  ),
  anchored as (
    select day, perfect from c
    where day <= case when (select perfect from c where day = v_today) then v_today else v_today - 1 end
  ),
  run as (
    select perfect, bool_and(perfect) over (order by day desc rows between unbounded preceding and current row) as still
    from anchored
  ),
  isl as (
    select count(*) as len from (
      select day, day - (row_number() over (order by day))::int as grp from c where perfect
    ) p group by grp
  )
  select (select count(*) from c where perfect)::int,
         (select count(*) filter (where still) from run)::int,
         coalesce((select max(len) from isl), 0)::int,
         coalesce((select perfect from c where day = v_today), false)
    into v_total, v_current, v_best, v_today_perfect;

  if v_size >= 5 then v_bracket := '5-6'; v_t1 := 5;  v_t2 := 20; v_t3 := 60;
  else                v_bracket := '3-4'; v_t1 := 7;  v_t2 := 30; v_t3 := 100;
  end if;
  v_tier := case when v_total >= v_t3 then 3 when v_total >= v_t2 then 2 when v_total >= v_t1 then 1 else 0 end;
  v_next := case v_tier when 0 then v_t1 when 1 then v_t2 when 2 then v_t3 else null end;

  return jsonb_build_object('total', coalesce(v_total,0), 'current', coalesce(v_current,0), 'best', coalesce(v_best,0),
    'today_perfect', coalesce(v_today_perfect,false), 'members', v_size, 'bracket', v_bracket,
    'tier', v_tier, 'next_target', v_next, 'targets', jsonb_build_array(v_t1, v_t2, v_t3));
end $$;

-- Every active grove with >= 3 members and at least one perfect day, for the leaderboard (split by bracket in the app).
create or replace function grove_perfect_board(p_limit int default 50)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(r order by (r->'perfect'->>'total')::int desc, (r->'perfect'->>'best')::int desc, r->>'name'), '[]'::jsonb)
  from (
    select jsonb_build_object('id', g.id, 'name', g.name, 'perfect', grove_perfect(g.id)) as r
    from groves g
    where g.disbanded_at is null
      and (select count(*) from grove_members m where m.grove_id = g.id and m.left_at is null) >= 3
    limit 500
  ) t
  where (r->'perfect'->>'total')::int > 0
  limit greatest(1, least(p_limit, 200))
$$;

revoke all on function grove_perfect(uuid) from public, anon, authenticated;
revoke all on function grove_perfect_board(int) from public, anon, authenticated;
grant execute on function grove_perfect(uuid) to service_role;
grant execute on function grove_perfect_board(int) to service_role;
-- rollback: drop function if exists grove_perfect_board(int); drop function if exists grove_perfect(uuid);
