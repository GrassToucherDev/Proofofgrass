-- THE YARD, phase 1: server-trusted 1v1 challenges. Safe to re-run.
-- Does NOT settle the existing stuck challenges. See yard_preview_settlement() and the admin settle route.

-- 1) Final results live on the challenge itself
alter table "Challenges"
  add column if not exists result          text,          -- won | tied | no_finish
  add column if not exists settled_at      timestamptz,
  add column if not exists challenger_days int,
  add column if not exists challenged_days int;

-- 2) Old CHECK constraints on status columns (if any) would reject the new 'expired' / 'tied' values
do $$
declare c record;
begin
  for c in select conrelid::regclass::text as t, conname from pg_constraint
           where contype = 'c' and conrelid in ('"Challenges"'::regclass, '"ChallengeProgress"'::regclass)
             and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
    raise notice 'dropped status check % on %', c.conname, c.t;
  end loop;
end $$;

-- 3) Real proof days inside a window (unique UTC days with a pending/approved proof)
create or replace function yard_challenge_days(p_user text, p_from timestamptz, p_to timestamptz)
returns int language sql stable set search_path = public as $$
  select count(distinct (s.created_at at time zone 'UTC')::date)::int
  from "Submissions" s
  where lower(s.username) = lower(p_user)
    and s.status in ('pending','approved')
    and s.created_at >= p_from and s.created_at <= p_to
$$;

