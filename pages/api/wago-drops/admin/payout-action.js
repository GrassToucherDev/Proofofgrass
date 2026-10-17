// pages/api/wago-drops/admin/payout-action.js
// POST { claimId, action: "retry" | "mark_paid", txSignature? }  (header x-wago-admin-secret)
//   retry     — failed → pending (clears the error) so the next payout run picks it up
//   mark_paid — mark a claim paid by hand (e.g. you sent it manually); needs a tx signature
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const secret = req.headers["x-wago-admin-secret"];
  if (!secret || secret !== process.env.WAGO_ADMIN_SECRET) return res.status(401).json({ error: "Unauthorized" });

  const { claimId, action, txSignature } = req.body || {};
  if (!claimId || !action) return res.status(400).json({ error: "claimId and action required" });

  const { data: claim } = await supabase
    .from("wago_drop_claims").select("id, status, reward_metadata").eq("id", claimId).maybeSingle();
  if (!claim) return res.status(404).json({ error: "Claim not found" });

  if (action === "retry") {
    if (claim.status !== "failed") return res.status(400).json({ error: "Only failed claims can be retried" });
    const meta = { ...(claim.reward_metadata || {}) };
    delete meta.error;
    meta.retried_at = new Date().toISOString();
    const { error } = await supabase.from("wago_drop_claims").update({ status: "pending", reward_metadata: meta }).eq("id", claimId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, status: "pending" });
  }

  if (action === "mark_paid") {
    if (claim.status === "completed") return res.status(400).json({ error: "Already completed" });
    const sig = String(txSignature || "").trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(sig)) return res.status(400).json({ error: "Enter a valid transaction signature" });
    const meta = { ...(claim.reward_metadata || {}), marked_paid_manually: new Date().toISOString() };
    const { error } = await supabase.from("wago_drop_claims").update({ status: "completed", tx_signature: sig, reward_metadata: meta }).eq("id", claimId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, status: "completed" });
  }

  return res.status(400).json({ error: "Unknown action" });
}
