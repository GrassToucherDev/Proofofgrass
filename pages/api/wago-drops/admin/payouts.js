// pages/api/wago-drops/admin/payouts.js
// Admin payout overview: every claim with its payout state.
//   held      = pending but the wallet isn't verified (the payout script skips it)
//   pending   = verified, waiting for the next payout run
//   failed    = last attempt errored (see `error`); can be retried
//   completed = paid (tx_signature)
// The treasury key never touches the web app: payouts are sent by
// scripts/process-wago-claims.mjs. "Retry" here just re-queues a failed claim.
import { createClient } from "@supabase/supabase-js";
import { payoutEligibility } from "../../../../utils/wagoPayout.mjs";
import { rewardSymbol } from "../../../../utils/wagoReward";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isAdmin(req) {
  const secret = req.headers["x-wago-admin-secret"] || req.query._s;
  return !!secret && secret === process.env.WAGO_ADMIN_SECRET;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("wago_drop_claims")
    .select(`id, google_id, wallet_address, wallet_verified, reward_type, reward_amount, reward_token_mint, reward_metadata,
             tx_signature, status, claimed_at, flags, device_hash,
             wago_drop_campaigns ( name, reward_symbol, reward_token_mint )`)
    .order("claimed_at", { ascending: false })
    .limit(1000);
  if (error) return res.status(500).json({ error: error.message });

  const gids = [...new Set((data || []).map(r => r.google_id))];
  const accounts = {};
  if (gids.length) {
    const { data: accs } = await supabase
      .from("wago_google_accounts")
      .select("google_id, email, linked_wallet, wallet_verified")
      .in("google_id", gids);
    (accs || []).forEach(a => { accounts[a.google_id] = a; });
  }

  const summary = { pending: 0, held: 0, failed: 0, completed: 0, flagged: 0, completed_by_symbol: {}, queued_by_symbol: {} };
  const claims = (data || []).map(r => {
    const acc = accounts[r.google_id];
    const gate = payoutEligibility(r, acc);
    let state = r.status;
    if (r.status === "pending" && !gate.eligible) state = "held";
    const amt = Number(r.reward_amount || 0);
    const symbol = rewardSymbol({ reward_type: r.reward_type, reward_symbol: r.wago_drop_campaigns?.reward_symbol, reward_token_mint: r.reward_token_mint || r.wago_drop_campaigns?.reward_token_mint });
    if (summary[state] !== undefined) summary[state] += 1;
    if (state === "completed") summary.completed_by_symbol[symbol] = (summary.completed_by_symbol[symbol] || 0) + amt;
    if (state === "pending") summary.queued_by_symbol[symbol] = (summary.queued_by_symbol[symbol] || 0) + amt;
    const realFlags = (r.flags || []).filter(f => f !== "no_device_hash");
    if (realFlags.length) summary.flagged += 1;
    return {
      id: r.id,
      state,
      status: r.status,
      campaign_name: r.wago_drop_campaigns?.name ?? "–",
      email: acc?.email ?? null,
      wallet_address: r.wallet_address,
      wallet_verified: gate.eligible,
      reward_type: r.reward_type,
      reward_amount: r.reward_amount,
      reward_symbol: symbol,
      tx_signature: r.tx_signature,
      error: r.reward_metadata?.error ?? null,
      flags: r.flags || [],
      claimed_at: r.claimed_at,
      hold_reason: gate.eligible ? null : gate.reason,
    };
  });

  // Trail completion rewards (separate from per-drop claims). Additive to the response.
  const { data: tp } = await supabase
    .from("wago_trail_progress")
    .select("id, trail_id, google_id, reward_status, reward_wallet, reward_tx_signature, reward_metadata, reward_claimed_at, wago_trails ( name, reward_type, reward_amount, reward_symbol, reward_token_mint )")
    .in("reward_status", ["pending", "awaiting_wallet", "failed", "completed"])
    .not("reward_claimed_at", "is", null)
    .order("reward_claimed_at", { ascending: false })
    .limit(500);
  const tgids = [...new Set((tp || []).map(r => r.google_id))];
  const taccts = {};
  if (tgids.length) {
    const { data: accs } = await supabase.from("wago_google_accounts").select("google_id, email").in("google_id", tgids);
    (accs || []).forEach(a => { taccts[a.google_id] = a; });
  }
  const trail_rewards = (tp || [])
    .filter(r => r.wago_trails && r.wago_trails.reward_type !== "none" && Number(r.wago_trails.reward_amount) > 0)
    .map(r => ({
      id: r.id, state: r.reward_status, trail_name: r.wago_trails.name, email: taccts[r.google_id]?.email ?? null,
      wallet_address: r.reward_wallet, reward_amount: r.wago_trails.reward_amount,
      reward_symbol: rewardSymbol({ reward_type: r.wago_trails.reward_type, reward_symbol: r.wago_trails.reward_symbol, reward_token_mint: r.wago_trails.reward_token_mint }),
      tx_signature: r.reward_tx_signature, error: r.reward_metadata?.error ?? null, claimed_at: r.reward_claimed_at,
    }));

  return res.status(200).json({ summary, claims, trail_rewards });
}
