// pages/wago-drops/list.js
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { T } from "../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../components/wago-drops/WagoDropsNav";

const TOUCHGRASS_LOGO_URL = "/images/touchgrass-token.png";
function rewardIconUrl(rewardType) {
  if ((rewardType || "").toLowerCase() === "sol")
    return "https://cryptologos.cc/logos/solana-sol-logo.png";
  return TOUCHGRASS_LOGO_URL;
}

function rewardLabel(c) {
  const base   = Number(c.reward_amount || 0);
  const bonus  = c.proof_bonus_applied ? Number(c.proof_bonus_amount || 0) : 0;
  const total  = base + bonus;
  if ((c.reward_type || "").toLowerCase() === "sol") return `+${total} SOL`;
  return `+${total.toLocaleString()} $TOUCHGRASS`;
}

function StatusBadge({ status }) {
  const map = {
    completed:  { label: "Paid",       color: T.green,  bg: "rgba(74,222,128,0.08)"  },
    pending:    { label: "Pending",     color: T.yellow, bg: "rgba(251,191,36,0.08)"  },
    processing: { label: "Processing", color: T.yellow, bg: "rgba(251,191,36,0.08)"  },
    failed:     { label: "Failed",     color: T.red,    bg: "rgba(248,113,113,0.08)" },
  };
  const s = map[status] || { label: status, color: T.muted, bg: "transparent" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", color: s.color,
      background: s.bg, borderRadius: 5, padding: "3px 7px",
    }}>{s.label}</span>
  );
}

export default function WagoDropsList() {
  const { data: session } = useSession();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch("/api/wago-drops/my-claims")
      .then(r => r.json())
      .then(d => { setClaims(d.claims || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  return (
    <>
      <Head><title>My Claims — WAGO</title></Head>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "system-ui,sans-serif" }}>
        <WagoDropsNav session={session} />
        <WagoDropsBottomNav />

        <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px clamp(14px,4vw,32px) 80px" }}>

          {!session && (
            <p style={{ color: T.muted, fontSize: 14 }}>
              Sign in on the <Link href="/wago-drops" style={{ color: T.olive }}>map page</Link> to see your claims.
            </p>
          )}

          {session && loading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.olive, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {session && !loading && claims.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p style={{ color: T.muted, fontSize: 14 }}>No claims yet. Head to the map to find drops!</p>
              <Link href="/wago-drops" style={{
                display: "inline-block", marginTop: 16,
                background: T.olive, color: T.bg,
                borderRadius: 9, padding: "10px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}>Open Map</Link>
            </div>
          )}

          {session && !loading && claims.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {claims.map(c => (
                <div key={c.id} style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  {/* Asset logo */}
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    background: "#0f1209", border: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  }}>
                    <img
                      src={rewardIconUrl(c.reward_type)}
                      alt={c.reward_type}
                      style={{ width: 30, height: 30, objectFit: "contain" }}
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.hint || c.campaign_name || "Drop"}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                      {new Date(c.claimed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>

                  {/* Right */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, color: T.olive, fontWeight: 700, marginBottom: 4 }}>
                      {rewardLabel(c)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      {c.proof_bonus_applied && (
                        <div style={{ fontSize: 11, color: T.muted }}>
                          incl. +{Number(c.proof_bonus_amount || 0).toLocaleString()} proof bonus
                        </div>
                      )}
                      <StatusBadge status={c.status} />
                      {c.tx_signature && (
                        <a
                          href={`https://solscan.io/tx/${c.tx_signature}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: T.dim, textDecoration: "none" }}
                        >view tx ↗</a>
                      )}
                    </div>
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