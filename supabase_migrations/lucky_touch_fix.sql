-- Lucky Touch repair. Safe to re-run.
-- Problem: the "LuckyTouchEvents" table has columns reward_tier / points_awarded, but lock_in_streak and the two triggers
-- on the table used "tier" / "points". Every win's event insert failed, the failure was swallowed, and the points and free
-- spin were rolled back with it, while the player still saw the win card. No event has been recorded since 2026-07-05.
-- This file: (1) makes both triggers read the real column and never block an insert, (2) patches the live lock_in_streak
-- in place (column names + the value names your table already uses: grass_score / suns_blessing), then (3) shows a check.

-- 1a. Free WAGO Wheel spin on every win.
create or replace function public.lucky_touch_free_spin() returns trigger
language plpgsql security definer set search_path = public as $$
declare g text; u text := lower(new.username);
        t text := coalesce(to_jsonb(new)->>'reward_tier', to_jsonb(new)->>'tier', 'common');
begin
  select google_id into g from username_claims where username = u;
  if g is not null then
    insert into wheel_free_spin_credits(google_id, username, batch, reason, granted_by, expires_at)
    values (g, u, 'lucky:' || gen_random_uuid()::text, 'lucky_touch_' || t, 'system', now() + interval '30 days');
  end if;
  return new;
exception when others then
  raise warning 'lucky_touch_free_spin failed for %: %', new.username, sqlerrm;
  return new;
end $$;

-- 1b. Ticker line for the legendary Sun's Blessing.
create or replace function public.lucky_touch_legendary_ticker() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(to_jsonb(new)->>'reward_tier', to_jsonb(new)->>'tier') = 'legendary' then
    insert into "ScoreEvents" (username, event_type, points) values (new.username, 'lucky_touch_legendary', 0);
  end if;
  return new;
exception when others then
  raise warning 'lucky_touch_legendary_ticker failed for %: %', new.username, sqlerrm;
  return new;
end $$;

-- 2. Patch the live lock_in_streak (every overload) without retyping it.
do $body$
declare r record; d text; q text := chr(39); n int := 0;
begin
  for r in select p.oid from pg_proc p where p.proname = 'lock_in_streak' and p.pronamespace = 'public'::regnamespace loop
    d := pg_get_functiondef(r.oid);
    d := regexp_replace(d, 'INSERT INTO "LuckyTouchEvents"\s*\(username,\s*tier,\s*reward_type,\s*points\)',
                           'INSERT INTO "LuckyTouchEvents" (username, reward_tier, reward_type, points_awarded)', 'gi');
    d := regexp_replace(d, q||'legendary'||q||',\s*'||q||'shield'||q||',\s*0\)', q||'legendary'||q||', '||q||'suns_blessing'||q||', 0)', 'g');
    d := regexp_replace(d, q||'rare'||q||',\s*'||q||'points'||q||',\s*50\)', q||'rare'||q||', '||q||'grass_score'||q||', 50)', 'g');
    d := regexp_replace(d, q||'common'||q||',\s*'||q||'points'||q||',\s*15\)', q||'common'||q||', '||q||'grass_score'||q||', 15)', 'g');
    if d ~* 'INSERT INTO "LuckyTouchEvents"\s*\(username,\s*tier' then
      raise exception 'lock_in_streak: could not patch the Lucky Touch insert (unexpected text)';
    end if;
    execute d;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'lock_in_streak not found in schema public'; end if;
end $body$;

-- 3. Check (read-only): every row should say fixed = true, still_broken = false.
select p.oid::regprocedure as function_name,
       p.prosrc like '%reward_tier%' as fixed,
       p.prosrc ~* 'INSERT INTO "LuckyTouchEvents"\s*\(username,\s*tier' as still_broken
from pg_proc p where p.proname = 'lock_in_streak' and p.pronamespace = 'public'::regnamespace;
