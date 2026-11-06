// GET /api/gallery?scope=all|grove&username=<for grove>&before=<iso>&limit=24
// Proofs from the last 24 hours, newest first. Signed-out visitors get a small teaser (6 proofs, no paging).
// People who turned the feed off (Profiles.feed_hidden) and proofs reported by 3+ different people are left out.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient, requireOwner, cleanUsername } from "../../../utils/requireOwner";
import { BUCKET } from "../../../utils/proofAccess";
import { getV2Tier } from "../../../utils/v2Theme";

const TEASER = 6, WINDOW_MS = 24 * 3600_000, REPORT_HIDE_AT = 3;

// Proof of the Day: the most-reacted proof in the last 24 hours (3+ reactions needed; earliest wins a tie). Live, not stored.
async function pickFeatured(db, since, session) {
  const MIN = 3;
  const rx = await db.from("gallery_reactions").select("username,day,kind,reactor").gte("day", since.slice(0, 10));
  if (rx.error || !rx.data?.length) return null;
  const tally = {};
  rx.data.forEach((r) => { const k = r.username + "|" + String(r.day).slice(0, 10); (tally[k] ||= { u: r.username, day: String(r.day).slice(0, 10), leaf: 0, fire: 0, rs: [] })[r.kind]++; tally[k].rs.push([r.reactor, r.kind]); });
  const cands = Object.values(tally).filter((c) => c.leaf + c.fire >= MIN).sort((a, b) => b.leaf + b.fire - (a.leaf + a.fire)).slice(0, 8);
  let me = null;
  const c = await db.from("username_claims").select("username").eq("google_id", session.user.google_id).maybeSingle();
  if (c.data?.username) me = cleanUsername(c.data.username);
  for (const c of cands) {
    const u = cleanUsername(c.u);
    const { data: subs } = await db.from("Submissions").select("username,created_at,photo_url,location_city,location_region").ilike("username", u).in("status", ["pending", "approved"]).gte("created_at", since).order("created_at", { ascending: true });
    const s = (subs || []).find((x) => new Date(x.created_at).toISOString().slice(0, 10) === c.day);
    if (!s) continue;
    let prof = await db.from("Profiles").select("username,avatar_url,avatar_emoji,feed_hidden").eq("username", u).maybeSingle();
    if (prof.error) prof = await db.from("Profiles").select("username,avatar_url,avatar_emoji").eq("username", u).maybeSingle();
    if (prof.data?.feed_hidden) continue;
    const rp = await db.from("gallery_reports").select("reporter").eq("username", u).eq("day", c.day);
    if (!rp.error && new Set((rp.data || []).map((r) => r.reporter)).size >= REPORT_HIDE_AT) continue;
    const st = await db.from("Streaks").select("current_streak").eq("username", u).maybeSingle();
    const streak = st.data?.current_streak || 1, t = getV2Tier(streak), mine = {};
    if (me) c.rs.forEach(([who, kind]) => { if (who === me) mine[kind] = true; });
    return {
      username: u, day: c.day, created_at: s.created_at, streak, tier: { name: t.name, color: t.color },
      photo: s.photo_url || db.storage.from(BUCKET).getPublicUrl(`${u}/${c.day}.png`).data.publicUrl,
      place: [s.location_city, s.location_region].filter(Boolean).join(", ") || null,
      avatar_url: prof.data?.avatar_url || null, avatar_emoji: prof.data?.avatar_emoji || null,
      reactions: { leaf: c.leaf, fire: c.fire }, mine,
    };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const session = await getServerSession(req, res, authOptions);
  const signedIn = !!session?.user?.google_id;
  const scope = req.query.scope === "grove" ? "grove" : "all";
  let limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 36);
  let before = typeof req.query.before === "string" ? req.query.before : null;
  if (!signedIn) { limit = TEASER; before = null; }
  if (before && Number.isNaN(Date.parse(before))) before = null;

  let allowed = null; // grove member usernames
  if (scope === "grove") {
    const who = await requireOwner(req, res, req.query.username);
    if (!who) return;
    const { data: me } = await db.from("grove_members").select("grove_id").ilike("username", who.username).is("left_at", null).maybeSingle();
    if (!me) return res.status(200).json({ items: [], next: null, signedIn, noGrove: true });
    const { data: mates } = await db.from("grove_members").select("username").eq("grove_id", me.grove_id).is("left_at", null);
    allowed = (mates || []).map((m) => cleanUsername(m.username));
  }

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  let q = db.from("Submissions").select("username,created_at,photo_url,location_city,location_region,status")
    .in("status", ["pending", "approved"]).gte("created_at", since).order("created_at", { ascending: false }).limit(limit * 3);
  if (before) q = q.lt("created_at", before);
  if (allowed) q = q.in("username", allowed);
  const { data: subs, error } = await q;
  if (error) { console.error("[gallery]", error.message); return res.status(500).json({ error: "Could not load the gallery." }); }

  const names = [...new Set((subs || []).map((s) => cleanUsername(s.username)))];
  const meta = {}, streaks = {}, reports = {}, reacts = {}, mine = {};
  if (names.length) {
    let prof = await db.from("Profiles").select("username,avatar_url,avatar_emoji,feed_hidden").in("username", names);
    if (prof.error) prof = await db.from("Profiles").select("username,avatar_url,avatar_emoji").in("username", names); // column not added yet
    (prof.data || []).forEach((p) => { meta[cleanUsername(p.username)] = p; });
    const st = await db.from("Streaks").select("username,current_streak").in("username", names);
    (st.data || []).forEach((r) => { streaks[cleanUsername(r.username)] = r.current_streak || 1; });
    const rp = await db.from("gallery_reports").select("username,day,reporter").in("username", names).gte("day", since.slice(0, 10)); // table may not exist yet
    // reactions: counts per proof + what the signed-in viewer has already given (table may not exist yet)
    const rx = await db.from("gallery_reactions").select("username,day,kind,reactor").in("username", names).gte("day", since.slice(0, 10));
    let me = null;
    if (signedIn) { const c = await db.from("username_claims").select("username").eq("google_id", session.user.google_id).maybeSingle(); me = c.data?.username ? cleanUsername(c.data.username) : null; }
    if (!rx.error) (rx.data || []).forEach((r) => {
      const k = r.username + "|" + String(r.day).slice(0, 10);
      (reacts[k] ||= { leaf: 0, fire: 0 })[r.kind]++;
      if (me && r.reactor === me) (mine[k] ||= {})[r.kind] = true;
    });
    if (!rp.error) (rp.data || []).forEach((r) => { const k = r.username + "|" + String(r.day).slice(0, 10); (reports[k] ||= new Set()).add(r.reporter); });
  }

  const seen = new Set(), items = [];
  for (const s of subs || []) {
    const u = cleanUsername(s.username), day = new Date(s.created_at).toISOString().slice(0, 10), key = u + "|" + day;
    if (seen.has(key) || meta[u]?.feed_hidden || (reports[key]?.size || 0) >= REPORT_HIDE_AT) continue;
    seen.add(key);
    const streak = streaks[u] || 1, t = getV2Tier(streak);
    items.push({
      username: u, day, created_at: s.created_at, streak,
      tier: { name: t.name, color: t.color },
      photo: s.photo_url || db.storage.from(BUCKET).getPublicUrl(`${u}/${day}.png`).data.publicUrl,
      place: [s.location_city, s.location_region].filter(Boolean).join(", ") || null,
      avatar_url: meta[u]?.avatar_url || null, avatar_emoji: meta[u]?.avatar_emoji || null,
      reactions: reacts[key] || { leaf: 0, fire: 0 }, mine: mine[key] || {},
    });
    if (items.length >= limit) break;
  }
  const more = signedIn && items.length >= limit;
  const last = items[items.length - 1];
  // The response depends on who is asking (teaser vs full feed, "mine" reactions), so it must never sit in a shared cache.
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  let featured = null;
  if (signedIn && !before && scope === "all") { try { featured = await pickFeatured(db, since, session); } catch (e) { console.warn("[gallery] featured skipped:", e?.message); } }
  return res.status(200).json({ items, next: more && last ? last.created_at : null, signedIn, featured });
}
