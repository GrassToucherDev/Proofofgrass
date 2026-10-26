// GET ?username= — a player's public Yard record for their profile: 1v1 W-L-T and rank, their Grove's record, event entries.
// Everything comes from server-settled results; nothing here can be written by a client.
import { settled1v1, settledGroves } from "../../../utils/yardSettledCache";
import { adminClient } from "../../../utils/requireOwner";
import { tally, rankPlayers, normName } from "../../../utils/yardStats";
import { viewerGrove } from "../../../utils/yardEvents";
import { loadGroves } from "../../../utils/yardGroves";

const ZERO = { wins: 0, losses: 0, ties: 0, noFinish: 0, completed: 0, winRate: 0 };

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const me = normName(req.query.username);
  if (!me || me.length > 40) return res.status(400).json({ error: "Missing username." });
  const db = adminClient();
  try {
    const nowIso = new Date().toISOString();
    const [{ data: settled }, { count: active }, gid, { data: evEntries }] = await Promise.all([
      settled1v1(db),
      db.from("Challenges").select("id", { count: "exact", head: true }).eq("status", "active").gt("ends_at", nowIso)
        .or(`challenger.eq.${me},challenged.eq.${me}`),
      viewerGrove(db, me),
      db.from("yard_event_entries").select("event_id").eq("username", me).is("grove_id", null),
    ]);
    const map = tally(settled || []);
    const ranked = rankPlayers(map, "wins");
    const idx = ranked.findIndex((p) => p.username === me);
    const one = { record: map[me] || ZERO, rank: idx >= 0 ? idx + 1 : null, active: active ?? 0 };

    let grove = null;
    if (gid) {
      const [info, { data: gs }, { count: gActive }] = await Promise.all([
        loadGroves(db, [gid]),
        settledGroves(db),
        db.from("grove_challenges").select("id", { count: "exact", head: true }).eq("status", "active").gt("ends_at", nowIso)
          .or(`challenger_grove.eq.${gid},challenged_grove.eq.${gid}`),
      ]);
      const g = info[gid];
      if (g) {
        const rec = tally((gs || []).map((r) => ({ challenger: r.challenger_grove, challenged: r.challenged_grove, winner: r.winner_grove, result: r.result })))[gid] || ZERO;
        grove = { id: gid, name: g.name, size: g.size, record: rec, active: gActive ?? 0 };
      }
    }

    let events = { entered: 0, live: 0 };
    const ids = (evEntries || []).map((e) => e.event_id);
    if (ids.length) {
      const { data: evs } = await db.from("yard_events").select("id, starts_at, ends_at").in("id", ids).eq("status", "published");
      events = { entered: (evs || []).length, live: (evs || []).filter((e) => new Date(e.starts_at) <= new Date() && new Date(e.ends_at) >= new Date()).length };
    }
    const hasAny = one.record.completed > 0 || one.active > 0 || events.entered > 0 || (grove && (grove.record.completed > 0 || grove.active > 0));
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({ username: me, hasAny: !!hasAny, onevone: one, grove, events });
  } catch (e) {
    console.error("[yard/record]", e);
    return res.status(500).json({ error: "Could not load the Yard record." });
  }
}
