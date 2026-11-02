// Admin: recent bonus entries for a cycle (the public key can no longer read every column of grass_draw_entries).
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const cycleId = String(req.query.cycle_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(cycleId)) return res.status(400).json({ error: "cycle_id required" });
  const { data, error } = await adminClient().from("grass_draw_entries")
    .select("id, username, entry_type, weighted_amount, notes, admin_username, created_at")
    .eq("cycle_id", cycleId).in("entry_type", ["spotlight", "x_engagement", "manual"])
    .order("created_at", { ascending: false }).limit(30);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ entries: data || [] });
}
