// pages/api/wago/status.js
// Returns current WAGO season + user eligibility for the dashboard card
// Cached friendly — balance is NOT checked here, only on roll

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { username } = req.query;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // ── Active season ─────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const { data: season } = await supabase
      .from("wago_seasons")
      .select("id,name,slug,status,start_at,end_at,required_token_amount,first_eligible_streak_day,minimum_qualifying_streak,reward_pool_description,feature_enabled,no_drop_weight")
      .eq("status", "active")
      .eq("feature_enabled", true)
      .lte("start_at", now)
      .gte("end_at", now)
      .maybeSingle();

    if (!season) {
      return res.status(200).json({ season: null, eligible: false, reason: "no_active_season" });
    }

    // ── Reward types for display icons ────────────────────────────────────────
    const { data: rewards } = await supabase
      .from("wago_rewards")
      .select("reward_type, name, rarity")
      .eq("season_id", season.id)
      .eq("active", true);

    const rewardTypes = [...new Set((rewards||[]).map(r=>r.reward_type))];

    if (!username) {
      return res.status(200).json({ season, reward_types: rewardTypes, eligible: false, reason: "not_signed_in" });
    }

    // ── User streak ───────────────────────────────────────────────────────────
    const { data: streak } = await supabase
      .from("Streaks")
      .select("current_streak, last_submission_date")
      .ilike("username", username)
      .maybeSingle();

    const currentStreak = streak?.current_streak ?? 0;
    const streakOk      = currentStreak >= season.first_eligible_streak_day;

    // ── Wallet status ─────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("Profiles")
      .select("wallet_address, wallet_verified")
      .ilike("username", username)
      .maybeSingle();

    const hasWallet = !!(profile?.wallet_verified && profile?.wallet_address);

    // ── Today's roll ──────────────────────────────────────────────────────────
    const todayUTC = new Date().toISOString().slice(0, 10);
    const { data: todayRoll } = await supabase
      .from("wago_rolls")
      .select("id, outcome, reward_id, rolled_at")
      .eq("username", username)
      .eq("season_id", season.id)
      .eq("proof_utc_date", todayUTC)
      .maybeSingle();

    // ── User's recent wins ────────────────────────────────────────────────────
    const { data: recentWins } = await supabase
      .from("wago_rolls")
      .select("id, outcome, reward_id, rolled_at, proof_utc_date, wago_rewards(name, reward_type, rarity)")
      .eq("username", username)
      .eq("season_id", season.id)
      .eq("outcome", "won")
      .order("rolled_at", { ascending: false })
      .limit(5);

    // ── Days remaining ────────────────────────────────────────────────────────
    const daysRemaining = Math.max(0, Math.ceil((new Date(season.end_at) - new Date()) / 86400000));

    return res.status(200).json({
      season: {
        id: season.id,
        name: season.name,
        slug: season.slug,
        required_token_amount: season.required_token_amount,
        first_eligible_streak_day: season.first_eligible_streak_day,
        minimum_qualifying_streak: season.minimum_qualifying_streak,
        days_remaining: daysRemaining,
        end_at: season.end_at,
      },
      reward_types: rewardTypes,
      user: {
        current_streak: currentStreak,
        streak_ok: streakOk,
        has_wallet: hasWallet,
        wallet_address: hasWallet ? profile.wallet_address : null,
      },
      today_roll: todayRoll || null,
      recent_wins: recentWins || [],
      eligible: streakOk && hasWallet && !todayRoll,
    });

  } catch(e) {
    console.error("[wago/status] error:", e);
    return res.status(500).json({ error: "Failed to load WAGO status." });
  }
}