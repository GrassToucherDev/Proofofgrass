-- Lucky Touch: every win (common, rare, legendary) also grants 1 free WAGO Wheel spin (30-day expiry).
-- Implemented as an AFTER INSERT trigger on "LuckyTouchEvents" so lock_in_streak does not need to change.
-- Each credit has a unique batch ('lucky:<uuid>') so it can only ever produce one spin; reason = 'lucky_touch'.
-- Safe to re-run. A failure here never blocks the Lucky Touch insert.

create or replace function public.lucky_touch_free_spin() returns trigger
language plpgsql security definer set search_path = public as $$
declare g text; u text := lower(new.username);
begin
  select google_id into g from username_claims where username = u;
  if g is not null then
    insert into wheel_free_spin_credits(google_id, username, batch, reason, granted_by, expires_at)
    values (g, u, 'lucky:' || gen_random_uuid()::text, 'lucky_touch_' || coalesce(new.tier, 'common'), 'system', now() + interval '30 days');
  end if;
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists trg_lucky_touch_free_spin on "LuckyTouchEvents";
create trigger trg_lucky_touch_free_spin after insert on "LuckyTouchEvents"
for each row execute function public.lucky_touch_free_spin();
