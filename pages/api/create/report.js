// POST { as, id } — report a creation. REPORT_HIDE_AT different reporters hide it from the gallery automatically.
import { adminClient, requireOwner } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.as);
  if (!who) return;
  const id = String(req.body?.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Bad request." });
  const db = adminClient();
  const { data: c } = await db.from("community_creations").select("username").eq("id", id).maybeSingle();
  if (!c) return res.status(404).json({ error: "That creation is gone." });
  if (c.username === who.username) return res.status(400).json({ error: "You can't report your own creation.", code: "self" });
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await db.from("community_creation_reports").select("creation_id", { count: "exact", head: true }).eq("reporter", who.username).gte("created_at", dayAgo);
  if ((count ?? 0) >= 20) return res.status(429).json({ error: "Too many reports today.", code: "rate_limited" });
  const { error } = await db.from("community_creation_reports").insert({ creation_id: id, reporter: who.username });
  if (error && error.code !== "23505") return res.status(500).json({ error: "Could not send the report." });
  return res.status(200).json({ ok: true });
}
