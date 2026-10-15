// pages/wago-drops.js
// WAGO Drops V2 — Main page
// - Signed out: landing / explainer with Google sign-in prompt
// - Signed in, no wallet linked: wallet link step
// - Signed in + wallet linked: full Mapbox map with drop pins

import { useEffect, useRef, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/router";


// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:      "#080a06",
  surface: "#0f1209",
  card:    "#141a0c",
  border:  "rgba(255,255,255,0.07)",
  olive:   "#93a85a",
  oliveD:  "#7a8f48",
  white:   "#f0efea",
  muted:   "rgba(240,239,234,0.45)",
  dim:     "rgba(240,239,234,0.22)",
  green:   "#4ade80",
  red:     "#f87171",
};

// ─── Reward asset logos ───────────────────────────────────────────────────────
const TOUCHGRASS_LOGO_URL = "/images/touchgrass-token.png";

const REWARD_ICONS = {
  touchgrass: TOUCHGRASS_LOGO_URL,
  sol:        "https://cryptologos.cc/logos/solana-sol-logo.png",
};

function rewardIconUrl(drop) {
  const type = (drop.reward_type || "").toLowerCase();
  if (type === "sol") return REWARD_ICONS.sol;
  return REWARD_ICONS.touchgrass;
}

function makeMarkerEl(drop) {
  const el = document.createElement("div");
  el.title = drop.hint || "Drop";
  el.style.cssText = `
    width:38px;height:38px;border-radius:50%;
    overflow:hidden;cursor:pointer;
    border:2.5px solid rgba(255,255,255,0.9);
    box-shadow:0 2px 10px rgba(0,0,0,0.5);
    transition:all 0.18s ease;
    background:#0f1209;
    display:flex;align-items:center;justify-content:center;
  `;
  const img = document.createElement("img");
  img.src = rewardIconUrl(drop);
  img.style.cssText = "width:26px;height:26px;object-fit:contain;border-radius:50%;";
  img.onerror = () => { img.style.display = "none"; el.textContent = "📦"; };
  el.appendChild(img);
  return el;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Recent claims hook (polls every 15s) ─────────────────────────────────────
function useRecentClaims() {
  const [claims,   setClaims]   = useState([]);
  const [total24h, setTotal24h] = useState(null);
  const [freshIds, setFreshIds] = useState(new Set());
  const seenRef = useRef(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/wago-drops/recent-claims?limit=20");
        if (!res.ok) return;
        const data = await res.json();
        const incoming = data.claims || [];
        if (data.total_24h != null) setTotal24h(data.total_24h);
        if (seenRef.current.size === 0) {
          incoming.forEach(c => seenRef.current.add(c.id));
          setClaims(incoming);
        } else {
          const fresh = incoming.filter(c => !seenRef.current.has(c.id));
          if (fresh.length > 0) {
            fresh.forEach(c => seenRef.current.add(c.id));
            const freshSet = new Set(fresh.map(c => c.id));
            setFreshIds(freshSet);
            setClaims(prev => [...fresh, ...prev].slice(0, 40));
            // Clear the fresh highlight after 3s
            setTimeout(() => setFreshIds(new Set()), 3000);
          }
        }
      } catch {}
    }
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return { claims, total24h, freshIds };
}

