// Step 2 of a purchase: after the wallet payment confirms, verify it on-chain and unlock the banner for the
// Grove that was bound at checkout (NOT whatever Grove the buyer is in now).
import { adminClient } from "../../../../utils/requireOwner";
import { verifyBannerPayment, PaymentError } from "../../../../utils/solanaPayment";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { intentId, signature, walletAddress } = req.body || {};
  if (!intentId || !signature || !walletAddress || !/^[0-9a-f-]{36}$/i.test(String(intentId))) return res.status(400).json({ error: "Missing required fields" });
  // No Google session needed here: the intent was created by the signed-in member (grove_banner_intent) and fixes
  // the buyer, Grove, banner and price. This lets the wallet step run in Phantom's in-app browser.
  const db = adminClient();

  const { data: intent, error: iErr } = await db.from("grove_banner_purchases").select("*").eq("id", intentId).maybeSingle();
  if (iErr) return res.status(500).json({ error: "Could not load this purchase." });
  if (!intent) return res.status(404).json({ error: "Purchase not found." });
  if (intent.status === "completed") {
    return intent.transaction_signature === signature
      ? res.status(200).json({ success: true, alreadyProcessed: true, groveId: intent.grove_id, bannerId: intent.banner_id })
      : res.status(409).json({ error: "This purchase was already completed." });
  }
  if (intent.status === "duplicate" || intent.status === "failed") return res.status(409).json({ error: "This purchase can't be completed. Contact support with your transaction signature." });

  const { data: banner } = await db.from("grove_banners").select("id,name").eq("id", intent.banner_id).maybeSingle();
  try {
    const { amount } = await verifyBannerPayment({ signature, walletAddress, usdPrice: Number(intent.price_usd), notBeforeMs: new Date(intent.created_at).getTime(), checkoutId: intent.id });

    // Claim the signature in the shared ledger first (unique index = a transaction pays for one thing, once).
    const { error: claimErr } = await db.from("MarketplacePurchases").insert([{
      username: intent.buyer, wallet: walletAddress, item_id: `grove_banner_${intent.banner_id}`,
      item_name: `${banner?.name || intent.banner_id} (Grove banner)`, touchgrass_paid: amount, transaction_signature: signature, status: "approved",
    }]);
    if (claimErr) {
      if (claimErr.code === "23505") {
        const { data: prev } = await db.from("MarketplacePurchases").select("username,item_id").eq("transaction_signature", signature).maybeSingle();
        if (!(prev && prev.username?.toLowerCase() === intent.buyer && prev.item_id === `grove_banner_${intent.banner_id}`)) {
          return res.status(400).json({ error: "This transaction has already been used." });
        }
        // same buyer + same banner retrying: fall through; fulfil is idempotent
      } else throw claimErr;
    }

    const { data: out, error: fErr } = await db.rpc("grove_banner_fulfill", { p_intent: intentId, p_signature: signature, p_tokens: amount });
    if (fErr) throw fErr;
    if (out?.ok === false) {
      if (out.error === "duplicate_payment") {
        return res.status(409).json({ code: "duplicate_payment", signature,
          error: "Your payment went through, but this banner was unlocked for your Grove by another member at the same moment. Your payment is recorded — contact support with your transaction signature for a refund or credit." });
      }
      return res.status(409).json({ error: out.error || "Could not complete purchase." });
    }
    return res.status(200).json({ success: true, groveId: out.grove_id, bannerId: out.banner_id });
  } catch (e) {
    if (e instanceof PaymentError) return res.status(e.status).json({ error: e.message, code: e.code });
    console.error("[groves/banners/verify]", e);
    return res.status(500).json({ error: "Verification failed. Your payment is safe — please retry." });
  }
}
