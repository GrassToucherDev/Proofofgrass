// GET /api/wheel/recent — the latest settled spins (public: username, prize name/type/rarity, time). No wallets, ids or payment data.
import { adminClient } from "../../../utils/wheel";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { data, error } = await adminClient()
    .from("wheel_spins")
    .select("username, rarity, prize_snapshot, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return res.status(200).json({ spins: [] });
  const spins = (data || []).map(s => ({
    username: s.username,
    rarity: s.rarity,
    name: s.prize_snapshot?.name || "Prize",
    reward_type: s.prize_snapshot?.reward_type || "manual",
    image_url: s.prize_snapshot?.image_url || null,
    at: s.created_at,
  }));
  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
  return res.status(200).json({ spins });
}
