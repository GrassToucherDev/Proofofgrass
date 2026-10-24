// GET /api/wheel/result?checkoutId=w_… — the stored result of a spin (for refreshes and the phone handoff).
import { adminClient, publicSpin } from "../../../utils/wheel";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const id = String(req.query.checkoutId || "").replace(/^w_/, "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Bad link." });
  const db = adminClient();
  const { data: i } = await db.from("wheel_intents").select("status, spin_id").eq("id", id).maybeSingle();
  if (!i) return res.status(404).json({ error: "Spin not found." });
  if (!i.spin_id) return res.status(200).json({ status: i.status, spin: null });
  const { data: s } = await db.from("wheel_spins").select("*").eq("id", i.spin_id).single();
  return res.status(200).json({ status: "completed", spin: publicSpin(s) });
}
