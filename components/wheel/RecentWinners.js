// Live feed of recent wheel results: who spun, what they landed, how rare. Refreshes while the tab is visible.
import { useState, useEffect } from "react";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";
import { rarityOf, prizeArt } from "./wheelBits";

const ago = (iso) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function RecentWinners() {
  const [spins, setSpins] = useState(null);
  useEffect(() => {
    let alive = true, timer = null;
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try { const r = await fetch("/api/wheel/recent"); const d = r.ok ? await r.json() : null; if (alive && d?.spins) setSpins(d.spins); } catch {}
    };
    load();
    timer = setInterval(load, 30000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  if (!spins || !spins.length) return null;
  return (
    <div style={{ position: "relative", maxWidth: 560, margin: "16px auto 0" }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: V2.forestGreen, marginBottom: 6, textAlign: "center" }}>Recent winners</div>
      <div style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${V2.borderSoft}`, borderRadius: 16, maxHeight: 260, overflowY: "auto", padding: "4px 10px" }}>
        {spins.map((s, i) => {
          const r = rarityOf(s.rarity);
          return (
            <div key={`${s.at}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", borderTop: i ? `1px solid ${V2.borderSoft}` : "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={prizeArt({ image_url: s.image_url, reward_type: s.reward_type, name: s.name })} alt="" width={32} height={32} style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1, fontSize: 13, lineHeight: 1.25 }}>
                <Link href={`/u/${encodeURIComponent(s.username)}`} style={{ fontWeight: 800, color: V2.forestGreen, textDecoration: "none" }}>@{s.username}</Link>
                <span style={{ color: V2.textBody }}> won </span>
                <span style={{ fontWeight: 700 }}>{s.name}</span>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: r.color, background: r.bg, borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>{r.label}</div>
                <div style={{ fontSize: 10.5, color: V2.midGray, marginTop: 2 }}>{ago(s.at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
