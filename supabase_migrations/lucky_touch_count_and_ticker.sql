-- Lucky Touch: surface legendary wins (Sun's Blessing) in the ticker. Safe to re-run.
-- NOTE: Profiles.lucky_touch_count is already maintained by an existing DB trigger (verified: events == profile counts),
-- so this file deliberately does NOT touch the counter. Applied in Supabase 2026-11-05.

create or replace function public.lucky_touch_legendary_ticker() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tier = 'legendary' then
    insert into "ScoreEvents" (username, event_type, points)
    values (new.username, 'lucky_touch_legendary', 0);
  end if;
  return new;
end $$;

drop trigger if exists trg_lucky_touch_legendary_ticker on "LuckyTouchEvents";
create trigger trg_lucky_touch_legendary_ticker after insert on "LuckyTouchEvents"
for each row execute function public.lucky_touch_legendary_ticker();
