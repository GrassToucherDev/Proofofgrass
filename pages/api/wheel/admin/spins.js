// Admin: inspect spins and run operations (retry fulfillment, mark manual prizes sent, record lock batches).
import { isAdminRequest } from "../../../../utils/adminApi";
import { adminClient } from "../../../../utils/wheel";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const db = adminClient();

  if (req.method === "GET") {
    let q = db.from("wheel_spins").select("*").order("created_at", { ascending: false }).limit(Math.min(parseInt(req.query.limit) || 100, 500));
    if (req.query.fulfillment) q = q.eq("fulfillment_status", req.query.fulfillment);
    if (req.query.lock) q = q.eq("lock_status", req.query.lock);
    if (req.query.wheel) q = q.eq("wheel_id", req.query.wheel);
    if (req.query.username) q = q.eq("username", String(req.query.username).toLowerCase().replace(/^@/, ""));
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ spins: data });
  }

  if (req.method === "POST") {
    const { action, spinId, tx, note, spinIds } = req.body || {};
    if (action === "retry") {
      if (!UUID.test(String(spinId))) return res.status(400).json({ error: "spinId required" });
      const { data, error } = await db.rpc("wheel_fulfill", { p_spin: spinId });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(data?.ok ? 200 : 409).json(data);
    }
    if (action === "complete") {
      if (!UUID.test(String(spinId))) return res.status(400).json({ error: "spinId required" });
      if (!String(tx || note || "").trim()) return res.status(400).json({ error: "Add the transaction signature or a note." });
      const { data, error } = await db.rpc("wheel_manual_complete", { p_spin: spinId, p_tx: tx || null, p_note: note || null });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(data?.ok ? 200 : 409).json(data);
    }
    if (action === "lock-batch") {
      if (!String(tx || "").trim()) return res.status(400).json({ error: "Enter the lock transaction signature." });
      let ids = Array.isArray(spinIds) ? spinIds.filter(i => UUID.test(String(i))) : null;
      if (!ids) {                                   // default: every spin still queued to lock
        const { data } = await db.from("wheel_spins").select("id").eq("lock_status", "queued").limit(5000);
        ids = (data || []).map(r => r.id);
      }
      const { data, error } = await db.rpc("wheel_lock_batch_mark", { p_lock_tx: String(tx).trim(), p_spin_ids: ids, p_note: note || null });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(data?.ok ? 200 : 409).json(data);
    }
    return res.status(400).json({ error: "Unknown action." });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
