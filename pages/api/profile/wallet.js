// POST   { username, wallet, signature(base64), issuedAt }  -> verify the signature, then save the wallet.
// DELETE { username }                                       -> disconnect.
// Only the Google account that owns the username may call this, and the wallet must sign a fresh message.
import { requireOwner, adminClient } from "../../../utils/requireOwner";
import { verifyWalletSignature } from "../../../utils/verifyWalletSignature";
import { SOLANA_ADDRESS_RE } from "../../../utils/wagoWalletLink";
import { buildProfileWalletMessage, PROFILE_WALLET_TTL_MS } from "../../../utils/profileWallet";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  const who = await requireOwner(req, res, req.body?.username);
  if (!who) return;
  const db = adminClient();

  if (req.method === "DELETE") {
    const { error } = await db.from("Profiles").update({
      wallet_address: null, wallet_verified: false, wallet_verified_at: null, wallet_last_checked_at: null, holder_tier: "none",
    }).ilike("username", who.username);
    if (error) return res.status(500).json({ error: "Could not disconnect." });
    return res.status(200).json({ ok: true });
  }

  const { wallet, signature, issuedAt } = req.body || {};
  if (!wallet || !SOLANA_ADDRESS_RE.test(wallet)) return res.status(400).json({ error: "Invalid Solana address." });
  if (!signature || !issuedAt) return res.status(400).json({ error: "Sign the message in your wallet to verify it." });
  const age = Date.now() - new Date(issuedAt).getTime();
  if (!(age >= -60000 && age <= PROFILE_WALLET_TTL_MS)) return res.status(400).json({ error: "That signature request expired. Please try again." });
  const message = buildProfileWalletMessage({ username: who.username, wallet, issuedAt });
  if (!verifyWalletSignature({ wallet, message, signatureB64: signature })) return res.status(400).json({ error: "Couldn't verify that wallet signature." });

  // One verified wallet per profile.
  const { data: holder } = await db.from("Profiles").select("username").eq("wallet_address", wallet).eq("wallet_verified", true).maybeSingle();
  if (holder && String(holder.username).toLowerCase() !== who.username) {
    return res.status(409).json({ error: `Wallet already linked to @${holder.username}.` });
  }

  const now = new Date().toISOString();
  const { error } = await db.from("Profiles").upsert({
    username: who.username, wallet_address: wallet, wallet_verified: true, wallet_verified_at: now, holder_tier: "none", wallet_last_checked_at: now,
  }, { onConflict: "username" });
  if (error) return res.status(500).json({ error: "Could not save the wallet." });
  return res.status(200).json({ ok: true, wallet });
}
