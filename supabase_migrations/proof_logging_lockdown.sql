-- Server-side proof logging. Safe to re-run.
-- STEP 1 (run BEFORE deploying, harmless): bookkeeping table for per-network throttling.
create table if not exists public.proof_attempts (
  id         bigserial primary key,
  ip_hash    text not null,
  username   text not null,
  secured    boolean not null default false,
  ok         boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists proof_attempts_ip_idx on public.proof_attempts (ip_hash, created_at desc);
alter table public.proof_attempts enable row level security;
revoke all on public.proof_attempts from anon, authenticated;

-- STEP 2 (run AFTER the new code is deployed): nobody but the server can call lock_in_streak any more.
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'lock_in_streak'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- STEP 1b (run BEFORE deploying, harmless): remembers a hash of each proof photo so one picture can't be reused.
create table if not exists public.proof_photo_hashes (
  hash       text primary key,
  username   text not null,
  day        date not null,
  created_at timestamptz not null default now()
);
alter table public.proof_photo_hashes enable row level security;
revoke all on public.proof_photo_hashes from anon, authenticated;

-- STEP 3 (run AFTER the new code is deployed): proof photos can only be uploaded through the server's signed links.
-- Only the WAGO Drops folder (which still uploads from the browser) stays open for inserts.
drop policy if exists "allow anon insert proof-photos" on storage.objects;
drop policy if exists "allow anon uploads  ny6sru_0" on storage.objects;
drop policy if exists proof_photos_wago_insert on storage.objects;
create policy proof_photos_wago_insert on storage.objects for insert to public
  with check (bucket_id = 'proof-photos' and name like 'wago-drops/%');
