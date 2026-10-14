// pages/api/wago-drops/link-wallet.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });

  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "wallet required" });

  // Validate Solana address (base58, 32-44 chars)
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return res.status(400).json({ error: "Invalid Solana address" });
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
      wallet_linked_at: new Date().toISOString(),
    }, { onConflict: "google_id" });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}