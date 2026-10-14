// pages/api/wago-drops/claim.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import bs58 from "bs58";

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

  const { locationId, userLat, userLng } = req.body;
  if (!locationId || userLat == null || userLng == null) {
    return res.status(400).json({ error: "locationId, userLat, userLng required" });
  }

  const googleId = session.user.google_id;

  // Load location + campaign
  const { data: loc, error: locErr } = await supabase
    .from("wago_drop_locations")
    .select(`id, lat, lng, max_claims, claim_count, campaign_id,
             wago_drop_campaigns ( id, name, status, starts_at, ends_at,
               reward_type, reward_amount, reward_token_mint, reward_metadata,
               proof_bonus_enabled, proof_bonus_amount, claim_radius_m )`)
    .eq("id", locationId)
    .eq("is_active", true)
    .single();

  if (locErr || !loc) return res.status(404).json({ error: "Drop not found" });

  const campaign = loc.wago_drop_campaigns;
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
    .select("linked_wallet")
    .eq("google_id", googleId)
    .single();
  if (!account?.linked_wallet) return res.status(400).json({ error: "No wallet linked" });

  // Check proof bonus eligibility
  let proofBonusApplied = false;
  if (campaign.proof_bonus_enabled && campaign.proof_bonus_amount) {
    const { data: grassEntry } = await supabase
      .from("GrassDrawEntries")
      .select("id")
      .eq("wallet", account.linked_wallet)
      .limit(1)
      .single();
    proofBonusApplied = !!grassEntry;
  }

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
      status:               "processing",
      claimed_lat:          userLat,
      claimed_lng:          userLng,
    })
    .select()
    .single();

  if (claimErr) {
    if (claimErr.code === "23505") return res.status(400).json({ error: "Already claimed" });
    return res.status(500).json({ error: claimErr.message });
  }

  // Increment claim count
  await supabase.rpc("increment_wago_claim_count", { loc_id: locationId });

  // Send SPL token reward
  let txSignature = null;
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com", "confirmed");
    const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(process.env.WAGO_DROPS_TREASURY_WALLET));
    const mintPubkey = new PublicKey(campaign.reward_token_mint);
    const recipientPubkey = new PublicKey(account.linked_wallet);

    const fromATA = await getOrCreateAssociatedTokenAccount(connection, treasuryKeypair, mintPubkey, treasuryKeypair.publicKey);
    const toATA = await getOrCreateAssociatedTokenAccount(connection, treasuryKeypair, mintPubkey, recipientPubkey);

    const amount = BigInt(Math.round(Number(campaign.reward_amount) * 1e6));
    txSignature = await transfer(connection, treasuryKeypair, fromATA.address, toATA.address, treasuryKeypair, amount);

    // Send proof bonus
    if (proofBonusApplied) {
      const bonusAmount = BigInt(Math.round(Number(campaign.proof_bonus_amount) * 1e6));
      const bonusTx = await transfer(connection, treasuryKeypair, fromATA.address, toATA.address, treasuryKeypair, bonusAmount);
      await supabase.from("wago_drop_proof_bonuses").insert({
        claim_id: claim.id, google_id: googleId,
        wallet_address: account.linked_wallet,
        bonus_amount: campaign.proof_bonus_amount,
        tx_signature: bonusTx,
      });
    }

    await supabase.from("wago_drop_claims").update({ tx_signature: txSignature, status: "completed" }).eq("id", claim.id);
  } catch (txErr) {
    console.error("[wago-drops/claim] TX error:", txErr);
    await supabase.from("wago_drop_claims").update({ status: "failed" }).eq("id", claim.id);
    return res.status(200).json({ ok: true, message: "Claim recorded. Reward delivery pending — contact support if not received within 24h.", tx: null });
  }

  return res.status(200).json({ ok: true, message: "Drop claimed! Reward sent.", tx: txSignature });
}