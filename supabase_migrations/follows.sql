-- Follows: follow people to get a "Following" tab in the gallery. Run once. Safe to re-run.
create table if not exists follows (
  id         uuid primary key default gen_random_uuid(),
  follower   text not null,          -- lower-case username of the person following
  following  text not null,          -- lower-case username being followed
  created_at timestamptz not null default now(),
  unique (follower, following),
  check (follower <> following)
);
create index if not exists follows_follower_idx  on follows (follower);
create index if not exists follows_following_idx on follows (following);
alter table follows enable row level security;   -- server only (service role); no browser access
