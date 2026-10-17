-- WAGO Drops: track whether a linked wallet was proven by a wallet signature.
alter table wago_google_accounts add column if not exists wallet_verified boolean not null default false;
