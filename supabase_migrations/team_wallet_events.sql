-- TOUCHGRASS balance changes spotted on tracked wallets. Server only (RLS on, no policies). Safe to re-run.
create table if not exists public.team_wallet_events (id bigint generated always as identity primary key, wallet_id uuid, address text not null, label text, prev_amount numeric not null, new_amount numeric not null, delta numeric not null, detected_at timestamptz not null default now());
create index if not exists team_wallet_events_detected_at on public.team_wallet_events (detected_at desc);
alter table public.team_wallet_events enable row level security;
revoke all on public.team_wallet_events from anon, authenticated;
