// pages/index.js — V2 Dashboard
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Head from "next/head";
import UploadBox from "../components/UploadBox";
import ResultCard from "../components/ResultCard";
import ShareCardSheet from "../components/ShareCardSheet";
import { renderStreakCard, streakCaption, isStreakMilestone, STREAK_MILESTONES } from "../utils/streakShareCard";
import Ico from "../components/Ico";
import TodaysProofsStrip from "../components/TodaysProofsStrip";
import NudgeBanner from "../components/NudgeBanner";
import MyReactions from "../components/MyReactions";
import PushReminders from "../components/PushReminders";
import V2Nav from "../components/V2Nav";
import FrightBitsHeroBanner from "../components/frightbits/FrightBitsHeroBanner";
import V2BottomNav from "../components/V2BottomNav";
import V2Ticker from "../components/V2Ticker";
import { supabase } from "../utils/supabase";
import { yardError } from "../utils/yardErrors";
import SecureUsernameCard from "../components/SecureUsernameCard";
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
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6,
    }}>
      <div style={{ fontSize: 28, height: 34 }}><Ico n={icon} size={32} /></div>
      {loading
        ? <div style={{ width: "60%" }}><Skel h={32} r={6} /></div>
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
        padding: "2px 10px", display: "inline-block", alignSelf: "center",
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

function UsernameStep({ onPick }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    const u = normalizeUsername(val).replace(/[^a-z0-9_.-]/g, "");
    if (u.length < 2) { setErr("Pick a username with at least 2 letters or numbers."); return; }
    setErr(""); onPick(u);
  };
  return (
    <div style={{ marginBottom: 16, padding: "18px 16px", borderRadius: 16, background: "rgba(125,200,50,0.07)", border: "1.5px solid rgba(91,166,34,0.35)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: V2.grassGreen, marginBottom: 6 }}>Step 1</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: V2.forestGreen }}>Pick your username</div>
        </div>
        <img src="/mascot/wago-wave.webp" alt="" width={84} height={84} style={{ width: 84, height: 84, objectFit: "contain", flexShrink: 0 }} />
      </div>
      <div style={{ fontSize: 12.5, color: V2.textMuted, lineHeight: 1.45, marginBottom: 12 }}>This is the name on your streak and the leaderboard. You can use your X handle.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={val} onChange={e => { setVal(e.target.value.replace(/@/g, "").toLowerCase()); setErr(""); }}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          placeholder="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Username"
          style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 14, border: "1.5px solid rgba(200,220,190,0.9)", fontSize: 16, fontFamily: "inherit", color: V2.forestGreen, background: "white", outline: "none" }} />
        <button onClick={submit} style={{ ...V2Styles.btnPrimary, padding: "12px 18px", fontSize: 14, whiteSpace: "nowrap" }}>Continue</button>
      </div>
      {err && <div role="alert" style={{ marginTop: 8, fontSize: 12.5, color: "#b45309", fontWeight: 700 }}>{err}</div>}
    </div>
  );
}

