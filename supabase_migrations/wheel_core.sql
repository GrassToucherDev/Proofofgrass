-- WAGO Wheel foundation. Safe to re-run. Everything is service_role only; the web app reaches it through server APIs.
--
-- MONEY FLOW: a spin is ONE $TOUCHGRASS transfer to the existing Marketplace burn wallet. The lock/ecosystem split is
-- recorded here as bookkeeping (amount_locked / eco_amount). Locking is done by the team; lock_status only becomes
-- 'locked' when an admin records the lock transaction (wheel_lock_batch_mark).
--
-- RESULT RULES: the prize is chosen inside wheel_spin_settle, in the same transaction that takes inventory and records
-- the spin. A spin row is never updated with a different prize. One payment signature -> at most one spin.

create table if not exists public.wheels (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name          text not null check (char_length(name) between 2 and 80),
  description   text,
  hero_image    text,
  status        text not null default 'draft' check (status in ('draft','active','ended')),
  visibility    text not null default 'admin' check (visibility in ('admin','public')),
  featured      boolean not null default false,
  starts_at     timestamptz,
  ends_at       timestamptz,
  price_mode    text not null default 'usd' check (price_mode in ('usd','tokens')),
  price_usd     numeric(10,2) check (price_usd is null or price_usd > 0),
  price_tokens  numeric(20,6) check (price_tokens is null or price_tokens > 0),
  lock_pct      int not null default 75 check (lock_pct between 0 and 100),
  eco_pct       int not null default 25 check (eco_pct between 0 and 100),
  lock_days     int check (lock_days is null or lock_days > 0),
  meter_enabled boolean not null default true,
  meter_spins   int not null default 10 check (meter_spins between 2 and 100),
  meter_min_rarity text not null default 'rare' check (meter_min_rarity in ('common','uncommon','rare','epic','legendary')),
  created_at    timestamptz not null default now(),
  check (lock_pct + eco_pct = 100),
  check ((price_mode = 'usd' and price_usd is not null) or (price_mode = 'tokens' and price_tokens is not null))
);
create unique index if not exists wheels_one_featured on public.wheels (featured) where featured;

create table if not exists public.wheel_prizes (
  id                  uuid primary key default gen_random_uuid(),
  wheel_id            uuid not null references public.wheels(id) on delete cascade,
  name                text not null check (char_length(name) between 2 and 80),
  description         text,
  reward_type         text not null check (reward_type in
                        ('cosmetic_pack','shield','sunset_pass','grass_tickets','spl_token','touchgrass','sol','nft','badge','collectible','partner_asset','manual')),
  reward_config       jsonb not null default '{}'::jsonb,
  rarity              text not null default 'common' check (rarity in ('common','uncommon','rare','epic','legendary')),
  weight              numeric(12,4) not null check (weight > 0),
  inventory_total     int check (inventory_total is null or inventory_total >= 0),
  inventory_remaining int check (inventory_remaining is null or inventory_remaining >= 0),
  image_url           text,
  segment             int not null default 0 check (segment >= 0),
  active              boolean not null default true,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  check ((inventory_total is null) = (inventory_remaining is null))
);
create index if not exists wheel_prizes_wheel_idx on public.wheel_prizes(wheel_id);

create table if not exists public.wheel_intents (
  id              uuid primary key default gen_random_uuid(),
  wheel_id        uuid not null references public.wheels(id),
  google_id       text not null,
  username        text not null,
  price_tokens    numeric(20,6) not null check (price_tokens > 0),
  price_usd       numeric(10,2),
  token_price_usd numeric(24,12),
  lock_amount     numeric(20,6) not null,
  eco_amount      numeric(20,6) not null,
  status          text not null default 'pending' check (status in ('pending','settled')),
  spin_id         uuid,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null
);
create index if not exists wheel_intents_user_idx on public.wheel_intents(google_id, created_at desc);

