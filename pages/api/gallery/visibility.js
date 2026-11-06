// GET ?username= -> { hidden }   POST { username, hidden } — owner turns their proofs off/on in the community feed.
// Photos stay on the profile page either way; this only affects the gallery.
import { adminClient, requireOwner, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  const username = cleanUsername(req.method === "GET" ? req.query.username : req.body?.username);
  const who = await requireOwner(req, res, username);
  if (!who) return;
  const db = adminClient();
  if (req.method === "GET") {
    const { data, error } = await db.from("Profiles").select("feed_hidden").eq("username", who.username).maybeSingle();
    if (error) return res.status(200).json({ hidden: false, unavailable: true }); // column not added yet
    return res.status(200).json({ hidden: !!data?.feed_hidden });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const hidden = !!req.body?.hidden;
  const { error } = await db.from("Profiles").update({ feed_hidden: hidden }).eq("username", who.username);
  if (error) { console.error("[gallery/visibility]", error.message); return res.status(500).json({ error: "Could not save that setting.", code: "needs_sql" }); }
  return res.status(200).json({ ok: true, hidden });
}
