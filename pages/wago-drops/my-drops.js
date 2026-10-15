// pages/wago-drops/my-drops.js
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

const T = {
  bg:      "#080a06",
  surface: "#0f1209",
  card:    "#141a0c",
  border:  "rgba(255,255,255,0.07)",
  olive:   "#93a85a",
  white:   "#f0efea",
  muted:   "rgba(240,239,234,0.45)",
  dim:     "rgba(240,239,234,0.22)",
  green:   "#4ade80",
  red:     "#f87171",
  yellow:  "#fbbf24",
};

// ── Reward asset logos (mirrors wago-drops.js) ────────────────────────────────
const TOUCHGRASS_LOGO_URL = "/images/touchgrass-token.png";
const REWARD_ICONS = {
  sol:        "https://cryptologos.cc/logos/solana-sol-logo.png",
  touchgrass: TOUCHGRASS_LOGO_URL,
};
function rewardIconUrl(rewardType) {
  const t = (rewardType || "").toLowerCase();
  if (t === "sol") return REWARD_ICONS.sol;
  return REWARD_ICONS.touchgrass;
}

// Status badge
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

export default function MyDrops() {
  const { data: session } = useSession();
  const [me,      setMe]      = useState(null);
  const [claims,  setClaims]  = useState([]);
  const [saves,   setSaves]   = useState([]);
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
      setSaves(svD.saves  || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [session]);

  const totalTG = claims.reduce((sum, c) =>
    sum + Number(c.reward_amount || 0) + (c.proof_bonus_applied ? Number(c.proof_bonus_amount || 0) : 0), 0
  );

  return (
    <>
      <Head>
        <title>My WAGO Drops</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "system-ui,sans-serif" }}>

        {/* Nav */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          background: T.bg, borderBottom: `1px solid ${T.border}`,
          padding: "0 clamp(14px,4vw,48px)",
          height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Link href="/wago-drops" style={{ fontSize: 13, color: T.muted, textDecoration: "none" }}>← Map</Link>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 17, fontWeight: 700 }}>My Profile</span>
          <Link href="/wago-drops/settings" style={{ fontSize: 12, color: T.dim, textDecoration: "none" }}>Settings</Link>
        </nav>

        <div style={{ maxWidth: 580, margin: "0 auto", padding: "28px clamp(14px,4vw,32px) 80px" }}>

          {/* Signed-out state */}
          {!session && (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
              <p style={{ color: T.muted, fontSize: 14 }}>Sign in to view your WAGO Drops profile.</p>
              <Link href="/wago-drops" style={{
                display: "inline-block", marginTop: 16,
                background: T.olive, color: T.bg,
                borderRadius: 9, padding: "10px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}>Go to Map</Link>
            </div>
          )}

          {session && loading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.olive, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {session && !loading && (
            <>
              {/* Identity card */}
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: "20px 22px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 16,
              }}>
                {session.user?.image && (
                  <img src={session.user.image} alt=""
                    style={{ width: 52, height: 52, borderRadius: "50%", border: `1px solid ${T.border}` }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{session.user?.name}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{session.user?.email}</div>
                  {me?.linked_wallet && (
                    <div style={{ fontSize: 11, color: T.dim, marginTop: 4, fontFamily: "monospace" }}>
                      {me.linked_wallet.slice(0, 6)}…{me.linked_wallet.slice(-4)}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
                {[
                  { label: "Claims",    value: claims.length },
                  { label: "Saved",     value: saves.length  },
                  { label: "TG Earned", value: totalTG.toLocaleString() },
                ].map(s => (
                  <div key={s.label} style={{
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 10, padding: "14px 12px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: T.olive }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* My Claims */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 11, color: T.olive, letterSpacing: "0.1em",
                  textTransform: "uppercase", fontWeight: 600, marginBottom: 12,
                }}>My Claims</div>

                {claims.length === 0 ? (
                  <div style={{
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 12, padding: "32px 20px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                    <div style={{ fontSize: 13, color: T.muted }}>No claims yet — get outside and find a drop!</div>
                    <Link href="/wago-drops" style={{
                      display: "inline-block", marginTop: 14,
                      background: T.olive, color: T.bg,
                      borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none",
                    }}>Open Map</Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {claims.map(claim => {
                      const iconUrl = rewardIconUrl(claim.reward_type);
                      const amount  = Number(claim.reward_amount || 0)
                        + (claim.proof_bonus_applied ? Number(claim.proof_bonus_amount || 0) : 0);
                      const rewardLabel = claim.reward_type?.toLowerCase() === "sol"
                        ? `${amount} SOL`
                        : `${amount.toLocaleString()} $TOUCHGRASS`;
                      return (
                        <div key={claim.id} style={{
                          background: T.surface, border: `1px solid ${T.border}`,
                          borderRadius: 11, padding: "13px 16px",
                          display: "flex", alignItems: "center", gap: 14,
                        }}>
                          {/* Asset logo */}
                          <div style={{
                            width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                            background: T.card, border: `1px solid ${T.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                          }}>
                            <img
                              src={iconUrl}
                              alt={claim.reward_type}
                              style={{ width: 30, height: 30, objectFit: "contain" }}
                              onError={e => { e.currentTarget.style.display = "none"; }}
                            />
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 2,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {claim.hint || claim.campaign_name || "Drop"}
                            </div>
                            <div style={{ fontSize: 11, color: T.muted }}>
                              {claim.campaign_name && claim.hint ? claim.campaign_name : ""}
                              {claim.claimed_at
                                ? ` · ${new Date(claim.claimed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                                : ""}
                            </div>
                          </div>

                          {/* Right side: amount + status */}
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.olive, marginBottom: 4 }}>
                              {rewardLabel}
                            </div>
                            <StatusBadge status={claim.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Saved drops quick link */}
              <Link href="/wago-drops/saved" style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 11, padding: "14px 18px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                textDecoration: "none", color: T.white,
              }}>
                <span style={{ fontSize: 14 }}>🔖 Saved Drops</span>
                <span style={{ fontSize: 13, color: T.muted }}>{saves.length} →</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}