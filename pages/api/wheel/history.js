// GET /api/wheel/history — the signed-in user's own spins.
import { adminClient, sessionIdentity, publicSpin } from "../../../utils/wheel";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { googleId } = await sessionIdentity(req, res);
  if (!googleId) return res.status(401).json({ error: "Sign in to see your wins.", code: "not_signed_in" });
  const { data, error } = await adminClient().from("wheel_spins").select("*").eq("google_id", googleId).order("created_at", { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: "Couldn't load your wins." });
  return res.status(200).json({ spins: (data || []).map(s => ({ ...publicSpin(s), payment_tx: s.payment_tx, fulfillment_tx: s.fulfillment_tx })) });
}
