// pages/api/wago-drops/admin/update-location.js
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
  if (!["POST", "DELETE"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id required" });

  if (req.method === "DELETE") {
    const { error } = await supabase.from("wago_drop_locations").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // POST = update
  const { lat, lng, hint, max_claims, is_active } = req.body;
  const updates = {};
  if (lat !== undefined) updates.lat = Number(lat);
  if (lng !== undefined) updates.lng = Number(lng);
  if (hint !== undefined) updates.hint = hint || null;
  if (max_claims !== undefined) updates.max_claims = max_claims ? Number(max_claims) : null;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from("wago_drop_locations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ location: data });
}