create table if not exists public.wheel_lock_batches (
  id            uuid primary key default gen_random_uuid(),
  lock_tx       text not null unique,
  locked_amount numeric(20,6) not null,
  spin_count    int not null,
  note          text,
  created_at    timestamptz not null default now()
);

create table if not exists public.wheel_spins (
  id                 uuid primary key default gen_random_uuid(),
  wheel_id           uuid not null references public.wheels(id),
  intent_id          uuid not null unique references public.wheel_intents(id),
  google_id          text not null,
  username           text not null,
  wallet             text not null,
  payment_tx         text not null unique,
  spin_price         numeric(20,6) not null,
  amount_locked      numeric(20,6) not null,
  eco_amount         numeric(20,6) not null,
  lock_status        text not null default 'queued' check (lock_status in ('queued','locked')),
  lock_batch_id      uuid references public.wheel_lock_batches(id),
  prize_id           uuid references public.wheel_prizes(id),
  prize_snapshot     jsonb not null,
  rarity             text not null,
  meter_guaranteed   boolean not null default false,
  segment            int not null default 0,
  fulfillment_status text not null default 'pending' check (fulfillment_status in ('pending','processing','completed','failed','manual_required')),
  fulfillment_tx     text,
  fulfillment_note   text,
  created_at         timestamptz not null default now(),
  fulfilled_at       timestamptz
);
create index if not exists wheel_spins_user_idx   on public.wheel_spins(google_id, created_at desc);
create index if not exists wheel_spins_wheel_idx  on public.wheel_spins(wheel_id, created_at desc);
create index if not exists wheel_spins_fulfil_idx on public.wheel_spins(fulfillment_status);

create table if not exists public.wheel_meters (
  wheel_id  uuid not null references public.wheels(id) on delete cascade,
  google_id text not null,
  count     int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (wheel_id, google_id)
);

alter table public.wheels            enable row level security;
alter table public.wheel_prizes      enable row level security;
alter table public.wheel_intents     enable row level security;
alter table public.wheel_lock_batches enable row level security;
alter table public.wheel_spins       enable row level security;
alter table public.wheel_meters      enable row level security;
revoke all on public.wheels, public.wheel_prizes, public.wheel_intents, public.wheel_lock_batches, public.wheel_spins, public.wheel_meters from anon, authenticated;

-- Spins are append-only: the prize, price and payment can never be edited after the fact.
create or replace function public.wheel_spins_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'wheel_spins rows cannot be deleted'; end if;
  if new.prize_id is distinct from old.prize_id or new.prize_snapshot is distinct from old.prize_snapshot
     or new.payment_tx <> old.payment_tx or new.spin_price <> old.spin_price or new.google_id <> old.google_id
     or new.amount_locked <> old.amount_locked or new.eco_amount <> old.eco_amount or new.rarity <> old.rarity
     or new.segment <> old.segment then
    raise exception 'wheel_spins result fields are immutable';
  end if;
  return new;
end $$;
drop trigger if exists wheel_spins_guard_trg on public.wheel_spins;
create trigger wheel_spins_guard_trg before update or delete on public.wheel_spins for each row execute function public.wheel_spins_guard();

create or replace function public.wheel_rarity_rank(r text) returns int language sql immutable as $$
  select case r when 'common' then 1 when 'uncommon' then 2 when 'rare' then 3 when 'epic' then 4 when 'legendary' then 5 else 0 end $$;

-- A wheel can only run if a draw can never fail: at least one active, unlimited-stock prize that is not a one-time
-- cosmetic (a user who already owns it would be skipped).
create or replace function public.wheel_is_playable(p_wheel uuid) returns boolean language sql stable as $$
  select exists (select 1 from wheel_prizes where wheel_id = p_wheel and active and inventory_total is null and reward_type <> 'cosmetic_pack') $$;

