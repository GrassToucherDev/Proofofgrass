// GET ?id=<grove uuid>[&slug=<challenge slug>] — who is in a Grove: username, picture, owner flag. Public data only.
// With a slug, an active/finished challenge returns the roster that was LOCKED at the start (what the score uses).
import { adminClient } from "../../../../utils/requireOwner";
import { loadAvatars } from "../../../../utils/yardData";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const id = String(req.query.id || "");
  if (!UUID.test(id)) return res.status(400).json({ error: "Bad Grove id." });
  const db = adminClient();
  try {
    const { data: g } = await db.from("groves").select("id, name, owner_username").eq("id", id).maybeSingle();
    if (!g) return res.status(404).json({ error: "Grove not found." });
    const owner = String(g.owner_username || "").toLowerCase();
    const { data: live } = await db.from("grove_members").select("username, joined_at").eq("grove_id", id).is("left_at", null).order("joined_at");
    const current = (live || []).map((m) => String(m.username).toLowerCase());
    let names = current, locked = false;
    if (req.query.slug) {
      const { data: c } = await db.from("grove_challenges").select("challenger_grove, challenged_grove, roster_challenger, roster_challenged").eq("slug", String(req.query.slug).slice(0, 60)).maybeSingle();
      const roster = c ? (c.challenger_grove === id ? c.roster_challenger : c.challenged_grove === id ? c.roster_challenged : null) : null;
      if (roster?.length) { names = roster.map((n) => String(n).toLowerCase()); locked = true; }
    }
    const av = await loadAvatars(db, names);
    const members = names.map((u) => ({ username: u, avatar_url: av[u] || null, is_owner: u === owner, left: locked && !current.includes(u) }))
      .sort((a, b) => Number(b.is_owner) - Number(a.is_owner) || a.username.localeCompare(b.username));
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json({ id, name: g.name, locked, members });
  } catch (e) {
    console.error("[yard/groves/members]", e);
    return res.status(500).json({ error: "Could not load members." });
  }
}
