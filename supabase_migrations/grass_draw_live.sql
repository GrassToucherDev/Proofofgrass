-- Grass Draw live reveal shows. Service-role only (the API serves a time-gated view to the public).
-- Safe to re-run.
create table if not exists grass_draw_live_shows (
  id            uuid primary key default gen_random_uuid(),
  cycle_id      text not null,
  title         text not null default 'Grass Draw',
  status        text not null default 'scheduled' check (status in ('scheduled','live','archived')),
  scheduled_at  timestamptz,
  started_at    timestamptz,
  intro_seconds int  not null default 8  check (intro_seconds between 3 and 60),
  step_seconds  int  not null default 6  check (step_seconds between 2 and 30),
  reveal_order  jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);
alter table grass_draw_live_shows enable row level security;
revoke all on grass_draw_live_shows from anon, authenticated;
