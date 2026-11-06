-- Daily gallery: lets people keep their proofs out of the community feed, and collects reports.
-- Run once in Supabase. Safe to re-run.

alter table "Profiles" add column if not exists feed_hidden boolean not null default false;

create table if not exists gallery_reports (
  id         uuid primary key default gen_random_uuid(),
  reporter   text not null,                 -- lower-case username of the signed-in reporter
  username   text not null,                 -- lower-case username whose proof is reported
  day        date not null,                 -- the proof's UTC day (photo is <username>/<day>.png)
  reason     text,
  created_at timestamptz not null default now(),
  unique (reporter, username, day)
);
create index if not exists gallery_reports_proof_idx on gallery_reports (username, day);

-- Written and read only by the server (service role); no browser access.
alter table gallery_reports enable row level security;
