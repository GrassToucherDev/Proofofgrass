-- THE YARD: Grove vs Grove challenges. Safe to re-run. Needs groves.sql + grove_banners.sql already applied.
-- Score = share of window days on which the Grove hit its daily target (2/3 of its LOCKED roster posted).
-- Tie-break = posts per roster member per day. Rosters are frozen when the challenge is accepted.

create table if not exists grove_challenges (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  challenger_grove   uuid not null references groves(id),
  challenged_grove   uuid not null references groves(id),
  created_by         text not null,                       -- the challenging Grove's owner
  duration_days      int  not null check (duration_days in (7,14,30)),
  message            text,
  status             text not null default 'pending' check (status in ('pending','active','completed','declined','expired')),
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  ends_at            timestamptz,
  roster_challenger  text[],
  roster_challenged  text[],
  result             text,                                -- won | tied | no_finish
  winner_grove       uuid references groves(id),
  days_challenger    int,
  days_challenged    int,
  posts_challenger   int,
  posts_challenged   int,
  settled_at         timestamptz,
  check (challenger_grove <> challenged_grove)
);
create index if not exists grove_challenges_a_idx on grove_challenges (challenger_grove, status);
create index if not exists grove_challenges_b_idx on grove_challenges (challenged_grove, status);

alter table grove_challenges enable row level security;
drop policy if exists yard_read on grove_challenges;
create policy yard_read on grove_challenges for select to anon, authenticated using (true);
grant select on grove_challenges to anon, authenticated;
revoke insert, update, delete on grove_challenges from anon, authenticated;

-- Qualifying days + total posts for a FROZEN roster inside the window
create or replace function yard_grove_score(p_roster text[], p_start timestamptz, p_end timestamptz, p_days int)
returns jsonb language sql stable set search_path = public as $$
  with per_day as (
    select d.day,
           (select count(*) from unnest(p_roster) as m
             where exists (select 1 from "Submissions" s
                            where lower(s.username) = lower(m) and s.status in ('pending','approved')
                              and s.created_at >= p_start and s.created_at <= p_end
                              and (s.created_at at time zone 'UTC')::date = d.day)) as locked
    from (select ((p_start at time zone 'UTC')::date + g) as day from generate_series(0, p_days - 1) g) d)
  select jsonb_build_object(
    'days_ok', coalesce(count(*) filter (where cardinality(p_roster) >= 3 and locked >= ceil(cardinality(p_roster) * 2.0 / 3)), 0),
    'posts',   coalesce(sum(locked), 0))
  from per_day
$$;

