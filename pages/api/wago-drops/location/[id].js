// pages/api/wago-drops/location/[id].js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { ticketsForCampaign } from "../../../../utils/wagoProofBonus";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function jitter(val, metres) {
  const deg = metres / 111320;
  return val + (Math.random() * 2 - 1) * deg;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id || null;

  // Load location
  const { data: loc, error: locErr } = await supabase
    .from("wago_drop_locations")
    .select("id, lat, lng, hint, claim_count, max_claims, campaign_id")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (locErr || !loc) return res.status(404).json({ error: "Drop not found" });

  // Load campaign
  const { data: campaign, error: campErr } = await supabase
    .from("wago_drop_campaigns")
    .select("id, name, image_url, status, reward_amount, reward_type, reward_symbol, reward_logo_url, reward_token_mint, proof_bonus_enabled, proof_bonus_amount, rarity, proof_bonus_tickets, reveal_radius_m, claim_radius_m, ends_at")
    .eq("id", loc.campaign_id)
    .single();

  if (campErr || !campaign || campaign.status !== "active") {
    return res.status(404).json({ error: "Drop not available" });
  }

  // Check user's claimed / saved state
  let already_claimed = false;
  let already_saved   = false;
  if (googleId) {
    const [claimRes, saveRes] = await Promise.all([
      supabase.from("wago_drop_claims").select("id").eq("location_id", id).eq("google_id", googleId).single(),
      supabase.from("wago_drop_saves").select("id").eq("location_id", id).eq("google_id", googleId).single(),
    ]);
    already_claimed = !!claimRes.data;
    already_saved   = !!saveRes.data;
  }

  // Proximity-based reveal (optional — client may send userLat/userLng)
  const userLat = parseFloat(req.query.userLat);
  const userLng = parseFloat(req.query.userLng);
  const hasUserPos = !isNaN(userLat) && !isNaN(userLng);
  const revealRadius = campaign.reveal_radius_m || 100;
  const distM = hasUserPos ? haversineM(userLat, userLng, loc.lat, loc.lng) : Infinity;
  const revealed = distM <= revealRadius;

  return res.status(200).json({
    id:                  loc.id,
    campaign_id:         campaign.id,
    campaign_name:       campaign.name,
    image_url:           campaign.image_url || null,
    reward_type:         campaign.reward_type,
    reward_symbol:       campaign.reward_symbol || null,
    reward_logo_url:     campaign.reward_logo_url || null,
    reward_token_mint:   campaign.reward_token_mint || null,
    reward_amount:       campaign.reward_amount,
    proof_bonus_enabled: campaign.proof_bonus_enabled,
    proof_bonus_amount:  campaign.proof_bonus_amount,
    rarity:              campaign.rarity || "common",
    proof_tickets:       campaign.proof_bonus_enabled ? ticketsForCampaign(campaign) : 0,
    reveal_radius_m:     revealRadius,
    claim_radius_m:      campaign.claim_radius_m || 25,
    claim_count:         loc.claim_count,
    max_claims:          loc.max_claims,
    ends_at:             campaign.ends_at,
    already_claimed,
    already_saved,
    hint: revealed ? loc.hint : null,
    lat:  revealed ? loc.lat  : jitter(loc.lat, revealRadius * 1.5),
    lng:  revealed ? loc.lng  : jitter(loc.lng, revealRadius * 1.5),
  });
}