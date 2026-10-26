// pages/api/wago-drops/admin/campaigns-all.js
import { wagoSecretOk } from "../../../../utils/wagoAdminAuth";
import { createClient } from "@supabase/supabase-js";

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
    .from("wago_drop_campaigns")
    .select("id, name, image_url, status, reward_type, reward_symbol, reward_logo_url, reward_token_mint, reward_amount, starts_at, ends_at, created_at, rarity, proof_bonus_enabled, proof_bonus_tickets")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const ids = (data || []).map(c => c.id);
  let locationCounts = {};
  if (ids.length) {
    const { data: locData } = await supabase
      .from("wago_drop_locations")
      .select("campaign_id")
      .in("campaign_id", ids);
    (locData || []).forEach(r => {
      locationCounts[r.campaign_id] = (locationCounts[r.campaign_id] || 0) + 1;
    });
  }

  const campaigns = (data || []).map(c => ({ ...c, location_count: locationCounts[c.id] || 0 }));
  return res.status(200).json({ campaigns });
}