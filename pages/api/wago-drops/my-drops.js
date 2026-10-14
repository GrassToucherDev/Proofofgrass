// pages/wago-drops/my-drops.js
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

const T = {
  bg:"#080a06",card:"#141a0c",border:"rgba(255,255,255,0.07)",
  olive:"#93a85a",white:"#f0efea",muted:"rgba(240,239,234,0.45)",dim:"rgba(240,239,234,0.22)",
};

export default function MyDrops() {
  const { data: session } = useSession();
  const [me, setMe] = useState(null);
  const [claims, setClaims] = useState([]);
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    Promise.all([
      fetch("/api/wago-drops/me").then(r => r.json()),
      fetch("/api/wago-drops/my-claims").then(r => r.json()),
      fetch("/api/wago-drops/my-saves").then(r => r.json()),
    ]).then(([meD, clD, svD]) => {
      setMe(meD);
      setClaims(clD.claims || []);
      setSaves(svD.saves || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [session]);

  const totalTG = claims.reduce((sum, c) => sum + Number(c.reward_amount || 0) + (c.proof_bonus_applied ? Number(c.proof_bonus_amount || 0) : 0), 0);

  return (
    <>
      <Head><title>My WAGO Drops</title></Head>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "system-ui,sans-serif" }}>
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "0 clamp(14px,4vw,48px)", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/wago-drops" style={{ fontSize: 13, color: T.muted, textDecoration: "none" }}>← Map</Link>
          <span style={{ fontSize: 15, fontWeight: 700 }}>My Profile</span>
          <div style={{ width: 60 }} />
        </nav>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px clamp(14px,4vw,32px)" }}>
          {!session && (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
              <p style={{ color: T.muted, fontSize: 14 }}>Sign in to view your WAGO Drops profile.</p>
              <Link href="/wago-drops" style={{ display: "inline-block", marginTop: 16, background: T.olive, color: T.bg, borderRadius: 9, padding: "10px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Go to Map</Link>
            </div>
          )}
          {session && loading && <p style={{ color: T.muted, fontSize: 14 }}>Loading…</p>}
          {session && !loading && (
            <>
              {/* Identity */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
                {session.user?.image && <img src={session.user.image} alt="" style={{ width: 52, height: 52, borderRadius: "50%" }} />}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{session.user?.name}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{session.user?.email}</div>
                  {me?.linked_wallet && (
                    <div style={{ fontSize: 11, color: T.dim, marginTop: 4, fontFamily: "monospace" }}>
                      {me.linked_wallet.slice(0, 6)}…{me.linked_wallet.slice(-4)}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Claims", value: claims.length },
                  { label: "Saved", value: saves.length },
                  { label: "TG Earned", value: totalTG.toLocaleString() },
                ].map(s => (
                  <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: T.olive }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/wago-drops/list" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: T.white }}>
                  <span style={{ fontSize: 14 }}>📋 My Claims</span>
                  <span style={{ fontSize: 13, color: T.muted }}>{claims.length} →</span>
                </Link>
                <Link href="/wago-drops/saved" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: T.white }}>
                  <span style={{ fontSize: 14 }}>🔖 Saved Drops</span>
                  <span style={{ fontSize: 13, color: T.muted }}>{saves.length} →</span>
                </Link>
                <Link href="/wago-drops" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: T.white }}>
                  <span style={{ fontSize: 14 }}>🗺️ Back to Map</span>
                  <span style={{ fontSize: 13, color: T.muted }}>→</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}