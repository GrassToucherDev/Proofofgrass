-- WAGO Wheel: admin-granted FREE SPINS. Safe to re-run. Service_role only.
--
-- A free spin is a normal spin that costs nothing: same prize pool, same odds, same meter, same Fright Bits rules, no payment.
-- It records a zero-price intent and settles it through the existing wheel_spin_settle, so the prize is still chosen and
-- inventory still taken in one transaction. Nothing is added to the locked or ecosystem totals (both are 0 for these spins).
-- The spin's payment_tx is 'free:<credit id>', so each credit can only ever produce one spin, and admins can tell them apart.

-- Intents may now have a zero price (free spins). Paid intents are still always created with a positive price.
alter table public.wheel_intents drop constraint if exists wheel_intents_price_tokens_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'wheel_intents_price_tokens_nonneg') then
    alter table public.wheel_intents add constraint wheel_intents_price_tokens_nonneg check (price_tokens >= 0);
  end if;
end $$;

create table if not exists public.wheel_free_spin_credits (
  id         uuid primary key default gen_random_uuid(),
  google_id  text not null,
  username   text not null,
  batch      text not null,
  reason     text,
  granted_by text,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  spin_id    uuid references public.wheel_spins(id)
);
create index if not exists wheel_free_spin_credits_user_idx on public.wheel_free_spin_credits(google_id, used_at, expires_at);
create index if not exists wheel_free_spin_credits_batch_idx on public.wheel_free_spin_credits(batch);
alter table public.wheel_free_spin_credits enable row level security;
revoke all on public.wheel_free_spin_credits from anon, authenticated;

-- Grant `p_count` free spins to each username. One grant per batch per person: running it twice does nothing the second time.
create or replace function public.wheel_free_spin_grant(p_usernames text[], p_count int, p_expires timestamptz, p_batch text, p_reason text, p_by text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text; g text; res jsonb := '[]'::jsonb;
begin
  if p_count is null or p_count < 1 or p_count > 50 then return jsonb_build_object('ok', false, 'error', 'bad_count'); end if;
  if p_expires is null or p_expires <= now() then return jsonb_build_object('ok', false, 'error', 'bad_expiry'); end if;
  if coalesce(trim(p_batch), '') = '' then return jsonb_build_object('ok', false, 'error', 'batch_required'); end if;
  if coalesce(array_length(p_usernames, 1), 0) not between 1 and 50 then return jsonb_build_object('ok', false, 'error', 'bad_usernames'); end if;
  foreach u in array p_usernames loop
    u := lower(replace(trim(u), '@', ''));
    select google_id into g from username_claims where username = u;
    if g is null then res := res || jsonb_build_object('username', u, 'result', 'unknown_username'); continue; end if;
    if exists (select 1 from wheel_free_spin_credits where google_id = g and batch = p_batch) then
      res := res || jsonb_build_object('username', u, 'result', 'already_granted'); continue; end if;
    insert into wheel_free_spin_credits(google_id, username, batch, reason, granted_by, expires_at)
      select g, u, p_batch, p_reason, p_by, p_expires from generate_series(1, p_count);
    res := res || jsonb_build_object('username', u, 'result', 'granted', 'count', p_count);
  end loop;
  return jsonb_build_object('ok', true, 'results', res);
end $$;

-- Cancel the unused credits of a batch (used ones are history and stay).
create or replace function public.wheel_free_spin_revoke(p_batch text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update wheel_free_spin_credits set expires_at = now() where batch = p_batch and used_at is null and expires_at > now();
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'revoked', n);
end $$;

create or replace function public.wheel_free_spin_count(p_google text) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from wheel_free_spin_credits where google_id = p_google and used_at is null and expires_at > now() $$;

-- Spend one credit: soonest-expiring first. All or nothing: if the spin cannot be settled, the credit is NOT used.
create or replace function public.wheel_free_spin(p_google text, p_username text, p_is_tester boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w wheels%rowtype; cr wheel_free_spin_credits%rowtype; v_intent uuid; r jsonb;
begin
  select * into w from wheels where featured and status = 'active' limit 1;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if w.visibility = 'admin' and not p_is_tester then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if (w.starts_at is not null and w.starts_at > now()) or (w.ends_at is not null and w.ends_at < now()) then
    return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if not wheel_is_playable(w.id) then return jsonb_build_object('ok', false, 'error', 'not_playable'); end if;

  select * into cr from wheel_free_spin_credits
    where google_id = p_google and used_at is null and expires_at > now()
    order by expires_at, granted_at, id limit 1 for update skip locked;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_credit'); end if;

  insert into wheel_intents(wheel_id, google_id, username, price_tokens, price_usd, token_price_usd, lock_amount, eco_amount, expires_at)
    values (w.id, p_google, lower(p_username), 0, null, null, 0, 0, now() + interval '2 minutes') returning id into v_intent;
  r := wheel_spin_settle(v_intent, 'free:' || cr.id::text, 'free-spin', 0);
  if not coalesce((r->>'ok')::boolean, false) then raise exception 'free_spin_failed:%', coalesce(r->>'error', 'unknown'); end if;

  update wheel_free_spin_credits set used_at = now(), spin_id = (r->'spin'->>'id')::uuid where id = cr.id;
  return jsonb_build_object('ok', true, 'spin', r->'spin', 'remaining', wheel_free_spin_count(p_google));
end $$;

revoke all on function public.wheel_free_spin_grant(text[], int, timestamptz, text, text, text), public.wheel_free_spin_revoke(text),
  public.wheel_free_spin_count(text), public.wheel_free_spin(text, text, boolean) from public, anon, authenticated;
