// utils/wheelBadges.js — the Wheel Spinner badge. Cosmetic and tiered, like the WAGO Drops badges:
// nothing is stored, the tier is worked out from how many spins an account has made. Badges carry no rewards.
export const SPIN_TIERS = [1, 10, 25, 50, 100];
export const SPIN_TIER_NAMES = ["", "First Spin", "Wheel Regular", "Wheel Fan", "Wheel Veteran", "Wheel Legend"];
const ROMAN = ["", "I", "II", "III", "IV", "V"];
// medal colors per tier: [rim, face, shine]
export const TIER_COLORS = [
  ["#b8bfae", "#e6eadf", "#ffffff"],   // 0 locked
  ["#a8693a", "#e8b585", "#ffe2c2"],   // 1 bronze
  ["#8d99a6", "#dbe3ea", "#ffffff"],   // 2 silver
  ["#c58a12", "#ffd54a", "#fff3b8"],   // 3 gold
  ["#1f8f5f", "#7be0b0", "#e1fff0"],   // 4 emerald
  ["#7a3fc4", "#c9a2ff", "#f1e6ff"],   // 5 amethyst
];

export function spinBadge(count) {
  const n = Math.max(0, Number(count) || 0);
  const tier = SPIN_TIERS.filter(t => n >= t).length;
  const next = SPIN_TIERS[tier] ?? null;
  const prev = tier > 0 ? SPIN_TIERS[tier - 1] : 0;
  return {
    id: "wheel_spinner", count: n, tier, next, unit: "spins",
    name: "Wheel Spinner",
    label: tier > 0 ? `Wheel Spinner ${ROMAN[tier]}` : "Wheel Spinner",
    title: SPIN_TIER_NAMES[tier] || "",
    blurb: "Spin the WAGO Wheel",
    pct: next ? Math.min(100, Math.round(((n - prev) / (next - prev)) * 100)) : 100,
  };
}

// The badge a spin just unlocked, if that spin was exactly a tier threshold (its position in the account's history).
export function unlockedByRank(rank) {
  return SPIN_TIERS.includes(rank) ? spinBadge(rank) : null;
}
