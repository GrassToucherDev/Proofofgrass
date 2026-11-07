// GET ?username= — "Today in your Grove": each member's proof (if posted today), streak, and nudge state.
// Same "today" as the Grove page (UTC day, from grove_get's locked_today). Members who turned the public feed off show as "posted" without a photo.
import { requireOwner, adminClient, cleanUsername } from "../../../utils/requireOwner";
import { getPausedSet } from "../../../utils/pauses";
import { BUCKET } from "../../../utils/proofAccess";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.query.username);
  if (!who) return;
  const db = adminClient();
  const { data, error } = await db.rpc("grove_get", { p_username: who.username });
  if (error) { console.error("[groves/feed]", error.message); return res.status(500).json({ error: "Could not load the Grove feed." }); }
  if (!data?.grove) return res.status(200).json({ grove: null, members: [] });

  const today = new Date().toISOString().slice(0, 10);
  const names = (data.members || []).map((m) => cleanUsername(m.username));
  const photos = {}, streaks = {}, hiddenSet = new Set(), nudgedByMe = new Set(), nudgedMe = [];
  const subs = await db.from("Submissions").select("username,created_at,photo_url").in("username", names).in("status", ["pending", "approved"]).gte("created_at", today + "T00:00:00Z");
  (subs.data || []).forEach((s) => { const u = cleanUsername(s.username); photos[u] = s.photo_url || db.storage.from(BUCKET).getPublicUrl(`${u}/${today}.png`).data.publicUrl; });
  const st = await db.from("Streaks").select("username,current_streak").in("username", names);
  (st.data || []).forEach((r) => { streaks[cleanUsername(r.username)] = r.current_streak || 1; });
  const pr = await db.from("Profiles").select("username,feed_hidden").in("username", names);
  if (!pr.error) (pr.data || []).forEach((p) => { if (p.feed_hidden) hiddenSet.add(cleanUsername(p.username)); });
  (await getPausedSet(db, names)).forEach((u) => hiddenSet.add(u));   // paused accounts show as "posted" without a photo
  const nd = await db.from("grove_nudges").select("from_user,to_user").eq("day", today).or(`from_user.eq.${who.username},to_user.eq.${who.username}`); // table may not exist yet
  if (!nd.error) (nd.data || []).forEach((n) => { if (n.from_user === who.username) nudgedByMe.add(n.to_user); else nudgedMe.push(n.from_user); });

  const members = (data.members || []).map((m) => {
    const u = cleanUsername(m.username);
    return { username: u, locked: !!m.locked_today, photo: m.locked_today && !hiddenSet.has(u) ? photos[u] || null : null, streak: streaks[u] || 1, nudged: nudgedByMe.has(u), me: u === who.username };
  });
  return res.status(200).json({ grove: { id: data.grove.id, name: data.grove.name }, members, nudgedMe: [...new Set(nudgedMe)], today });
}