-- Start a spin: fixes the price and the lock/ecosystem split BEFORE the wallet is asked to pay.
create or replace function public.wheel_intent_create(p_wheel uuid, p_google text, p_username text, p_token_price_usd numeric, p_is_tester boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w wheels%rowtype; v_tokens numeric; v_lock numeric; v_eco numeric; v_open wheel_intents%rowtype; v_id uuid; v_recent int;
begin
  select * into w from wheels where id = p_wheel;
  if not found or w.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if w.visibility = 'admin' and not p_is_tester then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if (w.starts_at is not null and w.starts_at > now()) or (w.ends_at is not null and w.ends_at < now()) then
    return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if not wheel_is_playable(p_wheel) then return jsonb_build_object('ok', false, 'error', 'not_playable'); end if;

  select count(*) into v_recent from wheel_intents where google_id = p_google and created_at > now() - interval '1 hour';
  if v_recent >= 30 then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;

  -- Reuse a recent unpaid intent so refreshing never piles up quotes.
  select * into v_open from wheel_intents where wheel_id = p_wheel and google_id = p_google and status = 'pending' and expires_at > now()
    order by created_at desc limit 1;
  if found then
    return jsonb_build_object('ok', true, 'intent_id', v_open.id, 'price_tokens', v_open.price_tokens, 'lock_amount', v_open.lock_amount, 'eco_amount', v_open.eco_amount, 'expires_at', v_open.expires_at, 'price_usd', v_open.price_usd);
  end if;

  if w.price_mode = 'usd' then
    if p_token_price_usd is null or p_token_price_usd <= 0 then return jsonb_build_object('ok', false, 'error', 'price_unavailable'); end if;
    v_tokens := ceil(w.price_usd / p_token_price_usd);
  else
    v_tokens := w.price_tokens;
  end if;
  v_lock := round(v_tokens * w.lock_pct / 100.0, 6);
  v_eco  := v_tokens - v_lock;
  insert into wheel_intents(wheel_id, google_id, username, price_tokens, price_usd, token_price_usd, lock_amount, eco_amount, expires_at)
    values (p_wheel, p_google, lower(p_username), v_tokens, case when w.price_mode='usd' then w.price_usd end, p_token_price_usd, v_lock, v_eco, now() + interval '30 minutes')
    returning id into v_id;
  return jsonb_build_object('ok', true, 'intent_id', v_id, 'price_tokens', v_tokens, 'lock_amount', v_lock, 'eco_amount', v_eco, 'expires_at', now() + interval '30 minutes', 'price_usd', case when w.price_mode='usd' then w.price_usd end);
end $$;

create or replace function public.wheel_spin_json(s wheel_spins) returns jsonb language sql stable as $$
  select jsonb_build_object('id', s.id, 'wheel_id', s.wheel_id, 'username', s.username, 'prize', s.prize_snapshot, 'rarity', s.rarity,
    'segment', s.segment, 'meter_guaranteed', s.meter_guaranteed, 'fulfillment_status', s.fulfillment_status,
    'lock_status', s.lock_status, 'created_at', s.created_at) $$;

-- Settle a verified payment into exactly one spin. The API has already checked the transaction on-chain.
create or replace function public.wheel_spin_settle(p_intent uuid, p_signature text, p_wallet text, p_received numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  i wheel_intents%rowtype; w wheels%rowtype; s wheel_spins%rowtype; m_count int; guaranteed boolean := false;
  r numeric; total numeric; acc numeric := 0; pick wheel_prizes%rowtype; cand record; min_rank int; got boolean := false;
  owned_ids text[]; snap jsonb; v_spin uuid;
begin
  select * into i from wheel_intents where id = p_intent for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'intent_not_found'); end if;

  select * into s from wheel_spins where payment_tx = p_signature;
  if found then
    if s.intent_id = p_intent then return jsonb_build_object('ok', true, 'replay', true, 'spin', wheel_spin_json(s)); end if;
    return jsonb_build_object('ok', false, 'error', 'signature_used');
  end if;
  if i.status = 'settled' then return jsonb_build_object('ok', false, 'error', 'intent_already_paid'); end if;
  if p_received < i.price_tokens * 0.99 then return jsonb_build_object('ok', false, 'error', 'underpaid'); end if;

  select * into w from wheels where id = i.wheel_id;
  perform pg_advisory_xact_lock(hashtext('wheel:' || w.id::text));

  -- The meter is per Google account and wheel; the row lock makes concurrent spins count one at a time.
  insert into wheel_meters(wheel_id, google_id, count) values (w.id, i.google_id, 0) on conflict do nothing;
  select count into m_count from wheel_meters where wheel_id = w.id and google_id = i.google_id for update;
  m_count := m_count + 1;
  guaranteed := w.meter_enabled and m_count >= w.meter_spins;
  min_rank := wheel_rarity_rank(w.meter_min_rarity);

  -- Cover packs the user already owns are skipped (they could not be granted twice).
  select coalesce(array_agg(item_id), '{}') into owned_ids from "UserInventory" where lower(username) = i.username and owned;

  for pass in 1..2 loop
    select coalesce(sum(weight), 0) into total from wheel_prizes p
      where p.wheel_id = w.id and p.active and (p.inventory_remaining is null or p.inventory_remaining > 0)
        and not (p.reward_type = 'cosmetic_pack' and (p.reward_config->>'item_id') = any(owned_ids))
        and (pass = 2 or not guaranteed or wheel_rarity_rank(p.rarity) >= min_rank);
    if total > 0 then
      r := (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))::bit(48)::bigint)::numeric / 281474976710656.0 * total;
      for cand in
        select * from wheel_prizes p
         where p.wheel_id = w.id and p.active and (p.inventory_remaining is null or p.inventory_remaining > 0)
           and not (p.reward_type = 'cosmetic_pack' and (p.reward_config->>'item_id') = any(owned_ids))
           and (pass = 2 or not guaranteed or wheel_rarity_rank(p.rarity) >= min_rank)
         order by p.sort_order, p.id
      loop
        acc := acc + cand.weight;
        if r < acc then pick := cand; got := true; exit; end if;
      end loop;
      if not got then  -- floating point edge: take the last candidate
        select * into pick from wheel_prizes p
         where p.wheel_id = w.id and p.active and (p.inventory_remaining is null or p.inventory_remaining > 0)
           and not (p.reward_type = 'cosmetic_pack' and (p.reward_config->>'item_id') = any(owned_ids))
           and (pass = 2 or not guaranteed or wheel_rarity_rank(p.rarity) >= min_rank)
         order by p.sort_order desc, p.id desc limit 1;
        got := true;
      end if;
    end if;
    exit when got;
  end loop;
  if not got then return jsonb_build_object('ok', false, 'error', 'pool_empty'); end if;

  if pick.inventory_remaining is not null then
    update wheel_prizes set inventory_remaining = inventory_remaining - 1 where id = pick.id and inventory_remaining > 0;
    if not found then return jsonb_build_object('ok', false, 'error', 'inventory_conflict'); end if;
  end if;

  snap := jsonb_build_object('id', pick.id, 'name', pick.name, 'description', pick.description, 'reward_type', pick.reward_type,
    'reward_config', pick.reward_config, 'rarity', pick.rarity, 'image_url', pick.image_url, 'segment', pick.segment);
  insert into wheel_spins(wheel_id, intent_id, google_id, username, wallet, payment_tx, spin_price, amount_locked, eco_amount,
      prize_id, prize_snapshot, rarity, meter_guaranteed, segment, fulfillment_status)
    values (w.id, i.id, i.google_id, i.username, p_wallet, p_signature, i.price_tokens, i.lock_amount, i.eco_amount,
      pick.id, snap, pick.rarity, guaranteed and wheel_rarity_rank(pick.rarity) >= min_rank, pick.segment,
      case when pick.reward_type in ('cosmetic_pack','shield','sunset_pass','grass_tickets') then 'pending' else 'manual_required' end)
    returning id into v_spin;

  update wheel_meters set count = case when guaranteed and wheel_rarity_rank(pick.rarity) >= min_rank then 0 else m_count end, updated_at = now()
    where wheel_id = w.id and google_id = i.google_id;
  update wheel_intents set status = 'settled', spin_id = v_spin where id = i.id;
  select * into s from wheel_spins where id = v_spin;
  return jsonb_build_object('ok', true, 'replay', false, 'spin', wheel_spin_json(s));
