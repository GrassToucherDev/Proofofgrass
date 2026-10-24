// Shared bits for the WAGO Wheel UI.
export const RARITY = {
  common:    { label: "Common",    color: "#5d7a4a", bg: "rgba(93,122,74,0.12)" },
  uncommon:  { label: "Uncommon",  color: "#2f8f4e", bg: "rgba(47,143,78,0.14)" },
  rare:      { label: "Rare",      color: "#2b77c9", bg: "rgba(43,119,201,0.14)" },
  epic:      { label: "Epic",      color: "#8a4fd0", bg: "rgba(138,79,208,0.14)" },
  legendary: { label: "Legendary", color: "#c58a12", bg: "rgba(232,176,40,0.22)" },
};
export const TYPE_META = {
  cosmetic_pack: { emoji: "🎨", label: "Cosmetic pack", group: "collectibles" },
  shield:        { emoji: "🛡️", label: "Utility item",  group: "utilities" },
  sunset_pass:   { emoji: "🌅", label: "Utility item",  group: "utilities" },
  grass_tickets: { emoji: "🎟️", label: "Grass Tickets", group: "utilities" },
  spl_token:     { emoji: "🪙", label: "Token",         group: "tokens" },
  touchgrass:    { emoji: "🪙", label: "$TOUCHGRASS",   group: "tokens" },
  sol:           { emoji: "◎",  label: "SOL",           group: "tokens" },
  nft:           { emoji: "🖼️", label: "NFT",           group: "collectibles" },
  badge:         { emoji: "🏅", label: "Badge",         group: "collectibles" },
  collectible:   { emoji: "🧸", label: "Collectible",   group: "collectibles" },
  partner_asset: { emoji: "🤝", label: "Partner reward", group: "collectibles" },
  manual:        { emoji: "🎁", label: "Reward",        group: "utilities" },
};
export const typeMeta = (t) => TYPE_META[t] || TYPE_META.manual;
export const rarityOf = (r) => RARITY[r] || RARITY.common;

export function compact(n) {
  const x = Number(n) || 0;
  if (x >= 1e9) return `${(x / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (x >= 1e6) return `${(x / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (x >= 1e3) return `${(x / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(x));
}
export const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// What the user is told once a spin is settled, by fulfillment state.
export function fulfillmentText(spin) {
  const t = spin?.prize?.reward_type;
  switch (spin?.fulfillment_status) {
    case "completed": return t === "grass_tickets" ? "Your Grass Tickets are in this cycle's draw." : "Added to your account.";
    case "manual_required": return "We'll send this to your wallet. You can follow it in My Wins.";
    case "pending": case "processing": return "Being added to your account…";
    case "failed": return "Your prize is saved and we'll retry delivery. It can't be lost or re-drawn.";
    default: return "";
  }
}
export const statusLabel = (s) => ({ completed: "Delivered", manual_required: "Being sent", pending: "Processing", processing: "Processing", failed: "Retrying" }[s] || s);
