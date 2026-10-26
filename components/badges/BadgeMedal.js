// A badge medal: uses /badges/<id>-<tier>.png when it exists, otherwise a drawn medal in the tier's colors.
import { useState } from "react";
import { TIER_COLORS, ROMAN } from "../../utils/badges/registry";

export default function BadgeMedal({ id, tier = 0, emoji = "⭐", name = "", size = 72, numeral = false }) {
  const [failed, setFailed] = useState(false);
  const locked = tier === 0;
  const lockStyle = { opacity: locked ? 0.35 : 1, filter: locked ? "grayscale(1)" : "none" };
  const showArt = !failed;
  const artTier = tier > 0 ? tier : 1;
  if (showArt) {
    return (
      <div style={{ position: "relative", width: size, height: size, ...lockStyle }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/badges/${id}-${artTier}.png`} alt={name} width={size} height={size} onError={() => setFailed(true)} style={{ display: "block", width: size, height: size, objectFit: "contain" }} />
        {numeral && <span style={numStyle(size)}>{ROMAN[tier]}</span>}
      </div>
    );
  }
  const [rim, face, shine] = TIER_COLORS[Math.min(tier, TIER_COLORS.length - 1)];
  return (
    <div style={{ position: "relative", width: size, height: size, ...lockStyle }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={name} style={{ display: "block" }}>
        <circle cx="50" cy="50" r="46" fill={rim} stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
        <circle cx="50" cy="50" r="37" fill={face} stroke={rim} strokeWidth="3" />
        <path d="M22 34 A32 32 0 0 1 48 20" fill="none" stroke={shine} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        <text x="50" y="62" textAnchor="middle" fontSize="38">{emoji}</text>
      </svg>
      {numeral && tier > 0 && <span style={numStyle(size)}>{ROMAN[tier]}</span>}
    </div>
  );
}

function numStyle(size) {
  return { position: "absolute", left: "50%", bottom: -2, transform: "translateX(-50%)", fontSize: Math.max(10, size * 0.18), fontWeight: 800, color: "#fff",
    textShadow: "0 0 3px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.5)", fontFamily: "'Fredoka',system-ui,sans-serif", lineHeight: 1 };
}