end $$;

-- Grant an automatic prize. Safe to call twice: only one caller can move a spin out of pending/failed.
create or replace function public.wheel_fulfill(p_spin uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare s wheel_spins%rowtype; cfg jsonb; t text; qty int; cyc uuid; slugs text[]; item text; cur text[];
begin
  update wheel_spins set fulfillment_status = 'processing' where id = p_spin and fulfillment_status in ('pending','failed') returning * into s;
  if not found then
    select * into s from wheel_spins where id = p_spin;
    if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
    return jsonb_build_object('ok', true, 'status', s.fulfillment_status);
  end if;
  t := s.prize_snapshot->>'reward_type'; cfg := coalesce(s.prize_snapshot->'reward_config', '{}'::jsonb);

  if t in ('shield','sunset_pass') then
    qty := greatest(coalesce((cfg->>'quantity')::int, 1), 1);
    insert into "UserConsumables"(username, consumable_type, quantity) values (s.username, case t when 'shield' then 'shield' else 'sunset_pass' end, qty)
      on conflict (username, consumable_type) do update set quantity = "UserConsumables".quantity + qty, updated_at = now();
    insert into "ConsumableEvents"(username, consumable_type, event_type, quantity, metadata)
      values (s.username, case t when 'shield' then 'shield' else 'sunset_pass' end, 'granted', qty, jsonb_build_object('source', 'wago_wheel', 'spin_id', s.id));
    if t = 'shield' then update "Streaks" set shield_count = coalesce(shield_count, 0) + qty where lower(username) = s.username; end if;

  elsif t = 'cosmetic_pack' then
    item := cfg->>'item_id';
    select coalesce(array_agg(x), '{}') into slugs from jsonb_array_elements_text(coalesce(cfg->'cover_slugs', '[]'::jsonb)) x;
    insert into "UserInventory"(username, item_id, owned, equipped, purchased_at) values (s.username, item, true, false, now())
      on conflict (username, item_id) do update set owned = true;
    select coalesce(unlocked_covers, '{}') into cur from "Profiles" where lower(username) = s.username;
    update "Profiles" set unlocked_covers = (select coalesce(array_agg(distinct e), '{}') from unnest(coalesce(cur, '{}') || slugs) e) where lower(username) = s.username;

  elsif t = 'grass_tickets' then
    qty := greatest(coalesce((cfg->>'amount')::int, 1), 1);
    select id into cyc from grass_draw_cycles where status = 'active' and starts_at <= now() and ends_at >= now() limit 1;
    if cyc is null then
      update wheel_spins set fulfillment_status = 'failed', fulfillment_note = 'No active Grass Draw cycle. Retry when one is open.' where id = s.id;
      return jsonb_build_object('ok', false, 'error', 'no_active_cycle');
    end if;
    if not exists (select 1 from grass_draw_entries where entry_type = 'wheel' and source_id = s.id::text) then
      insert into grass_draw_entries(cycle_id, username, entry_type, source_id, raw_amount, weighted_amount, multiplier, notes, metadata)
        values (cyc, s.username, 'wheel', s.id::text, qty, qty, 1.0, 'WAGO Wheel prize', jsonb_build_object('awarded_by', 'wago_wheel', 'spin_id', s.id));
      perform recalculate_draw_totals(cyc, s.username);
    end if;
  else
    update wheel_spins set fulfillment_status = 'manual_required' where id = s.id;
    return jsonb_build_object('ok', true, 'status', 'manual_required');
  end if;

  update wheel_spins set fulfillment_status = 'completed', fulfilled_at = now(), fulfillment_note = null where id = s.id;
  return jsonb_build_object('ok', true, 'status', 'completed');
exception when others then
  update wheel_spins set fulfillment_status = 'failed', fulfillment_note = left(sqlerrm, 300) where id = p_spin and fulfillment_status in ('pending','processing','failed');
  return jsonb_build_object('ok', false, 'error', 'fulfillment_failed');
end $$;

-- Admin: a manual prize (token, NFT, collectible...) was sent. Records the transaction or note.
create or replace function public.wheel_manual_complete(p_spin uuid, p_tx text, p_note text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update wheel_spins set fulfillment_status = 'completed', fulfillment_tx = p_tx, fulfillment_note = p_note, fulfilled_at = now()
    where id = p_spin and fulfillment_status in ('manual_required','failed','processing');
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1, 'error', case when n = 1 then null else 'not_eligible' end);
end $$;

-- Admin: the team locked a batch of tokens. Marks the chosen queued spins as locked, once.
create or replace function public.wheel_lock_batch_mark(p_lock_tx text, p_spin_ids uuid[], p_note text) returns jsonb language plpgsql security definer set search_path = public as $$
declare b uuid; amt numeric; n int;
begin
  select coalesce(sum(amount_locked), 0), count(*) into amt, n from wheel_spins where id = any(p_spin_ids) and lock_status = 'queued';
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'nothing_to_lock'); end if;
  insert into wheel_lock_batches(lock_tx, locked_amount, spin_count, note) values (p_lock_tx, amt, n, p_note) returning id into b;
  update wheel_spins set lock_status = 'locked', lock_batch_id = b where id = any(p_spin_ids) and lock_status = 'queued';
  return jsonb_build_object('ok', true, 'batch_id', b, 'locked_amount', amt, 'spin_count', n);
