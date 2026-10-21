// GET — public groves leaderboard: name, size, streak, plus each Grove's members (username + profile picture only).
import { adminClient } from "../../../utils/requireOwner";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const { data, error } = await db.rpc("grove_leaderboard", { p_limit: 25 });
  if (error) { console.error("[groves/leaderboard]", error); return res.status(500).json({ error: "Could not load leaderboard." }); }
  const groves = data || [];
  // Member pictures are cosmetic: if this lookup fails the board still loads without them.
  try {
    const ids = groves.map(g => g.id);
    if (ids.length) {
      const { data: mem } = await db.from("grove_members").select("grove_id, username, joined_at").in("grove_id", ids).is("left_at", null).order("joined_at");
      const names = [...new Set((mem || []).map(m => m.username))];
      const { data: profs } = names.length ? await db.from("Profiles").select("username, avatar_url").in("username", names) : { data: [] };
      const av = Object.fromEntries((profs || []).map(p => [String(p.username).toLowerCase(), p.avatar_url || null]));
      const byGrove = {};
      for (const m of mem || []) (byGrove[m.grove_id] ||= []).push({ username: m.username, avatar_url: av[String(m.username).toLowerCase()] || null });
      for (const g of groves) g.member_list = (byGrove[g.id] || []).slice(0, 6);
    }
  } catch (e) { console.error("[groves/leaderboard] avatars", e); }
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json({ groves });
}
