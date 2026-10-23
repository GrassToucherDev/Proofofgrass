// GET ?username= — one event with live standings (top 25) and the viewer's own standing / eligibility.
import { adminClient } from "../../../../utils/requireOwner";
import { publicEvent, entrantCounts, viewerGrove } from "../../../../utils/yardEvents";
import { loadGroves } from "../../../../utils/yardGroves";
import { loadAvatars } from "../../../../utils/yardData";
import { normName } from "../../../../utils/yardStats";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const slug = String(req.query.slug || "").slice(0, 60);
  const { data: ev } = await db.from("yard_events").select("*").eq("slug", slug).neq("status", "draft").maybeSingle();
  if (!ev) return res.status(404).json({ error: "Event not found." });
  try {
    const me = normName(req.query.username);
    const [{ data: all }, counts, gid] = await Promise.all([
      db.rpc("yard_event_standings", { p_event: ev.id, p_limit: 1000 }),
      entrantCounts(db, [ev.id]),
      me ? viewerGrove(db, me) : null,
    ]);
    const standings = all || [];
    const top = standings.slice(0, 25);
    let rows;
    if (ev.event_type === "individual") {
      const av = await loadAvatars(db, top.map((r) => r.username));
      rows = top.map((r) => ({ ...r, avatar_url: av[r.username] || null }));
    } else {
      const info = await loadGroves(db, top.map((r) => r.grove_id));
      rows = top.map((r) => ({ ...r, name: info[r.grove_id]?.name || "Grove", banner: info[r.grove_id]?.banner || null, owner: info[r.grove_id]?.owner }));
    }
    const mineIdx = ev.event_type === "individual" ? standings.findIndex((r) => r.username === me) : (gid ? standings.findIndex((r) => r.grove_id === gid) : -1);
    let grove = null;
    if (ev.event_type === "grove" && gid) {
      const g = (await loadGroves(db, [gid]))[gid];
      if (g) grove = { id: g.id, name: g.name, size: g.size, is_owner: !!me && g.owner === me, can_compete: g.size >= 3 };
    }
    return res.status(200).json({
      event: publicEvent(ev, counts[ev.id] || 0),
      standings: rows,
      you: { entered: mineIdx >= 0, rank: mineIdx >= 0 ? standings[mineIdx].rank : null, days: mineIdx >= 0 ? standings[mineIdx].days : null, posts: mineIdx >= 0 ? standings[mineIdx].posts : null, grove },
    });
  } catch (e) {
    console.error("[yard/events/slug]", e);
    return res.status(500).json({ error: "Could not load the event." });
  }
}
