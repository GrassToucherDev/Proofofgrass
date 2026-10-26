// Shared by the profile wallet-verify UI and /api/profile/wallet.
// The user signs this exact message to prove they control the wallet. It names the username, the wallet and a
// timestamp, so a signature can't be reused for another account, another wallet, or later on.
export const PROFILE_WALLET_TTL_MS = 10 * 60 * 1000;

export function buildProfileWalletMessage({ username, wallet, issuedAt }) {
  return [
    "Proof of Grass — verify wallet",
    "",
    "Sign to prove you own this wallet. This does not cost anything or send a transaction.",
    "",
    `Username: ${username}`,
    `Wallet: ${wallet}`,
    `Issued: ${issuedAt}`,
  ].join("\n");
}
