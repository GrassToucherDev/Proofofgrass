// pages/api/marketplace/verify-purchase.js
const MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const BURN = "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";
const RPC  = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

const COVER_UNLOCKS = {
  retro_covers_pack: ["marketplace_retro_beach","marketplace_retro_mountain","marketplace_retro_sunflower","marketplace_retro_waterfall","marketplace_retro_night"],
  anime_nature_pack: ["marketplace_cherry_blossom","marketplace_torii_forest","marketplace_lake_sunrise","marketplace_beach_coast","marketplace_city_view"],
  y2k_pack:          ["marketplace_chrome_meadow","marketplace_aqua_coast","marketplace_bubble_forest","marketplace_dream_sky","marketplace_cyber_garden"],
  trenches_pack:     ["marketplace_ath_overlook","marketplace_rug_pull_ravine","marketplace_bear_market_blizzard","marketplace_moonbag_camp","marketplace_liquidity_lagoon"],
};

const CONSUMABLE_ITEMS = {
  streak_shield: { consumable_type:"shield",      quantity:1 },
  sunset_pass:   { consumable_type:"sunset_pass", quantity:1 },
};

async function rpcCall(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });

  const { signature, username, itemId, itemName, expectedAmount, walletAddress } = req.body;

  if (!signature || !username || !itemId || !expectedAmount || !walletAddress) {
    return res.status(400).json({ error:"Missing required fields" });
  }

  try {
    // ── 1. Fetch transaction ──────────────────────────────────────────────
    const tx = await rpcCall("getTransaction", [
      signature,
      { encoding:"jsonParsed", maxSupportedTransactionVersion:0, commitment:"confirmed" }
    ]);
    if (!tx) return res.status(400).json({ error:"Transaction not found. It may still be confirming — try again in a moment." });
    if (tx.meta?.err) return res.status(400).json({ error:"Transaction failed on-chain." });

    // ── 2. Verify the transfer ────────────────────────────────────────────
    const instructions      = tx.transaction?.message?.instructions ?? [];
    const innerInstructions = tx.meta?.innerInstructions?.flatMap(i=>i.instructions) ?? [];
    const allInstructions   = [...instructions, ...innerInstructions];

    let verified = false;
    let actualAmount = 0;

    for (const ix of allInstructions) {
      if (ix.program === "spl-token") {
        const info = ix.parsed?.info;
        if (!info) continue;
        if (ix.parsed?.type === "transferChecked") {
          const amount = parseFloat(info.tokenAmount?.uiAmount ?? 0);
          if (info.mint === MINT && amount >= expectedAmount * 0.99) {
            verified = true; actualAmount = amount; break;
          }
        }
        if (ix.parsed?.type === "transfer") {
          const amount = parseFloat(info.amount ?? 0) / 1e6;
          if (amount >= expectedAmount * 0.99) {
            verified = true; actualAmount = amount; break;
          }
        }
      }
    }

    if (!verified) {
      return res.status(400).json({ error:"Could not verify the $TOUCHGRASS transfer. Please ensure you sent the correct amount." });
    }

    // ── 3. Init Supabase ──────────────────────────────────────────────────
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── 4. Check duplicate transaction ───────────────────────────────────
    const { data:existingTx } = await supabase
      .from("MarketplacePurchases")
      .select("id")
      .eq("transaction_signature", signature)
      .maybeSingle();
    if (existingTx) return res.status(400).json({ error:"This transaction has already been used." });

    // ── 5. Check not already owned ────────────────────────────────────────
    const { data:alreadyOwned } = await supabase
      .from("UserInventory")
      .select("item_id")
      .eq("username", username)
      .eq("item_id", itemId)
      .eq("owned", true)
      .maybeSingle();
    if (alreadyOwned) return res.status(400).json({ error:"You already own this item." });

    // ── 6. Record purchase ────────────────────────────────────────────────
    await supabase.from("MarketplacePurchases").insert([{
      username,
      wallet:                walletAddress,
      item_id:               itemId,
      item_name:             itemName,
      touchgrass_paid:       actualAmount,
      transaction_signature: signature,
      status:                "approved",
    }]);

    // ── 7. Write to UserInventory (with tokens_spent) ─────────────────────
    await supabase.from("UserInventory").upsert([{
      username,
      item_id:      itemId,
      owned:        true,
      equipped:     false,
      tokens_spent: actualAmount,          // ← track spend for burn stats
      purchased_at: new Date().toISOString(),
    }], { onConflict:"username,item_id" });

    // ── 8. Unlock covers ──────────────────────────────────────────────────
    const coverSlugs = COVER_UNLOCKS[itemId] ?? [];
    if (coverSlugs.length) {
      const { data:prof } = await supabase
        .from("Profiles")
        .select("unlocked_covers")
        .ilike("username", username)
        .maybeSingle();
      const existing2 = prof?.unlocked_covers ?? [];
      const merged    = [...new Set([...existing2, ...coverSlugs])];
      await supabase.from("Profiles").update({ unlocked_covers:merged }).ilike("username", username);
    }

    // ── 9. Deliver consumables ────────────────────────────────────────────
    if (CONSUMABLE_ITEMS[itemId]) {
      const { consumable_type, quantity } = CONSUMABLE_ITEMS[itemId];
      const { data:existingC } = await supabase
        .from("UserConsumables")
        .select("quantity")
        .ilike("username", username)
        .eq("consumable_type", consumable_type)
        .maybeSingle();
      if (existingC) {
        await supabase.from("UserConsumables")
          .update({ quantity:existingC.quantity+quantity, updated_at:new Date().toISOString() })
          .ilike("username", username)
          .eq("consumable_type", consumable_type);
      } else {
        await supabase.from("UserConsumables").insert([{
          username: username.toLowerCase(), consumable_type, quantity,
        }]);
      }
      if (consumable_type === "shield") {
        const { data:streak } = await supabase
          .from("Streaks").select("shield_count").ilike("username", username).maybeSingle();
        if (streak) {
          await supabase.from("Streaks")
            .update({ shield_count:(streak.shield_count||0)+quantity })
            .ilike("username", username);
        }
      }
    }

    return res.status(200).json({
      success:    true,
      itemId,
      unlockedAt: new Date().toISOString(),
      coverSlugs,
      consumable: CONSUMABLE_ITEMS[itemId] || null,
    });

  } catch(e) {
    console.error("[verify-purchase]", e);
    return res.status(500).json({ error:e.message || "Verification failed. Please try again." });
  }
}