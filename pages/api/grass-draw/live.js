// GET /api/grass-draw/live — the current live reveal, as the public may see it RIGHT NOW.
// Winners are only included once their reveal time has passed, so nobody can read ahead.
import crypto from "crypto";
import { adminClient } from "../../../utils/requireOwner";
import { showPhase, prizeLabel } from "../../../utils/grassDrawLive";
import { loadAvatars } from "../../../utils/yardData";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "public, s-maxage=1, stale-while-revalidate=2");
  const db = adminClient();
  const now = Date.now();
  try {
    const { data: show } = await db.from("grass_draw_live_shows").select("*").neq("status", "archived").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!show) return res.status(200).json({ server_now: now, phase: "none" });

    let order = Array.isArray(show.reveal_order) ? show.reveal_order : [];
    let winners = [];
    if (order.length) {
      const { data } = await db.from("grass_draw_winners").select("id, username, reward_type, reward_reference, reward_value, active_entries_at_draw, metadata, voided").in("id", order);
      const byId = Object.fromEntries((data || []).filter((w) => !w.voided).map((w) => [w.id, w]));
      winners = order.map((id) => byId[id]).filter(Boolean);
    }
    const st = showPhase(show, winners.length, now);

    const shown = winners.slice(0, st.revealed || 0);
    const av = shown.length ? await loadAvatars(db, shown.map((w) => String(w.username).toLowerCase())) : {};
    const out = shown.map((w, i) => ({
      n: i + 1, username: w.username, avatar_url: av[String(w.username).toLowerCase()] || null,
      prize: prizeLabel(w), prize_type: w.reward_type,
      entries: Number(w.active_entries_at_draw) || null,
      chance_pct: w.metadata?.total_weight ? Math.round((Number(w.active_entries_at_draw) / Number(w.metadata.total_weight)) * 1000) / 10 : null,
    }));

    // Names for the pre-reveal animation: a stable sample of the pool (not just winners).
    let pool = [];
    if (["scheduled", "countdown", "intro"].includes(st.phase)) {
      const { data: t } = await db.from("grass_draw_user_totals").select("username").eq("cycle_id", show.cycle_id).eq("eligible", true).eq("disqualified", false).gt("total_active_entries", 0).limit(400);
      pool = (t || []).map((r) => String(r.username).toLowerCase())
        .map((u) => [crypto.createHash("sha1").update(show.id + u).digest("hex"), u]).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, 60).map((x) => x[1]);
    }

    return res.status(200).json({
      server_now: now, id: show.id, title: show.title, scheduled_at: show.scheduled_at, started_at: show.started_at,
      ...st, total: winners.length, step_seconds: show.step_seconds, winners: out, pool,
    });
  } catch (e) {
    console.error("[grass-draw/live]", e);
    return res.status(500).json({ error: "Could not load the live draw." });
  }
}
