// Profile badge shelf: every badge line grouped by experience; earned ones in color, the rest greyed with progress.
import BadgeMedal from "./BadgeMedal";
import { EXPERIENCES } from "../../utils/badges/registry";

export default function BadgeShelf({ badges = [], accent = "#2f7d22" }) {
  if (!badges.length) return null;
  const earned = badges.filter(b => b.tier > 0).length;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7a63", marginBottom: 10 }}>{earned} of {badges.length} badge lines started</div>
      {EXPERIENCES.map(exp => {
        const list = badges.filter(b => b.exp === exp.id);
        if (!list.length) return null;
        return (
          <div key={exp.id} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b7a63", marginBottom: 8 }}>{exp.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(104px,1fr))", gap: 12 }}>
              {list.map(b => (
                <div key={b.id} title={b.blurb} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, padding: "10px 6px", borderRadius: 14, background: b.tier > 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <BadgeMedal id={b.id} tier={b.tier} emoji={b.emoji} name={b.label} size={64} />
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1d3a14", lineHeight: 1.2 }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: "#6b7a63", lineHeight: 1.2 }}>
                    {b.next ? `${b.count.toLocaleString()} / ${b.next.toLocaleString()} ${b.unit}` : `${b.count.toLocaleString()} ${b.unit}`}
                  </div>
                  <div style={{ width: "80%", height: 4, borderRadius: 2, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                    <div style={{ width: `${b.pct}%`, height: "100%", background: accent }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
