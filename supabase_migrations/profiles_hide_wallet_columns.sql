-- Run AFTER the chore/hide-wallet-columns branch is deployed.
-- Hides wallet_address, touchgrass_balance, wallet_last_checked_at, holder_tier, wallet_verified_at from the public key.
revoke select on public."Profiles" from anon;
grant select (username, bio, location, avatar_emoji, joined_at, updated_at, wallet_verified,
  has_touchgrass_holder, has_grass_toucher, has_screen_toucher, referral_count_successful, referral_count_pending,
  referral_badge, avatar_url, avatar_frame, grass_score, active_cover_id, unlocked_covers, lucky_touch_count,
  punch_badge, punch_badge_tier, total_punches, field_guide_mastery, field_guide_mastery_at,
  field_guide_collections_complete) on public."Profiles" to anon;
-- rollback: grant select on public."Profiles" to anon;
