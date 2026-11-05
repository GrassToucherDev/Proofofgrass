-- Lucky Touch: keep Profiles.lucky_touch_count in sync and surface legendary wins in the ticker. Safe to re-run.
-- Run the CHECK block first; if lucky_touch_count already tracks events (an existing trigger), skip the trigger part.

-- CHECK (read-only):
-- select (select count(*) from "LuckyTouchEvents") as events,
--        (select coalesce(sum(lucky_touch_count),0) from "Profiles") as profile_counts;
-- select tgname from pg_trigger where tgrelid = '"LuckyTouchEvents"'::regclass and not tgisinternal;

create or replace function public.lucky_touch_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update "Profiles" set lucky_touch_count = coalesce(lucky_touch_count,0) + 1
  where lower(username) = lower(new.username);
  if new.tier = 'legendary' then
    insert into "ScoreEvents" (username, event_type, points) values (new.username, 'lucky_touch_legendary', 0);
  end if;
  return new;
end $$;

drop trigger if exists trg_lucky_touch_after_insert on "LuckyTouchEvents";
create trigger trg_lucky_touch_after_insert after insert on "LuckyTouchEvents"
for each row execute function public.lucky_touch_after_insert();

-- One-time backfill from the event log (exact, idempotent)
update "Profiles" p set lucky_touch_count = c.n
from (select lower(username) u, count(*) n from "LuckyTouchEvents" group by 1) c
where lower(p.username) = c.u;
