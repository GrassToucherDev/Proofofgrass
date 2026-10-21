-- Grove banners: illustrated cosmetics a Grove unlocks with $TOUCHGRASS. Safe to re-run.
-- Requires groves.sql (and the grove_create fix) to be applied first.
--
-- DECISIONS BAKED IN
--   * A banner unlock belongs to the GROVE (groves.id), never to the buyer or the Grove's name.
--     It stays when the buyer leaves, and survives ownership transfers. The buyer is only recorded.
--   * Any current member can buy; only the Grove OWNER (groves.owner_username) can equip. Buying
--     does not equip.
--   * Cosmetic only: nothing here touches streaks, shields, rewards or the leaderboard.
--   * Prices are USD (like every other Marketplace item) and converted to $TOUCHGRASS at the live
--     quote by the existing verify flow. price_usd NULL = not purchasable yet. No prices are invented.
--   * Purchases are bound to a Grove + banner BEFORE the wallet is asked to pay ("intent"). Once a
--     payment exists it is fulfilled for the bound Grove even if membership changes meanwhile.
--   * Owner = groves.owner_username. An owner can't leave a populated Grove without naming a
--     successor who is a current member.
--   * All functions are service_role-only. API routes call utils/requireOwner first.

-- ── Catalog ──────────────────────────────────────────────────────────────────
create table if not exists grove_banners (
  id          text primary key check (id ~ '^[a-z0-9_]+$'),
  name        text not null,
  description text,
  art_path    text,                                   -- e.g. /grove-banners/campfire-crew.webp (null = built-in fallback art)
  price_usd   numeric(10,2) check (price_usd is null or price_usd > 0),
  is_default  boolean not null default false,
  available   boolean not null default true,
  sort_order  int not null default 0
);
insert into grove_banners (id, name, description, art_path, is_default, sort_order) values
  ('default',        'Default',        'The free Grove meadow.',                      '/grove-banners/default.webp',        true,  0),
  ('campfire_crew',  'Campfire Crew',  'A cozy woodland campsite at night.',          '/grove-banners/campfire-crew.webp',  false, 1),
  ('trailblazers',   'Trailblazers',   'A mountain trail at sunrise.',                '/grove-banners/trailblazers.webp',   false, 2),
  ('rooted_together','Rooted Together','A lush woodland clearing.',                   '/grove-banners/rooted-together.webp',false, 3),
  ('sunset_shores',  'Sunset Shores',  'A sunny beach at golden hour.',               '/grove-banners/sunset-shores.webp',  false, 4)
on conflict (id) do nothing;      -- never overwrites anything you have configured

-- Launch price: $5.00 USD per paid banner. Only fills banners that have NO price yet, so re-running this
-- file never overwrites a price you changed later. Change one with: update grove_banners set price_usd = 7.5 where id = 'campfire_crew';
update grove_banners set price_usd = 5.00 where not is_default and price_usd is null;

-- ── Grove columns ────────────────────────────────────────────────────────────
alter table groves add column if not exists owner_username text;
update groves g set owner_username = coalesce(
  (select m.username from grove_members m where m.grove_id = g.id and m.left_at is null and lower(m.username) = lower(g.created_by) limit 1),
  (select m.username from grove_members m where m.grove_id = g.id and m.left_at is null order by m.joined_at limit 1),
  lower(g.created_by))
where owner_username is null;
alter table groves add column if not exists active_banner_id text not null default 'default' references grove_banners(id);

create or replace function groves_set_owner() returns trigger language plpgsql as $$
begin
  if new.owner_username is null then new.owner_username := lower(new.created_by); end if;
  return new;
end $$;
drop trigger if exists groves_set_owner_trg on groves;
create trigger groves_set_owner_trg before insert on groves for each row execute function groves_set_owner();

