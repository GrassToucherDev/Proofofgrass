-- Last-known balances, saved per wallet so the tracker opens instantly and only refreshes what is older than an hour. Safe to re-run.
alter table public.team_wallets add column if not exists holdings jsonb;
alter table public.team_wallets add column if not exists usd numeric;
alter table public.team_wallets add column if not exists refreshed_at timestamptz;
alter table public.team_wallets add column if not exists read_error text;
