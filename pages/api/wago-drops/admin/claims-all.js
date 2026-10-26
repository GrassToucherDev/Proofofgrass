// pages/api/wago-drops/admin/claims-all.js
import { wagoSecretOk } from "../../../../utils/wagoAdminAuth";
import { createClient } from "@supabase/supabase-js";
import { rewardSymbol } from "../../../../utils/wagoReward";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isAdmin(req) {
  const secret = req.headers["x-wago-admin-secret"];
  return wagoSecretOk(secret, req);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("wago_drop_claims")
    .select(`id, wallet_address, google_id, location_id,
             reward_type, reward_amount, reward_token_mint,
             proof_bonus_applied, proof_bonus_amount,
             tx_signature, status, claimed_at,
             wago_drop_campaigns ( name, reward_symbol, reward_token_mint )`)
    .order("claimed_at", { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });

  // Proof bonus status per claim (wago_drop_proofs: photo_approved | awarded | expired)
  const ids = (data || []).map(r => r.id);
  const proofByClaim = {};
  if (ids.length) {
    const { data: proofs } = await supabase
      .from("wago_drop_proofs")
      .select("claim_id, status, tickets_awarded, pog_username, x_post_url")
      .in("claim_id", ids);
    (proofs || []).forEach(p => { proofByClaim[p.claim_id] = p; });
  }

  const claims = (data || []).map(row => ({
    location_id:         row.location_id,
    proof_status:        proofByClaim[row.id]?.status ?? null,
    tickets_awarded:     proofByClaim[row.id]?.tickets_awarded ?? null,
    proof_username:      proofByClaim[row.id]?.pog_username ?? null,
    x_post_url:          proofByClaim[row.id]?.x_post_url ?? null,
    id:                  row.id,
    wallet_address:      row.wallet_address,
    google_id:           row.google_id,
    campaign_name:       row.wago_drop_campaigns?.name ?? "–",
    reward_type:         row.reward_type,
    reward_amount:       row.reward_amount,
    reward_symbol:       rewardSymbol({ reward_type: row.reward_type, reward_symbol: row.wago_drop_campaigns?.reward_symbol, reward_token_mint: row.reward_token_mint || row.wago_drop_campaigns?.reward_token_mint }),
    proof_bonus_applied: row.proof_bonus_applied,
    proof_bonus_amount:  row.proof_bonus_amount,
    tx_signature:        row.tx_signature,
    status:              row.status,
    claimed_at:          row.claimed_at,
  }));

  return res.status(200).json({ claims });
}