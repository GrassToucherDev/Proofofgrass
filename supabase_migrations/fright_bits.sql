-- WAGO: Fright Bits — limited Halloween collectibles inside the existing WAGO Wheel. Safe to re-run.
--
-- These are IN-APP collectibles only (not NFTs, not tokens, not transferable). Each of the 10 characters exists once.
-- The Wheel's money flow is untouched: a spin is still ONE $TOUCHGRASS payment split 75% locked / 25% ecosystem.
--
-- HOW IT WORKS
--  * Every character is a wheel_prizes row (reward_type 'collectible', stock 1) linked through wheel_prizes.collectible_id.
--  * Only `max_active` (5) characters are on the wheel at once; the rest wait in reserve in reserve_order.
--  * When a spin wins a collectible, an AFTER INSERT trigger on wheel_spins runs in the SAME transaction as the settle:
--    it records the single owner, takes that prize off the wheel and promotes the next reserve character.
--  * Spins that win anything else never touch any of this.
--  * wheel_prizes.available_until is the Fright Bits cutoff. The one edit to the core Wheel is that the three candidate
--    queries in wheel_spin_settle also require `available_until is null or available_until >= intent.created_at`.
--  * LEGAL GATE: a collection cannot be started until paid_eligibility_enabled is switched on (after rules/legal review).
--
-- Everything here is service_role only; the web app reaches it through server APIs.

alter table public.wheel_prizes add column if not exists collectible_id uuid;
alter table public.wheel_prizes add column if not exists available_until timestamptz;

create table if not exists public.collectible_collections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name        text not null,
  description text,
  wheel_id    uuid references public.wheels(id),
  status      text not null default 'draft' check (status in ('draft','active','paused','ended')),
  max_active  int  not null default 5 check (max_active between 1 and 50),
  starts_at   timestamptz,
  ends_at     timestamptz,
  reveal_mode text not null default 'silhouette' check (reveal_mode in ('artwork','silhouette')),
  paid_eligibility_enabled boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.collectibles (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collectible_collections(id),
  number        int  not null check (number > 0),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name          text not null,
  character     text not null,
  description   text not null,
  rarity        text not null default 'rare' check (rarity in ('common','uncommon','rare','epic','legendary')),
  image_url     text not null,
  status        text not null default 'reserve' check (status in ('reserve','active','claimed','retired')),
  reserve_order int  not null,
  prize_id      uuid references public.wheel_prizes(id),
  claimed_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (collection_id, number)
);
create index if not exists collectibles_collection_idx on public.collectibles(collection_id, status, reserve_order);

-- One owner per collectible, forever: the unique index is the hard guarantee. Append-only.
create table if not exists public.collectible_ownership (
  id             uuid primary key default gen_random_uuid(),
  collectible_id uuid not null unique references public.collectibles(id),
  spin_id        uuid not null unique references public.wheel_spins(id),
  google_id      text not null,
  username       text not null,
  acquired_at    timestamptz not null default now()
);
create index if not exists collectible_ownership_user_idx on public.collectible_ownership(google_id);

create table if not exists public.collectible_events (
  id             bigint generated always as identity primary key,
  collection_id  uuid references public.collectible_collections(id),
  collectible_id uuid references public.collectibles(id),
  kind           text not null,
  detail         jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists collectible_events_idx on public.collectible_events(collection_id, id desc);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'wheel_prizes_collectible_fk') then
    alter table public.wheel_prizes add constraint wheel_prizes_collectible_fk foreign key (collectible_id) references public.collectibles(id);
  end if;
end $$;

alter table public.collectible_collections enable row level security;
alter table public.collectibles            enable row level security;
alter table public.collectible_ownership   enable row level security;
alter table public.collectible_events      enable row level security;
revoke all on public.collectible_collections, public.collectibles, public.collectible_ownership, public.collectible_events from anon, authenticated;

create or replace function public.collectible_append_only() returns trigger language plpgsql as $$
begin raise exception '% rows are append-only', tg_table_name; end $$;
drop trigger if exists collectible_ownership_guard on public.collectible_ownership;
create trigger collectible_ownership_guard before update or delete on public.collectible_ownership for each row execute function public.collectible_append_only();
drop trigger if exists collectible_events_guard on public.collectible_events;
create trigger collectible_events_guard before update or delete on public.collectible_events for each row execute function public.collectible_append_only();

