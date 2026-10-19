// Server-side source of truth for marketplace prices (USD). The client catalogue in
// pages/marketplace.js is display-only; verify-purchase never trusts a client-sent price.
// If you change a price in pages/marketplace.js, change it here too.
export const MARKET_PRICES_USD = {
  retro_covers_pack: 5.0,
  anime_nature_pack: 5.0,
  y2k_pack: 5.0,
  trenches_pack: 5.0,
  blockchain_trails_pack: 5.0,
  streak_shield: 5.0,
  sunset_pass: 2.5,
};
export const MARKET_ITEM_NAMES = {
  retro_covers_pack: "Retro Vibes Pack",
  anime_nature_pack: "Anime Outdoors",
  y2k_pack: "Y2K Outdoors",
  trenches_pack: "The Trenches",
  blockchain_trails_pack: "Blockchain Trails",
  streak_shield: "Streak Shield",
  sunset_pass: "Sunset Pass",
};
