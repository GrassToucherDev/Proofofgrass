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

// ─── Haversine distance (metres) — client-side only for the "you are here" ring
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(160deg, #0d1508 0%, #080a06 55%, #0a0f07 100%)",
        borderBottom: `1px solid ${T.border}`,
        padding: "80px 20px 72px",
        textAlign: "center",
      }}>
        {/* Decorative ambient glow */}
        <div style={{
          position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(147,168,90,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Eyebrow */}
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

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "72px 20px 64px" }}>
        <p style={{
          fontSize: 11, color: T.olive, letterSpacing: "0.12em",
          textTransform: "uppercase", fontWeight: 600, textAlign: "center", marginBottom: 40,
        }}>How it works</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 2,
        }}>
          {[
            {
              n: "01",
              icon: "🗺️",
              title: "Open the map",
              desc: "Drop pins appear on a live Mapbox map. They're hidden until you get close.",
            },
            {
              n: "02",
              icon: "🚶",
              title: "Walk there",
              desc: "Pins reveal within 100m. The claim button unlocks at 25m — you have to actually show up.",
            },
            {
              n: "03",
              icon: "📦",
              title: "Claim the drop",
              desc: "Tap Claim. The app records your location and queues your reward on-chain.",
            },
            {
              n: "04",
              icon: "💰",
              title: "Earn $TOUCHGRASS",
              desc: "Tokens land in your Solana wallet automatically. No manual claiming, no gas drama.",
            },
          ].map((step, i) => (
            <div key={step.n} style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: i === 0 ? "12px 0 0 12px" : i === 3 ? "0 12px 12px 0" : 0,
              padding: "28px 24px",
              position: "relative",
            }}>
              <div style={{
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 13, color: "rgba(147,168,90,0.4)",
                fontWeight: 700, letterSpacing: "0.06em",
                marginBottom: 16,
              }}>{step.n}</div>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{step.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        background: T.surface,
      }}>
        <div style={{
          maxWidth: 860, margin: "0 auto",
          padding: "64px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 40,
        }}>
          {[
            {
              icon: "🔒",
              title: "Proximity-gated",
              desc: "Drops can only be claimed from within 25 meters. There's no spoofing your way to a reward.",
            },
            {
              icon: "🌱",
              title: "Proof of Grass bonus",
              desc: "Existing Grass Draw participants earn an extra bonus on every claim — loyalty recognized.",
            },
            {
              icon: "⚡",
              title: "Automatic transfers",
              desc: "$TOUCHGRASS is sent directly to your wallet once your claim is verified. No extra steps.",
            },
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

      {/* ── CTA footer ───────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", padding: "72px 20px 80px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🌿</div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: "clamp(26px,5vw,38px)", fontWeight: 700,
          color: T.white, margin: "0 0 14px", lineHeight: 1.2,
        }}>
          Ready to go outside?
        </h2>
        <p style={{ fontSize: 14, color: T.muted, margin: "0 auto 32px", maxWidth: 380, lineHeight: 1.7 }}>
          Sign in with Google, link your Solana wallet, and start hunting.
          Drops are live now.
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
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState(null);
  const [locError,     setLocError]     = useState(null);
  const hasFlewToUser  = useRef(false);
  const geolocateRef   = useRef(null);

  // ── Fetch drops visible in current map bounds ───────────────────────────────
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

  // ── Markers ────────────────────────────────────────────────────────────────
  const markersRef = useRef({});

  // Re-style all markers whenever selection changes
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { el }]) => {
      const isActive = selected?.id === id;
      applyMarkerStyle(el, isActive);
    });
  }, [selected]);

  function applyMarkerStyle(el, isActive) {
    el.style.cssText = `
      width:${isActive ? 42 : 34}px;
      height:${isActive ? 42 : 34}px;
      border-radius:50%;
      background:${isActive ? "#fff" : T.olive};
      border:${isActive ? `3px solid ${T.olive}` : "2.5px solid rgba(255,255,255,0.9)"};
      display:flex;align-items:center;justify-content:center;
      font-size:${isActive ? 20 : 16}px;
      cursor:pointer;
      box-shadow:${isActive ? `0 0 0 4px rgba(147,168,90,0.35), 0 4px 16px rgba(0,0,0,0.6)` : "0 2px 10px rgba(0,0,0,0.5)"};
      transition:all 0.18s ease;
      z-index:${isActive ? 10 : 1};
      position:relative;
    `;
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
      const el = document.createElement("div");
      el.textContent = "📦";
      el.title = loc.hint || "Drop";
      applyMarkerStyle(el, false);
      el.addEventListener("mouseenter", () => {
        if (selected?.id !== loc.id) el.style.transform = "scale(1.12)";
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
      el.addEventListener("click", () => {
        setSelected(loc);
        setClaimMsg(null);
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

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let map;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      import("mapbox-gl/dist/mapbox-gl.css").catch(() => {});
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
        trackUserLocation: true,
        showUserHeading: true,
      });
      geolocate.on("geolocate", (e) => {
        const { latitude: lat, longitude: lng } = e.coords;
        setLocError(null);
        setUserPos({ lat, lng });
        if (!hasFlewToUser.current && !flyToCoords && mapRef.current) {
          hasFlewToUser.current = true;
          mapRef.current.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
        }
      });
      geolocate.on("error", (e) => {
        // code 1 = permission denied, code 2 = unavailable, code 3 = timeout
        if (e.code === 1) {
          setLocError("location_denied");
        } else {
          setLocError("location_unavailable");
        }
      });
      geolocateRef.current = geolocate;
      map.addControl(geolocate, "top-right");
      map.on("load", () => {
        mapRef.current = map;
        fetchDropsInView(map);
        if (flyToCoords) {
          map.flyTo({ center: [flyToCoords.lng, flyToCoords.lat], zoom: 16, duration: 1500 });
        } else {
          // Auto-trigger geolocation on load so the permission prompt fires immediately
          // and the map centers on the user without them having to tap the button
          setTimeout(() => geolocate.trigger(), 500);
        }
      });
      map.on("moveend", () => fetchDropsInView(map));
    });
    return () => map?.remove();
  }, []);

  useEffect(() => {
    if (userPos && mapRef.current) fetchDropsInView(mapRef.current);
  }, [userPos, fetchDropsInView]);

  // ── Claim ──────────────────────────────────────────────────────────────────
  async function handleClaim(locationId) {
    if (!userPos) return setClaimMsg({ ok: false, text: "Enable location to claim." });
    setClaiming(true);
    setClaimMsg(null);
    try {
      const res = await fetch("/api/wago-drops/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, userLat: userPos.lat, userLng: userPos.lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      setClaimMsg({ ok: true, text: data.message || "Claimed! Reward incoming." });
    } catch (err) {
      setClaimMsg({ ok: false, text: err.message });
    } finally {
      setClaiming(false);
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
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
    <div style={{
      display: "flex", height: "calc(100vh - 57px)",
      flexDirection: "row",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @media (max-width: 680px) {
          .map-layout { flex-direction: column !important; }
          .map-sidebar { width: 100% !important; height: 44vh !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; overflow-y: auto !important; }
          .map-container { height: 56vh !important; }
        }
      `}</style>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div className="map-layout" style={{ display: "flex", flex: 1, flexDirection: "row", overflow: "hidden" }}>
        <div className="map-sidebar" style={{
          width: 340, flexShrink: 0,
          background: T.surface,
          borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: "18px 20px 14px",
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
          }}>
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

          {/* Drop list */}
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

          {/* Sidebar footer links */}
          <div style={{
            borderTop: `1px solid ${T.border}`,
            padding: "12px 20px",
            display: "flex", gap: 16, flexShrink: 0,
          }}>
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

        {/* ── Map + detail panel ──────────────────────────────────────────── */}
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
                  {locError === "location_denied"
                    ? "To find drops near you, enable location for this site in your browser or phone settings."
                    : "Couldn't get your location. Check that location services are on and try again."}
                </div>
              </div>
              <button
                onClick={() => setLocError(null)}
                style={{ background: "none", border: "none", color: "rgba(240,239,234,0.3)", fontSize: 18, cursor: "pointer", padding: 0, flexShrink: 0 }}
              >×</button>
            </div>
          )}

          {/* Drop detail panel — slides up from bottom of map area */}
          {selected && (
            <div style={{
              background: T.bg,
              borderTop: `1px solid ${T.border}`,
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
                <button onClick={() => setSelected(null)} style={{
                  background: "none", border: "none", color: T.dim,
                  fontSize: 22, cursor: "pointer", padding: "0 0 0 12px", lineHeight: 1,
                }}>×</button>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                {/* Reward chip */}
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

                {/* Distance chip */}
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

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
                  {claimMsg && (
                    <div style={{
                      fontSize: 12, color: claimMsg.ok ? T.green : T.red,
                      padding: "6px 10px", borderRadius: 7,
                      background: claimMsg.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                    }}>{claimMsg.text}</div>
                  )}
                  {saveMsg && (
                    <div style={{ fontSize: 12, color: T.muted }}>{saveMsg}</div>
                  )}
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

  // Parse ?flyTo=LAT,LNG — used to fly map to a saved drop's location
  const flyToCoords = (() => {
    const param = router.query.flyTo;
    if (!param) return null;
    const [lat, lng] = String(param).split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  })();

  // Load wallet from DB once signed in
  useEffect(() => {
    if (!session?.user?.google_id) return;
    setWalletLoading(true);
    fetch("/api/wago-drops/me")
      .then(r => r.json())
      .then(data => {
        if (data.linked_wallet) setLinkedWallet(data.linked_wallet);
      })
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
          <WalletLinkView
            googleId={session.user.google_id}
            onLinked={setLinkedWallet}
          />
        ) : (
          <MapView session={session} linkedWallet={linkedWallet} flyToCoords={flyToCoords} />
        )}

      </div>
    </>
  );
}