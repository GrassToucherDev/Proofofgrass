// pages/api/wago-drops/proof.js
// Step 1 of the WAGO Drops Proof bonus: validate the proof photo.
//
// The client uploads the photo to the existing `proof-photos` Supabase storage
// bucket (same bucket the main Proof of Grass flow uses) at
// `wago-drops/<claimId>.jpg`, then calls this endpoint with the claim id and
// the device's current coordinates. Server-side we verify:
//   - the claim belongs to the signed-in user
//   - the 24h Proof window is still open
//   - the campaign has the Proof bonus enabled
//   - no proof exists yet for this claim (one per claim)
//   - the photo actually exists in storage at the expected path
//   - the proof location is within 100m of the drop
//
// On success a wago_drop_proofs row is created with status "photo_approved".
// Ticket award happens later in proof-confirm.js once the X post URL is pasted.

import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { PROOF_RADIUS_M, PROOF_WINDOW_HOURS, ticketsForCampaign } from "../../../utils/wagoProofBonus";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });
  const googleId = session.user.google_id;

  const { claimId, photoPath, lat, lng } = req.body || {};
  if (!claimId || !photoPath || lat == null || lng == null) {
    return res.status(400).json({ error: "claimId, photoPath, lat, lng required" });
  }

  // Photo must live at the expected path for this claim (prevents pointing at
  // someone else's upload).
  const expectedPath = `wago-drops/${claimId}.jpg`;
  if (photoPath !== expectedPath) {
    return res.status(400).json({ error: "Invalid photo path" });
  }

  // ── Load claim (must belong to this user) ────────────────────────────────
  const { data: claim, error: claimErr } = await supabase
    .from("wago_drop_claims")
    .select("id, google_id, location_id, campaign_id, claimed_at, wallet_address")
    .eq("id", claimId)
    .single();
  if (claimErr || !claim) return res.status(404).json({ error: "Claim not found" });
  if (claim.google_id !== googleId) return res.status(403).json({ error: "Not your claim" });

  // ── 24h window ───────────────────────────────────────────────────────────
  const claimedAt = new Date(claim.claimed_at).getTime();
  const deadline  = claimedAt + PROOF_WINDOW_HOURS * 3600 * 1000;
  if (Date.now() > deadline) {
    return res.status(400).json({ error: `The ${PROOF_WINDOW_HOURS}h Proof bonus window for this claim has closed.` });
  }

  // ── Campaign must have the bonus enabled ─────────────────────────────────
  const { data: campaign } = await supabase
    .from("wago_drop_campaigns")
    .select("*")
    .eq("id", claim.campaign_id)
    .single();
  if (!campaign?.proof_bonus_enabled) {
    return res.status(400).json({ error: "This drop has no Proof bonus." });
  }

  // ── One proof per claim ──────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("wago_drop_proofs")
    .select("id, status")
    .eq("claim_id", claimId)
    .maybeSingle();
  if (existing) {
    return res.status(400).json({
      error: existing.status === "awarded"
        ? "Proof bonus already completed for this claim."
        : "A proof photo was already submitted for this claim.",
      status: existing.status,
    });
  }

  // ── Location: within 100m of the drop ────────────────────────────────────
  const { data: loc } = await supabase
    .from("wago_drop_locations")
    .select("id, lat, lng")
    .eq("id", claim.location_id)
    .single();
  if (!loc) return res.status(404).json({ error: "Drop location not found" });

  const distance = haversineM(Number(lat), Number(lng), loc.lat, loc.lng);
  if (distance > PROOF_RADIUS_M) {
    return res.status(400).json({
      error: `Proof location is ${Math.round(distance)}m from the drop — must be within ${PROOF_RADIUS_M}m.`,
      distance_m: Math.round(distance),
    });
  }

  // ── Photo must actually exist in the proof-photos bucket ─────────────────
  const { data: signed, error: storageErr } = await supabase.storage
    .from("proof-photos")
    .createSignedUrl(photoPath, 60);
  if (storageErr || !signed?.signedUrl) {
    return res.status(400).json({ error: "Proof photo not found in storage. Upload it first." });
  }

  // ── Resolve Proof of Grass username via verified wallet (Profiles) ───────
  let pogUsername = null;
  if (claim.wallet_address) {
    const { data: profile } = await supabase
      .from("Profiles")
      .select("username")
      .eq("wallet_address", claim.wallet_address)
      .maybeSingle();
    if (profile?.username) pogUsername = profile.username;
  }

  // ── Record the approved proof ────────────────────────────────────────────
  const { data: proof, error: insErr } = await supabase
    .from("wago_drop_proofs")
    .insert({
      claim_id:    claimId,
      google_id:   googleId,
      photo_path:  photoPath,
      proof_lat:   Number(lat),
      proof_lng:   Number(lng),
      distance_m:  Math.round(distance),
      status:      "photo_approved",
      pog_username: pogUsername,
    })
    .select()
    .single();

  if (insErr) {
    if (insErr.code === "23505") return res.status(400).json({ error: "A proof was already submitted for this claim." });
    return res.status(500).json({ error: insErr.message });
  }

  return res.status(200).json({
    ok:           true,
    proof_id:     proof.id,
    distance_m:   Math.round(distance),
    pog_username: pogUsername,
    tickets:      ticketsForCampaign(campaign),
    deadline:     new Date(deadline).toISOString(),
  });
}
