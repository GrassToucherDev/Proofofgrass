-- Groves, phase 1: data model + rules (squads of 3–6 who share a streak and can gift shields).
-- Spec: "Proof of Grass Groves — squad spec". Run in the Supabase SQL editor. Safe to re-run.
--
-- DECISIONS BAKED IN
--   * Group size 3–6 (slots default 6). A grove with fewer than 3 active members exists but does
--     not count for the grove streak or leaderboard.
--   * Grove day = at least ceil(2/3 × members that day) members have a locked-in submission
--     (status pending/approved, same rule the dashboard uses) on that UTC date.
--   * Shield gifting is ADVANCE ONLY: a shield moves from giver to receiver before a day is
--     missed; lock_in_streak is NOT changed and spends it as usual.
--   * Leaving starts a 48-hour cooldown before joining/creating/re-joining any grove.
--   * One active grove per user.
--
-- IDENTITY: these functions trust p_username and are granted to service_role ONLY. Every API
--   route under pages/api/groves/ calls utils/requireOwner first, so a caller must be signed in
--   with the Google account that has claimed that username (see username_claims.sql, which must
--   be applied BEFORE this file's API is used). Never expose these functions to the anon key.

create extension if not exists pgcrypto;

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists groves (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 3 and 30),
  created_by   text not null,
  slots        int  not null default 6 check (slots between 3 and 8),
  created_at   timestamptz not null default now(),
  disbanded_at timestamptz
);

create table if not exists grove_members (
  id        uuid primary key default gen_random_uuid(),
  grove_id  uuid not null references groves(id) on delete cascade,
  username  text not null,                       -- stored lower-case
  joined_at timestamptz not null default now(),
  left_at   timestamptz
);
-- one ACTIVE grove per user
create unique index if not exists grove_members_one_active
  on grove_members (lower(username)) where left_at is null;
create index if not exists grove_members_grove_idx on grove_members (grove_id) where left_at is null;
create index if not exists grove_members_left_idx on grove_members (lower(username), left_at);

