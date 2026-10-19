// GET — public groves leaderboard (name, size, streak only).
import { adminClient } from "../../../utils/requireOwner";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { data, error } = await adminClient().rpc("grove_leaderboard", { p_limit: 25 });
  if (error) { console.error("[groves/leaderboard]", error); return res.status(500).json({ error: "Could not load leaderboard." }); }
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json({ groves: data || [] });
}
