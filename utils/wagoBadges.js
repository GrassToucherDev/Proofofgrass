// utils/wagoBadges.js — cosmetic WAGO Drops badges, derived from a user's claims.
// Nothing is stored: badges are recalculated from claims each time, so old
// claims count automatically. Badges carry no rewards.

export const BADGES = [
  { id: "explorer",   icon: "🧭", art: "/images/wago/badges/explorer.png", name: "Explorer",    unit: "claims", tiers: [5, 10, 25, 50],
    blurb: "Claim drops out in the wild" },
  { id: "shutterbug", icon: "📸", art: "/images/wago/badges/shutterbug.png", name: "Shutterbug",  unit: "proofs", tiers: [5, 10, 25, 50],
    blurb: "Confirm proof photos with a posted link" },
  { id: "rare",       icon: "💎", art: "/images/wago/badges/rare.png", name: "Rare Hunter", unit: "rare finds", tiers: [1, 5, 10],
    blurb: "Claim Rare, Epic or Legendary drops" },
  { id: "trailblazer", icon: "🥾", art: "/images/wago/badges/trailblazer.png", name: "Trailblazer", unit: "trails", tiers: [1, 3, 5],
    blurb: "Complete WAGO Trails" },
];

const ROMAN = ["", "I", "II", "III", "IV"];

export function badgeCounts(claims = [], extra = {}) {
  const real = claims.filter(c => c.status !== "failed");
  return {
    explorer:   real.length,
    shutterbug: real.filter(c => c.proof_status === "awarded").length,
    rare:       real.filter(c => c.rarity && c.rarity !== "common").length,
    trailblazer: extra.trailsCompleted || 0,
  };
}

export function badgeProgress(claims = [], extra = {}) {
  const counts = badgeCounts(claims, extra);
  return BADGES.map(b => {
    const count = counts[b.id] || 0;
    const tier = b.tiers.filter(t => count >= t).length;          // 0 = locked
    const next = b.tiers[tier] ?? null;                           // null = maxed
    const prev = tier > 0 ? b.tiers[tier - 1] : 0;
    return {
      ...b, count, tier, next,
      label: tier > 0 ? `${b.name} ${ROMAN[tier]}` : b.name,
      pct: next ? Math.min(100, Math.round(((count - prev) / (next - prev)) * 100)) : 100,
    };
  });
}
