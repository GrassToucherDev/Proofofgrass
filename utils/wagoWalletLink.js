// utils/wagoWalletLink.js
// Shared by the wallet-connect UI and /api/wago-drops/link-wallet.
// The user signs this exact message with their wallet to prove they control it.
// It names the Google account and wallet, plus a timestamp, so a signature
// can't be reused for another account, another wallet, or later on.

export const WALLET_LINK_TTL_MS = 10 * 60 * 1000;

export function buildLinkMessage({ googleId, wallet, issuedAt }) {
  return [
    "WAGO Drops — link wallet",
    "",
    "Sign to prove you own this wallet. This does not cost anything or send a transaction.",
    "",
    `Account: ${googleId}`,
    `Wallet: ${wallet}`,
    `Issued: ${issuedAt}`,
  ].join("\n");
}

export const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
