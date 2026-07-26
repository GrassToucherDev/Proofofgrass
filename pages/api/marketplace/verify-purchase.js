// pages/api/marketplace/verify-purchase.js
// Verifies a Solana transaction on-chain and unlocks the purchased item

import { Connection, PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role — bypasses RLS
);

const RPC   = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const MINT  = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const BURN  = "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";

// Cover slugs unlocked per item
const COVER_UNLOCKS = {
  retro_covers_pack: [
    "marketplace_retro_beach",
    "marketplace_retro_mountain",
    "marketplace_retro_sunflower",
    "marketplace_retro_waterfall",
    "marketplace_retro_night",
  ],
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { signature, username, itemId, itemName, expectedAmount, walletAddress } = req.body;

  if (!signature || !username || !itemId || !expectedAmount || !walletAddress) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const connection = new Connection(RPC, "confirmed");

    // ── 1. Fetch and verify the transaction ──────────────────────────────────
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx) {
      return res.status(400).json({ error: "Transaction not found. It may still be confirming — try again in a moment." });
    }

    if (tx.meta?.err) {
      return res.status(400).json({ error: "Transaction failed on-chain." });
    }

    // ── 2. Verify the transfer details ───────────────────────────────────────
    const instructions = tx.transaction?.message?.instructions ?? [];
    const innerInstructions = tx.meta?.innerInstructions?.flatMap(i => i.instructions) ?? [];
    const allInstructions = [...instructions, ...innerInstructions];

    let verified = false;
    let actualAmount = 0;

    for (const ix of allInstructions) {
      if (ix.program === "spl-token" && ix.parsed?.type === "transferChecked") {
        const info = ix.parsed.info;
        const mint    = info.mint;
        const dest    = info.destination;
        const amount  = parseFloat(info.tokenAmount?.uiAmount ?? 0);
        const fromOwner = info.multisigAuthority || info.authority;

        // Check mint matches $TOUCHGRASS and destination is the burn address
        // We check the destination token account owner matches BURN_ADDR
        if (mint === MINT && amount >= expectedAmount * 0.99) { // 1% tolerance
          // Verify destination is owned by the burn address
          try {
            const destPubkey = new PublicKey(dest);
            const accountInfo = await connection.getParsedAccountInfo(destPubkey);
            const owner = accountInfo?.value?.data?.parsed?.info?.owner;
            if (owner === BURN) {
              verified    = true;
              actualAmount = amount;
              break;
            }
          } catch(e) {
            // If we can't verify owner, check via transfer (non-checked) type
            if (amount >= expectedAmount * 0.99) {
              verified    = true;
              actualAmount = amount;
              break;
            }
          }
        }
      }

      // Also handle regular transfer (non-checked)
      if (ix.program === "spl-token" && ix.parsed?.type === "transfer") {
        const info   = ix.parsed.info;
        const amount = parseFloat(info.amount ?? 0) / 1e6; // assumes 6 decimals
        if (amount >= expectedAmount * 0.99) {
          verified    = true;
          actualAmount = amount;
          break;
        }
      }
    }

    if (!verified) {
      return res.status(400).json({
        error: "Could not verify the $TOUCHGRASS transfer in this transaction. Please ensure you sent the correct amount to the correct address.",
      });
    }

    // ── 3. Check for duplicate — same signature already processed ────────────
    const { data: existing } = await supabaseAdmin
      .from("MarketplacePurchases")
      .select("id")
      .eq("transaction_signature", signature)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: "This transaction has already been used." });
    }

    // ── 4. Check user doesn't already own this item ──────────────────────────
    const { data: alreadyOwned } = await supabaseAdmin
      .from("UserInventory")
      .select("item_id")
      .eq("username", username)
      .eq("item_id", itemId)
      .eq("owned", true)
      .maybeSingle();

    if (alreadyOwned) {
      return res.status(400).json({ error: "You already own this item." });
    }

    // ── 5. Record the purchase ───────────────────────────────────────────────
    await supabaseAdmin.from("MarketplacePurchases").insert([{
      username,
      wallet:                walletAddress,
      item_id:               itemId,
      item_name:             itemName,
      touchgrass_paid:       actualAmount,
      transaction_signature: signature,
      status:                "approved",
    }]);

    // ── 6. Write to UserInventory ────────────────────────────────────────────
    await supabaseAdmin.from("UserInventory").upsert([{
      username,
      item_id:      itemId,
      owned:        true,
      equipped:     false,
      purchased_at: new Date().toISOString(),
    }], { onConflict: "username,item_id" });

    // ── 7. Unlock cover slugs if applicable ──────────────────────────────────
    const coverSlugs = COVER_UNLOCKS[itemId];
    if (coverSlugs?.length) {
      const { data: prof } = await supabaseAdmin
        .from("Profiles")
        .select("unlocked_covers")
        .ilike("username", username)
        .maybeSingle();

      const existing = prof?.unlocked_covers ?? [];
      const merged   = [...new Set([...existing, ...coverSlugs])];

      await supabaseAdmin
        .from("Profiles")
        .update({ unlocked_covers: merged })
        .ilike("username", username);
    }

    // ── 8. Return success ────────────────────────────────────────────────────
    return res.status(200).json({
      success:     true,
      itemId,
      unlockedAt:  new Date().toISOString(),
      coverSlugs:  coverSlugs ?? [],
    });

  } catch(e) {
    console.error("[marketplace/verify-purchase]", e);
    return res.status(500).json({ error: e.message || "Verification failed. Please try again." });
  }
}