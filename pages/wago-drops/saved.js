// pages/wago-drops/saved.js
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

import { T } from "../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../components/wago-drops/WagoDropsNav";
import Wago from "../../components/wago-drops/Wago";
import { rewardLogo, formatReward } from "../../utils/wagoReward";
import CoverImage from "../../components/wago-drops/CoverImage";

const rewardIconUrl = rewardLogo;
function rewardLabel(save) { return formatReward(save); }

function useCountdown(endsAt) {
  const [label, setLabel] = useState("");
  const [urgent, setUrgent] = useState(false);
  useEffect(() => {
    if (!endsAt) return;
    function tick() {
      const diff = new Date(endsAt) - Date.now();
      if (diff <= 0) { setLabel("Expired"); setUrgent(true); return; }
      setUrgent(diff < 3600000); // < 1 hour
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h >= 24) {
        const d = Math.floor(h / 24);
        setLabel(`${d}d ${h % 24}h`);
      } else if (h > 0) {
        setLabel(`${h}h ${m}m`);
      } else {
        const s = Math.floor((diff % 60000) / 1000);
        setLabel(`${m}m ${s}s`);
      }
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return { label, urgent };
}

function ClaimsBar({ claimCount, maxClaims }) {
  if (!maxClaims) return null;
  const pct = Math.min(100, Math.round((claimCount / maxClaims) * 100));
  const remaining = maxClaims - claimCount;
  const almostFull = pct >= 80;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: T.muted }}>
          {claimCount}/{maxClaims} claimed
        </span>
        <span style={{ fontSize: 10, color: almostFull ? T.yellow : T.muted }}>
          {remaining} left{almostFull ? " ⚠" : ""}
        </span>
      </div>
      <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: almostFull ? T.yellow : T.olive,
          borderRadius: 2, transition: "width 0.3s",
        }} />
      </div>
    </div>
  );
}

