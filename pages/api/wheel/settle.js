// POST /api/wheel/settle — step 2. Verifies the on-chain payment, then asks the database to turn it into exactly one spin.
// No Google session needed (the wallet step can run in Phantom's in-app browser); the unguessable intent id is the key.
import { adminClient, verifyWheelPayment, PaymentError, publicSpin } from "../../../utils/wheel";

const UUID = /^[0-9a-f-]{36}$/i;
const MSG = {
  intent_not_found: "Spin not found.",
  signature_used: "This transaction has already been used.",
  intent_already_paid: "This spin was already paid. Start a new one.",
  underpaid: "Payment is below the price of this spin.",
  pool_empty: "The prize pool needs restocking. Your payment is safe and your spin will be completed.",
  inventory_conflict: "Busy right now. Please retry in a moment. You won't be charged twice.",
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { signature, walletAddress } = req.body || {};
  const id = String(req.body?.checkoutId || "").replace(/^w_/, "");
  if (!signature || !walletAddress || !UUID.test(id)) return res.status(400).json({ error: "Missing required fields" });
  const db = adminClient();

  const { data: intent } = await db.from("wheel_intents").select("*").eq("id", id).maybeSingle();
  if (!intent) return res.status(404).json({ error: MSG.intent_not_found });

  // Same payment again (refresh, retry button, flaky network): hand back the SAME spin.
  const { data: existing } = await db.from("wheel_spins").select("*").eq("payment_tx", signature).maybeSingle();
  if (existing) {
    if (existing.intent_id !== id) return res.status(409).json({ error: MSG.signature_used });
    // A refresh or retry also finishes a prize that was left pending/failed (the grant is idempotent).
    let spin = existing;
    if (["pending", "failed"].includes(existing.fulfillment_status)) {
      await db.rpc("wheel_fulfill", { p_spin: existing.id });
      const { data: fresh } = await db.from("wheel_spins").select("*").eq("id", existing.id).single();
      if (fresh) spin = fresh;
    }
    return res.status(200).json({ success: true, replay: true, spin: publicSpin(spin) });
  }

  let amount;
  try {
    ({ amount } = await verifyWheelPayment({ signature, walletAddress, minTokens: intent.price_tokens, notBeforeMs: new Date(intent.created_at).getTime(), notAfterMs: intent.expires_at ? new Date(intent.expires_at).getTime() + 5 * 60 * 1000 : undefined, checkoutId: intent.id }));
  } catch (e) {
    if (e instanceof PaymentError) return res.status(e.status).json({ error: e.message, code: e.code });
    console.error("[wheel/settle] verify", e);
    return res.status(500).json({ error: "Could not verify the payment. Please retry. You won't be charged twice." });
  }

  const { data, error } = await db.rpc("wheel_spin_settle", { p_intent: id, p_signature: signature, p_wallet: walletAddress, p_received: amount });
  if (error) { console.error("[wheel/settle] rpc", error); return res.status(500).json({ error: "Could not record the spin. Please retry. You won't be charged twice." }); }
  if (!data?.ok) return res.status(data.error === "intent_not_found" ? 404 : 409).json({ error: MSG[data.error] || "Could not complete the spin.", code: data.error });

  // Automatic prizes are granted now; a failure leaves the prize on the spin to be retried, never re-drawn.
  let spin = data.spin;
  if (["pending", "failed"].includes(spin.fulfillment_status)) {
    await db.rpc("wheel_fulfill", { p_spin: spin.id });
  }
  const { data: fresh } = await db.from("wheel_spins").select("*").eq("id", spin.id).single();
  return res.status(200).json({ success: true, replay: !!data.replay, spin: publicSpin(fresh) });
}
