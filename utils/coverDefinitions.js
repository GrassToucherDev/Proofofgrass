// ════════════════════════════════════════════════════════════════════════════
// PRESTIGE COVERS — Configuration (V1: streak-progression only)
// Place this file at: utils/coverDefinitions.js
// ════════════════════════════════════════════════════════════════════════════
// Paste each cover's exact Supabase Storage public URL below.
// Get these from: Supabase dashboard → Storage → covers bucket →
//   click file → Copy URL (the long https://...supabase.co/storage/... URL)
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
};

// Fallback gradients — shown when image URL is missing or fails to load.
// These match the cover's thematic feel so the gallery always looks intentional.
const COVER_FALLBACKS = {
  golden_hour:         "linear-gradient(135deg,#1a1200,#4a3800,#c8a84b40)",
  rooted_grove:        "linear-gradient(135deg,#0a1a08,#1a3010,#2d4a18)",
  mountain_summit:     "linear-gradient(135deg,#0d0d14,#1a1a2e,#4a4a6a)",
  ancient_forest:      "linear-gradient(135deg,#061208,#0d2414,#1a4020)",
  ascended_night_sky:  "linear-gradient(135deg,#04040e,#0a0a1e,#1a1a3e)",
  sun_temple:          "linear-gradient(135deg,#1a0e00,#3d2800,#c8841b30)",
  eternal_garden:      "linear-gradient(135deg,#041008,#0a2010,#93a85a20)",
  celestial_ascension: "linear-gradient(135deg,#060410,#0e0a1e,#a78bfa30)",
};

export const COVER_DEFINITIONS = [
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
    // FUTURE (Phase 2): premium variant "celestial_ascension_premium"
    // requiresTokenLock: true (not enforced in V1)
  },
];

// Helper: get a cover definition by slug
export function getCoverBySlug(slug) {
  return COVER_DEFINITIONS.find(c => c.slug === slug) || null;
}

// Helper: get the highest-tier unlocked cover
export function getHighestUnlockedCover(unlockedCovers) {
  if (!unlockedCovers || unlockedCovers.length === 0) return null;
  const unlocked = COVER_DEFINITIONS.filter(c => unlockedCovers.includes(c.slug));
  if (unlocked.length === 0) return null;
  return unlocked.reduce((a, b) => (b.unlockDay > a.unlockDay ? b : a));
}

// Helper: resolve which cover to display for a profile row.
// Falls back to highest unlocked, then null (default background shown).
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