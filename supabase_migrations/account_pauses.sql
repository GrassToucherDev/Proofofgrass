-- Account pauses: lets you stop an account from posting and take it out of the community feeds.
-- Run once in the Supabase SQL editor. Safe to re-run.
create table if not exists account_pauses (
  username     text primary key,            -- lower-case username (exactly as stored in Profiles/Streaks)
  reason       text,                        -- your private note; never shown to the player
  message      text,                        -- shown to the player when they try to post while paused
  paused_at    timestamptz not null default now(),
  paused_until timestamptz,                 -- empty = paused until you resume
  resumed_at   timestamptz,                 -- set when you resume; keeps a record
  paused_by    text
);
alter table account_pauses enable row level security;   -- only the server (service role) touches it
