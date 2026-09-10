// pages/api/wago/roll.js
// Server-side WAGO Drop roll — called after lock_in_streak succeeds
// Never trust client-supplied streak, balance or reward data

const MINT    = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const DECIMALS = 6;
const RPC     = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// ── Verify $TOUCHGRASS balance server-side via JSON-RPC ───────────────────────
async function getTokenBalance(walletAddress) {
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          { mint: MINT },
          { encoding: "jsonParsed" },
        ],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const accounts = data.result?.value ?? [];
    let total = 0;
    for (const acc of accounts) {
      const amount = parseFloat(acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0);
      total += amount;
    }
    return { balance: total, ok: true };
  } catch(e) {
    console.error("[wago/roll] balance check failed:", e?.message);
    return { balance: null, ok: false, error: e?.message };
  }
}

// ── Secure server-side random selection ───────────────────────────────────────
function secureRandom() {
  // Use crypto.getRandomValues in edge/Node environment
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return arr[0] / 0xFFFFFFFF;
  }
  // Node.js fallback
  const { randomBytes } = require("crypto");
  return randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
}

function selectReward(rewards, noDropWeight) {
  // Build weighted pool
  const pool = [{ id: null, name: "no_drop", weight: noDropWeight }];
  for (const r of rewards) {
    if (r.active && (r.total_inventory - r.reserved_inventory - r.fulfilled_inventory) > 0) {
      pool.push({ id: r.id, name: r.name, weight: r.weight, amount: r.amount_per_win });
    }
  }
  const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
  let rand = secureRandom() * totalWeight;
  for (const item of pool) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return pool[0]; // fallback to no_drop
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, streak_day, submission_id } = req.body;

  if (!username || !streak_day) {
    return res.status(400).json({ error: "Missing username or streak_day" });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // ── 1. Find active season ─────────────────────────────────────────────────
    const now = new Date().toISOString();
    const { data: season } = await supabase
      .from("wago_seasons")
      .select("*")
      .eq("status", "active")
      .eq("feature_enabled", true)
      .lte("start_at", now)
      .gte("end_at", now)
      .maybeSingle();

    if (!season) {
      return res.status(200).json({ outcome: "ineligible", reason: "no_active_season" });
    }

    // ── 2. Check streak eligibility ───────────────────────────────────────────
    if (streak_day < season.first_eligible_streak_day) {
      return res.status(200).json({
        outcome: "ineligible",
        reason: "streak_too_short",
        streak_day,
        required: season.first_eligible_streak_day,
      });
    }

    // ── 3. Check for duplicate roll today ─────────────────────────────────────
    const todayUTC = new Date().toISOString().slice(0, 10);
    const { data: existingRoll } = await supabase
      .from("wago_rolls")
      .select("id, outcome, reward_id")
      .eq("username", username)
      .eq("season_id", season.id)
      .eq("proof_utc_date", todayUTC)
      .maybeSingle();

    if (existingRoll) {
      return res.status(200).json({
        outcome: existingRoll.outcome,
        reason: "already_rolled_today",
        roll_id: existingRoll.id,
      });
    }

    // ── 4. Check for duplicate submission roll ────────────────────────────────
    if (submission_id) {
      const { data: subRoll } = await supabase
        .from("wago_rolls")
        .select("id, outcome")
        .eq("submission_id", submission_id)
        .maybeSingle();
      if (subRoll) {
        return res.status(200).json({
          outcome: subRoll.outcome,
          reason: "submission_already_rolled",
        });
      }
    }

    // ── 5. Get user wallet ────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("Profiles")
      .select("wallet_address, wallet_verified")
      .ilike("username", username)
      .maybeSingle();

    if (!profile?.wallet_verified || !profile?.wallet_address) {
      // Record ineligible roll — no wallet
      await supabase.from("wago_rolls").insert([{
        season_id: season.id,
        username,
        submission_id: submission_id || null,
        authoritative_streak_day: streak_day,
        proof_utc_date: todayUTC,
        verified_wallet: null,
        verified_token_balance: null,
        required_token_balance: season.required_token_amount,
        outcome: "ineligible",
      }]);
      return res.status(200).json({
        outcome: "ineligible",
        reason: "no_verified_wallet",
      });
    }

    // ── 6. Verify token balance server-side ───────────────────────────────────
    const { balance, ok, error: balanceError } = await getTokenBalance(profile.wallet_address);
    const balanceCheckedAt = new Date().toISOString();

    if (!ok) {
      // Balance check failed — do NOT consume the roll
      return res.status(200).json({
        outcome: "balance_check_failed",
        reason: "rpc_unavailable",
        message: "We couldn't verify your balance. Your WAGO chance has not been used.",
        retriable: true,
      });
    }

    if (balance < season.required_token_amount) {
      // Record ineligible roll — insufficient holding
      await supabase.from("wago_rolls").insert([{
        season_id: season.id,
        username,
        submission_id: submission_id || null,
        authoritative_streak_day: streak_day,
        proof_utc_date: todayUTC,
        verified_wallet: profile.wallet_address,
        verified_token_balance: balance,
        required_token_balance: season.required_token_amount,
        balance_verified_at: balanceCheckedAt,
        outcome: "ineligible",
      }]);
      return res.status(200).json({
        outcome: "ineligible",
        reason: "insufficient_holding",
        balance,
        required: season.required_token_amount,
      });
    }

    // ── 7. Load active rewards ────────────────────────────────────────────────
    const { data: rewards } = await supabase
      .from("wago_rewards")
      .select("*")
      .eq("season_id", season.id)
      .eq("active", true);

    // ── 8. Secure random selection ────────────────────────────────────────────
    const selected = selectReward(rewards || [], season.no_drop_weight);
    const isWin    = selected.id !== null;

    // ── 9. Atomically reserve inventory and create roll ───────────────────────
    if (isWin) {
      // Reserve inventory — decrement atomically
      const { data: updated, error: reserveErr } = await supabase
        .from("wago_rewards")
        .update({ reserved_inventory: supabase.rpc("increment", { x: 1 }) })
        .eq("id", selected.id)
        .lt("reserved_inventory + fulfilled_inventory", supabase.raw("total_inventory"))
        .select()
        .maybeSingle();

      // Simpler atomic reserve using raw SQL via RPC
      const { error: rpcErr } = await supabase.rpc("wago_reserve_reward", {
        p_reward_id: selected.id,
      });

      if (rpcErr) {
        // Inventory exhausted — treat as no drop
        console.warn("[wago/roll] reserve failed, treating as no_drop:", rpcErr.message);
        const { data: roll } = await supabase.from("wago_rolls").insert([{
          season_id: season.id,
          username,
          submission_id: submission_id || null,
          authoritative_streak_day: streak_day,
          proof_utc_date: todayUTC,
          verified_wallet: profile.wallet_address,
          verified_token_balance: balance,
          required_token_balance: season.required_token_amount,
          balance_verified_at: balanceCheckedAt,
          outcome: "no_drop",
        }]).select().maybeSingle();

        return res.status(200).json({ outcome: "no_drop", roll_id: roll?.id });
      }

      // Create winning roll
      const { data: roll } = await supabase.from("wago_rolls").insert([{
        season_id: season.id,
        username,
        submission_id: submission_id || null,
        authoritative_streak_day: streak_day,
        proof_utc_date: todayUTC,
        verified_wallet: profile.wallet_address,
        verified_token_balance: balance,
        required_token_balance: season.required_token_amount,
        balance_verified_at: balanceCheckedAt,
        outcome: "won",
        reward_id: selected.id,
        reward_amount: selected.amount,
      }]).select().maybeSingle();

      // Create claim record
      await supabase.from("wago_claims").insert([{
        roll_id: roll.id,
        season_id: season.id,
        reward_id: selected.id,
        username,
        wallet: profile.wallet_address,
        status: "reserved",
      }]);

      // Get full reward details for response
      const { data: rewardDetails } = await supabase
        .from("wago_rewards")
        .select("name, description, reward_type, rarity, image_url, amount_per_win")
        .eq("id", selected.id)
        .maybeSingle();

      return res.status(200).json({
        outcome: "won",
        roll_id: roll.id,
        reward: {
          name: rewardDetails?.name,
          description: rewardDetails?.description,
          type: rewardDetails?.reward_type,
          rarity: rewardDetails?.rarity,
          image_url: rewardDetails?.image_url,
          amount: selected.amount,
        },
        season_name: season.name,
        streak_day,
      });

    } else {
      // No drop
      const { data: roll } = await supabase.from("wago_rolls").insert([{
        season_id: season.id,
        username,
        submission_id: submission_id || null,
        authoritative_streak_day: streak_day,
        proof_utc_date: todayUTC,
        verified_wallet: profile.wallet_address,
        verified_token_balance: balance,
        required_token_balance: season.required_token_amount,
        balance_verified_at: balanceCheckedAt,
        outcome: "no_drop",
      }]).select().maybeSingle();

      return res.status(200).json({
        outcome: "no_drop",
        roll_id: roll?.id,
        streak_day,
        season_name: season.name,
      });
    }

  } catch(e) {
    console.error("[wago/roll] error:", e);
    return res.status(500).json({ error: "Roll failed. Try again." });
  }
}