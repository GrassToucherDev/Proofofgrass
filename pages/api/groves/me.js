// GET ?username= — the caller's grove. Requires the signed-in account to own the username.
import { requireOwner, adminClient } from "../../../utils/requireOwner";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.query.username);
  if (!who) return;
  const { data, error } = await adminClient().rpc("grove_get", { p_username: who.username });
  if (error) { console.error("[groves/me]", error); return res.status(500).json({ error: "Could not load grove." }); }
  // Perfect days are a bonus layer; if this lookup fails the grove still loads without it.
  try {
    if (data?.grove?.id) {
      const { data: perfect } = await adminClient().rpc("grove_perfect", { p_grove: data.grove.id });
      if (perfect) data.perfect = perfect;
    }
  } catch (e) { console.error("[groves/me] perfect", e); }
  return res.status(200).json(data);
}
