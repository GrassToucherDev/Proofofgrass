-- WAGO Drops Proof bonus → Grass Tickets
-- Run in the Supabase SQL editor BEFORE deploying the matching code
-- (locations/claim APIs now select rarity + proof_bonus_tickets).

-- 1. Campaign rarity + per-drop ticket override
alter table wago_drop_campaigns
  add column if not exists rarity text not null default 'common',
  add column if not exists proof_bonus_tickets integer;

do $$ begin
  alter table wago_drop_campaigns
    add constraint wago_drop_campaigns_rarity_check
    check (rarity in ('common','rare','epic','legendary'));
exception when duplicate_object then null; end $$;

-- 2. One proof per claim
create table if not exists wago_drop_proofs (
  id              uuid primary key default gen_random_uuid(),
  claim_id        uuid not null unique references wago_drop_claims(id) on delete cascade,
  google_id       text not null,
  photo_path      text not null,
  proof_lat       double precision,
  proof_lng       double precision,
  distance_m      integer,
  status          text not null default 'photo_approved'
                  check (status in ('photo_approved','awarded','expired')),
  pog_username    text,
  x_post_url      text,
  tickets_awarded integer,
  awarded_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists wago_drop_proofs_google_idx on wago_drop_proofs (google_id);
alter table wago_drop_proofs enable row level security;  -- server (service role) only

-- 3. CHECK FIRST: does grass_draw_entries restrict entry_type? If this returns
--    a row, add 'wago_proof' to that constraint.
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'grass_draw_entries'::regclass and contype = 'c';

-- 4. CHECK: proof-photos bucket must allow anon uploads to wago-drops/*
--    (same policy the main app uses for uploads from the browser).
