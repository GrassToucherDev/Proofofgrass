// ════════════════════════════════════════════════════════════════════════════
// BURN_THEMES — Single source of truth for Double Burner Collection card themes
// ════════════════════════════════════════════════════════════════════════════

export const BURN_THEMES = {
  tropical_burn: {
    key: "tropical_burn",
    title: "Tropical Burn",
    image: "/burn-themes/tropical_burn.png",
    accent: "#4ade80",
    glow: "rgba(74,222,128,0.35)",
  },
  jungle_burn: {
    key: "jungle_burn",
    title: "Jungle Burn",
    image: "/burn-themes/jungle_burn.png",
    accent: "#93a85a",
    glow: "rgba(147,168,90,0.35)",
  },
  volcano_burn: {
    key: "volcano_burn",
    title: "Volcano Burn",
    image: "/burn-themes/volcano_burn.png",
    accent: "#f97316",
    glow: "rgba(249,115,22,0.4)",
  },
  prestige_burn: {
    key: "prestige_burn",
    title: "Prestige Burn",
    image: "/burn-themes/prestige_burn.png",
    accent: "#c8a84b",
    glow: "rgba(200,168,75,0.4)",
  },
  shield_burn: {
    key: "shield_burn",
    title: "Shield Burn",
    image: "/burn-themes/shield_burn.png",
    accent: "#60a5fa",
    glow: "rgba(96,165,250,0.35)",
  },
};

export function getBurnTheme(key) {
  return BURN_THEMES[key] ?? null;
}

// ── Burn-tier frames (future-ready, derived from shield_count) ────────────────
export const BURN_TIERS = [
  { key:"legendary", minShields:10, label:"Legendary", color:"#a78bfa", glow:"rgba(167,139,250,0.5)" },
  { key:"gold",       minShields:5,  label:"Gold",       color:"#c8a84b", glow:"rgba(200,168,75,0.5)" },
  { key:"silver",     minShields:3,  label:"Silver",     color:"#c0c0c0", glow:"rgba(192,192,192,0.4)" },
  { key:"bronze",     minShields:1,  label:"Bronze",     color:"#cd7f32", glow:"rgba(205,127,50,0.4)" },
];

export function getBurnTier(shieldCount) {
  return BURN_TIERS.find(t => shieldCount >= t.minShields) ?? null;
}

// ── Rotating burn quotes ───────────────────────────────────────────────────────
export const BURN_QUOTES = [
  "Every burn is a promise kept.",
  "Supply falls. Conviction rises.",
  "We don't just touch grass. We burn for it.",
  "The fire doesn't lie.",
  "Scarcity is earned, not given.",
  "Double the burn. Double the belief.",
  "What's burned can't be unburned.",
  "Built different. Burned different.",
];

export function getRandomBurnQuote(seed) {
  if (seed != null) {
    const idx = Math.abs(seed) % BURN_QUOTES.length;
    return BURN_QUOTES[idx];
  }
  return BURN_QUOTES[Math.floor(Math.random() * BURN_QUOTES.length)];
}