-- 4) Create (server-checked). p_challenger is the verified, Google-secured username.
create or replace function yard_challenge_create(p_challenger text, p_challenged text, p_days int, p_message text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a text := lower(btrim(p_challenger)); b text := lower(btrim(replace(p_challenged,'@','')));
        v_slug text; v_id uuid;
begin
  if p_days not in (7,14,30) then return jsonb_build_object('ok',false,'error','bad_duration'); end if;
  if a = '' or b = '' then return jsonb_build_object('ok',false,'error','missing'); end if;
  if a = b then return jsonb_build_object('ok',false,'error','self'); end if;
  if not (exists (select 1 from "Profiles" where lower(username) = b) or exists (select 1 from "Streaks" where lower(username) = b)) then
    return jsonb_build_object('ok',false,'error','unknown_user');
  end if;
  if exists (select 1 from "Challenges" where status in ('pending','active') and duration_days = p_days
             and ((lower(challenger) = a and lower(challenged) = b) or (lower(challenger) = b and lower(challenged) = a))) then
    return jsonb_build_object('ok',false,'error','duplicate');
  end if;
  if (select count(*) from "Challenges" where lower(challenger) = a and status = 'pending' and created_at > now() - interval '7 days') >= 10 then
    return jsonb_build_object('ok',false,'error','too_many_pending');
  end if;
  v_slug := a || '-vs-' || b || '-' || p_days || 'd-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  insert into "Challenges" (slug, challenger, challenged, duration_days, message, status)
    values (v_slug, a, b, p_days, nullif(left(btrim(coalesce(p_message,'')), 140), ''), 'pending') returning id into v_id;
  insert into "ChallengeEvents" (challenge_id, username, event_type) values (v_id, a, 'sent');
  return jsonb_build_object('ok',true,'slug',v_slug,'id',v_id);
end $$;

-- 5) Accept / decline (only the challenged player; pending invites older than 7 days are expired)
create or replace function yard_challenge_respond(p_username text, p_slug text, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(btrim(p_username)); ch "Challenges"%rowtype;
begin
  select * into ch from "Challenges" where slug = p_slug for update;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if lower(ch.challenged) <> u then return jsonb_build_object('ok',false,'error','not_challenged'); end if;
  if ch.status <> 'pending' then return jsonb_build_object('ok',false,'error','not_pending'); end if;
  if ch.created_at < now() - interval '7 days' then
    update "Challenges" set status = 'expired' where id = ch.id;
    return jsonb_build_object('ok',false,'error','expired');
  end if;
  if p_accept then
    update "Challenges" set status = 'active', started_at = now(), ends_at = now() + (ch.duration_days || ' days')::interval where id = ch.id;
    insert into "ChallengeProgress" (challenge_id, username, days_complete, status)
      values (ch.id, lower(ch.challenger), 0, 'active'), (ch.id, lower(ch.challenged), 0, 'active')
      on conflict (challenge_id, username) do update set days_complete = 0, status = 'active';
    insert into "ChallengeEvents" (challenge_id, username, event_type) values (ch.id, u, 'accepted');
  else
    update "Challenges" set status = 'declined' where id = ch.id;
    insert into "ChallengeEvents" (challenge_id, username, event_type) values (ch.id, u, 'declined');
  end if;
  return jsonb_build_object('ok',true,'slug',ch.slug,'status', case when p_accept then 'active' else 'declined' end);
end $$;

-- 6) Settlement: result comes ONLY from real proofs inside [started_at, ends_at]. Idempotent.
create or replace function yard_challenge_result(p_id uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare ch "Challenges"%rowtype; d1 int; d2 int; v_result text; v_winner text;
begin
  select * into ch from "Challenges" where id = p_id;
  d1 := yard_challenge_days(ch.challenger, ch.started_at, ch.ends_at);
  d2 := yard_challenge_days(ch.challenged, ch.started_at, ch.ends_at);
  if d1 = 0 and d2 = 0 then v_result := 'no_finish';
  elsif d1 = d2 then v_result := 'tied';
  else v_result := 'won'; v_winner := case when d1 > d2 then lower(ch.challenger) else lower(ch.challenged) end;
  end if;
  return jsonb_build_object('challenger_days', d1, 'challenged_days', d2, 'result', v_result, 'winner', v_winner);
end $$;

create or replace function yard_settle_challenge(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ch "Challenges"%rowtype; r jsonb;
begin
  select * into ch from "Challenges" where id = p_id for update;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if ch.status <> 'active' then return jsonb_build_object('ok',true,'already',true); end if;
  if ch.ends_at is null or ch.ends_at > now() then return jsonb_build_object('ok',false,'error','not_ended'); end if;
  r := yard_challenge_result(p_id);
  update "Challenges" set status = 'completed', winner = r->>'winner', result = r->>'result', settled_at = now(),
         challenger_days = (r->>'challenger_days')::int, challenged_days = (r->>'challenged_days')::int where id = p_id;
  update "ChallengeProgress" set
    days_complete = case when lower(username) = lower(ch.challenger) then (r->>'challenger_days')::int else (r->>'challenged_days')::int end,
    status = case r->>'result'
               when 'won' then case when lower(username) = r->>'winner' then 'won' else 'lost' end
               else r->>'result' end
  where challenge_id = p_id;
  insert into "ChallengeEvents" (challenge_id, username, event_type) values (p_id, r->>'winner', 'completed');
  return jsonb_build_object('ok',true) || r;
end $$;

-- p_since: only settle challenges that ended at/after this time (so old stuck ones are never settled by accident)
create or replace function yard_settle_due(p_since timestamptz default now() - interval '3 days', p_limit int default 200)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; n int := 0; e int;
begin
  for c in select id from "Challenges" where status = 'active' and ends_at <= now() and ends_at >= p_since order by ends_at limit p_limit loop
    perform yard_settle_challenge(c.id); n := n + 1;
  end loop;
  update "Challenges" set status = 'expired' where status = 'pending' and created_at < now() - interval '7 days';
  get diagnostics e = row_count;
  return jsonb_build_object('settled', n, 'expired_pending', e);
end $$;

-- Read-only: what settlement WOULD record for challenges that are past their end date
create or replace function yard_preview_settlement()
returns table(slug text, challenger text, challenged text, duration_days int, ended timestamptz, challenger_days int, challenged_days int, result text, winner text)
language sql stable security definer set search_path = public as $$
  select c.slug, c.challenger, c.challenged, c.duration_days, c.ends_at,
         (yard_challenge_result(c.id)->>'challenger_days')::int, (yard_challenge_result(c.id)->>'challenged_days')::int,
         yard_challenge_result(c.id)->>'result', yard_challenge_result(c.id)->>'winner'
  from "Challenges" c where c.status = 'active' and c.ends_at <= now() order by c.ends_at
$$;

-- 7) Lock the tables: public read (challenges appear on profiles and share links), writes only via the functions above
alter table "Challenges"        enable row level security;
alter table "ChallengeProgress" enable row level security;
alter table "ChallengeEvents"   enable row level security;
drop policy if exists yard_read on "Challenges";        create policy yard_read on "Challenges"        for select to anon, authenticated using (true);
drop policy if exists yard_read on "ChallengeProgress"; create policy yard_read on "ChallengeProgress" for select to anon, authenticated using (true);
drop policy if exists yard_read on "ChallengeEvents";   create policy yard_read on "ChallengeEvents"   for select to anon, authenticated using (true);
revoke insert, update, delete on "Challenges", "ChallengeProgress", "ChallengeEvents" from anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array['yard_challenge_create(text,text,int,text)','yard_challenge_respond(text,text,boolean)','yard_challenge_result(uuid)',
    'yard_settle_challenge(uuid)','yard_settle_due(timestamptz,int)','yard_preview_settlement()','yard_challenge_days(text,timestamptz,timestamptz)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  if to_regprocedure('resolve_expired_challenges()') is not null then
    revoke all on function resolve_expired_challenges() from public, anon, authenticated;
  end if;
end $$;
