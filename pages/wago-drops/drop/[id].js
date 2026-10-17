// pages/wago-drops/[id].js
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

import { T } from "../../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../../components/wago-drops/WagoDropsNav";
import Wago from "../../../components/wago-drops/Wago";
import CoverImage from "../../../components/wago-drops/CoverImage";
import ProofBonusFlow from "../../../components/wago-drops/ProofBonusFlow";

const TOUCHGRASS_LOGO_URL = "/images/touchgrass-token.png";
function rewardIconUrl(rewardType) {
  if ((rewardType || "").toLowerCase() === "sol")
    return "https://cryptologos.cc/logos/solana-sol-logo.png";
  return TOUCHGRASS_LOGO_URL;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function Countdown({ endsAt }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function tick() {
      const diff = new Date(endsAt) - Date.now();
      if (diff <= 0) { setLabel("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return <span>{label}</span>;
}

export default function DropDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();

  const [drop,      setDrop]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [userPos,   setUserPos]   = useState(null);
  const [claiming,  setClaiming]  = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [claimErr,  setClaimErr]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  // Fetch drop
  useEffect(() => {
    if (!id) return;
    fetch(`/api/wago-drops/location/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setDrop(d); setSaved(d.already_saved); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  // Get user position once
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    );
  }, []);

  const distM = drop && userPos
    ? Math.round(haversineM(userPos.lat, userPos.lng, drop.lat, drop.lng))
    : null;
  const canClaim = distM !== null && distM <= (drop?.claim_radius_m ?? 25);

  async function handleClaim() {
    if (!userPos || !drop) return;
    setClaiming(true);
    setClaimErr(null);
    try {
      const res = await fetch("/api/wago-drops/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: drop.id, userLat: userPos.lat, userLng: userPos.lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      setClaimResult(data);
      setDrop(prev => ({ ...prev, already_claimed: true }));
    } catch (err) {
      setClaimErr(err.message);
    } finally {
      setClaiming(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/wago-drops/save", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved
          ? { locationId: drop.id }
          : { locationId: drop.id }
        ),
      });
      setSaved(s => !s);
    } catch {}
    setSaving(false);
  }

  function handleShare() {
    const text = drop?.hint
      ? `There's a drop at "${drop.hint}" on WAGO 🌿 #TouchGrass`
      : `Check out this WAGO Drop 🌿 #TouchGrass`;
    const url = `${window.location.origin}/wago-drops/${id}`;
    if (navigator.share) {
      navigator.share({ title: "WAGO Drop", text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>{drop?.hint ? `${drop.hint} — WAGO Drop` : "WAGO Drop"}</title>
        <meta name="description" content={drop?.hint
          ? `Claim this WAGO Drop: ${drop.hint}. Earn ${drop.reward_amount} ${drop.reward_type?.toUpperCase()}.`
          : "A real-world WAGO Drop. Go outside and claim it."} />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>

        {/* Nav */}
        <WagoDropsNav session={session} />
        <WagoDropsBottomNav />

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px clamp(14px,4vw,32px) 80px" }}>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.olive, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {/* Not found */}
          {notFound && (
            <div style={{ textAlign: "center", paddingTop: 80 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Wago pose="shrug" size={120} /></div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Drop not found</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>
                This drop may have expired or been fully claimed.
              </div>
              <Link href="/wago-drops" style={{
                background: T.olive, color: "#fff", borderRadius: 999,
                padding: "10px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none",
                display: "inline-block",
              }}>Browse the Map</Link>
            </div>
          )}

          {/* Drop detail */}
          {drop && !loading && (
            <>
              {/* Hero card */}
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 16, padding: "28px 24px", marginBottom: 16,
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              }}>
                {drop.image_url && <CoverImage src={drop.image_url} alt={drop.campaign_name} height={190} radius={18} style={{ marginBottom: 18 }} />}

                {/* Asset logo */}
                <div style={{
                  width: 72, height: 72, borderRadius: "50%", marginBottom: 18,
                  background: T.card, border: `2.5px solid ${T.olive}`,
                  boxShadow: "0 0 0 6px rgba(91,166,34,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  <img src={rewardIconUrl(drop.reward_type)} alt={drop.reward_type}
                    style={{ width: 50, height: 50, objectFit: "contain" }}
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                </div>

                <div style={{ fontSize: 11, color: T.olive, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                  {drop.campaign_name}
                </div>

                <div style={{
                  fontFamily: "'Cormorant Garamond',Georgia,serif",
                  fontSize: "clamp(22px,5vw,30px)", fontWeight: 700,
                  color: drop.hint ? T.white : T.muted,
                  marginBottom: 8, lineHeight: 1.2,
                }}>
                  {drop.hint || "Mystery Drop"}
                </div>

                {!drop.hint && (
                  <div style={{ fontSize: 12, color: T.dim, marginBottom: 8 }}>
                    Hint revealed within {drop.reveal_radius_m}m
                  </div>
                )}

                {/* Reward */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(91,166,34,0.1)", border: `1px solid rgba(91,166,34,0.2)`,
                  borderRadius: 10, padding: "8px 18px", marginTop: 4,
                }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.olive }}>
                    {Number(drop.reward_amount || 0).toLocaleString()}{" "}
                    {(drop.reward_type || "").toLowerCase() === "sol" ? "SOL" : "$TOUCHGRASS"}
                  </span>
                </div>
                {drop.proof_bonus_enabled && (
                  <div style={{ fontSize: 11, color: T.green, marginTop: 6 }}>
                    🎟️ +{drop.proof_tickets || 0} Grass Tickets with a proof photo
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {/* Distance */}
                <div style={{
                  background: T.surface, border: `1px solid ${canClaim ? "rgba(74,222,128,0.25)" : T.border}`,
                  borderRadius: 10, padding: "12px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: canClaim ? T.green : T.white }}>
                    {distM !== null ? (distM < 1000 ? `${distM}m` : `${(distM/1000).toFixed(1)}km`) : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>
                    {canClaim ? "In range ✓" : "Distance"}
                  </div>
                </div>

                {/* Claims */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {drop.max_claims
                      ? `${drop.claim_count ?? 0}/${drop.max_claims}`
                      : (drop.claim_count ?? 0)}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>Claimed</div>
                </div>

                {/* Expires */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: drop.ends_at ? 14 : 18, fontWeight: 700, color: T.white }}>
                    {drop.ends_at ? <Countdown endsAt={drop.ends_at} /> : "∞"}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>
                    {drop.ends_at ? "Expires" : "No expiry"}
                  </div>
                </div>
              </div>

              {/* Success state */}
              {claimResult && (
                <div style={{
                  background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)",
                  borderRadius: 12, padding: "18px 20px", marginBottom: 16,
                  animation: "fadeIn 0.25s ease",
                }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.green, marginBottom: 4 }}>
                    🌿 Drop Claimed!
                  </div>
                  <div style={{ fontSize: 13, color: T.muted }}>
                    +{Number(claimResult.reward_amount || 0).toLocaleString()}{" "}
                    {(claimResult.reward_type || "").toLowerCase() === "sol" ? "SOL" : "$TOUCHGRASS"} queued to your wallet.
                  </div>
                </div>
              )}
              {claimResult?.proof_bonus_enabled && claimResult?.claim_id && (
                <ProofBonusFlow claim={{ ...claimResult, drop }} />
              )}

              {/* Error */}
              {claimErr && (
                <div style={{
                  background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                  borderRadius: 10, padding: "12px 16px", marginBottom: 16,
                  fontSize: 13, color: T.red,
                }}>{claimErr}</div>
              )}

              {/* Action buttons */}
              {!session ? (
                <Link href="/wago-drops" style={{
                  display: "block", textAlign: "center",
                  background: T.olive, color: "#fff", borderRadius: 999,
                  padding: "14px", fontSize: 14, fontWeight: 700, textDecoration: "none",
                  marginBottom: 10,
                }}>Sign in to Claim</Link>
              ) : drop.already_claimed || claimResult ? (
                <div style={{
                  display: "flex", gap: 10, marginBottom: 10,
                }}>
                  <button onClick={handleShare} style={{
                    flex: 1, background: T.olive, color: "#fff", border: "none",
                    borderRadius: 999, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}>🌿 Share Drop</button>
                  <Link href="/wago-drops/my-drops" style={{
                    flex: 1, textAlign: "center",
                    background: T.card, color: T.muted, border: `1px solid ${T.border}`,
                    borderRadius: 10, padding: "13px", fontSize: 14, textDecoration: "none",
                    display: "block",
                  }}>My Claims</Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
                  <button
                    onClick={handleClaim}
                    disabled={!canClaim || claiming}
                    style={{
                      background: canClaim ? T.olive : T.border,
                      color: canClaim ? T.bg : T.dim,
                      border: "none", borderRadius: 10, padding: "14px",
                      fontSize: 15, fontWeight: 700,
                      cursor: canClaim && !claiming ? "pointer" : "default",
                    }}
                  >
                    {claiming ? "Claiming…"
                      : !userPos ? "Enable location to claim"
                      : canClaim ? "Claim Drop"
                      : `${distM}m away — need ${drop.claim_radius_m ?? 25}m`}
                  </button>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleSave} disabled={saving} style={{
                      flex: 1, background: T.card,
                      color: saved ? T.olive : T.muted,
                      border: `1px solid ${saved ? "rgba(91,166,34,0.3)" : T.border}`,
                      borderRadius: 10, padding: "11px",
                      fontSize: 13, cursor: "pointer",
                    }}>
                      {saving ? "…" : saved ? "🔖 Saved" : "🔖 Save"}
                    </button>
                    <button onClick={handleShare} style={{
                      flex: 1, background: T.card, color: T.muted,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10, padding: "11px",
                      fontSize: 13, cursor: "pointer",
                    }}>Share</button>
                    <Link href={`/wago-drops?flyTo=${drop.lat},${drop.lng}`} style={{
                      flex: 1, textAlign: "center",
                      background: T.card, color: T.muted, border: `1px solid ${T.border}`,
                      borderRadius: 10, padding: "11px", fontSize: 13, textDecoration: "none",
                      display: "block",
                    }}>🗺️ Map</Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        `}</style>
      </div>
    </>
  );
}