// GET  ?as=<me>             -> { following: [usernames] }
// GET  ?as=<me>&check=<u>   -> { following: boolean }
// POST { as, username, on } -> follow / unfollow. Follows are private; there are no public follower lists.
import { adminClient, requireOwner, cleanUsername } from "../../utils/requireOwner";

const MAX_FOLLOWING = 300;
const missingTable = (e) => /does not exist|schema cache/i.test(e?.message || "");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  const db = adminClient();
  if (req.method === "GET") {
    const who = await requireOwner(req, res, req.query.as);
    if (!who) return;
    const check = cleanUsername(req.query.check);
    let q = db.from("follows").select("following").eq("follower", who.username);
    if (check) q = q.eq("following", check);
    const { data, error } = await q.limit(MAX_FOLLOWING + 1);
    if (error) return res.status(200).json(check ? { following: false } : { following: [] }); // table not created yet: stay quiet
    return res.status(200).json(check ? { following: !!data?.length } : { following: (data || []).map((r) => r.following) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.as);
  if (!who) return;
  const target = cleanUsername(req.body?.username), on = !!req.body?.on;
  if (!target || target === who.username) return res.status(400).json({ error: "You can't follow yourself.", code: "self" });
  const row = { follower: who.username, following: target };
  if (!on) {
    const { error } = await db.from("follows").delete().match(row);
    if (error) return res.status(500).json({ error: "Could not save that." });
    return res.status(200).json({ ok: true, following: false });
  }
  const { data: exists } = await db.from("Streaks").select("username").eq("username", target).maybeSingle();
  if (!exists) return res.status(404).json({ error: "That person isn't on Proof of Grass yet.", code: "no_such_user" });
  const { count } = await db.from("follows").select("id", { count: "exact", head: true }).eq("follower", who.username);
  if ((count ?? 0) >= MAX_FOLLOWING) return res.status(429).json({ error: `You can follow up to ${MAX_FOLLOWING} people.`, code: "limit" });
  const { error } = await db.from("follows").insert(row);
  if (error && error.code !== "23505") return res.status(500).json({ error: missingTable(error) ? "Follows aren't switched on yet (database setup pending)." : "Could not save that." });
  return res.status(200).json({ ok: true, following: true });
}
