// GET /api/map/data?range=all|week|today
// Aggregated, privacy-coarsened community map data. No exact coordinates, no
// per-proof rows beyond a handful of recent/preview ids.
import { getDataset, summarize, profilesFor, RANGES } from "../../../utils/mapServer";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const range = RANGES[req.query.range] ? req.query.range : "all";
  try {
    const ds = await getDataset();
    const s = summarize(ds, range);
    const recent = s.inRange.slice(0, 8);
    const profiles = await profilesFor(recent.map(r => r.username));
    res.setHeader("Cache-Control", ds.pending ? "public, s-maxage=5, stale-while-revalidate=30" : "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({
      range,
      rangeLabel: RANGES[range].label,
      since: s.start ? s.start.toISOString() : null,
      generatedAt: new Date().toISOString(),
      pendingLocations: ds.pending,
      stats: s.stats,
      footprint: s.footprint,
      points: s.points,
      recent: recent.map(r => ({
        id: r.id, username: r.username, label: r.label, createdAt: r.createdAt,
        avatarUrl: profiles[r.username]?.avatarUrl || null,
        avatarEmoji: profiles[r.username]?.avatarEmoji || null,
      })),
    });
  } catch (e) {
    console.error("[map/data]", e?.message);
    return res.status(500).json({ error: "Couldn't load map data" });
  }
}
