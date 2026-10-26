// GET ?username= — the viewer's Grove and its Grove vs Grove challenges. Public data; buttons are enforced server-side in SQL.
import { settledGroves } from "../../../../utils/yardSettledCache";
import { adminClient } from "../../../../utils/requireOwner";
import { normName, tally } from "../../../../utils/yardStats";
import { loadGroves, shapeGroveChallenges, WEEK_MS } from "../../../../utils/yardGroves";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const me = normName(req.query.username);
  try {
    const [{ count: active }, { data: settled }] = await Promise.all([
      db.from("grove_challenges").select("id", { count: "exact", head: true }).eq("status", "active").gt("ends_at", new Date().toISOString()),
      settledGroves(db),
    ]);
    const out = { stats: { activeChallenges: active ?? 0, settledChallenges: (settled || []).length }, grove: null };
    if (!me) return res.status(200).json(out);

    const { data: mem } = await db.from("grove_members").select("grove_id").ilike("username", me.replace(/[%_\\]/g, (c) => "\\" + c)).is("left_at", null).limit(1);
    const gid = mem?.[0]?.grove_id;
    if (!gid) return res.status(200).json(out);
    const g = (await loadGroves(db, [gid]))[gid];
    if (!g) return res.status(200).json(out);

    const { data: rows } = await db.from("grove_challenges").select("*")
      .or(`challenger_grove.eq.${gid},challenged_grove.eq.${gid}`).order("created_at", { ascending: false }).limit(100);
    const all = await shapeGroveChallenges(db, rows || [], gid);
    const fresh = (c) => Date.now() - new Date(c.created_at).getTime() < WEEK_MS;
    const pending = all.filter((c) => c.status === "pending" && fresh(c));
    const rec = tally((settled || []).map((r) => ({ challenger: r.challenger_grove, challenged: r.challenged_grove, winner: r.winner_grove, result: r.result })))[gid]
      || { wins: 0, losses: 0, ties: 0, noFinish: 0, completed: 0, winRate: 0 };
    out.grove = {
      id: g.id, name: g.name, banner: g.banner, size: g.size, is_owner: g.owner === me, can_compete: g.size >= 3, owner: g.owner,
      record: rec,
      incoming: pending.filter((c) => !c.you_challenged),
      outgoing: pending.filter((c) => c.you_challenged),
      active: all.filter((c) => c.status === "active"),
      history: all.filter((c) => c.status !== "active" && !(c.status === "pending" && fresh(c))).slice(0, 40),
    };
    return res.status(200).json(out);
  } catch (e) {
    console.error("[yard/groves/overview]", e);
    return res.status(500).json({ error: "Could not load Grove challenges." });
  }
}
