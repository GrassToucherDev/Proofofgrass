// utils/wagoBadges.js — cosmetic WAGO Drops badges, derived from a user's claims.
// Nothing is stored: badges are recalculated from claims each time, so old
// claims count automatically. Badges carry no rewards.

export const BADGES = [
  { id: "explorer",   icon: "🧭", name: "Explorer",    unit: "claims", tiers: [5, 10, 25, 50],
    blurb: "Claim drops out in the wild" },
  { id: "shutterbug", icon: "📸", name: "Shutterbug",  unit: "proofs", tiers: [5, 10, 25, 50],
    blurb: "Confirm proof photos with a posted link" },
  { id: "rare",       icon: "💎", name: "Rare Hunter", unit: "rare finds", tiers: [1, 5, 10],
    blurb: "Claim Rare, Epic or Legendary drops" },
];

const ROMAN = ["", "I", "II", "III", "IV"];

export function badgeCounts(claims = []) {
  const real = claims.filter(c => c.status !== "failed");
  return {
    explorer:   real.length,
    shutterbug: real.filter(c => c.proof_status === "awarded").length,
    rare:       real.filter(c => c.rarity && c.rarity !== "common").length,
  };
}

export function badgeProgress(claims = []) {
  const counts = badgeCounts(claims);
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
