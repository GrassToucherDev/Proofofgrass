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

// Cover slugs each cosmetic pack unlocks (same lists verify-purchase uses). WAGO Wheel cosmetic prizes read this.
export const MARKET_COVER_UNLOCKS = {
  retro_covers_pack: ["marketplace_retro_beach","marketplace_retro_mountain","marketplace_retro_sunflower","marketplace_retro_waterfall","marketplace_retro_night"],
  anime_nature_pack: ["marketplace_cherry_blossom","marketplace_torii_forest","marketplace_lake_sunrise","marketplace_beach_coast","marketplace_city_view"],
  y2k_pack:          ["marketplace_chrome_meadow","marketplace_aqua_coast","marketplace_bubble_forest","marketplace_dream_sky","marketplace_cyber_garden"],
  trenches_pack:          ["marketplace_ath_overlook","marketplace_rug_pull_ravine","marketplace_bear_market_blizzard","marketplace_moonbag_camp","marketplace_liquidity_lagoon"],
  blockchain_trails_pack: ["marketplace_bitcoin_bay","marketplace_ethereum_lake","marketplace_bnb_dunes","marketplace_robinhood_range","marketplace_solana_springs"],
};
