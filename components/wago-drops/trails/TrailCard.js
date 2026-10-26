import Link from "next/link";
import { V2 } from "../../../utils/v2Theme";
import { T } from "../../../utils/wagoTheme";
import { TrailCover, RewardChips, Meta } from "./trailBits";

const STATUS = {
  active:    { label: "In progress", bg: "#fff6d6", fg: "#8a5a00" },
  completed: { label: "Completed ✓", bg: "#dff3cf", fg: "#2d6b1a" },
  expired:   { label: "Expired",     bg: "#eee",    fg: "#777" },
};

export default function TrailCard({ trail, stopCount, status, done, total, href }) {
  const st = status ? STATUS[status] : null;
  const pct = total ? Math.round(((done || 0) / total) * 100) : 0;
  return (
    <Link href={href || `/wago-drops/trails/${trail.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", border: `1px solid ${V2.borderSoft}`, boxShadow: "0 4px 18px rgba(26,74,10,0.08)" }}>
        <TrailCover src={trail.cover_image_url} height={170} radius={0}>
          {st && <span style={{ position: "absolute", top: 12, left: 12, background: st.bg, color: st.fg, fontSize: 12, fontWeight: 800, padding: "4px 11px", borderRadius: 999 }}>{st.label}</span>}
          {trail.window === "upcoming" && <span style={{ position: "absolute", top: 12, right: 12, background: "#e8f4fd", color: "#0d2a5a", fontSize: 12, fontWeight: 800, padding: "4px 11px", borderRadius: 999 }}>Opens {new Date(trail.starts_at).toLocaleDateString()}</span>}
        </TrailCover>
        <div style={{ padding: "14px 16px 16px", display: "grid", gap: 8 }}>
          <div style={{ fontFamily: "'Fredoka',serif", fontSize: 24, fontWeight: 700, color: T.white, lineHeight: 1.1 }}>{trail.name}</div>
          <Meta trail={trail} stopCount={stopCount ?? total} />
          <RewardChips trail={trail} />
          {status === "active" && total ? (
            <div>
              <div style={{ height: 8, borderRadius: 99, background: "#e6efdc", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: V2.gradientGrassBtn }} />
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4, fontWeight: 600 }}>{done || 0} of {total} stops</div>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
