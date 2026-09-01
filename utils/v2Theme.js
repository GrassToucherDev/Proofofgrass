// utils/v2Theme.js
// Proof of Grass V2 — Centralized Design Tokens
// All pages and components import from here
// Change once, updates everywhere

export const V2 = {

  // ── Colors ──────────────────────────────────────────────────────────────────

  // Sky / Background
  skyBlue:        "#e8f4fd",
  skyMid:         "#c5e3f7",
  skyDeep:        "#a8d4f0",
  cloudWhite:     "#ffffff",
  cloudSoft:      "#f5f9fe",

  // Grass / Green
  grassLime:      "#7dc832",   // primary CTA buttons
  grassGreen:     "#5ba622",   // hover state
  grassDark:      "#3d7a12",   // dark grass
  forestGreen:    "#0d2a05",   // deep forest, primary text
  forestMid:      "#1a4a0a",   // secondary headings
  forestLight:    "#2d6b1a",   // body text on light bg

  // Gold / Accent
  gold:           "#e8a020",
  goldLight:      "#f5c04a",
  goldSoft:       "#fef3d8",
  orange:         "#f07020",

  // Neutrals
  white:          "#ffffff",
  offWhite:       "#f8fbf5",
  softGray:       "#e8eee4",
  midGray:        "#a0b090",
  dimGray:        "#6b7d60",

  // Status
  success:        "#5ba622",
  warning:        "#e8a020",
  danger:         "#e05050",
  info:           "#4a90d9",

  // Legacy dark (for elements that stay dark)
  dark:           "#080a06",
  dark2:          "#0e100b",

  // ── Surfaces ─────────────────────────────────────────────────────────────────

  // Glass surfaces
  glassWhite:     "rgba(255,255,255,0.75)",
  glassWhiteSoft: "rgba(255,255,255,0.55)",
  glassWhiteThin: "rgba(255,255,255,0.35)",
  glassSky:       "rgba(232,244,253,0.80)",
  glassGreen:     "rgba(125,200,50,0.12)",
  glassGold:      "rgba(232,160,32,0.12)",
  glassDark:      "rgba(8,10,6,0.75)",

  // Borders
  borderWhite:    "rgba(255,255,255,0.6)",
  borderSoft:     "rgba(200,220,190,0.5)",
  borderGreen:    "rgba(125,200,50,0.35)",
  borderGold:     "rgba(232,160,32,0.35)",
  borderDark:     "rgba(0,0,0,0.08)",

  // ── Typography ───────────────────────────────────────────────────────────────

  fontSerif:      "'Cormorant Garamond', Georgia, serif",
  fontSans:       "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",

  // Text colors on light backgrounds
  textPrimary:    "#0d2a05",   // forest green — main headings
  textSecondary:  "#1a4a0a",   // mid green — subtext
  textBody:       "#1e3a10",   // body copy
  textMuted:      "#2d5a1a",   // labels, captions
  textDim:        "#4a7a30",   // placeholders, disabled

  // Text colors on dark backgrounds
  textOnDark:     "#f0efea",
  textOnDarkMuted:"rgba(240,239,234,0.7)",

  // ── Shadows ──────────────────────────────────────────────────────────────────

  shadowSm:   "0 2px 8px rgba(26,74,10,0.08)",
  shadowMd:   "0 4px 20px rgba(26,74,10,0.12)",
  shadowLg:   "0 8px 40px rgba(26,74,10,0.16)",
  shadowXl:   "0 16px 60px rgba(26,74,10,0.20)",
  shadowGlow: "0 0 24px rgba(125,200,50,0.3)",
  shadowGold: "0 0 24px rgba(232,160,32,0.3)",
  shadowCard: "0 2px 16px rgba(26,74,10,0.10), 0 1px 4px rgba(26,74,10,0.06)",

  // ── Border Radius ────────────────────────────────────────────────────────────

  radiusSm:   "8px",
  radiusMd:   "14px",
  radiusLg:   "20px",
  radiusXl:   "28px",
  radiusFull: "9999px",

  // ── Spacing ──────────────────────────────────────────────────────────────────

  spacingXs:  "4px",
  spacingSm:  "8px",
  spacingMd:  "16px",
  spacingLg:  "24px",
  spacingXl:  "40px",
  spacing2xl: "64px",

  // ── Blur / Glass ─────────────────────────────────────────────────────────────

  blurSm:     "blur(8px)",
  blurMd:     "blur(16px)",
  blurLg:     "blur(24px)",

  // ── Breakpoints ──────────────────────────────────────────────────────────────

  bpSm:   "480px",
  bpMd:   "768px",
  bpLg:   "1024px",
  bpXl:   "1440px",

  // ── Gradients ────────────────────────────────────────────────────────────────

  gradientSky:     "linear-gradient(180deg, #c5e3f7 0%, #e8f4fd 40%, #f0f8ee 100%)",
  gradientHero:    "linear-gradient(160deg, #a8d4f0 0%, #d4edf8 30%, #e8f4fd 60%, #f0f8ee 100%)",
  gradientGrass:   "linear-gradient(180deg, #5ba622 0%, #3d7a12 100%)",
  gradientGrassBtn:"linear-gradient(135deg, #7dc832 0%, #5ba622 100%)",
  gradientGold:    "linear-gradient(135deg, #f5c04a 0%, #e8a020 100%)",
  gradientCard:    "linear-gradient(160deg, rgba(255,255,255,0.9) 0%, rgba(248,251,245,0.95) 100%)",
  gradientForest:  "linear-gradient(180deg, #1a4a0a 0%, #0d2a05 100%)",

  // ── Animations ───────────────────────────────────────────────────────────────

  transitionFast:   "all 0.15s ease",
  transitionMd:     "all 0.25s ease",
  transitionSlow:   "all 0.4s ease",

  // ── Component Heights ────────────────────────────────────────────────────────

  navHeight:        "60px",
  bottomNavHeight:  "64px",
  btnHeightSm:      "36px",
  btnHeightMd:      "48px",
  btnHeightLg:      "56px",

};

