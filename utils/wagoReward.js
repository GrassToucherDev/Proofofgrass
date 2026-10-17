// utils/wagoReward.js — how a campaign's reward is shown to users.
// Campaigns can pay any Solana token (or SOL). The admin sets a symbol and logo;
// older campaigns with neither fall back to SOL / $TOUCHGRASS by type and mint.

export const TG_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
export const TG_LOGO = "/images/touchgrass-token.png";
export const SOL_LOGO = "https://cryptologos.cc/logos/solana-sol-logo.png";
export const COIN_LOGO = "/images/wago/coin.svg";

function isSol(r) { return (r?.reward_type || "").toLowerCase() === "sol"; }
function isTG(r) {
  const t = (r?.reward_type || "").toLowerCase();
  return t === "touchgrass" || r?.reward_token_mint === TG_MINT;
}

// r: anything with reward_type / reward_symbol / reward_logo_url / reward_token_mint
export function rewardSymbol(r) {
  if (isSol(r)) return "SOL";
  const s = String(r?.reward_symbol || "").trim();
  if (s) return s;
  if (isTG(r)) return "$TOUCHGRASS";
  return "tokens";
}

export function rewardLogo(r) {
  if (r?.reward_logo_url) return r.reward_logo_url;
  if (isSol(r)) return SOL_LOGO;
  if (isTG(r)) return TG_LOGO;
  return COIN_LOGO;
}

export function formatAmount(amount) {
  const n = Number(amount);
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

// "250 $TOUCHGRASS", "+0.5 SOL", or just the symbol when there's no amount.
export function formatReward(r, amount = r?.reward_amount, { plus = false } = {}) {
  const sym = rewardSymbol(r);
  const n = Number(amount);
  if (!(n > 0)) return sym;
  return `${plus ? "+" : ""}${formatAmount(n)} ${sym}`;
}
