// GET /api/wago-drops/trails/[id] — Trail detail, stops, and the user's server-side progress.
// Optional ?userLat&userLng reveals exact pins for stops within that drop's reveal radius.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import { sb, loadStops, syncProgress, shapeStops, TRAIL_PUBLIC_COLS } from "../../../../../utils/wagoTrailsServer";
import { trailWindow } from "../../../../../utils/wagoTrails";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id || null;

  const { data: trail } = await sb.from("wago_trails").select(TRAIL_PUBLIC_COLS).eq("id", req.query.id).maybeSingle();
  if (!trail || !["published", "paused"].includes(trail.status)) {
    // Archived/draft Trails stay visible to people who already started them.
    const own = googleId && trail ? (await sb.from("wago_trail_progress").select("id").eq("trail_id", trail.id).eq("google_id", googleId).maybeSingle()).data : null;
    if (!trail || !own) return res.status(404).json({ error: "Trail not found" });
  }

  const stops = (await loadStops([trail.id]))[trail.id] || [];
  let progress = null;
  if (googleId) {
    const { data: row } = await sb.from("wago_trail_progress").select("*").eq("trail_id", trail.id).eq("google_id", googleId).maybeSingle();
    if (row) progress = await syncProgress(row, trail, stops);
  }
  const userLat = parseFloat(req.query.userLat), userLng = parseFloat(req.query.userLng);
  const shaped = shapeStops(stops, { progress, trail, userLat, userLng });

  res.status(200).json({
    trail: { ...trail, window: trailWindow(trail) },
    stops: shaped,
    progress: progress ? {
      id: progress.id, status: progress.status, started_at: progress.started_at, completed_at: progress.completed_at,
      reward_status: progress.reward_status, reward_claimed_at: progress.reward_claimed_at,
      reward_tx_signature: progress.reward_tx_signature, reward_tickets_awarded: progress.reward_tickets_awarded,
      done: shaped.filter(s => s.state === "done").length, total: shaped.length,
    } : null,
  });
}
