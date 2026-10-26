// GET /api/badges?username= — public: a player's badges across every experience (counts turned into tiers).
import { adminClient } from "../../utils/wheel";
import { computeBadgeCounts } from "../../utils/badges/counts";
import { buildBadges } from "../../utils/badges/registry";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const username = String(req.query.username || "").replace(/^@/, "").trim();
  if (!username || username.length > 40 || /[^A-Za-z0-9 _.\-]/.test(username)) return res.status(400).json({ error: "Bad username." });
  const counts = await computeBadgeCounts(adminClient(), username);
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json({ badges: buildBadges(counts) });
}
