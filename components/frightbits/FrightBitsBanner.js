// Marketplace strip for Fright Bits. Renders nothing unless the collection is live (or has ended with owners).
import { useState, useEffect } from "react";
import Link from "next/link";

export default function FrightBitsBanner() {
  const [d, setD] = useState(null);
  useEffect(() => { let a = true; fetch("/api/fright-bits/state", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => a && setD(j)).catch(() => {}); return () => { a = false; }; }, []);
  const c = d?.collection; if (!c) return null;
  const left = d.counts.total - d.counts.claimed;
  return (
    <div style={{ padding: "14px clamp(14px,4vw,48px) 0" }}>
      <Link href="/fright-bits" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", background: "linear-gradient(135deg,#2a1248,#12081f)", border: "1.5px solid #f59e0b", borderRadius: 18, padding: "12px 18px" }}>
        <span style={{ fontSize: 34 }}>🎃</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>WAGO: Fright Bits</div>
          <div style={{ fontSize: 12.5, color: "#d8c8f5" }}>{c.status === "ended" ? `Ended · ${d.counts.claimed} of ${d.counts.total} found` : `${left} one-of-one monsters left, hiding in the Wheel.`}</div>
        </div>
        <span style={{ fontWeight: 800, fontSize: 13, color: "#f59e0b", whiteSpace: "nowrap" }}>View →</span>
      </Link>
    </div>
  );
}
