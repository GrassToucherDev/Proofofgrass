-- History for the team token tracker graph. One row per wallet per snapshot; all rows of one snapshot share taken_at. Server only (RLS on, no policies). Safe to re-run.
create table if not exists public.team_wallet_snapshots (id bigint generated always as identity primary key, taken_at timestamptz not null, address text not null, kind text not null default 'team', tg_amount numeric not null default 0, sol_amount numeric not null default 0, usd numeric not null default 0);
create index if not exists team_wallet_snapshots_taken_at on public.team_wallet_snapshots (taken_at);
alter table public.team_wallet_snapshots enable row level security;
revoke all on public.team_wallet_snapshots from anon, authenticated;
