-- LOCK DOWN BROWSER WRITES. Run in the Supabase SQL editor AFTER the matching code is deployed. Safe to re-run.
--
-- Until now these tables let anyone holding the public (anon) key insert, update or delete rows with no checks
-- ("using true / with check true"). The app now does these writes on the server instead:
--   * profile / wallet / referral / purchase-request / field-guide writes -> server APIs that check the signed-in owner
--   * admin pages                                                         -> /api/admin/db, which needs the admin secret
--   * streak logging, shields, etc.                                       -> SECURITY DEFINER functions (unchanged)
-- Reads are not touched. The service role (server) bypasses these policies, so server code keeps working.

-- ===== BATCH 1: run right after deploying this change =====

-- Scores, streaks, wallets, covers
drop policy if exists profiles_insert_public on "Profiles";
drop policy if exists profiles_update_public on "Profiles";
drop policy if exists "Streak"  on "Streaks";   -- UPDATE
drop policy if exists "Streaks" on "Streaks";   -- INSERT

-- Inventory: keep reading, stop writing
drop policy if exists user_inventory_all on "UserInventory";
drop policy if exists user_inventory_read on "UserInventory";
create policy user_inventory_read on "UserInventory" for select to public using (true);

-- Grass Draw: cycles, entries, winners, rewards, totals, caps, disqualifications
drop policy if exists cycles_update on grass_draw_cycles;
drop policy if exists entries_insert on grass_draw_entries;
drop policy if exists winners_insert on grass_draw_winners;
drop policy if exists winners_update on grass_draw_winners;
drop policy if exists rewards_all on grass_draw_rewards;       -- rewards_select stays
drop policy if exists totals_upsert on grass_draw_user_totals; -- totals_select stays
drop policy if exists caps_upsert on grass_draw_weekly_caps;   -- caps_select stays
drop policy if exists disq_insert on grass_draw_disqualifications;
drop policy if exists disq_update on grass_draw_disqualifications;

-- Purchases and unlocks
drop policy if exists marketplace_purchases_insert on "MarketplacePurchases";
drop policy if exists purchases_insert on "ShieldPurchases";
drop policy if exists ppr_insert on "PremiumPurchaseRequests";
drop policy if exists ppr_update on "PremiumPurchaseRequests";
drop policy if exists upu_insert on "UserPremiumUnlocks";
drop policy if exists sunset_insert on "SunsetPassActivations";
drop policy if exists "allow insert via rpc" on "ScoreEvents";

-- Burn history, spotlights, featured posts: anyone could delete or rewrite these
drop policy if exists burn_events_delete_public on "BurnEvents";
drop policy if exists burn_events_insert_public on "BurnEvents";
drop policy if exists burn_events_update_public on "BurnEvents";
drop policy if exists cs_delete_public on "CommunitySpotlights";
drop policy if exists cs_insert_public on "CommunitySpotlights";
drop policy if exists cs_update_public on "CommunitySpotlights";
drop policy if exists featuredposts_delete on "FeaturedPosts";
drop policy if exists featuredposts_insert on "FeaturedPosts";
drop policy if exists featuredposts_update on "FeaturedPosts";

-- Field guide entries are now saved by the server (signed approval); fingerprints are server-only and shouldn't be readable
drop policy if exists fg_entries_insert on "FieldGuideEntries";
drop policy if exists fg_progress_upsert on "FieldGuideProgress";
drop policy if exists fingerprints_insert on "DeviceFingerprints";
drop policy if exists fingerprints_select on "DeviceFingerprints";

-- Functions that only the server/admin should call
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('recalculate_draw_totals', 'recompute_double_burn_progression', 'increment')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- ===== BATCH 2: run after you've logged a proof and tapped around for a day, if nothing broke =====
-- (these tables are written by SECURITY DEFINER functions or have no known browser writer; dropping the public
--  write rules is the correct end state, but check proof logging first)
-- drop policy if exists "Allow public insert" on "Submissions";
-- drop policy if exists me_insert_public on "MilestoneEvents";
-- drop policy if exists me_update_public on "MilestoneEvents";
-- drop policy if exists wrc_insert_public on "WeeklyRewardClaims";
-- drop policy if exists wrc_update_public on "WeeklyRewardClaims";
-- drop policy if exists lucky_touch_insert_public on "LuckyTouchEvents";
-- drop policy if exists shield_log_insert on "ShieldUsageLog";
-- drop policy if exists clickevents_insert on "ClickEvents";