-- Promote reserve characters until `max_active` are on the wheel. Only while the collection is live and before its end.
-- Callers hold the wheel's advisory lock (settle does; admin functions take it below).
create or replace function public.fright_bits_replenish(p_collection uuid) returns int language plpgsql security definer set search_path = public as $$
declare c collectible_collections%rowtype; n_active int; promoted int := 0; nxt collectibles%rowtype;
begin
  select * into c from collectible_collections where id = p_collection;
  if not found or c.status <> 'active' or (c.ends_at is not null and now() > c.ends_at) then return 0; end if;
  loop
    select count(*) into n_active from collectibles where collection_id = c.id and status = 'active';
    exit when n_active >= c.max_active;
    select * into nxt from collectibles where collection_id = c.id and status = 'reserve' order by reserve_order, number limit 1 for update;
    exit when not found;
    update collectibles set status = 'active' where id = nxt.id;
    update wheel_prizes set active = true where id = nxt.prize_id;
    insert into collectible_events(collection_id, collectible_id, kind, detail) values (c.id, nxt.id, 'activated', jsonb_build_object('name', nxt.name));
    promoted := promoted + 1;
  end loop;
  return promoted;
end $$;

-- Runs inside wheel_spin_settle's transaction whenever a spin is recorded.
create or replace function public.fright_bits_on_spin() returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid; col uuid; k collectibles%rowtype;
begin
  select collectible_id into cid from wheel_prizes where id = new.prize_id;
  if cid is null then return new; end if;   -- every ordinary prize: nothing happens

  select * into k from collectibles where id = cid for update;
  if k.status <> 'active' then raise exception 'collectible % is not on the wheel (status %)', k.slug, k.status; end if;
  col := k.collection_id;

  insert into collectible_ownership(collectible_id, spin_id, google_id, username) values (k.id, new.id, new.google_id, new.username);
  update collectibles set status = 'claimed', claimed_at = now() where id = k.id;
  update wheel_prizes set active = false where id = k.prize_id;
  insert into collectible_events(collection_id, collectible_id, kind, detail)
    values (col, k.id, 'claimed', jsonb_build_object('spin_id', new.id, 'username', new.username));
  perform fright_bits_replenish(col);

  -- The collectible is delivered by the ownership row itself, so the spin is complete.
  update wheel_spins set fulfillment_status = 'completed', fulfilled_at = now(), fulfillment_note = null where id = new.id;
  return new;
end $$;
drop trigger if exists fright_bits_on_spin_trg on public.wheel_spins;
create trigger fright_bits_on_spin_trg after insert on public.wheel_spins for each row execute function public.fright_bits_on_spin();

-- The single edit to the core Wheel: honour wheel_prizes.available_until in all three candidate queries of the settle.
-- It rewrites the live function and refuses to proceed unless it finds exactly the three expected places.
do $$
declare def text; pat constant text := '(p.inventory_remaining is null or p.inventory_remaining > 0)'; hits int;
begin
  select pg_get_functiondef('public.wheel_spin_settle(uuid,text,text,numeric)'::regprocedure) into def;
  if def like '%available_until%' then raise notice 'wheel_spin_settle already honours available_until'; return; end if;
  hits := (length(def) - length(replace(def, pat, ''))) / length(pat);
  if hits <> 3 then raise exception 'expected 3 stock predicates in wheel_spin_settle, found %', hits; end if;
  execute replace(def, pat, pat || ' and (p.available_until is null or p.available_until >= i.created_at)');
end $$;

-- ---- Admin / operations (service_role only) ----

