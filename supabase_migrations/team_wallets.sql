-- Team token tracker: the wallets we watch and what we expect each to hold. Balances are NOT stored here; they are read live from Solana.
-- Server only: RLS on with no policies, so the public key cannot read or write it. Run in the Supabase SQL editor. Safe to re-run.
create table if not exists public.team_wallets (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  address    text not null unique,
  purpose    text,
  notes      text,
  expected   jsonb not null default '[]'::jsonb,   -- [{ "mint": "SOL" | "<mint>", "symbol": "TOUCHGRASS", "amount": 1000000 }]
  sort       int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.team_wallets enable row level security;
revoke all on public.team_wallets from anon, authenticated;
