// pages/api/wago-drops/my-claims.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { PROOF_WINDOW_HOURS, ticketsForCampaign } from "../../../utils/wagoProofBonus";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });

  const { data, error } = await supabase
    .from("wago_drop_claims")
    .select(`id, reward_type, reward_amount, proof_bonus_applied, proof_bonus_amount,
             tx_signature, status, claimed_at,
             wago_drop_campaigns ( name, image_url, reward_symbol, reward_logo_url, reward_token_mint, rarity, proof_bonus_enabled, proof_bonus_tickets )`)
    .eq("google_id", session.user.google_id)
    .order("claimed_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Proof bonus status per claim + Grass Tickets earned this (UTC) month.
  const ids = (data || []).map(c => c.id);
  const proofByClaim = {};
  if (ids.length) {
    const { data: proofs } = await supabase
      .from("wago_drop_proofs")
      .select("claim_id, status, tickets_awarded, awarded_at, photo_path, pog_username")
      .in("claim_id", ids);
    (proofs || []).forEach(p => { proofByClaim[p.claim_id] = p; });
  }
  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  let ticketsThisMonth = 0;
  const claims = (data || []).map(c => {
    const p = proofByClaim[c.id];
    if (p?.status === "awarded" && p.awarded_at && new Date(p.awarded_at).getTime() >= monthStart) {
      ticketsThisMonth += Number(p.tickets_awarded || 0);
    }
    const camp = c.wago_drop_campaigns || {};
    const deadline = new Date(c.claimed_at).getTime() + PROOF_WINDOW_HOURS * 3600 * 1000;
    const proofOpen = !!camp.proof_bonus_enabled && p?.status !== "awarded" && Date.now() < deadline;
    return {
      ...c,
      proof_status: p?.status ?? null,
      tickets_awarded: p?.tickets_awarded ?? null,
      // Resume info: lets My Drops offer "Finish proof" while the 24h window is open.
      proof_open: proofOpen,
      proof_deadline: new Date(deadline).toISOString(),
      proof_tickets: camp.proof_bonus_enabled ? ticketsForCampaign(camp) : 0,
      rarity: camp.rarity || "common",
      image_url: camp.image_url || null,
      reward_symbol: camp.reward_symbol || null,
      reward_logo_url: camp.reward_logo_url || null,
      reward_token_mint: camp.reward_token_mint || null,
      proof_photo_path: p?.status === "photo_approved" ? p.photo_path : null,
      proof_pog_username: p?.pog_username ?? null,
    };
  });

  return res.status(200).json({ claims, tickets_this_month: ticketsThisMonth });
}