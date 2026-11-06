// POST { as, username, day, reason } — a signed-in person reports someone's proof photo.
// 3 different reporters hide the proof from the feed automatically (see /api/gallery); you can review them in Supabase.
import { adminClient, requireOwner, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.as);
  if (!who) return;
  const username = cleanUsername(req.body?.username), day = String(req.body?.day || "").slice(0, 10);
  const reason = String(req.body?.reason || "").slice(0, 200) || null;
  if (!username || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: "Bad request." });
  if (username === who.username) return res.status(400).json({ error: "You can't report your own proof.", code: "self" });
  const db = adminClient();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await db.from("gallery_reports").select("id", { count: "exact", head: true }).eq("reporter", who.username).gte("created_at", dayAgo);
  if ((count ?? 0) >= 20) return res.status(429).json({ error: "Too many reports today.", code: "rate_limited" });
  const { error } = await db.from("gallery_reports").insert({ reporter: who.username, username, day, reason });
  if (error && error.code !== "23505") { console.error("[gallery/report]", error.message); return res.status(500).json({ error: "Could not send the report." }); }
  return res.status(200).json({ ok: true });
}
