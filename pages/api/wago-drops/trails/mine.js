// GET /api/wago-drops/trails/mine — the signed-in user's Trails (Active / Completed / Expired).
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { sb, loadStops, syncProgress, TRAIL_PUBLIC_COLS } from "../../../../utils/wagoTrailsServer";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });

  const { data: rows } = await sb.from("wago_trail_progress").select("*").eq("google_id", session.user.google_id).order("started_at", { ascending: false });
  if (!rows?.length) return res.status(200).json({ trails: [] });
  const { data: trails } = await sb.from("wago_trails").select(TRAIL_PUBLIC_COLS).in("id", rows.map(r => r.trail_id));
  const T = Object.fromEntries((trails || []).map(t => [t.id, t]));
  const stopsBy = await loadStops(Object.keys(T));

  const out = [];
  for (const r of rows) {
    const trail = T[r.trail_id];
    if (!trail) continue;
    const stops = stopsBy[trail.id] || [];
    const p = await syncProgress(r, trail, stops);     // also flips active → completed/expired
    out.push({
      trail, status: p.status, started_at: p.started_at, completed_at: p.completed_at,
      reward_status: p.reward_status, reward_claimed_at: p.reward_claimed_at,
      stops_total: stops.filter(s => !s.replaced_at).length,
      stops_done: stops.filter(s => !s.replaced_at && p._doneByPos.has(s.position)).length,
    });
  }
  res.status(200).json({ trails: out });
}