-- ── Unlocks + purchase intents ───────────────────────────────────────────────
create table if not exists grove_banner_purchases (          -- one row per checkout attempt
  id                    uuid primary key default gen_random_uuid(),
  grove_id              uuid not null references groves(id),
  banner_id             text not null references grove_banners(id),
  buyer                 text not null,
  price_usd             numeric(10,2) not null check (price_usd > 0),   -- snapshot at checkout
  status                text not null default 'pending' check (status in ('pending','completed','expired','duplicate','failed')),
  transaction_signature text unique,
  created_at            timestamptz not null default now(),
  expires_at            timestamptz not null default now() + interval '30 minutes',
  completed_at          timestamptz,
  note                  text
);
-- at most ONE live checkout per Grove+banner: this is the concurrency guard for two members buying at once
create unique index if not exists grove_banner_one_pending on grove_banner_purchases (grove_id, banner_id) where status = 'pending';
create index if not exists grove_banner_purchases_buyer_idx on grove_banner_purchases (lower(buyer), created_at);

create table if not exists grove_banner_unlocks (
  grove_id              uuid not null references groves(id),   -- no cascade: history is kept even if a Grove disbands
  banner_id             text not null references grove_banners(id),
  purchased_by          text not null,
  purchase_id           uuid references grove_banner_purchases(id),
  transaction_signature text unique,
  price_usd             numeric(10,2),
  tokens_paid           numeric,
  unlocked_at           timestamptz not null default now(),
  primary key (grove_id, banner_id)                            -- each banner unlocks once per Grove
);

alter table grove_banners          enable row level security;
alter table grove_banner_purchases enable row level security;
alter table grove_banner_unlocks   enable row level security;
-- catalog is public-readable art/price info; everything else is service_role only
drop policy if exists grove_banners_read on grove_banners;
create policy grove_banners_read on grove_banners for select using (true);
revoke all on grove_banner_purchases, grove_banner_unlocks from anon, authenticated;
revoke insert, update, delete on grove_banners from anon, authenticated;

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function grove_of(p_username text) returns uuid
language sql stable security definer set search_path = public as $$
  select m.grove_id from grove_members m join groves g on g.id = m.grove_id
   where lower(m.username) = lower(btrim(p_username)) and m.left_at is null and g.disbanded_at is null limit 1;
$$;

