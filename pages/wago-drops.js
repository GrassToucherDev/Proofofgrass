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
import { WagoDropsNav, WagoDropsBottomNav } from "../components/wago-drops/WagoDropsNav";
import WalletConnect from "../components/wago-drops/WalletConnect";
import Wago from "../components/wago-drops/Wago";
import { getDeviceHash } from "../utils/fingerprint";
import CoverImage from "../components/wago-drops/CoverImage";
import ProofBonusFlow from "../components/wago-drops/ProofBonusFlow";


// ─── Theme ────────────────────────────────────────────────────────────────────
import { T } from "../utils/wagoTheme";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";

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
      width: "100%",
      minWidth: 0,
      background: "rgba(255,255,255,0.94)",
      backdropFilter: "blur(8px)",
      borderTop: `1px solid rgba(91,166,34,0.15)`,
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
        background: "linear-gradient(to right, rgba(255,255,255,0.94), transparent)",
        pointerEvents: "none",
      }} />
      {/* Right fade — shorter to leave room for stat */}
      <div style={{
        position: "absolute", right: total24h != null ? 90 : 0, top: 0, bottom: 0, width: 40, zIndex: 2,
        background: `linear-gradient(to left, rgba(255,255,255,0.94), transparent)`,
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
                borderRight: `1px solid rgba(13,42,5,0.07)`,
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
          background: "rgba(255,255,255,0.94)",
          borderLeft: `1px solid rgba(91,166,34,0.2)`,
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

// ─── Landing page (signed-out state) ─────────────────────────────────────────
function LandingView() {
  const steps = [
    { n: "1", icon: "🗺️", title: "Open the map",   desc: "Drops appear on a live map. They reveal as you get close." },
    { n: "2", icon: "🚶", title: "Walk there",      desc: "Pins reveal within 100m. Claiming unlocks at 25m — you have to actually show up." },
    { n: "3", icon: "📦", title: "Claim the drop",  desc: "Tap Claim. Your location is checked and your reward is queued to your wallet." },
    { n: "4", icon: "🎟️", title: "Add proof, win tickets", desc: "Snap a photo of the spot and share it for Grass Tickets in the monthly Grass Draw." },
  ];
  const perks = [
    { icon: "🔒", title: "Proximity-gated",   desc: "Drops can only be claimed from within 25 meters. No spoofing your way to a reward." },
    { icon: "🎟️", title: "Grass Tickets",     desc: "Rarer drops earn more tickets: 2 to 25 per proof, entered into that month's Grass Draw." },
    { icon: "⚡", title: "Straight to wallet", desc: "Rewards are sent to your linked Solana wallet once your claim is verified." },
  ];
  const card = { ...V2Styles.glassCard, padding: "24px 22px" };
  return (
    <div style={{ fontFamily: V2.fontSans, color: V2.forestGreen }}>
      {/* Hero */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: V2.gradientHero || V2.gradientSky,
        padding: "56px 20px 64px", textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <img src="/images/wago/wago-drops-logo.png" alt="WAGO Drops" draggable={false}
            style={{ width: "min(92%, 560px)", height: "auto", display: "block" }} />
        </div>
        <div style={{ ...V2Styles.pill, display: "inline-flex", marginBottom: 18 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: V2.grassLime, display: "inline-block", marginRight: 8 }} />
          Live on Solana
        </div>
        <h1 style={{
          fontFamily: V2.fontSerif, fontSize: "clamp(40px,8vw,68px)", fontWeight: 700,
          color: V2.forestGreen, margin: "0 0 6px", lineHeight: 1.05,
        }}>
          Touch Grass.<br /><span style={{ color: V2.grassGreen }}>Find Drops.</span>
        </h1>
        <p style={{ fontSize: "clamp(15px,2.5vw,18px)", color: V2.forestLight, lineHeight: 1.7, margin: "18px auto 30px", maxWidth: 480 }}>
          Real-world treasure hunts hidden on a live map. Walk there, claim the drop,
          and prove you were actually outside.
        </p>
        <button onClick={() => signIn("google")} style={{ ...V2Styles.btnPrimary, padding: "15px 34px", fontSize: 16 }}>
          Start Hunting
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
        <p style={{ fontSize: 12, color: V2.textMuted, marginTop: 14 }}>Sign in with Google · Link a Solana wallet · Hunt</p>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "56px 16px 24px" }}>
        <h2 style={{ fontFamily: V2.fontSerif, fontSize: "clamp(26px,5vw,36px)", textAlign: "center", margin: "0 0 28px" }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          {steps.map(st => (
            <div key={st.n} style={card}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{st.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{st.title}</div>
              <div style={{ fontSize: 13, color: V2.forestLight, lineHeight: 1.6 }}>{st.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Perks */}
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "24px 16px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {perks.map(f => (
            <div key={f.title} style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 42, height: 42, borderRadius: V2.radiusMd, flexShrink: 0, background: V2.skyBlue,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>{f.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: V2.forestLight, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ textAlign: "center", padding: "24px 20px 72px" }}>
        <h2 style={{ fontFamily: V2.fontSerif, fontSize: "clamp(26px,5vw,38px)", margin: "0 0 12px" }}>Ready to go outside?</h2>
        <p style={{ fontSize: 14, color: V2.forestLight, margin: "0 auto 24px", maxWidth: 380, lineHeight: 1.7 }}>
          Sign in with Google, link your Solana wallet, and start hunting. Drops are live now.
        </p>
        <button onClick={() => signIn("google")} style={{ ...V2Styles.btnSecondary, padding: "13px 28px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <img src="https://www.google.com/favicon.ico" alt="" style={{ width: 16, height: 16 }} />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

// ─── Wallet link step ─────────────────────────────────────────────────────────
function WalletLinkView({ googleId, onLinked, needsVerify = false }) {
  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><Wago pose="ticket" size={120} float /></div>
      <h2 style={{
        fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: 28, fontWeight: 700, color: T.white, margin: "0 0 10px",
      }}>{needsVerify ? "Verify your wallet" : "Connect your wallet"}</h2>
      <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, margin: "0 0 28px" }}>
        {needsVerify
          ? "Rewards only go to wallets you've proven are yours. Connect the wallet you linked earlier and sign a free message — it takes a few seconds."
          : "Connect Phantom or Solflare so your WAGO Drop rewards have somewhere to land. You can change it later — once every 24 hours."}
      </p>
      <WalletConnect googleId={googleId} onLinked={(addr) => onLinked(addr)} ctaLabel="Verify & start hunting" />
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
  const [locError,     setLocError]     = useState(null);
  const hasFlewToUser  = useRef(false);
  const userPosRef     = useRef(null);   // latest position, readable from map event handlers (no stale closure)
  const geolocateRef   = useRef(null);

  const fetchDropsInView = useCallback(async (map) => {
    if (!map) return;
    const bounds = map.getBounds();
    try {
      const res = await fetch(
        `/api/wago-drops/locations?swLat=${bounds.getSouth()}&swLng=${bounds.getWest()}&neLat=${bounds.getNorth()}&neLng=${bounds.getEast()}${userPosRef.current ? `&userLat=${userPosRef.current.lat}&userLng=${userPosRef.current.lng}` : ""}`
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
      ? `0 0 0 4px rgba(91,166,34,0.35), 0 4px 16px rgba(0,0,0,0.6)`
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
      // Never set transform on the marker element itself: Mapbox positions it
      // with transform, so overriding it sends the pin to the map's top-left.
      // Scale the inner image instead.
      el.addEventListener("mouseenter", () => {
        const img = el.querySelector("img");
        if (img) img.style.transform = "scale(1.12)";
        el.style.filter = "brightness(1.06)";
      });
      el.addEventListener("mouseleave", () => {
        const img = el.querySelector("img");
        if (img) img.style.transform = "";
        el.style.filter = "";
      });
      el.addEventListener("click", () => {
        setSelected(loc);
        setClaimMsg(null);
        setClaimResult(null);
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
    let cancelled = false;   // effect cleaned up (e.g. StrictMode) before mapbox finished loading
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled) return;
      import("mapbox-gl/dist/mapbox-gl.css").catch(() => {});
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const initialCenter = flyToCoords ? [flyToCoords.lng, flyToCoords.lat] : [-98.5795, 39.8283];
      const initialZoom   = flyToCoords ? 16 : 4;
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: initialCenter,
        zoom: initialZoom,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
        trackUserLocation: true,
        showUserHeading: false,
        fitBoundsOptions: { zoom: 15, duration: 1200 },
      });
      geolocate.on("geolocate", (e) => {
        const { latitude: lat, longitude: lng } = e.coords;
        setLocError(null);
        // Ignore GPS jitter under ~8m so we don't refetch on every tiny update.
        const prev = userPosRef.current;
        if (!prev || haversineM(prev.lat, prev.lng, lat, lng) > 8) {
          userPosRef.current = { lat, lng };
          setUserPos({ lat, lng });
        }
        if (!hasFlewToUser.current) {
          hasFlewToUser.current = true;
          map.flyTo({ center: [lng, lat], zoom: 17, duration: 1200 });
        }
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
        // Start live location right away so drops reveal at their true spot.
        try { geolocate.trigger(); } catch {}
        if (flyToCoords) {
          map.flyTo({ center: [flyToCoords.lng, flyToCoords.lat], zoom: 16, duration: 1500 });
        }
      });
      map.on("moveend", () => fetchDropsInView(map));
    });
    return () => { cancelled = true; map?.remove(); };
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
        body: JSON.stringify({ locationId, userLat: userPos.lat, userLng: userPos.lng, deviceHash: await getDeviceHash() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      setClaimResult({
        drop: selected,
        message: data.message,
        reward_amount: data.reward_amount ?? selected?.reward_amount,
        reward_type:   data.reward_type   ?? selected?.reward_type,
        claim_id:       data.claim_id,
        proof_bonus_enabled: data.proof_bonus_enabled,
        proof_tickets:  data.proof_tickets,
        proof_deadline: data.proof_deadline,
        rarity:         data.rarity,
        tx_signature: data.tx_signature,
      });
    } catch (err) {
      setClaimMsg({ ok: false, text: err.message });
    } finally {
      setClaiming(false);
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
        setSaveMsg("Copied to clipboard!")
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

  // Keep the open drop in sync with fresh data: once you're close enough for the
  // server to reveal it, swap the blurred coordinates/hint for the real ones.
  useEffect(() => {
    if (!selected || claimResult) return;
    const fresh = drops.find(d => d.id === selected.id);
    if (fresh && (fresh.lat !== selected.lat || fresh.lng !== selected.lng || fresh.hint !== selected.hint)) {
      setSelected(fresh);
    }
  }, [drops]);

  const distToSelected = selected && userPos
    ? Math.round(haversineM(userPos.lat, userPos.lng, selected.lat, selected.lng))
    : null;
  const canClaim = distToSelected !== null && distToSelected <= (selected?.claim_radius_m ?? 25);

  return (
    <div className="wd-map-shell" style={{ display: "flex", height: "calc(100vh - 57px)", flexDirection: "row" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @media (max-width: 680px) {
          .map-layout { flex-direction: column !important; }
          .wd-map-shell { height: calc(100dvh - 57px - 62px - env(safe-area-inset-bottom)) !important; }
          .map-sidebar { width: 100% !important; height: auto !important; max-height: 150px; border-right: none !important; border-bottom: 1px solid rgba(13,42,5,0.08) !important; }
          .map-sidebar-head, .map-sidebar-foot { display: none !important; }
          .map-sidebar-list { display: flex !important; flex-direction: row !important; overflow-x: auto !important; overflow-y: hidden !important; gap: 10px; padding: 10px 12px !important; -webkit-overflow-scrolling: touch; }
          .map-sidebar-list > .map-drop-card { min-width: 250px; max-width: 280px; margin-bottom: 0 !important; flex-shrink: 0; }
          .map-sidebar-list > .map-empty { width: 100%; padding: 8px 0 !important; display: flex; align-items: center; gap: 12px; text-align: left !important; }
          .map-container { height: auto !important; min-height: 0; }
        }
      `}</style>

      <div className="map-layout" style={{ display: "flex", flex: 1, flexDirection: "row", overflow: "hidden" }}>
        {/* ── Sidebar ── */}
        <div className="map-sidebar" style={{
          width: 340, flexShrink: 0,
          background: T.surface, borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div className="map-sidebar-head" style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
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

          <div className="map-sidebar-list" style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
            {drops.length === 0 ? (
              <div className="map-empty" style={{ textAlign: "center", padding: "32px 16px" }}>
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><Wago pose="point" size={84} /></div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
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
                    className="map-drop-card"
                    onClick={() => {
                      setSelected(drop);
                      setClaimMsg(null);
                      setClaimResult(null);
                      setSaveMsg(null);
                      if (mapRef.current) {
                        mapRef.current.flyTo({ center: [drop.lng, drop.lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 600 });
                      }
                    }}
                    style={{
                      background: isSelected ? "rgba(91,166,34,0.1)" : T.card,
                      border: `1px solid ${isSelected ? "rgba(91,166,34,0.35)" : T.border}`,
                      borderRadius: 10, padding: "13px 14px", marginBottom: 8,
                      cursor: "pointer", transition: "all 0.15s",
                      animation: "fadeIn 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
                        {drop.image_url ? (
                          <CoverImage src={drop.image_url} height={44} radius={10} style={{ width: 44, flexShrink: 0 }} />
                        ) : null}
                        {!drop.image_url && <img
                          src={rewardIconUrl(drop)}
                          style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, objectFit: "contain", background: T.bg, border: `1px solid ${T.border}` }}
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />}
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

          <div className="map-sidebar-foot" style={{ borderTop: `1px solid ${T.border}`, padding: "12px 20px", display: "flex", gap: 16, flexShrink: 0 }}>
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
        <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column" }}>
          <div className="map-container" ref={mapContainer} style={{ flex: 1, minWidth: 0 }} />

          {/* Location permission error banner */}
          {locError && (
            <div style={{
              position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
              zIndex: 20, maxWidth: 340, width: "calc(100% - 32px)",
              background: "rgba(255,255,255,0.94)", backdropFilter: "blur(8px)",
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
            if (mapRef.current) {
              mapRef.current.flyTo({ center: [claim.lng, claim.lat], zoom: 15, duration: 800 });
            }
          }} />

          {/* ── Post-claim success screen ── */}
          {claimResult && (
            <div style={{
              background: T.bg, borderTop: `1px solid ${T.border}`, borderRadius: "20px 20px 0 0", boxShadow: "0 -6px 24px rgba(26,74,10,0.10)", position: "relative", zIndex: 5,
              padding: "20px 24px", flexShrink: 0,
              maxHeight: "62vh", overflowY: "auto",
              animation: "fadeIn 0.25s ease",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                  background: T.card, border: `2px solid ${T.olive}`,
                  boxShadow: "0 0 0 4px rgba(91,166,34,0.15)",
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
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                    Pending · reward queued to your wallet
                  </div>
                </div>
                <Wago pose="cheer" size={72} float style={{ flexShrink: 0 }} />
                <button onClick={() => { setClaimResult(null); setSelected(null); }}
                  style={{ background: "none", border: "none", color: T.dim, fontSize: 22, cursor: "pointer", padding: 0, flexShrink: 0 }}>×</button>
              </div>

              {claimResult.proof_bonus_enabled && claimResult.claim_id && (
                <ProofBonusFlow claim={claimResult} />
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                {!(claimResult.proof_bonus_enabled && claimResult.claim_id) && (
                  <button onClick={() => handleShare(claimResult)} style={{
                    flex: 1, background: T.olive, color: T.bg, border: "none",
                    borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>🌿 Share</button>
                )}
                <button onClick={() => { setClaimResult(null); setSelected(null); }} style={{
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
              background: T.bg, borderTop: `1px solid ${T.border}`, borderRadius: "20px 20px 0 0", boxShadow: "0 -6px 24px rgba(26,74,10,0.10)", position: "relative", zIndex: 5,
              padding: "20px 24px",
              animation: "fadeIn 0.2s ease",
              flexShrink: 0,
            }}>
              {selected.image_url && <CoverImage src={selected.image_url} alt={selected.campaign_name} height={110} radius={14} style={{ marginBottom: 12 }} />}
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

              {distToSelected !== null && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
                  background: canClaim ? "rgba(125,200,50,0.14)" : T.surface,
                  border: `1px solid ${canClaim ? "rgba(91,166,34,0.35)" : T.border}`,
                  borderRadius: 14, padding: "6px 14px 6px 8px",
                }}>
                  <Wago pose={canClaim ? "cheer" : "point"} size={46} />
                  <div style={{ fontSize: 13, color: T.white, fontWeight: 600, lineHeight: 1.35 }}>
                    {canClaim
                      ? "You're here! Tap Claim Drop."
                      : distToSelected <= 100
                        ? `Getting warmer — ${distToSelected - (selected.claim_radius_m ?? 25)}m to go.`
                        : `Head this way — ${distToSelected >= 1000 ? (distToSelected / 1000).toFixed(1) + "km" : distToSelected + "m"} away.`}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{
                  background: "rgba(91,166,34,0.1)", border: `1px solid rgba(91,166,34,0.2)`,
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
                      🎟️ +{selected.proof_tickets || 0} Grass Tickets with proof
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
                      color: canClaim ? "#fff" : T.dim,
                      border: "none", borderRadius: 999, padding: "11px 24px",
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
  const [needsVerify, setNeedsVerify] = useState(false);   // wallet linked earlier but never proven
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
      .then(data => {
        // Only verified wallets can play: an unverified one sends the user to re-connect it.
        if (data.linked_wallet && data.wallet_verified) setLinkedWallet(data.linked_wallet);
        else if (data.linked_wallet) setNeedsVerify(true);
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
        <meta property="og:title" content="WAGO Drops — Touch Grass" />
        <meta property="og:description" content="Real-world treasure hunts on a live map. Find drops, prove you were there, earn Grass Tickets." />
        <meta property="og:image" content="https://proofofgrass.app/images/wago/wago-drops-logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/wago/icon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/images/wago/icon-192.png" />
        <link rel="apple-touch-icon" href="/images/wago/apple-touch-icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: !session ? V2.skyBlue : T.surface, color: T.white, fontFamily: V2.fontSans }}>
        <style>{V2GlobalCSS}</style>
        <WagoDropsNav session={session} />
        <WagoDropsBottomNav />

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${T.border}`, borderTopColor: T.olive, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : !session ? (
          <LandingView />
        ) : !linkedWallet ? (
          <WalletLinkView googleId={session.user.google_id} needsVerify={needsVerify} onLinked={setLinkedWallet} />
        ) : (
          <MapView session={session} linkedWallet={linkedWallet} flyToCoords={flyToCoords} />
        )}
      </div>
    </>
  );
}