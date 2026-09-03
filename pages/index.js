// pages/index.js — V2 Dashboard
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Head from "next/head";
import UploadBox from "../components/UploadBox";
import ResultCard from "../components/ResultCard";
import V2Nav from "../components/V2Nav";
import V2BottomNav from "../components/V2BottomNav";
import V2Ticker from "../components/V2Ticker";
import { supabase } from "../utils/supabase";
import { getSpotlightBadge, getSpotlightFeedText, SPOTLIGHT_BADGES } from "../utils/spotlightBadges";
import { V2, V2Styles, V2GlobalCSS, V2_TIERS, getV2Tier } from "../utils/v2Theme";

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function normalizeUsername(val) {
  return String(val ?? "").replace(/@/g, "").toLowerCase().trim();
}

function computePreviewStreak(row, shieldCount = 0) {
  if (!row?.last_submission_date) return 1;
  const todayUTC      = new Date().toISOString().slice(0, 10);
  const yesterdayUTC  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const twoDaysAgoUTC = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const lastDateStr   = String(row.last_submission_date).slice(0, 10);
  if (lastDateStr === todayUTC)                              return row.current_streak;
  if (lastDateStr === yesterdayUTC)                          return row.current_streak + 1;
  if (lastDateStr === twoDaysAgoUTC && shieldCount > 0)      return row.current_streak + 1;
  if (lastDateStr < twoDaysAgoUTC)                           return 1;
  return 1;
}

const TOUCHGRASS_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const DEXSCREENER_URL = "https://dexscreener.com/solana/5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const BUY_URL         = "https://jup.ag/swap/SOL-5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 16, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg, rgba(200,220,190,0.3) 0%, rgba(220,235,210,0.5) 50%, rgba(200,220,190,0.3) 100%)",
      backgroundSize: "200% 100%",
      animation: "v2Shimmer 1.4s ease-in-out infinite",
    }} />
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, sub, accent, loading }) {
  return (
    <div style={{
      ...V2Styles.statCard,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      {loading
        ? <Skel h={32} r={6} />
        : <div style={{
            fontFamily: V2.fontSerif,
            fontSize: "clamp(26px,4vw,36px)",
            fontWeight: 700,
            color: accent || V2.forestGreen,
            lineHeight: 1,
          }}>{value}</div>
      }
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: V2.midGray }}>{label}</div>
      {sub && <div style={{
        fontSize: 11, color: V2.grassGreen, fontWeight: 600,
        background: "rgba(125,200,50,0.1)", borderRadius: 20,
        padding: "2px 10px", display: "inline-block", alignSelf: "flex-start",
      }}>{sub}</div>}
    </div>
  );
}

// ─── FeatureCard ──────────────────────────────────────────────────────────────
function FeatureCard({ emoji, icon, title, desc, cta, href, onClick, accent }) {
  return (
    <div style={{
      ...V2Styles.glassCard,
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      transition: V2.transitionMd,
      position: "relative",
      minHeight: 200,
    }}>
      {/* Background image */}
      {icon && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${icon})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.35,
          borderRadius: "inherit",
        }} />
      )}
      {/* Content */}
      <div style={{
        position: "relative", zIndex: 1,
        padding: "20px",
        display: "flex", flexDirection: "column", gap: 12, flex: 1,
      }}>
        {!icon && <div style={{ fontSize: 36 }}>{emoji}</div>}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: V2.forestGreen, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 12, color: V2.textBody, lineHeight: 1.5 }}>{desc}</div>
        </div>
        {href ? (
          <Link href={href} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: V2.glassWhite,
            border: `1px solid ${V2.borderGreen}`,
            borderRadius: 20, padding: "7px 14px",
            fontSize: 12, fontWeight: 700,
            color: V2.grassGreen,
            textDecoration: "none",
            marginTop: "auto",
          }}>{cta}</Link>
        ) : (
          <button onClick={onClick} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: V2.glassWhite,
            border: `1px solid ${V2.borderGreen}`,
            borderRadius: 20, padding: "7px 14px",
            fontSize: 12, fontWeight: 700, color: V2.grassGreen,
            cursor: "pointer", marginTop: "auto",
          }}>{cta}</button>
        )}
      </div>
    </div>
  );
}

