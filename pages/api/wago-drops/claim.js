// pages/api/wago-drops/claim.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { ticketsForCampaign, PROOF_WINDOW_HOURS } from "../../../utils/wagoProofBonus";
import { MAX_CLAIMS_PER_DAY, MAX_TRAVEL_KMH, GPS_TOLERANCE_M } from "../../../utils/wagoPayout.mjs";

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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });

  const { locationId, userLat, userLng, deviceHash } = req.body;
  if (!locationId || userLat == null || userLng == null) {
    return res.status(400).json({ error: "locationId, userLat, userLng required" });
  }

  const googleId = session.user.google_id;

  // Load location
  const { data: loc, error: locErr } = await supabase
    .from("wago_drop_locations")
    .select("id, lat, lng, max_claims, claim_count, campaign_id")
    .eq("id", locationId)
    .eq("is_active", true)
    .single();

  if (locErr || !loc) return res.status(404).json({ error: "Drop not found" });

  // Load campaign separately
  const { data: campaign, error: campErr } = await supabase
    .from("wago_drop_campaigns")
    .select("*")
    .eq("id", loc.campaign_id)
    .single();

  if (campErr || !campaign) return res.status(404).json({ error: "Campaign not found" });

  if (campaign.status !== "active") return res.status(400).json({ error: "Campaign is not active" });
  if (campaign.ends_at && new Date(campaign.ends_at) < new Date()) return res.status(400).json({ error: "Campaign has ended" });

  // Server-side proximity check
  const dist = haversineM(userLat, userLng, loc.lat, loc.lng);
  const claimRadius = campaign.claim_radius_m ?? 25;
  if (dist > claimRadius) {
    return res.status(400).json({ error: `Too far away (${Math.round(dist)}m). Must be within ${claimRadius}m.` });
  }

  // Check max claims
  const maxClaims = loc.max_claims ?? Infinity;
  if (loc.claim_count >= maxClaims) return res.status(400).json({ error: "This drop is fully claimed" });

  // Check duplicate
  const { data: existing } = await supabase
    .from("wago_drop_claims")
    .select("id")
    .eq("location_id", locationId)
    .eq("google_id", googleId)
    .single();
  if (existing) return res.status(400).json({ error: "You already claimed this drop" });

  // Load wallet
  const { data: account } = await supabase
    .from("wago_google_accounts")
    .select("linked_wallet, wallet_verified")
    .eq("google_id", googleId)
    .single();
  if (!account?.linked_wallet) return res.status(400).json({ error: "No wallet linked" });
  // Rewards only go to wallets the user has proven they own.
  if (!account.wallet_verified) {
    return res.status(403).json({
      code: "wallet_unverified",
      error: "Verify your wallet to claim. Go to Settings → Solana Wallet, connect it and sign the free message.",
    });
  }

  // ── Anti-abuse ────────────────────────────────────────────────────────────
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || null;
  const device = typeof deviceHash === "string" && /^[a-f0-9]{16,64}$/i.test(deviceHash) ? deviceHash : null;
  const flags = [];
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // 1. Daily cap per account
  const { count: todayCount } = await supabase
    .from("wago_drop_claims")
    .select("id", { count: "exact", head: true })
    .eq("google_id", googleId)
    .gte("claimed_at", since24h);
  if ((todayCount || 0) >= MAX_CLAIMS_PER_DAY) {
    return res.status(429).json({ code: "daily_limit", error: `Daily limit reached (${MAX_CLAIMS_PER_DAY} claims per 24 hours). Come back tomorrow!` });
  }

  // 2. Impossible travel since the previous claim
  const { data: lastClaim } = await supabase
    .from("wago_drop_claims")
    .select("claimed_at, claimed_lat, claimed_lng")
    .eq("google_id", googleId)
    .not("claimed_lat", "is", null)
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastClaim) {
    const hours = (Date.now() - new Date(lastClaim.claimed_at).getTime()) / 3600000;
    if (hours < 12) {
      const moved = haversineM(lastClaim.claimed_lat, lastClaim.claimed_lng, userLat, userLng);
      const maxMoved = MAX_TRAVEL_KMH * 1000 * Math.max(hours, 0) + GPS_TOLERANCE_M;
      if (moved > maxMoved) {
        return res.status(429).json({ code: "too_fast", error: "That's further than you could have travelled since your last claim. Try again a bit later." });
      }
    }
  }

  // 3. Same device can't claim the same drop from a different account
  if (device) {
    const { data: sameDevice } = await supabase
      .from("wago_drop_claims")
      .select("google_id")
      .eq("location_id", locationId)
      .eq("device_hash", device)
      .neq("google_id", googleId)
      .limit(1);
    if (sameDevice?.length) {
      return res.status(403).json({ code: "device_used", error: "This device has already been used to claim this drop." });
    }
    // Soft flag: several accounts on one device in a day
    const { data: devAccts } = await supabase
      .from("wago_drop_claims")
      .select("google_id")
      .eq("device_hash", device)
      .gte("claimed_at", since24h)
      .neq("google_id", googleId);
    if (new Set((devAccts || []).map(r => r.google_id)).size >= 2) flags.push("device_multi_account");
  } else {
    flags.push("no_device_hash");
  }
  // Soft flag: other accounts claiming this drop from the same IP in 24h
  if (ip) {
    const { data: ipMatch } = await supabase
      .from("wago_drop_claims")
      .select("google_id")
      .eq("location_id", locationId)
      .eq("claim_ip", ip)
      .gte("claimed_at", since24h)
      .neq("google_id", googleId)
      .limit(1);
    if (ipMatch?.length) flags.push("ip_shared");
  }

  // Proof bonus is no longer auto-applied at claim time. It is now the
  // post-claim flow: proof photo (within 100m, inside 24h) → X post →
  // Grass Tickets. See /api/wago-drops/proof and /api/wago-drops/proof-confirm.
  const proofBonusApplied = false;

  // Insert claim row
  const { data: claim, error: claimErr } = await supabase
    .from("wago_drop_claims")
    .insert({
      location_id:          locationId,
      campaign_id:          campaign.id,
      google_id:            googleId,
      wallet_address:       account.linked_wallet,
      reward_type:          campaign.reward_type,
      reward_amount:        campaign.reward_amount,
      reward_token_mint:    campaign.reward_token_mint,
      reward_metadata:      campaign.reward_metadata,
      proof_bonus_applied:  proofBonusApplied,
      proof_bonus_amount:   proofBonusApplied ? campaign.proof_bonus_amount : null,
      status:               "pending",
      claimed_lat:          userLat,
      claimed_lng:          userLng,
      wallet_verified:      true,
      device_hash:          device,
      claim_ip:             ip,
      flags,
    })
    .select()
    .single();

  if (claimErr) {
    if (claimErr.code === "23505") return res.status(400).json({ error: "Already claimed" });
    return res.status(500).json({ error: claimErr.message });
  }

  // Increment claim count
  await supabase.rpc("increment_wago_claim_count", { loc_id: locationId });

  return res.status(200).json({
    ok:                   true,
    message:              "Drop claimed! Reward will be sent to your wallet shortly.",
    claim_id:             claim.id,
    reward_type:          campaign.reward_type,
    reward_amount:        campaign.reward_amount,
    proof_bonus_applied:  proofBonusApplied,
    proof_bonus_amount:   proofBonusApplied ? campaign.proof_bonus_amount : null,
    proof_bonus_enabled:  campaign.proof_bonus_enabled,
    rarity:               campaign.rarity || "common",
    proof_tickets:        campaign.proof_bonus_enabled ? ticketsForCampaign(campaign) : 0,
    claimed_at:           claim.claimed_at,
    proof_deadline:       new Date(new Date(claim.claimed_at).getTime() + PROOF_WINDOW_HOURS * 3600 * 1000).toISOString(),
    tx_signature:         null,
  });
}