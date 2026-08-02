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