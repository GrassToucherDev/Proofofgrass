// GET /api/grass-draw/wins?username=  — a person's PUBLIC Grass Draw wins, for the share card.
// Only wins that are already public are returned: cycles marked "drawn", or winners the live show has
// already revealed. Nothing is returned before its reveal, so this can't be used to read ahead.
import { adminClient, cleanUsername } from "../../../utils/requireOwner";
import { showPhase, prizeLabel } from "../../../utils/grassDrawLive";
import { loadAvatars } from "../../../utils/yardData";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=10");
  const username = cleanUsername(req.query.username);
  if (!username) return res.status(400).json({ error: "Missing username." });
  const db = adminClient();
  try {
    const { data: mine } = await db.from("grass_draw_winners")
      .select("id, cycle_id, username, reward_type, reward_reference, reward_value, active_entries_at_draw, metadata, voided, created_at")
      .ilike("username", username).eq("voided", false).order("created_at", { ascending: false });
    if (!mine?.length) return res.status(200).json({ username, wins: [] });

    const cycleIds = [...new Set(mine.map((w) => w.cycle_id))];
    const { data: cycles } = await db.from("grass_draw_cycles").select("id, name, status").in("id", cycleIds);
    const cyc = Object.fromEntries((cycles || []).map((c) => [c.id, c]));

    // Winners the live show has revealed so far (same rule as /api/grass-draw/live).
    let revealed = new Set();
    const { data: show } = await db.from("grass_draw_live_shows").select("*").neq("status", "archived").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (show && Array.isArray(show.reveal_order) && show.reveal_order.length) {
      const { data: ws } = await db.from("grass_draw_winners").select("id, voided").in("id", show.reveal_order);
      const live = show.reveal_order.filter((id) => (ws || []).some((w) => w.id === id && !w.voided));
      const st = showPhase(show, live.length, Date.now());
      const k = st.phase === "done" ? live.length : st.revealed || 0;
      revealed = new Set(live.slice(0, k));
    }

    const visible = mine.filter((w) => cyc[w.cycle_id]?.status === "drawn" || revealed.has(w.id));
    const av = await loadAvatars(db, [username]);
    return res.status(200).json({
      username, avatar_url: av[username] || null,
      wins: visible.map((w) => ({
        id: w.id, cycle_name: cyc[w.cycle_id]?.name || "Grass Draw",
        prize: prizeLabel(w), prize_type: w.reward_type,
        entries: Number(w.active_entries_at_draw) || null,
        chance_pct: w.metadata?.total_weight ? Math.round((Number(w.active_entries_at_draw) / Number(w.metadata.total_weight)) * 1000) / 10 : null,
        drawn_at: w.metadata?.draw_timestamp || w.created_at,
      })),
    });
  } catch (e) {
    console.error("[grass-draw/wins]", e);
    return res.status(500).json({ error: "Could not load wins." });
  }
}
