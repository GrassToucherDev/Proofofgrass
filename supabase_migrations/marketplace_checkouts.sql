-- Checkout records for individual Marketplace purchases. The signed-in browser creates one (Google session
-- checked at that moment); the wallet step can then finish in ANOTHER browser (Phantom's in-app browser on
-- phones) using only the checkout id, with no Google session. Safe to re-run. service_role only.
create table if not exists marketplace_checkouts (
  id                    uuid primary key default gen_random_uuid(),
  username              text not null,
  item_id               text not null,
  price_usd             numeric(10,2) not null check (price_usd > 0),
  status                text not null default 'pending' check (status in ('pending','completed','expired')),
  transaction_signature text unique,
  created_at            timestamptz not null default now(),
  completed_at          timestamptz
);
create index if not exists marketplace_checkouts_user_idx on marketplace_checkouts (lower(username), item_id, status);
alter table marketplace_checkouts enable row level security;
revoke all on marketplace_checkouts from anon, authenticated;
