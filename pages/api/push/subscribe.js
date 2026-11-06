// POST { as, subscription: {endpoint, keys:{p256dh, auth}}, on } -> save (on) or remove (off) this device's reminder subscription.
import { adminClient, requireOwner } from "../../../utils/requireOwner";

const MAX_DEVICES = 5;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.as);
  if (!who) return;
  const sub = req.body?.subscription, on = req.body?.on !== false;
  const endpoint = String(sub?.endpoint || ""), p256dh = String(sub?.keys?.p256dh || ""), auth = String(sub?.keys?.auth || "");
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) return res.status(400).json({ error: "Bad subscription." });
  const db = adminClient();
  if (!on) {
    await db.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("username", who.username);
    return res.status(200).json({ ok: true, on: false });
  }
  if (!p256dh || !auth) return res.status(400).json({ error: "Bad subscription." });
  const { data: mine, error: le } = await db.from("push_subscriptions").select("id,endpoint,created_at").eq("username", who.username).order("created_at", { ascending: true });
  if (le) return res.status(500).json({ error: /does not exist|schema cache/i.test(le.message) ? "Reminders aren't switched on yet (database setup pending)." : "Could not save that." });
  const others = (mine || []).filter((r) => r.endpoint !== endpoint);
  if (others.length >= MAX_DEVICES) await db.from("push_subscriptions").delete().eq("id", others[0].id); // drop the oldest device
  const { error } = await db.from("push_subscriptions").upsert(
    { username: who.username, endpoint, p256dh, auth, user_agent: String(req.headers["user-agent"] || "").slice(0, 200) },
    { onConflict: "endpoint" });
  if (error) return res.status(500).json({ error: "Could not save that." });
  return res.status(200).json({ ok: true, on: true });
}
