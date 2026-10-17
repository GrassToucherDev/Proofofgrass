// pages/api/wago-drops/link-wallet.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";
import { buildLinkMessage, SOLANA_ADDRESS_RE, WALLET_LINK_TTL_MS } from "../../../utils/wagoWalletLink";
import { verifyWalletSignature } from "../../../utils/verifyWalletSignature";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });

  const { wallet, signature, issuedAt } = req.body || {};
  if (!wallet) return res.status(400).json({ error: "wallet required" });

  // Validate Solana address (base58, 32-44 chars)
  if (!SOLANA_ADDRESS_RE.test(wallet)) {
    return res.status(400).json({ error: "Invalid Solana address" });
  }

  // Signed link (connected wallet) = verified. Pasted address (no signature) = unverified.
  let verified = false;
  if (signature) {
    const age = Date.now() - new Date(issuedAt).getTime();
    if (!issuedAt || !(age >= -60000 && age <= WALLET_LINK_TTL_MS)) {
      return res.status(400).json({ error: "That signature request expired. Please try again." });
    }
    const message = buildLinkMessage({ googleId: session.user.google_id, wallet, issuedAt });
    if (!verifyWalletSignature({ wallet, message, signatureB64: signature })) {
      return res.status(400).json({ error: "Couldn't verify that wallet signature." });
    }
    verified = true;
  }

  // One wallet per account. A verified owner can take over an address that
  // someone else only pasted in; nobody can take one that's been verified.
  const { data: holder } = await supabase
    .from("wago_google_accounts")
    .select("google_id, wallet_verified")
    .eq("linked_wallet", wallet)
    .neq("google_id", session.user.google_id)
    .maybeSingle();
  if (holder) {
    if (holder.wallet_verified || !verified) {
      return res.status(409).json({ error: "That wallet is already linked to another account." });
    }
    await supabase.from("wago_google_accounts")
      .update({ linked_wallet: null, wallet_verified: false })
      .eq("google_id", holder.google_id);
  }

  // Check 24-hour cooldown
  const { data: existing } = await supabase
    .from("wago_google_accounts")
    .select("wallet_linked_at")
    .eq("google_id", session.user.google_id)
    .single();

  if (existing?.wallet_linked_at) {
    const hoursSince = (Date.now() - new Date(existing.wallet_linked_at).getTime()) / 3600000;
    if (hoursSince < 24) {
      const hoursLeft = Math.ceil(24 - hoursSince);
      return res.status(429).json({ error: `Wallet can only be changed once every 24 hours. Try again in ${hoursLeft}h.` });
    }
  }

  const { error } = await supabase
    .from("wago_google_accounts")
    .upsert({
      google_id: session.user.google_id,
      linked_wallet: wallet,
      wallet_verified: verified,
      wallet_linked_at: new Date().toISOString(),
    }, { onConflict: "google_id" });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, verified });
}