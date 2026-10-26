// pages/api/wago-drops/admin/create-campaign.js
import { validateReward } from "../../../../utils/wagoPayout.mjs";
import { wagoSecretOk } from "../../../../utils/wagoAdminAuth";
import { createClient } from "@supabase/supabase-js";
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

  const {
    name, description, image_url, reward_symbol, reward_logo_url,
    reward_type, reward_amount, reward_token_mint, reward_metadata,
    proof_bonus_enabled, proof_bonus_amount,
    rarity, proof_bonus_tickets,
    reveal_radius_m, claim_radius_m,
    starts_at, ends_at,
    _adminSecret,
    ...rest
  } = req.body;

  if (!name) return res.status(400).json({ error: "name is required" });
  if (!reward_type) return res.status(400).json({ error: "reward_type is required" });
  const rv = validateReward({ reward_type, reward_amount, reward_token_mint, reward_symbol }, process.env);
  if (!rv.ok) return res.status(400).json({ error: rv.error });

  const { data, error } = await supabase
    .from("wago_drop_campaigns")
    .insert({
      name,
      description:         description || null,
      image_url:           image_url || null,
      reward_symbol:       rv.reward.reward_symbol,
      reward_logo_url:     reward_logo_url || null,
      reward_type:         rv.reward.reward_type,
      reward_amount:       rv.reward.reward_amount,
      reward_token_mint:   rv.reward.reward_token_mint,
      reward_metadata:     reward_metadata || {},
      proof_bonus_enabled: !!proof_bonus_enabled,
      proof_bonus_amount:  proof_bonus_amount ? Number(proof_bonus_amount) : null,
      rarity:              RARITIES.includes(String(rarity||"").toLowerCase()) ? String(rarity).toLowerCase() : "common",
      proof_bonus_tickets: Number(proof_bonus_tickets) > 0 ? Math.floor(Number(proof_bonus_tickets)) : null,
      reveal_radius_m:     Number(reveal_radius_m) || 100,
      claim_radius_m:      Number(claim_radius_m) || 25,
      starts_at:           starts_at || null,
      ends_at:             ends_at || null,
      status:              "draft",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ campaign: data });
}