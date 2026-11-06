// Daily streak reminder. Vercel cron (Authorization: Bearer $CRON_SECRET), or admin (x-admin-secret):
//   ?preview=1   counts who WOULD be reminded; sends nothing
//   ?test=<name> sends the real reminder to that one username's devices
// Reminds people with reminders on whose last post was yesterday (UTC day) and who haven't posted today.
import { timingSafeEqual } from "crypto";
import webpush from "web-push";
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

function isCron(req) {
  const secret = process.env.CRON_SECRET;
  const given = String(req.headers.authorization || "");
  if (!secret || !given.startsWith("Bearer ")) return false;
  const a = Buffer.from(given.slice(7)), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const admin = isAdminRequest(req);
  if (!admin && !isCron(req)) return res.status(401).json({ error: "Unauthorized" });
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return res.status(500).json({ error: "Push keys are not set." });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@proofofgrass.app", pub, priv);

  const db = adminClient();
  const test = admin ? cleanUsername(req.query.test) : "";
  const preview = admin && !!req.query.preview;
  const today = new Date().toISOString().slice(0, 10), yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);

  let q = db.from("push_subscriptions").select("id,username,endpoint,p256dh,auth").limit(5000);
  if (test) q = q.eq("username", test);
  const { data: subs, error } = await q;
  if (error) { console.error("[push/remind]", error.message); return res.status(500).json({ error: "Could not load subscriptions." }); }
  const names = [...new Set((subs || []).map((s) => s.username))];
  const streaks = {};
  if (names.length) {
    const st = await db.from("Streaks").select("username,current_streak,last_submission_date").in("username", names);
    (st.data || []).forEach((r) => { streaks[r.username] = r; });
  }
  let candidates = test ? names : names.filter((u) => String(streaks[u]?.last_submission_date || "").slice(0, 10) === yesterday && (streaks[u]?.current_streak || 0) >= 1);
  if (candidates.length && !test) { // belt and braces: skip anyone with a proof already logged today
    const done = await db.from("Submissions").select("username").in("username", candidates).in("status", ["pending", "approved"]).gte("created_at", today + "T00:00:00Z");
    const posted = new Set((done.data || []).map((r) => String(r.username).toLowerCase()));
    candidates = candidates.filter((u) => !posted.has(u));
  }
  const want = new Set(candidates);
  const targets = (subs || []).filter((s) => want.has(s.username));
  if (preview) return res.status(200).json({ preview: true, users: candidates.length, devices: targets.length, subscribedUsers: names.length });

  let sent = 0, gone = 0, failed = 0;
  const dead = [];
  const work = [...targets];
  const worker = async () => {
    while (work.length) {
      const s = work.pop(), n = streaks[s.username]?.current_streak || 0;
      const payload = JSON.stringify({
        title: n ? `Keep your ${n}-day streak alive` : "Time to touch grass",
        body: "Log today's proof before the day resets.", url: "/#upload", tag: "pog-daily",
      });
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 }); sent++; }
      catch (e) { if (e?.statusCode === 404 || e?.statusCode === 410) { gone++; dead.push(s.id); } else { failed++; console.warn("[push/remind]", e?.statusCode, e?.body?.slice?.(0, 120)); } }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  if (dead.length) await db.from("push_subscriptions").delete().in("id", dead);
  return res.status(200).json({ ok: true, users: candidates.length, sent, removed: gone, failed });
}
