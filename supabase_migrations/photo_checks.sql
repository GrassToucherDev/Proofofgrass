-- Automatic photo check on "Log proof": one row per checked photo. Blocked screenshots/receipts are deleted from storage
-- (no photo kept); flagged photos stay and show in /admin/pauses under "Needs review". Run once in the Supabase SQL editor.
create table if not exists photo_checks (
  id          bigserial primary key,
  username    text not null,
  day         date not null default (now() at time zone 'utc')::date,
  verdict     text not null,                 -- ok | flag | blocked
  category    text,                          -- outdoor_photo | screenshot | document_or_receipt | indoor | photo_of_screen | ai_suspected | unclear
  confidence  numeric,
  reason      text,
  reviewed    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists photo_checks_day_idx on photo_checks (day, verdict);
create index if not exists photo_checks_open_idx on photo_checks (reviewed, verdict, created_at desc);
alter table photo_checks enable row level security;   -- only the server (service role) touches it
