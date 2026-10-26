// GET ?username= — everything the Yard landing and challenges pages need. All of it is already public data
// (challenges are shown on profiles and share links), so no sign-in is needed to read.
import { settled1v1 } from "../../../utils/yardSettledCache";
import { adminClient } from "../../../utils/requireOwner";
import { tally, rankPlayers, normName } from "../../../utils/yardStats";
import { loadAvatars } from "../../../utils/yardData";

const WEEK = 7 * 864e5;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const me = normName(req.query.username);
  try {
    const [{ count: active }, { data: settled }] = await Promise.all([
      db.from("Challenges").select("id", { count: "exact", head: true }).eq("status", "active").gt("ends_at", new Date().toISOString()),
      settled1v1(db),
    ]);
    const map = tally(settled || []);
    const ranked = rankPlayers(map, "wins");
    // Real-data-only extras. If the stats function isn't there (or errors) these stay null and the UI omits them.
    const ys = await db.rpc("yard_stats");
    const extra = ys.error || !ys.data ? { grovesCompeting: null, proofsThisWeek: null } : { grovesCompeting: ys.data.groves_competing, proofsThisWeek: ys.data.proofs_week };
    const out = { stats: { activeChallenges: active ?? 0, settledChallenges: (settled || []).length, players: ranked.length, ...extra }, you: null };
    if (!me) return res.status(200).json(out);

    const { data: mine } = await db.from("Challenges").select("*")
      .or(`challenger.eq.${me},challenged.eq.${me}`).order("created_at", { ascending: false }).limit(150);
    let rows = mine || [];

    // Lazily settle this player's finished challenges (idempotent, computed server-side from real proofs).
    const due = rows.filter((c) => c.status === "active" && c.ends_at && new Date(c.ends_at) <= new Date()).slice(0, 20);
    if (due.length) {
      await Promise.all(due.map((c) => db.rpc("yard_settle_challenge", { p_id: c.id })));
      const { data: again } = await db.from("Challenges").select("*").in("id", rows.map((c) => c.id)).order("created_at", { ascending: false });
      if (again) rows = again;
    }

    const names = [...new Set(rows.map((c) => (normName(c.challenger) === me ? normName(c.challenged) : normName(c.challenger))))];
    const av = await loadAvatars(db, names);
    const shape = async (c) => {
      const opp = normName(c.challenger) === me ? normName(c.challenged) : normName(c.challenger);
      const o = { ...c, challenger: normName(c.challenger), challenged: normName(c.challenged), opponent: opp, opponent_avatar: av[opp] || null, you_challenged: normName(c.challenger) === me };
      if (c.status === "active" && c.started_at && c.ends_at) {
        const to = new Date(Math.min(Date.now(), new Date(c.ends_at).getTime())).toISOString();
        const [a, b] = await Promise.all([
          db.rpc("yard_challenge_days", { p_user: c.challenger, p_from: c.started_at, p_to: to }),
          db.rpc("yard_challenge_days", { p_user: c.challenged, p_from: c.started_at, p_to: to }),
        ]);
        o.challenger_days = a.data ?? 0; o.challenged_days = b.data ?? 0;
      }
      return o;
    };
    const fresh = (c) => Date.now() - new Date(c.created_at).getTime() < WEEK;
    const pending = rows.filter((c) => c.status === "pending" && fresh(c));
    const activeRows = rows.filter((c) => c.status === "active");
    const history = rows.filter((c) => !(c.status === "pending" && fresh(c)) && c.status !== "active").slice(0, 40);
    const rec = map[me] || { wins: 0, losses: 0, ties: 0, noFinish: 0, completed: 0, winRate: 0 };
    const idx = ranked.findIndex((p) => p.username === me);
    out.you = {
      username: me,
      record: rec,
      rank: idx >= 0 ? idx + 1 : null,
      incoming: await Promise.all(pending.filter((c) => normName(c.challenged) === me).map(shape)),
      outgoing: await Promise.all(pending.filter((c) => normName(c.challenger) === me).map(shape)),
      active: await Promise.all(activeRows.slice(0, 30).map(shape)),
      history: await Promise.all(history.map(shape)),
    };
    return res.status(200).json(out);
  } catch (e) {
    console.error("[yard/overview]", e);
    return res.status(500).json({ error: "Could not load The Yard." });
  }
}
