-- WAGO Drops: campaigns can reward any Solana token. The symbol/logo are what users see.
alter table wago_drop_campaigns add column if not exists reward_symbol text;
alter table wago_drop_campaigns add column if not exists reward_logo_url text;
