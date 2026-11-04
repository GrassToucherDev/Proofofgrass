// Admin: list a cycle's winners (the table isn't readable with the public key). Auth: x-admin-secret.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const id = String(req.query.cycle_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "cycle_id required" });
  const { data, error } = await adminClient().from("grass_draw_winners").select("*").eq("cycle_id", id).order("selected_at", { ascending: false });
  if (error) return res.status(500).json({ error: "Could not load winners." });
  return res.status(200).json({ winners: data || [] });
}
