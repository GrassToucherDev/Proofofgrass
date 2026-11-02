// Admin: grant, review and revoke free spins. Same x-admin-secret as the rest of the Wheel admin.
import { isAdminRequest } from "../../../../utils/adminApi";
import { adminClient } from "../../../../utils/wheel";

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();
  if (req.method === "GET") {
    const { data, error } = await db.from("wheel_free_spin_credits").select("username, batch, reason, granted_at, expires_at, used_at").order("granted_at", { ascending: false }).limit(400);
    if (error) return res.status(500).json({ error: error.message });
    const by = {};
    for (const c of data || []) {
      const k = `${c.batch}|${c.username}`;
      const r = by[k] || (by[k] = { batch: c.batch, username: c.username, reason: c.reason, granted_at: c.granted_at, expires_at: c.expires_at, total: 0, used: 0 });
      r.total++; if (c.used_at) r.used++;
    }
    return res.status(200).json({ grants: Object.values(by) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const b = req.body || {};
  if (b.action === "revoke") {
    const { data, error } = await db.rpc("wheel_free_spin_revoke", { p_batch: String(b.batch || "") });
    return error ? res.status(400).json({ error: error.message }) : res.status(200).json(data);
  }
  const usernames = (Array.isArray(b.usernames) ? b.usernames : String(b.usernames || "").split(/[\s,]+/)).map(s => String(s).trim()).filter(Boolean);
  const { data, error } = await db.rpc("wheel_free_spin_grant", {
    p_usernames: usernames, p_count: parseInt(b.count), p_expires: b.expires_at || null,
    p_batch: String(b.batch || ""), p_reason: b.reason ? String(b.reason).slice(0, 200) : null, p_by: "admin" });
  if (error) return res.status(400).json({ error: error.message });
  if (!data?.ok) return res.status(400).json({ error: data.error });
  return res.status(200).json(data);
}
