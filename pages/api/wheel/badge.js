// GET /api/wheel/badge?username= — a player's Wheel Spinner badge (public: just a spin count turned into a tier).
import { adminClient } from "../../../utils/wheel";
import { spinBadge } from "../../../utils/wheelBadges";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const username = String(req.query.username || "").replace(/^@/, "").toLowerCase().trim();
  if (!username || username.length > 40 || /[^a-z0-9 _.\-]/.test(username)) return res.status(400).json({ error: "Bad username." });
  const { count } = await adminClient().from("wheel_spins").select("id", { count: "exact", head: true }).eq("username", username);
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json({ badge: spinBadge(count || 0) });
}
