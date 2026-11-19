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
  // Screen Toucher holders unlock the trading desk in the garden; a failed lookup just hides it.
  try {
    const names = (data?.members || []).map((m) => m.username).filter(Boolean);
    if (names.length) {
      const { data: rows } = await adminClient().from("Profiles").select("username,has_screen_toucher").in("username", names);
      const st = new Set((rows || []).filter((r) => r.has_screen_toucher).map((r) => String(r.username).toLowerCase()));
      data.members = data.members.map((m) => ({ ...m, has_screen_toucher: st.has(String(m.username).toLowerCase()) }));
    }
  } catch (e) { console.error("[groves/me] screen_toucher", e); }
  return res.status(200).json(data);
}
