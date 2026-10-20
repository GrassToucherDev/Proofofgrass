// utils/wagoPayout.mjs — shared by the payout script and the Admin payout view.
// A claim is payable only if its wallet was ownership-verified: either it was
// verified when the claim was made, or the account's currently linked wallet is
// the same address and is verified now (covers claims made before verification existed).

export function payoutEligibility(claim, account) {
  if (claim.wallet_verified) return { eligible: true, reason: null };
  if (account?.wallet_verified && account.linked_wallet === claim.wallet_address) {
    return { eligible: true, reason: null };
  }
  return { eligible: false, reason: "Wallet not verified" };
}

// Anti-abuse limits (claim endpoint)
export const MAX_CLAIMS_PER_DAY = 10;
export const MAX_TRAVEL_KMH = 200;       // faster than this between two claims = impossible
export const GPS_TOLERANCE_M = 300;

// ── Reward types (campaigns + trails) ────────────────────────────────────────
// "spl_token": any Solana token (needs a mint). "sol": native SOL (no mint).
export const REWARD_TYPES = ["spl_token", "sol"];
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const DEFAULT_MAX_SOL_PER_CLAIM = 1;           // safety cap; override with WAGO_MAX_SOL_PER_CLAIM
export const RENT_EXEMPT_MIN_LAMPORTS = 890_880;      // a brand-new (0 balance) wallet must receive at least this

export function maxSolPerClaim(env = {}) {
  const v = Number(env.WAGO_MAX_SOL_PER_CLAIM);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_MAX_SOL_PER_CLAIM;
}

// Whole lamports from a human SOL amount, or null if it isn't a positive amount with <= 9 decimals.
export function solToLamports(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const lamports = Math.round(n * LAMPORTS_PER_SOL);
  if (lamports < 1) return null;
  if (Math.abs(lamports / LAMPORTS_PER_SOL - n) > 1e-12) return null;   // more than 9 decimals
  return lamports;
}

// Validate/normalise a campaign reward. Returns { ok:true, reward } or { ok:false, error }.
export function validateReward({ reward_type, reward_amount, reward_token_mint, reward_symbol }, env = {}) {
  const type = String(reward_type || "spl_token").toLowerCase();
  if (!REWARD_TYPES.includes(type)) return { ok: false, error: "Reward type must be SPL token or SOL." };
  const amount = Number(reward_amount);
  if (!(amount > 0)) return { ok: false, error: "Reward amount must be greater than 0." };
  if (type === "sol") {
    if (solToLamports(amount) == null) return { ok: false, error: "SOL amounts can have at most 9 decimal places." };
    const cap = maxSolPerClaim(env);
    if (amount > cap) return { ok: false, error: `SOL reward is above the per-claim limit of ${cap} SOL.` };
    return { ok: true, reward: { reward_type: "sol", reward_amount: amount, reward_token_mint: null, reward_symbol: "SOL" } };
  }
  const mint = String(reward_token_mint || "").trim();
  if (!mint) return { ok: false, error: "Token rewards need a mint address." };
  return { ok: true, reward: { reward_type: "spl_token", reward_amount: amount, reward_token_mint: mint, reward_symbol: String(reward_symbol || "").trim().slice(0, 20) || null } };
}
