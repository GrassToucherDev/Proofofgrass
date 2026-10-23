// GET ?slug= — one Grove challenge (share link target). Public.
import { adminClient } from "../../../../utils/requireOwner";
import { shapeGroveChallenges } from "../../../../utils/yardGroves";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const slug = String(req.query.slug || "").slice(0, 60);
  const db = adminClient();
  const { data } = await db.from("grove_challenges").select("*").eq("slug", slug).maybeSingle();
  if (!data) return res.status(404).json({ error: "Challenge not found." });
  const [c] = await shapeGroveChallenges(db, [data], null);
  return res.status(200).json({ challenge: c || null });
}