// ─── Time-ago helper ──────────────────────────────────────────────────────────
function timeAgo(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso));
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Live claims ticker strip ─────────────────────────────────────────────────
function ClaimsTicker({ onSelectDrop }) {
  const { claims, total24h, freshIds } = useRecentClaims();
  const trackRef = useRef(null);
  const animRef  = useRef(null);
  const posRef   = useRef(0);
  const [tick, setTick] = useState(0);

  // Refresh time labels every 30s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (!trackRef.current || claims.length === 0) return;
    let lastTime = null;
    const SPEED = 32; // px/s

    function step(ts) {
      if (!trackRef.current) return;
      if (lastTime === null) lastTime = ts;
      const dt = (ts - lastTime) / 1000;
      lastTime = ts;
      const track = trackRef.current;
      const half  = track.scrollWidth / 2;
      posRef.current += SPEED * dt;
      if (half > 0 && posRef.current >= half) posRef.current -= half;
      track.style.transform = `translateX(-${posRef.current}px)`;
      animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [claims.length > 0]);

  if (claims.length === 0) return null;

  const items = [...claims, ...claims];

  return (
    <div style={{
      height: 36,
      background: "rgba(8,10,6,0.88)",
      backdropFilter: "blur(8px)",
      borderTop: `1px solid rgba(147,168,90,0.15)`,
      overflow: "hidden",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      position: "relative",
    }}>
      <style>{`
        @keyframes freshFlash {
          0%   { background: rgba(74,222,128,0.18); }
          100% { background: transparent; }
        }
      `}</style>

      {/* Left fade */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 60, zIndex: 2,
        background: "linear-gradient(to right, rgba(8,10,6,0.98), transparent)",
        pointerEvents: "none",
      }} />
      {/* Right fade — shorter to leave room for stat */}
      <div style={{
        position: "absolute", right: total24h != null ? 90 : 0, top: 0, bottom: 0, width: 40, zIndex: 2,
        background: `linear-gradient(to left, rgba(8,10,6,0.98), transparent)`,
        pointerEvents: "none",
      }} />

      {/* Live dot + label */}
      <div style={{
        position: "absolute", left: 10, zIndex: 3,
        display: "flex", alignItems: "center", gap: 4,
        pointerEvents: "none",
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: T.green, display: "inline-block",
          boxShadow: `0 0 6px ${T.green}`,
        }} />
        <span style={{ fontSize: 9, color: T.green, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
          Live
        </span>
      </div>

      {/* Scrolling track */}
      <div
        ref={trackRef}
        style={{
          display: "flex",
          alignItems: "center",
          willChange: "transform",
          paddingLeft: 60,
        }}
      >
        {items.map((claim, i) => {
          const amt     = Number(claim.reward_amount || 0);
          const ticker  = (claim.reward_type || "").toLowerCase() === "sol" ? "SOL" : "$TOUCHGRASS";
          const isFresh = freshIds.has(claim.id);
          const clickable = onSelectDrop && claim.lat != null && claim.lng != null;
          return (
            <div
              key={`${claim.id}-${i}`}
              onClick={() => clickable && onSelectDrop(claim)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0 20px",
                height: 36,
                borderRight: `1px solid rgba(255,255,255,0.06)`,
                whiteSpace: "nowrap",
                flexShrink: 0,
                cursor: clickable ? "pointer" : "default",
                animation: isFresh ? "freshFlash 3s ease forwards" : "none",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => { if (clickable) e.currentTarget.style.opacity = "0.75"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <img
                src={rewardIconUrl(claim)}
                alt=""
                style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "contain", opacity: 0.75 }}
                onError={e => { e.currentTarget.style.display = "none"; }}
              />
              <span style={{ fontSize: 11, color: isFresh ? T.green : T.white, fontWeight: 600, transition: "color 1s" }}>
                {claim.username || "Someone"}
              </span>
              <span style={{ fontSize: 11, color: T.dim }}>claimed</span>
              <span style={{ fontSize: 11, color: T.olive, fontWeight: 700 }}>
                {amt > 0 ? `+${amt.toLocaleString()} ${ticker}` : ticker}
              </span>
              {claim.location && (
                <>
                  <span style={{ fontSize: 11, color: T.dim }}>·</span>
                  <span style={{ fontSize: 11, color: T.muted }}>{claim.location}</span>
                </>
              )}
              <span style={{ fontSize: 10, color: T.dim, marginLeft: 2 }}>
                · {timeAgo(claim.claimed_at)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 24h stat pinned right */}
      {total24h != null && (
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, zIndex: 10,
          display: "flex", alignItems: "center",
          background: "rgba(8,10,6,0.98)",
          borderLeft: `1px solid rgba(147,168,90,0.2)`,
          padding: "0 14px",
          gap: 5,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.olive }}>{total24h.toLocaleString()}</span>
          <span style={{ fontSize: 9, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>claims<br/>24h</span>
        </div>
      )}
    </div>
  );
}

// ─── Nav bar shared across WAGO pages ────────────────────────────────────────
function WagoNav({ session }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: T.bg, borderBottom: `1px solid ${T.border}`,
      padding: "0 clamp(14px,4vw,48px)",
      height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/wago-drops" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🗺️</span>
          <span style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: 17, fontWeight: 700, color: T.white, letterSpacing: "0.04em",
          }}>WAGO Drops</span>
        </Link>
        {session && (
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { href: "/wago-drops/list",     label: "Explore"  },
              { href: "/wago-drops/saved",    label: "Saved"    },
              { href: "/wago-drops/my-drops", label: "My Drops" },
              { href: "/wago-drops/settings", label: "Settings" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                fontSize: 12, color: T.muted, textDecoration: "none",
                padding: "4px 10px", borderRadius: 6,
                transition: "color 0.15s, background 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.color = T.white; e.currentTarget.style.background = "rgba(147,168,90,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = "transparent"; }}
              >{label}</Link>
            ))}
          </div>
        )}
      </div>

      {session ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {session.user?.image && (
            <img src={session.user.image} alt=""
              style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${T.border}` }} />
          )}
          <span style={{ fontSize: 12, color: T.muted }}>{session.user?.name?.split(" ")[0]}</span>
          <button onClick={() => signOut()} style={{
            fontSize: 11, color: T.dim, background: "none", border: `1px solid ${T.border}`,
            borderRadius: 6, padding: "3px 8px", cursor: "pointer",
          }}>Sign out</button>
        </div>
      ) : (
        <button onClick={() => signIn("google")} style={{
          fontSize: 12, color: T.bg, background: T.olive,
          border: "none", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontWeight: 600,
        }}>Sign in with Google</button>
      )}
    </nav>
  );
}

// ─── Landing page (signed-out state) ─────────────────────────────────────────
function LandingView() {
  return (
    <div style={{ fontFamily: "system-ui,sans-serif" }}>
      <div style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(160deg, #0d1508 0%, #080a06 55%, #0a0f07 100%)",
        borderBottom: `1px solid ${T.border}`,
        padding: "80px 20px 72px",
        textAlign: "center",
      }}>
        <div style={{
          position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(147,168,90,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(147,168,90,0.1)", border: `1px solid rgba(147,168,90,0.25)`,
          borderRadius: 100, padding: "5px 14px", marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: T.olive, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
            Live on Solana
          </span>
        </div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: "clamp(38px,8vw,68px)", fontWeight: 700,
          color: T.white, margin: "0 0 6px",
          lineHeight: 1.05, letterSpacing: "-0.01em",
        }}>
          Touch Grass.<br />
          <span style={{ color: T.olive }}>Get Paid.</span>
        </h1>
        <p style={{
          fontSize: "clamp(15px,2.5vw,18px)", color: T.muted,
          lineHeight: 1.7, margin: "20px auto 40px",
          maxWidth: 480,
        }}>
          Real-world treasure hunts hidden on a live map. Walk there,
          claim the drop, earn $TOUCHGRASS — proof you were actually outside.
        </p>
        <button
          onClick={() => signIn("google")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: T.olive, color: T.bg,
            border: "none", borderRadius: 10, padding: "14px 32px",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(147,168,90,0.25)",
            letterSpacing: "0.01em",
          }}
        >
          Start Hunting
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
        <p style={{ fontSize: 11, color: T.dim, marginTop: 14 }}>
          Sign in with Google · Link a Solana wallet · Hunt
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "72px 20px 64px" }}>
        <p style={{
          fontSize: 11, color: T.olive, letterSpacing: "0.12em",
          textTransform: "uppercase", fontWeight: 600, textAlign: "center", marginBottom: 40,
        }}>How it works</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2 }}>
          {[
            { n: "01", icon: "🗺️", title: "Open the map",    desc: "Drop pins appear on a live Mapbox map. They're hidden until you get close." },
            { n: "02", icon: "🚶", title: "Walk there",       desc: "Pins reveal within 100m. The claim button unlocks at 25m — you have to actually show up." },
            { n: "03", icon: "📦", title: "Claim the drop",   desc: "Tap Claim. The app records your location and queues your reward on-chain." },
            { n: "04", icon: "💰", title: "Earn $TOUCHGRASS", desc: "Tokens land in your Solana wallet automatically. No manual claiming, no gas drama." },
          ].map((step, i) => (
            <div key={step.n} style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: i === 0 ? "12px 0 0 12px" : i === 3 ? "0 12px 12px 0" : 0,
              padding: "28px 24px", position: "relative",
            }}>
              <div style={{
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 13, color: "rgba(147,168,90,0.4)",
                fontWeight: 700, letterSpacing: "0.06em", marginBottom: 16,
              }}>{step.n}</div>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{step.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <div style={{
          maxWidth: 860, margin: "0 auto", padding: "64px 20px",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40,
        }}>
          {[
            { icon: "🔒", title: "Proximity-gated",     desc: "Drops can only be claimed from within 25 meters. There's no spoofing your way to a reward." },
            { icon: "🌱", title: "Proof of Grass bonus", desc: "Existing Grass Draw participants earn an extra bonus on every claim — loyalty recognized." },
            { icon: "⚡", title: "Automatic transfers",  desc: "$TOUCHGRASS is sent directly to your wallet once your claim is verified. No extra steps." },
          ].map(f => (
            <div key={f.title} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: "rgba(147,168,90,0.08)", border: `1px solid rgba(147,168,90,0.15)`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "72px 20px 80px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🌿</div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: "clamp(26px,5vw,38px)", fontWeight: 700,
          color: T.white, margin: "0 0 14px", lineHeight: 1.2,
        }}>Ready to go outside?</h2>
        <p style={{ fontSize: 14, color: T.muted, margin: "0 auto 32px", maxWidth: 380, lineHeight: 1.7 }}>
          Sign in with Google, link your Solana wallet, and start hunting. Drops are live now.
        </p>
        <button
          onClick={() => signIn("google")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "#fff", color: "#1a1a1a",
            border: "none", borderRadius: 10, padding: "13px 30px",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
          }}
        >
          <img src="https://www.google.com/favicon.ico" alt="" style={{ width: 16, height: 16 }} />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

// ─── Wallet link step ─────────────────────────────────────────────────────────
function WalletLinkView({ googleId, onLinked }) {
  const [address, setAddress] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function submit(e) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wago-drops/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link wallet");
      onLinked(trimmed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👛</div>
      <h2 style={{
        fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: 28, fontWeight: 700, color: T.white, margin: "0 0 10px",
      }}>Link a Solana Wallet</h2>
      <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, margin: "0 0 32px" }}>
        Enter your Solana wallet address. All WAGO Drop rewards will be sent here.
        You can change it later — once every 24 hours.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Solana wallet address (base58)"
          style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
            padding: "12px 14px", fontSize: 13, color: T.white,
            fontFamily: "monospace", outline: "none", width: "100%", boxSizing: "border-box",
          }}
        />
        {error && <p style={{ fontSize: 13, color: T.red, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading || !address.trim()} style={{
          background: loading ? T.oliveD : T.olive,
          color: T.bg, border: "none", borderRadius: 8,
          padding: "12px", fontSize: 14, fontWeight: 700,
          cursor: loading ? "default" : "pointer",
        }}>
          {loading ? "Linking…" : "Link Wallet & Start Hunting"}
        </button>
      </form>
    </div>
  );
}

// ─── Full map view (signed in + wallet linked) ────────────────────────────────
function MapView({ session, linkedWallet, flyToCoords }) {
  const mapContainer = useRef(null);
  const mapRef       = useRef(null);
  const [userPos,      setUserPos]      = useState(null);
  const [drops,        setDrops]        = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [claiming,     setClaiming]     = useState(false);
  const [claimMsg,     setClaimMsg]     = useState(null);
  const [claimResult,  setClaimResult]  = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState(null);
  const [proofMode,    setProofMode]    = useState(false);
  const [proofFile,    setProofFile]    = useState(null);
  const [proofStatus,  setProofStatus]  = useState(null);
  const [locError,     setLocError]     = useState(null);
  const hasFlewToUser  = useRef(false);
  const geolocateRef   = useRef(null);

  const fetchDropsInView = useCallback(async (map) => {
    if (!map) return;
    const bounds = map.getBounds();
    try {
      const res = await fetch(
        `/api/wago-drops/locations?swLat=${bounds.getSouth()}&swLng=${bounds.getWest()}&neLat=${bounds.getNorth()}&neLng=${bounds.getEast()}${userPos ? `&userLat=${userPos.lat}&userLng=${userPos.lng}` : ""}`
      );
      const data = await res.json();
      if (!res.ok) return;
      setDrops(data.locations || []);
      updateMapMarkers(map, data.locations || []);
    } catch (e) {
      console.error("fetchDropsInView error:", e);
    }
  }, [userPos]);

  const markersRef = useRef({});

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { el }]) => {
      const isActive = selected?.id === id;
      applyMarkerStyle(el, isActive);
    });
  }, [selected]);

  function applyMarkerStyle(el, isActive) {
    const size = isActive ? 46 : 38;
    el.style.width  = `${size}px`;
    el.style.height = `${size}px`;
    el.style.border = isActive ? `3px solid ${T.olive}` : "2.5px solid rgba(255,255,255,0.9)";
    el.style.boxShadow = isActive
      ? `0 0 0 4px rgba(147,168,90,0.35), 0 4px 16px rgba(0,0,0,0.6)`
      : "0 2px 10px rgba(0,0,0,0.5)";
    el.style.zIndex = isActive ? "10" : "1";
    const img = el.querySelector("img");
    if (img) img.style.width = img.style.height = isActive ? "32px" : "26px";
  }

  const updateMapMarkers = useCallback((map, locations) => {
    if (!map) return;
    Object.keys(markersRef.current).forEach(id => {
      if (!locations.find(l => l.id === id)) {
        markersRef.current[id].marker.remove();
        delete markersRef.current[id];
      }
    });
    locations.forEach(loc => {
      if (markersRef.current[loc.id]) return;
      const el = makeMarkerEl(loc);
      el.addEventListener("mouseenter", () => {
        if (selected?.id !== loc.id) el.style.transform = "scale(1.12)";
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
      el.addEventListener("click", () => {
        setSelected(loc);
        setClaimMsg(null);
        setClaimResult(null);
        setProofMode(false);
        setSaveMsg(null);
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 600 });
        }
      });
      import("mapbox-gl").then(({ default: mapboxgl }) => {
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);
        markersRef.current[loc.id] = { marker, el };
      });
    });
  }, [selected]);

  useEffect(() => {
    let map;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const initialCenter = flyToCoords ? [flyToCoords.lng, flyToCoords.lat] : [-98.5795, 39.8283];
      const initialZoom   = flyToCoords ? 16 : 4;
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: initialCenter,
        zoom: initialZoom,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: false,
        fitBoundsOptions: { zoom: 15, duration: 1200 },
      });
      geolocate.on("geolocate", (e) => {
        const { latitude: lat, longitude: lng } = e.coords;
        setLocError(null);
        setUserPos({ lat, lng });
        hasFlewToUser.current = true;
        map.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
      });
      geolocate.on("error", (e) => {
        if (e.code === 1) setLocError("location_denied");
        else if (e.code === 2) setLocError("location_unavailable");
      });
      geolocateRef.current = geolocate;
      map.addControl(geolocate, "top-right");
      map.on("load", () => {
        mapRef.current = map;
        fetchDropsInView(map);
        if (flyToCoords) {
          map.flyTo({ center: [flyToCoords.lng, flyToCoords.lat], zoom: 16, duration: 1500 });
        }
      });
      map.on("moveend", () => fetchDropsInView(map));

      // Keep the canvas and controls in sync whenever the container's size
      // changes (e.g. the claims ticker popping in/out shrinks the map).
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(mapContainer.current);
      map._touchgrassResizeObserver = resizeObserver;
    });
    return () => {
      map?._touchgrassResizeObserver?.disconnect();
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (userPos && mapRef.current) fetchDropsInView(mapRef.current);
  }, [userPos, fetchDropsInView]);

  async function handleClaim(locationId) {
    if (!userPos) return setClaimMsg({ ok: false, text: "Enable location to claim." });
    setClaiming(true);
    setClaimMsg(null);
    setClaimResult(null);
    try {
      const res = await fetch("/api/wago-drops/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, userLat: userPos.lat, userLng: userPos.lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      setClaimResult({
        drop: selected,
        message: data.message,
        reward_amount: data.reward_amount ?? selected?.reward_amount,
        reward_type:   data.reward_type   ?? selected?.reward_type,
        proof_bonus_applied: data.proof_bonus_applied,
        proof_bonus_amount:  data.proof_bonus_amount,
        proof_bonus_enabled: selected?.proof_bonus_enabled,
        tx_signature: data.tx_signature,
      });
      setProofMode(false);
      setProofFile(null);
      setProofStatus(null);
    } catch (err) {
      setClaimMsg({ ok: false, text: err.message });
    } finally {
      setClaiming(false);
    }
  }

  async function handleProofSubmit(claimId) {
    if (!proofFile) return;
    setProofStatus({ ok: null, text: "Uploading…" });
    try {
      const form = new FormData();
      form.append("photo", proofFile);
      if (claimId) form.append("claimId", claimId);
      const res = await fetch("/api/wago-drops/proof", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setProofStatus({ ok: true, text: "Proof submitted! Bonus queued." });
      setProofMode(false);
    } catch (err) {
      setProofStatus({ ok: false, text: err.message });
    }
  }

  function handleShare(result) {
    const amount = Number(result.reward_amount || 0);
    const ticker = (result.reward_type || "").toLowerCase() === "sol" ? "SOL" : "$TOUCHGRASS";
    const hint   = result.drop?.hint || "a drop";
    const text   = `Just claimed ${amount.toLocaleString()} ${ticker} at "${hint}" 🌿 #WAGO #TouchGrass #ProofOfGrass`;
    const url    = "https://proofofgrass.app/wago-drops";
    if (navigator.share) {
      navigator.share({ title: "WAGO Drop claimed!", text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${text} ${url}`).then(() =>
        setProofStatus({ ok: true, text: "Copied to clipboard!" })
      );
    }
  }

  async function handleSave(locationId) {
    setSaving(true);
    setSaveMsg(null);
    try {
      await fetch("/api/wago-drops/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      setSaveMsg("Saved!");
    } catch {
      setSaveMsg("Couldn't save.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  }

  const distToSelected = selected && userPos
    ? Math.round(haversineM(userPos.lat, userPos.lng, selected.lat, selected.lng))
    : null;
  const canClaim = distToSelected !== null && distToSelected <= (selected?.claim_radius_m ?? 25);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 57px)", flexDirection: "row" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @media (max-width: 680px) {
          .map-layout { flex-direction: column !important; }
          .map-sidebar { width: 100% !important; height: 44vh !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; overflow-y: auto !important; }
          .map-container { height: 56vh !important; }
        }
      `}</style>

      <div className="map-layout" style={{ display: "flex", flex: 1, flexDirection: "row", overflow: "hidden" }}>
        {/* ── Sidebar ── */}
        <div className="map-sidebar" style={{
          width: 340, flexShrink: 0,
          background: T.surface, borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 17, fontWeight: 700, color: T.white,
              }}>Nearby Drops</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: T.muted, fontFamily: "monospace" }}>
                  {linkedWallet.slice(0, 4)}…{linkedWallet.slice(-4)}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: T.dim }}>
              {drops.length > 0
                ? `${drops.length} drop${drops.length !== 1 ? "s" : ""} in view — click one to explore`
                : "Pan the map to find drops near you"}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
            {drops.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌿</div>
                <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.6 }}>
                  No drops visible here.<br />Try panning or zooming out.
                </div>
              </div>
            ) : (
              drops.map(drop => {
                const dist = userPos
                  ? Math.round(haversineM(userPos.lat, userPos.lng, drop.lat, drop.lng))
                  : null;
                const isSelected = selected?.id === drop.id;
                return (
                  <div
                    key={drop.id}
                    onClick={() => {
                      setSelected(drop);
                      setClaimMsg(null);
                      setClaimResult(null);
                      setProofMode(false);
                      setSaveMsg(null);
                      if (mapRef.current) {
                        mapRef.current.flyTo({ center: [drop.lng, drop.lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 600 });
                      }
                    }}
                    style={{
                      background: isSelected ? "rgba(147,168,90,0.1)" : T.card,
                      border: `1px solid ${isSelected ? "rgba(147,168,90,0.35)" : T.border}`,
                      borderRadius: 10, padding: "13px 14px", marginBottom: 8,
                      cursor: "pointer", transition: "all 0.15s",
                      animation: "fadeIn 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
                        <img
                          src={rewardIconUrl(drop)}
                          style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, objectFit: "contain", background: T.bg, border: `1px solid ${T.border}` }}
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: T.olive, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
                            {drop.campaign_name || "Drop"}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {drop.hint || "Mystery Drop"}
                          </div>
                          <div style={{ fontSize: 12, color: T.olive, fontWeight: 600 }}>
                            {drop.reward_amount
                              ? `${Number(drop.reward_amount).toLocaleString()} $TOUCHGRASS`
                              : drop.reward_type}
                          </div>
                        </div>
                      </div>
                      {dist !== null && (
                        <div style={{
                          fontSize: 11, color: dist <= 25 ? T.green : T.dim,
                          flexShrink: 0, marginLeft: 10, marginTop: 2, textAlign: "right",
                        }}>
                          {dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 20px", display: "flex", gap: 16, flexShrink: 0 }}>
            {[
              { href: "/wago-drops/saved",    label: "Saved"    },
              { href: "/wago-drops/my-drops", label: "My Drops" },
              { href: "/wago-drops/settings", label: "Settings" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontSize: 12, color: T.dim, textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.color = T.olive}
                onMouseLeave={e => e.currentTarget.style.color = T.dim}
              >{label}</Link>
            ))}
          </div>
        </div>

        {/* ── Map + ticker + detail panels ── */}
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
          <div className="map-container" ref={mapContainer} style={{ flex: 1 }} />

          {/* Location permission error banner */}
          {locError && (
            <div style={{
              position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
              zIndex: 20, maxWidth: 340, width: "calc(100% - 32px)",
              background: "rgba(8,10,6,0.92)", backdropFilter: "blur(8px)",
              border: `1px solid rgba(251,191,36,0.3)`,
              borderRadius: 10, padding: "12px 16px",
              display: "flex", alignItems: "flex-start", gap: 10,
              animation: "fadeIn 0.2s ease",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24", marginBottom: 3 }}>
                  Location access blocked
                </div>
                <div style={{ fontSize: 12, color: "rgba(240,239,234,0.6)", lineHeight: 1.5 }}>
                  {locError === "location_denied" ? <>
                    On iPhone: <strong style={{color:"#fbbf24"}}>Settings → Privacy & Security → Location Services → Safari Websites → Ask Next Time</strong>.
                    Then reload this page.
                  </> : "Couldn't get your location. Check that location services are on and try again."}
                </div>
              </div>
              <button
                onClick={() => setLocError(null)}
                style={{ background: "none", border: "none", color: "rgba(240,239,234,0.3)", fontSize: 18, cursor: "pointer", padding: 0, flexShrink: 0 }}
              >×</button>
            </div>
          )}

          {/* ── Live claims ticker ── */}
          <ClaimsTicker onSelectDrop={(claim) => {
            if (!claim.lat || !claim.lng) return;
            // Find the matching drop in state, or build a minimal one
            const match = drops.find(d => d.id === claim.location_id);
            if (match) {
              setSelected(match);
            } else {
              setSelected({
                id: claim.location_id,
                lat: claim.lat,
                lng: claim.lng,
                hint: claim.campaign_name,
                campaign_name: claim.campaign_name,
                reward_type: claim.reward_type,
                reward_amount: claim.reward_amount,
              });
            }
            setClaimMsg(null);
            setClaimResult(null);
            setProofMode(false);
            if (mapRef.current) {
              mapRef.current.flyTo({ center: [claim.lng, claim.lat], zoom: 15, duration: 800 });
            }
          }} />

          {/* ── Post-claim success screen ── */}
          {claimResult && (
            <div style={{
              background: T.bg, borderTop: `1px solid ${T.border}`,
              padding: "20px 24px", flexShrink: 0,
              animation: "fadeIn 0.25s ease",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                  background: T.card, border: `2px solid ${T.olive}`,
                  boxShadow: "0 0 0 4px rgba(147,168,90,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  <img src={rewardIconUrl(claimResult)} style={{ width: 40, height: 40, objectFit: "contain" }}
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: T.olive, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                    Drop Claimed 🌿
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.white, marginBottom: 2 }}>
                    {(() => {
                      const amt = Number(claimResult.reward_amount || 0);
                      const ticker = (claimResult.reward_type || "").toLowerCase() === "sol" ? "SOL" : "$TOUCHGRASS";
                      return `+${amt.toLocaleString()} ${ticker}`;
                    })()}
                  </div>
                  {claimResult.proof_bonus_applied && (
                    <div style={{ fontSize: 11, color: T.green }}>
                      +{Number(claimResult.proof_bonus_amount || 0).toLocaleString()} proof bonus included
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                    Pending · reward queued to your wallet
                  </div>
                </div>
                <button onClick={() => { setClaimResult(null); setSelected(null); setProofMode(false); setProofStatus(null); }}
                  style={{ background: "none", border: "none", color: T.dim, fontSize: 22, cursor: "pointer", padding: 0, flexShrink: 0 }}>×</button>
              </div>

              {!claimResult.proof_bonus_applied && claimResult.proof_bonus_enabled && !proofMode && (
                <div style={{
                  marginTop: 14, background: "rgba(74,222,128,0.06)",
                  border: "1px solid rgba(74,222,128,0.18)", borderRadius: 10,
                  padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.green, marginBottom: 2 }}>📸 Earn the Proof Bonus</div>
                    <div style={{ fontSize: 12, color: T.muted }}>
                      Submit a photo for +{Number(claimResult.proof_bonus_amount || 0).toLocaleString()} extra
                    </div>
                  </div>
                  <button onClick={() => setProofMode(true)} style={{
                    background: T.green, color: T.bg, border: "none",
                    borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                  }}>Add Photo</button>
                </div>
              )}

              {proofMode && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
                    Upload a photo showing you were here (selfie, scenery — anything real)
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{
                      background: T.card, border: `1px dashed ${T.border}`,
                      borderRadius: 8, padding: "9px 16px", fontSize: 13, cursor: "pointer", color: T.muted,
                    }}>
                      {proofFile ? proofFile.name : "📷 Choose photo"}
                      <input type="file" accept="image/*" capture="environment"
                        style={{ display: "none" }}
                        onChange={e => { setProofFile(e.target.files[0]); setProofStatus(null); }} />
                    </label>
                    <button
                      onClick={() => handleProofSubmit(claimResult.claim_id)}
                      disabled={!proofFile || proofStatus?.ok === null}
                      style={{
                        background: proofFile ? T.olive : T.border,
                        color: proofFile ? T.bg : T.dim,
                        border: "none", borderRadius: 8, padding: "9px 18px",
                        fontSize: 13, fontWeight: 700,
                        cursor: proofFile ? "pointer" : "default",
                      }}>
                      {proofStatus?.ok === null ? "Uploading…" : "Submit"}
                    </button>
                    <button onClick={() => { setProofMode(false); setProofFile(null); setProofStatus(null); }}
                      style={{ background: "none", border: "none", color: T.dim, fontSize: 13, cursor: "pointer" }}>
                      Skip
                    </button>
                  </div>
                  {proofStatus && (
                    <div style={{ fontSize: 12, marginTop: 8, color: proofStatus.ok ? T.green : T.red }}>
                      {proofStatus.text}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <button onClick={() => handleShare(claimResult)} style={{
                  flex: 1, background: T.olive, color: T.bg, border: "none",
                  borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>🌿 Share</button>
                <button onClick={() => { setClaimResult(null); setSelected(null); setProofMode(false); setProofStatus(null); }} style={{
                  flex: 1, background: T.card, color: T.muted, border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer",
                }}>Find Another Drop</button>
                {claimResult.tx_signature && (
                  <a href={`https://solscan.io/tx/${claimResult.tx_signature}`} target="_blank" rel="noopener noreferrer"
                    style={{
                      background: "none", border: `1px solid ${T.border}`,
                      borderRadius: 8, padding: "10px 14px", fontSize: 12, color: T.dim,
                      textDecoration: "none", display: "flex", alignItems: "center",
                    }}>
                    view tx ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Drop detail panel */}
          {selected && !claimResult && (
            <div style={{
              background: T.bg, borderTop: `1px solid ${T.border}`,
              padding: "20px 24px",
              animation: "fadeIn 0.2s ease",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.olive, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                    {selected.campaign_name}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.white, lineHeight: 1.2 }}>
                    {selected.hint || "Mystery Drop"}
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setClaimMsg(null); }} style={{
                  background: "none", border: "none", color: T.dim,
                  fontSize: 22, cursor: "pointer", padding: "0 0 0 12px", lineHeight: 1,
                }}>×</button>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{
                  background: "rgba(147,168,90,0.1)", border: `1px solid rgba(147,168,90,0.2)`,
                  borderRadius: 8, padding: "8px 14px", flexShrink: 0,
                }}>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Reward</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.olive }}>
                    {selected.reward_amount
                      ? `${Number(selected.reward_amount).toLocaleString()} $TOUCHGRASS`
                      : selected.reward_type?.toUpperCase()}
                  </div>
                  {selected.proof_bonus_enabled && (
                    <div style={{ fontSize: 10, color: T.green, marginTop: 3 }}>
                      +{selected.proof_bonus_amount} proof bonus
                    </div>
                  )}
                </div>

                {distToSelected !== null && (
                  <div style={{
                    background: canClaim ? "rgba(74,222,128,0.08)" : T.card,
                    border: `1px solid ${canClaim ? "rgba(74,222,128,0.2)" : T.border}`,
                    borderRadius: 8, padding: "8px 14px", flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Distance</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: canClaim ? T.green : T.white }}>
                      {distToSelected}m
                    </div>
                    <div style={{ fontSize: 10, color: canClaim ? T.green : T.dim, marginTop: 3 }}>
                      {canClaim ? "In range ✓" : `Need ${selected.claim_radius_m ?? 25}m`}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
                  {claimMsg && (
                    <div style={{
                      fontSize: 12, color: T.red, padding: "6px 10px", borderRadius: 7,
                      background: "rgba(248,113,113,0.08)",
                    }}>{claimMsg.text}</div>
                  )}
                  {saveMsg && <div style={{ fontSize: 12, color: T.muted }}>{saveMsg}</div>}
                  <button
                    onClick={() => handleSave(selected.id)}
                    disabled={saving}
                    style={{
                      background: T.card, border: `1px solid ${T.border}`,
                      color: T.muted, borderRadius: 8, padding: "10px 14px",
                      fontSize: 13, cursor: "pointer",
                    }}
                  >{saving ? "…" : "🔖 Save"}</button>
                  <button
                    onClick={() => handleClaim(selected.id)}
                    disabled={!canClaim || claiming}
                    style={{
                      background: canClaim ? T.olive : T.border,
                      color: canClaim ? T.bg : T.dim,
                      border: "none", borderRadius: 8, padding: "10px 20px",
                      fontSize: 13, fontWeight: 700,
                      cursor: canClaim && !claiming ? "pointer" : "default",
                    }}
                  >
                    {claiming ? "Claiming…" : canClaim ? "Claim Drop" : `${distToSelected ?? "?"}m Away`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function WagoDropsPage() {
  const { data: session, status } = useSession();
  const [linkedWallet, setLinkedWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const router = useRouter();

  const flyToCoords = (() => {
    const param = router.query.flyTo;
    if (!param) return null;
    const [lat, lng] = String(param).split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  })();

  useEffect(() => {
    if (!session?.user?.google_id) return;
    setWalletLoading(true);
    fetch("/api/wago-drops/me")
      .then(r => r.json())
      .then(data => { if (data.linked_wallet) setLinkedWallet(data.linked_wallet); })
      .catch(console.error)
      .finally(() => setWalletLoading(false));
  }, [session?.user?.google_id]);

  const loading = status === "loading" || walletLoading;

  return (
    <>
      <Head>
        <title>WAGO Drops — Touch Grass</title>
        <meta name="description" content="Real-world location-based $TOUCHGRASS drops. Go outside, find the drop, claim on-chain." />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "system-ui,sans-serif" }}>
        <WagoNav session={session} />

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${T.border}`, borderTopColor: T.olive, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : !session ? (
          <LandingView />
        ) : !linkedWallet ? (
          <WalletLinkView googleId={session.user.google_id} onLinked={setLinkedWallet} />
        ) : (
          <MapView session={session} linkedWallet={linkedWallet} flyToCoords={flyToCoords} />
        )}
      </div>
    </>
  );
}