create table if not exists grove_invites (
  code       text primary key,
  grove_id   uuid not null references groves(id) on delete cascade,
  created_by text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create table if not exists grove_gifts (
  id            uuid primary key default gen_random_uuid(),
  grove_id      uuid not null references groves(id) on delete cascade,
  from_username text not null,
  to_username   text not null,
  created_at    timestamptz not null default now()
);
create index if not exists grove_gifts_from_idx on grove_gifts (lower(from_username), created_at);
create index if not exists grove_gifts_to_idx   on grove_gifts (lower(to_username), created_at);

-- Lock the tables down: only SECURITY DEFINER functions / service_role touch them.
alter table groves        enable row level security;
alter table grove_members enable row level security;
alter table grove_invites enable row level security;
alter table grove_gifts   enable row level security;

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function grove_cooldown_until(p_username text)
returns timestamptz language sql stable as $$
  select max(left_at) + interval '48 hours'
  from grove_members
  where lower(username) = lower(p_username) and left_at is not null
$$;

-- Per-day member / locked-in counts for a grove, using who was a member ON that day.
create or replace function grove_day_counts(p_grove uuid, p_from date, p_to date)
returns table(day date, members int, locked int)
language sql stable as $$
  select d.day::date,
         count(m.username)::int as members,
         count(m.username) filter (where exists (
           select 1 from "Submissions" s
           where lower(s.username) = lower(m.username)
             and s.status in ('pending','approved')
             and (s.created_at at time zone 'UTC')::date = d.day::date
         ))::int as locked
  from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as d(day)
  left join grove_members m
    on m.grove_id = p_grove
   and (m.joined_at at time zone 'UTC')::date <= d.day::date
   and (m.left_at is null or (m.left_at at time zone 'UTC')::date > d.day::date)
  group by d.day
$$;

-- A day is complete when the grove had >= 3 members and >= ceil(2/3 of them) locked in.
-- Streak = consecutive complete days ending today (if today is complete) or yesterday.
create or replace function grove_streak(p_grove uuid)
returns jsonb language plpgsql stable as $$
declare
  v_today date := (now() at time zone 'UTC')::date;
  v_streak int;
  v_today_row record;
begin
  with c as (
    select day, (members >= 3 and locked >= ceil(members * 2.0 / 3)) as complete
    from grove_day_counts(p_grove, v_today - 400, v_today)
  ),
  anchored as (  -- start from today if complete, otherwise from yesterday
    select day, complete from c
    where day <= case when (select complete from c where day = v_today) then v_today else v_today - 1 end
  ),
  run as (
    select day, complete,
           bool_and(complete) over (order by day desc rows between unbounded preceding and current row) as still
    from anchored
  )
  select count(*) filter (where still) into v_streak from run;

  select members, locked, (members >= 3 and locked >= ceil(members * 2.0 / 3)) as complete
    into v_today_row from grove_day_counts(p_grove, v_today, v_today);

  return jsonb_build_object(
    'streak',         coalesce(v_streak, 0),
    'today_members',  coalesce(v_today_row.members, 0),
    'today_locked',   coalesce(v_today_row.locked, 0),
    'today_needed',   case when coalesce(v_today_row.members,0) >= 3 then ceil(v_today_row.members * 2.0 / 3)::int else null end,
    'today_complete', coalesce(v_today_row.complete, false)
  );
end $$;

-- ── Actions ──────────────────────────────────────────────────────────────────
create or replace function grove_create(p_username text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u text := lower(btrim(p_username));
  v_cool timestamptz;
  v_id uuid;
  v_code text;
begin
  if u is null or u = '' then return jsonb_build_object('ok', false, 'error', 'username_required'); end if;
  if char_length(btrim(coalesce(p_name,''))) not between 3 and 30 then
    return jsonb_build_object('ok', false, 'error', 'bad_name');
  end if;
  if exists (select 1 from grove_members where lower(username) = u and left_at is null) then
    return jsonb_build_object('ok', false, 'error', 'already_in_grove');
  end if;
  v_cool := grove_cooldown_until(u);
  if v_cool is not null and v_cool > now() then
    return jsonb_build_object('ok', false, 'error', 'cooldown', 'retry_at', v_cool);
  end if;

  insert into groves (name, created_by) values (btrim(p_name), u) returning id into v_id;
  insert into grove_members (grove_id, username) values (v_id, u);
  v_code := lower(encode(gen_random_bytes(5), 'hex'));
  insert into grove_invites (code, grove_id, created_by) values (v_code, v_id, u);
  return jsonb_build_object('ok', true, 'grove_id', v_id, 'invite_code', v_code);
end $$;

create or replace function grove_join(p_username text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u text := lower(btrim(p_username));
  v_inv grove_invites%rowtype;
  v_grove groves%rowtype;
  v_cool timestamptz;
  v_count int;
begin
  select * into v_inv from grove_invites where code = lower(btrim(p_code));
  if not found or v_inv.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'invite_invalid'); end if;
  select * into v_grove from groves where id = v_inv.grove_id for update;   -- serialise joins to this grove
  if v_grove.disbanded_at is not null then return jsonb_build_object('ok', false, 'error', 'invite_invalid'); end if;
  if exists (select 1 from grove_members where lower(username) = u and left_at is null) then
    return jsonb_build_object('ok', false, 'error', 'already_in_grove');
  end if;
  v_cool := grove_cooldown_until(u);
  if v_cool is not null and v_cool > now() then
    return jsonb_build_object('ok', false, 'error', 'cooldown', 'retry_at', v_cool);
  end if;
  select count(*) into v_count from grove_members where grove_id = v_grove.id and left_at is null;
  if v_count >= v_grove.slots then return jsonb_build_object('ok', false, 'error', 'grove_full'); end if;

  insert into grove_members (grove_id, username) values (v_grove.id, u);
  return jsonb_build_object('ok', true, 'grove_id', v_grove.id);
end $$;

create or replace function grove_leave(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u text := lower(btrim(p_username));
  v_grove uuid;
begin
  update grove_members set left_at = now()
   where lower(username) = u and left_at is null
   returning grove_id into v_grove;
  if v_grove is null then return jsonb_build_object('ok', false, 'error', 'not_in_grove'); end if;
  if not exists (select 1 from grove_members where grove_id = v_grove and left_at is null) then
    update groves set disbanded_at = now() where id = v_grove;
  end if;
  return jsonb_build_object('ok', true, 'cooldown_until', now() + interval '48 hours');
end $$;

-- The caller's grove: members with TODAY's status only (no shield balances, no history).
create or replace function grove_get(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  u text := lower(btrim(p_username));
  g groves%rowtype;
  v_today date := (now() at time zone 'UTC')::date;
  v_members jsonb;
  v_code text;
begin
  select g2.* into g from groves g2
    join grove_members m on m.grove_id = g2.id and lower(m.username) = u and m.left_at is null
   where g2.disbanded_at is null;
  if not found then
    return jsonb_build_object('grove', null, 'cooldown_until', case when grove_cooldown_until(u) > now() then grove_cooldown_until(u) end);
  end if;

  select jsonb_agg(jsonb_build_object(
           'username', m.username,
           'joined_at', m.joined_at,
           'locked_today', exists (
             select 1 from "Submissions" s
             where lower(s.username) = m.username and s.status in ('pending','approved')
               and (s.created_at at time zone 'UTC')::date = v_today)
         ) order by m.joined_at)
    into v_members
  from grove_members m where m.grove_id = g.id and m.left_at is null;

  select code into v_code from grove_invites
   where grove_id = g.id and expires_at > now() order by created_at desc limit 1;

  return jsonb_build_object(
    'grove', jsonb_build_object('id', g.id, 'name', g.name, 'slots', g.slots, 'created_at', g.created_at, 'invite_code', v_code),
    'members', coalesce(v_members, '[]'::jsonb),
    'streak', grove_streak(g.id)
  );
end $$;

-- Advance shield gift: giver -> grove-mate. Does not touch lock_in_streak.
--   limits: 2 gifts per giver per UTC day; a receiver may receive 2 per rolling 7 days.
create or replace function grove_gift_shield(p_from text, p_to text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  f text := lower(btrim(p_from));
  t text := lower(btrim(p_to));
  v_grove uuid;
  v_qty int; v_streak_ct int; v_bal int;
  v_today date := (now() at time zone 'UTC')::date;
begin
  if f = t then return jsonb_build_object('ok', false, 'error', 'self_gift'); end if;

  select a.grove_id into v_grove
    from grove_members a join grove_members b on b.grove_id = a.grove_id
   where lower(a.username) = f and a.left_at is null and lower(b.username) = t and b.left_at is null;
  if v_grove is null then return jsonb_build_object('ok', false, 'error', 'not_grove_mates'); end if;

  -- serialise per giver so the daily cap and balance cannot be raced
  perform pg_advisory_xact_lock(hashtext('grove_gift:' || f));

  if (select count(*) from grove_gifts
       where lower(from_username) = f and (created_at at time zone 'UTC')::date = v_today) >= 2 then
    return jsonb_build_object('ok', false, 'error', 'daily_gift_limit');
  end if;
  if (select count(*) from grove_gifts
       where lower(to_username) = t and created_at > now() - interval '7 days') >= 2 then
    return jsonb_build_object('ok', false, 'error', 'receiver_limit');
  end if;

  -- giver balance, mirroring lock_in_streak: UserConsumables first, Streaks.shield_count as fallback
  select quantity into v_qty from "UserConsumables"
   where lower(username) = f and consumable_type = 'shield' for update;
  select shield_count into v_streak_ct from "Streaks" where lower(username) = f for update;
  v_bal := case when coalesce(v_qty, 0) > 0 then v_qty else coalesce(v_streak_ct, 0) end;
  if v_bal < 1 then return jsonb_build_object('ok', false, 'error', 'no_shield'); end if;

  -- debit giver
  update "UserConsumables" set quantity = quantity - 1, updated_at = now()
   where lower(username) = f and consumable_type = 'shield' and quantity > 0;
  update "Streaks" set shield_count = greatest(0, coalesce(shield_count, 0) - 1) where lower(username) = f;

  -- credit receiver
  update "UserConsumables" set quantity = quantity + 1, updated_at = now()
   where lower(username) = t and consumable_type = 'shield';
  if not found then
    insert into "UserConsumables" (username, consumable_type, quantity) values (t, 'shield', 1);
  end if;
  update "Streaks" set shield_count = coalesce(shield_count, 0) + 1 where lower(username) = t;

  insert into grove_gifts (grove_id, from_username, to_username) values (v_grove, f, t);

  begin
    insert into "ConsumableEvents" (username, consumable_type, event_type, quantity, metadata)
    values (f, 'shield', 'gifted_out', 1, jsonb_build_object('to', t, 'grove_id', v_grove)),
           (t, 'shield', 'gifted_in',  1, jsonb_build_object('from', f, 'grove_id', v_grove));
  exception when undefined_table then null; end;

  return jsonb_build_object('ok', true);
end $$;

-- Groves leaderboard (groves with >= 3 active members), highest streak first.
create or replace function grove_leaderboard(p_limit int default 25)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(r order by (r->>'streak')::int desc, r->>'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'id', g.id, 'name', g.name,
             'members', (select count(*) from grove_members m where m.grove_id = g.id and m.left_at is null),
             'streak', (grove_streak(g.id)->>'streak')::int) as r
    from groves g
    where g.disbanded_at is null
      and (select count(*) from grove_members m where m.grove_id = g.id and m.left_at is null) >= 3
    limit 500
  ) t
  where (r->>'streak')::int > 0
  limit greatest(1, least(p_limit, 100))
$$;

-- ── Permissions: service_role only (see IDENTITY WARNING) ───────────────────
do $$
declare f text;
begin
  for f in select unnest(array[
    'grove_cooldown_until(text)','grove_day_counts(uuid,date,date)','grove_streak(uuid)',
    'grove_create(text,text)','grove_join(text,text)','grove_leave(text)','grove_get(text)',
    'grove_gift_shield(text,text)','grove_leaderboard(int)'])
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
