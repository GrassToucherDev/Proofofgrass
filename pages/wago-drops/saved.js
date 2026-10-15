// pages/wago-drops/saved.js
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";

const T = {
  bg:"#080a06",surface:"#0f1209",card:"#141a0c",border:"rgba(255,255,255,0.07)",
  olive:"#93a85a",white:"#f0efea",muted:"rgba(240,239,234,0.45)",dim:"rgba(240,239,234,0.22)",
};

export default function WagoDropsSaved() {
  const { data: session } = useSession();
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch("/api/wago-drops/my-saves")
      .then(r => r.json())
      .then(d => { setSaves(d.saves || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  async function unsave(locationId) {
    await fetch("/api/wago-drops/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, action: "remove" }),
    });
    setSaves(prev => prev.filter(s => s.location_id !== locationId));
  }

  function mapLink(s) {
    if (s.lat != null && s.lng != null) {
      return `/wago-drops?flyTo=${s.lat},${s.lng}`;
    }
    return "/wago-drops";
  }

  return (
    <>
      <Head><title>Saved Drops — WAGO</title></Head>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "system-ui,sans-serif" }}>
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "0 clamp(14px,4vw,48px)", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/wago-drops" style={{ fontSize: 13, color: T.muted, textDecoration: "none" }}>← Map</Link>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Saved Drops</span>
          <Link href="/wago-drops/list" style={{ fontSize: 13, color: T.muted, textDecoration: "none" }}>Claims →</Link>
        </nav>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px clamp(14px,4vw,32px)" }}>
          {!session && (
            <p style={{ color: T.muted, fontSize: 14 }}>Sign in on the <Link href="/wago-drops" style={{ color: T.olive }}>map page</Link> to see saved drops.</p>
          )}
          {session && loading && <p style={{ color: T.muted, fontSize: 14 }}>Loading…</p>}
          {session && !loading && saves.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔖</div>
              <p style={{ color: T.muted, fontSize: 14 }}>No saved drops. Tap 🔖 on any drop to save it for later.</p>
              <Link href="/wago-drops" style={{ display: "inline-block", marginTop: 16, background: T.olive, color: T.bg, borderRadius: 9, padding: "10px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Open Map</Link>
            </div>
          )}
          {session && !loading && saves.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {saves.map(s => (
                <div key={s.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s.campaign_name || "Drop"}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>Saved {new Date(s.saved_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                    {s.hint && <div style={{ fontSize: 12, color: T.olive, marginTop: 4 }}>💡 {s.hint}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <Link href={mapLink(s)} style={{ fontSize: 12, color: T.olive, textDecoration: "none", background: "rgba(147,168,90,0.12)", borderRadius: 6, padding: "4px 10px" }}>Find on map</Link>
                    <button onClick={() => unsave(s.location_id)} style={{ fontSize: 11, color: T.dim, background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}