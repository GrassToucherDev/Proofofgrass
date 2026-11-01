// Full-width event banner that links to /fright-bits. Shows only while the collection is live, so it never advertises an event people can't join.
import { useState, useEffect } from "react";
import Link from "next/link";

export default function FrightBitsHeroBanner({ maxWidth = 1100 }) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    let a = true;
    fetch("/api/fright-bits/state", { cache: "no-store" }).then(r => r.ok ? r.json() : null)
      .then(d => { if (a) setLive(d?.collection?.status === "active"); }).catch(() => {});
    return () => { a = false; };
  }, []);
  if (!live) return null;
  return (
    <div style={{ maxWidth, margin: "0 auto", padding: "14px 16px 0" }}>
      <Link href="/fright-bits" aria-label="WAGO: Fright Bits, Halloween 2026. Find ten one-of-one monsters hiding in the WAGO Wheel."
        style={{ display: "block", borderRadius: 18, overflow: "hidden", border: "2px solid #f59e0b", boxShadow: "0 6px 24px rgba(60,20,100,0.28)", lineHeight: 0 }}>
        <img src="/images/wago/fright-bits/banner.webp" alt="WAGO: Fright Bits Halloween 2026" width={1600} height={533}
          style={{ width: "100%", height: "auto", display: "block" }} />
      </Link>
    </div>
  );
}
