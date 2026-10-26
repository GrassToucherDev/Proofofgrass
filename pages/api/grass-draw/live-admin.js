// Admin: schedule / start / reset / archive the live reveal. Auth: x-admin-secret.
// The live show only REVEALS winners already drawn with execute-draw; it never picks anyone.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/requireOwner";
import { revealOrder } from "../../../utils/grassDrawLive";

const UUID = /^[0-9a-f-]{36}$/i;
const clampInt = (v, lo, hi, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();

  if (req.method === "GET") {
    const [{ data: shows }, { data: cycles }] = await Promise.all([
      db.from("grass_draw_live_shows").select("*").order("created_at", { ascending: false }).limit(10),
      db.from("grass_draw_cycles").select("*").order("starts_at", { ascending: false }).limit(12),
    ]);
    const counts = {};
    for (const c of cycles || []) {
      const { count } = await db.from("grass_draw_winners").select("id", { count: "exact", head: true }).eq("cycle_id", c.id).eq("voided", false);
      counts[c.id] = count || 0;
    }
    return res.status(200).json({ shows: shows || [], cycles: (cycles || []).map((c) => ({ id: c.id, name: c.name || c.title || null, status: c.status, starts_at: c.starts_at, ends_at: c.ends_at, winners: counts[c.id] || 0 })) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const b = req.body || {};
  if (b.action === "create") {
    const cycleId = String(b.cycle_id || "");
    if (!cycleId) return res.status(400).json({ error: "Pick a cycle." });
    const title = String(b.title || "Grass Draw").trim().slice(0, 80) || "Grass Draw";
    const when = b.scheduled_at ? new Date(b.scheduled_at) : null;
    if (when && isNaN(when)) return res.status(400).json({ error: "Bad date." });
    await db.from("grass_draw_live_shows").update({ status: "archived" }).neq("status", "archived");
    const { data, error } = await db.from("grass_draw_live_shows").insert([{ cycle_id: cycleId, title, scheduled_at: when ? when.toISOString() : null }]).select("*").single();
    if (error) { console.error("[live-admin] create", error); return res.status(500).json({ error: "Could not create the show." }); }
    return res.status(200).json({ ok: true, show: data });
  }

  if (!UUID.test(String(b.show_id || ""))) return res.status(400).json({ error: "show_id required." });
  const { data: show } = await db.from("grass_draw_live_shows").select("*").eq("id", b.show_id).maybeSingle();
  if (!show) return res.status(404).json({ error: "Show not found." });

  if (b.action === "start") {
    const { data: winners } = await db.from("grass_draw_winners").select("id, username, reward_type, metadata").eq("cycle_id", show.cycle_id).eq("voided", false);
    if (!winners?.length) return res.status(400).json({ error: "No winners drawn for this cycle yet. Run the draw first." });
    const lead = clampInt(b.lead_seconds, 5, 600, 15);
    const started = new Date(Date.now() + lead * 1000).toISOString();
    const { error } = await db.from("grass_draw_live_shows").update({
      status: "live", started_at: started, reveal_order: revealOrder(winners),
      intro_seconds: clampInt(b.intro_seconds, 3, 60, show.intro_seconds), step_seconds: clampInt(b.step_seconds, 2, 30, show.step_seconds),
    }).eq("id", show.id);
    if (error) return res.status(500).json({ error: "Could not start." });
    return res.status(200).json({ ok: true, started_at: started, winners: winners.length });
  }
  if (b.action === "reset") {
    await db.from("grass_draw_live_shows").update({ status: "scheduled", started_at: null, reveal_order: [] }).eq("id", show.id);
    return res.status(200).json({ ok: true });
  }
  if (b.action === "archive") {
    await db.from("grass_draw_live_shows").update({ status: "archived" }).eq("id", show.id);
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: "Unknown action." });
}
