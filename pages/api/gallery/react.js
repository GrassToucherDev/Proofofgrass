// POST { as, username, day, kind: "leaf"|"fire", on: boolean } — add or remove your reaction on someone's proof.
// Reactions never change Grass Score. A proof reaching 5 or 10 reactions posts a 0-point ticker event.
import { adminClient, requireOwner, cleanUsername } from "../../../utils/requireOwner";

const KINDS = ["leaf", "fire"], DAILY_LIMIT = 120, MILESTONES = [5, 10];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.as);
  if (!who) return;
  const username = cleanUsername(req.body?.username), day = String(req.body?.day || "").slice(0, 10), kind = req.body?.kind, on = !!req.body?.on;
  if (!username || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !KINDS.includes(kind)) return res.status(400).json({ error: "Bad request." });
  if (username === who.username) return res.status(400).json({ error: "You can't react to your own proof.", code: "self" });
  const db = adminClient();
  const row = { reactor: who.username, username, day, kind };

  if (!on) {
    const { error } = await db.from("gallery_reactions").delete().match(row);
    if (error) return res.status(500).json({ error: "Could not save that." });
  } else {
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const { count } = await db.from("gallery_reactions").select("id", { count: "exact", head: true }).eq("reactor", who.username).gte("created_at", dayAgo);
    if ((count ?? 0) >= DAILY_LIMIT) return res.status(429).json({ error: "That's a lot of reactions for one day.", code: "rate_limited" });
    const { error } = await db.from("gallery_reactions").insert(row);
    if (error && error.code !== "23505") { console.error("[gallery/react]", error.message); return res.status(500).json({ error: /does not exist|schema cache/i.test(error.message) ? "Reactions aren't switched on yet (database setup pending)." : "Could not save that." }); }
  }

  const { data: all } = await db.from("gallery_reactions").select("kind").eq("username", username).eq("day", day);
  const counts = { leaf: 0, fire: 0 };
  (all || []).forEach((r) => { counts[r.kind] = (counts[r.kind] || 0) + 1; });
  const total = counts.leaf + counts.fire;
  if (on && MILESTONES.includes(total)) { // ticker event, once per proof per milestone
    try {
      const type = `proof_loved_${total}`, since = new Date(Date.parse(day + "T00:00:00Z")).toISOString();
      const { data: dup } = await db.from("ScoreEvents").select("id").eq("username", username).eq("event_type", type).gte("created_at", since).limit(1);
      if (!dup?.length) await db.from("ScoreEvents").insert({ username, event_type: type, points: 0, metadata: { day } });
    } catch (e) { console.warn("[gallery/react] ticker event skipped:", e?.message); }
  }
  return res.status(200).json({ ok: true, counts });
}
