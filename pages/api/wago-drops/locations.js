// pages/api/wago-drops/locations.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { ticketsForCampaign } from "../../../utils/wagoProofBonus";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stable blur for not-yet-revealed pins: the offset is derived from the drop id,
// so a pin never moves between requests (it used to be re-randomized every fetch).
function seeded(id, salt) {
  let h = 2166136261 ^ salt;
  const s = String(id);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
  return ((h >>> 0) / 4294967295) * 2 - 1;   // -1 … 1
}
function jitter(val, metres, id, salt, lat) {
  const deg = metres / 111320;
  const scale = salt === 1 ? 1 : 1 / Math.max(0.2, Math.cos(lat * Math.PI / 180));   // keep E-W metres equal at latitude
  return val + seeded(id, salt) * deg * scale;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id || null;

  let { swLat, swLng, neLat, neLng } = req.query;
  swLat = parseFloat(swLat); swLng = parseFloat(swLng);
  neLat = parseFloat(neLat); neLng = parseFloat(neLng);

  if ([swLat,swLng,neLat,neLng].some(isNaN)) {
    return res.status(400).json({ error: "Invalid bounds" });
  }

  // Cap viewport size to ~50km
  if ((neLat - swLat) > 0.45) {
    const midLat = (swLat + neLat) / 2;
    swLat = midLat - 0.225; neLat = midLat + 0.225;
  }
  if ((neLng - swLng) > 0.45) {
    const midLng = (swLng + neLng) / 2;
    swLng = midLng - 0.225; neLng = midLng + 0.225;
  }

  // Fetch active locations in bounds
  const { data: locations, error } = await supabase
    .from("wago_drop_locations")
    .select("id, lat, lng, hint, claim_count, max_claims, campaign_id")
    .eq("is_active", true)
    .gte("lat", swLat).lte("lat", neLat)
    .gte("lng", swLng).lte("lng", neLng);

  if (error) return res.status(500).json({ error: error.message });
  if (!locations?.length) return res.status(200).json({ locations: [] });

  // Fetch campaigns for those locations
  const campaignIds = [...new Set(locations.map(l => l.campaign_id))];
  const { data: campaigns } = await supabase
    .from("wago_drop_campaigns")
    .select("id, name, status, reward_amount, reward_type, proof_bonus_enabled, proof_bonus_amount, rarity, proof_bonus_tickets, reveal_radius_m, claim_radius_m")
    .in("id", campaignIds)
    .eq("status", "active");

  const campaignMap = {};
  (campaigns || []).forEach(c => { campaignMap[c.id] = c; });

  // Filter to active campaigns only
  const active = locations.filter(l => campaignMap[l.campaign_id]);

  // Check which locations the user has already claimed
  let claimedSet = new Set();
  if (googleId && active.length > 0) {
    const ids = active.map(l => l.id);
    const { data: claims } = await supabase
      .from("wago_drop_claims")
      .select("location_id")
      .eq("google_id", googleId)
      .in("location_id", ids);
    (claims || []).forEach(c => claimedSet.add(c.location_id));
  }

  // User's current position for reveal check (optional — client sends if available)
  const userLat = parseFloat(req.query.userLat);
  const userLng = parseFloat(req.query.userLng);
  const hasUserPos = !isNaN(userLat) && !isNaN(userLng);

  const result = active.map(loc => {
    const campaign = campaignMap[loc.campaign_id];
    const revealRadius = campaign?.reveal_radius_m || 100;
    const distM = hasUserPos ? haversineM(userLat, userLng, loc.lat, loc.lng) : Infinity;
    const revealed = distM <= revealRadius;
    const already_claimed = claimedSet.has(loc.id);

    return {
      id: loc.id,
      campaign_id: loc.campaign_id,
      campaign_name: campaign?.name,
      reward_amount: campaign?.reward_amount,
      reward_type: campaign?.reward_type,
      proof_bonus_enabled: campaign?.proof_bonus_enabled,
      proof_bonus_amount: campaign?.proof_bonus_amount,
      rarity: campaign?.rarity || "common",
      proof_tickets: campaign?.proof_bonus_enabled ? ticketsForCampaign(campaign) : 0,
      reveal_radius_m: revealRadius,
      claim_radius_m: campaign?.claim_radius_m || 25,
      hint: revealed ? loc.hint : null,
      already_claimed,
      // Jitter coords unless revealed
      lat: revealed ? loc.lat : jitter(loc.lat, revealRadius * 0.6, loc.id, 1, loc.lat),
      lng: revealed ? loc.lng : jitter(loc.lng, revealRadius * 0.6, loc.id, 2, loc.lat),
      revealed,
    };
  });

  return res.status(200).json({ locations: result });
}