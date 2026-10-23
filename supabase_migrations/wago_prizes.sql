-- WAGO Prizes (Phase 1): sponsor prizes of any kind, found at a location with a single-use code.
-- Also adds one-time consent records. Does not touch wago_drop_* tables.

create table if not exists public.wago_consents (
  google_id   text not null,
  version     text not null,
  accepted_at timestamptz not null default now(),
  primary key (google_id, version)
);

create table if not exists public.wago_prizes (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null default 'found' check (kind in ('found','ship')),
  title            text not null check (char_length(title) between 2 and 120),
  description      text,
  image_url        text,
  value_text       text,                       -- free text, e.g. "Holo Charizard card", "$20 cash", "Hoodie"
  sponsor_name     text not null check (char_length(sponsor_name) between 2 and 80),
  sponsor_url      text,
  sponsor_logo_url text,
  lat              double precision not null,
  lng              double precision not null,
  hint             text,
  reveal_radius_m  integer not null default 100,
  claim_radius_m   integer not null default 25,
  status           text not null default 'draft' check (status in ('draft','active','ended')),
  ends_at          timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists public.wago_prize_codes (
  id               uuid primary key default gen_random_uuid(),
  prize_id         uuid not null references public.wago_prizes(id) on delete cascade,
  code_hash        text not null,
  claimed_by       text,
  claimed_by_name  text,
  claimed_at       timestamptz,
  unique (prize_id, code_hash)
);
create index if not exists wago_prize_codes_prize_idx on public.wago_prize_codes(prize_id);
create unique index if not exists wago_prize_codes_one_per_user on public.wago_prize_codes(prize_id, claimed_by) where claimed_by is not null;

create table if not exists public.wago_prize_attempts (
  id        bigserial primary key,
  prize_id  uuid not null,
  google_id text not null,
  at        timestamptz not null default now()
);
create index if not exists wago_prize_attempts_idx on public.wago_prize_attempts(prize_id, google_id, at);

alter table public.wago_consents       enable row level security;
alter table public.wago_prizes         enable row level security;
alter table public.wago_prize_codes    enable row level security;
alter table public.wago_prize_attempts enable row level security;
revoke all on public.wago_consents, public.wago_prizes, public.wago_prize_codes, public.wago_prize_attempts from anon, authenticated;
-- All access is through server APIs using the service role.

create or replace function public.wago_prize_claim(p_prize_id uuid, p_code_hash text, p_google_id text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_prize wago_prizes%rowtype; v_fails int; v_code uuid;
begin
  select * into v_prize from wago_prizes where id = p_prize_id;
  if not found or v_prize.status <> 'active' or (v_prize.ends_at is not null and v_prize.ends_at < now()) then
    return jsonb_build_object('ok', false, 'error', 'not_available');
  end if;
  if exists (select 1 from wago_prize_codes where prize_id = p_prize_id and claimed_by = p_google_id) then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;
  select count(*) into v_fails from wago_prize_attempts
    where prize_id = p_prize_id and google_id = p_google_id and at > now() - interval '1 hour';
  if v_fails >= 8 then return jsonb_build_object('ok', false, 'error', 'too_many_attempts'); end if;

  update wago_prize_codes set claimed_by = p_google_id, claimed_by_name = p_name, claimed_at = now()
   where prize_id = p_prize_id and code_hash = p_code_hash and claimed_at is null
   returning id into v_code;
  if v_code is null then
    insert into wago_prize_attempts(prize_id, google_id) values (p_prize_id, p_google_id);
    if exists (select 1 from wago_prize_codes where prize_id = p_prize_id and code_hash = p_code_hash) then
      return jsonb_build_object('ok', false, 'error', 'code_used');
    end if;
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;
  return jsonb_build_object('ok', true, 'code_id', v_code);
end $$;
revoke all on function public.wago_prize_claim(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.wago_prize_claim(uuid, text, text, text) to service_role;
