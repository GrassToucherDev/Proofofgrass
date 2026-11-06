// POST { as, to } — nudge a grove-mate who hasn't logged today. One per person per day, 8 a day total.
import { requireOwner, adminClient, cleanUsername } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.as);
  if (!who) return;
  const to = cleanUsername(req.body?.to);
  if (!to || to === who.username) return res.status(400).json({ error: "Pick a grove-mate to nudge.", code: "bad_target" });
  const db = adminClient();
  const { data, error } = await db.rpc("grove_get", { p_username: who.username });
  if (error || !data?.grove) return res.status(403).json({ error: "You're not in a Grove.", code: "not_in_grove" });
  const target = (data.members || []).find((m) => cleanUsername(m.username) === to);
  if (!target) return res.status(403).json({ error: "That person isn't in your Grove.", code: "not_grove_mates" });
  if (target.locked_today) return res.status(409).json({ error: "They already posted today.", code: "already_logged" });
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await db.from("grove_nudges").select("id", { count: "exact", head: true }).eq("from_user", who.username).eq("day", today);
  if ((count ?? 0) >= 8) return res.status(429).json({ error: "That's enough nudges for today.", code: "rate_limited" });
  const { error: ie } = await db.from("grove_nudges").insert({ grove_id: data.grove.id, from_user: who.username, to_user: to, day: today });
  if (ie && ie.code !== "23505") { console.error("[groves/nudge]", ie.message); return res.status(500).json({ error: /does not exist|schema cache/i.test(ie.message) ? "Nudges aren't switched on yet (database setup pending)." : "Could not send the nudge." }); }
  return res.status(200).json({ ok: true });
}
