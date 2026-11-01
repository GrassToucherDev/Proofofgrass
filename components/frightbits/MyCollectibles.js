// "My Collectibles" card for a profile. Renders nothing when the person owns none.
import { useState, useEffect } from "react";
import Link from "next/link";

export default function MyCollectibles({ username, style }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!username) return; let a = true;
    fetch(`/api/fright-bits/mine?username=${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : null).then(j => a && setItems(j?.items || [])).catch(() => {});
    return () => { a = false; };
  }, [username]);
  if (!items.length) return null;
  return (
    <div className="pf-card" style={{ marginBottom: 16, ...style }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7a8a70", marginBottom: 14 }}>My Collectibles</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 12 }}>
        {items.map(i => (
          <Link key={i.slug} href={`/fright-bits/${i.slug}`} style={{ textDecoration: "none", textAlign: "center", color: "inherit" }}>
            <div style={{ background: "radial-gradient(circle,#3a1a5c,#12081f)", borderRadius: 16, padding: 8 }}>
              <img src={i.image_url} alt={i.name} width={110} height={110} loading="lazy" style={{ width: "100%", height: "auto", aspectRatio: "1/1", objectFit: "contain" }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, wordBreak: "break-word" }}>{i.name}</div>
            <div style={{ fontSize: 11, color: "#7a8a70" }}>1 of 1 · Rare</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