-- Only a Grove OWNER can send. Both Groves need 3+ members.
create or replace function yard_grove_challenge_create(p_user text, p_target uuid, p_days int, p_message text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(btrim(p_user)); v_grove uuid; v_slug text; v_id uuid;
begin
  if p_days not in (7,14,30) then return jsonb_build_object('ok',false,'error','bad_duration'); end if;
  v_grove := grove_of(u);
  if v_grove is null then return jsonb_build_object('ok',false,'error','not_in_grove'); end if;
  if not exists (select 1 from groves where id = v_grove and lower(owner_username) = u) then return jsonb_build_object('ok',false,'error','owner_only'); end if;
  if v_grove = p_target then return jsonb_build_object('ok',false,'error','self_grove'); end if;
  if (select count(*) from grove_members where grove_id = v_grove and left_at is null) < 3 then return jsonb_build_object('ok',false,'error','too_small'); end if;
  if not exists (select 1 from groves where id = p_target and disbanded_at is null) then return jsonb_build_object('ok',false,'error','unknown_grove'); end if;
  if (select count(*) from grove_members where grove_id = p_target and left_at is null) < 3 then return jsonb_build_object('ok',false,'error','target_too_small'); end if;
  if exists (select 1 from grove_challenges where status in ('pending','active')
             and ((challenger_grove = v_grove and challenged_grove = p_target) or (challenger_grove = p_target and challenged_grove = v_grove))) then
    return jsonb_build_object('ok',false,'error','duplicate');
  end if;
  if (select count(*) from grove_challenges where challenger_grove = v_grove and status = 'pending' and created_at > now() - interval '7 days') >= 5 then
    return jsonb_build_object('ok',false,'error','too_many_pending');
  end if;
  v_slug := 'grove-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  insert into grove_challenges (slug, challenger_grove, challenged_grove, created_by, duration_days, message)
    values (v_slug, v_grove, p_target, u, p_days, nullif(left(btrim(coalesce(p_message,'')), 140), '')) returning id into v_id;
  return jsonb_build_object('ok',true,'slug',v_slug,'id',v_id);
end $$;

-- Only the challenged Grove's OWNER can answer. Accepting freezes both rosters.
create or replace function yard_grove_challenge_respond(p_user text, p_slug text, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(btrim(p_user)); ch grove_challenges%rowtype; v_grove uuid; ra text[]; rb text[];
begin
  select * into ch from grove_challenges where slug = p_slug for update;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  v_grove := grove_of(u);
  if v_grove is null or v_grove <> ch.challenged_grove or not exists (select 1 from groves where id = v_grove and lower(owner_username) = u) then
    return jsonb_build_object('ok',false,'error','owner_only');
  end if;
  if ch.status <> 'pending' then return jsonb_build_object('ok',false,'error','not_pending'); end if;
  if ch.created_at < now() - interval '7 days' then
    update grove_challenges set status = 'expired' where id = ch.id;
    return jsonb_build_object('ok',false,'error','expired');
  end if;
  if not p_accept then
    update grove_challenges set status = 'declined' where id = ch.id;
    return jsonb_build_object('ok',true,'status','declined','slug',ch.slug);
  end if;
  select array_agg(lower(username) order by username) into ra from grove_members where grove_id = ch.challenger_grove and left_at is null;
  select array_agg(lower(username) order by username) into rb from grove_members where grove_id = ch.challenged_grove and left_at is null;
  if not exists (select 1 from groves where id = ch.challenger_grove and disbanded_at is null) or coalesce(cardinality(ra),0) < 3 then
    return jsonb_build_object('ok',false,'error','challenger_too_small');
  end if;
  if coalesce(cardinality(rb),0) < 3 then return jsonb_build_object('ok',false,'error','too_small'); end if;
  update grove_challenges set status = 'active', started_at = now(), ends_at = now() + (ch.duration_days || ' days')::interval,
         roster_challenger = ra, roster_challenged = rb where id = ch.id;
  return jsonb_build_object('ok',true,'status','active','slug',ch.slug);
end $$;

-- Scores so far (or final) for a challenge, from the frozen rosters
create or replace function yard_grove_result(p_id uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare ch grove_challenges%rowtype; a jsonb; b jsonb; v_result text; v_winner uuid; ra numeric; rb numeric; to_ts timestamptz;
begin
  select * into ch from grove_challenges where id = p_id;
  to_ts := least(now(), ch.ends_at);
  a := yard_grove_score(ch.roster_challenger, ch.started_at, to_ts, ch.duration_days);
  b := yard_grove_score(ch.roster_challenged, ch.started_at, to_ts, ch.duration_days);
  -- tie-break: posts per roster member per day (normalised so Grove size can't decide it)
  ra := (a->>'posts')::numeric / nullif(cardinality(ch.roster_challenger) * ch.duration_days, 0);
  rb := (b->>'posts')::numeric / nullif(cardinality(ch.roster_challenged) * ch.duration_days, 0);
  if (a->>'posts')::int = 0 and (b->>'posts')::int = 0 then v_result := 'no_finish';
  elsif (a->>'days_ok')::int > (b->>'days_ok')::int then v_result := 'won'; v_winner := ch.challenger_grove;
  elsif (a->>'days_ok')::int < (b->>'days_ok')::int then v_result := 'won'; v_winner := ch.challenged_grove;
  elsif coalesce(ra,0) > coalesce(rb,0) then v_result := 'won'; v_winner := ch.challenger_grove;
  elsif coalesce(ra,0) < coalesce(rb,0) then v_result := 'won'; v_winner := ch.challenged_grove;
  else v_result := 'tied';
  end if;
  return jsonb_build_object('days_challenger', (a->>'days_ok')::int, 'days_challenged', (b->>'days_ok')::int,
                            'posts_challenger', (a->>'posts')::int, 'posts_challenged', (b->>'posts')::int,
                            'result', v_result, 'winner_grove', v_winner);
end $$;

create or replace function yard_grove_settle(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ch grove_challenges%rowtype; r jsonb;
begin
  select * into ch from grove_challenges where id = p_id for update;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if ch.status <> 'active' then return jsonb_build_object('ok',true,'already',true); end if;
  if ch.ends_at > now() then return jsonb_build_object('ok',false,'error','not_ended'); end if;
  r := yard_grove_result(p_id);
  update grove_challenges set status = 'completed', result = r->>'result', winner_grove = nullif(r->>'winner_grove','')::uuid, settled_at = now(),
         days_challenger = (r->>'days_challenger')::int, days_challenged = (r->>'days_challenged')::int,
         posts_challenger = (r->>'posts_challenger')::int, posts_challenged = (r->>'posts_challenged')::int where id = p_id;
  return jsonb_build_object('ok',true) || r;
end $$;

create or replace function yard_grove_settle_due(p_since timestamptz default now() - interval '3 days', p_limit int default 200)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; n int := 0; e int;
begin
  for c in select id from grove_challenges where status = 'active' and ends_at <= now() and ends_at >= p_since order by ends_at limit p_limit loop
    perform yard_grove_settle(c.id); n := n + 1;
  end loop;
  update grove_challenges set status = 'expired' where status = 'pending' and created_at < now() - interval '7 days';
  get diagnostics e = row_count;
  return jsonb_build_object('grove_settled', n, 'grove_expired_pending', e);
end $$;

do $$
declare f text;
begin
  foreach f in array array['yard_grove_score(text[],timestamptz,timestamptz,int)','yard_grove_challenge_create(text,uuid,int,text)','yard_grove_challenge_respond(text,text,boolean)',
    'yard_grove_result(uuid)','yard_grove_settle(uuid)','yard_grove_settle_due(timestamptz,int)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
