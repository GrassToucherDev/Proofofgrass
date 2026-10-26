// GET /api/wheel/history — the signed-in user's own spins.
import { adminClient, sessionIdentity, publicSpin, totalSpins } from "../../../utils/wheel";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { googleId } = await sessionIdentity(req, res);
  if (!googleId) return res.status(401).json({ error: "Sign in to see your wins.", code: "not_signed_in" });
  const { data, error } = await adminClient().from("wheel_spins").select("*").eq("google_id", googleId).order("created_at", { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: "Couldn't load your wins." });
  // Finish any automatic prize still pending/failed (safe to repeat), then reload those rows.
  const stuck = (data || []).filter(s => ["pending", "failed"].includes(s.fulfillment_status) && ["cosmetic_pack", "shield", "sunset_pass", "grass_tickets"].includes(s.prize_snapshot?.reward_type)).slice(0, 5);
  if (stuck.length) {
    const db = adminClient();
    for (const s of stuck) await db.rpc("wheel_fulfill", { p_spin: s.id });
    const { data: again } = await db.from("wheel_spins").select("*").in("id", stuck.map(s => s.id));
    for (const f of again || []) { const k = data.findIndex(x => x.id === f.id); if (k >= 0) data[k] = f; }
  }
  const total_spins = await totalSpins(adminClient(), googleId);
  return res.status(200).json({ total_spins, spins: (data || []).map(s => ({ ...publicSpin(s), payment_tx: s.payment_tx, fulfillment_tx: s.fulfillment_tx })) });
}
