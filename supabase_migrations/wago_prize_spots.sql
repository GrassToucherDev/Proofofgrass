-- WAGO Prizes: one prize can have several spots, each with its own codes.
-- Hunters can report a spot "still here" or "gone"; 2 different "gone" reports hide it until restocked.

create table if not exists public.wago_prize_spots (
  id           uuid primary key default gen_random_uuid(),
  prize_id     uuid not null references public.wago_prizes(id) on delete cascade,
  lat          double precision not null,
  lng          double precision not null,
  hint         text,
  status       text not null default 'active' check (status in ('active','hidden')),
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists wago_prize_spots_prize_idx on public.wago_prize_spots(prize_id);

alter table public.wago_prize_codes add column if not exists spot_id uuid references public.wago_prize_spots(id) on delete cascade;
create index if not exists wago_prize_codes_spot_idx on public.wago_prize_codes(spot_id);

create table if not exists public.wago_prize_reports (
  id        bigserial primary key,
  spot_id   uuid not null references public.wago_prize_spots(id) on delete cascade,
  google_id text not null,
  kind      text not null check (kind in ('gone','here')),
  at        timestamptz not null default now()
);
create index if not exists wago_prize_reports_idx on public.wago_prize_reports(spot_id, google_id, at);

alter table public.wago_prize_spots   enable row level security;
alter table public.wago_prize_reports enable row level security;
revoke all on public.wago_prize_spots, public.wago_prize_reports from anon, authenticated;

-- Carry over any prize made before spots existed: its own location becomes its first spot.
do $$
declare r record; v uuid;
begin
  for r in select p.* from wago_prizes p
           where exists (select 1 from wago_prize_codes c where c.prize_id = p.id and c.spot_id is null)
  loop
    insert into wago_prize_spots(prize_id, lat, lng, hint, last_seen_at) values (r.id, r.lat, r.lng, r.hint, r.created_at) returning id into v;
    update wago_prize_codes set spot_id = v where prize_id = r.id and spot_id is null;
  end loop;
end $$;

create or replace function public.wago_prize_report(p_spot_id uuid, p_google_id text, p_kind text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_spot wago_prize_spots%rowtype; v_n int;
begin
  if p_kind not in ('gone','here') then return jsonb_build_object('ok', false, 'error', 'bad_kind'); end if;
  select * into v_spot from wago_prize_spots where id = p_spot_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not exists (select 1 from wago_prize_codes where spot_id = p_spot_id and claimed_at is null) then
    return jsonb_build_object('ok', false, 'error', 'none_left');
  end if;
  if exists (select 1 from wago_prize_reports where spot_id = p_spot_id and google_id = p_google_id and at > now() - interval '6 hours') then
    return jsonb_build_object('ok', false, 'error', 'already_reported');
  end if;
  insert into wago_prize_reports(spot_id, google_id, kind) values (p_spot_id, p_google_id, p_kind);
  if p_kind = 'here' then
    update wago_prize_spots set last_seen_at = now(), status = 'active' where id = p_spot_id;
    return jsonb_build_object('ok', true, 'hidden', false);
  end if;
  select count(distinct google_id) into v_n from wago_prize_reports
    where spot_id = p_spot_id and kind = 'gone' and at > coalesce(v_spot.last_seen_at, '-infinity'::timestamptz);
  if v_n >= 2 then
    update wago_prize_spots set status = 'hidden' where id = p_spot_id;
    return jsonb_build_object('ok', true, 'hidden', true);
  end if;
  return jsonb_build_object('ok', true, 'hidden', false);
end $$;
revoke all on function public.wago_prize_report(uuid, text, text) from public, anon, authenticated;
grant execute on function public.wago_prize_report(uuid, text, text) to service_role;