// ─── TokenStrip ──────────────────────────────────────────────────────────────
function TokenStrip() {
  const [price,    setPrice]    = useState(null);
  const [change24, setChange24] = useState(null);
  const [vol24,    setVol24]    = useState(null);
  const [mcap,     setMcap]     = useState(null);
  const [liq,      setLiq]      = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/touchgrass-price");
        const d = await r.json();
        if (d.price > 0) setPrice(d.price);
        // Fetch full pair data for vol/mcap/liq
        const r2 = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOUCHGRASS_MINT}`);
        const d2 = await r2.json();
        const pair = d2?.pairs?.[0];
        if (pair) {
          setChange24(parseFloat(pair.priceChange?.h24 || 0));
          setVol24(parseFloat(pair.volume?.h24 || 0));
          setMcap(parseFloat(pair.marketCap || 0));
          setLiq(parseFloat(pair.liquidity?.usd || 0));
        }
      } catch(e) {}
      setLoading(false);
    })();
  }, []);

  const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${n.toFixed(2)}`;
  const fmtPrice = (n) => {
    if (!n) return "—";
    if (n < 0.000001) return `$${n.toExponential(2)}`;
    if (n < 0.001) return `$${n.toFixed(8)}`;
    return `$${n.toFixed(6)}`;
  };
  const up = (change24 || 0) >= 0;

  return (
    <div style={{
      ...V2Styles.glassCard,
      borderRadius: 0,
      display: "flex", alignItems: "center", gap: 0,
      padding: "12px clamp(14px,4vw,40px)",
      flexWrap: "wrap",
      borderLeft: "none", borderRight: "none",
      gap: 24,
    }}>
      {/* Logo + price */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <img src="/touchgrass-transparent.png" alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: V2.forestGreen }}>$TOUCHGRASS</span>
        {loading ? <Skel w={80} h={16} /> : (
          <span style={{ fontFamily: V2.fontSerif, fontSize: 18, fontWeight: 700, color: V2.forestGreen }}>
            {fmtPrice(price)}
          </span>
        )}
        {change24 !== null && (
          <span style={{ fontSize: 12, fontWeight: 700, color: up ? V2.success : V2.danger }}>
            {up ? "▲" : "▼"} {Math.abs(change24).toFixed(2)}%
          </span>
        )}
      </div>

      {/* Stats */}
      {!loading && [
        { label: "24h Vol",    value: fmt(vol24 || 0) },
        { label: "Market Cap", value: fmt(mcap  || 0) },
        { label: "Liquidity",  value: fmt(liq   || 0) },
      ].map(s => (
        <div key={s.label} style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: V2.midGray, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: V2.forestGreen }}>{s.value}</div>
        </div>
      ))}

      {/* CTAs */}
      <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexShrink: 0, flexWrap: "wrap" }}>
        <a href={DEXSCREENER_URL} target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 12, fontWeight: 600, color: V2.forestGreen,
            textDecoration: "none", padding: "7px 14px",
            border: `1px solid ${V2.borderSoft}`, borderRadius: 20,
            background: V2.glassWhite,
          }}>
          📈 DexScreener
        </a>
        <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
          style={{
            ...V2Styles.btnPrimary,
            fontSize: 12, padding: "7px 16px",
          }}>
          💰 Buy $TOUCHGRASS
        </a>
      </div>
    </div>
  );
}

