// utils/coverDefinitions.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all profile covers.
// Each cover drives both the profile display AND the flex card theme engine.
//
// THEME FIELDS (used by flex card canvas renderer):
//   accentColor  — glow, badge borders, tier pill, progress bar highlight
//   borderColor  — outer card border
//   panelTint    — frosted glass panel background (rgba)
//   scrimTop     — gradient over cover image at top
//   scrimBot     — gradient over cover image at bottom
//   glowColor    — radial glow behind streak number
//   badgeStroke  — hex badge border tint
//   progressFrom — progress bar gradient start
//   progressTo   — progress bar gradient end
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers";

export const COVER_DEFINITIONS = [

  // ── STREAK MILESTONE COVERS ───────────────────────────────────────────────

  {
    slug:         "day_7_golden_hour",
    name:         "Golden Hour",
    unlockDay:    7,
    marketplaceOnly: false,
    description:  "Reach a 7-day streak",
    imageUrl:     `${BASE}/golden_hour.png`,
    fallback:     "linear-gradient(135deg,#1a1200,#4a3800,#c8a84b40)",
    // Theme
    accentColor:  "#c8a84b",
    borderColor:  "rgba(200,168,75,0.55)",
    panelTint:    "rgba(20,14,0,0.62)",
    scrimTop:     "rgba(16,10,0,0.78)",
    scrimBot:     "rgba(16,10,0,0.92)",
    glowColor:    "#c8a84b",
    badgeStroke:  "rgba(200,168,75,0.55)",
    progressFrom: "#c8a84b",
    progressTo:   "#f0d070",
  },
  {
    slug:         "day_14_rooted_grove",
    name:         "Rooted Grove",
    unlockDay:    14,
    marketplaceOnly: false,
    description:  "Reach a 14-day streak",
    imageUrl:     `${BASE}/rooted_grove.png`,
    fallback:     "linear-gradient(135deg,#0a1a08,#1a3010,#2d4a18)",
    accentColor:  "#93a85a",
    borderColor:  "rgba(147,168,90,0.55)",
    panelTint:    "rgba(8,14,6,0.62)",
    scrimTop:     "rgba(6,10,4,0.78)",
    scrimBot:     "rgba(6,10,4,0.92)",
    glowColor:    "#93a85a",
    badgeStroke:  "rgba(147,168,90,0.55)",
    progressFrom: "#5a8a30",
    progressTo:   "#93a85a",
  },
  {
    slug:         "day_30_mountain_summit",
    name:         "Mountain Summit",
    unlockDay:    30,
    marketplaceOnly: false,
    description:  "Reach a 30-day streak",
    imageUrl:     `${BASE}/mountain_summit.png`,
    fallback:     "linear-gradient(135deg,#0d0d14,#1a1a2e,#4a4a6a)",
    accentColor:  "#a0b4e0",
    borderColor:  "rgba(160,180,224,0.5)",
    panelTint:    "rgba(8,8,18,0.65)",
    scrimTop:     "rgba(6,6,14,0.80)",
    scrimBot:     "rgba(6,6,14,0.93)",
    glowColor:    "#6080c0",
    badgeStroke:  "rgba(160,180,224,0.5)",
    progressFrom: "#6080c0",
    progressTo:   "#a0b4e0",
  },
  {
    slug:         "day_50_ancient_forest",
    name:         "Ancient Forest",
    unlockDay:    50,
    marketplaceOnly: false,
    description:  "Reach a 50-day streak",
    imageUrl:     `${BASE}/ancient_forest.png`,
    fallback:     "linear-gradient(135deg,#061208,#0d2414,#1a4020)",
    accentColor:  "#4ade80",
    borderColor:  "rgba(74,222,128,0.5)",
    panelTint:    "rgba(4,12,6,0.65)",
    scrimTop:     "rgba(4,10,4,0.80)",
    scrimBot:     "rgba(4,10,4,0.93)",
    glowColor:    "#22c55e",
    badgeStroke:  "rgba(74,222,128,0.5)",
    progressFrom: "#22c55e",
    progressTo:   "#4ade80",
  },
  {
    slug:         "day_100_ascended_night_sky",
    name:         "Ascended Night Sky",
    unlockDay:    100,
    marketplaceOnly: false,
    description:  "Reach a 100-day streak",
    imageUrl:     `${BASE}/ascended_night_sky.png`,
    fallback:     "linear-gradient(135deg,#04040e,#0a0a1e,#1a1a3e)",
    accentColor:  "#a78bfa",
    borderColor:  "rgba(167,139,250,0.55)",
    panelTint:    "rgba(4,4,14,0.68)",
    scrimTop:     "rgba(4,4,12,0.82)",
    scrimBot:     "rgba(4,4,12,0.94)",
    glowColor:    "#7c3aed",
    badgeStroke:  "rgba(167,139,250,0.55)",
    progressFrom: "#7c3aed",
    progressTo:   "#a78bfa",
  },
  {
    slug:         "day_180_sun_temple",
    name:         "Sun Temple",
    unlockDay:    180,
    marketplaceOnly: false,
    description:  "Reach a 180-day streak",
    imageUrl:     `${BASE}/sun_temple.png`,
    fallback:     "linear-gradient(135deg,#1a0e00,#3d2800,#c8841b30)",
    accentColor:  "#fb923c",
    borderColor:  "rgba(251,146,60,0.55)",
    panelTint:    "rgba(18,10,0,0.65)",
    scrimTop:     "rgba(16,8,0,0.80)",
    scrimBot:     "rgba(16,8,0,0.93)",
    glowColor:    "#ea580c",
    badgeStroke:  "rgba(251,146,60,0.55)",
    progressFrom: "#ea580c",
    progressTo:   "#fb923c",
  },
  {
    slug:         "day_365_eternal_garden",
    name:         "Eternal Garden",
    unlockDay:    365,
    marketplaceOnly: false,
    description:  "Reach a 365-day streak",
    imageUrl:     `${BASE}/eternal_garden.png`,
    fallback:     "linear-gradient(135deg,#041008,#0a2010,#93a85a20)",
    accentColor:  "#34d399",
    borderColor:  "rgba(52,211,153,0.55)",
    panelTint:    "rgba(4,12,8,0.65)",
    scrimTop:     "rgba(4,10,6,0.80)",
    scrimBot:     "rgba(4,10,6,0.93)",
    glowColor:    "#059669",
    badgeStroke:  "rgba(52,211,153,0.55)",
    progressFrom: "#059669",
    progressTo:   "#34d399",
  },
  {
    slug:         "day_500_celestial_ascension",
    name:         "Celestial Ascension",
    unlockDay:    500,
    marketplaceOnly: false,
    description:  "Reach a 500-day streak",
    imageUrl:     `${BASE}/celestial_ascension.png`,
    fallback:     "linear-gradient(135deg,#060410,#0e0a1e,#a78bfa30)",
    accentColor:  "#f0abfc",
    borderColor:  "rgba(240,171,252,0.55)",
    panelTint:    "rgba(8,4,16,0.68)",
    scrimTop:     "rgba(6,4,14,0.82)",
    scrimBot:     "rgba(6,4,14,0.95)",
    glowColor:    "#c026d3",
    badgeStroke:  "rgba(240,171,252,0.55)",
    progressFrom: "#c026d3",
    progressTo:   "#f0abfc",
  },

  // ── MARKETPLACE EXCLUSIVE COVERS — RETRO COVERS PACK ─────────────────────

  {
    slug:            "marketplace_retro_beach",
    name:            "Retro Beach",
    unlockDay:       null,
    marketplaceOnly: true,
    pack:            "retro_covers_pack",
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        `${BASE}/retro_beach.png`,
    fallback:        "linear-gradient(135deg,#001a2e,#003d5c,#56bef840)",
    accentColor:     "#38bdf8",
    borderColor:     "rgba(56,189,248,0.6)",
    panelTint:       "rgba(0,14,26,0.65)",
    scrimTop:        "rgba(0,10,20,0.80)",
    scrimBot:        "rgba(0,10,20,0.93)",
    glowColor:       "#0ea5e9",
    badgeStroke:     "rgba(56,189,248,0.6)",
    progressFrom:    "#0ea5e9",
    progressTo:      "#38bdf8",
  },
  {
    slug:            "marketplace_retro_mountain",
    name:            "Retro Mountain",
    unlockDay:       null,
    marketplaceOnly: true,
    pack:            "retro_covers_pack",
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        `${BASE}/retro_mountain.png`,
    fallback:        "linear-gradient(135deg,#0d0d14,#1a1a2e,#6a6aaa40)",
    accentColor:     "#818cf8",
    borderColor:     "rgba(129,140,248,0.6)",
    panelTint:       "rgba(8,8,18,0.65)",
    scrimTop:        "rgba(6,6,14,0.80)",
    scrimBot:        "rgba(6,6,14,0.93)",
    glowColor:       "#6366f1",
    badgeStroke:     "rgba(129,140,248,0.6)",
    progressFrom:    "#6366f1",
    progressTo:      "#818cf8",
  },
  {
    slug:            "marketplace_retro_sunflower",
    name:            "Retro Sunflower",
    unlockDay:       null,
    marketplaceOnly: true,
    pack:            "retro_covers_pack",
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        `${BASE}/retro_sunflower.png`,
    fallback:        "linear-gradient(135deg,#1a1200,#3d2e00,#f5b94240)",
    accentColor:     "#fbbf24",
    borderColor:     "rgba(251,191,36,0.6)",
    panelTint:       "rgba(18,14,0,0.65)",
    scrimTop:        "rgba(16,12,0,0.80)",
    scrimBot:        "rgba(16,12,0,0.93)",
    glowColor:       "#d97706",
    badgeStroke:     "rgba(251,191,36,0.6)",
    progressFrom:    "#d97706",
    progressTo:      "#fbbf24",
  },
  {
    slug:            "marketplace_retro_waterfall",
    name:            "Retro Waterfall",
    unlockDay:       null,
    marketplaceOnly: true,
    pack:            "retro_covers_pack",
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        `${BASE}/retro_waterfall.png`,
    fallback:        "linear-gradient(135deg,#001a14,#00352a,#34d39940)",
    accentColor:     "#2dd4bf",
    borderColor:     "rgba(45,212,191,0.6)",
    panelTint:       "rgba(0,14,12,0.65)",
    scrimTop:        "rgba(0,12,10,0.80)",
    scrimBot:        "rgba(0,12,10,0.93)",
    glowColor:       "#0d9488",
    badgeStroke:     "rgba(45,212,191,0.6)",
    progressFrom:    "#0d9488",
    progressTo:      "#2dd4bf",
  },
  {
    slug:            "marketplace_retro_night",
    name:            "Retro Night",
    unlockDay:       null,
    marketplaceOnly: true,
    pack:            "retro_covers_pack",
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        `${BASE}/retro_night.png`,
    fallback:        "linear-gradient(135deg,#04040e,#0a0a1e,#a78bfa40)",
    accentColor:     "#c4b5fd",
    borderColor:     "rgba(196,181,253,0.6)",
    panelTint:       "rgba(6,4,14,0.68)",
    scrimTop:        "rgba(4,4,12,0.82)",
    scrimBot:        "rgba(4,4,12,0.95)",
    glowColor:       "#7c3aed",
    badgeStroke:     "rgba(196,181,253,0.6)",
    progressFrom:    "#7c3aed",
    progressTo:      "#c4b5fd",
  },

  // ── MARKETPLACE EXCLUSIVE COVERS — ANIME NATURE PACK ────────────────────
  { slug:"marketplace_cherry_blossom", name:"Cherry Blossom", unlockDay:null, marketplaceOnly:true, pack:"anime_nature_pack", description:"Marketplace exclusive — Anime Nature Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/cherry_blossom.png", fallback:"linear-gradient(135deg,#1a0010,#3d0028,#ff9eb540)", accentColor:"#ff9eb5", borderColor:"rgba(255,158,181,0.6)", panelTint:"rgba(20,0,12,0.65)", scrimTop:"rgba(16,0,10,0.80)", scrimBot:"rgba(16,0,10,0.93)", glowColor:"#ff6b9d", badgeStroke:"rgba(255,158,181,0.6)", progressFrom:"#ff6b9d", progressTo:"#ff9eb5" },
  { slug:"marketplace_torii_forest",   name:"Torii Forest",   unlockDay:null, marketplaceOnly:true, pack:"anime_nature_pack", description:"Marketplace exclusive — Anime Nature Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/torii_forest.png",   fallback:"linear-gradient(135deg,#0d0a00,#2a1a00,#c8611b40)", accentColor:"#e8843a", borderColor:"rgba(232,132,58,0.6)",  panelTint:"rgba(18,10,0,0.65)",  scrimTop:"rgba(14,8,0,0.80)",  scrimBot:"rgba(14,8,0,0.93)",  glowColor:"#c8611b", badgeStroke:"rgba(232,132,58,0.6)",  progressFrom:"#c8611b", progressTo:"#e8843a" },
  { slug:"marketplace_lake_sunrise",   name:"Lake Sunrise",   unlockDay:null, marketplaceOnly:true, pack:"anime_nature_pack", description:"Marketplace exclusive — Anime Nature Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/lake_sunrise.png",   fallback:"linear-gradient(135deg,#001018,#002030,#f4a26140)", accentColor:"#f4a261", borderColor:"rgba(244,162,97,0.6)",  panelTint:"rgba(0,10,16,0.65)", scrimTop:"rgba(0,8,14,0.80)",  scrimBot:"rgba(0,8,14,0.93)",  glowColor:"#e07b39", badgeStroke:"rgba(244,162,97,0.6)",  progressFrom:"#e07b39", progressTo:"#f4a261" },
  { slug:"marketplace_beach_coast",    name:"Beach Coast",    unlockDay:null, marketplaceOnly:true, pack:"anime_nature_pack", description:"Marketplace exclusive — Anime Nature Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/beach_coast.png",    fallback:"linear-gradient(135deg,#001824,#003040,#48cae440)", accentColor:"#48cae4", borderColor:"rgba(72,202,228,0.6)",  panelTint:"rgba(0,14,22,0.65)", scrimTop:"rgba(0,10,18,0.80)", scrimBot:"rgba(0,10,18,0.93)", glowColor:"#00b4d8", badgeStroke:"rgba(72,202,228,0.6)",  progressFrom:"#00b4d8", progressTo:"#48cae4" },
  // ── MARKETPLACE EXCLUSIVE COVERS — TOUCH GRASS Y2K PACK ───────────────────
  { slug:"marketplace_chrome_meadow", name:"Chrome Meadow", unlockDay:null, marketplaceOnly:true, pack:"y2k_pack", description:"Marketplace exclusive — Touch Grass Y2K Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/chrome_meadow.png", fallback:"linear-gradient(135deg,#0a0a14,#1a1a2e,#c0c0ff40)", accentColor:"#c0c0ff", borderColor:"rgba(192,192,255,0.6)", panelTint:"rgba(8,8,18,0.68)", scrimTop:"rgba(6,6,14,0.82)", scrimBot:"rgba(6,6,14,0.95)", glowColor:"#9090ff", badgeStroke:"rgba(192,192,255,0.6)", progressFrom:"#9090ff", progressTo:"#c0c0ff" },
  { slug:"marketplace_aqua_coast",    name:"Aqua Coast",    unlockDay:null, marketplaceOnly:true, pack:"y2k_pack", description:"Marketplace exclusive — Touch Grass Y2K Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/aqua_coast.png",    fallback:"linear-gradient(135deg,#001a1a,#003030,#00ffff40)", accentColor:"#00e5ff", borderColor:"rgba(0,229,255,0.6)",   panelTint:"rgba(0,14,14,0.68)",  scrimTop:"rgba(0,10,10,0.82)",  scrimBot:"rgba(0,10,10,0.95)",  glowColor:"#00bcd4", badgeStroke:"rgba(0,229,255,0.6)",   progressFrom:"#00bcd4", progressTo:"#00e5ff" },
  { slug:"marketplace_bubble_forest", name:"Bubble Forest", unlockDay:null, marketplaceOnly:true, pack:"y2k_pack", description:"Marketplace exclusive — Touch Grass Y2K Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/bubble_forest.png", fallback:"linear-gradient(135deg,#140020,#280040,#dd88ff40)", accentColor:"#dd88ff", borderColor:"rgba(221,136,255,0.6)", panelTint:"rgba(12,0,18,0.68)", scrimTop:"rgba(10,0,14,0.82)", scrimBot:"rgba(10,0,14,0.95)", glowColor:"#bb44ff", badgeStroke:"rgba(221,136,255,0.6)", progressFrom:"#bb44ff", progressTo:"#dd88ff" },
  { slug:"marketplace_dream_sky",     name:"Dream Sky",     unlockDay:null, marketplaceOnly:true, pack:"y2k_pack", description:"Marketplace exclusive — Touch Grass Y2K Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/dream_sky.png",     fallback:"linear-gradient(135deg,#001428,#002050,#66aaff40)", accentColor:"#66aaff", borderColor:"rgba(102,170,255,0.6)", panelTint:"rgba(0,10,20,0.68)", scrimTop:"rgba(0,8,16,0.82)",  scrimBot:"rgba(0,8,16,0.95)",  glowColor:"#4488ff", badgeStroke:"rgba(102,170,255,0.6)", progressFrom:"#4488ff", progressTo:"#66aaff" },
  { slug:"marketplace_cyber_garden",  name:"Cyber Garden",  unlockDay:null, marketplaceOnly:true, pack:"y2k_pack", description:"Marketplace exclusive — Touch Grass Y2K Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/cyber_garden.png",  fallback:"linear-gradient(135deg,#001408,#002810,#00ff8840)", accentColor:"#00ff88", borderColor:"rgba(0,255,136,0.6)",  panelTint:"rgba(0,12,6,0.68)",  scrimTop:"rgba(0,10,4,0.82)",  scrimBot:"rgba(0,10,4,0.95)",  glowColor:"#00cc66", badgeStroke:"rgba(0,255,136,0.6)",  progressFrom:"#00cc66", progressTo:"#00ff88" },

  // ── MARKETPLACE EXCLUSIVE COVERS — TOUCH GRASS TRENCHES PACK ────────────
  { slug:"marketplace_ath_overlook",       name:"ATH Overlook",        unlockDay:null, marketplaceOnly:true, pack:"trenches_pack", description:"Marketplace exclusive — Touch Grass Trenches Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/ath_overlook.png",        fallback:"linear-gradient(135deg,#0a1400,#142800,#a8ff4440)", accentColor:"#a8ff44", borderColor:"rgba(168,255,68,0.6)",  panelTint:"rgba(6,10,0,0.68)",  scrimTop:"rgba(4,8,0,0.82)",  scrimBot:"rgba(4,8,0,0.95)",  glowColor:"#88dd00", badgeStroke:"rgba(168,255,68,0.6)",  progressFrom:"#88dd00", progressTo:"#a8ff44" },
  { slug:"marketplace_rug_pull_ravine",    name:"Rug Pull Ravine",     unlockDay:null, marketplaceOnly:true, pack:"trenches_pack", description:"Marketplace exclusive — Touch Grass Trenches Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/rug_pull_ravine.png",    fallback:"linear-gradient(135deg,#140000,#280000,#ff444440)", accentColor:"#ff4444", borderColor:"rgba(255,68,68,0.6)",   panelTint:"rgba(14,0,0,0.68)",  scrimTop:"rgba(10,0,0,0.82)",  scrimBot:"rgba(10,0,0,0.95)",  glowColor:"#cc0000", badgeStroke:"rgba(255,68,68,0.6)",   progressFrom:"#cc0000", progressTo:"#ff4444" },
  { slug:"marketplace_bear_market_blizzard", name:"Bear Market Blizzard", unlockDay:null, marketplaceOnly:true, pack:"trenches_pack", description:"Marketplace exclusive — Touch Grass Trenches Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/bear_market_blizzard.png", fallback:"linear-gradient(135deg,#060810,#0c1020,#7799ff40)", accentColor:"#7799ff", borderColor:"rgba(119,153,255,0.6)", panelTint:"rgba(4,6,14,0.68)",  scrimTop:"rgba(4,4,12,0.82)",  scrimBot:"rgba(4,4,12,0.95)",  glowColor:"#4466dd", badgeStroke:"rgba(119,153,255,0.6)", progressFrom:"#4466dd", progressTo:"#7799ff" },
  { slug:"marketplace_moonbag_camp",       name:"Moonbag Camp",        unlockDay:null, marketplaceOnly:true, pack:"trenches_pack", description:"Marketplace exclusive — Touch Grass Trenches Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/moonbag_camp.png",       fallback:"linear-gradient(135deg,#0a0800,#1e1400,#ffd70040)", accentColor:"#ffd700", borderColor:"rgba(255,215,0,0.6)",   panelTint:"rgba(10,8,0,0.68)",  scrimTop:"rgba(8,6,0,0.82)",   scrimBot:"rgba(8,6,0,0.95)",   glowColor:"#ccaa00", badgeStroke:"rgba(255,215,0,0.6)",   progressFrom:"#ccaa00", progressTo:"#ffd700" },
  { slug:"marketplace_liquidity_lagoon",   name:"Liquidity Lagoon",    unlockDay:null, marketplaceOnly:true, pack:"trenches_pack", description:"Marketplace exclusive — Touch Grass Trenches Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/liquidity_lagoon.png",   fallback:"linear-gradient(135deg,#001418,#002830,#00ddcc40)", accentColor:"#00ddcc", borderColor:"rgba(0,221,204,0.6)",  panelTint:"rgba(0,10,12,0.68)", scrimTop:"rgba(0,8,10,0.82)",  scrimBot:"rgba(0,8,10,0.95)",  glowColor:"#00aaa0", badgeStroke:"rgba(0,221,204,0.6)",  progressFrom:"#00aaa0", progressTo:"#00ddcc" },

  { slug:"marketplace_city_view",      name:"City View",      unlockDay:null, marketplaceOnly:true, pack:"anime_nature_pack", description:"Marketplace exclusive — Anime Nature Pack", imageUrl:"https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/city_view.png",      fallback:"linear-gradient(135deg,#06050e,#0e0c1e,#7b6ff040)", accentColor:"#a89af0", borderColor:"rgba(168,154,240,0.6)", panelTint:"rgba(6,5,14,0.68)",  scrimTop:"rgba(4,4,12,0.82)",  scrimBot:"rgba(4,4,12,0.95)",  glowColor:"#7b6ff0", badgeStroke:"rgba(168,154,240,0.6)", progressFrom:"#7b6ff0", progressTo:"#a89af0" },
];

