// POST { as, id, on } — like or unlike a creation. Can't like your own. Likes never change Grass Score.
import { adminClient, requireOwner } from "../../../utils/requireOwner";

const DAILY_LIMIT = 150;
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.as);
  if (!who) return;
  const id = String(req.body?.id || ""), on = !!req.body?.on;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Bad request." });
  const db = adminClient();
  const { data: c } = await db.from("community_creations").select("id,username,hidden").eq("id", id).maybeSingle();
  if (!c || c.hidden) return res.status(404).json({ error: "That creation is gone." });
  if (c.username === who.username) return res.status(400).json({ error: "You can't like your own creation.", code: "self" });
  if (!on) {
    const { error } = await db.from("community_creation_likes").delete().match({ creation_id: id, liker: who.username });
    if (error) return res.status(500).json({ error: "Could not save that." });
  } else {
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const { count } = await db.from("community_creation_likes").select("creation_id", { count: "exact", head: true }).eq("liker", who.username).gte("created_at", dayAgo);
    if ((count ?? 0) >= DAILY_LIMIT) return res.status(429).json({ error: "That's a lot of likes for one day.", code: "rate_limited" });
    const { error } = await db.from("community_creation_likes").insert({ creation_id: id, liker: who.username });
    if (error && error.code !== "23505") return res.status(500).json({ error: "Could not save that." });
  }
  const { count } = await db.from("community_creation_likes").select("creation_id", { count: "exact", head: true }).eq("creation_id", id);
  return res.status(200).json({ ok: true, likes: count ?? 0 });
}
