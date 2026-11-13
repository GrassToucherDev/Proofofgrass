-- Optional link to the lock (Streamflow, Jupiter Lock, explorer page). Safe to re-run.
alter table public.team_wallets add column if not exists lock_url text;
