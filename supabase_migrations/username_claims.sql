-- Username claims: binds one Google account to one username.
-- Service-role only (RLS on, no policies). Safe to re-run.
create table if not exists username_claims (
  username   text primary key check (username = lower(username) and length(username) between 1 and 64),
  google_id  text not null unique,
  claimed_at timestamptz not null default now()
);
alter table username_claims enable row level security;
revoke all on username_claims from anon, authenticated;
