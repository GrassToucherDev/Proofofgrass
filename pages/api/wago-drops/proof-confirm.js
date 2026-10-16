// pages/api/wago-drops/proof-confirm.js
// Step 2 of the WAGO Drops Proof bonus: confirm the X post and award tickets.
//
// After the proof photo is approved (proof.js) and the user posts their share
// card to X, they paste the post URL here. We validate the URL shape, resolve
// their Proof of Grass username (verified-wallet Profiles bridge, or the
// username they supply, validated against Profiles/Streaks), then award the
// configured Grass Tickets through the existing /api/grass-draw/award-bonus
// endpoint — which handles the active cycle, disqualifications, the ledger,
// and total recalculation. Tickets land in whatever cycle is active at
// confirmation time and do not roll over (existing Grass Draw behavior).

import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { PROOF_WINDOW_HOURS, ticketsForCampaign, isValidXPostUrl } from "../../../utils/wagoProofBonus";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });
  const googleId = session.user.google_id;

  const { claimId, xPostUrl, pogUsername } = req.body || {};
  if (!claimId || !xPostUrl) return res.status(400).json({ error: "claimId and xPostUrl required" });

  // ── X post URL shape validation ──────────────────────────────────────────
  if (!isValidXPostUrl(xPostUrl)) {
    return res.status(400).json({ error: "That doesn't look like a valid X post link. It should look like https://x.com/you/status/123…" });
  }

  // ── Load proof + claim ───────────────────────────────────────────────────
  const { data: proof } = await supabase
    .from("wago_drop_proofs")
    .select("id, claim_id, google_id, status, pog_username")
    .eq("claim_id", claimId)
    .maybeSingle();
  if (!proof) return res.status(404).json({ error: "No approved proof photo for this claim yet." });
  if (proof.google_id !== googleId) return res.status(403).json({ error: "Not your claim" });
  if (proof.status === "awarded") return res.status(400).json({ error: "Proof bonus already completed for this claim." });

  const { data: claim } = await supabase
    .from("wago_drop_claims")
    .select("id, claimed_at, campaign_id, wallet_address")
    .eq("id", claimId)
    .single();
  if (!claim) return res.status(404).json({ error: "Claim not found" });

  // ── 24h window (whole flow must finish inside it) ────────────────────────
  const deadline = new Date(claim.claimed_at).getTime() + PROOF_WINDOW_HOURS * 3600 * 1000;
  if (Date.now() > deadline) {
    await supabase.from("wago_drop_proofs").update({ status: "expired" }).eq("id", proof.id);
    return res.status(400).json({ error: `The ${PROOF_WINDOW_HOURS}h Proof bonus window for this claim has closed.` });
  }

  // ── Resolve Proof of Grass username ──────────────────────────────────────
  let username = proof.pog_username || null;
  if (!username && pogUsername) {
    const candidate = String(pogUsername).trim().replace(/^@/, "").toLowerCase();
    if (candidate) {
      const [{ data: prof }, { data: streak }] = await Promise.all([
        supabase.from("Profiles").select("username").ilike("username", candidate).maybeSingle(),
        supabase.from("Streaks").select("username").ilike("username", candidate).maybeSingle(),
      ]);
      if (prof?.username || streak?.username) username = candidate;
      else return res.status(400).json({ error: `No Proof of Grass account found for @${candidate}.`, need_username: true });
    }
  }
  if (!username) {
    return res.status(400).json({
      error: "Enter your Proof of Grass username so we know where to send your Grass Tickets.",
      need_username: true,
    });
  }

  // ── Ticket amount: per-drop override or rarity default ───────────────────
  const { data: campaign } = await supabase
    .from("wago_drop_campaigns")
    .select("*")
    .eq("id", claim.campaign_id)
    .single();
  const tickets = ticketsForCampaign(campaign);

  // ── Award through the existing Grass Draw bonus endpoint ─────────────────
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers.host;
  const awardRes = await fetch(`${proto}://${host}/api/grass-draw/award-bonus`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": process.env.SUPABASE_SERVICE_ROLE_KEY },
    body: JSON.stringify({
      username,
      entry_type: "wago_proof",
      source_id:  claimId,
      amount:     tickets,
      notes:      `WAGO Drops proof bonus — ${campaign?.name || "drop"} (${xPostUrl})`,
    }),
  });
  const awardData = await awardRes.json().catch(() => ({}));
  if (!awardRes.ok) {
    return res.status(400).json({ error: awardData.error || "Couldn't award Grass Tickets." });
  }

  // ── Mark proof awarded ───────────────────────────────────────────────────
  await supabase.from("wago_drop_proofs").update({
    status:          "awarded",
    x_post_url:      xPostUrl.trim(),
    pog_username:    username,
    tickets_awarded: tickets,
    awarded_at:      new Date().toISOString(),
  }).eq("id", proof.id);

  return res.status(200).json({
    ok:       true,
    tickets,
    username,
    totals:   awardData.totals || null,
  });
}
