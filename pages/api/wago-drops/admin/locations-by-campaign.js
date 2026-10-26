// pages/api/wago-drops/admin/locations-by-campaign.js
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

  const { campaignId } = req.query;
  if (!campaignId) return res.status(400).json({ error: "campaignId required" });

  const { data, error } = await supabase
    .from("wago_drop_locations")
    .select("id, lat, lng, hint, max_claims, claim_count, is_active, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ locations: data || [] });
}
