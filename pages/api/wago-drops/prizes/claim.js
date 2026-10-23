import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { haversineM, hashCode, normalizeCode, firstName, hasConsent } from "../../../../utils/prizes";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const UUID = /^[0-9a-f-]{36}$/i;
const MSG = {
  not_available: "This prize isn't available any more.",
  already_claimed: "You already found one of these.",
  too_many_attempts: "Too many wrong codes. Try again in an hour.",
  code_used: "That code was already used. Someone got there first.",
  bad_code: "That code isn't right. Check it and try again.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = await getServerSession(req, res, authOptions);
  const gid = session?.user?.google_id;
  if (!gid) return res.status(401).json({ error: "Sign in to claim." });

  const { prizeId, code, userLat, userLng } = req.body || {};
  const code2 = normalizeCode(code);
  if (!UUID.test(String(prizeId)) || code2.length < 6 || userLat == null || userLng == null)
    return res.status(400).json({ error: "Enter the code and turn on location." });

  if (!(await hasConsent(supabase, gid).catch(() => true)))
    return res.status(403).json({ error: "Please accept the terms to claim prizes.", code: "consent_required" });

  const { data: p } = await supabase.from("wago_prizes").select("id, lat, lng, claim_radius_m, status, ends_at").eq("id", prizeId).maybeSingle();
  if (!p || p.status !== "active" || (p.ends_at && new Date(p.ends_at) < new Date()))
    return res.status(404).json({ error: MSG.not_available });

  const dist = haversineM(Number(userLat), Number(userLng), p.lat, p.lng);
  const radius = p.claim_radius_m || 25;
  if (!(dist <= radius)) return res.status(400).json({ error: `You need to be within ${radius}m. You're about ${Math.round(dist)}m away.` });

  const { data, error } = await supabase.rpc("wago_prize_claim", {
    p_prize_id: prizeId, p_code_hash: hashCode(prizeId, code2), p_google_id: gid, p_name: firstName(session.user.name),
  });
  if (error) return res.status(500).json({ error: "Something went wrong. Try again." });
  if (!data?.ok) return res.status(data.error === "too_many_attempts" ? 429 : 409).json({ error: MSG[data.error] || "Could not claim.", reason: data.error });
  return res.status(200).json({ ok: true });
}
