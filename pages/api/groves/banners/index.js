// GET ?username= — the banner collection for that user's Grove (needs the signed-in owner of the username).
// GET with no username — the bare public catalog (names, art, whether each is purchasable). No prices are invented:
// price_usd is null until configured, and such banners report purchasable:false.
import { requireOwner, adminClient } from "../../../../utils/requireOwner";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  let username = "";
  if (req.query.username) { const who = await requireOwner(req, res, req.query.username); if (!who) return; username = who.username; }
  const { data, error } = await adminClient().rpc("grove_banners_get", { p_username: username });
  if (error) { console.error("[groves/banners]", error); return res.status(500).json({ error: "Could not load banners." }); }
  return res.status(200).json(data);
}
