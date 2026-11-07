// Admin only (x-admin-secret). The automatic photo check's "Needs review" list.
//   GET                         -> { open: [...flagged, not yet reviewed], today: { checked, flagged, blocked } }
//   POST { action:"dismiss", id } -> marks one flag as looked at ("looks fine")
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/requireOwner";
import { BUCKET, isSafeProofUsername } from "../../../utils/proofAccess";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Not authorised." });
  const db = adminClient();
  if (req.method === "GET") {
    const { data, error } = await db.from("photo_checks").select("*").eq("verdict", "flag").eq("reviewed", false).order("created_at", { ascending: false }).limit(100);
    if (error) return res.status(200).json({ open: [], today: null, needsSql: true });
    const open = (data || []).map((r) => ({ ...r, url: isSafeProofUsername(r.username) ? db.storage.from(BUCKET).getPublicUrl(`${r.username}/${String(r.day).slice(0, 10)}.png`).data.publicUrl : null }));
    const day = new Date().toISOString().slice(0, 10), cnt = async (v) => (await db.from("photo_checks").select("id", { count: "exact", head: true }).eq("day", day).match(v ? { verdict: v } : {})).count ?? 0;
    return res.status(200).json({ open, today: { checked: await cnt(), flagged: await cnt("flag"), blocked: await cnt("blocked") } });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (req.body?.action === "dismiss") {
    const id = Number(req.body.id); if (!Number.isInteger(id)) return res.status(400).json({ error: "Bad id." });
    const { error } = await db.from("photo_checks").update({ reviewed: true }).eq("id", id);
    if (error) return res.status(500).json({ error: "Could not save." });
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: "Unknown action." });
}