function SaveCard({ save, onUnsave, onGoToMap, removing }) {
  const { label: expiryLabel, urgent } = useCountdown(save.ends_at);
  const expired = save.campaign_status !== "active" || expiryLabel === "Expired";
  const noClaimsLeft = save.max_claims && save.claim_count >= save.max_claims;
  const unavailable = expired || noClaimsLeft;

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${unavailable ? "rgba(248,113,113,0.15)" : urgent ? "rgba(251,191,36,0.2)" : T.border}`,
      borderRadius: 14,
      padding: "16px",
      opacity: removing ? 0.4 : 1,
      transition: "opacity 0.2s",
      position: "relative",
    }}>
      {/* Unavailable banner */}
      {unavailable && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          background: "rgba(248,113,113,0.08)",
          borderRadius: "14px 14px 0 0",
          padding: "5px 16px",
          fontSize: 10, color: T.red, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {noClaimsLeft ? "Fully Claimed" : "Expired"}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: unavailable ? 20 : 0 }}>
        {/* Logo */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
          background: T.surface,
          border: `2px solid ${unavailable ? "rgba(248,113,113,0.2)" : T.olive}`,
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          opacity: unavailable ? 0.5 : 1,
        }}>
          <img
            src={rewardIconUrl(save)}
            alt={save.reward_type}
            style={{ width: 33, height: 33, objectFit: "contain" }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        </div>

        {save.image_url && <CoverImage src={save.image_url} height={52} radius={10} style={{ width: 52, flexShrink: 0 }} />}

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: unavailable ? T.muted : T.white,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginBottom: 2,
          }}>
            {save.hint || save.campaign_name || "Mystery Drop"}
          </div>

          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
            {save.campaign_name}
            {save.saved_at && ` · Saved ${new Date(save.saved_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </div>

          {/* Reward row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: unavailable ? T.muted : T.olive,
            }}>
              +{rewardLabel(save)}
            </span>

            {save.proof_bonus_enabled && !unavailable && (
              <span style={{
                fontSize: 10, background: "rgba(74,222,128,0.1)",
                border: "1px solid rgba(74,222,128,0.2)",
                color: T.green, borderRadius: 5, padding: "2px 7px",
              }}>
                +{Number(save.proof_bonus_amount || 0).toLocaleString()} proof bonus
              </span>
            )}
          </div>

          {/* Expiry */}
          {save.ends_at && (
            <div style={{ marginTop: 5, fontSize: 11, color: urgent ? T.yellow : T.muted }}>
              {expired ? "⏱ Expired" : `⏱ ${expiryLabel} left`}
            </div>
          )}

          {/* Claims bar */}
          <ClaimsBar claimCount={save.claim_count} maxClaims={save.max_claims} />
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {!unavailable ? (
          <button onClick={() => onGoToMap(save)} style={{
            flex: 2, background: T.olive, color: "#fff", border: "none",
            borderRadius: 999, padding: "9px 0",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            Go to Drop →
          </button>
        ) : (
          <Link href={`/wago-drops/[id]`} as={`/wago-drops/${save.location_id}`} style={{
            flex: 2, textAlign: "center",
            background: T.surface, color: T.muted,
            border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "9px 0",
            fontSize: 13, textDecoration: "none", display: "block",
          }}>
            View Details
          </Link>
        )}
        <button
          onClick={() => onUnsave(save.id, save.location_id)}
          disabled={removing}
          style={{
            flex: 1, background: "none",
            border: `1px solid ${T.border}`,
            color: T.dim, borderRadius: 8, padding: "9px 0",
            fontSize: 12, cursor: "pointer",
          }}
        >
          {removing ? "…" : "Remove"}
        </button>
      </div>
    </div>
  );
}

export default function SavedDrops() {
  const { data: session } = useSession();
  const router = useRouter();
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    fetch("/api/wago-drops/my-saves")
      .then(r => r.json())
      .then(d => { setSaves(d.saves || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  async function handleUnsave(saveId, locationId) {
    setRemoving(saveId);
    try {
      const res = await fetch("/api/wago-drops/save", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaves(prev => prev.filter(s => s.id !== saveId));
      }
    } catch (err) {
      console.error("unsave error:", err);
    }
    setRemoving(null);
  }

  function handleGoToMap(save) {
    router.push(`/wago-drops?flyTo=${save.lat},${save.lng}`);
  }

  const active   = saves.filter(s => (!s.ends_at || new Date(s.ends_at) > Date.now()) && (!s.max_claims || s.claim_count < s.max_claims));
  const inactive = saves.filter(s => !active.includes(s));

  return (
    <>
      <Head>
        <title>Saved Drops — WAGO</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>

        <WagoDropsNav session={session} />
        <WagoDropsBottomNav />

        <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px clamp(14px,4vw,32px) 80px" }}>

          {!session && (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Wago pose="wave" size={110} /></div>
              <p style={{ color: T.muted, fontSize: 14 }}>Sign in to see your saved drops.</p>
              <Link href="/wago-drops" style={{
                display: "inline-block", marginTop: 16,
                background: T.olive, color: "#fff",
                borderRadius: 999, padding: "10px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}>Go to Map</Link>
            </div>
          )}

          {session && loading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.olive, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {session && !loading && saves.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Wago pose="shrug" size={110} /></div>
              <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>
                No saved drops yet.<br />Tap the bookmark on any drop to save it for later.
              </p>
              <Link href="/wago-drops" style={{
                display: "inline-block", marginTop: 16,
                background: T.olive, color: "#fff",
                borderRadius: 999, padding: "10px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}>Browse the Map</Link>
            </div>
          )}

          {session && !loading && saves.length > 0 && (
            <>
              {/* Active drops */}
              {active.length > 0 && (
                <>
                  <div style={{
                    fontSize: 11, color: T.olive, letterSpacing: "0.1em",
                    textTransform: "uppercase", fontWeight: 600, marginBottom: 12,
                  }}>
                    {active.length} available drop{active.length !== 1 ? "s" : ""}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                    {active.map(save => (
                      <SaveCard
                        key={save.id}
                        save={save}
                        onUnsave={handleUnsave}
                        onGoToMap={handleGoToMap}
                        removing={removing === save.id}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Inactive drops */}
              {inactive.length > 0 && (
                <>
                  <div style={{
                    fontSize: 11, color: T.dim, letterSpacing: "0.1em",
                    textTransform: "uppercase", fontWeight: 600, marginBottom: 12,
                  }}>
                    {inactive.length} expired / unavailable
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {inactive.map(save => (
                      <SaveCard
                        key={save.id}
                        save={save}
                        onUnsave={handleUnsave}
                        onGoToMap={handleGoToMap}
                        removing={removing === save.id}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}