create or replace function public.fright_bits_start(p_slug text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c collectible_collections%rowtype;
begin
  select * into c from collectible_collections where slug = p_slug for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not c.paid_eligibility_enabled then return jsonb_build_object('ok', false, 'error', 'legal_gate_closed'); end if;
  if c.status = 'ended' then return jsonb_build_object('ok', false, 'error', 'ended'); end if;
  if c.wheel_id is null then return jsonb_build_object('ok', false, 'error', 'no_wheel'); end if;
  perform pg_advisory_xact_lock(hashtext('wheel:' || c.wheel_id::text));
  update collectible_collections set status = 'active' where id = c.id;
  update wheel_prizes p set active = (k.status = 'active') from collectibles k where k.prize_id = p.id and k.collection_id = c.id;
  perform fright_bits_replenish(c.id);
  insert into collectible_events(collection_id, kind) values (c.id, 'started');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.fright_bits_pause(p_slug text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c collectible_collections%rowtype;
begin
  select * into c from collectible_collections where slug = p_slug for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if c.wheel_id is not null then perform pg_advisory_xact_lock(hashtext('wheel:' || c.wheel_id::text)); end if;
  update collectible_collections set status = 'paused' where id = c.id and status <> 'ended';
  update wheel_prizes p set active = false from collectibles k where k.prize_id = p.id and k.collection_id = c.id;
  insert into collectible_events(collection_id, kind) values (c.id, 'paused');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.fright_bits_end(p_slug text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c collectible_collections%rowtype;
begin
  select * into c from collectible_collections where slug = p_slug for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if c.wheel_id is not null then perform pg_advisory_xact_lock(hashtext('wheel:' || c.wheel_id::text)); end if;
  update collectible_collections set status = 'ended' where id = c.id;
  update wheel_prizes p set active = false from collectibles k where k.prize_id = p.id and k.collection_id = c.id;
  update collectibles set status = 'retired' where collection_id = c.id and status in ('reserve','active');
  insert into collectible_events(collection_id, kind) values (c.id, 'ended');
  return jsonb_build_object('ok', true);
end $$;

-- Opening or closing the legal gate. Closing it while live pauses the collection immediately.
create or replace function public.fright_bits_set_legal_gate(p_slug text, p_open boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare c collectible_collections%rowtype;
begin
  select * into c from collectible_collections where slug = p_slug for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  update collectible_collections set paid_eligibility_enabled = p_open where id = c.id;
  insert into collectible_events(collection_id, kind, detail) values (c.id, case when p_open then 'gate_opened' else 'gate_closed' end, '{}');
  if not p_open and c.status = 'active' then perform fright_bits_pause(p_slug); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.fright_bits_configure(p_slug text, p_reveal_mode text default null, p_max_active int default null, p_reserve_order text[] default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c collectible_collections%rowtype; i int; slugs text[] := coalesce(p_reserve_order, '{}');
begin
  select * into c from collectible_collections where slug = p_slug for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if p_reveal_mode is not null then
    if p_reveal_mode not in ('artwork','silhouette') then return jsonb_build_object('ok', false, 'error', 'bad_reveal_mode'); end if;
    update collectible_collections set reveal_mode = p_reveal_mode where id = c.id;
  end if;
  if p_max_active is not null then
    if p_max_active < 1 or p_max_active > 50 then return jsonb_build_object('ok', false, 'error', 'bad_max_active'); end if;
    update collectible_collections set max_active = p_max_active where id = c.id;
  end if;
  for i in 1..coalesce(array_length(slugs, 1), 0) loop
    update collectibles set reserve_order = i where collection_id = c.id and slug = slugs[i] and status = 'reserve';
  end loop;
  insert into collectible_events(collection_id, kind, detail) values (c.id, 'configured',
    jsonb_build_object('reveal_mode', p_reveal_mode, 'max_active', p_max_active, 'reserve_order', p_reserve_order));
  return jsonb_build_object('ok', true);
end $$;

-- Public-facing state for the gallery. Reserve characters follow reveal_mode: 'silhouette' never exposes name or art.
create or replace function public.fright_bits_state(p_slug text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c collectible_collections%rowtype;
begin
  select * into c from collectible_collections where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true,
    'collection', jsonb_build_object('slug', c.slug, 'name', c.name, 'description', c.description, 'status', c.status,
       'starts_at', c.starts_at, 'ends_at', c.ends_at, 'reveal_mode', c.reveal_mode, 'max_active', c.max_active,
       'purchasable', c.status = 'active' and c.paid_eligibility_enabled and (c.ends_at is null or now() <= c.ends_at)),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'number', k.number, 'slug', k.slug, 'status', k.status, 'rarity', k.rarity,
        'name',        case when k.status = 'reserve' and c.reveal_mode = 'silhouette' then null else k.name end,
        'character',   case when k.status = 'reserve' and c.reveal_mode = 'silhouette' then null else k.character end,
        'description', case when k.status = 'reserve' and c.reveal_mode = 'silhouette' then null else k.description end,
        'image_url',   case when k.status = 'reserve' and c.reveal_mode = 'silhouette' then null else k.image_url end,
        'silhouette',  k.status = 'reserve' and c.reveal_mode = 'silhouette',
        'owner',       o.username, 'claimed_at', k.claimed_at) order by k.number)
      from collectibles k left join collectible_ownership o on o.collectible_id = k.id
      where k.collection_id = c.id and k.status <> 'retired'), '[]'::jsonb),
    'counts', jsonb_build_object(
       'total',   (select count(*) from collectibles where collection_id = c.id),
       'claimed', (select count(*) from collectibles where collection_id = c.id and status = 'claimed'),
       'active',  (select count(*) from collectibles where collection_id = c.id and status = 'active'),
       'reserve', (select count(*) from collectibles where collection_id = c.id and status = 'reserve')));
end $$;

create or replace function public.fright_bits_for_user(p_google text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', k.slug, 'number', k.number, 'name', k.name, 'character', k.character,
      'description', k.description, 'rarity', k.rarity, 'image_url', k.image_url, 'acquired_at', o.acquired_at,
      'collection', c.slug, 'collection_name', c.name) order by o.acquired_at), '[]'::jsonb)
  from collectible_ownership o join collectibles k on k.id = o.collectible_id join collectible_collections c on c.id = k.collection_id
  where o.google_id = p_google $$;

revoke all on function public.fright_bits_replenish(uuid), public.fright_bits_on_spin(), public.fright_bits_start(text), public.fright_bits_pause(text),
  public.fright_bits_end(text), public.fright_bits_set_legal_gate(text, boolean), public.fright_bits_configure(text, text, int, text[]),
  public.fright_bits_state(text), public.fright_bits_for_user(text) from public, anon, authenticated;
