// Admin: Fright Bits status and controls. Uses the same x-admin-secret as the Wheel admin. Nothing here touches money.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/wheel";

const SLUG = "fright-bits";

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  if (req.method === "GET") {
    const { data: col } = await db.from("collectible_collections").select("*").eq("slug", SLUG).maybeSingle();
    if (!col) return res.status(200).json({ collection: null });
    const [{ data: items }, { data: owners }, { data: events }] = await Promise.all([
      db.from("collectibles").select("id, number, slug, name, character, status, reserve_order, claimed_at, prize_id, wheel_prizes:prize_id(weight, segment, active, available_until)").eq("collection_id", col.id).order("number"),
      db.from("collectible_ownership").select("collectible_id, username, acquired_at, spin_id"),
      db.from("collectible_events").select("id, kind, detail, created_at, collectible_id").eq("collection_id", col.id).order("id", { ascending: false }).limit(50),
    ]);
    const own = Object.fromEntries((owners || []).map(o => [o.collectible_id, o]));
    return res.status(200).json({ collection: col, items: (items || []).map(i => ({ ...i, owner: own[i.id] || null })), events: events || [] });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { action, open, reveal_mode, max_active, reserve_order, segments, weight, odds_mode } = req.body || {};
  let r;
  switch (action) {
    case "start":  r = await db.rpc("fright_bits_start", { p_slug: SLUG }); break;
    case "pause":  r = await db.rpc("fright_bits_pause", { p_slug: SLUG }); break;
    case "end":    r = await db.rpc("fright_bits_end", { p_slug: SLUG }); break;
    case "legal_gate": r = await db.rpc("fright_bits_set_legal_gate", { p_slug: SLUG, p_open: open === true }); break;
    case "configure":
      r = await db.rpc("fright_bits_configure", { p_slug: SLUG, p_reveal_mode: reveal_mode ?? null,
        p_max_active: max_active == null ? null : parseInt(max_active),
        p_reserve_order: Array.isArray(reserve_order) ? reserve_order.map(String) : null,
        p_segments: Array.isArray(segments) ? segments.map(n => parseInt(n)) : null, p_odds_mode: odds_mode ?? null });
      break;
    case "weight": {     // odds knob: weight applies to every character; the Wheel's own pool is untouched
      const w = Number(weight); if (!(w > 0)) return res.status(400).json({ error: "Weight must be above 0." });
      const { data: col } = await db.from("collectible_collections").select("id").eq("slug", SLUG).single();
      const { data: ks } = await db.from("collectibles").select("prize_id").eq("collection_id", col.id).in("status", ["reserve", "active"]);
      const { error } = await db.from("wheel_prizes").update({ weight: w }).in("id", (ks || []).map(k => k.prize_id));
      return error ? res.status(400).json({ error: error.message }) : res.status(200).json({ ok: true });
    }
    default: return res.status(400).json({ error: "Unknown action." });
  }
  if (r.error) return res.status(400).json({ error: r.error.message });
  if (r.data && r.data.ok === false) return res.status(400).json({ error: r.data.error });
  return res.status(200).json(r.data || { ok: true });
}
