// The wheel itself: drawn in SVG from the live prize pool, animated to a result the SERVER already decided.
import { useEffect, useRef, useState } from "react";
import { typeMeta, prizeArt, FILLER_ART } from "./wheelBits";

const PALETTE = ["#d6ecb9", "#f8e6b4", "#c3e3f4", "#dccdf1", "#bfe6cb", "#f5d4c4", "#cddcf6", "#e9f0b8", "#c9eadf", "#f3dcb8", "#d3d9f4", "#e5efc6"];

function polar(cx, cy, r, deg) { const a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
function wedge(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
}

// segments = number of slots; prizes decide each slot's icon. A slot with nothing in stock is shown dimmed.
export function segmentCount(prizes) {
  const max = Math.max(-1, ...prizes.map(p => p.segment));
  return Math.min(12, Math.max(8, max + 1));
}

export default function WheelBoard({ prizes, target, spinKey, onDone, size = 300 }) {
  const n = segmentCount(prizes);
  const step = 360 / n;
  const [rot, setRot] = useState(0);
  const [ms, setMs] = useState(0);
  const cur = useRef(0);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Each new spinKey animates to the segment index the server returned (cosmetic jitter stays inside that slice).
  useEffect(() => {
    if (spinKey == null || target == null) return;
    const jitter = (Math.random() - 0.5) * step * 0.6;
    const want = ((360 - ((target + 0.5) * step + jitter)) % 360 + 360) % 360;
    const base = Math.ceil(cur.current / 360) * 360;
    const next = base + (reduce ? 0 : 5 * 360) + want;
    const dur = reduce ? 500 : 5200;
    setMs(dur); setRot(next); cur.current = next;
    const t = setTimeout(() => onDone?.(), dur + 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const bySeg = Array.from({ length: n }, (_, i) => prizes.filter(p => p.segment === i));
  const lights = Array.from({ length: 16 }, (_, i) => polar(150, 150, 142, i * 22.5));
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: size, aspectRatio: "1 / 1", margin: "0 auto" }}>
      <svg viewBox="0 0 300 300" width="100%" height="100%" role="img" aria-label="WAGO Wheel" style={{ display: "block", overflow: "visible" }}>
        <circle cx="150" cy="150" r="148" fill="#8a5a2b" />
        <circle cx="150" cy="150" r="148" fill="none" stroke="#5e3b17" strokeWidth="3" />
        <circle cx="150" cy="150" r="132" fill="#fff8e8" />
        <g style={{ transform: `rotate(${rot}deg)`, transformOrigin: "150px 150px", transition: ms ? `transform ${ms}ms cubic-bezier(0.12, 0.6, 0.1, 1)` : "none" }}>
          {bySeg.map((list, i) => {
            const a0 = i * step, a1 = (i + 1) * step, mid = a0 + step / 2;
            const p = list[0]; const [ix, iy] = polar(150, 150, 88, mid);
            const empty = !list.length;
            return (
              <g key={i}>
                <path d={wedge(150, 150, 128, a0, a1)} fill={PALETTE[i % PALETTE.length]} stroke="#fff8e8" strokeWidth="2" opacity={empty ? 0.55 : 1} />
                <g transform={`rotate(${mid} ${ix} ${iy})`}>
                  {(() => { const art = empty ? FILLER_ART : prizeArt(p);
                    return art
                      ? <image href={art} x={ix - (empty ? 17 : 26)} y={iy - (empty ? 17 : 26)} width={empty ? 34 : 52} height={empty ? 34 : 52} opacity={empty ? 0.8 : 1} preserveAspectRatio="xMidYMid meet" />
                      : <text x={ix} y={iy + 8} textAnchor="middle" fontSize="26">{typeMeta(p.reward_type).emoji}</text>; })()}
                </g>
              </g>
            );
          })}
        </g>
        {lights.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#ffe08a" stroke="#c58a12" strokeWidth="1" />)}
        <circle cx="150" cy="150" r="26" fill="#ffd54a" stroke="#8a5a2b" strokeWidth="5" />
        <text x="150" y="160" textAnchor="middle" fontSize="26">🌻</text>
      </svg>
      <div aria-hidden style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 0, height: 0,
        borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderTop: "26px solid #e0a31c", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))" }} />
    </div>
  );
}
