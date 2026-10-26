// Referral bookkeeping, server-side. The browser can only ASK; every number comes from real rows:
//   register: the referred username must already have a streak, differ from the referrer, and not be referred yet.
//   convert:  the referred user's own streak and proof count are read here, not taken from the request.
// Counts on the referrer's profile are recomputed from the Referrals table, never incremented from the client.
import { adminClient, cleanUsername } from "../../utils/requireOwner";

const BADGES = [[100, "touchgrass-ambassador"], [50, "founding-ambassador"], [25, "movement-builder"], [10, "community-grower"], [5, "grass-recruiter"], [1, "community-builder"]];

async function recount(db, referrer) {
  const [{ count: pending }, { count: done }] = await Promise.all([
    db.from("Referrals").select("id", { count: "exact", head: true }).eq("referrer_username", referrer).eq("status", "pending"),
    db.from("Referrals").select("id", { count: "exact", head: true }).eq("referrer_username", referrer).eq("status", "converted"),
  ]);
  const badge = (BADGES.find(([n]) => (done ?? 0) >= n) || [])[1] || null;
  const patch = { referral_count_pending: pending ?? 0, referral_count_successful: done ?? 0 };
  if (badge) patch.referral_badge = badge;
  await db.from("Profiles").update(patch).eq("username", referrer);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const action = req.body?.action;
  const referred = cleanUsername(req.body?.referred);
  if (!referred) return res.status(400).json({ error: "Missing username." });

  if (action === "register") {
    const referrer = cleanUsername(req.body?.referrer);
    if (!referrer || referrer === referred) return res.status(200).json({ ok: true, skipped: true });
    const { data: mine } = await db.from("Streaks").select("username").ilike("username", referred).maybeSingle();
    if (!mine) return res.status(200).json({ ok: true, skipped: true });
    const { data: ref } = await db.from("Streaks").select("username").ilike("username", referrer).maybeSingle();
    if (!ref) return res.status(200).json({ ok: true, skipped: true });
    const { data: existing } = await db.from("Referrals").select("id").eq("referred_username", referred).maybeSingle();
    if (existing) return res.status(200).json({ ok: true, skipped: true });
    const src = typeof req.body?.source_url === "string" ? req.body.source_url.slice(0, 300) : null;
    const { error } = await db.from("Referrals").insert([{ referrer_username: referrer, referred_username: referred, status: "pending", source_url: src }]);
    if (error) return res.status(200).json({ ok: true, skipped: true });
    await recount(db, referrer);
    return res.status(200).json({ ok: true });
  }

  if (action === "convert") {
    const { data: pending } = await db.from("Referrals").select("id,referrer_username").eq("referred_username", referred).eq("status", "pending").maybeSingle();
    if (!pending) return res.status(200).json({ ok: true, converted: false });
    const { data: st } = await db.from("Streaks").select("current_streak,best_streak").ilike("username", referred).maybeSingle();
    if (Math.max(st?.current_streak ?? 0, st?.best_streak ?? 0) < 10) return res.status(200).json({ ok: true, converted: false });
    const { count } = await db.from("Submissions").select("id", { count: "exact", head: true }).ilike("username", referred).in("status", ["pending", "approved"]);
    if ((count ?? 0) < 7) return res.status(200).json({ ok: true, converted: false });
    await db.from("Referrals").update({ status: "converted", converted_at: new Date().toISOString(), referred_reached_day_10: true }).eq("id", pending.id).eq("status", "pending");
    await recount(db, pending.referrer_username);
    return res.status(200).json({ ok: true, converted: true });
  }
  return res.status(400).json({ error: "Unknown action." });
}
