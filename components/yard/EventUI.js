// Seasonal event pieces. V2 tokens + shared yard CSS.
import Link from "next/link";
import { V2, V2Styles } from "../../utils/v2Theme";
import { fmtDate } from "../../utils/yardStatus";

const PHASE = {
  live:     { icon: "🔥", label: "Live now",  bg: "#e6f5d8", fg: "#2d6b1a" },
  upcoming: { icon: "⏳", label: "Upcoming",  bg: "#fef3d8", fg: "#8a5a00" },
  ended:    { icon: "🏁", label: "Ended",     bg: "#eef2ea", fg: "#566650" },
  cancelled:{ icon: "✋", label: "Cancelled", bg: "#fde8e4", fg: "#a8321f" },
};
export function PhasePill({ phase }) {
  const p = PHASE[phase] || PHASE.ended;
  return <span className="yd-pill" style={{ background: p.bg, color: p.fg }}><span aria-hidden="true">{p.icon}</span>{p.label}</span>;
}
export const typeLabel = (t) => (t === "grove" ? "Grove event" : "Individual event");

export function timeLeft(ev) {
  const now = Date.now(), s = new Date(ev.starts_at).getTime(), e = new Date(ev.ends_at).getTime();
  const fmt = (ms) => { const h = Math.max(1, Math.round(ms / 36e5)); return h < 48 ? `${h} hour${h === 1 ? "" : "s"}` : `${Math.round(h / 24)} days`; };
  if (now < s) return `Starts in ${fmt(s - now)}`;
  if (now <= e) return `Ends in ${fmt(e - now)}`;
  return `Ended ${fmtDate(ev.ends_at)}`;
}

export function EventCard({ ev, href }) {
  return (
    <article className="yd-card" style={{ padding: 0, overflow: "hidden" }} aria-label={ev.title}>
      <div role="img" aria-label="" style={{ height: 130, background: `url(${ev.image}) center / cover no-repeat, #d8ecc8` }} />
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <PhasePill phase={ev.phase} />
          <span className="yd-pill" style={{ background: "#e8f0fa", color: "#2a4f7a" }}>{ev.event_type === "grove" ? "🌳" : "🧑"} {typeLabel(ev.event_type)}</span>
          {ev.entered && <span className="yd-pill" style={{ background: "#e6f5d8", color: "#2d6b1a" }}>✓ You're in</span>}
        </div>
        <h3 style={{ fontSize: 19, fontWeight: 800, color: V2.forestGreen, overflowWrap: "anywhere" }}>{ev.title}</h3>
        <div style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray, margin: "4px 0 8px" }}>
          {fmtDate(ev.starts_at)} → {fmtDate(ev.ends_at)} · {timeLeft(ev)} · {ev.entrants} {ev.event_type === "grove" ? "Groves" : "players"}
        </div>
        {ev.description && <p style={{ fontSize: 13, fontWeight: 500, color: V2.textBody, lineHeight: 1.5, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ev.description}</p>}
        {ev.reward_text && <div style={{ fontSize: 13, fontWeight: 700, color: "#8a5a00", marginBottom: 10 }}>🎁 {ev.reward_text}</div>}
        <Link href={href || `/yard/events/${ev.slug}`} className="yd-btn-sm" style={{ ...V2Styles.btnSecondary, display: "inline-flex", alignItems: "center", textDecoration: "none", padding: "0 18px" }}>
          {ev.phase === "ended" ? "See results" : ev.entered ? "View standings" : "View event"} →
        </Link>
      </div>
    </article>
  );
}