-- ── Ownership: transfer + leave ──────────────────────────────────────────────
create or replace function grove_transfer_owner(p_username text, p_new_owner text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(btrim(p_username)); n text := lower(btrim(coalesce(p_new_owner,''))); v_grove uuid; v_owner text;
begin
  v_grove := grove_of(u);
  if v_grove is null then return jsonb_build_object('ok', false, 'error', 'not_in_grove'); end if;
  select owner_username into v_owner from groves where id = v_grove for update;
  if lower(v_owner) <> u then return jsonb_build_object('ok', false, 'error', 'owner_only'); end if;
  if n = '' or n = u or not exists (select 1 from grove_members where grove_id = v_grove and lower(username) = n and left_at is null) then
    return jsonb_build_object('ok', false, 'error', 'bad_new_owner');
  end if;
  update groves set owner_username = n where id = v_grove;     -- unlocks + equipped banner stay with the Grove
  return jsonb_build_object('ok', true, 'owner', n);
end $$;

drop function if exists grove_leave(text);
create or replace function grove_leave(p_username text, p_new_owner text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u text := lower(btrim(p_username));
  n text := lower(btrim(coalesce(p_new_owner,'')));
  v_grove uuid; v_owner text; v_others int;
begin
  v_grove := grove_of(u);
  if v_grove is null then return jsonb_build_object('ok', false, 'error', 'not_in_grove'); end if;
  select owner_username into v_owner from groves where id = v_grove for update;
  select count(*) into v_others from grove_members where grove_id = v_grove and left_at is null and lower(username) <> u;
  if lower(v_owner) = u and v_others > 0 then
    if n = '' then return jsonb_build_object('ok', false, 'error', 'transfer_required'); end if;
    if n = u or not exists (select 1 from grove_members where grove_id = v_grove and lower(username) = n and left_at is null) then
      return jsonb_build_object('ok', false, 'error', 'bad_new_owner');
    end if;
    update groves set owner_username = n where id = v_grove;
  end if;
  update grove_members set left_at = now() where grove_id = v_grove and lower(username) = u and left_at is null;
  if v_others = 0 then update groves set disbanded_at = now() where id = v_grove; end if;
  return jsonb_build_object('ok', true, 'cooldown_until', now() + interval '48 hours');
end $$;

-- ── grove_get: same as before plus owner + equipped banner ───────────────────
create or replace function grove_get(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  u text := lower(btrim(p_username));
  g groves%rowtype;
  v_today date := (now() at time zone 'UTC')::date;
  v_members jsonb; v_code text;
begin
  select g2.* into g from groves g2
    join grove_members m on m.grove_id = g2.id and lower(m.username) = u and m.left_at is null
   where g2.disbanded_at is null;
  if not found then
    return jsonb_build_object('grove', null, 'cooldown_until', case when grove_cooldown_until(u) > now() then grove_cooldown_until(u) end);
  end if;
  select jsonb_agg(jsonb_build_object(
           'username', m.username, 'joined_at', m.joined_at,
           'locked_today', exists (
             select 1 from "Submissions" s
             where lower(s.username) = m.username and s.status in ('pending','approved')
               and (s.created_at at time zone 'UTC')::date = v_today)
         ) order by m.joined_at)
    into v_members
  from grove_members m where m.grove_id = g.id and m.left_at is null;
  select code into v_code from grove_invites where grove_id = g.id and expires_at > now() order by created_at desc limit 1;
  return jsonb_build_object(
    'grove', jsonb_build_object('id', g.id, 'name', g.name, 'slots', g.slots, 'created_at', g.created_at, 'invite_code', v_code,
                                'owner', lower(g.owner_username), 'active_banner', g.active_banner_id),
    'members', coalesce(v_members, '[]'::jsonb),
    'streak', grove_streak(g.id)
  );
end $$;

-- ── Banner collection for the caller's Grove (or the bare catalog if they have none) ──
create or replace function grove_banners_get(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_grove uuid := grove_of(p_username); g groves%rowtype;
begin
  if v_grove is not null then select * into g from groves where id = v_grove; end if;
  return jsonb_build_object(
    'grove_id',     v_grove,
    'grove_name',   g.name,
    'owner',        lower(g.owner_username),
    'active',       coalesce(g.active_banner_id, 'default'),
    'banners', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'art_path', b.art_path,
        'price_usd', b.price_usd, 'is_default', b.is_default,
        'purchasable', (not b.is_default and b.available and b.price_usd is not null),
        'unlocked', (b.is_default or u.grove_id is not null),
        'unlocked_by', u.purchased_by,
        'pending', exists (select 1 from grove_banner_purchases p where p.grove_id = v_grove and p.banner_id = b.id and p.status = 'pending' and p.expires_at > now())
      ) order by b.sort_order)
      from grove_banners b left join grove_banner_unlocks u on u.banner_id = b.id and u.grove_id = v_grove
      where b.available or b.is_default or u.grove_id is not null), '[]'::jsonb));
end $$;

