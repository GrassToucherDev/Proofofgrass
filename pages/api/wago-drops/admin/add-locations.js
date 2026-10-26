// pages/api/wago-drops/admin/add-locations.js
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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { campaignId, locations } = req.body;
  if (!campaignId) return res.status(400).json({ error: "campaignId required" });
  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ error: "locations array required" });
  }

  const { data: campaign } = await supabase
    .from("wago_drop_campaigns")
    .select("id")
    .eq("id", campaignId)
    .single();

  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  const rows = locations.map(loc => ({
    campaign_id: campaignId,
    lat:         Number(loc.lat),
    lng:         Number(loc.lng),
    hint:        loc.hint || null,
    max_claims:  loc.max_claims || null,
    is_active:   true,
  }));

  const { data, error } = await supabase
    .from("wago_drop_locations")
    .insert(rows)
    .select("id, lat, lng");

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ added: data.length, locations: data });
}