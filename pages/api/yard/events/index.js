// GET ?username= — published seasonal events (live first, then upcoming, then past) with entrant counts and whether the viewer is in.
import { adminClient } from "../../../../utils/requireOwner";
import { publicEvent, entrantCounts, viewerGrove } from "../../../../utils/yardEvents";
import { normName } from "../../../../utils/yardStats";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const { data, error } = await db.from("yard_events").select("*").eq("status", "published").order("starts_at", { ascending: false }).limit(60);
  if (error) { console.error("[yard/events]", error); return res.status(500).json({ error: "Could not load events." }); }
  const rows = data || [];
  const counts = await entrantCounts(db, rows.map((e) => e.id));
  const me = normName(req.query.username);
  let mine = new Set();
  if (me && rows.length) {
    const gid = await viewerGrove(db, me);
    const { data: ent } = await db.from("yard_event_entries").select("event_id, username, grove_id").in("event_id", rows.map((e) => e.id));
    (ent || []).forEach((r) => { if ((r.grove_id === null && r.username === me) || (gid && r.grove_id === gid)) mine.add(r.event_id); });
  }
  const order = { live: 0, upcoming: 1, ended: 2 };
  const events = rows.map((e) => ({ ...publicEvent(e, counts[e.id] || 0), entered: mine.has(e.id) }))
    .sort((a, b) => order[a.phase] - order[b.phase] || (a.phase === "upcoming" ? new Date(a.starts_at) - new Date(b.starts_at) : new Date(b.starts_at) - new Date(a.starts_at)));
  return res.status(200).json({ events });
}
