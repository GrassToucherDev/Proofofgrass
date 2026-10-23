// Seasonal event helpers (server). Phase is derived from dates, never stored, so it can't go stale.
export const phaseOf = (ev, now = Date.now()) =>
  ev.status === "cancelled" ? "cancelled" : now < new Date(ev.starts_at).getTime() ? "upcoming" : now <= new Date(ev.ends_at).getTime() ? "live" : "ended";

export const FALLBACK_IMAGE = "/yard/seasonal-fallback.webp";

export function publicEvent(ev, entrants = 0) {
  return {
    id: ev.id, slug: ev.slug, title: ev.title, description: ev.description, event_type: ev.event_type,
    starts_at: ev.starts_at, ends_at: ev.ends_at, reward_text: ev.reward_text, eligibility_text: ev.eligibility_text,
    image: ev.image_path || FALLBACK_IMAGE, status: ev.status, phase: phaseOf(ev), entrants,
  };
}

export async function entrantCounts(db, ids) {
  if (!ids.length) return {};
  const { data } = await db.from("yard_event_entries").select("event_id").in("event_id", ids).limit(50000);
  const m = {}; (data || []).forEach((r) => { m[r.event_id] = (m[r.event_id] || 0) + 1; });
  return m;
}

// The viewer's Grove id (active membership) or null.
export async function viewerGrove(db, username) {
  const u = String(username || "").replace(/@/g, "").toLowerCase().trim();
  if (!u) return null;
  const { data } = await db.from("grove_members").select("grove_id").ilike("username", u.replace(/[%_\\]/g, (c) => "\\" + c)).is("left_at", null).limit(1);
  return data?.[0]?.grove_id || null;
}
