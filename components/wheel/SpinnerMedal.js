// A small round medal for the Wheel Spinner badge. Colors follow the tier; a locked badge is greyed out.
import { TIER_COLORS } from "../../utils/wheelBadges";

export default function SpinnerMedal({ tier = 0, size = 72 }) {
  const [rim, face, shine] = TIER_COLORS[Math.min(tier, TIER_COLORS.length - 1)];
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  const locked = tier === 0;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Wheel Spinner badge" style={{ display: "block", opacity: locked ? 0.55 : 1, filter: locked ? "grayscale(1)" : "none" }}>
      <circle cx="50" cy="50" r="46" fill={rim} stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
      <circle cx="50" cy="50" r="38" fill={face} stroke={rim} strokeWidth="3" />
      <g stroke={rim} strokeWidth="3" strokeLinecap="round" opacity="0.9">
        {spokes.map(a => <line key={a} x1="50" y1="50" x2={50 + 30 * Math.sin(a * Math.PI / 180)} y2={50 - 30 * Math.cos(a * Math.PI / 180)} />)}
      </g>
      <circle cx="50" cy="50" r="30" fill="none" stroke={rim} strokeWidth="3" />
      <circle cx="50" cy="50" r="8" fill={rim} stroke={shine} strokeWidth="2.5" />
      <path d="M22 34 A32 32 0 0 1 48 20" fill="none" stroke={shine} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      {tier > 0 && <text x="50" y="92" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" stroke="rgba(0,0,0,0.35)" strokeWidth="2.4" paintOrder="stroke" fontFamily="sans-serif">{["", "I", "II", "III", "IV", "V"][tier]}</text>}
    </svg>
  );
}
