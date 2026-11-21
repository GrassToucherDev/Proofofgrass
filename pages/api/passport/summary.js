// POST { wallet } — Proof of Grass summary for the WAGO Passport on touchgrass.today.
// SERVER-TO-SERVER ONLY: the touchgrass.today function calls this after it has verified that the collector signed
// a message with `wallet`. It must send the shared secret in `x-passport-secret`. Without the secret (or without
// PASSPORT_PARTNER_SECRET configured) this answers 401, so it can't be used to look up who owns a wallet.
// Only returns something when that wallet is already signature-verified on a Proof of Grass profile.
import { timingSafeEqual } from "crypto";
import { adminClient } from "../../../utils/requireOwner";
import { SOLANA_ADDRESS_RE } from "../../../utils/wagoWalletLink";

function authorized(req) {
  const secret = process.env.PASSPORT_PARTNER_SECRET;
  const given = String(req.headers["x-passport-secret"] || "");
  if (!secret || secret.length < 16 || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const wallet = String(req.body?.wallet || "");
  if (!SOLANA_ADDRESS_RE.test(wallet)) return res.status(400).json({ error: "Invalid wallet address." });

  try {
    const db = adminClient();
    const { data: prof } = await db.from("Profiles").select("username").eq("wallet_address", wallet).eq("wallet_verified", true).maybeSingle();
    if (!prof?.username) return res.status(200).json({ linked: false });
    const username = String(prof.username).toLowerCase();

    const [{ data: s }, { count }] = await Promise.all([
      db.from("Streaks").select("current_streak,best_streak").eq("username", username).maybeSingle(),
      db.from("Submissions").select("id", { count: "exact", head: true }).eq("username", username).in("status", ["pending", "approved"]),
    ]);
    // The Grove is a bonus line: if that lookup fails the rest still returns.
    let grove = null;
    try {
      const { data } = await db.rpc("grove_get", { p_username: username });
      grove = data?.grove?.name ? String(data.grove.name).slice(0, 40) : null;
    } catch (e) { console.error("[passport/summary] grove", e?.message); }

    return res.status(200).json({
      linked: true, username,
      streak: s?.current_streak ?? 0, best: s?.best_streak ?? 0, proofs: count ?? 0, grove,
    });
  } catch (e) {
    console.error("[passport/summary]", e?.message);
    return res.status(500).json({ error: "Could not load summary." });
  }
}
