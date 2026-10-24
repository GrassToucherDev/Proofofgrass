// utils/wheel.js — server helpers for the WAGO Wheel. A spin is ONE $TOUCHGRASS transfer to the Marketplace burn wallet;
// the lock/ecosystem split is bookkeeping done in SQL (supabase_migrations/wheel_core.sql).
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { adminClient } from "./requireOwner";
import { PaymentError, mintDelta, MINT, BURN, currentTokenPriceUsd } from "./solanaPayment";

export { PaymentError, adminClient, currentTokenPriceUsd };
export const WHEEL_PAY_WALLET = BURN;
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const MAX_TX_AGE_SEC = 2 * 60 * 60;
export const WHEEL_UNDERPAY_TOLERANCE = 0.99;

async function rpcCall(method, params) {
  const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.result;
}

// Throws PaymentError. Returns { amount } = $TOUCHGRASS received by the burn wallet in this transaction.
// minTokens comes from the stored intent, never from the browser.
export async function verifyWheelPayment({ signature, walletAddress, minTokens, notBeforeMs }, deps = {}) {
  const rpc = deps.rpcCall || rpcCall, nowMs = deps.now ? deps.now() : Date.now();
  const tx = await rpc("getTransaction", [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]);
  if (!tx) throw new PaymentError(400, "Transaction not found. It may still be confirming. Try again in a moment.", "pending");
  if (tx.meta?.err) throw new PaymentError(400, "Transaction failed on-chain.", "tx_failed");
  if (!tx.blockTime || nowMs / 1000 - tx.blockTime > MAX_TX_AGE_SEC) throw new PaymentError(400, "This payment is too old to verify. Contact support with your transaction signature.", "too_old");
  if (notBeforeMs && tx.blockTime * 1000 < notBeforeMs - 5000) throw new PaymentError(400, "This payment was made before this spin was opened.", "too_early");
  const signers = (tx.transaction?.message?.accountKeys || []).filter(k => k.signer).map(k => k.pubkey);
  if (!signers.includes(walletAddress)) throw new PaymentError(400, "That wallet did not sign this transaction.", "wrong_wallet");
  const received = mintDelta(tx, BURN), sent = -mintDelta(tx, walletAddress);
  if (!(received > 0) || sent < received * 0.99) throw new PaymentError(400, "Could not verify a $TOUCHGRASS payment to the Marketplace wallet in this transaction.", "wrong_token_or_recipient");
  if (received < Number(minTokens) * WHEEL_UNDERPAY_TOLERANCE) throw new PaymentError(400, "Payment is below the price of this spin.", "underpaid");
  return { amount: received };
}

// Usernames allowed to play wheels whose visibility is 'admin' (comma-separated env var, case-insensitive).
export function isWheelTester(username) {
  const list = String(process.env.WHEEL_TESTER_USERNAMES || "").toLowerCase().split(",").map(s => s.trim().replace(/^@/, "")).filter(Boolean);
  return !!username && list.includes(String(username).toLowerCase().replace(/^@/, ""));
}

export async function sessionIdentity(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id || null;
  if (!googleId) return { googleId: null, username: null };
  const { data } = await adminClient().from("username_claims").select("username").eq("google_id", googleId).maybeSingle();
  return { googleId, username: data?.username || null };
}

export const WHEEL_AUTO_TYPES = ["cosmetic_pack", "shield", "sunset_pass", "grass_tickets"];
export const WHEEL_REWARD_TYPES = ["cosmetic_pack", "shield", "sunset_pass", "grass_tickets", "spl_token", "touchgrass", "sol", "nft", "badge", "collectible", "partner_asset", "manual"];
export const WHEEL_RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

export function publicWheel(w) {
  return { id: w.id, slug: w.slug, name: w.name, description: w.description, hero_image: w.hero_image, price_mode: w.price_mode,
    price_usd: w.price_usd == null ? null : Number(w.price_usd), price_tokens: w.price_tokens == null ? null : Number(w.price_tokens),
    lock_pct: w.lock_pct, eco_pct: w.eco_pct, lock_days: w.lock_days, meter_enabled: w.meter_enabled, meter_spins: w.meter_spins,
    meter_min_rarity: w.meter_min_rarity, ends_at: w.ends_at, visibility: w.visibility };
}
export function publicPrizeRow(p) {
  return { id: p.id, name: p.name, description: p.description, reward_type: p.reward_type, rarity: p.rarity, image_url: p.image_url,
    segment: p.segment, remaining: p.inventory_remaining };           // remaining is null for unlimited stock
}
export function publicSpin(s) {
  return { id: s.id, prize: { name: s.prize_snapshot?.name, description: s.prize_snapshot?.description, reward_type: s.prize_snapshot?.reward_type,
    image_url: s.prize_snapshot?.image_url }, rarity: s.rarity, segment: s.segment, meter_guaranteed: s.meter_guaranteed,
    fulfillment_status: s.fulfillment_status, lock_status: s.lock_status, created_at: s.created_at };
}
