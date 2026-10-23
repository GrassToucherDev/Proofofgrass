// Admin: GET lists every event (drafts included). POST creates (no id) or updates (id) one. Auth: x-admin-secret.
// There is no delete: set status to "cancelled" (hidden from the public list) or back to "draft".
import { isAdminRequest } from "../../../../utils/adminApi";
import { adminClient } from "../../../../utils/requireOwner";
import { entrantCounts, phaseOf } from "../../../../utils/yardEvents";

const clip = (v, n) => { const s = String(v ?? "").trim(); return s ? s.slice(0, n) : null; };
const DAY = 864e5;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  if (req.method === "GET") {
    const { data, error } = await db.from("yard_events").select("*").order("starts_at", { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: "Could not load events." });
    const counts = await entrantCounts(db, (data || []).map((e) => e.id));
    return res.status(200).json({ events: (data || []).map((e) => ({ ...e, entrants: counts[e.id] || 0, phase: phaseOf(e) })) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};
  const row = {};
  if (b.slug !== undefined) { if (!/^[a-z0-9-]{3,60}$/.test(String(b.slug))) return res.status(400).json({ error: "Slug: 3-60 characters, lowercase letters, numbers and dashes." }); row.slug = b.slug; }
  if (b.title !== undefined) { const t = clip(b.title, 80); if (!t || t.length < 3) return res.status(400).json({ error: "Title must be 3-80 characters." }); row.title = t; }
  if (b.event_type !== undefined) { if (!["individual", "grove"].includes(b.event_type)) return res.status(400).json({ error: "Type must be individual or grove." }); row.event_type = b.event_type; }
  if (b.status !== undefined) { if (!["draft", "published", "cancelled"].includes(b.status)) return res.status(400).json({ error: "Bad status." }); row.status = b.status; }
  if (b.description !== undefined) row.description = clip(b.description, 1000);
  if (b.reward_text !== undefined) row.reward_text = clip(b.reward_text, 200);
  if (b.eligibility_text !== undefined) row.eligibility_text = clip(b.eligibility_text, 200);
  if (b.image_path !== undefined) {
    const p = clip(b.image_path, 200);
    if (p && (!p.startsWith("/") || p.startsWith("//") || p.includes("..") || /[\s<>"']/.test(p))) return res.status(400).json({ error: "Image must be a path inside the site, like /yard/events/fall.webp." });
    row.image_path = p;
  }
  for (const k of ["starts_at", "ends_at"]) if (b[k] !== undefined) { const d = new Date(b[k]); if (isNaN(d)) return res.status(400).json({ error: `Bad ${k}.` }); row[k] = d.toISOString(); }

  if (!b.id) {
    for (const k of ["slug", "title", "event_type", "starts_at", "ends_at"]) if (!row[k]) return res.status(400).json({ error: `Missing ${k}.` });
    if (new Date(row.ends_at) <= new Date(row.starts_at)) return res.status(400).json({ error: "End must be after start." });
    if (new Date(row.ends_at) - new Date(row.starts_at) > 120 * DAY) return res.status(400).json({ error: "Events can run at most 120 days." });
    const { data, error } = await db.from("yard_events").insert([{ status: "draft", ...row }]).select("*").single();
    if (error) return res.status(error.code === "23505" ? 409 : 500).json({ error: error.code === "23505" ? "That slug is already used." : "Could not create the event." });
    return res.status(200).json({ ok: true, event: data });
  }
  const { data: cur } = await db.from("yard_events").select("*").eq("id", b.id).maybeSingle();
  if (!cur) return res.status(404).json({ error: "Event not found." });
  const entrants = (await entrantCounts(db, [cur.id]))[cur.id] || 0;
  if (entrants && ((row.event_type && row.event_type !== cur.event_type) || (row.starts_at && row.starts_at !== new Date(cur.starts_at).toISOString())))
    return res.status(400).json({ error: "Type and start date can't change once people have entered." });
  const s = new Date(row.starts_at || cur.starts_at), e = new Date(row.ends_at || cur.ends_at);
  if (e <= s) return res.status(400).json({ error: "End must be after start." });
  if (e - s > 120 * DAY) return res.status(400).json({ error: "Events can run at most 120 days." });
  if (!Object.keys(row).length) return res.status(400).json({ error: "Nothing to update." });
  const { data, error } = await db.from("yard_events").update(row).eq("id", b.id).select("*").single();
  if (error) return res.status(error.code === "23505" ? 409 : 500).json({ error: error.code === "23505" ? "That slug is already used." : "Could not update the event." });
  return res.status(200).json({ ok: true, event: data });
}
