-- WAGO Trails V1. Run in the Supabase SQL editor BEFORE deploying the matching code.
-- Server-only tables (service role); RLS on with no policies.

create table if not exists wago_trails (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  city             text,
  cover_image_url  text,
  status           text not null default 'draft' check (status in ('draft','published','paused','archived')),
  completion_mode  text not null default 'ordered' check (completion_mode in ('ordered','any_order')),
  distance_m       integer,
  est_minutes      integer,
  starts_at        timestamptz,
  ends_at          timestamptz,
  reward_type      text not null default 'none' check (reward_type in ('none','spl_token','sol')),
  reward_amount    numeric,
  reward_token_mint text,
  reward_symbol    text,
  reward_logo_url  text,
  reward_tickets   integer,
  reward_badge     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists wago_trail_stops (
  id          uuid primary key default gen_random_uuid(),
  trail_id    uuid not null references wago_trails(id) on delete cascade,
  position    integer not null,
  campaign_id uuid not null references wago_drop_campaigns(id) on delete restrict,
  location_id uuid not null references wago_drop_locations(id) on delete restrict,
  label       text,
  replaced_at timestamptz,
  replaced_by uuid references wago_trail_stops(id),
  created_at  timestamptz not null default now()
);
create unique index if not exists wago_trail_stops_pos_uq
  on wago_trail_stops (trail_id, position) where replaced_at is null;
create index if not exists wago_trail_stops_trail_idx on wago_trail_stops (trail_id);

create table if not exists wago_trail_progress (
  id                    uuid primary key default gen_random_uuid(),
  trail_id              uuid not null references wago_trails(id) on delete cascade,
  google_id             text not null,
  status                text not null default 'active' check (status in ('active','completed','expired')),
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  reward_status         text not null default 'none'
                        check (reward_status in ('none','unclaimed','awaiting_wallet','pending','completed','failed')),
  reward_claimed_at     timestamptz,
  reward_wallet         text,
  reward_tx_signature   text,
  reward_tickets_awarded integer,
  pog_username          text,
  reward_metadata       jsonb,
  unique (trail_id, google_id)
);
create index if not exists wago_trail_progress_user_idx on wago_trail_progress (google_id);

create table if not exists wago_trail_stop_progress (
  id           uuid primary key default gen_random_uuid(),
  progress_id  uuid not null references wago_trail_progress(id) on delete cascade,
  stop_id      uuid not null references wago_trail_stops(id) on delete restrict,
  claim_id     uuid not null,
  completed_at timestamptz not null default now(),
  unique (progress_id, stop_id)
);

alter table wago_trails enable row level security;
alter table wago_trail_stops enable row level security;
alter table wago_trail_progress enable row level security;
alter table wago_trail_stop_progress enable row level security;

-- Grass Draw ledger: allow the new entry type.
alter table grass_draw_entries drop constraint if exists grass_draw_entries_entry_type_check;
alter table grass_draw_entries add constraint grass_draw_entries_entry_type_check
  check (entry_type = any (array['proof','spotlight','flex_card','field_guide','x_engagement','challenge_win','referral_convert','manual','wago_proof','wago_trail']::text[]));
