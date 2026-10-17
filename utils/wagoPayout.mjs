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