// ── Reusable component styles ──────────────────────────────────────────────────

export const V2Styles = {

  // Glass card
  glassCard: {
    background:    V2.glassWhite,
    backdropFilter: V2.blurMd,
    WebkitBackdropFilter: V2.blurMd,
    border:        `1px solid ${V2.borderWhite}`,
    borderRadius:  V2.radiusLg,
    boxShadow:     V2.shadowCard,
  },

  // Glass card — sky tint
  glassSkyCard: {
    background:    V2.glassSky,
    backdropFilter: V2.blurMd,
    WebkitBackdropFilter: V2.blurMd,
    border:        `1px solid ${V2.borderWhite}`,
    borderRadius:  V2.radiusLg,
    boxShadow:     V2.shadowCard,
  },

  // Primary CTA button
  btnPrimary: {
    background:    V2.gradientGrassBtn,
    color:         V2.white,
    border:        "none",
    borderRadius:  V2.radiusFull,
    fontFamily:    V2.fontSans,
    fontWeight:    700,
    fontSize:      "15px",
    letterSpacing: "0.04em",
    cursor:        "pointer",
    boxShadow:     V2.shadowGlow,
    transition:    V2.transitionFast,
    padding:       "14px 28px",
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "8px",
  },

  // Secondary button
  btnSecondary: {
    background:    V2.glassWhite,
    color:         V2.forestGreen,
    border:        `1.5px solid ${V2.borderGreen}`,
    borderRadius:  V2.radiusFull,
    fontFamily:    V2.fontSans,
    fontWeight:    600,
    fontSize:      "15px",
    letterSpacing: "0.02em",
    cursor:        "pointer",
    transition:    V2.transitionFast,
    padding:       "13px 28px",
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "8px",
    backdropFilter: V2.blurSm,
  },

  // Ghost button (dark bg)
  btnGhost: {
    background:    "rgba(255,255,255,0.15)",
    color:         V2.white,
    border:        "1.5px solid rgba(255,255,255,0.4)",
    borderRadius:  V2.radiusFull,
    fontFamily:    V2.fontSans,
    fontWeight:    600,
    fontSize:      "14px",
    cursor:        "pointer",
    transition:    V2.transitionFast,
    padding:       "10px 20px",
    backdropFilter: V2.blurSm,
  },

  // Stat card
  statCard: {
    background:    V2.glassWhite,
    backdropFilter: V2.blurMd,
    WebkitBackdropFilter: V2.blurMd,
    border:        `1px solid ${V2.borderWhite}`,
    borderRadius:  V2.radiusLg,
    boxShadow:     V2.shadowCard,
    padding:       "20px",
  },

  // Section label
  sectionLabel: {
    fontFamily:    V2.fontSans,
    fontSize:      "11px",
    fontWeight:    700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color:         V2.grassGreen,
  },

  // Hero heading
  heroHeading: {
    fontFamily:    V2.fontSans,
    fontWeight:    800,
    color:         V2.forestGreen,
    lineHeight:    1.1,
  },

  // Serif number (streak, score)
  serifNumber: {
    fontFamily:    V2.fontSerif,
    fontWeight:    700,
    color:         V2.forestGreen,
    lineHeight:    1,
  },

  // Pill / tag
  pill: {
    background:    V2.glassWhite,
    border:        `1px solid ${V2.borderSoft}`,
    borderRadius:  V2.radiusFull,
    padding:       "6px 14px",
    fontSize:      "12px",
    fontWeight:    600,
    color:         V2.forestGreen,
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "6px",
    backdropFilter: V2.blurSm,
    whiteSpace:    "nowrap",
  },

  // Ticker pill
  tickerPill: {
    background:    "rgba(255,255,255,0.85)",
    border:        `1px solid ${V2.borderSoft}`,
    borderRadius:  V2.radiusFull,
    padding:       "6px 14px",
    fontSize:      "12px",
    fontWeight:    500,
    color:         V2.forestGreen,
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "6px",
    backdropFilter: V2.blurSm,
    whiteSpace:    "nowrap",
    flexShrink:    0,
    boxShadow:     "0 1px 4px rgba(26,74,10,0.08)",
  },

  // Nav glass
  navGlass: {
    background:    "rgba(255,255,255,0.85)",
    backdropFilter: V2.blurLg,
    WebkitBackdropFilter: V2.blurLg,
    borderBottom:  `1px solid ${V2.borderSoft}`,
    boxShadow:     "0 2px 16px rgba(26,74,10,0.08)",
  },

  // Bottom nav
  bottomNav: {
    background:    "rgba(255,255,255,0.95)",
    backdropFilter: V2.blurLg,
    WebkitBackdropFilter: V2.blurLg,
    borderTop:     `1px solid ${V2.borderSoft}`,
    boxShadow:     "0 -2px 16px rgba(26,74,10,0.08)",
  },

  // Input
  input: {
    background:    V2.glassWhite,
    border:        `1.5px solid ${V2.borderSoft}`,
    borderRadius:  V2.radiusMd,
    padding:       "12px 16px",
    fontFamily:    V2.fontSans,
    fontSize:      "14px",
    color:         V2.forestGreen,
    outline:       "none",
    width:         "100%",
    boxSizing:     "border-box",
  },
};

