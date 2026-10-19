// pages/api/marketplace/verify-purchase.js
import { MARKET_PRICES_USD, MARKET_ITEM_NAMES } from "../../../utils/marketplaceCatalog";
const MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const BURN = "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";
const RPC  = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

const COVER_UNLOCKS = {
  retro_covers_pack: ["marketplace_retro_beach","marketplace_retro_mountain","marketplace_retro_sunflower","marketplace_retro_waterfall","marketplace_retro_night"],
  anime_nature_pack: ["marketplace_cherry_blossom","marketplace_torii_forest","marketplace_lake_sunrise","marketplace_beach_coast","marketplace_city_view"],
  y2k_pack:          ["marketplace_chrome_meadow","marketplace_aqua_coast","marketplace_bubble_forest","marketplace_dream_sky","marketplace_cyber_garden"],
  trenches_pack:          ["marketplace_ath_overlook","marketplace_rug_pull_ravine","marketplace_bear_market_blizzard","marketplace_moonbag_camp","marketplace_liquidity_lagoon"],
  blockchain_trails_pack: ["marketplace_bitcoin_bay","marketplace_ethereum_lake","marketplace_bnb_dunes","marketplace_robinhood_range","marketplace_solana_springs"],
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

const TOKEN_PRICE_TOLERANCE = 0.8;      // accept >= 80% of the current quote (memecoin price moves between quote and pay)
const MAX_TX_AGE_SEC = 2 * 60 * 60;     // a payment must be recent

async function currentTokenPriceUsd() {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MINT}`, { headers:{ Accept:"application/json" } });
  if (!r.ok) throw new Error("price_unavailable");
  const d = await r.json();
  const p = parseFloat(d?.pairs?.[0]?.priceUsd ?? "0");
  if (!(p > 0)) throw new Error("price_unavailable");
  return p;
}

// Net change of `owner`'s balance of MINT in this tx, in whole tokens.
function mintDelta(tx, owner) {
  const sum = (list) => (list || [])
    .filter(b => b.mint === MINT && b.owner === owner)
    .reduce((acc, b) => acc + Number(b.uiTokenAmount?.amount || 0) / Math.pow(10, b.uiTokenAmount?.decimals ?? 6), 0);
  return sum(tx.meta?.postTokenBalances) - sum(tx.meta?.preTokenBalances);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });

  const { signature, itemId, walletAddress } = req.body || {};
  const username = String(req.body?.username || "").replace(/@/g, "").toLowerCase().trim();

  if (!signature || !username || !itemId || !walletAddress) {
    return res.status(400).json({ error:"Missing required fields" });
  }
  // Price and name come from the server, never from the request.
  const usdPrice = MARKET_PRICES_USD[itemId];
  if (!usdPrice) return res.status(400).json({ error:"Unknown item." });
  const itemName = MARKET_ITEM_NAMES[itemId];
  const isConsumable = !!CONSUMABLE_ITEMS[itemId];

  try {
    // ── 1. Fetch transaction ──────────────────────────────────────────────
    const tx = await rpcCall("getTransaction", [
      signature,
      { encoding:"jsonParsed", maxSupportedTransactionVersion:0, commitment:"confirmed" }
    ]);
    if (!tx) return res.status(400).json({ error:"Transaction not found. It may still be confirming — try again in a moment." });
    if (tx.meta?.err) return res.status(400).json({ error:"Transaction failed on-chain." });
    if (!tx.blockTime || Date.now()/1000 - tx.blockTime > MAX_TX_AGE_SEC) {
      return res.status(400).json({ error:"This payment is too old to verify. Contact support with your transaction signature." });
    }

    // ── 2. Verify who paid, who got paid, and how much ────────────────────
    const signers = (tx.transaction?.message?.accountKeys || [])
      .filter(k => k.signer).map(k => k.pubkey);
    if (!signers.includes(walletAddress)) {
      return res.status(400).json({ error:"That wallet did not sign this transaction." });
    }
    const received = mintDelta(tx, BURN);              // $TOUCHGRASS that landed in the burn wallet
    const sent     = -mintDelta(tx, walletAddress);    // $TOUCHGRASS that left the paying wallet
    const actualAmount = received;
    if (!(received > 0) || sent < received * 0.99) {
      return res.status(400).json({ error:"Could not verify a $TOUCHGRASS payment to the burn wallet in this transaction." });
    }

    // ── 3. Check the amount against the server-side price ─────────────────
    let tokenPrice;
    try { tokenPrice = await currentTokenPriceUsd(); }
    catch { return res.status(503).json({ error:"Price feed unavailable — your payment is safe, please retry verification in a minute." }); }
    const required = (usdPrice / tokenPrice) * TOKEN_PRICE_TOLERANCE;
    if (received < required) {
      return res.status(400).json({ error:"Payment amount is below the price of this item." });
    }

    // ── 4. Init Supabase ──────────────────────────────────────────────────
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── 5. Already owned? (cosmetics only — consumables can be bought repeatedly) ──
    if (!isConsumable) {
      const { data:alreadyOwned } = await supabase
        .from("UserInventory").select("item_id")
        .ilike("username", username).eq("item_id", itemId).eq("owned", true).maybeSingle();
      if (alreadyOwned) return res.status(400).json({ error:"You already own this item." });
    }

    // ── 6. Claim the signature (unique index makes this atomic) ───────────
    const { error:claimErr } = await supabase.from("MarketplacePurchases").insert([{
      username,
      wallet:                walletAddress,
      item_id:               itemId,
      item_name:             itemName,
      touchgrass_paid:       actualAmount,
      transaction_signature: signature,
      status:                "approved",
    }]);
    if (claimErr) {
      if (claimErr.code === "23505") {
        const { data:prev } = await supabase.from("MarketplacePurchases")
          .select("username,item_id").eq("transaction_signature", signature).maybeSingle();
        if (prev && prev.username?.toLowerCase() === username && prev.item_id === itemId) {
          return res.status(200).json({ success:true, itemId, alreadyProcessed:true, coverSlugs:COVER_UNLOCKS[itemId] ?? [], consumable:CONSUMABLE_ITEMS[itemId] || null });
        }
        return res.status(400).json({ error:"This transaction has already been used." });
      }
      throw claimErr;
    }

    // ── 7. Write to UserInventory (burn stats read tokens_spent from here) ──
    // Consumables can be bought repeatedly, so accumulate tokens_spent instead of overwriting.
    let spent = actualAmount;
    if (isConsumable) {
      const { data:prevInv } = await supabase.from("UserInventory")
        .select("tokens_spent").ilike("username", username).eq("item_id", itemId).maybeSingle();
      spent += Number(prevInv?.tokens_spent || 0);
    }
    const { error:invErr } = await supabase.from("UserInventory").upsert([{
      username,
      item_id:      itemId,
      owned:        true,
      equipped:     false,
      tokens_spent: spent,
      purchased_at: new Date().toISOString(),
    }], { onConflict:"username,item_id" });
    if (invErr) console.error("[verify-purchase] inventory write failed", signature, invErr);

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