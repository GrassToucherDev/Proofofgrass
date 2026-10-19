// POST { username } with x-admin-secret — frees a squatted/lost claim.
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Unauthorized" });
  const username = cleanUsername(req.body?.username);
  if (!username) return res.status(400).json({ error: "Missing username." });
  const { error } = await adminClient().from("username_claims").delete().eq("username", username);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, released: username });
}