// ── Default theme — no cover equipped ─────────────────────────────────────────
export const DEFAULT_THEME = {
  slug:         null,
  name:         null,
  imageUrl:     null,
  fallback:     "linear-gradient(135deg,#0a0c08,#141a10,#0a0c08)",
  accentColor:  "#93a85a",
  borderColor:  "rgba(147,168,90,0.35)",
  panelTint:    "rgba(6,8,4,0.72)",
  scrimTop:     "rgba(4,6,4,0.82)",
  scrimBot:     "rgba(4,6,4,0.94)",
  glowColor:    "#93a85a",
  badgeStroke:  "rgba(147,168,90,0.45)",
  progressFrom: "#5a8a30",
  progressTo:   "#93a85a",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getCoverBySlug(slug) {
  return COVER_DEFINITIONS.find(c => c.slug === slug) ?? null;
}

export function getThemeForProfile(profileRow) {
  if (!profileRow?.active_cover_id) return DEFAULT_THEME;
  return getCoverBySlug(profileRow.active_cover_id) ?? DEFAULT_THEME;
}

export function getHighestUnlockedCover(unlockedCovers) {
  if (!unlockedCovers?.length) return null;
  const unlocked = COVER_DEFINITIONS.filter(c =>
    unlockedCovers.includes(c.slug) && !c.marketplaceOnly
  );
  if (unlocked.length === 0) {
    const any = COVER_DEFINITIONS.filter(c => unlockedCovers.includes(c.slug));
    return any.length ? any[any.length - 1] : null;
  }
  return unlocked.reduce((a, b) => ((b.unlockDay ?? 0) > (a.unlockDay ?? 0) ? b : a));
}

export function resolveActiveCover(profileRow) {
  if (profileRow?.active_cover_id) {
    const active = getCoverBySlug(profileRow.active_cover_id);
    if (active) return active;
  }
  return getHighestUnlockedCover(profileRow?.unlocked_covers);
}

export function isCoverUrlReady(imageUrl) {
  return !!(imageUrl && imageUrl !== "PASTE_URL_HERE");
}