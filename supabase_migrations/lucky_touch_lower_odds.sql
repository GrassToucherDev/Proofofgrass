-- Lucky Touch: lower the win odds. Safe to re-run (only changes the old thresholds).
-- Before: legendary 0.5% (roll < 0.005), rare 2.5% (< 0.03), common 12% (< 0.15)  = 15% total
-- After:  legendary 0.5% (roll < 0.005), rare 1.5% (< 0.02), common  6% (< 0.08)  =  8% total
-- Point values unchanged (common +15, rare +50).

do $body$
declare r record; d text; n int := 0;
begin
  for r in select p.oid from pg_proc p where p.proname = 'lock_in_streak' and p.pronamespace = 'public'::regnamespace loop
    d := pg_get_functiondef(r.oid);
    d := regexp_replace(d, 'v_roll\s*<\s*0\.03\M', 'v_roll < 0.02', 'g');
    d := regexp_replace(d, 'v_roll\s*<\s*0\.15\M', 'v_roll < 0.08', 'g');
    execute d;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'lock_in_streak not found in schema public'; end if;
end $body$;

-- Check (read-only): expect new_rare = true, new_common = true, old_rare = false, old_common = false.
select p.oid::regprocedure as function_name,
       p.prosrc ~ 'v_roll\s*<\s*0\.02\M' as new_rare,
       p.prosrc ~ 'v_roll\s*<\s*0\.08\M' as new_common,
       p.prosrc ~ 'v_roll\s*<\s*0\.03\M' as old_rare,
       p.prosrc ~ 'v_roll\s*<\s*0\.15\M' as old_common
from pg_proc p where p.proname = 'lock_in_streak' and p.pronamespace = 'public'::regnamespace;
