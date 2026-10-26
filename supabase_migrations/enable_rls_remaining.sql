-- Turn on row security for tables that had it OFF (fully open to the public key). Safe to re-run.
-- The service role (server) bypasses RLS, so server code is unaffected.

-- Server-only: no browser use anywhere
alter table "Impact"       enable row level security;
alter table "Quests"       enable row level security;
alter table wago_seasons   enable row level security;
alter table wago_claims    enable row level security;

-- Browser reads only (pages read these; all writes are server-side)
alter table "Referrals"    enable row level security;
alter table wago_rewards   enable row level security;
alter table wago_rolls     enable row level security;
drop policy if exists referrals_read    on "Referrals";
drop policy if exists wago_rewards_read on wago_rewards;
drop policy if exists wago_rolls_read   on wago_rolls;
create policy referrals_read    on "Referrals"  for select to public using (true);
create policy wago_rewards_read on wago_rewards for select to public using (true);
create policy wago_rolls_read   on wago_rolls   for select to public using (true);

-- follows: the app still reads and writes it from the browser, so keep that working for now (move server-side later)
alter table follows enable row level security;
drop policy if exists follows_read   on follows;
drop policy if exists follows_insert on follows;
drop policy if exists follows_delete on follows;
create policy follows_read   on follows for select to public using (true);
create policy follows_insert on follows for insert to public with check (follower_username <> following_username);
create policy follows_delete on follows for delete to public using (true);
