// pages/api/wago-drops/admin/update-campaign.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isAdmin(req) {
  const secret = req.headers["x-wago-admin-secret"] || req.body?._adminSecret;
  return secret === process.env.WAGO_ADMIN_SECRET;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { id, name, description, image_url, reward_amount, reward_token_mint,
          reveal_radius_m, claim_radius_m, starts_at, ends_at, status,
          proof_bonus_enabled, proof_bonus_amount } = req.body;

  if (!id) return res.status(400).json({ error: "id required" });

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (image_url !== undefined) updates.image_url = image_url;
  if (reward_amount !== undefined) updates.reward_amount = reward_amount;
  if (reward_token_mint !== undefined) updates.reward_token_mint = reward_token_mint;
  if (reveal_radius_m !== undefined) updates.reveal_radius_m = Number(reveal_radius_m);
  if (claim_radius_m !== undefined) updates.claim_radius_m = Number(claim_radius_m);
  if (starts_at !== undefined) updates.starts_at = starts_at || null;
  if (ends_at !== undefined) updates.ends_at = ends_at || null;
  if (status !== undefined) updates.status = status;
  if (proof_bonus_enabled !== undefined) updates.proof_bonus_enabled = proof_bonus_enabled;
  if (proof_bonus_amount !== undefined) updates.proof_bonus_amount = proof_bonus_amount || null;

  const { data, error } = await supabase
    .from("wago_drop_campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaign: data });
}
