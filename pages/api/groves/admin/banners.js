// Admin: GET lists the catalog; POST { id, price_usd, available } sets a banner's price / availability.
// price_usd = null makes a banner un-purchasable. Auth: x-admin-secret (same as the other admin routes).
import { isAdminRequest } from "../../../../utils/adminApi";
import { adminClient } from "../../../../utils/requireOwner";
export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  if (req.method === "GET") {
    const { data, error } = await db.from("grove_banners").select("*").order("sort_order");
    return error ? res.status(500).json({ error: "Could not load banners." }) : res.status(200).json({ banners: data });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { id, price_usd, available } = req.body || {};
  if (!/^[a-z0-9_]{1,40}$/.test(String(id || ""))) return res.status(400).json({ error: "Bad id." });
  const patch = {};
  if (price_usd !== undefined) {
    if (price_usd === null || price_usd === "") patch.price_usd = null;
    else { const p = Number(price_usd); if (!(p > 0) || p > 1000) return res.status(400).json({ error: "Price must be between 0 and 1000 USD." }); patch.price_usd = Math.round(p * 100) / 100; }
  }
  if (available !== undefined) patch.available = !!available;
  if (!Object.keys(patch).length) return res.status(400).json({ error: "Nothing to update." });
  const { data: row } = await db.from("grove_banners").select("is_default").eq("id", id).maybeSingle();
  if (!row) return res.status(404).json({ error: "Unknown banner." });
  if (row.is_default) return res.status(400).json({ error: "The default banner is always free." });
  const { error } = await db.from("grove_banners").update(patch).eq("id", id);
  return error ? res.status(500).json({ error: "Update failed." }) : res.status(200).json({ ok: true });
}