// ── Global CSS string (inject into pages) ─────────────────────────────────────

export const V2GlobalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: ${V2.gradientSky};
    color: ${V2.forestGreen};
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    font-weight: 600;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${V2.skyBlue}; }
  ::-webkit-scrollbar-thumb { background: ${V2.grassGreen}40; border-radius: 2px; }

  /* Inputs */
  input, select, textarea, button { font-family: 'DM Sans', sans-serif; }
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: ${V2.grassGreen} !important;
    box-shadow: 0 0 0 3px ${V2.grassGreen}20;
  }

  /* Animations */
  @keyframes v2FadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes v2SlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes v2Float {
    0%, 100% { transform: translateY(0px); }
    50%      { transform: translateY(-6px); }
  }
  @keyframes v2Shimmer {
    0%, 100% { opacity: 0.7; }
    50%      { opacity: 1; }
  }
  @keyframes v2TickerScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes v2Pulse {
    0%, 100% { box-shadow: 0 0 0 0 ${V2.grassGreen}40; }
    50%      { box-shadow: 0 0 0 8px ${V2.grassGreen}00; }
  }
  @keyframes v2CloudDrift {
    0%   { transform: translateX(0); }
    100% { transform: translateX(30px); }
  }

  /* V2 utility classes */
  .v2-fade-in    { animation: v2FadeIn 0.4s ease forwards; }
  .v2-slide-up   { animation: v2SlideUp 0.5s ease forwards; }
  .v2-float      { animation: v2Float 3s ease-in-out infinite; }
  .v2-glass      { backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  .v2-no-select  { user-select: none; -webkit-user-select: none; }

  /* Ticker track */
  .v2-ticker-track {
    display: flex;
    gap: 10px;
    width: max-content;
    animation: v2TickerScroll 90s linear infinite;
    align-items: center;
  }
  .v2-ticker-track:hover { animation-play-state: paused; }

  /* Bottom nav spacing */
  .v2-page-wrap {
    padding-bottom: 80px;
  }
  @media (min-width: 768px) {
    .v2-page-wrap { padding-bottom: 0; }
  }

  /* Responsive helpers */
  .v2-mobile-only { display: block; }
  .v2-desktop-only { display: none; }
  @media (min-width: 768px) {
    .v2-mobile-only { display: none; }
    .v2-desktop-only { display: block; }
  }

  /* Hide scrollbar on ticker */
  .v2-ticker-wrap {
    overflow: hidden;
    width: 100%;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .v2-ticker-track { animation: none; }
    .v2-float        { animation: none; }
    .v2-fade-in      { animation: none; }
    .v2-slide-up     { animation: none; }
  }
`;

// ── Tier config (reused across pages) ──────────────────────────────────────────

export const V2_TIERS = [
  { name:"Seedling",  min:0,   max:6,   emoji:"🌱", color:"#5ba622" },
  { name:"Sprout",    min:7,   max:13,  emoji:"🌿", color:"#4a8a2a" },
  { name:"Rooted",    min:14,  max:29,  emoji:"🌳", color:"#3d7a12" },
  { name:"Grounded",  min:30,  max:49,  emoji:"🏔️", color:"#2d6b1a" },
  { name:"Trailhead", min:50,  max:99,  emoji:"⚡", color:"#e8a020" },
  { name:"Summit",    min:100, max:179, emoji:"🏆", color:"#f5c04a" },
  { name:"Legend",    min:180, max:364, emoji:"👑", color:"#f07020" },
  { name:"Immortal",  min:365, max:Infinity, emoji:"🌌", color:"#a855f7" },
];

export function getV2Tier(streak) {
  return V2_TIERS.find(t => streak >= t.min && streak <= t.max) || V2_TIERS[0];
}

export default V2;