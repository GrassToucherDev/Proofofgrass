// Step 1 of an individual purchase. Requires the signed-in Google account that secured `username`.
// Returns a checkout id that the wallet step (possibly in Phantom's in-app browser, with no Google session) uses.
import { requireOwner, adminClient } from "../../../utils/requireOwner";
import { MARKET_PRICES_USD, MARKET_ITEM_NAMES } from "../../../utils/marketplaceCatalog";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const itemId = String(req.body?.itemId || "");
  const usd = MARKET_PRICES_USD[itemId];
  if (!usd) return res.status(400).json({ error: "Unknown item." });
  const who = await requireOwner(req, res, req.body?.username);
  if (!who) return;
  const db = adminClient();
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: open } = await db.from("marketplace_checkouts").select("id")
    .eq("username", who.username).eq("item_id", itemId).eq("status", "pending").gte("created_at", since)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  let id = open?.id;
  if (!id) {
    const { data, error } = await db.from("marketplace_checkouts").insert([{ username: who.username, item_id: itemId, price_usd: usd }]).select("id").single();
    if (error) { console.error("[marketplace/checkout]", error); return res.status(500).json({ error: "Couldn't start checkout." }); }
    id = data.id;
  }
  return res.status(200).json({ ok: true, checkoutId: `m_${id}`, itemId, itemName: MARKET_ITEM_NAMES[itemId], usdPrice: usd });
}
