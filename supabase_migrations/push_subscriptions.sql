-- Push reminders: one row per device that turned on streak reminders. Run once. Safe to re-run.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  username   text not null,           -- lower-case
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_sent  timestamptz
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (username);
alter table push_subscriptions enable row level security;   -- server only (service role); no browser access
