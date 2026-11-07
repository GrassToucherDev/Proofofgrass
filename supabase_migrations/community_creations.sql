-- Community Creations: finished memes and PFPs players post from /create.
-- Run the three parts as separate queries in the Supabase SQL editor.

-- Part 1: tables
create table if not exists public.community_creations (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  kind text not null default 'meme',
  tool text,
  caption text,
  theme text,
  image_path text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists community_creations_created_idx on public.community_creations (created_at desc);
create index if not exists community_creations_user_idx on public.community_creations (username);
create table if not exists public.community_creation_likes (
  creation_id uuid not null references public.community_creations(id) on delete cascade,
  liker text not null,
  created_at timestamptz not null default now(),
  primary key (creation_id, liker)
);
create table if not exists public.community_creation_reports (
  creation_id uuid not null references public.community_creations(id) on delete cascade,
  reporter text not null,
  created_at timestamptz not null default now(),
  primary key (creation_id, reporter)
);
alter table public.community_creations enable row level security;
alter table public.community_creation_likes enable row level security;
alter table public.community_creation_reports enable row level security;

-- Part 2: public storage bucket for the images
insert into storage.buckets (id, name, public) values ('creations', 'creations', true) on conflict (id) do nothing;

-- Part 3: check
select (select count(*) from public.community_creations) as creations, (select public from storage.buckets where id = 'creations') as bucket_public;
