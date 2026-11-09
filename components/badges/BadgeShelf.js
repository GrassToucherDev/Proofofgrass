// Profile badge shelf: every badge line grouped by experience; earned ones in color, the rest greyed with progress.
import { useState } from "react";
import BadgeMedal from "./BadgeMedal";
import BadgeShareSheet from "./BadgeShareSheet";
import { EXPERIENCES } from "../../utils/badges/registry";

export default function BadgeShelf({ badges = [], accent = "#2f7d22", shareFor = "" }) {
  const [sharing, setSharing] = useState(null);
  if (!badges.length) return null;
  const earned = badges.filter(b => b.tier > 0).length;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7a63", marginBottom: 10 }}>{earned} of {badges.length} badge lines started</div>
      <div style={{ columnWidth: 330, columnGap: 28 }}>
      {EXPERIENCES.map(exp => {
        const list = badges.filter(b => b.exp === exp.id);
        if (!list.length) return null;
        return (
          <div key={exp.id} style={{ marginBottom: 18, breakInside: "avoid", pageBreakInside: "avoid" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b7a63", marginBottom: 8 }}>{exp.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 12 }}>
              {list.map(b => (
                <div key={b.id} title={b.blurb} role={shareFor && b.tier > 0 ? "button" : undefined} tabIndex={shareFor && b.tier > 0 ? 0 : undefined}
                  onClick={shareFor && b.tier > 0 ? () => setSharing(b) : undefined}
                  onKeyDown={shareFor && b.tier > 0 ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSharing(b); } } : undefined}
                  style={{ cursor: shareFor && b.tier > 0 ? "pointer" : undefined, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, padding: "10px 6px", borderRadius: 14, background: b.tier > 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <BadgeMedal id={b.id} tier={b.tier} emoji={b.emoji} name={b.label} size={64} />
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1d3a14", lineHeight: 1.2 }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: "#6b7a63", lineHeight: 1.2 }}>
                    {b.next ? `${b.count.toLocaleString()} / ${b.next.toLocaleString()} ${b.unit}` : `${b.count.toLocaleString()} ${b.unit}`}
                  </div>
                  <div style={{ width: "80%", height: 4, borderRadius: 2, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                    <div style={{ width: `${b.pct}%`, height: "100%", background: accent }} />
                  </div>
                  {shareFor && b.tier > 0 && <div style={{ fontSize: 11, fontWeight: 800, color: accent }}>↗ Share</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>
      {sharing && <BadgeShareSheet badge={sharing} username={shareFor} onClose={() => setSharing(null)} />}
    </div>
  );
}
