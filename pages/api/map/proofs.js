// GET /api/map/proofs?ids=a,b,c  — public preview cards for map markers.
// Only ids present in the eligible, mapped dataset are returned.
import { getDataset, profilesFor } from "../../../utils/mapServer";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const ids = String(req.query.ids || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 5);
  if (!ids.length) return res.status(400).json({ error: "ids required" });
  try {
    const ds = await getDataset();
    const byId = new Map(ds.records.map(r => [r.id, r]));
    const found = ids.map(i => byId.get(i)).filter(Boolean);
    const profiles = await profilesFor(found.map(r => r.username));
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({
      proofs: found.map(r => ({
        id: r.id, username: r.username, label: r.label, createdAt: r.createdAt,
        avatarUrl: profiles[r.username]?.avatarUrl || null,
        avatarEmoji: profiles[r.username]?.avatarEmoji || null,
      })),
    });
  } catch (e) {
    console.error("[map/proofs]", e?.message);
    return res.status(500).json({ error: "Couldn't load proofs" });
  }
}
