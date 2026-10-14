// pages/api/wago-drops/campaigns.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("wago_drop_campaigns")
    .select("id, name, description, image_url, reward_type, reward_amount, starts_at, ends_at, proof_bonus_enabled")
    .eq("status", "active")
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaigns: data || [] });
}