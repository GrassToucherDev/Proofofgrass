// Settlement runner.
//  - Vercel cron (Authorization: Bearer $CRON_SECRET): settles challenges that ended in the last 3 days and expires old invites.
//  - Admin (x-admin-secret):
//      ?preview=1  lists what settlement WOULD record for every past-due challenge (writes nothing)
//      ?all=1      settles EVERY past-due challenge (the one-time backfill; run it only after reviewing the preview)
import { timingSafeEqual } from "crypto";
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/requireOwner";

function isCron(req) {
  const secret = process.env.CRON_SECRET;
  const given = String(req.headers.authorization || "");
  if (!secret || !given.startsWith("Bearer ")) return false;
  const a = Buffer.from(given.slice(7)), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const admin = isAdminRequest(req);
  if (!admin && !isCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  if (admin && req.query.preview) {
    const { data, error } = await db.rpc("yard_preview_settlement");
    if (error) { console.error("[yard/settle] preview", error); return res.status(500).json({ error: "Preview failed." }); }
    const by = {}; (data || []).forEach(r => { by[r.result] = (by[r.result] || 0) + 1; });
    return res.status(200).json({ total: (data || []).length, by_result: by, rows: data });
  }
  const args = admin && req.query.all ? { p_since: "-infinity", p_limit: 1000 } : {};
  const { data, error } = await db.rpc("yard_settle_due", args);
  if (error) { console.error("[yard/settle]", error); return res.status(500).json({ error: "Settlement failed." }); }
  // Grove vs Grove runs in the same pass. A failure here must not hide the 1v1 result.
  const g = await db.rpc("yard_grove_settle_due", args);
  if (g.error) console.error("[yard/settle] groves", g.error);
  return res.status(200).json({ ok: true, ...data, ...(g.data || {}), ...(g.error ? { grove_error: true } : {}) });
}
