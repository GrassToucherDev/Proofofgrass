// POST { username } — removes the X link. Only the Google account that secured the username can do this.
import { requireOwner, adminClient } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.username);
  if (!who) return;
  const { error } = await adminClient().from("x_links").delete().eq("username", who.username);
  if (error) { console.error("[x/unlink]", error.code); return res.status(500).json({ error: "Could not unlink." }); }
  return res.status(200).json({ ok: true });
}
