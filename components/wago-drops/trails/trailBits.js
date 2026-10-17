// Small shared UI bits for WAGO Trails.
import { V2 } from "../../../utils/v2Theme";
import { T } from "../../../utils/wagoTheme";
import { formatReward, rewardLogo } from "../../../utils/wagoReward";
import { formatDistance, formatMinutes } from "../../../utils/wagoTrails";
import Wago from "../Wago";

export function trailRewardParts(trail) {
  const parts = [];
  if (trail?.reward_type && trail.reward_type !== "none" && Number(trail.reward_amount) > 0) {
    parts.push({ kind: "token", text: formatReward(trail), logo: rewardLogo(trail) });
  }
  if (Number(trail?.reward_tickets) > 0) parts.push({ kind: "tickets", text: `${trail.reward_tickets} Grass Tickets`, emoji: "🎟️" });
  if (trail?.reward_badge) parts.push({ kind: "badge", text: trail.reward_badge, emoji: "🏅", logo: /trailblazer/i.test(trail.reward_badge) ? "/images/wago/badges/trailblazer.png" : null });
  return parts;
}

export function RewardChips({ trail, size = 13 }) {
  const parts = trailRewardParts(trail);
  if (!parts.length) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {parts.map((p, i) => (
        <span key={i} style={{
          display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: `1.5px solid ${V2.borderSoft}`,
          borderRadius: 999, padding: "4px 11px", fontSize: size, fontWeight: 700, color: T.white,
        }}>
          {p.logo ? <img src={p.logo} alt="" style={{ width: 16, height: 16, objectFit: "contain", borderRadius: "50%" }} onError={e => { e.currentTarget.style.display = "none"; }} /> : <span>{p.emoji}</span>}
          {p.text}
        </span>
      ))}
    </div>
  );
}

export function Meta({ trail, stopCount }) {
  const bits = [
    trail.city,
    trail.distance_m != null ? formatDistance(trail.distance_m) : null,
    trail.est_minutes != null ? `~${formatMinutes(trail.est_minutes)}` : null,
    stopCount != null ? `${stopCount} stops` : null,
  ].filter(Boolean);
  return <div style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{bits.join("  ·  ")}</div>;
}

// Cover with a cheerful sky fallback so Trails without a photo still look finished.
export function TrailCover({ src, height = 180, radius = 18, children, pose = "point" }) {
  return (
    <div style={{ position: "relative", height, borderRadius: radius, overflow: "hidden", background: V2.gradientSky }}>
      {src ? <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.currentTarget.style.display = "none"; }} />
           : <div style={{ position: "absolute", right: 14, bottom: 0 }}><Wago pose={pose} size={Math.round(height * 0.7)} /></div>}
      {children}
    </div>
  );
}

export const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
    <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.olive, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
);

export const pageShell = { minHeight: "100vh", background: V2.gradientSky, color: T.white, fontFamily: V2.fontSans };
export const btnPrimary = {
  background: V2.gradientGrassBtn, color: "#fff", border: "none", borderRadius: 999, padding: "13px 24px",
  fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 3px 12px rgba(125,200,50,0.4)", textDecoration: "none", display: "inline-block", textAlign: "center",
};
export const btnGhost = {
  background: "#fff", color: T.white, border: `1.5px solid ${V2.borderSoft}`, borderRadius: 999, padding: "11px 20px",
  fontSize: 14, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block", textAlign: "center",
};
