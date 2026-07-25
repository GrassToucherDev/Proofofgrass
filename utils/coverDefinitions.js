// ════════════════════════════════════════════════════════════════════════════
// PRESTIGE COVERS — Configuration
// Place this file at: utils/coverDefinitions.js
// ════════════════════════════════════════════════════════════════════════════

const COVER_URLS = {
  golden_hour:         "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/golden_hour.png",
  rooted_grove:        "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/rooted_grove.png",
  mountain_summit:     "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/mountain_summit.png",
  ancient_forest:      "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/ancient_forest.png",
  ascended_night_sky:  "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/ascended_night_sky.png",
  sun_temple:          "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/sun_temple.png",
  eternal_garden:      "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/eternal_garden.png",
  celestial_ascension: "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/celestial_ascension.png",
  // ── Marketplace exclusives ─────────────────────────────────────────────
  retro_beach:         "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/retro_beach.png",
  retro_mountain:      "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/retro_mountain.png",
  retro_sunflower:     "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/retro_sunflower.png",
  retro_waterfall:     "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/retro_waterfall.png",
  retro_night:         "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers/retro_night.png",
};

const COVER_FALLBACKS = {
  golden_hour:         "linear-gradient(135deg,#1a1200,#4a3800,#c8a84b40)",
  rooted_grove:        "linear-gradient(135deg,#0a1a08,#1a3010,#2d4a18)",
  mountain_summit:     "linear-gradient(135deg,#0d0d14,#1a1a2e,#4a4a6a)",
  ancient_forest:      "linear-gradient(135deg,#061208,#0d2414,#1a4020)",
  ascended_night_sky:  "linear-gradient(135deg,#04040e,#0a0a1e,#1a1a3e)",
  sun_temple:          "linear-gradient(135deg,#1a0e00,#3d2800,#c8841b30)",
  eternal_garden:      "linear-gradient(135deg,#041008,#0a2010,#93a85a20)",
  celestial_ascension: "linear-gradient(135deg,#060410,#0e0a1e,#a78bfa30)",
  // ── Marketplace exclusives ─────────────────────────────────────────────
  retro_beach:         "linear-gradient(135deg,#001a2e,#003d5c,#56bef840)",
  retro_mountain:      "linear-gradient(135deg,#0d0d14,#1a1a2e,#6a6aaa40)",
  retro_sunflower:     "linear-gradient(135deg,#1a1200,#3d2e00,#f5b94240)",
  retro_waterfall:     "linear-gradient(135deg,#001a14,#00352a,#34d39940)",
  retro_night:         "linear-gradient(135deg,#04040e,#0a0a1e,#a78bfa40)",
};

