// pages/api/wago-drops/campaign/[id].js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id required" });

  const { data, error } = await supabase
    .from("wago_drop_campaigns")
    .select(`id, name, description, image_url, reward_type, reward_amount,
             reward_token_mint, proof_bonus_enabled, proof_bonus_amount,
             reveal_radius_m, claim_radius_m, starts_at, ends_at, status`)
    .eq("id", id)
    .single();

  if (error || !data) return res.status(404).json({ error: "Campaign not found" });
  return res.status(200).json({ campaign: data });
}