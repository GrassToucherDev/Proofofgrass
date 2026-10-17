// components/wago-drops/BadgeShelf.js — cosmetic badge shelf + "new badge" toast.
import { useEffect, useMemo, useState } from "react";
import { T } from "../../utils/wagoTheme";
import { badgeProgress } from "../../utils/wagoBadges";
import Wago from "./Wago";

const SEEN_KEY = "wago_badges_seen_v1";

export default function BadgeShelf({ claims, userKey }) {
  const [trailsCompleted, setTrailsCompleted] = useState(0);
  useEffect(() => {
    if (!userKey) return;
    let alive = true;
    fetch("/api/wago-drops/trails/mine").then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d?.trails) setTrailsCompleted(d.trails.filter(t => t.status === "completed").length); })
      .catch(() => {});
    return () => { alive = false; };
  }, [userKey]);
  const badges = useMemo(() => badgeProgress(claims, { trailsCompleted }), [claims, trailsCompleted]);
  const [toast, setToast] = useState(null);

  // Toast when a tier went up since the last visit. The first visit just records
  // the baseline, so existing users aren't spammed with old badges.
  useEffect(() => {
    if (!userKey) return;
    const key = `${SEEN_KEY}:${userKey}`;
    try {
      const now = Object.fromEntries(badges.map(b => [b.id, b.tier]));
      const raw = localStorage.getItem(key);
      if (raw) {
        const prev = JSON.parse(raw);
        const up = badges.find(b => b.tier > (prev[b.id] || 0));
        if (up) setToast(up);
      }
      localStorage.setItem(key, JSON.stringify(now));
    } catch {}
  }, [badges, userKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: T.olive, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>
        Badges
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {badges.map(b => {
          const earned = b.tier > 0;
          return (
            <div key={b.id} title={b.blurb} style={{
              background: T.surface, border: `1px solid ${earned ? "rgba(91,166,34,0.35)" : T.border}`,
              borderRadius: 14, padding: "14px 12px", textAlign: "center",
            }}>
              <div style={{
                width: 76, height: 76, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center",
                filter: earned ? "none" : "grayscale(1)", opacity: earned ? 1 : 0.4,
              }}>
                {b.art
                  ? <img src={b.art} alt={b.name} draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: 30 }}>{b.icon}</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: earned ? T.white : T.muted }}>{b.label}</div>
              <div style={{ height: 5, borderRadius: 99, background: "rgba(13,42,5,0.08)", margin: "8px 0 5px", overflow: "hidden" }}>
                <div style={{ width: `${b.pct}%`, height: "100%", background: T.olive, borderRadius: 99, transition: "width .4s" }} />
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>
                {b.next ? `${b.count} / ${b.next} ${b.unit}` : `${b.count} ${b.unit} · max`}
              </div>
            </div>
          );
        })}
      </div>

      {toast && (
        <div role="status" onClick={() => setToast(null)} style={{
          position: "fixed", left: "50%", bottom: 88, transform: "translateX(-50%)", zIndex: 1000,
          background: T.card, border: `1px solid ${T.olive}`, borderRadius: 16, padding: "10px 18px 10px 12px",
          boxShadow: "0 10px 30px rgba(26,74,10,0.25)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        }}>
          <Wago pose="cheer" size={54} />
          <div>
            <div style={{ fontSize: 11, color: T.olive, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>New badge</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.white, display: "flex", alignItems: "center", gap: 8 }}>{toast.art ? <img src={toast.art} alt="" style={{ width: 34, height: 34 }} /> : toast.icon} {toast.label}</div>
          </div>
        </div>
      )}
    </div>
  );
}
