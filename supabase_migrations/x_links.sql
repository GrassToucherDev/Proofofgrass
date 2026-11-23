-- X (Twitter) account links: one verified X account per secured Proof of Grass username.
-- Written only by the server after the person signs in with X (OAuth 2.0, read-only scopes) and proves they own the account.
-- x_user_id is X's permanent numeric id (it never changes); x_username is the current @handle and can go stale if they rename.
-- Service-role only (RLS on, no policies). Safe to re-run.
create table if not exists x_links (
  username     text primary key check (username = lower(username) and length(username) between 1 and 64),
  x_user_id    text not null unique,
  x_username   text not null,
  x_name       text,
  linked_at    timestamptz not null default now(),
  refreshed_at timestamptz not null default now()
);
create index if not exists x_links_x_username_idx on x_links (lower(x_username));
alter table x_links enable row level security;
revoke all on x_links from anon, authenticated;
