// GET ?metric=wins|rate|completed — The Yard's competitive board. Built only from server-settled results.
import { adminClient } from "../../../utils/requireOwner";
import { tally, rankPlayers } from "../../../utils/yardStats";
import { loadAvatars } from "../../../utils/yardData";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const metric = ["wins", "rate", "completed"].includes(req.query.metric) ? req.query.metric : "wins";
  const db = adminClient();
  const { data, error } = await db.from("Challenges").select("challenger, challenged, winner, result").not("result", "is", null).limit(20000);
  if (error) { console.error("[yard/leaderboard]", error); return res.status(500).json({ error: "Could not load the leaderboard." }); }
  const ranked = rankPlayers(tally(data || []), metric);
  const top = ranked.slice(0, 25);
  const av = await loadAvatars(db, top.map((p) => p.username));
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json({ metric, players: top.map((p, i) => ({ ...p, rank: i + 1, avatar_url: av[p.username] || null })), total_players: ranked.length });
}