// ─── FeaturedPosts section ────────────────────────────────────────────────────
function FeaturedPostsSection() {
  const [posts,    setPosts]    = useState([]);
  const [idx,      setIdx]      = useState(0);
  const [clicked,  setClicked]  = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("FeaturedPosts")
        .select("*").eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setPosts(data || []);
      setLoading(false);
    })();
  }, []);

  const post = posts[idx] || null;

  const track = async (url) => {
    setClicked(p => ({ ...p, [url]: true }));
    await supabase.from("ClickEvents").insert([{ link_type: "tweet", url }]).catch(() => {});
  };

  if (!loading && !posts.length) return null;

  return (
    <div style={{ padding: "32px clamp(14px,4vw,40px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>𝕏</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: V2.forestGreen }}>Featured Posts</span>
        </div>
        <a href="https://twitter.com/XTouchGrass" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: V2.grassGreen, textDecoration: "none" }}>@XTouchGrass →</a>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {loading ? (
          <div style={{ ...V2Styles.glassCard, padding: 24, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Skel w="60%" h={16} />
          </div>
        ) : post ? (
          <>
            <div style={{ ...V2Styles.glassCard, padding: 20, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                  background: V2.gradientGrassBtn, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/touchgrass-transparent.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: V2.forestGreen }}>Touch Grass</div>
                  <div style={{ fontSize: 11, color: V2.midGray }}>@XTouchGrass</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 18 }}>𝕏</div>
              </div>
              <div style={{ fontSize: 14, color: V2.textBody, lineHeight: 1.6 }}>
                {post.tweet_text?.length > 280 ? post.tweet_text.slice(0, 277) + "..." : post.tweet_text}
              </div>
            </div>
            <a href={post.tweet_url} target="_blank" rel="noopener noreferrer"
              onClick={() => track(post.tweet_url)}
              style={{
                ...V2Styles.btnPrimary,
                width: "100%", justifyContent: "center",
                background: clicked[post.tweet_url] ? V2.gradientGrassBtn : V2.glassWhite,
                color: clicked[post.tweet_url] ? V2.white : V2.forestGreen,
                border: `1px solid ${V2.borderGreen}`,
                boxShadow: "none",
                fontSize: 13,
              }}>
              {clicked[post.tweet_url] ? "✓ Opened" : "Like · Reply · Repost on X →"}
            </a>

            {posts.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
                <button onClick={() => setIdx(i => (i - 1 + posts.length) % posts.length)}
                  style={{ ...V2Styles.btnSecondary, padding: "6px 14px", fontSize: 12 }}>← Prev</button>
                <div style={{ display: "flex", gap: 6 }}>
                  {posts.map((_, i) => (
                    <button key={i} onClick={() => setIdx(i)}
                      style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 4, border: "none",
                        background: i === idx ? V2.grassGreen : V2.softGray, cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
                  ))}
                </div>
                <button onClick={() => setIdx(i => (i + 1) % posts.length)}
                  style={{ ...V2Styles.btnSecondary, padding: "6px 14px", fontSize: 12 }}>Next →</button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── RewardsBanner (V2 skin) ──────────────────────────────────────────────────
function RewardsBanner({ username }) {
  const [show,    setShow]    = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!username) return;
    const key = `pog_rewards_banner_${username}`;
    const last = localStorage.getItem(key);
    if (last && Date.now() - parseInt(last) < 7 * 86400000) return;
    (async () => {
      const { data } = await supabase.from("Profiles").select("has_touchgrass_holder,wallet_verified")
        .ilike("username", username).maybeSingle();
      if (!data?.has_touchgrass_holder || !data?.wallet_verified) {
        setShow(true);
      }
      setChecked(true);
    })();
  }, [username]);

  if (!show || !checked) return null;

  return (
    <div style={{
      ...V2Styles.glassCard,
      margin: "0 clamp(14px,4vw,40px)",
      padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      borderColor: V2.borderGold,
      background: "rgba(255,243,216,0.8)",
    }}>
      <span style={{ fontSize: 28 }}>💰</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: V2.forestGreen, marginBottom: 3 }}>
          Unlock milestone rewards
        </div>
        <div style={{ fontSize: 12, color: V2.textMuted }}>
          Hold $5+ in $TOUCHGRASS and connect your wallet to earn airdrop rewards for hitting streak milestones.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
          style={{ ...V2Styles.btnPrimary, fontSize: 12, padding: "8px 16px" }}>
          Buy $TOUCHGRASS
        </a>
        <button onClick={() => { localStorage.setItem(`pog_rewards_banner_${username}`, Date.now()); setShow(false); }}
          style={{ background: "transparent", border: "none", color: V2.midGray, cursor: "pointer", fontSize: 12 }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────
function LBRow({ rank, username, streak }) {
  const tier = getV2Tier(streak);
  return (
    <Link href={`/u/${username}`} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px", borderRadius: 10,
        background: rank <= 3 ? "rgba(125,200,50,0.06)" : "transparent",
        transition: V2.transitionFast,
      }}>
        <div style={{ width: 24, textAlign: "center", fontSize: 14, fontWeight: 700,
          color: rank === 1 ? V2.gold : rank === 2 ? V2.midGray : rank === 3 ? "#cd7f32" : V2.dimGray }}>
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: V2.forestGreen, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            @{username}
          </div>
          <div style={{ fontSize: 11, color: tier.color }}>{tier.emoji} {tier.name}</div>
        </div>
        <div style={{ fontFamily: V2.fontSerif, fontSize: 20, fontWeight: 700, color: V2.forestGreen }}>
          {streak}d
        </div>
      </div>
    </Link>
  );
}