function LockedInToday({ username, streak }) {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const n = Number(streak) || 1;
  const next = STREAK_MILESTONES.find(m => m > n);
  const link = `proofofgrass.app/?ref=${username}`;
  const copy = () => {
    try { navigator.clipboard.writeText(`https://${link}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); } catch {}
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <img src="/mascot/wago-sleep.webp" alt="" width={120} height={114}
        style={{ width: 120, height: "auto", display: "block", margin: "0 auto 4px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 18,
        background: "linear-gradient(160deg,#f2fbe8,#e3f4d2)", border: "1.5px solid rgba(91,166,34,.4)" }}>
        <div style={{ width: 76, height: 76, borderRadius: 22, flexShrink: 0, color: "#fff",
          background: "linear-gradient(160deg,#9be05a,#4e9a1c)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: V2.fontSans, fontSize: 11, fontWeight: 700, letterSpacing: ".1em" }}>DAY</div>
          <div style={{ fontFamily: V2.fontSans, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{n}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: V2.grassGreen }}>✓ Locked in today</div>
          <div style={{ fontFamily: V2.fontSans, fontSize: 19, fontWeight: 800, color: V2.forestGreen, marginTop: 3 }}>See you tomorrow</div>
          {next && <div style={{ fontSize: 12.5, fontWeight: 700, color: V2.textMuted, marginTop: 2 }}>{next - n} {next - n === 1 ? "day" : "days"} to the Day {next} milestone</div>}
        </div>
      </div>

      <button onClick={() => setSharing(true)}
        style={{ ...V2Styles.btnPrimary, width: "100%", justifyContent: "center", marginTop: 12, fontSize: 15, padding: "14px 20px" }}>
        Share your streak
      </button>
      {sharing && (
        <ShareCardSheet title="Share your streak" caption={streakCaption(username, n)}
          filename={`streak-${n}-${username}.png`}
          render={() => renderStreakCard({ username, streak: n })} onClose={() => setSharing(false)} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, padding: "12px 14px", borderRadius: 16,
        border: "1px solid rgba(200,220,190,.8)", background: "white" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: V2.grassGreen }}>Bring a friend</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: V2.textMuted, marginTop: 2, lineHeight: 1.35 }}>Your link counts when they reach Day 10.</div>
        </div>
        <button onClick={copy} style={{ ...V2Styles.btnSecondary, padding: "8px 14px", fontSize: 12.5, whiteSpace: "nowrap" }}>{copied ? "Copied ✓" : "Copy link"}</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Link href="/groves" style={{ ...V2Styles.btnSecondary, flex: 1, justifyContent: "center", fontSize: 12.5, padding: "10px 8px", textDecoration: "none" }}>Check your Grove</Link>
        <Link href="/grass-draw" style={{ ...V2Styles.btnSecondary, flex: 1, justifyContent: "center", fontSize: 12.5, padding: "10px 8px", textDecoration: "none" }}>Grass Draw</Link>
      </div>
    </div>
  );
}

// ─── Next steps checklist ─────────────────────────────────────────────────────
function NextSteps({ side = false, className }) {
  const steps = [
    { icon: "camera", text: "Add a photo from outside" },
    { icon: "lock", text: "Lock in your streak" },
    { icon: "share", text: "Share it on X" },
  ];
  return (
    <div className={className} style={side ? { ...V2Styles.glassCard, padding: "20px" } : { marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: V2.midGray, marginBottom: 10 }}>
        Next Steps
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "8px 0", borderBottom: i < steps.length - 1 ? `1px solid ${V2.borderSoft}` : "none" }}>
          <span style={{ width: 28, flexShrink: 0 }}><Ico n={s.icon} size={26} /></span>
          <span style={{ fontSize: 13, color: V2.textBody }}>{s.text}</span>
        </div>
      ))}
    </div>
  );
}

function LogProofSection({ username, hasUser, imageSrc, proofFile, showResult, hasPostedToday,
  onUpload, onRetake, onPickUsername, streakStatus, streakTone, resolvedStreak, loadingUser }) {
  const [sharingMilestone, setSharingMilestone] = useState(false);
  // Already posted today and not in the middle of a fresh upload: show the locked-in recap instead of another upload box.
  const lockedIn = hasUser && hasPostedToday === true && !showResult;

  const toneColor = {
    success: V2.success, warning: V2.warning, reset: V2.danger, neutral: V2.midGray,
  }[streakTone] || V2.midGray;

  return (
    <div style={{ ...V2Styles.glassCard, padding: "28px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ marginBottom: 8 }}><Ico n="sprout" size={40} /></div>
        <h2 style={{ fontFamily: V2.fontSans, fontSize: 22, fontWeight: 800,
          color: V2.forestGreen, marginBottom: 8 }}>{lockedIn ? "You're locked in" : "Let's get outside"}</h2>
        <p style={{ fontSize: 13, color: V2.textMuted }}>{lockedIn ? "Nice work. Today's proof is in." : hasUser ? "Add your outdoor photo to log today's proof." : "Two quick steps: pick a username, then add a photo from outside."}</p>
      </div>

      {/* Streak status */}
      {hasUser && streakStatus && !lockedIn && (
        <div style={{
          padding: "10px 16px", borderRadius: 20, marginBottom: 20,
          background: streakTone === "success" ? "rgba(125,200,50,0.1)" : "rgba(232,160,32,0.1)",
          border: `1px solid ${toneColor}40`,
          textAlign: "center", fontSize: 13, fontWeight: 600, color: toneColor,
        }}>
          {streakTone === "success" ? "✓" : <Ico inline n="bolt" size={18} />}{streakStatus}
        </div>
      )}

      {/* Step 1 for brand-new visitors: choose a username right here, so nothing is lost at lock-in */}
      {!hasUser && !showResult && <UsernameStep onPick={onPickUsername} />}

      {/* Upload area */}
      {lockedIn && <LockedInToday username={username} streak={resolvedStreak} />}
      {hasUser && !lockedIn && !showResult && (
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
          {isStreakMilestone(resolvedStreak) && (
            <button onClick={() => setSharingMilestone(true)}
              style={{ width: "100%", marginBottom: 12, border: "none", cursor: "pointer", borderRadius: 18, padding: "14px 16px", textAlign: "left",
                background: "linear-gradient(135deg,#f9d06b,#f6b93b)", color: "#0d2a05", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(246,185,59,.35)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}><Ico n="flame" size={20} /> {resolvedStreak}-day streak milestone!</div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: .85, marginTop: 2 }}>Tap to share your milestone card →</div>
            </button>
          )}
          {sharingMilestone && (
            <ShareCardSheet title="Share your milestone" caption={streakCaption(username, resolvedStreak)}
              filename={`streak-${resolvedStreak}-${username}.png`}
              render={() => renderStreakCard({ username, streak: resolvedStreak })} onClose={() => setSharingMilestone(false)} />
          )}
          <ResultCard
            imageSrc={imageSrc}
            proofFile={proofFile}
            username={username}
            // resolvedStreak is already the streak AFTER today's post (see computePreviewStreak);
            // adding 1 here double-counted and made the card disagree with the platform.
            initialStreak={resolvedStreak ?? 1}
            onRetake={onRetake}
          />
        </div>
      )}

      {/* Next steps (desktop shows these under the profile card instead, to avoid an empty gap there) */}
      {!showResult && !lockedIn && <NextSteps className="v2-nextsteps-inline" />}
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
  const [lbMode,               setLbMode]               = useState("grass_score");
  const [leaderboards,         setLeaderboards]         = useState({});
  const [lbLoading,            setLbLoading]            = useState(false);
  const [mounted,              setMounted]              = useState(false);
  const [pendingChallenges,    setPendingChallenges]    = useState([]);
  const [challengeActioning,   setChallengeActioning]   = useState(null);
  const [challengeError,      setChallengeError]      = useState("");
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

        const [{ data: streakRowExact }, { count: postCount }, { data: profileData }] = await Promise.all([
          supabase.from("Streaks").select("current_streak,best_streak,last_submission_date,shield_count")
            .eq("username", username).maybeSingle(),
          supabase.from("Submissions").select("id",{count:"exact",head:true}).eq("username",username),
          supabase.from("Profiles").select("grass_score").ilike("username", username).maybeSingle(),
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
        else if (missedOne && shieldCount > 0) setStreakStatus(`You missed a day — post today and a shield keeps your Day ${actual} streak`), setStreakTone("warning");
        else                      setStreakStatus("Streak lost — start again today"),      setStreakTone("reset");

        setShieldEligible(missedOne && shieldCount > 0);
        setMissedOneDayNoShield(missedOne && shieldCount === 0);
        setHasPostedToday(postedToday);
        setCurrentStreak(actual);
        setDisplayStreak(displayVal);
        setUserStats({
          posts: postCount ?? 0,
          grass_score: profileData?.grass_score ?? 0,
          bestStreak: streakRow?.best_streak ?? actual,
          rank: rankCount + 1,
          shields: shieldCount,
          sunsetPasses: sunsetPassCount,
        });

        // Sunset Pass (23:00–02:00 UTC): when a pass can save the streak, say so instead of
        // showing "shield available" / "streak lost".
        try {
          const sr = await fetch(`/api/sunset/status?username=${encodeURIComponent(username)}`);
          if (sr.ok) {
            const sd = await sr.json();
            if (sd.window && sd.needed) {
              if (sd.activated) {
                setStreakStatus(sd.window === "apply"
                  ? `Sunset Pass active — post now to count it for yesterday`
                  : "Sunset Pass active — you have until 2:00 AM UTC");
                setStreakTone("warning");
                setShieldEligible(false); setMissedOneDayNoShield(false);
              } else if (sd.window === "apply" && sd.passes > 0) {
                setStreakStatus("Missed yesterday? Make your proof, then use a Sunset Pass to save your streak");
                setStreakTone("warning");
              }
            }
          }
        } catch {}

        supabase.from("Challenges").select("id,slug,challenger,challenged,duration_days,message,created_at")
          .eq("challenged",username).eq("status","pending").gte("created_at",new Date(Date.now()-7*864e5).toISOString()).order("created_at",{ascending:false})
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

  // Mini leaderboard: switch between Grass Score, Streak and Referrals. Each board loads on first view.
  const fetchLeaderboard = useCallback(async (mode) => {
    setLbLoading(true);
    try {
      let rows = [];
      if (mode === "streak") {
        const { data } = await supabase.from("Streaks").select("username,current_streak")
          .order("current_streak",{ascending:false}).limit(5);
        rows = (data||[]).map(r => ({ username: normalizeUsername(r.username), value: r.current_streak ?? 0, suffix: "d" }));
      } else if (mode === "referrals") {
        const { data } = await supabase.from("Profiles").select("username,referral_count_successful")
          .gt("referral_count_successful",0)
          .order("referral_count_successful",{ascending:false}).limit(5);
        rows = (data||[]).map(r => ({ username: normalizeUsername(r.username), value: r.referral_count_successful ?? 0, suffix: "" }));
      } else {
        const { data } = await supabase.from("Profiles").select("username,grass_score")
          .order("grass_score",{ascending:false,nullsFirst:false}).limit(5);
        rows = (data||[]).map(r => ({ username: normalizeUsername(r.username), value: r.grass_score ?? 0, suffix: "" }));
      }
      setLeaderboards(prev => ({ ...prev, [mode]: rows }));
    } catch(e) { console.warn("[leaderboard] load failed:", e?.message); }
    setLbLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (!leaderboards[lbMode]) fetchLeaderboard(lbMode); }, [lbMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Challenge actions
  const handleChallengeAction = useCallback(async (challenge, action) => {
    setChallengeActioning(challenge.id);
    try {
      const r = await fetch("/api/yard/challenge/respond", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ username, slug: challenge.slug, action }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) { setChallengeError(yardError(d)); setChallengeActioning(null); return; }
      setChallengeError("");
      setPendingChallenges(prev => prev.filter(c => c.id !== challenge.id));
    } catch(e) { console.error("challenge action failed",e); }
    setChallengeActioning(null);
  }, [username]);

  const handlePickUsername = useCallback((u) => {
    try { localStorage.setItem("pog_username", u); } catch {}
    setRawUsername(u);
  }, []);

  // Image upload
  const handleImageUpload = useCallback(async (file) => {
    if (!file || !(file instanceof Blob)) return;
    // Copy the photo's bytes into memory right away. On Android a file picked from the gallery/camera can become unreadable
    // later (app switched, cloud copy, file moved), and every upload path then fails with "Failed to fetch".
    try {
      const buf = await file.arrayBuffer();
      file = new File([buf], file.name || "proof.jpg", { type: file.type || "image/jpeg", lastModified: file.lastModified || Date.now() });
    } catch (e) {
      console.warn("[proof photo] could not read the picked file", e);
      alert("We couldn't read that photo. Please pick it again (or take a new one).");
      return;
    }
    setProofFile(file);
    setImageSrc(URL.createObjectURL(file));
    setShowResult(false);
    setTimeout(() => setShowResult(true), 80);
    // The photo is uploaded when the streak is locked in (ResultCard), through a server-issued upload link.
  }, [username, hasUser]);

  const handleRetake = useCallback(() => {
    setShowResult(false); setImageSrc(null); setProofFile(null);
  }, []);

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
    .v2-more-row { display: grid; grid-template-columns: repeat(6,1fr); gap: 10px; padding: 8px clamp(14px,4vw,40px) 20px; }
    .v2-feature-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; padding: 24px clamp(14px,4vw,40px); }
    .v2-bottom-grid > :nth-child(2) { order: -1; }
    .v2-bottom-grid.has-profile .v2-nextsteps-inline { display: none; }
    @media (max-width: 768px) { .v2-bottom-grid.has-profile .v2-nextsteps-inline { display: block; } .v2-nextsteps-side { display: none; } }
    .v2-bottom-grid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 16px; padding: 24px clamp(14px,4vw,40px); align-items: start; }
    @media (max-width: 1024px) {
      .v2-feature-grid { grid-template-columns: repeat(2,1fr); }
      .v2-more-row { grid-template-columns: repeat(3,1fr); }
      .v2-bottom-grid { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
    }
    @media (max-width: 768px) {
      .v2-hero { flex-direction: column; min-height: auto; padding: 32px 16px; gap: 32px; }
      .v2-hero-right { width: 100%; }
      .v2-visitor-stats { display: none; }
      .v2-feature-grid { grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px; }
      .v2-more-row { grid-template-columns: 1fr 1fr; padding: 8px 16px 16px; }
      .v2-bottom-grid { grid-template-columns: minmax(0,1fr); padding: 16px; }
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

      {/* WAGO: Fright Bits event banner (only while live) */}
      <FrightBitsHeroBanner />

      {/* Main page */}
      <div className="v2-page-wrap">

        {username && (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 0" }}>
            <SecureUsernameCard username={username} />
          </div>
        )}

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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Ico n="camera" size={22} />{hasUser ? "Log Your Proof" : "Log Your First Proof"}</span>
              </button>
              <Link href="/leaderboard"
                style={{ ...V2Styles.btnSecondary, fontSize: 15, padding: "13px 28px", textDecoration: "none" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Ico n="trophy" size={22} />View Leaderboard</span>
              </Link>
            </div>
          </div>

          {/* Right — stat cards */}
          <div className={"v2-hero-right" + (hasUser ? "" : " v2-visitor-stats")} style={{ position: "relative", zIndex: 1 }}>
            <div className="v2-stat-grid">
              <StatCard
                icon="flame"
                value={resolvedStreak ?? (topStreaker?.streak ?? "—")}
                label={hasUser ? "Day Streak" : "Top Streak"}
                sub={hasUser ? tier.name : "Best on the platform"}
                accent={tier.color}
                loading={loadingUser}
              />
              <StatCard
                icon="sprout"
                value={totalProofs != null ? totalProofs.toLocaleString() : "—"}
                label="Proofs Logged"
                sub={dailyCount != null ? `+${dailyCount} today` : null}
                loading={false}
              />
              <StatCard
                icon="bolt"
                value={userStats?.grass_score != null ? userStats.grass_score.toLocaleString() : "—"}
                label="Grass Score"
                sub={!hasUser ? "Starts with your first proof" : null}
                loading={loadingUser}
              />
              <StatCard
                icon="trophy"
                value={userStats?.rank != null ? `#${userStats.rank}` : (hasUser ? "#1" : "—")}
                label="Global Rank"
                sub={userStats?.rank != null && userStats.rank <= 100 ? "Top 1%" : null}
                loading={loadingUser}
              />
            </div>
          </div>
        </section>

        {/* ── PENDING CHALLENGES ───────────────────────────────────────────── */}
        {pendingChallenges.length > 0 && (
          <div style={{ padding: "16px clamp(14px,4vw,40px)" }}>
            {challengeError && <div role="alert" style={{ fontSize: 12, color: V2.danger, marginBottom: 10 }}>{challengeError}</div>}
            {pendingChallenges.map(ch => (
              <div key={ch.id} style={{
                ...V2Styles.glassCard,
                padding: "16px 20px", marginBottom: 10,
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                borderColor: V2.borderGold,
                background: "rgba(255,243,216,0.8)",
              }}>
                <span style={{ fontSize: 24 }}><Ico n="⚡" size={22} /></span>
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
          
        </div>

        {/* ── MAIN 3-COLUMN GRID ───────────────────────────────────────────── */}
        <div className={"v2-bottom-grid" + (hasUser && resolvedStreak != null ? " has-profile" : "")} ref={uploadSectionRef} id="upload">

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
                      alignItems: "center", justifyContent: "center", fontSize: 22 }}><Ico n="🌿" size={22} /></div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: V2.forestGreen }}>@{username}</div>
                      <div style={{ fontSize: 12, color: tier.color }}><Ico inline n={tier.emoji} size={18} />{tier.name}</div>
                    </div>
                  </div>
                </Link>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {[
                    { icon: "flame", val: resolvedStreak, label: "Streak" },
                    { icon: "trophy", val: userStats?.bestStreak ?? "—", label: "Best" },
                    { icon: "sprout", val: userStats?.posts ?? "—", label: "Proofs" },
                    { icon: "shield", val: userStats?.shields ?? 0, label: "Shields" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", padding: "10px 6px",
                      background: "rgba(125,200,50,0.06)", borderRadius: 10 }}>
                      <div style={{ height: 28 }}><Ico n={s.icon} size={26} /></div>
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
                  textTransform: "uppercase", color: V2.grassGreen, marginBottom: 10 }}>Leaderboard</div>
                <div role="tablist" style={{ display:"flex", gap:4, padding:3, borderRadius:10, marginBottom:8,
                  background:"rgba(200,220,190,0.3)" }}>
                  {[["grass_score","Grass Score"],["streak","Streak"],["referrals","Referrals"]].map(([k,label]) => (
                    <button key={k} role="tab" aria-selected={lbMode===k} onClick={()=>setLbMode(k)}
                      style={{ flex:1, padding:"7px 4px", borderRadius:8, border:"none", cursor:"pointer",
                        fontSize:11, fontWeight:700, fontFamily:"inherit", whiteSpace:"nowrap",
                        background:lbMode===k?"white":"transparent",
                        color:lbMode===k?"#1a4a0a":"#6b7d60",
                        boxShadow:lbMode===k?"0 1px 4px rgba(26,74,10,0.12)":"none" }}>{label}</button>
                  ))}
                </div>
                {(() => {
                  const rows = leaderboards[lbMode];
                  if (!rows) return <div style={{ padding:"18px 0", textAlign:"center", fontSize:12, color:"#6b7d60" }}>{lbLoading?"Loading…":"—"}</div>;
                  if (!rows.length) return <div style={{ padding:"18px 0", textAlign:"center", fontSize:12, color:"#6b7d60" }}>No {lbMode==="referrals"?"referrals yet — invite a friend!":"entries yet"}</div>;
                  return rows.map((l,i) => (
                    <div key={l.username+i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0",
                      borderBottom:i<rows.length-1?"1px solid rgba(200,220,190,0.4)":"none" }}>
                      <div style={{ width:28, textAlign:"center", fontWeight:700, color:"#6b7d60", fontSize:14 }}>
                        {i<3?<Ico n={["🥇","🥈","🥉"][i]} size={26} />:i+1}
                      </div>
                      <Link href={"/u/"+l.username} style={{ flex:1, fontSize:13, fontWeight:600, color:"#1a4a0a", textDecoration:"none" }}>{"@"+l.username}</Link>
                      <div style={{ fontSize:13, fontWeight:700, color:"#5ba622" }}>{l.value.toLocaleString()}{l.suffix}</div>
                    </div>
                  ));
                })()}
                <Link href="/leaderboard" style={{ display: "block", textAlign: "center",
                  marginTop: 12, fontSize: 12, color: V2.grassGreen, textDecoration: "none" }}>
                  View Full Leaderboard →
                </Link>
              </div>
            )}
            {hasUser && resolvedStreak != null && !showResult && !(hasPostedToday === true) && (
              <NextSteps side className="v2-nextsteps-side" />
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
            onRetake={handleRetake}
            onPickUsername={handlePickUsername}
            streakStatus={streakStatus}
            streakTone={streakTone}
            resolvedStreak={resolvedStreak}
            loadingUser={loadingUser}
          />

        </div>

        <NudgeBanner username={username} hasPostedToday={hasPostedToday} />
        <MyReactions username={username} />
        <PushReminders username={username} />
        <TodaysProofsStrip />

        {/* ── FEATURE MODULES ─────────────────────────────────────────────── */}
        <div style={{ padding: "28px clamp(14px,4vw,40px) 4px", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/mascot/wago-point.webp" alt="" width={72} height={72} style={{ width: 72, height: 72, objectFit: "contain", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: V2.grassGreen }}>Explore</div>
            <div style={{ fontSize: 13, color: V2.textMuted, marginTop: 2 }}>More to do once your streak is going.</div>
          </div>
        </div>
        <div className="v2-more-row">
          {[
            ["ticket","Grass Draw","/grass-draw"],
            ["swords","The Yard","/yard"],
            ["group","Groves","/groves"],
            ["store","Marketplace","/marketplace"],
            ["wheat","Harvest","https://harvest.touchgrass.today"],
            ["logo","Touch Grass","https://touchgrass.today"],
          ].map(([ic,label,href]) => {
            const ext = href.startsWith("http");
            const st = { ...V2Styles.glassCard, display:"flex", alignItems:"center", justifyContent:"flex-start", gap:10, padding:"12px 16px", textDecoration:"none", color:V2.forestGreen, fontWeight:800, fontSize:14, minWidth:0 };
            return ext
              ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={st}><span style={{width:30,flexShrink:0,display:"flex",justifyContent:"center"}}>{ic==="logo"?<img src="/touchgrass-transparent.png" alt="" width={26} height={26} style={{width:26,height:26,objectFit:"contain",flexShrink:0}} />:<Ico n={ic} size={26} />}</span><span>{label}</span></a>
              : <Link key={label} href={href} style={st}><span style={{width:30,flexShrink:0,display:"flex",justifyContent:"center"}}>{ic==="logo"?<img src="/touchgrass-transparent.png" alt="" width={26} height={26} style={{width:26,height:26,objectFit:"contain",flexShrink:0}} />:<Ico n={ic} size={26} />}</span><span>{label}</span></Link>;
          })}
        </div>

        {/* ── TOKEN STRIP ──────────────────────────────────────────────────── */}
        <div style={{ padding: "0 clamp(14px,4vw,40px) 8px" }}>
          <Link href="/token" style={{ ...V2Styles.glassCard, display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", textDecoration: "none", color: V2.forestGreen }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>$TOUCHGRASS</span>
              <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: V2.textMuted }}>Price, contract address and how it's used</span>
            </span>
            <span aria-hidden="true" style={{ fontWeight: 800 }}>→</span>
          </Link>
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
              Start Your Streak
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