// GET ?username= — the caller's grove. Requires the signed-in account to own the username.
import { requireOwner, adminClient } from "../../../utils/requireOwner";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.query.username);
  if (!who) return;
  const { data, error } = await adminClient().rpc("grove_get", { p_username: who.username });
  if (error) { console.error("[groves/me]", error); return res.status(500).json({ error: "Could not load grove." }); }
  return res.status(200).json(data);
}
