// utils/badges/registry.js — every badge line in Proof of Grass. Nothing is stored: a count becomes a tier.
// Art lives at /public/badges/<id>-<tier position>.png; until a tier's art arrives a drawn medal is shown.
import { TIER_COLORS } from "../wheelBadges";
export { TIER_COLORS };

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];

export const EXPERIENCES = [
  { id: "pog",     name: "Proof of Grass" },
  { id: "yard",    name: "Yard" },
  { id: "groves",  name: "Groves" },
  { id: "wheel",   name: "WAGO Wheel" },
  { id: "draw",    name: "Grass Draw" },
  { id: "market",  name: "Marketplace" },
  { id: "friends", name: "Referrals" },
];

// id, experience, name, emoji (fallback glyph), unit, tiers (unlock counts), blurb
export const BADGE_LINES = [
  { id: "streak",        exp: "pog",     name: "Streak",         emoji: "🔥", unit: "day best streak", tiers: [7, 14, 30, 50, 100, 180, 365], blurb: "Keep your streak alive" },
  { id: "proofs",        exp: "pog",     name: "Proof Collector", emoji: "📸", unit: "proofs",          tiers: [1, 10, 50, 100],               blurb: "Log proofs of grass" },
  { id: "grass-score",   exp: "pog",     name: "Grass Score",    emoji: "🌿", unit: "grass score",      tiers: [1000, 5000, 10000],            blurb: "Build your Grass Score" },
  { id: "shield",        exp: "pog",     name: "Shield Bearer",  emoji: "🛡️", unit: "shields",          tiers: [1],                            blurb: "Own a streak shield" },
  { id: "challenger",    exp: "yard",    name: "Challenger",     emoji: "🎯", unit: "challenges",       tiers: [1, 3, 10],                     blurb: "Complete challenges" },
  { id: "grove-member",  exp: "groves",  name: "Grove Member",   emoji: "🌳", unit: "groves",           tiers: [1],                            blurb: "Join a grove" },
  { id: "grove-founder", exp: "groves",  name: "Grove Founder",  emoji: "🌲", unit: "groves founded",   tiers: [1],                            blurb: "Found a grove" },
  { id: "wheel-spinner", exp: "wheel",   name: "Wheel Spinner",  emoji: "🎡", unit: "spins",            tiers: [1, 10, 25, 50, 100],           blurb: "Spin the WAGO Wheel" },
  { id: "lucky-pull",    exp: "wheel",   name: "Lucky Pull",     emoji: "🍀", unit: "rare+ pulls",      tiers: [1, 5, 10],                     blurb: "Land rare or better prizes" },
  { id: "draw-entrant",  exp: "draw",    name: "Draw Entrant",   emoji: "🎟️", unit: "draws entered",    tiers: [1, 5, 10],                     blurb: "Enter the Grass Draw" },
  { id: "draw-winner",   exp: "draw",    name: "Draw Winner",    emoji: "🏆", unit: "draws won",        tiers: [1, 3],                         blurb: "Win a Grass Draw" },
  { id: "collector",     exp: "market",  name: "Collector",      emoji: "🧰", unit: "items owned",      tiers: [1, 5, 10, 25],                 blurb: "Collect marketplace items" },
  { id: "recruiter",     exp: "friends", name: "Recruiter",      emoji: "🤝", unit: "friends brought",  tiers: [1, 5, 10, 25, 50, 100],        blurb: "Bring friends to the grass" },
];

export function badgeFor(line, count) {
  const n = Math.max(0, Number(count) || 0);
  const tier = line.tiers.filter(t => n >= t).length;
  const next = line.tiers[tier] ?? null;
  const prev = tier > 0 ? line.tiers[tier - 1] : 0;
  return {
    id: line.id, exp: line.exp, name: line.name, emoji: line.emoji, unit: line.unit, blurb: line.blurb,
    count: n, tier, maxTier: line.tiers.length, next,
    label: tier > 0 && line.tiers.length > 1 ? `${line.name} ${ROMAN[tier]}` : line.name,
    pct: next ? Math.min(100, Math.round(((n - prev) / (next - prev)) * 100)) : 100,
  };
}

export function buildBadges(counts = {}) {
  return BADGE_LINES.map(l => badgeFor(l, counts[l.id] || 0));
}
