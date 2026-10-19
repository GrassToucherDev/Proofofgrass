-- Cleanup: remove the dead "deadline_passed" check from lock_in_streak.
-- It compared now() to the END of today (UTC), which can never be true, so it never ran.
-- Behaviour is unchanged. Run in the Supabase SQL editor (replaces the function; requires
-- supabase_migrations/sunset_pass.sql to have been run first, which it has).
CREATE OR REPLACE FUNCTION public.lock_in_streak(p_username text, p_tweet_url text DEFAULT NULL::text, p_verification text DEFAULT 'self_attested'::text, p_location_source text DEFAULT 'none'::text, p_location_lat_rounded numeric DEFAULT NULL::numeric, p_location_lng_rounded numeric DEFAULT NULL::numeric, p_location_label text DEFAULT NULL::text, p_location_city text DEFAULT NULL::text, p_location_region text DEFAULT NULL::text, p_location_country text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_today          date        := CURRENT_DATE;          -- UTC date
  v_now            timestamptz := now();
  v_streak_row     "Streaks"%ROWTYPE;
  v_new_streak     integer;
  v_submission_id  uuid;
  v_shield_qty     integer := 0;
  v_used_shield    boolean := false;
  v_lucky          jsonb   := jsonb_build_object('triggered', false);
  v_roll           float;
  v_last_date      date;
  v_eff            date;                      -- the UTC day this post counts for
  v_pass_used      boolean     := false;       -- Sunset Pass applied to this post
BEGIN

  -- ── 1. Load or create streak row ──────────────────────────────────────────
  SELECT * INTO v_streak_row
  FROM "Streaks"
  WHERE lower(username) = lower(p_username);

  IF NOT FOUND THEN
    INSERT INTO "Streaks" (username, current_streak, shield_count, last_submission_date)
    VALUES (p_username, 0, 0, v_today - 1)
    RETURNING * INTO v_streak_row;
  END IF;

  -- ── 3b. Sunset Pass ───────────────────────────────────────────────────────
  -- Before 02:00 UTC, an activated pass for YESTERDAY lets this post count for
  -- yesterday (if yesterday hasn't been submitted). Otherwise it counts for today.
  v_eff := v_today;
  IF EXTRACT(HOUR FROM (v_now AT TIME ZONE 'UTC')) < 2
     AND (v_streak_row.last_submission_date IS NULL OR v_streak_row.last_submission_date::date < v_today - 1) THEN
    BEGIN
      IF EXISTS (
        SELECT 1 FROM "SunsetPassActivations"
        WHERE lower(username) = lower(p_username)
          AND activated_date = v_today - 1
      ) THEN
        v_eff := v_today - 1;
        v_pass_used := true;
      END IF;
    EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;

  -- ── 4. Already submitted for this day (UTC)? ──────────────────────────────
  IF v_streak_row.last_submission_date IS NOT NULL THEN
    v_last_date := v_streak_row.last_submission_date::date;
    IF v_last_date = v_eff THEN
      RETURN jsonb_build_object(
        'status',         'already_submitted',
        'current_streak', v_streak_row.current_streak,
        'submission_id',  NULL,
        'lucky_touch',    jsonb_build_object('triggered', false)
      );
    END IF;
  END IF;

  -- ── 5. Shield balance ─────────────────────────────────────────────────────
  BEGIN
    SELECT COALESCE(quantity, 0) INTO v_shield_qty
    FROM "UserConsumables"
    WHERE lower(username) = lower(p_username) AND consumable_type = 'shield';
  EXCEPTION WHEN undefined_table THEN
    v_shield_qty := 0;
  END;

  BEGIN
    IF v_shield_qty = 0 THEN
      v_shield_qty := COALESCE(v_streak_row.shield_count, 0);
    END IF;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  -- ── 6. Determine new streak ───────────────────────────────────────────────
  IF v_streak_row.last_submission_date IS NULL THEN
    v_new_streak := 1;

  ELSIF v_streak_row.last_submission_date::date = v_eff - 1 THEN
    -- Consecutive UTC day (relative to the day this post counts for)
    v_new_streak := v_streak_row.current_streak + 1;

  ELSIF v_shield_qty > 0 THEN
    -- Missed one day but has a shield
    v_new_streak  := v_streak_row.current_streak + 1;
    v_used_shield := true;

    BEGIN
      UPDATE "UserConsumables"
      SET quantity   = quantity - 1,
          updated_at = now()
      WHERE lower(username) = lower(p_username)
        AND consumable_type = 'shield'
        AND quantity > 0;
    EXCEPTION WHEN undefined_table THEN NULL; END;

    BEGIN
      UPDATE "Streaks"
      SET shield_count = GREATEST(0, COALESCE(shield_count, 0) - 1)
      WHERE lower(username) = lower(p_username);
    EXCEPTION WHEN undefined_column THEN NULL; END;

    BEGIN
      INSERT INTO "ConsumableEvents"
        (username, consumable_type, event_type, quantity, metadata)
      VALUES (
        p_username, 'shield', 'consumed', 1,
        jsonb_build_object('streak_protected', v_streak_row.current_streak)
      );
    EXCEPTION WHEN undefined_table THEN NULL; END;

  ELSE
    -- Streak broken
    v_new_streak := 1;
  END IF;

  -- ── 7. Insert submission (handle duplicate gracefully) ───────────────────
  BEGIN
    INSERT INTO "Submissions" (
      username,
      tweet_url,
      verification_method,
      location_source,
      location_lat_rounded,
      location_lng_rounded,
      location_label,
      location_city,
      location_region,
      location_country,
      created_at
    ) VALUES (
      p_username,
      p_tweet_url,
      p_verification,
      p_location_source,
      p_location_lat_rounded,
      p_location_lng_rounded,
      p_location_label,
      p_location_city,
      p_location_region,
      p_location_country,
      CASE WHEN v_pass_used
           THEN (((v_eff + 1)::timestamp AT TIME ZONE 'UTC') - interval '1 second')
           ELSE v_now END
    )
    RETURNING id INTO v_submission_id;
  EXCEPTION WHEN unique_violation THEN
    -- Submission already exists for today — fetch its id and continue
    -- so the Streaks row still gets updated correctly
    SELECT id INTO v_submission_id
    FROM "Submissions"
    WHERE lower(username) = lower(p_username)
      AND DATE(created_at AT TIME ZONE 'UTC') = v_eff
    ORDER BY created_at DESC
    LIMIT 1;
  END;

  -- ── 8. Update streak row ──────────────────────────────────────────────────
  UPDATE "Streaks" SET
    current_streak       = v_new_streak,
    last_submission_date = v_eff
  WHERE lower(username) = lower(p_username);

  BEGIN
    UPDATE "Streaks" SET
      best_streak = GREATEST(COALESCE(best_streak, 0), v_new_streak)
    WHERE lower(username) = lower(p_username);
  EXCEPTION WHEN undefined_column THEN NULL; END;

  -- ── 9. Grass score ────────────────────────────────────────────────────────
  -- Ensure profile row exists for new users before updating
  BEGIN
    INSERT INTO "Profiles" (username)
    VALUES (p_username)
    ON CONFLICT (username) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Daily proof: +10
  BEGIN
    INSERT INTO "ScoreEvents" (username, event_type, points, metadata)
    VALUES (p_username, 'daily_proof', 10,
            jsonb_build_object('streak', v_new_streak));
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    UPDATE "Profiles"
    SET grass_score = COALESCE(grass_score, 0) + 10
    WHERE lower(username) = lower(p_username);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- ── 9b. Streak milestone bonuses ─────────────────────────────────────────
  -- 10 points × milestone day (Day 14=140, 30=300, 50=500, etc.)
  -- Only award on the exact day hit to prevent double-awarding
  DECLARE
    v_milestone_day   integer;
    v_milestone_pts   integer;
    v_milestone_type  text;
  BEGIN
    SELECT m.day, m.day * 10, m.event_type
    INTO v_milestone_day, v_milestone_pts, v_milestone_type
    FROM (VALUES
      (10,  'milestone_10'),
      (20,  'milestone_20'),
      (30,  'milestone_30'),
      (50,  'milestone_50'),
      (100, 'milestone_100'),
      (180, 'milestone_180'),
      (365, 'milestone_365'),
      (500, 'milestone_500')
    ) AS m(day, event_type)
    WHERE m.day = v_new_streak
    LIMIT 1;

    IF FOUND THEN
      -- Check not already awarded (idempotent)
      IF NOT EXISTS (
        SELECT 1 FROM "ScoreEvents"
        WHERE lower(username) = lower(p_username)
          AND event_type = v_milestone_type
      ) THEN
        INSERT INTO "ScoreEvents" (username, event_type, points, metadata)
        VALUES (p_username, v_milestone_type, v_milestone_pts,
                jsonb_build_object('streak', v_new_streak));

        UPDATE "Profiles"
        SET grass_score = COALESCE(grass_score, 0) + v_milestone_pts
        WHERE lower(username) = lower(p_username);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- ── 9b. Grass Draw — write proof entry ──────────────────────────────────────
  -- Only fires during an active cycle, once per UTC day per user
  DECLARE
    v_cycle_id    uuid;
    v_multiplier  numeric(6,4);
    v_raw_amount  numeric(10,4) := 1.0;
    v_weighted    numeric(10,4);
    v_already_entered boolean := false;
  BEGIN
    -- Get active cycle
    SELECT get_active_draw_cycle() INTO v_cycle_id;

    IF v_cycle_id IS NOT NULL THEN
      -- Check not already entered today for this cycle
      SELECT EXISTS(
        SELECT 1 FROM "grass_draw_entries"
        WHERE cycle_id = v_cycle_id
          AND lower(username) = lower(p_username)
          AND entry_type = 'proof'
          AND COALESCE((metadata->>'submission_date')::date, DATE(created_at AT TIME ZONE 'UTC')) = v_eff
      ) INTO v_already_entered;

      IF NOT v_already_entered THEN
        -- Get multiplier for current streak
        SELECT get_draw_multiplier(v_new_streak) INTO v_multiplier;
        v_weighted := v_raw_amount * v_multiplier;

        -- Write ledger entry
        INSERT INTO "grass_draw_entries" (
          cycle_id, username, entry_type,
          source_id, raw_amount, weighted_amount,
          multiplier, streak_at_time, metadata
        ) VALUES (
          v_cycle_id, p_username, 'proof',
          v_submission_id::text, v_raw_amount, v_weighted,
          v_multiplier, v_new_streak,
          jsonb_build_object('streak', v_new_streak, 'submission_date', v_eff)
        );

        -- Recalculate user totals
        PERFORM recalculate_draw_totals(v_cycle_id, p_username);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- ── 9c. Unlock streak milestone cover ────────────────────────────────────
  -- Each milestone day unlocks the corresponding profile cover
  DECLARE
    v_cover_slug text;
  BEGIN
    SELECT c.slug INTO v_cover_slug
    FROM (VALUES
      (7,   'day_7_golden_hour'),
      (14,  'day_14_rooted_grove'),
      (30,  'day_30_mountain_summit'),
      (50,  'day_50_ancient_forest'),
      (100, 'day_100_ascended_night_sky'),
      (180, 'day_180_sun_temple'),
      (365, 'day_365_eternal_garden'),
      (500, 'day_500_celestial_ascension')
    ) AS c(day, slug)
    WHERE c.day = v_new_streak
    LIMIT 1;

    IF FOUND AND v_cover_slug IS NOT NULL THEN
      -- Add cover to unlocked_covers if not already there
      UPDATE "Profiles"
      SET unlocked_covers = array(
        SELECT DISTINCT unnest(
          COALESCE(unlocked_covers, '{}') || ARRAY[v_cover_slug]
        )
      )
      WHERE lower(username) = lower(p_username)
        AND NOT (COALESCE(unlocked_covers, '{}') @> ARRAY[v_cover_slug]);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- ── 9d. Refund an armed-but-unused Sunset Pass ──────────────────────────────
  -- Activated before midnight, but the user posted before the deadline anyway.
  IF NOT v_pass_used THEN
    BEGIN
      DELETE FROM "SunsetPassActivations"
      WHERE lower(username) = lower(p_username) AND activated_date = v_today;
      IF FOUND THEN
        UPDATE "UserConsumables"
        SET quantity = quantity + 1, updated_at = now()
        WHERE lower(username) = lower(p_username) AND consumable_type = 'sunset_pass';
        INSERT INTO "ConsumableEvents" (username, consumable_type, event_type, quantity, metadata)
        VALUES (lower(p_username), 'sunset_pass', 'refunded', 1,
                jsonb_build_object('reason', 'posted_before_deadline', 'date', v_today));
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  -- ── 10. Lucky Touch ───────────────────────────────────────────────────────
  v_roll := random();

  BEGIN
    IF v_roll < 0.005 THEN
      v_lucky := jsonb_build_object('triggered', true, 'tier', 'legendary', 'type', 'shield', 'points', 0);
      BEGIN
        INSERT INTO "UserConsumables" (username, consumable_type, quantity)
        VALUES (p_username, 'shield', 1)
        ON CONFLICT (username, consumable_type)
        DO UPDATE SET quantity = "UserConsumables".quantity + 1, updated_at = now();
      EXCEPTION WHEN OTHERS THEN NULL; END;
      BEGIN
        UPDATE "Streaks" SET shield_count = COALESCE(shield_count, 0) + 1
        WHERE lower(username) = lower(p_username);
      EXCEPTION WHEN OTHERS THEN NULL; END;
      BEGIN
        INSERT INTO "LuckyTouchEvents" (username, tier, reward_type, points)
        VALUES (p_username, 'legendary', 'shield', 0);
      EXCEPTION WHEN OTHERS THEN NULL; END;

    ELSIF v_roll < 0.03 THEN
      v_lucky := jsonb_build_object('triggered', true, 'tier', 'rare', 'type', 'points', 'points', 50);
      BEGIN
        UPDATE "Profiles" SET grass_score = COALESCE(grass_score, 0) + 50
        WHERE lower(username) = lower(p_username);
        INSERT INTO "ScoreEvents" (username, event_type, points)
        VALUES (p_username, 'lucky_touch_rare', 50);
        INSERT INTO "LuckyTouchEvents" (username, tier, reward_type, points)
        VALUES (p_username, 'rare', 'points', 50);
      EXCEPTION WHEN OTHERS THEN NULL; END;

    ELSIF v_roll < 0.15 THEN
      v_lucky := jsonb_build_object('triggered', true, 'tier', 'common', 'type', 'points', 'points', 15);
      BEGIN
        UPDATE "Profiles" SET grass_score = COALESCE(grass_score, 0) + 15
        WHERE lower(username) = lower(p_username);
        INSERT INTO "ScoreEvents" (username, event_type, points)
        VALUES (p_username, 'lucky_touch_common', 15);
        INSERT INTO "LuckyTouchEvents" (username, tier, reward_type, points)
        VALUES (p_username, 'common', 'points', 15);
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- ── 11. Return ────────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'status',         'success',
    'current_streak', v_new_streak,
    'submission_id',  v_submission_id,
    'used_shield',    v_used_shield,
    'used_sunset_pass', v_pass_used,
    'counted_for',    v_eff,
    'lucky_touch',    v_lucky
  );

END;
$function$
;
