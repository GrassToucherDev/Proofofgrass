// A hunter standing at a spot says the prize is still there, or gone. Two different "gone" reports hide the spot.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { haversineM, hasConsent } from "../../../../utils/prizes";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const UUID = /^[0-9a-f-]{36}$/i;
const MSG = {
  none_left: "Everything at this spot has already been found.",
  already_reported: "Thanks, you already reported this spot recently.",
  not_found: "Spot not found.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  const gid = session?.user?.google_id;
  if (!gid) return res.status(401).json({ error: "Sign in to report." });
  const { spotId, kind, userLat, userLng } = req.body || {};
  if (!UUID.test(String(spotId)) || !["gone", "here"].includes(kind) || userLat == null || userLng == null)
    return res.status(400).json({ error: "Turn on location and try again." });
  if (!(await hasConsent(supabase, gid).catch(() => true)))
    return res.status(403).json({ error: "Please accept the terms first.", code: "consent_required" });

  const { data: spot } = await supabase.from("wago_prize_spots").select("lat, lng, prize_id").eq("id", spotId).maybeSingle();
  if (!spot) return res.status(404).json({ error: MSG.not_found });
  const { data: p } = await supabase.from("wago_prizes").select("reveal_radius_m, status").eq("id", spot.prize_id).maybeSingle();
  if (!p || p.status !== "active") return res.status(404).json({ error: MSG.not_found });
  const reach = p.reveal_radius_m || 100;
  if (!(haversineM(Number(userLat), Number(userLng), spot.lat, spot.lng) <= reach))
    return res.status(400).json({ error: `You need to be within ${reach}m to report this spot.` });

  const { data, error } = await supabase.rpc("wago_prize_report", { p_spot_id: spotId, p_google_id: gid, p_kind: kind });
  if (error) return res.status(500).json({ error: "Something went wrong. Try again." });
  if (!data?.ok) return res.status(409).json({ error: MSG[data.error] || "Could not report.", reason: data.error });
  return res.status(200).json({ ok: true, hidden: !!data.hidden });
}
