// utils/wagoProofBonus.js
// Shared config for the WAGO Drops Proof bonus → Grass Tickets flow.

// Default Grass Ticket awards by campaign rarity.
// A campaign's proof_bonus_tickets column overrides these when set.
export const RARITY_TICKETS = {
  common:    2,
  rare:      5,
  epic:      10,
  legendary: 25,
};

export const RARITIES = Object.keys(RARITY_TICKETS);

// Proof photo must validate within this many meters of the drop.
export const PROOF_RADIUS_M = 100;

// Hours after claiming during which the Proof bonus can be completed.
export const PROOF_WINDOW_HOURS = 24;

export function ticketsForCampaign(campaign) {
  if (!campaign) return RARITY_TICKETS.common;
  const override = Number(campaign.proof_bonus_tickets);
  if (override > 0) return override;
  return RARITY_TICKETS[(campaign.rarity || "common").toLowerCase()] ?? RARITY_TICKETS.common;
}

// Accepts x.com / twitter.com status links.
export function isValidXPostUrl(url) {
  if (typeof url !== "string") return false;
  return /^https?:\/\/(www\.)?(x\.com|twitter\.com)\/[A-Za-z0-9_]{1,15}\/status\/\d{5,25}([/?#].*)?$/.test(url.trim());
}
