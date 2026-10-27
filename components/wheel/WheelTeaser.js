// Small "the wheel lives at /wheel" strip for the Marketplace. Renders nothing unless a wheel is live for this viewer.
import { useState, useEffect } from "react";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";

export default function WheelTeaser() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/wheel/state", { cache: "no-store" }).then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setLive(!!d?.wheel); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!live) return null;
  return (
    <div style={{ padding: "14px clamp(14px,4vw,48px) 0" }}>
      <Link href="/wheel" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none",
        background: "linear-gradient(135deg,#fffdf2,#f1f8e6)", border: `1.5px solid ${V2.borderGold || "#e8d48a"}`,
        borderRadius: 18, padding: "12px 18px", boxShadow: "0 2px 14px rgba(26,74,10,0.08)" }}>
        <img src="/wheel/grass-tickets.png" alt="" width={44} height={44} style={{ objectFit: "contain", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: V2.fontSans, fontWeight: 800, fontSize: 15, color: V2.forestGreen }}>WAGO Wheel</div>
          <div style={{ fontSize: 12.5, color: V2.midGray }}>Spin for packs, shields, tickets and more.</div>
        </div>
        <span style={{ fontFamily: V2.fontSans, fontWeight: 800, fontSize: 13, color: V2.grassGreen, whiteSpace: "nowrap" }}>Spin →</span>
      </Link>
    </div>
  );
}
