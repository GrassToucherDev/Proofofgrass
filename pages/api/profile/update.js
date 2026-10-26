// POST { username, field, value }  Fields a profile owner may change from the app. Nothing else is writable here:
// score, streak, wallet, verified flags and unlocks are never accepted from the browser.
import { requireOwner, adminClient } from "../../../utils/requireOwner";
import { getCoverBySlug } from "../../../utils/coverDefinitions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.username);
  if (!who) return;
  const { field, value } = req.body || {};
  const db = adminClient();
  let patch;

  if (field === "bio") {
    patch = { bio: String(value ?? "").slice(0, 280) };
  } else if (field === "active_cover_id") {
    const slug = String(value ?? "");
    const cover = getCoverBySlug(slug);
    if (!cover) return res.status(400).json({ error: "Unknown cover." });
    const { data: prof } = await db.from("Profiles").select("unlocked_covers").ilike("username", who.username).maybeSingle();
    const owned = Array.isArray(prof?.unlocked_covers) && prof.unlocked_covers.includes(slug);
    let earned = false;
    if (!owned && !cover.marketplaceOnly && Number.isFinite(cover.unlockDay)) {
      const { data: st } = await db.from("Streaks").select("best_streak,current_streak").ilike("username", who.username).maybeSingle();
      earned = Math.max(st?.best_streak ?? 0, st?.current_streak ?? 0) >= cover.unlockDay;
    }
    if (!owned && !earned) return res.status(403).json({ error: "You haven't unlocked that cover." });
    patch = { active_cover_id: slug };
  } else if (field === "double_burn_selected_tier") {
    const tier = String(value ?? "").slice(0, 40);
    if (!/^[a-z0-9_-]+$/i.test(tier)) return res.status(400).json({ error: "Invalid tier." });
    patch = { double_burn_selected_tier: tier };
  } else {
    return res.status(400).json({ error: "That field can't be changed here." });
  }

  const { error } = await db.from("Profiles").upsert({ username: who.username, ...patch }, { onConflict: "username" });
  if (error) return res.status(500).json({ error: "Could not save." });
  return res.status(200).json({ ok: true });
}
