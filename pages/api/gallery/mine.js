// GET ?username= — reaction totals on MY proofs for the last 3 UTC days (leaf / fire), for the home-page note. Owner only.
import { adminClient, requireOwner } from "../../../utils/requireOwner";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.query.username);
  if (!who) return;
  const since = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await adminClient().from("gallery_reactions").select("day,kind").eq("username", who.username).gte("day", since);
  if (error) return res.status(200).json({ days: [] }); // table not created yet: stay quiet
  const by = {};
  (data || []).forEach((r) => { const d = (by[r.day] ||= { day: r.day, leaf: 0, fire: 0 }); d[r.kind] = (d[r.kind] || 0) + 1; });
  return res.status(200).json({ days: Object.values(by).sort((a, b) => (a.day < b.day ? 1 : -1)), today: new Date().toISOString().slice(0, 10) });
}
