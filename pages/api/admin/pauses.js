// Admin only (x-admin-secret). Pause / resume accounts, look at someone's recent proofs, delete a proof photo.
//   GET                  -> { pauses: [...] }                      (newest first; "active" says whether it still applies)
//   GET ?username=<u>    -> { pause, proofs: [{day, url}] }        (that account's last 14 days of proofs)
//   POST { action:"pause", usernames:[...], reason, message, days }   days empty = until you resume
//   POST { action:"resume", username }
//   POST { action:"delete_photo", username, day:"YYYY-MM-DD" }    removes the stored photo for that day
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";
import { BUCKET, isSafeProofUsername } from "../../../utils/proofAccess";
import { pauseIsActive, DEFAULT_PAUSE_MESSAGE } from "../../../utils/pauses";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Not authorised." });
  const db = adminClient();

  if (req.method === "GET") {
    const u = cleanUsername(req.query.username);
    if (u) {
      const pr = await db.from("account_pauses").select("*").eq("username", u).maybeSingle();
      const since = new Date(Date.now() - 14 * 86400_000).toISOString();
      const { data: subs } = await db.from("Submissions").select("created_at,photo_url").ilike("username", u).gte("created_at", since).order("created_at", { ascending: false });
      const seen = new Set(), proofs = [];
      for (const s of subs || []) {
        const day = new Date(s.created_at).toISOString().slice(0, 10);
        if (seen.has(day)) continue; seen.add(day);
        proofs.push({ day, url: s.photo_url || db.storage.from(BUCKET).getPublicUrl(`${u}/${day}.png`).data.publicUrl });
      }
      return res.status(200).json({ username: u, pause: pr.error ? null : pr.data ? { ...pr.data, active: pauseIsActive(pr.data) } : null, proofs, needsSql: !!pr.error });
    }
    const { data, error } = await db.from("account_pauses").select("*").order("paused_at", { ascending: false }).limit(300);
    if (error) return res.status(200).json({ pauses: [], needsSql: true });
    return res.status(200).json({ pauses: (data || []).map((r) => ({ ...r, active: pauseIsActive(r) })) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};

  if (b.action === "pause") {
    const names = [...new Set((Array.isArray(b.usernames) ? b.usernames : []).map(cleanUsername).filter(Boolean))].slice(0, 50);
    if (!names.length) return res.status(400).json({ error: "Add at least one username." });
    const days = Number(b.days);
    const until = Number.isFinite(days) && days > 0 ? new Date(Date.now() + Math.min(days, 3650) * 86400_000).toISOString() : null;
    const rows = names.map((username) => ({
      username, reason: String(b.reason || "").trim().slice(0, 500) || null, message: String(b.message || "").trim().slice(0, 600) || DEFAULT_PAUSE_MESSAGE,
      paused_at: new Date().toISOString(), paused_until: until, resumed_at: null, paused_by: "admin",
    }));
    const { error } = await db.from("account_pauses").upsert(rows, { onConflict: "username" });
    if (error) { console.error("[admin/pauses]", error.message); return res.status(500).json({ error: "Could not save. Has the account_pauses SQL been run?", code: "needs_sql" }); }
    return res.status(200).json({ ok: true, paused: names, until });
  }
  if (b.action === "resume") {
    const u = cleanUsername(b.username);
    if (!u) return res.status(400).json({ error: "Missing username." });
    const { error } = await db.from("account_pauses").update({ resumed_at: new Date().toISOString() }).eq("username", u);
    if (error) return res.status(500).json({ error: "Could not resume." });
    return res.status(200).json({ ok: true, resumed: u });
  }
  if (b.action === "delete_photo") {
    const u = cleanUsername(b.username), day = String(b.day || "");
    if (!isSafeProofUsername(u) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: "Bad username or day." });
    const { error } = await db.storage.from(BUCKET).remove([`${u}/${day}.png`]);
    if (error) return res.status(500).json({ error: "Could not delete that photo." });
    return res.status(200).json({ ok: true, deleted: `${u}/${day}` });
  }
  return res.status(400).json({ error: "Unknown action." });
}
