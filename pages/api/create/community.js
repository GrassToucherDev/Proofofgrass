// GET /api/create/community?sort=new|top&kind=meme|pfp&mine=1&as=<username>&before=<iso>&limit=24
// Public gallery of finished creations. Hidden posts, posts with REPORT_HIDE_AT+ reporters and posts by paused accounts are left out.
// `as` (a secured username the caller owns) adds the "liked" flag; guests still see everything.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";
import { getPausedSet } from "../../../utils/pauses";
import { CREATIONS_BUCKET, REPORT_HIDE_AT, KINDS, currentTheme, POST_MIN_STREAK } from "../../../utils/createCommunity";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const sort = req.query.sort === "top" ? "top" : "new";
  const kind = KINDS.includes(req.query.kind) ? req.query.kind : null;
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 24));
  const before = req.query.before && !isNaN(Date.parse(req.query.before)) ? new Date(req.query.before).toISOString() : null;

  let me = null;
  try {
    const as = cleanUsername(req.query.as);
    if (as) {
      const session = await getServerSession(req, res, authOptions);
      const gid = session?.user?.google_id;
      if (gid) { const { data } = await db.from("username_claims").select("google_id").eq("username", as).maybeSingle(); if (data?.google_id === gid) me = as; }
    }
  } catch {}
  const mine = req.query.mine === "1" && me;

  const since = sort === "top" ? new Date(Date.now() - 30 * 86400_000).toISOString() : null; // "Top" = best of the last 30 days
  let q = db.from("community_creations").select("id,username,kind,tool,caption,theme,image_path,created_at").eq("hidden", false).order("created_at", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  if (mine) q = q.eq("username", me);
  if (before && sort === "new") q = q.lt("created_at", before);
  if (since) q = q.gte("created_at", since);
  const { data: rows, error } = await q.limit(sort === "top" ? 200 : limit + 30);
  if (error) {
    const pending = /does not exist|schema cache/i.test(error.message);
    return res.status(pending ? 200 : 500).json({ items: [], theme: currentTheme(), minStreak: POST_MIN_STREAK, needsSql: pending, error: pending ? undefined : "Could not load creations." });
  }
  const ids = (rows || []).map((r) => r.id);
  const [lk, rp, paused] = await Promise.all([
    ids.length ? db.from("community_creation_likes").select("creation_id,liker").in("creation_id", ids) : { data: [] },
    ids.length ? db.from("community_creation_reports").select("creation_id,reporter").in("creation_id", ids) : { data: [] },
    getPausedSet(db, [...new Set((rows || []).map((r) => r.username))]).catch(() => new Set()),
  ]);
  const likes = {}, mineLiked = new Set(), reporters = {};
  (lk.data || []).forEach((l) => { likes[l.creation_id] = (likes[l.creation_id] || 0) + 1; if (me && l.liker === me) mineLiked.add(l.creation_id); });
  (rp.data || []).forEach((r) => { (reporters[r.creation_id] ||= new Set()).add(r.reporter); });

  let items = (rows || [])
    .filter((r) => (mine || !paused.has(r.username)) && (mine || (reporters[r.id]?.size || 0) < REPORT_HIDE_AT))
    .map((r) => ({
      id: r.id, username: r.username, kind: r.kind, tool: r.tool, caption: r.caption, theme: r.theme, created_at: r.created_at,
      url: db.storage.from(CREATIONS_BUCKET).getPublicUrl(r.image_path).data.publicUrl,
      likes: likes[r.id] || 0, liked: mineLiked.has(r.id), own: me === r.username,
    }));
  if (sort === "top") items.sort((a, b) => b.likes - a.likes || +new Date(b.created_at) - +new Date(a.created_at));
  items = items.slice(0, limit);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ items, theme: currentTheme(), minStreak: POST_MIN_STREAK, next: sort === "new" && items.length === limit ? items[items.length - 1].created_at : null });
}
