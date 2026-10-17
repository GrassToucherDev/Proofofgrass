// GET /api/wago-drops/trails — browse published Trails (no wallet needed; sign-in optional).
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { sb, loadStops, TRAIL_PUBLIC_COLS } from "../../../../utils/wagoTrailsServer";
import { trailWindow } from "../../../../utils/wagoTrails";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id || null;

  const { data: trails, error } = await sb.from("wago_trails").select(TRAIL_PUBLIC_COLS).eq("status", "published").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const visible = (trails || []).filter(t => trailWindow(t) !== "ended");
  const stopsBy = await loadStops(visible.map(t => t.id));
  let mine = {};
  if (googleId && visible.length) {
    const { data: prog } = await sb.from("wago_trail_progress").select("trail_id, status").eq("google_id", googleId).in("trail_id", visible.map(t => t.id));
    (prog || []).forEach(p => { mine[p.trail_id] = p.status; });
  }
  res.status(200).json({
    trails: visible.map(t => ({
      ...t,
      window: trailWindow(t),
      stop_count: (stopsBy[t.id] || []).filter(s => !s.replaced_at).length,
      my_status: mine[t.id] || null,
    })),
  });
}
