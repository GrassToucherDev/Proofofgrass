// POST /api/wheel/intent — step 1 of a spin. Fixes the token price and the lock/ecosystem split before the wallet pays.
import { requireOwner } from "../../../utils/requireOwner";
import { adminClient, currentTokenPriceUsd, isWheelTester } from "../../../utils/wheel";
import { hasConsent } from "../../../utils/prizes";

const MSG = {
  not_active: "The WAGO Wheel isn't open right now.",
  not_playable: "The WAGO Wheel is being restocked. Check back soon.",
  rate_limited: "Too many attempts. Try again in a bit.",
  price_unavailable: "Price feed unavailable. Try again in a minute.",
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.username);
  if (!who) return;
  const db = adminClient();
  let consented;
  try { consented = await hasConsent(db, who.googleId); }
  catch (e) { console.error("[wheel/intent] consent check", e); return res.status(503).json({ error: "Couldn't check your terms acceptance. Please try again in a moment." }); }
  if (!consented) return res.status(403).json({ error: "Please accept the terms first.", code: "consent_required" });
  const { data: w } = await db.from("wheels").select("id, price_mode").eq("featured", true).eq("status", "active").maybeSingle();
  if (!w) return res.status(409).json({ error: MSG.not_active, reason: "not_active" });
  let price = null;
  if (w.price_mode === "usd") { try { price = await currentTokenPriceUsd(); } catch { return res.status(503).json({ error: MSG.price_unavailable }); } }
  const { data, error } = await db.rpc("wheel_intent_create", { p_wheel: w.id, p_google: who.googleId, p_username: who.username, p_token_price_usd: price, p_is_tester: isWheelTester(who.username) });
  if (error) { console.error("[wheel/intent]", error); return res.status(500).json({ error: "Couldn't start the spin." }); }
  if (!data?.ok) return res.status(409).json({ error: MSG[data.error] || "Couldn't start the spin.", reason: data.error });
  return res.status(200).json({ ok: true, checkoutId: `w_${data.intent_id}`, tokens: Number(data.price_tokens), lockAmount: Number(data.lock_amount),
    ecoAmount: Number(data.eco_amount), usdPrice: data.price_usd == null ? null : Number(data.price_usd), expiresAt: data.expires_at });
}
