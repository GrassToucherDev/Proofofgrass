// Admin: list / create / update wheels. Protected by x-admin-secret.
import { isAdminRequest } from "../../../../utils/adminApi";
import { adminClient } from "../../../../utils/wheel";

const num = (v) => (v === "" || v == null ? null : Number(v));
const txt = (v, n) => (v == null || String(v).trim() === "" ? null : String(v).trim().slice(0, n));

function clean(b, partial) {
  const o = {};
  const set = (k, v) => { if (!partial || b[k] !== undefined) o[k] = v; };
  set("slug", txt(b.slug, 60)); set("name", txt(b.name, 80)); set("description", txt(b.description, 500)); set("hero_image", txt(b.hero_image, 500));
  set("status", b.status); set("visibility", b.visibility); set("starts_at", b.starts_at || null); set("ends_at", b.ends_at || null);
  set("price_mode", b.price_mode); set("price_usd", num(b.price_usd)); set("price_tokens", num(b.price_tokens));
  set("lock_pct", b.lock_pct == null ? undefined : Number(b.lock_pct)); set("eco_pct", b.eco_pct == null ? undefined : Number(b.eco_pct));
  set("lock_days", num(b.lock_days)); set("meter_enabled", b.meter_enabled === undefined ? undefined : !!b.meter_enabled);
  set("meter_spins", b.meter_spins == null ? undefined : Number(b.meter_spins)); set("meter_min_rarity", b.meter_min_rarity);
  Object.keys(o).forEach(k => o[k] === undefined && delete o[k]);
  return o;
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();

  if (req.method === "GET") {
    const { data: wheels, error } = await db.from("wheels").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const out = [];
    for (const w of wheels) {
      const [{ data: prizes }, { data: stats }, { data: playable }] = await Promise.all([
        db.from("wheel_prizes").select("*").eq("wheel_id", w.id).order("sort_order").order("created_at"),
        db.rpc("wheel_stats", { p_wheel: w.id }), db.rpc("wheel_is_playable", { p_wheel: w.id }),
      ]);
      out.push({ ...w, prizes: prizes || [], stats, playable: !!playable });
    }
    return res.status(200).json({ wheels: out });
  }

  if (req.method === "POST") {
    const o = clean(req.body || {}, false);
    if (o.eco_pct == null && o.lock_pct != null) o.eco_pct = 100 - o.lock_pct;
    o.status = "draft";                       // a new wheel never starts live; add prizes first, then activate
    if (o.featured) delete o.featured;
    const { data, error } = await db.from("wheels").insert(o).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ wheel: data });
  }

  if (req.method === "PATCH") {
    const { id, featured } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const o = clean(req.body, true);
    if (o.lock_pct != null && o.eco_pct == null) o.eco_pct = 100 - o.lock_pct;
    if (o.status === "active") {
      const { data: ok } = await db.rpc("wheel_is_playable", { p_wheel: id });
      if (!ok) return res.status(400).json({ error: "Add at least one active, unlimited-stock prize (not a cosmetic pack) before activating, so a paid spin can never come up empty." });
    }
    if (featured === true) await db.from("wheels").update({ featured: false }).eq("featured", true);
    if (featured !== undefined) o.featured = !!featured;
    const { data, error } = await db.from("wheels").update(o).eq("id", id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ wheel: data });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
