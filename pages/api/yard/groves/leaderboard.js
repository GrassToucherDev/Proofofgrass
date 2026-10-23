// GET ?metric=wins|rate|completed — Grove board from server-settled Grove challenges only.
import { adminClient } from "../../../../utils/requireOwner";
import { tally, rankPlayers } from "../../../../utils/yardStats";
import { loadGroves } from "../../../../utils/yardGroves";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const metric = ["wins", "rate", "completed"].includes(req.query.metric) ? req.query.metric : "wins";
  const db = adminClient();
  const { data, error } = await db.from("grove_challenges").select("challenger_grove, challenged_grove, winner_grove, result").not("result", "is", null).limit(5000);
  if (error) { console.error("[yard/groves/leaderboard]", error); return res.status(500).json({ error: "Could not load the leaderboard." }); }
  const ranked = rankPlayers(tally((data || []).map((r) => ({ challenger: r.challenger_grove, challenged: r.challenged_grove, winner: r.winner_grove, result: r.result }))), metric);
  const top = ranked.slice(0, 25);
  const info = await loadGroves(db, top.map((p) => p.username));
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json({ metric, groves: top.filter((p) => info[p.username]).map((p, i) => ({ ...p, rank: i + 1, id: p.username, name: info[p.username].name, size: info[p.username].size, banner: info[p.username].banner })), total: ranked.length });
}
