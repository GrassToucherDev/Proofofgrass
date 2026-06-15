// ════════════════════════════════════════════════════════════════════════════
// SPOTLIGHT_BADGES — Single source of truth for all spotlight badge metadata
// Import this everywhere rather than hardcoding badge paths or titles.
//
// Scalable: add new categories here and they automatically propagate to
// profile achievements, spotlight page, flex cards, activity feed, and
// the spotlight card generator.
// ════════════════════════════════════════════════════════════════════════════

export const SPOTLIGHT_BADGES = {
  longest_streak: {
    key:        "longest_streak",
    image:      "/badges/longest_streak_champion.png",
    title:      "Longest Streak Champion",
    emoji:      "🔥",
    label:      "LONGEST STREAK",
    color:      "#f97316",
    glow:       "rgba(249,115,22,0.35)",
    theme: {
      bg1:"#0e0800", bg2:"#1a0e00", bg3:"#0a0600",
      glow1:"#f97316", glow2:"#c8a84b",
      particle:"rgba(249,115,22,0.6)",
      accent:"#f97316",
    },
    xCaption: (username, week) =>
      `🔥 I just won the Longest Streak Champion Spotlight on Proof of Grass!\n\n${week}\n\n💪 Touching grass every day pays off.\n\nProofOfGrass.app`,
  },
  meme_lord: {
    key:        "meme_lord",
    image:      "/badges/meme_lord.png",
    title:      "Meme Lord",
    emoji:      "😂",
    label:      "MEME LORD",
    color:      "#c8a84b",
    glow:       "rgba(200,168,75,0.35)",
    theme: {
      bg1:"#0e0d00", bg2:"#1a1800", bg3:"#0a0900",
      glow1:"#c8a84b", glow2:"#93a85a",
      particle:"rgba(200,168,75,0.6)",
      accent:"#c8a84b",
    },
    xCaption: (username, week) =>
      `😂 I won Meme Lord in the Community Spotlight on Proof of Grass!\n\n${week}\n\nThe memes are real. So is the grass.\n\nProofOfGrass.app`,
  },
  biggest_shiller: {
    key:        "biggest_shiller",
    image:      "/badges/biggest_shiller.png",
    title:      "Biggest Shiller",
    emoji:      "📣",
    label:      "BIGGEST SHILLER",
    color:      "#93a85a",
    glow:       "rgba(147,168,90,0.35)",
    theme: {
      bg1:"#040e04", bg2:"#081a08", bg3:"#020a02",
      glow1:"#93a85a", glow2:"#4ade80",
      particle:"rgba(147,168,90,0.6)",
      accent:"#93a85a",
    },
    xCaption: (username, week) =>
      `📣 I won Biggest Shiller in the Community Spotlight on Proof of Grass!\n\n${week}\n\nBuilding the movement one post at a time.\n\nProofOfGrass.app`,
  },
  space_warrior: {
    key:        "space_warrior",
    image:      "/badges/space_warrior.png",
    title:      "Space Warrior",
    emoji:      "🎧",
    label:      "SPACE WARRIOR",
    color:      "#a78bfa",
    glow:       "rgba(167,139,250,0.35)",
    theme: {
      bg1:"#04020e", bg2:"#08041a", bg3:"#02010a",
      glow1:"#a78bfa", glow2:"#6366f1",
      particle:"rgba(167,139,250,0.6)",
      accent:"#a78bfa",
    },
    xCaption: (username, week) =>
      `🎧 I won Space Warrior in the Community Spotlight on Proof of Grass!\n\n${week}\n\nSpaces don't sleep. Neither does the grass.\n\nProofOfGrass.app`,
  },
};

// Helper: get badge by category key, with safe fallback
export function getSpotlightBadge(category) {
  return SPOTLIGHT_BADGES[category] ?? null;
}

// Helper: get feed text for activity feed
export function getSpotlightFeedText(category) {
  const b = getSpotlightBadge(category);
  return b ? `earned the ${b.title} badge` : "won Community Spotlight";
}

// Helper: get X caption for a win
export function getSpotlightCaption(category, username, weekLabel) {
  const b = getSpotlightBadge(category);
  return b ? b.xCaption(username, weekLabel) : `🏆 I won Community Spotlight on Proof of Grass!\n\nProofOfGrass.app`;
}