exception when unique_violation then return jsonb_build_object('ok', false, 'error', 'lock_tx_used');
end $$;

create or replace function public.wheel_stats(p_wheel uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_spins', count(*),
    'prizes_claimed', count(*) filter (where fulfillment_status = 'completed'),
    'locked_amount', coalesce(sum(amount_locked) filter (where lock_status = 'locked'), 0),
    'queued_amount', coalesce(sum(amount_locked) filter (where lock_status = 'queued'), 0))
  from wheel_spins where wheel_id = p_wheel $$;

revoke all on function public.wheel_spins_guard(), public.wheel_rarity_rank(text), public.wheel_is_playable(uuid) from public, anon, authenticated;
revoke all on function public.wheel_intent_create(uuid, text, text, numeric, boolean), public.wheel_spin_json(wheel_spins),
  public.wheel_spin_settle(uuid, text, text, numeric), public.wheel_fulfill(uuid), public.wheel_manual_complete(uuid, text, text),
  public.wheel_lock_batch_mark(text, uuid[], text), public.wheel_stats(uuid) from public, anon, authenticated;
grant execute on function public.wheel_is_playable(uuid), public.wheel_rarity_rank(text), public.wheel_intent_create(uuid, text, text, numeric, boolean),
  public.wheel_spin_json(wheel_spins), public.wheel_spin_settle(uuid, text, text, numeric), public.wheel_fulfill(uuid),
  public.wheel_manual_complete(uuid, text, text), public.wheel_lock_batch_mark(text, uuid[], text), public.wheel_stats(uuid) to service_role;

-- Grass Draw entries may now be of type 'wheel' (same list as before, plus 'wheel').
alter table grass_draw_entries drop constraint if exists grass_draw_entries_entry_type_check;
alter table grass_draw_entries add constraint grass_draw_entries_entry_type_check
  check (entry_type = any (array['proof','spotlight','flex_card','field_guide','x_engagement','challenge_win','referral_convert','manual','wago_proof','wago_trail','wheel']::text[]));
