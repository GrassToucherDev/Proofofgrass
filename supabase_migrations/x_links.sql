-- X (Twitter) account links: one verified X account per secured Proof of Grass username.
-- Written only by the server after the person signs in with X (OAuth 2.0, read-only scopes) and proves they own the account.
-- x_user_id is X's permanent numeric id (it never changes); x_username is the current @handle and can go stale if they rename.
-- Service-role only (RLS on, no policies). Safe to re-run.
create table if not exists x_links (
  username     text primary key check (username = lower(username) and length(username) between 1 and 64),
  x_user_id    text not null unique,
  x_username   text not null,
  x_name       text,
  linked_at    timestamptz not null default now(),
  refreshed_at timestamptz not null default now()
);
create index if not exists x_links_x_username_idx on x_links (lower(x_username));
alter table x_links enable row level security;
revoke all on x_links from anon, authenticated;

-- One-time Grass Score bonus for connecting X (default +100).
-- Paid once per username AND once per X account, so unlinking and relinking (or moving one X account between usernames)
-- can't farm it. Runs only from the server (service role). Safe to re-run.
create table if not exists x_link_bonuses (
  x_user_id  text primary key,
  username   text not null,
  awarded_at timestamptz not null default now()
);
alter table x_link_bonuses enable row level security;
revoke all on x_link_bonuses from anon, authenticated;

create or replace function award_x_link_bonus(p_username text, p_x_user_id text, p_points integer default 100)
returns boolean language plpgsql security definer set search_path = public as $$
declare u text := lower(p_username);
begin
  perform pg_advisory_xact_lock(hashtext('x_link_bonus:' || u));
  if exists (select 1 from "ScoreEvents" where lower(username) = u and event_type = 'x_link_bonus') then return false; end if;
  insert into x_link_bonuses (x_user_id, username) values (p_x_user_id, u) on conflict (x_user_id) do nothing;
  if not found then return false; end if;
  insert into "ScoreEvents" (username, event_type, points, metadata) values (u, 'x_link_bonus', p_points, jsonb_build_object('source', 'x_link'));
  update "Profiles" set grass_score = coalesce(grass_score, 0) + p_points where lower(username) = u;
  return true;
end $$;

create or replace function x_link_bonus_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from "ScoreEvents" where lower(username) = lower(p_username) and event_type = 'x_link_bonus');
$$;

revoke all on function award_x_link_bonus(text, text, integer) from public, anon, authenticated;
revoke all on function x_link_bonus_available(text) from public, anon, authenticated;
grant execute on function award_x_link_bonus(text, text, integer) to service_role;
grant execute on function x_link_bonus_available(text) to service_role;
