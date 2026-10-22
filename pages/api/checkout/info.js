// Public read of one checkout, so the wallet step can run in a different browser than the one that started it
// (and the starting browser can poll for completion). The id is an unguessable uuid. Reveals only what the buyer sees.
import { adminClient } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const m = /^([mb])_([0-9a-f-]{36})$/i.exec(String(req.query.id || ""));
  if (!m) return res.status(400).json({ error: "Bad checkout link." });
  const db = adminClient();
  if (m[1].toLowerCase() === "m") {
    const { data: c } = await db.from("marketplace_checkouts").select("*").eq("id", m[2]).maybeSingle();
    if (!c) return res.status(404).json({ error: "Checkout not found." });
    const { MARKET_ITEM_NAMES } = await import("../../../utils/marketplaceCatalog");
    const expired = c.status === "pending" && Date.now() - new Date(c.created_at).getTime() > 30 * 60 * 1000;
    return res.status(200).json({ kind: "item", status: expired ? "expired" : c.status, username: c.username, itemId: c.item_id, itemName: MARKET_ITEM_NAMES[c.item_id] || c.item_id, usdPrice: Number(c.price_usd) });
  }
  const { data: p } = await db.from("grove_banner_purchases").select("*").eq("id", m[2]).maybeSingle();
  if (!p) return res.status(404).json({ error: "Checkout not found." });
  const [{ data: g }, { data: b }] = await Promise.all([
    db.from("groves").select("name").eq("id", p.grove_id).maybeSingle(),
    db.from("grove_banners").select("name").eq("id", p.banner_id).maybeSingle(),
  ]);
  const expired = p.status === "pending" && new Date(p.expires_at).getTime() < Date.now();
  return res.status(200).json({ kind: "banner", status: expired ? "expired" : p.status, username: p.buyer, groveName: g?.name || "your Grove", bannerName: b?.name || p.banner_id, usdPrice: Number(p.price_usd) });
}
