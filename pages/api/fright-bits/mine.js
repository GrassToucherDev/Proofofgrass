// GET /api/fright-bits/mine?username=… — a profile's collectibles (public: owners are already shown on the gallery).
import { adminClient } from "../../../utils/wheel";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const username = String(req.query.username || "").replace(/^@/, "").toLowerCase().trim();
  if (!/^[a-z0-9_.-]{1,40}$/.test(username)) return res.status(200).json({ items: [] });
  const db = adminClient();
  const { data: c } = await db.from("username_claims").select("google_id").eq("username", username).maybeSingle();
  if (!c?.google_id) return res.status(200).json({ items: [] });
  const { data } = await db.rpc("fright_bits_for_user", { p_google: c.google_id });
  return res.status(200).json({ items: data || [] });
}
