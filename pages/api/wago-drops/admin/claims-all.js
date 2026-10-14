// pages/api/wago-drops/admin/claims-all.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isAdmin(req) {
  const secret = req.headers["x-wago-admin-secret"] || req.query._s;
  return secret === process.env.WAGO_ADMIN_SECRET;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("wago_drop_claims")
    .select(`id, wallet_address, google_id,
             reward_type, reward_amount,
             proof_bonus_applied, proof_bonus_amount,
             tx_signature, status, claimed_at,
             wago_drop_campaigns ( name )`)
    .order("claimed_at", { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });

  const claims = (data || []).map(row => ({
    id:                  row.id,
    wallet_address:      row.wallet_address,
    google_id:           row.google_id,
    campaign_name:       row.wago_drop_campaigns?.name ?? "–",
    reward_type:         row.reward_type,
    reward_amount:       row.reward_amount,
    proof_bonus_applied: row.proof_bonus_applied,
    proof_bonus_amount:  row.proof_bonus_amount,
    tx_signature:        row.tx_signature,
    status:              row.status,
    claimed_at:          row.claimed_at,
  }));

  return res.status(200).json({ claims });
}