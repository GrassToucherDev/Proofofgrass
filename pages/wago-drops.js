// pages/wago-drops.js
// WAGO Drops V2 — Main page
// - Signed out: landing / explainer with Google sign-in prompt
// - Signed in, no wallet linked: wallet link step
// - Signed in + wallet linked: full Mapbox map with drop pins

import { useEffect, useRef, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";


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
              { href: "/wago-drops/list",     label: "Explore" },
              { href: "/wago-drops/saved",    label: "Saved"   },
              { href: "/wago-drops/my-drops", label: "My Drops"},
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
    <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🗺️</div>
      <h1 style={{
        fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: "clamp(28px,6vw,42px)", fontWeight: 700, color: T.white,
        margin: "0 0 12px",
      }}>WAGO Drops</h1>
      <p style={{ fontSize: 16, color: T.muted, lineHeight: 1.7, margin: "0 0 32px" }}>
        Real-world treasure hunts with on-chain rewards. Go outside, find the drop,
        claim your $TOUCHGRASS — proof you were actually there.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 48 }}>
        {[
          ["📍", "Find Drops Near You",   "Hidden on a real map. Walk there to reveal and claim."],
          ["🔒", "Proximity-Gated",        "Pins reveal within 100m. Claims unlock at 25m."],
          ["💰", "On-Chain Rewards",        "$TOUCHGRASS tokens and NFTs sent directly to your wallet."],
          ["🌱", "Proof of Grass Bonus",   "Existing Grass Draw participants earn a proof bonus."],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
            padding: "16px 20px", textAlign: "left", display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.white, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => signIn("google")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "#fff", color: "#1a1a1a",
          border: "none", borderRadius: 10, padding: "12px 28px",
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
        }}
      >
        <img src="https://www.google.com/favicon.ico" alt="" style={{ width: 18, height: 18 }} />
        Continue with Google
      </button>
      <p style={{ fontSize: 11, color: T.dim, marginTop: 14, lineHeight: 1.6 }}>
        Your Google account is used only for WAGO Drops identity.<br/>
        You'll link a Solana wallet separately to receive rewards.
      </p>
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
function MapView({ session, linkedWallet }) {
  const mapContainer = useRef(null);
  const mapRef       = useRef(null);
  const [userPos,  setUserPos]  = useState(null);   // { lat, lng }
  const [drops,    setDrops]    = useState([]);      // visible drops
  const [selected, setSelected] = useState(null);   // drop being viewed
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState(null);   // { ok, text }

  // ── Load Mapbox + init map ──────────────────────────────────────────────────
  useEffect(() => {
    let map;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      import("mapbox-gl/dist/mapbox-gl.css").catch(() => {});
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-98.5795, 39.8283], // default center USA
        zoom: 4,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        "top-right"
      );

      map.on("load", () => {
        mapRef.current = map;
        fetchDropsInView(map);
      });

      map.on("moveend", () => fetchDropsInView(map));
    });

    // Geolocation for distance checks
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      return () => {
        navigator.geolocation.clearWatch(watchId);
        map?.remove();
      };
    }
    return () => map?.remove();
  }, []);

  // ── Fetch drops visible in current map bounds ───────────────────────────────
  const fetchDropsInView = useCallback(async (map) => {
    if (!map) return;
    const bounds = map.getBounds();
    try {
      const res = await fetch(
        `/api/wago-drops/locations?swLat=${bounds.getSouth()}&swLng=${bounds.getWest()}&neLat=${bounds.getNorth()}&neLng=${bounds.getEast()}`
      );
      const data = await res.json();
      if (!res.ok) return;
      setDrops(data.locations || []);
      updateMapMarkers(map, data.locations || []);
    } catch (e) {
      console.error("fetchDropsInView error:", e);
    }
  }, []);

  // ── Add/update markers on the map ──────────────────────────────────────────
  const markersRef = useRef({});
  const updateMapMarkers = useCallback((map, locations) => {
    if (!map || !window.mapboxgl) return;
    // Remove stale
    Object.keys(markersRef.current).forEach(id => {
      if (!locations.find(l => l.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
    // Add new
    locations.forEach(loc => {
      if (markersRef.current[loc.id]) return;
      const el = document.createElement("div");
      el.style.cssText = `
        width:32px;height:32px;border-radius:50%;
        background:${T.olive};border:2px solid #fff;
        display:flex;align-items:center;justify-content:center;
        font-size:16px;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
      `;
      el.textContent = "📦";
      el.title = loc.hint || "Drop";
      el.addEventListener("click", () => setSelected(loc));

      import("mapbox-gl").then(({ default: mapboxgl }) => {
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);
        markersRef.current[loc.id] = marker;
      });
    });
  }, []);

  // ── Claim handler ───────────────────────────────────────────────────────────
  async function handleClaim(locationId) {
    if (!userPos) return setClaimMsg({ ok: false, text: "Enable location to claim." });
    setClaiming(true);
    setClaimMsg(null);
    try {
      const res = await fetch("/api/wago-drops/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          userLat: userPos.lat,
          userLng: userPos.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      setClaimMsg({ ok: true, text: data.message || "Claimed! Reward incoming." });
      setSelected(null);
    } catch (err) {
      setClaimMsg({ ok: false, text: err.message });
    } finally {
      setClaiming(false);
    }
  }

  // ── Distance to selected drop ──────────────────────────────────────────────
  const distToSelected = selected && userPos
    ? Math.round(haversineM(userPos.lat, userPos.lng, selected.lat, selected.lng))
    : null;

  const canClaim = distToSelected !== null && distToSelected <= (selected?.claim_radius_m ?? 25);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 57px)" }}>
      {/* Map */}
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Sidebar — drop detail */}
      {selected && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: T.surface, borderTop: `1px solid ${T.border}`,
          padding: "20px clamp(14px,4vw,32px)",
          animation: "slideUp 0.2s ease",
          zIndex: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.olive, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                {selected.campaign_name}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.white }}>
                {selected.hint || "Mystery Drop"}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{
              background: "none", border: "none", color: T.dim, fontSize: 20, cursor: "pointer",
            }}>×</button>
          </div>

          {/* Reward */}
          <div style={{
            background: T.card, borderRadius: 10, padding: "12px 16px",
            marginBottom: 14, border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Reward</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.olive }}>
              {selected.reward_amount
                ? `${Number(selected.reward_amount).toLocaleString()} $TOUCHGRASS`
                : selected.reward_type?.toUpperCase()}
            </div>
            {selected.proof_bonus_enabled && (
              <div style={{ fontSize: 11, color: T.green, marginTop: 4 }}>
                + {selected.proof_bonus_amount} proof bonus for Grass participants
              </div>
            )}
          </div>

          {/* Distance */}
          {distToSelected !== null && (
            <div style={{
              fontSize: 13, color: canClaim ? T.green : T.muted, marginBottom: 14,
            }}>
              {canClaim
                ? `✅ You're ${distToSelected}m away — close enough to claim!`
                : `📍 ${distToSelected}m away — get within ${selected.claim_radius_m ?? 25}m to claim`}
            </div>
          )}

          {claimMsg && (
            <div style={{
              fontSize: 13, color: claimMsg.ok ? T.green : T.red,
              marginBottom: 12, padding: "8px 12px",
              background: claimMsg.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
              borderRadius: 8,
            }}>
              {claimMsg.text}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => handleClaim(selected.id)}
              disabled={!canClaim || claiming}
              style={{
                flex: 1, background: canClaim ? T.olive : T.border,
                color: canClaim ? T.bg : T.dim,
                border: "none", borderRadius: 9, padding: "13px",
                fontSize: 14, fontWeight: 700,
                cursor: canClaim && !claiming ? "pointer" : "default",
              }}
            >
              {claiming ? "Claiming…" : canClaim ? "Claim Drop" : `${distToSelected ?? "?"}m Away`}
            </button>
            <button
              onClick={async () => {
                await fetch("/api/wago-drops/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ locationId: selected.id }),
                });
              }}
              style={{
                background: T.card, border: `1px solid ${T.border}`,
                color: T.muted, borderRadius: 9, padding: "13px 16px",
                fontSize: 14, cursor: "pointer",
              }}
            >🔖</button>
          </div>
        </div>
      )}

      {/* Wallet indicator (top-left over map) */}
      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 5,
        background: "rgba(8,10,6,0.85)", backdropFilter: "blur(6px)",
        border: `1px solid ${T.border}`, borderRadius: 9,
        padding: "6px 12px", display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, display: "inline-block" }} />
        <span style={{ fontSize: 11, color: T.muted, fontFamily: "monospace" }}>
          {linkedWallet.slice(0, 4)}…{linkedWallet.slice(-4)}
        </span>
        <Link href="/wago-drops/my-drops" style={{ fontSize: 11, color: T.olive, textDecoration: "none" }}>
          My Drops
        </Link>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function WagoDropsPage() {
  const { data: session, status } = useSession();
  const [linkedWallet, setLinkedWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

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
          <MapView session={session} linkedWallet={linkedWallet} />
        )}


      </div>
    </>
  );
}