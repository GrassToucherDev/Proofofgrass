// POST /api/wago-drops/trails/[id]/start — creates the server-side progress row (idempotent).
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import { sb, loadStops } from "../../../../../utils/wagoTrailsServer";
import { trailWindow } from "../../../../../utils/wagoTrails";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id;
  if (!googleId) return res.status(401).json({ error: "Sign in with Google to start a Trail." });

  const { data: trail } = await sb.from("wago_trails").select("*").eq("id", req.query.id).eq("status", "published").maybeSingle();
  if (!trail) return res.status(404).json({ error: "Trail not found" });

  const { data: existing } = await sb.from("wago_trail_progress").select("id, status").eq("trail_id", trail.id).eq("google_id", googleId).maybeSingle();
  if (existing) return res.status(200).json({ ok: true, already: true, status: existing.status });

  const win = trailWindow(trail);
  if (win === "upcoming") return res.status(400).json({ error: "This Trail hasn't opened yet." });
  if (win === "ended") return res.status(400).json({ error: "This Trail has ended." });

  const stops = ((await loadStops([trail.id]))[trail.id] || []).filter(s => !s.replaced_at);
  if (stops.length < 3) return res.status(400).json({ error: "This Trail isn't ready yet." });

  // Only claims made after Start count, so a Trail can't be started with its stops already claimed.
  const { data: prior } = await sb.from("wago_drop_claims").select("id").eq("google_id", googleId).in("location_id", stops.map(s => s.location_id)).limit(1);
  if (prior?.length) {
    return res.status(400).json({ code: "stop_already_claimed", error: "You've already claimed a drop on this Trail, so it can't be started fresh." });
  }

  const { error } = await sb.from("wago_trail_progress").insert({ trail_id: trail.id, google_id: googleId });
  if (error && error.code !== "23505") return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true });
}
