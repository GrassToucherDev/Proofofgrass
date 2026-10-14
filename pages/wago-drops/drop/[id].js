// pages/wago-drops/drop/[id].js
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const T = {
  bg:"#080a06",card:"#141a0c",border:"rgba(255,255,255,0.07)",
  olive:"#93a85a",white:"#f0efea",muted:"rgba(240,239,234,0.45)",dim:"rgba(240,239,234,0.22)",
  green:"#4ade80",red:"#f87171",
};

export default function DropDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/wago-drops/campaign/${id}`)
      .then(r => r.json())
      .then(d => { setCampaign(d.campaign); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const isActive = campaign?.status === "active";
  const now = new Date();
  const started = !campaign?.starts_at || new Date(campaign.starts_at) <= now;
  const notEnded = !campaign?.ends_at || new Date(campaign.ends_at) >= now;

  return (
    <>
      <Head><title>{campaign?.name || "Drop"} — WAGO</title></Head>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "system-ui,sans-serif" }}>
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "0 clamp(14px,4vw,48px)", height: 56, display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/wago-drops" style={{ fontSize: 13, color: T.muted, textDecoration: "none" }}>← Map</Link>
        </nav>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px clamp(14px,4vw,32px)" }}>
          {loading && <p style={{ color: T.muted, fontSize: 14 }}>Loading…</p>}
          {!loading && !campaign && <p style={{ color: T.muted, fontSize: 14 }}>Campaign not found.</p>}
          {!loading && campaign && (
            <>
              {campaign.image_url && (
                <img src={campaign.image_url} alt={campaign.name} style={{ width: "100%", borderRadius: 12, marginBottom: 20, maxHeight: 220, objectFit: "cover" }} />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{campaign.name}</h1>
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: isActive && started && notEnded ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.07)", color: isActive && started && notEnded ? T.green : T.muted }}>
                  {isActive && started && notEnded ? "Active" : campaign.status}
                </span>
              </div>
              {campaign.description && <p style={{ color: T.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>{campaign.description}</p>}

              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Reward</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.olive }}>{Number(campaign.reward_amount || 0).toLocaleString()} TG</div>
                {campaign.proof_bonus_enabled && (
                  <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>
                    +{Number(campaign.proof_bonus_amount || 0).toLocaleString()} TG bonus for Grass Draw holders
                  </div>
                )}
              </div>

              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>How It Works</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    ["📍", "Pins reveal on the map when you're within " + (campaign.reveal_radius_m || 100) + "m"],
                    ["✅", "Walk within " + (campaign.claim_radius_m || 25) + "m to claim your reward"],
                    ["💰", "Tokens sent directly to your linked Solana wallet"],
                  ].map(([icon, text]) => (
                    <div key={text} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                      <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {(campaign.starts_at || campaign.ends_at) && (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: T.dim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Timing</div>
                  {campaign.starts_at && <div style={{ fontSize: 13, color: T.muted }}>Starts: {new Date(campaign.starts_at).toLocaleString()}</div>}
                  {campaign.ends_at && <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Ends: {new Date(campaign.ends_at).toLocaleString()}</div>}
                </div>
              )}

              <Link href="/wago-drops" style={{ display: "block", textAlign: "center", background: T.olive, color: T.bg, borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                Find Drops on Map
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}