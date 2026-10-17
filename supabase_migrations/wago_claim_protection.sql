-- WAGO Drops: claim protection + payout visibility.
alter table wago_drop_claims add column if not exists wallet_verified boolean not null default false;
alter table wago_drop_claims add column if not exists device_hash text;
alter table wago_drop_claims add column if not exists claim_ip text;
alter table wago_drop_claims add column if not exists flags text[] not null default '{}';
create index if not exists wago_drop_claims_device_idx on wago_drop_claims (device_hash);
create index if not exists wago_drop_claims_google_time_idx on wago_drop_claims (google_id, claimed_at desc);
