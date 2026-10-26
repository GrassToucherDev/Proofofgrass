// pages/api/wago-drops/admin/update-campaign.js
import { wagoSecretOk } from "../../../../utils/wagoAdminAuth";
import { createClient } from "@supabase/supabase-js";
import { validateReward } from "../../../../utils/wagoPayout.mjs";
import { RARITIES } from "../../../../utils/wagoProofBonus";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isAdmin(req) {
  const secret = req.headers["x-wago-admin-secret"];
  return wagoSecretOk(secret, req);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { id, name, description, image_url, reward_type, reward_symbol, reward_logo_url, reward_amount, reward_token_mint,
          reveal_radius_m, claim_radius_m, starts_at, ends_at, status,
          proof_bonus_enabled, proof_bonus_amount,
          rarity, proof_bonus_tickets } = req.body;

  if (!id) return res.status(400).json({ error: "id required" });

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (image_url !== undefined) updates.image_url = image_url || null;
  if (reward_logo_url !== undefined) updates.reward_logo_url = reward_logo_url || null;
  if ([reward_type, reward_symbol, reward_amount, reward_token_mint].some(v => v !== undefined)) {
    const { data: cur, error: curErr } = await supabase.from("wago_drop_campaigns")
      .select("reward_type, reward_amount, reward_token_mint, reward_symbol").eq("id", id).single();
    if (curErr || !cur) return res.status(404).json({ error: "Campaign not found" });
    const rv = validateReward({
      reward_type:       reward_type       !== undefined ? reward_type       : cur.reward_type,
      reward_amount:     reward_amount     !== undefined ? reward_amount     : cur.reward_amount,
      reward_token_mint: reward_token_mint !== undefined ? reward_token_mint : cur.reward_token_mint,
      reward_symbol:     reward_symbol     !== undefined ? reward_symbol     : cur.reward_symbol,
    }, process.env);
    if (!rv.ok) return res.status(400).json({ error: rv.error });
    Object.assign(updates, rv.reward);
  }
  if (reveal_radius_m !== undefined) updates.reveal_radius_m = Number(reveal_radius_m);
  if (claim_radius_m !== undefined) updates.claim_radius_m = Number(claim_radius_m);
  if (starts_at !== undefined) updates.starts_at = starts_at || null;
  if (ends_at !== undefined) updates.ends_at = ends_at || null;
  if (status !== undefined) updates.status = status;
  if (proof_bonus_enabled !== undefined) updates.proof_bonus_enabled = proof_bonus_enabled;
  if (proof_bonus_amount !== undefined) updates.proof_bonus_amount = proof_bonus_amount || null;

  if (rarity !== undefined) {
    const r = String(rarity).toLowerCase();
    if (!RARITIES.includes(r)) return res.status(400).json({ error: "Invalid rarity" });
    updates.rarity = r;
  }
  if (proof_bonus_tickets !== undefined) {
    updates.proof_bonus_tickets = Number(proof_bonus_tickets) > 0 ? Math.floor(Number(proof_bonus_tickets)) : null;
  }

  const { data, error } = await supabase
    .from("wago_drop_campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaign: data });
}
