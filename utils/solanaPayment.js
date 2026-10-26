// Server-side $TOUCHGRASS payment check for Grove banners. Mirrors the checks in
// pages/api/marketplace/verify-purchase.js (same mint, same burn-wallet recipient, same 80% price
// tolerance, same 2h window) without changing that route.
export const MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
export const BURN = "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";
const RPC  = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const TOKEN_PRICE_TOLERANCE = 0.8;
const MAX_TX_AGE_SEC = 2 * 60 * 60;

export class PaymentError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

async function rpcCall(method, params) {
  const res = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}
export async function currentTokenPriceUsd() {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MINT}`, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("price_unavailable");
  const d = await r.json();
  const pairs = (d?.pairs || []).filter(x => x?.chainId === "solana" && x?.baseToken?.address === MINT && parseFloat(x?.priceUsd) > 0);
  pairs.sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0));   // trust the deepest pool, not whichever is listed first
  const p = parseFloat(pairs[0]?.priceUsd ?? "0");
  if (!(p > 0)) throw new Error("price_unavailable");
  return p;
}
// The payment must carry a Memo naming THIS checkout ("tg:<checkout id>"). Without it, anyone could apply a stranger's
// public burn transaction to their own checkout. Throws PaymentError when missing.
export function requireCheckoutMemo(tx, checkoutId) {
  const want = `tg:${String(checkoutId || "").toLowerCase()}`;
  const ixs = tx?.transaction?.message?.instructions || [];
  const ok = ixs.some(ix => (ix.program === "spl-memo" || ix.programId === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
    && String(typeof ix.parsed === "string" ? ix.parsed : "").trim().toLowerCase() === want);
  if (!ok) throw new PaymentError(400, "This payment isn't tied to this checkout, so it can't be applied. If you paid from an older page, contact support with your transaction signature.", "no_memo");
}

export function mintDelta(tx, owner) {
  const sum = (list) => (list || []).filter(b => b.mint === MINT && b.owner === owner)
    .reduce((acc, b) => acc + Number(b.uiTokenAmount?.amount || 0) / Math.pow(10, b.uiTokenAmount?.decimals ?? 6), 0);
  return sum(tx.meta?.postTokenBalances) - sum(tx.meta?.preTokenBalances);
}

// Throws PaymentError. Returns { amount } = $TOUCHGRASS that reached the burn wallet.
// `notBeforeMs`: the payment must have been made after the checkout was opened, so an old
// transaction can't be pasted in to claim a banner.
export async function verifyBannerPayment({ signature, walletAddress, usdPrice, notBeforeMs, checkoutId }, deps = {}) {
  const rpc = deps.rpcCall || rpcCall, priceFn = deps.price || currentTokenPriceUsd, nowMs = deps.now ? deps.now() : Date.now();
  const tx = await rpc("getTransaction", [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]);
  if (!tx) throw new PaymentError(400, "Transaction not found. It may still be confirming — try again in a moment.", "pending");
  if (tx.meta?.err) throw new PaymentError(400, "Transaction failed on-chain.", "tx_failed");
  if (!tx.blockTime || nowMs / 1000 - tx.blockTime > MAX_TX_AGE_SEC) throw new PaymentError(400, "This payment is too old to verify. Contact support with your transaction signature.", "too_old");
  if (notBeforeMs && tx.blockTime * 1000 < notBeforeMs - 5000) throw new PaymentError(400, "This payment was made before this checkout was opened.", "too_early");
  requireCheckoutMemo(tx, checkoutId);
  const signers = (tx.transaction?.message?.accountKeys || []).filter(k => k.signer).map(k => k.pubkey);
  if (!signers.includes(walletAddress)) throw new PaymentError(400, "That wallet did not sign this transaction.", "wrong_wallet");
  const received = mintDelta(tx, BURN);
  const sent = -mintDelta(tx, walletAddress);
  if (!(received > 0) || sent < received * 0.99) throw new PaymentError(400, "Could not verify a $TOUCHGRASS payment to the burn wallet in this transaction.", "wrong_token_or_recipient");
  let tokenPrice;
  try { tokenPrice = await priceFn(); }
  catch { throw new PaymentError(503, "Price feed unavailable — your payment is safe, please retry verification in a minute.", "price_unavailable"); }
  if (received < (usdPrice / tokenPrice) * TOKEN_PRICE_TOLERANCE) throw new PaymentError(400, "Payment amount is below the price of this banner.", "underpaid");
  return { amount: received };
}
