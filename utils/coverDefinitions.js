// ════════════════════════════════════════════════════════════════════════════
// PRESTIGE COVERS — Configuration (V1: streak-progression only)
// ════════════════════════════════════════════════════════════════════════════
// Place this file at: lib/coverDefinitions.js (or utils/coverDefinitions.js —
// match wherever `utils/supabase.js` lives in your project structure).
//
// Each cover unlocks automatically when a user's best_streak crosses the
// `unlockDay` threshold (checked server-side in lock_in_streak).
//
// imageUrl points to Supabase Storage — create a public bucket called
// "covers" and upload placeholder artwork at these paths. Swap files later
// without touching code, as long as the path/filename stays the same.
//
// ── FUTURE PREMIUM VARIANTS (Phase 2 — NOT implemented yet) ──────────────────
// Premium covers will reference a `premiumOf` field pointing back to their
// base cover's slug, plus `requiresTokenLock: true` (enforcement TBD in
// Phase 2). Example shape (commented out, for future reference):
//
//   celestial_ascension_premium: {
//     slug: "celestial_ascension_premium",
//     name: "Celestial Ascension (Premium)",
//     unlockDay: 500,
//     premiumOf: "celestial_ascension",
//     requiresTokenLock: true,  // Phase 2 — not enforced in V1
//     imageUrl: `${COVERS_BASE_URL}/celestial_ascension_premium.jpg`,
//   }
//
// V1 only implements the base (non-premium) covers below.
// ════════════════════════════════════════════════════════════════════════════

// Replace with your actual Supabase project URL + "covers" bucket path.
// Example: https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers
export const COVERS_BASE_URL =
  "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public/covers";

export const COVER_DEFINITIONS = [
  {
    slug: "day_7_golden_hour",
    name: "Golden Hour",
    unlockDay: 7,
    description: "Reach a 7-day streak",
    imageUrl: `${COVERS_BASE_URL}/golden_hour.jpg`,
  },
  {
    slug: "day_14_rooted_grove",
    name: "Rooted Grove",
    unlockDay: 14,
    description: "Reach a 14-day streak",
    imageUrl: `${COVERS_BASE_URL}/rooted_grove.jpg`,
  },
  {
    slug: "day_30_mountain_summit",
    name: "Mountain Summit",
    unlockDay: 30,
    description: "Reach a 30-day streak",
    imageUrl: `${COVERS_BASE_URL}/mountain_summit.jpg`,
  },
  {
    slug: "day_50_ancient_forest",
    name: "Ancient Forest",
    unlockDay: 50,
    description: "Reach a 50-day streak",
    imageUrl: `${COVERS_BASE_URL}/ancient_forest.jpg`,
  },
  {
    slug: "day_100_ascended_night_sky",
    name: "Ascended Night Sky",
    unlockDay: 100,
    description: "Reach a 100-day streak",
    imageUrl: `${COVERS_BASE_URL}/ascended_night_sky.jpg`,
    // FUTURE (Phase 2): premium variant "celestial_ascension_premium"
    // shares this unlockDay but additionally requires a token lock.
  },
  {
    slug: "day_180_sun_temple",
    name: "Sun Temple",
    unlockDay: 180,
    description: "Reach a 180-day streak",
    imageUrl: `${COVERS_BASE_URL}/sun_temple.jpg`,
  },
  {
    slug: "day_365_eternal_garden",
    name: "Eternal Garden",
    unlockDay: 365,
    description: "Reach a 365-day streak",
    imageUrl: `${COVERS_BASE_URL}/eternal_garden.jpg`,
  },
  {
    slug: "day_500_celestial_ascension",
    name: "Celestial Ascension",
    unlockDay: 500,
    description: "Reach a 500-day streak",
    imageUrl: `${COVERS_BASE_URL}/celestial_ascension.jpg`,
  },
];

// Helper: get a cover's definition by slug (returns null if not found)
export function getCoverBySlug(slug) {
  return COVER_DEFINITIONS.find(c => c.slug === slug) || null;
}

// Helper: get the highest-tier cover a user has unlocked (for default display
// if no active_cover_id is set) — returns null if none unlocked yet.
export function getHighestUnlockedCover(unlockedCovers) {
  if (!unlockedCovers || unlockedCovers.length === 0) return null;
  const unlocked = COVER_DEFINITIONS.filter(c => unlockedCovers.includes(c.slug));
  if (unlocked.length === 0) return null;
  return unlocked.reduce((a, b) => (b.unlockDay > a.unlockDay ? b : a));
}

// Helper: resolve which cover image to show for a profile.
// Falls back to highest unlocked, then null (no cover / default background).
export function resolveActiveCover(profileRow) {
  if (profileRow?.active_cover_id) {
    const active = getCoverBySlug(profileRow.active_cover_id);
    if (active) return active;
  }
  return getHighestUnlockedCover(profileRow?.unlocked_covers);
}