// ─── Upload / Log Your Proof section ─────────────────────────────────────────
function LogProofSection({ username, hasUser, imageSrc, proofFile, showResult, hasPostedToday,
  onUpload, streakStatus, streakTone, resolvedStreak, loadingUser }) {

  const toneColor = {
    success: V2.success, warning: V2.warning, reset: V2.danger, neutral: V2.midGray,
  }[streakTone] || V2.midGray;

  return (
    <div style={{ ...V2Styles.glassCard, padding: "28px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
        <h2 style={{ fontFamily: V2.fontSans, fontSize: 22, fontWeight: 800,
          color: V2.forestGreen, marginBottom: 8 }}>Let's get outside</h2>
        <p style={{ fontSize: 13, color: V2.textMuted }}>Upload your outdoor photo to log today's proof.</p>
      </div>

      {/* Streak status */}
      {hasUser && streakStatus && (
        <div style={{
          padding: "10px 16px", borderRadius: 20, marginBottom: 20,
          background: streakTone === "success" ? "rgba(125,200,50,0.1)" : "rgba(232,160,32,0.1)",
          border: `1px solid ${toneColor}40`,
          textAlign: "center", fontSize: 13, fontWeight: 600, color: toneColor,
        }}>
          {streakTone === "success" ? "✓" : "⚡"} {streakStatus}
        </div>
      )}

      {/* Upload area */}
      {!showResult && (
        <div style={{
          border: `2px dashed ${V2.borderGreen}`,
          borderRadius: 16, padding: "32px 16px",
          textAlign: "center", marginBottom: 16,
          background: "rgba(125,200,50,0.04)",
          cursor: "pointer",
        }}>
          <UploadBox onUpload={onUpload} />
        </div>
      )}

      {/* Result card */}
      {showResult && imageSrc && (
        <div style={{ marginBottom: 16 }}>
          <ResultCard
            imageSrc={imageSrc}
            file={proofFile}
            username={username}
            initialStreak={(resolvedStreak ?? 0) + 1}
          />
        </div>
      )}

      {/* Next steps */}
      {!showResult && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: V2.midGray, marginBottom: 10 }}>
            Next Steps
          </div>
          {[
            { icon: "𝕏", text: "Share your proof on X" },
            { icon: "🔄", text: "Come back and confirm" },
            { icon: "🔒", text: "Lock in your streak" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
              padding: "8px 0", borderBottom: i < 2 ? `1px solid ${V2.borderSoft}` : "none" }}>
              <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: V2.textBody }}>{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mini Marketplace Preview ─────────────────────────────────────────────────
function MarketplacePreview() {
  const packs = [
    { name: "Retro Vibes",    emoji: "🌅", bg: "linear-gradient(135deg,#8B4513,#D2691E)" },
    { name: "Anime Outdoors", emoji: "🌸", bg: "linear-gradient(135deg,#FF69B4,#9370DB)" },
    { name: "Y2K Outdoors",   emoji: "💿", bg: "linear-gradient(135deg,#00CED1,#9370DB)" },
    { name: "Elemental Wilds",emoji: "⚡", bg: "linear-gradient(135deg,#228B22,#8B4513)" },
    { name: "Weekend Escape", emoji: "🏕️", bg: "linear-gradient(135deg,#2E8B57,#006400)" },
    { name: "The Trenches",   emoji: "🌿", bg: "linear-gradient(135deg,#1a2d0e,#3d7a12)" },
  ];

  return (
    <div style={{ ...V2Styles.glassCard, padding: "24px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: V2.grassGreen, marginBottom: 6 }}>Marketplace</div>
        <h3 style={{ fontFamily: V2.fontSans, fontSize: 18, fontWeight: 800, color: V2.forestGreen, marginBottom: 4 }}>
          Make your profile yours.
        </h3>
        <p style={{ fontSize: 12, color: V2.textMuted }}>Premium background packs for your profile, flex cards, and proof styles.</p>
      </div>

      {/* Pack grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {packs.map((p, i) => (
          <div key={i} style={{
            borderRadius: 12, overflow: "hidden", aspectRatio: "4/3",
            background: p.bg, position: "relative", cursor: "pointer",
            boxShadow: V2.shadowSm,
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: 6 }}>
              <div style={{ fontSize: 20 }}>{p.emoji}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.9)",
                textAlign: "center", marginTop: 4, lineHeight: 1.2 }}>{p.name}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>5 Backgrounds</div>
            </div>
          </div>
        ))}
      </div>

      <Link href="/marketplace" style={{
        ...V2Styles.btnPrimary,
        width: "100%", justifyContent: "center", fontSize: 13,
        textDecoration: "none",
      }}>
        View All Packs
      </Link>
    </div>
  );
}

// ─── Main Home component ──────────────────────────────────────────────────────
export default function Home() {
  const [rawUsername, setRawUsername] = useState("");
  const username = normalizeUsername(rawUsername);
  const hasUser  = username.length > 0;

  // ── All state preserved from V1 ──────────────────────────────────────────
  const [currentStreak,        setCurrentStreak]        = useState(null);
  const [displayStreak,        setDisplayStreak]        = useState(null);
  const [streakStatus,         setStreakStatus]         = useState("");
  const [streakTone,           setStreakTone]           = useState("neutral");
  const [shieldEligible,       setShieldEligible]       = useState(false);
  const [missedOneDayNoShield, setMissedOneDayNoShield] = useState(false);
  const [hasPostedToday,       setHasPostedToday]       = useState(null);
  const [userStats,            setUserStats]            = useState(null);
  const [loadingUser,          setLoadingUser]          = useState(false);
  const [imageSrc,             setImageSrc]             = useState(null);
  const [proofFile,            setProofFile]            = useState(null);
  const [showResult,           setShowResult]           = useState(false);
  const [dailyCount,           setDailyCount]           = useState(null);
  const [totalProofs,          setTotalProofs]          = useState(null);
  const [topStreaker,          setTopStreaker]           = useState(null);
  const [leaders,              setLeaders]              = useState([]);
  const [mounted,              setMounted]              = useState(false);
  const [pendingChallenges,    setPendingChallenges]    = useState([]);
  const [challengeActioning,   setChallengeActioning]   = useState(null);
  const uploadSectionRef = useRef(null);

  // ── Effects — all preserved from V1 ─────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("pog_username");
    if (saved) setRawUsername(normalizeUsername(saved));
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      const normalized = ref.toLowerCase().replace(/@/g,"").trim();
      if (!localStorage.getItem("pog_referrer")) localStorage.setItem("pog_referrer", normalized);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && username) localStorage.setItem("pog_username", username);
  }, [username]);

  // User data load — preserved exactly
  useEffect(() => {
    if (!username) {
      setCurrentStreak(null); setDisplayStreak(null); setStreakStatus("");
      setStreakTone("neutral"); setHasPostedToday(null); setUserStats(null);
      setLoadingUser(false); return;
    }
    setLoadingUser(true);
    const timer = setTimeout(async () => {
      try {
        const todayUTC     = new Date().toISOString().slice(0, 10);
        const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const twoDaysAgo   = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

        const [{ data: streakRowExact }, { count: postCount }] = await Promise.all([
          supabase.from("Streaks").select("current_streak,best_streak,last_submission_date,shield_count")
            .eq("username", username).maybeSingle(),
          supabase.from("Submissions").select("id",{count:"exact",head:true}).eq("username",username),
        ]);

        let streakRow = streakRowExact;
        if (!streakRow) {
          const { data: ilike } = await supabase.from("Streaks")
            .select("current_streak,best_streak,last_submission_date,shield_count,username")
            .ilike("username", username).maybeSingle();
          if (ilike) streakRow = ilike;
        }

        const { data: allStreaksForRank } = await supabase.from("Streaks")
          .select("username,current_streak").order("current_streak",{ascending:false});
        const rankIdx = (allStreaksForRank ?? []).findIndex(r => r.username?.toLowerCase().trim() === username);
        const rankCount = rankIdx >= 0 ? rankIdx : (allStreaksForRank?.length ?? 1) - 1;

        const lastDate = streakRow?.last_submission_date ? String(streakRow.last_submission_date).slice(0,10) : null;

        const { data: consumableRow } = await supabase.from("UserConsumables").select("quantity")
          .eq("username",username).eq("consumable_type","shield").maybeSingle();
        const shieldCount = consumableRow?.quantity ?? streakRow?.shield_count ?? 0;

        const { data: sunsetRow } = await supabase.from("UserConsumables").select("quantity")
          .eq("username",username).eq("consumable_type","sunset_pass").maybeSingle();
        const sunsetPassCount = sunsetRow?.quantity ?? 0;

        const actual     = streakRow?.current_streak ?? 0;
        const displayVal = computePreviewStreak(streakRow, shieldCount);
        const missedOne  = lastDate === twoDaysAgo;
        const lastDateStr = lastDate ? String(lastDate).slice(0,10) : null;
        const postedToday    = lastDateStr === todayUTC;
        const postedYesterday = lastDateStr === yesterdayUTC;

        if (!lastDate)            setStreakStatus("Start your streak today"),              setStreakTone("neutral");
        else if (postedToday)     setStreakStatus("Streak locked in for today ✓"),         setStreakTone("success");
        else if (postedYesterday) setStreakStatus(`Submit today to reach Day ${actual+1}`),setStreakTone("warning");
        else if (missedOne && shieldCount > 0) setStreakStatus(`Day ${actual} — shield available`), setStreakTone("reset");
        else                      setStreakStatus("Streak lost — start again today"),      setStreakTone("reset");

        setShieldEligible(missedOne && shieldCount > 0);
        setMissedOneDayNoShield(missedOne && shieldCount === 0);
        setHasPostedToday(postedToday);
        setCurrentStreak(actual);
        setDisplayStreak(displayVal);
        setUserStats({
          posts: postCount ?? 0,
          bestStreak: streakRow?.best_streak ?? actual,
          rank: rankCount + 1,
          shields: shieldCount,
          sunsetPasses: sunsetPassCount,
        });

        supabase.from("Challenges").select("id,slug,challenger,challenged,duration_days,message,created_at")
          .eq("challenged",username).eq("status","pending").order("created_at",{ascending:false})
          .then(({ data }) => setPendingChallenges(data ?? []));

      } catch(e) { setStreakTone("neutral"); setStreakStatus(""); }
      finally { setLoadingUser(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Community stats
  const fetchStats = useCallback(async () => {
    const todayStart = new Date(); todayStart.setUTCHours(0,0,0,0);
    const [{ count:todayC }, { data:streakers }, { count:allC }] = await Promise.all([
      supabase.from("Submissions").select("id",{count:"exact",head:true}).in("status",["pending","approved"]).gte("created_at",todayStart.toISOString()),
      supabase.from("Streaks").select("username,current_streak").order("current_streak",{ascending:false}).limit(1),
      supabase.from("Submissions").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
    ]);
    setDailyCount(todayC ?? 0);
    setTotalProofs(allC ?? 0);
    if (streakers?.[0]) setTopStreaker({ username: normalizeUsername(streakers[0].username), streak: streakers[0].current_streak ?? 1 });
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase.from("Streaks").select("username,current_streak")
      .order("current_streak",{ascending:false}).limit(8);
    if (data) setLeaders(data.map(r => ({ username: normalizeUsername(r.username), streak: r.current_streak ?? 1 })));
  }, []);

  useEffect(() => { fetchStats(); fetchLeaderboard(); }, []);

  // Challenge actions
  const handleChallengeAction = useCallback(async (challenge, action) => {
    setChallengeActioning(challenge.id);
    try {
      if (action === "accept") {
        const now = new Date().toISOString();
        const endsAt = new Date(Date.now() + challenge.duration_days * 86400000).toISOString();
        await supabase.from("Challenges").update({ status:"active", started_at:now, ends_at:endsAt }).eq("id",challenge.id);
        await supabase.from("ChallengeProgress").upsert([
          { challenge_id:challenge.id, username:challenge.challenger, days_complete:0, status:"active" },
          { challenge_id:challenge.id, username:challenge.challenged, days_complete:0, status:"active" },
        ], { onConflict:"challenge_id,username" });
        await supabase.from("ChallengeEvents").insert([{ challenge_id:challenge.id, username, event_type:"accepted" }]);
      } else {
        await supabase.from("Challenges").update({ status:"declined" }).eq("id",challenge.id);
        await supabase.from("ChallengeEvents").insert([{ challenge_id:challenge.id, username, event_type:"declined" }]);
      }
      setPendingChallenges(prev => prev.filter(c => c.id !== challenge.id));
    } catch(e) { console.error("challenge action failed",e); }
    setChallengeActioning(null);
  }, [username]);

  // Image upload
  const handleImageUpload = useCallback(async (file) => {
    if (!file || !(file instanceof Blob)) return;
    setProofFile(file);
    setImageSrc(URL.createObjectURL(file));
    setShowResult(false);
    setTimeout(() => setShowResult(true), 80);
    if (!hasUser) return;
    try {
      const today = new Date().toISOString().slice(0,10);
      const fileName = `${username}/${today}.png`;
      await supabase.storage.from("proof-photos").upload(fileName, file, { contentType:file.type||"image/png", upsert:true });
    } catch(e) {}
  }, [username, hasUser]);

  const resolvedStreak = loadingUser ? null : displayStreak ?? null;
  const tier = getV2Tier(resolvedStreak ?? currentStreak ?? 0);

  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior:"smooth", block:"center" });
  };

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = V2GlobalCSS + `
    .v2-hero {
      background: ${V2.gradientHero};
      min-height: clamp(420px, 65vh, 700px);
      position: relative; overflow: hidden;
      display: flex; align-items: center;
      padding: 40px clamp(14px,5vw,64px);
    }
    .v2-hero-left { flex: 1; min-width: 0; }
    .v2-hero-right { flex-shrink: 0; width: clamp(280px,40%,480px); display: flex; flex-direction: column; gap: 10px; }
    .v2-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .v2-feature-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; padding: 24px clamp(14px,4vw,40px); }
    .v2-bottom-grid { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 16px; padding: 24px clamp(14px,4vw,40px); align-items: start; }
    @media (max-width: 1024px) {
      .v2-feature-grid { grid-template-columns: repeat(2,1fr); }
      .v2-bottom-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 768px) {
      .v2-hero { flex-direction: column; min-height: auto; padding: 32px 16px; gap: 32px; }
      .v2-hero-right { width: 100%; }
      .v2-feature-grid { grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px; }
      .v2-bottom-grid { grid-template-columns: 1fr; padding: 16px; }
    }
    @media (max-width: 480px) {
      .v2-feature-grid { grid-template-columns: 1fr 1fr; }
    }
  `;

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>Proof of Grass — Go outside. Prove it. Build your streak.</title>
        <meta name="description" content="Log your outdoor time, grow your streak, earn rewards, and make an impact." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Nav */}
      <V2Nav
        username={username}
        onUsernameChange={setRawUsername}
        showUpload={scrollToUpload}
      />

      {/* Ticker */}
      <V2Ticker />

      {/* Main page */}
      <div className="v2-page-wrap">

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section className="v2-hero">
          {/* Background illustration */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "url('/hero-landscape.png')",
            backgroundSize: "cover", backgroundPosition: "center bottom",
            opacity: 0.25,
          }} />

          {/* Left — headline + CTAs */}
          <div className="v2-hero-left" style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
              textTransform: "uppercase", color: V2.grassGreen, marginBottom: 12,
              display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: V2.grassGreen, display: "inline-block" }} />
              Verified Outdoors
            </div>

            <h1 style={{ fontFamily: V2.fontSans, fontWeight: 800,
              fontSize: "clamp(32px,5vw,60px)", lineHeight: 1.1,
              color: V2.forestGreen, marginBottom: 16 }}>
              Go outside.<br />
              <span style={{ color: V2.grassGreen }}>Prove it.</span><br />
              Build your streak.
            </h1>

            <p style={{ fontSize: "clamp(14px,1.5vw,16px)", color: V2.textMuted,
              lineHeight: 1.6, marginBottom: 28, maxWidth: 420 }}>
              Log your time outside, grow your streak, earn rewards, and make an impact.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={scrollToUpload}
                style={{ ...V2Styles.btnPrimary, fontSize: 15, padding: "14px 28px" }}>
                🌿 Log Your Proof
              </button>
              <Link href="/leaderboard"
                style={{ ...V2Styles.btnSecondary, fontSize: 15, padding: "13px 28px", textDecoration: "none" }}>
                👑 View Leaderboard
              </Link>
            </div>
          </div>

          {/* Right — stat cards */}
          <div className="v2-hero-right" style={{ position: "relative", zIndex: 1 }}>
            <div className="v2-stat-grid">
              <StatCard
                icon="🔥"
                value={resolvedStreak ?? (topStreaker?.streak ?? "—")}
                label="Day Streak"
                sub={tier.name}
                accent={tier.color}
                loading={loadingUser}
              />
              <StatCard
                icon="🌿"
                value={totalProofs != null ? totalProofs.toLocaleString() : "—"}
                label="Proofs Logged"
                sub={dailyCount != null ? `+${dailyCount} today` : null}
                loading={false}
              />
              <StatCard
                icon="⚡"
                value={userStats?.posts != null ? userStats.posts.toLocaleString() : (leaders[0]?.streak ?? "—")}
                label="Grass Score"
                loading={loadingUser}
              />
              <StatCard
                icon="🏆"
                value={userStats?.rank != null ? `#${userStats.rank}` : "#1"}
                label="Global Rank"
                sub={userStats?.rank != null && userStats.rank <= 100 ? "Top 1%" : null}
                loading={loadingUser}
              />
            </div>
          </div>
        </section>

        {/* ── FEATURE MODULES ─────────────────────────────────────────────── */}
        <div className="v2-feature-grid">
          <FeatureCard
            icon="/icons/harvest.png"
            title="Harvest"
            desc="Lock your tokens, grow your rewards, and harvest your impact."
            cta="View Harvest"
            href="https://harvest.touchgrass.today"
          />
          <FeatureCard
            icon="/icons/grass-draw.png"
            title="Grass Draw"
            desc="Earn Grass Draw entries through actions. Win epic monthly rewards."
            cta="View Draw"
            href="/grass-draw"
          />
          <FeatureCard
            icon="/icons/shields.png"
            title="Shields"
            desc="Protect your streak with Shields. Stay locked in even when life happens."
            cta="Manage Shields"
            href="/marketplace"
          />
          <FeatureCard
            icon="/icons/challenges.png"
            title="Challenges"
            desc="Take on challenges. Compete. Win. Earn more Grass Draw entries."
            cta="View Challenges"
            href="/challenges"
          />
        </div>

        {/* ── TOKEN STRIP ──────────────────────────────────────────────────── */}
        <TokenStrip />

        {/* ── PENDING CHALLENGES ───────────────────────────────────────────── */}
        {pendingChallenges.length > 0 && (
          <div style={{ padding: "16px clamp(14px,4vw,40px)" }}>
            {pendingChallenges.map(ch => (
              <div key={ch.id} style={{
                ...V2Styles.glassCard,
                padding: "16px 20px", marginBottom: 10,
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                borderColor: V2.borderGold,
                background: "rgba(255,243,216,0.8)",
              }}>
                <span style={{ fontSize: 24 }}>⚡</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: V2.forestGreen }}>
                    @{ch.challenger} challenged you to a {ch.duration_days}-day streak!
                  </div>
                  {ch.message && <div style={{ fontSize: 12, color: V2.textMuted }}>{ch.message}</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={challengeActioning === ch.id}
                    onClick={() => handleChallengeAction(ch, "accept")}
                    style={{ ...V2Styles.btnPrimary, padding: "8px 16px", fontSize: 12 }}>
                    Accept
                  </button>
                  <button disabled={challengeActioning === ch.id}
                    onClick={() => handleChallengeAction(ch, "decline")}
                    style={{ ...V2Styles.btnSecondary, padding: "8px 16px", fontSize: 12 }}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REWARDS BANNER ───────────────────────────────────────────────── */}
        <div style={{ padding: "8px clamp(14px,4vw,40px)" }}>
          <RewardsBanner username={username} />
        </div>

        {/* ── MAIN 3-COLUMN GRID ───────────────────────────────────────────── */}
        <div className="v2-bottom-grid" ref={uploadSectionRef} id="upload">

          {/* Column 1 — Profile preview / Leaderboard */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hasUser && resolvedStreak != null ? (
              <div style={{ ...V2Styles.glassCard, padding: "20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: V2.grassGreen, marginBottom: 12 }}>Profile</div>
                <Link href={`/u/${username}`} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%",
                      background: V2.gradientGrassBtn, display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 22 }}>🌿</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: V2.forestGreen }}>@{username}</div>
                      <div style={{ fontSize: 12, color: tier.color }}>{tier.emoji} {tier.name}</div>
                    </div>
                  </div>
                </Link>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {[
                    { icon: "🔥", val: resolvedStreak, label: "Streak" },
                    { icon: "🏆", val: userStats?.bestStreak ?? "—", label: "Best" },
                    { icon: "🌿", val: userStats?.posts ?? "—", label: "Proofs" },
                    { icon: "🛡️", val: userStats?.shields ?? 0, label: "Shields" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", padding: "10px 6px",
                      background: "rgba(125,200,50,0.06)", borderRadius: 10 }}>
                      <div style={{ fontSize: 18 }}>{s.icon}</div>
                      <div style={{ fontFamily: V2.fontSerif, fontSize: 20, fontWeight: 700, color: V2.forestGreen }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: V2.midGray, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/u/${username}`} style={{ ...V2Styles.btnSecondary, flex: 1, justifyContent: "center", fontSize: 12, textDecoration: "none" }}>
                    Profile
                  </Link>
                  <Link href={`/flex/${username}`} style={{ ...V2Styles.btnSecondary, flex: 1, justifyContent: "center", fontSize: 12, textDecoration: "none" }}>
                    Flex Card
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ ...V2Styles.glassCard, padding: "20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: V2.grassGreen, marginBottom: 12 }}>Leaderboard</div>
                {leaders.slice(0,5).map((l,i) => <LBRow key={i} rank={i+1} {...l} />)}
                <Link href="/leaderboard" style={{ display: "block", textAlign: "center",
                  marginTop: 12, fontSize: 12, color: V2.grassGreen, textDecoration: "none" }}>
                  View Full Leaderboard →
                </Link>
              </div>
            )}
          </div>

          {/* Column 2 — Log Your Proof */}
          <LogProofSection
            username={username}
            hasUser={hasUser}
            imageSrc={imageSrc}
            proofFile={proofFile}
            showResult={showResult}
            hasPostedToday={hasPostedToday}
            onUpload={handleImageUpload}
            streakStatus={streakStatus}
            streakTone={streakTone}
            resolvedStreak={resolvedStreak}
            loadingUser={loadingUser}
          />

          {/* Column 3 — Marketplace preview */}
          <MarketplacePreview />
        </div>

        {/* ── FEATURED POSTS ───────────────────────────────────────────────── */}
        <div style={{ background: "rgba(255,255,255,0.4)", borderTop: `1px solid ${V2.borderSoft}` }}>
          <FeaturedPostsSection />
        </div>

        {/* ── PROMO BANNER ─────────────────────────────────────────────────── */}
        <div style={{ padding: "24px clamp(14px,4vw,40px)" }}>
          <div style={{
            ...V2Styles.glassCard,
            padding: "28px 32px",
            display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
            background: "linear-gradient(135deg,rgba(125,200,50,0.12),rgba(232,160,32,0.08))",
          }}>
            <span style={{ fontSize: 48 }}>🌾</span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{ fontFamily: V2.fontSans, fontSize: 22, fontWeight: 800,
                color: V2.forestGreen, marginBottom: 6 }}>
                Harvest — Lock. Grow. Claim.
              </h3>
              <p style={{ fontSize: 13, color: V2.textMuted }}>
                Deposit $TOUCHGRASS for 6 months. On Harvest Day, claim your principal + rewards.
              </p>
            </div>
            <a href="https://harvest.touchgrass.today" target="_blank" rel="noopener noreferrer"
              style={{ ...V2Styles.btnPrimary, textDecoration: "none", flexShrink: 0 }}>
              Go to Harvest →
            </a>
          </div>
        </div>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer style={{
          background: V2.gradientForest,
          padding: "48px clamp(14px,5vw,64px)",
          display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: V2.fontSans, fontWeight: 800,
              fontSize: "clamp(24px,3vw,36px)", color: V2.white, lineHeight: 1.2, marginBottom: 8 }}>
              Go outside.<br />
              <span style={{ color: V2.grassLime }}>Prove it.</span><br />
              Make a difference.
            </div>
          </div>
          <div style={{ maxWidth: 320 }}>
            <p style={{ fontSize: 13, color: "rgba(240,239,234,0.6)", lineHeight: 1.6, marginBottom: 20 }}>
              Every proof plants impact. We fund youth athletics and environmental sustainability through your actions.
            </p>
            <button onClick={scrollToUpload}
              style={{ ...V2Styles.btnPrimary, fontSize: 14 }}>
              Start Your Streak 🌿
            </button>
          </div>
          <div style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 20, display: "flex", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 12, color: "rgba(240,239,234,0.4)" }}>
              © 2026 Proof of Grass. All rights reserved.
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {["Leaderboard","Marketplace","Field Guide","Map"].map(l => (
                <Link key={l} href={`/${l.toLowerCase().replace(" ","-")}`}
                  style={{ fontSize: 12, color: "rgba(240,239,234,0.4)", textDecoration: "none" }}>
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile bottom nav */}
      <V2BottomNav
        username={username}
        onLogProof={scrollToUpload}
        onMore={() => {}}
      />
    </>
  );
}