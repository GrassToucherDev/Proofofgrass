-- THE YARD: Seasonal Events (admin-created). Safe to re-run. Needs groves.sql and yard_groves.sql applied first.
-- Individual events rank by proof days inside the event window (tie-break: total proofs, then who joined first).
-- Grove events rank by days the Grove hit its daily target (2/3 of its roster at entry), tie-break posts per member per day.
-- Standings are computed live from real proofs. Entering is server-only and needs a secured username.

create table if not exists yard_events (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  title            text not null check (char_length(title) between 3 and 80),
  description      text,
  event_type       text not null check (event_type in ('individual','grove')),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  reward_text      text,
  eligibility_text text,
  image_path       text,
  status           text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_at       timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '120 days')
);

create table if not exists yard_event_entries (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references yard_events(id) on delete cascade,
  username   text not null,                         -- the entrant, or the Grove owner who entered the Grove
  grove_id   uuid references groves(id),
  roster     text[],                                -- Grove events: roster frozen at entry
  joined_at  timestamptz not null default now()
);
create unique index if not exists yard_entry_user_uq  on yard_event_entries (event_id, username) where grove_id is null;
create unique index if not exists yard_entry_grove_uq on yard_event_entries (event_id, grove_id) where grove_id is not null;
create index if not exists yard_entry_event_idx on yard_event_entries (event_id);

alter table yard_events enable row level security;
alter table yard_event_entries enable row level security;
drop policy if exists yard_read on yard_events;
create policy yard_read on yard_events for select to anon, authenticated using (status <> 'draft');
drop policy if exists yard_read on yard_event_entries;
create policy yard_read on yard_event_entries for select to anon, authenticated using (true);
grant select on yard_events, yard_event_entries to anon, authenticated;
revoke insert, update, delete on yard_events, yard_event_entries from anon, authenticated;

-- Enter an event. Individual: the signed-in user. Grove: the Grove OWNER enters the Grove (3+ members), roster is frozen now.
create or replace function yard_event_join(p_user text, p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(btrim(p_user)); ev yard_events%rowtype; v_grove uuid; r text[];
begin
  select * into ev from yard_events where slug = p_slug;
  if not found or ev.status = 'draft' then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if ev.status = 'cancelled' or ev.ends_at <= now() then return jsonb_build_object('ok',false,'error','not_open'); end if;
  if ev.event_type = 'individual' then
    if exists (select 1 from yard_event_entries where event_id = ev.id and grove_id is null and username = u) then
      return jsonb_build_object('ok',false,'error','already_entered');
    end if;
    insert into yard_event_entries (event_id, username) values (ev.id, u);
    return jsonb_build_object('ok',true,'slug',ev.slug);
  end if;
  v_grove := grove_of(u);
  if v_grove is null then return jsonb_build_object('ok',false,'error','not_in_grove'); end if;
  if not exists (select 1 from groves where id = v_grove and lower(owner_username) = u and disbanded_at is null) then
    return jsonb_build_object('ok',false,'error','owner_only');
  end if;
  select array_agg(lower(username) order by username) into r from grove_members where grove_id = v_grove and left_at is null;
  if coalesce(cardinality(r),0) < 3 then return jsonb_build_object('ok',false,'error','too_small'); end if;
  if exists (select 1 from yard_event_entries where event_id = ev.id and grove_id = v_grove) then
    return jsonb_build_object('ok',false,'error','already_entered');
  end if;
  insert into yard_event_entries (event_id, username, grove_id, roster) values (ev.id, u, v_grove, r);
  return jsonb_build_object('ok',true,'slug',ev.slug,'grove_id',v_grove);
end $$;

-- Live standings. Returns a ranked jsonb array: { rank, username | grove_id, days, posts, size?, joined_at }.
create or replace function yard_event_standings(p_event uuid, p_limit int default 500)
returns jsonb language plpgsql stable set search_path = public as $$
declare ev yard_events%rowtype; to_ts timestamptz; n_days int; out jsonb;
begin
  select * into ev from yard_events where id = p_event;
  if not found then return '[]'::jsonb; end if;
  to_ts := least(now(), ev.ends_at);
  n_days := ((ev.ends_at at time zone 'UTC')::date - (ev.starts_at at time zone 'UTC')::date) + 1;
  if ev.starts_at > now() then return '[]'::jsonb; end if;
  if ev.event_type = 'individual' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.rank), '[]'::jsonb) into out from (
      select row_number() over (order by s.days desc, s.posts desc, s.joined_at, s.username) as rank, s.username, s.days, s.posts, s.joined_at
      from (
        select e.username, e.joined_at,
          (select count(distinct (x.created_at at time zone 'UTC')::date) from "Submissions" x
            where lower(x.username) = e.username and x.status in ('pending','approved') and x.created_at >= ev.starts_at and x.created_at <= to_ts) as days,
          (select count(*) from "Submissions" x
            where lower(x.username) = e.username and x.status in ('pending','approved') and x.created_at >= ev.starts_at and x.created_at <= to_ts) as posts
        from yard_event_entries e where e.event_id = ev.id and e.grove_id is null) s
      order by 1 limit p_limit) t;
  else
    select coalesce(jsonb_agg(to_jsonb(t) order by t.rank), '[]'::jsonb) into out from (
      select row_number() over (order by s.days desc, s.rate desc, s.joined_at, s.grove_id) as rank, s.grove_id, s.owner, s.days, s.posts, s.size, s.joined_at
      from (
        select e.grove_id, e.username as owner, e.joined_at, cardinality(e.roster) as size,
          (sc ->> 'days_ok')::int as days, (sc ->> 'posts')::int as posts,
          (sc ->> 'posts')::numeric / nullif(cardinality(e.roster) * n_days, 0) as rate
        from yard_event_entries e, lateral (select yard_grove_score(e.roster, ev.starts_at, to_ts, n_days) as sc) z
        where e.event_id = ev.id and e.grove_id is not null) s
      order by 1 limit p_limit) t;
  end if;
  return out;
end $$;

do $$
declare f text;
begin
  foreach f in array array['yard_event_join(text,text)','yard_event_standings(uuid,int)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
