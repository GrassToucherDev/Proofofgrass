-- Lock flag and unlock date for tracked wallets. Safe to re-run.
alter table public.team_wallets add column if not exists locked boolean not null default false;
alter table public.team_wallets add column if not exists unlock_date date;
