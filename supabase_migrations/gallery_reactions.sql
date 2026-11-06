-- Gallery reactions: a leaf or a fire on someone's proof. Run once in Supabase. Safe to re-run.
create table if not exists gallery_reactions (
  id         uuid primary key default gen_random_uuid(),
  reactor    text not null,                 -- lower-case username of the signed-in person reacting
  username   text not null,                 -- lower-case username whose proof it is
  day        date not null,                 -- the proof's UTC day
  kind       text not null check (kind in ('leaf','fire')),
  created_at timestamptz not null default now(),
  unique (reactor, username, day, kind)
);
create index if not exists gallery_reactions_proof_idx on gallery_reactions (username, day);
alter table gallery_reactions enable row level security;   -- server only (service role); no browser access