export const COVER_DEFINITIONS = [
  // ── Streak progression covers ──────────────────────────────────────────
  {
    slug:        "day_7_golden_hour",
    name:        "Golden Hour",
    unlockDay:   7,
    description: "Reach a 7-day streak",
    imageUrl:    COVER_URLS.golden_hour,
    fallback:    COVER_FALLBACKS.golden_hour,
  },
  {
    slug:        "day_14_rooted_grove",
    name:        "Rooted Grove",
    unlockDay:   14,
    description: "Reach a 14-day streak",
    imageUrl:    COVER_URLS.rooted_grove,
    fallback:    COVER_FALLBACKS.rooted_grove,
  },
  {
    slug:        "day_30_mountain_summit",
    name:        "Mountain Summit",
    unlockDay:   30,
    description: "Reach a 30-day streak",
    imageUrl:    COVER_URLS.mountain_summit,
    fallback:    COVER_FALLBACKS.mountain_summit,
  },
  {
    slug:        "day_50_ancient_forest",
    name:        "Ancient Forest",
    unlockDay:   50,
    description: "Reach a 50-day streak",
    imageUrl:    COVER_URLS.ancient_forest,
    fallback:    COVER_FALLBACKS.ancient_forest,
  },
  {
    slug:        "day_100_ascended_night_sky",
    name:        "Ascended Night Sky",
    unlockDay:   100,
    description: "Reach a 100-day streak",
    imageUrl:    COVER_URLS.ascended_night_sky,
    fallback:    COVER_FALLBACKS.ascended_night_sky,
  },
  {
    slug:        "day_180_sun_temple",
    name:        "Sun Temple",
    unlockDay:   180,
    description: "Reach a 180-day streak",
    imageUrl:    COVER_URLS.sun_temple,
    fallback:    COVER_FALLBACKS.sun_temple,
  },
  {
    slug:        "day_365_eternal_garden",
    name:        "Eternal Garden",
    unlockDay:   365,
    description: "Reach a 365-day streak",
    imageUrl:    COVER_URLS.eternal_garden,
    fallback:    COVER_FALLBACKS.eternal_garden,
  },
  {
    slug:        "day_500_celestial_ascension",
    name:        "Celestial Ascension",
    unlockDay:   500,
    description: "Reach a 500-day streak",
    imageUrl:    COVER_URLS.celestial_ascension,
    fallback:    COVER_FALLBACKS.celestial_ascension,
  },
  // ── Marketplace exclusive covers ───────────────────────────────────────
  {
    slug:            "marketplace_retro_beach",
    name:            "Retro Beach",
    unlockDay:       null,
    marketplaceOnly: true,
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        COVER_URLS.retro_beach,
    fallback:        COVER_FALLBACKS.retro_beach,
  },
  {
    slug:            "marketplace_retro_mountain",
    name:            "Retro Mountain",
    unlockDay:       null,
    marketplaceOnly: true,
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        COVER_URLS.retro_mountain,
    fallback:        COVER_FALLBACKS.retro_mountain,
  },
  {
    slug:            "marketplace_retro_sunflower",
    name:            "Retro Sunflower",
    unlockDay:       null,
    marketplaceOnly: true,
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        COVER_URLS.retro_sunflower,
    fallback:        COVER_FALLBACKS.retro_sunflower,
  },
  {
    slug:            "marketplace_retro_waterfall",
    name:            "Retro Waterfall",
    unlockDay:       null,
    marketplaceOnly: true,
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        COVER_URLS.retro_waterfall,
    fallback:        COVER_FALLBACKS.retro_waterfall,
  },
  {
    slug:            "marketplace_retro_night",
    name:            "Retro Night",
    unlockDay:       null,
    marketplaceOnly: true,
    description:     "Marketplace exclusive — Retro Covers Pack",
    imageUrl:        COVER_URLS.retro_night,
    fallback:        COVER_FALLBACKS.retro_night,
  },
];

// Helper: get a cover definition by slug
export function getCoverBySlug(slug) {
  return COVER_DEFINITIONS.find(c => c.slug === slug) || null;
}

// Helper: get the highest-tier unlocked cover (streak covers only)
export function getHighestUnlockedCover(unlockedCovers) {
  if (!unlockedCovers || unlockedCovers.length === 0) return null;
  const unlocked = COVER_DEFINITIONS.filter(c =>
    unlockedCovers.includes(c.slug) && !c.marketplaceOnly
  );
  if (unlocked.length === 0) {
    // Fall back to any unlocked cover including marketplace
    const any = COVER_DEFINITIONS.filter(c => unlockedCovers.includes(c.slug));
    if (any.length === 0) return null;
    return any[any.length - 1];
  }
  return unlocked.reduce((a, b) => ((b.unlockDay ?? 0) > (a.unlockDay ?? 0) ? b : a));
}

// Helper: resolve which cover to display for a profile row.
export function resolveActiveCover(profileRow) {
  if (profileRow?.active_cover_id) {
    const active = getCoverBySlug(profileRow.active_cover_id);
    if (active) return active;
  }
  return getHighestUnlockedCover(profileRow?.unlocked_covers);
}

// Helper: check if a URL is a real URL (not the placeholder string)
export function isCoverUrlReady(imageUrl) {
  return imageUrl && imageUrl !== "PASTE_URL_HERE";
}