-- ── Equip (owner only; must be unlocked or the free default) ─────────────────
create or replace function grove_equip_banner(p_username text, p_banner text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(btrim(p_username)); v_grove uuid; v_owner text; b grove_banners%rowtype;
begin
  v_grove := grove_of(u);
  if v_grove is null then return jsonb_build_object('ok', false, 'error', 'not_in_grove'); end if;
  select owner_username into v_owner from groves where id = v_grove for update;
  if lower(v_owner) <> u then return jsonb_build_object('ok', false, 'error', 'owner_only'); end if;
  select * into b from grove_banners where id = p_banner;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown_banner'); end if;
  if not b.is_default and not exists (select 1 from grove_banner_unlocks where grove_id = v_grove and banner_id = b.id) then
    return jsonb_build_object('ok', false, 'error', 'not_unlocked');
  end if;
  update groves set active_banner_id = b.id where id = v_grove;
  return jsonb_build_object('ok', true, 'active', b.id);
end $$;

-- ── Checkout intent: binds Grove + banner + buyer BEFORE the wallet pays ─────
create or replace function grove_banner_intent(p_username text, p_banner text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u text := lower(btrim(p_username)); v_grove uuid; g groves%rowtype; b grove_banners%rowtype; v_pend grove_banner_purchases%rowtype; v_id uuid;
begin
  v_grove := grove_of(u);
  if v_grove is null then return jsonb_build_object('ok', false, 'error', 'not_in_grove'); end if;
  select * into g from groves where id = v_grove for update;          -- serialises concurrent buyers
  select * into b from grove_banners where id = p_banner;
  if not found or b.is_default or not b.available then return jsonb_build_object('ok', false, 'error', 'unavailable'); end if;
  if b.price_usd is null then return jsonb_build_object('ok', false, 'error', 'price_not_set'); end if;
  if exists (select 1 from grove_banner_unlocks where grove_id = v_grove and banner_id = b.id) then
    return jsonb_build_object('ok', false, 'error', 'already_unlocked');
  end if;
  -- stale checkouts stop reserving, but a late payment against them can still be fulfilled
  update grove_banner_purchases set status = 'expired' where grove_id = v_grove and banner_id = b.id and status = 'pending' and expires_at < now();
  select * into v_pend from grove_banner_purchases where grove_id = v_grove and banner_id = b.id and status = 'pending';
  if found then
    if lower(v_pend.buyer) <> u then return jsonb_build_object('ok', false, 'error', 'purchase_in_progress'); end if;
    return jsonb_build_object('ok', true, 'intent_id', v_pend.id, 'grove_id', v_grove, 'grove_name', g.name, 'banner_id', b.id,
                              'banner_name', b.name, 'price_usd', v_pend.price_usd, 'expires_at', v_pend.expires_at, 'reused', true);
  end if;
  insert into grove_banner_purchases (grove_id, banner_id, buyer, price_usd) values (v_grove, b.id, u, b.price_usd) returning id into v_id;
  return jsonb_build_object('ok', true, 'intent_id', v_id, 'grove_id', v_grove, 'grove_name', g.name, 'banner_id', b.id,
                            'banner_name', b.name, 'price_usd', b.price_usd, 'expires_at', now() + interval '30 minutes');
end $$;

-- ── Fulfil a VERIFIED payment for the bound Grove (called only after on-chain verification) ──
create or replace function grove_banner_fulfill(p_intent uuid, p_signature text, p_tokens numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p grove_banner_purchases%rowtype; v_dummy uuid;
begin
  select * into p from grove_banner_purchases where id = p_intent for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'intent_not_found'); end if;
  if p.status = 'completed' then
    if p.transaction_signature = p_signature then return jsonb_build_object('ok', true, 'already', true, 'grove_id', p.grove_id, 'banner_id', p.banner_id); end if;
    return jsonb_build_object('ok', false, 'error', 'intent_used');
  end if;
  select id into v_dummy from groves where id = p.grove_id for update;   -- serialise with other buyers of this Grove
  if exists (select 1 from grove_banner_unlocks where grove_id = p.grove_id and banner_id = p.banner_id) then
    -- someone else's payment already unlocked it: record this one so it can be refunded/credited by hand
    update grove_banner_purchases set status = 'duplicate', transaction_signature = p_signature, completed_at = now(),
           note = 'Payment verified but banner was already unlocked for this Grove; needs manual refund or credit.' where id = p.id;
    return jsonb_build_object('ok', false, 'error', 'duplicate_payment', 'grove_id', p.grove_id, 'banner_id', p.banner_id);
  end if;
  update grove_banner_purchases set status = 'completed', transaction_signature = p_signature, completed_at = now() where id = p.id;
  insert into grove_banner_unlocks (grove_id, banner_id, purchased_by, purchase_id, transaction_signature, price_usd, tokens_paid)
    values (p.grove_id, p.banner_id, p.buyer, p.id, p_signature, p.price_usd, p_tokens);
  return jsonb_build_object('ok', true, 'grove_id', p.grove_id, 'banner_id', p.banner_id);
end $$;

-- ── Permissions: service_role only ───────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array['grove_of(text)','grove_transfer_owner(text,text)','grove_leave(text,text)','grove_get(text)',
    'grove_banners_get(text)','grove_equip_banner(text,text)','grove_banner_intent(text,text)','grove_banner_fulfill(uuid,text,numeric)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
