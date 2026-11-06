-- Grove nudges: one friendly poke per person per day to a grove-mate who hasn't logged yet. Run once. Safe to re-run.
create table if not exists grove_nudges (
  id         uuid primary key default gen_random_uuid(),
  grove_id   uuid not null,
  from_user  text not null,          -- lower-case
  to_user    text not null,          -- lower-case
  day        date not null,          -- UTC day, same day boundary as the Grove "locked in today" status
  created_at timestamptz not null default now(),
  unique (from_user, to_user, day)
);
create index if not exists grove_nudges_to_idx on grove_nudges (to_user, day);
alter table grove_nudges enable row level security;   -- server only (service role); no browser access
