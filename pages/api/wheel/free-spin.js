// POST /api/wheel/free-spin — spend one admin-granted free spin. No payment; the prize is drawn by the same database function as a paid spin.
import { requireOwner } from "../../../utils/requireOwner";
import { adminClient, isWheelTester, publicSpinWithBadge } from "../../../utils/wheel";
import { hasConsent } from "../../../utils/prizes";

const MSG = {
  not_active: "The WAGO Wheel isn't open right now.",
  not_playable: "The WAGO Wheel is being restocked. Check back soon.",
  no_credit: "You don't have any free spins left.",
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.username);
  if (!who) return;
  const db = adminClient();
  let consented;
  try { consented = await hasConsent(db, who.googleId); }
  catch (e) { console.error("[wheel/free-spin] consent check", e); return res.status(503).json({ error: "Couldn't check your terms acceptance. Please try again in a moment." }); }
  if (!consented) return res.status(403).json({ error: "Please accept the terms first.", code: "consent_required" });

  const { data, error } = await db.rpc("wheel_free_spin", { p_google: who.googleId, p_username: who.username, p_is_tester: isWheelTester(who.username) });
  if (error) {
    console.error("[wheel/free-spin]", error);
    const pool = /free_spin_failed:pool_empty/.test(error.message || "");
    return res.status(pool ? 409 : 500).json({ error: pool ? "The prize pool needs restocking. Your free spin wasn't used." : "Couldn't use your free spin. It wasn't used. Please try again." });
  }
  if (!data?.ok) return res.status(409).json({ error: MSG[data.error] || "Couldn't use your free spin.", reason: data.error });

  let spin = data.spin;
  if (["pending", "failed"].includes(spin.fulfillment_status)) await db.rpc("wheel_fulfill", { p_spin: spin.id });
  const { data: fresh } = await db.from("wheel_spins").select("*").eq("id", spin.id).single();
  return res.status(200).json({ success: true, remaining: data.remaining, spin: await publicSpinWithBadge(db, fresh) });
}
