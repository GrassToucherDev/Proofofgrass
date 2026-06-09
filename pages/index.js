import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import UploadBox from "../components/UploadBox";
import ResultCard from "../components/ResultCard";
import { supabase } from "../utils/supabase";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      "#0e0f0b",
  bg2:     "#141510",
  bg3:     "#1c1e17",
  border:  "rgba(255,255,255,0.07)",
  borderG: "rgba(147,168,90,0.2)",
  olive:   "#93a85a",
  gold:    "#c8a84b",
  white:   "#f0efea",
  muted:   "rgba(240,239,234,0.50)",
  dim:     "rgba(240,239,234,0.24)",
  red:     "#ef4444",
};

// ─── Pure helpers (no Supabase) ───────────────────────────────────────────────
function normalizeUsername(val) {
  return String(val ?? "").replace(/@/g, "").toLowerCase().trim();
}

function computePreviewStreak(row) {
  if (!row?.last_submission_date) return 1;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const last = new Date(row.last_submission_date).toISOString().slice(0, 10);
  if (last === today)     return row.current_streak;
  if (last === yesterday) return row.current_streak + 1;
  return 1;
}

function getStreakTier(n) {
  if (n >= 1000) return "TRANSCENDENT";
  if (n >= 500)  return "ASCENDED";
  if (n >= 365)  return "ETERNAL";
  if (n >= 180)  return "MYTHIC";
  if (n >= 100)  return "IMMORTAL";
  if (n >= 50)   return "LEGENDARY";
  if (n >= 30)   return "ELITE";
  if (n >= 14)   return "LOCKED IN";
  if (n >= 7)    return "ROOTED";
  if (n >= 3)    return "GROWING";
  return "SEED";
}

function getTierColor(tier) {
  return {
    TRANSCENDENT:"#f0fdf4", ASCENDED:"#e0f2fe",
    ETERNAL:"#fff9c4", MYTHIC:"#fbbf24", IMMORTAL:"#f97316",
    LEGENDARY:T.gold, ELITE:"#c084fc", "LOCKED IN":"#4ade80",
    ROOTED:"#86efac", GROWING:"#6ee7b7", SEED:"#93a85a",
  }[tier] ?? T.olive;
}

function fmtBurned(n) {
  if (!n) return "—";
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n/1000).toFixed(0)}K`;
  return n.toLocaleString();
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────
function Skeleton({ w="100%", h=12 }) {
  return <div style={{ width:w, height:h, background:T.bg3, borderRadius:4, flexShrink:0, opacity:0.6 }} />;
}

function StatCard({ icon, value, label, sub, accent, last }) {
  return (
    <div style={{ flex:"1 1 0", minWidth:0, display:"flex", flexDirection:"column", alignItems:"center",
      padding:"24px 12px", gap:4, borderRight: last ? "none" : `1px solid ${T.border}` }}>
      <span style={{ fontSize:15, opacity:0.4, marginBottom:2 }}>{icon}</span>
      <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
        fontSize:"clamp(22px,3vw,36px)", fontWeight:700,
        color: accent ? T.gold : T.white, lineHeight:1, letterSpacing:"-0.02em" }}>
        {value ?? "—"}
      </span>
      {sub && <span style={{ fontSize:10, color:T.olive, fontWeight:600 }}>{sub}</span>}
      <span style={{ fontSize:9, color:T.dim, letterSpacing:"0.14em", textTransform:"uppercase", textAlign:"center", marginTop:2 }}>
        {label}
      </span>
    </div>
  );
}

function LBRow({ rank, username, streak, tier }) {
  const col = getTierColor(tier);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12,
      padding:"11px 0", borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:10, color:T.dim, width:16, textAlign:"right", flexShrink:0 }}>{rank}</span>
      <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
        background:`linear-gradient(135deg,${T.bg3},${T.olive}30)`,
        border:`1px solid ${T.border}`, display:"flex", alignItems:"center",
        justifyContent:"center", fontFamily:"'Cormorant Garamond',Georgia,serif",
        fontWeight:700, fontSize:13, color:T.muted }}>
        {username?.[0]?.toUpperCase() ?? "?"}
      </div>
      <span style={{ flex:1, fontSize:13, color:T.white, fontWeight:500,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        @{username}
      </span>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontSize:18, fontWeight:700, color:T.white,
          fontFamily:"'Cormorant Garamond',Georgia,serif", lineHeight:1 }}>{streak}d</div>
        <div style={{ fontSize:8, color:col, letterSpacing:"0.1em", textTransform:"uppercase" }}>{tier}</div>
      </div>
    </div>
  );
}

function ProofRow({ username, streak, created_at }) {
  const tier = getStreakTier(streak);
  const col  = getTierColor(tier);
  const when = created_at
    ? new Date(created_at).toLocaleDateString("en-US",{ month:"short", day:"numeric" })
    : "";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12,
      padding:"11px 0", borderBottom:`1px solid ${T.border}` }}>
      <div style={{ width:44, height:44, borderRadius:8, flexShrink:0,
        background:"linear-gradient(135deg,#2a3d1a,#3d6a28)",
        border:`1px solid ${T.border}`, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:20 }}>🌿</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.white, marginBottom:2,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>@{username}</div>
        <div style={{ fontSize:10, color:T.dim }}>{when}</div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontSize:8, color:T.dim, letterSpacing:"0.1em", textTransform:"uppercase" }}>DAY</div>
        <div style={{ fontSize:20, fontWeight:700, lineHeight:1,
          fontFamily:"'Cormorant Garamond',Georgia,serif",
          color: streak >= 50 ? T.gold : T.white }}>{streak}</div>
        <div style={{ fontSize:7, color:col, letterSpacing:"0.08em", textTransform:"uppercase" }}>{tier}</div>
      </div>
    </div>
  );
}

function TierBadge({ name, day, completed, active }) {
  const col = completed ? T.olive : active ? T.gold : "rgba(255,255,255,0.14)";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ width:52, height:52, borderRadius:"50%", border:`1.5px solid ${col}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: active ? `${T.gold}18` : completed ? `${T.olive}12` : "transparent",
        boxShadow: active ? `0 0 16px ${T.gold}25` : "none" }}>
        <span style={{ fontSize:20 }}>{completed ? "✦" : active ? "◎" : "○"}</span>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:9, fontWeight:700, color:col, letterSpacing:"0.1em", textTransform:"uppercase" }}>{name}</div>
        <div style={{ fontSize:9, color:T.dim }}>Day {day}</div>
      </div>
    </div>
  );
}

function ResultMini({ day }) {
  const isLeg = day >= 50;
  return (
    <div style={{ borderRadius:10, overflow:"hidden", aspectRatio:"16/9", position:"relative",
      background:"#0a1f0c", border:`1px solid ${T.borderG}`,
      boxShadow:"0 6px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ position:"absolute", inset:0,
        background:"linear-gradient(135deg,#2a3d1a,#3d5a2a,#1a2d12)",
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, opacity:0.35 }}>🌿</div>
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:"55%",
        background:"linear-gradient(90deg,transparent,rgba(8,10,6,0.97))" }} />
      <div style={{ position:"absolute", right:10, top:8, bottom:8, width:"44%",
        display:"flex", flexDirection:"column", justifyContent:"center" }}>
        <div style={{ fontSize:4.5, letterSpacing:"0.18em", color:"rgba(147,168,90,0.6)",
          textTransform:"uppercase", marginBottom:2 }}>✦ OFFICIAL CERTIFICATE ✦</div>
        <div style={{ fontSize:13, fontWeight:900, color:T.white,
          fontFamily:"'Cormorant Garamond',Georgia,serif", lineHeight:1 }}>VERIFIED</div>
        <div style={{ fontSize:8, fontWeight:700, color:T.olive, marginBottom:5 }}>GRASS TOUCHER</div>
        <div style={{ height:"0.5px",
          background:`linear-gradient(90deg,transparent,${T.olive}50,transparent)`, marginBottom:5 }} />
        <div style={{ fontSize:4, letterSpacing:"0.14em", color:"rgba(147,168,90,0.4)",
          textTransform:"uppercase", marginBottom:2 }}>CURRENT STREAK</div>
        <div style={{ fontSize:20, fontWeight:900, lineHeight:1,
          fontFamily:"'Cormorant Garamond',Georgia,serif",
          color: isLeg ? T.gold : T.white,
          textShadow: isLeg ? `0 0 12px ${T.gold}50` : "none" }}>DAY {day}</div>
        <div style={{ marginTop:"auto", fontSize:4, color:"rgba(255,255,255,0.18)",
          letterSpacing:"0.1em" }}>proofofgrass.vercel.app</div>
      </div>
    </div>
  );
}

// ─── Shield buy section ───────────────────────────────────────────────────────
const BURN_ADDR   = "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";
const SOL_DOMAIN  = "touchgrassburn.sol";

// ─── Following Feed component ────────────────────────────────────────────────

// ─── Activity Feed ───────────────────────────────────────────────────────────
function ActivityFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Fetch recent activity from multiple sources in parallel
        const [{ data: recentSubs }, { data: recentChals }, { data: topStreaks }, { data: recentReferrals }] = await Promise.all([
          supabase.from("Submissions")
            .select("username, created_at")
            .in("status", ["pending","approved"])
            .order("created_at", { ascending: false })
            .limit(8),
          supabase.from("Challenges")
            .select("challenger, challenged, duration_days, status, created_at, slug")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase.from("Streaks")
            .select("username, current_streak, best_streak")
            .order("current_streak", { ascending: false })
            .limit(5),
          supabase.from("Referrals")
            .select("referrer_username, referred_username, status, converted_at, created_at")
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

        const feed = [];

        // Proof submissions
        (recentSubs ?? []).forEach(s => {
          feed.push({
            type: "proof",
            username: s.username,
            text: "logged outdoor proof",
            emoji: "🌿",
            time: s.created_at,
          });
        });

        // Challenges issued
        (recentChals ?? []).forEach(c => {
          if (c.status === "pending" || c.status === "active") {
            feed.push({
              type: "challenge",
              username: c.challenger,
              text: `challenged @${c.challenged} to a ${c.duration_days}-day streak`,
              emoji: "⚡",
              time: c.created_at,
              link: `/challenge/${c.slug}`,
            });
          }
          if (c.status === "completed") {
            feed.push({
              type: "challenge_complete",
              username: c.challenger,
              text: `completed a ${c.duration_days}-day challenge with @${c.challenged}`,
              emoji: "🏆",
              time: c.created_at,
              link: `/challenge/${c.slug}`,
            });
          }
        });

        // Milestone events — users with notable streaks
        (topStreaks ?? []).forEach(s => {
          const milestones = [7,14,30,50,100,180,200,250,365,500,750,1000];
          const hit = milestones.find(m => s.current_streak === m);
          if (hit) {
            const tierName = hit>=1000?"TRANSCENDENT":hit>=500?"ASCENDED":hit>=365?"ETERNAL":hit>=180?"MYTHIC":hit>=100?"IMMORTAL":hit>=50?"LEGENDARY":hit>=30?"ELITE":hit>=14?"LOCKED IN":"ROOTED";
            feed.push({
              type: "milestone",
              username: s.username,
              text: `reached Day ${hit} — ${tierName} unlocked`,
              emoji: hit>=100?"👑":hit>=50?"🌟":hit>=30?"🌳":"🌱",
              time: null,
            });
          }
        });

        // Referral events
        (recentReferrals ?? []).forEach(r => {
          if (r.status === "converted") {
            feed.push({
              type: "referral_converted",
              username: r.referrer_username,
              text: `helped @${r.referred_username} reach Day 10`,
              emoji: "🤝",
              time: r.converted_at || r.created_at,
            });
          } else {
            feed.push({
              type: "referral_pending",
              username: r.referrer_username,
              text: `invited a new Toucher to the movement`,
              emoji: "🌱",
              time: r.created_at,
            });
          }
        });

        // Sort by time, milestones last
        feed.sort((a, b) => {
          if (!a.time && !b.time) return 0;
          if (!a.time) return 1;
          if (!b.time) return -1;
          return new Date(b.time) - new Date(a.time);
        });

        setItems(feed.slice(0, 10));
      } catch(e) {
        console.warn("activity feed error", e);
      }
      setLoading(false);
    })();
  }, []);

  const T2 = { olive:"#93a85a", gold:"#c8a84b", white:"#f0efea",
    dim:"rgba(240,239,234,0.22)", bg3:"#181a12", border:"rgba(255,255,255,0.06)" };

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ height:44, borderRadius:8, background:T2.bg3,
          animation:"shimmer 1.8s ease-in-out infinite" }} />
      ))}
    </div>
  );

  if (items.length === 0) return (
    <p style={{ fontSize:12, color:T2.dim, textAlign:"center", padding:"16px 0" }}>
      No recent activity yet.
    </p>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {items.map((item, i) => {
        const timeAgo = item.time ? (() => {
          const diff = Date.now() - new Date(item.time);
          const mins = Math.floor(diff/60000);
          const hrs  = Math.floor(diff/3600000);
          const days = Math.floor(diff/86400000);
          return days>0?`${days}d ago`:hrs>0?`${hrs}h ago`:mins>0?`${mins}m ago`:"just now";
        })() : "";

        const inner = (
          <div style={{ display:"flex", alignItems:"center", gap:10,
            padding:"10px 12px", background:T2.bg3, borderRadius:10,
            border:`1px solid ${T2.border}` }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{item.emoji}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ fontSize:12, fontWeight:600, color:T2.white }}>
                @{item.username}
              </span>
              <span style={{ fontSize:12, color:T2.dim }}> {item.text}</span>
            </div>
            {timeAgo && (
              <span style={{ fontSize:10, color:T2.dim, flexShrink:0 }}>{timeAgo}</span>
            )}
          </div>
        );

        return item.link
          ? <Link key={i} href={item.link} style={{ textDecoration:"none" }}>{inner}</Link>
          : <div key={i}>{inner}</div>;
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  // ── Username (restored from localStorage) ────────────────────────────────
  const [rawUsername, setRawUsername] = useState("");
  const username = normalizeUsername(rawUsername);
  const hasUser  = username.length > 0;

  // ── User streak state (mirrors old index.js exactly) ─────────────────────
  const [currentStreak,       setCurrentStreak]       = useState(1);
  const [displayStreak,       setDisplayStreak]        = useState(1);
  const [streakStatus,        setStreakStatus]         = useState("");
  const [streakTone,          setStreakTone]           = useState("neutral");
  const [shieldEligible,      setShieldEligible]       = useState(false);
  const [missedOneDayNoShield,setMissedOneDayNoShield] = useState(false);
  const [hasPostedToday,      setHasPostedToday]       = useState(null);
  const [userStats,           setUserStats]            = useState(null);
  const [latestPurchase,      setLatestPurchase]       = useState(null);
  const [loadingUser,         setLoadingUser]          = useState(false);

  // ── Shield purchase ───────────────────────────────────────────────────────
  const [purchaseTxSig,   setPurchaseTxSig]   = useState("");
  const [purchaseWallet,  setPurchaseWallet]  = useState("");
  const [purchaseStatus,  setPurchaseStatus]  = useState(null);
  const [purchaseError,   setPurchaseError]   = useState("");
  const [copiedDomain,    setCopiedDomain]    = useState(false);
  const [copiedAddr,      setCopiedAddr]      = useState(false);
  const [showPasteTip,    setShowPasteTip]    = useState(false);

  // ── Image / result card ───────────────────────────────────────────────────
  const [imageSrc,    setImageSrc]    = useState(null);
  const [showResult,  setShowResult]  = useState(false);

  // ── Community stats ───────────────────────────────────────────────────────
  const [dailyCount,  setDailyCount]  = useState(null);
  const [totalBurned, setTotalBurned] = useState(null);
  const [topStreaker,  setTopStreaker] = useState(null);
  const [totalProofs,  setTotalProofs] = useState(null);

  // ── Leaderboard + feed ────────────────────────────────────────────────────
  const [leaders,      setLeaders]      = useState([]);
  const [recentProofs, setRecentProofs] = useState([]);
  const [previewDays,  setPreviewDays]  = useState([67, 23, 11]);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const [mounted,        setMounted]        = useState(false);
  const [showShieldBuy,  setShowShieldBuy]  = useState(false);
  const uploadSectionRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("pog_username");
    if (saved) setRawUsername(normalizeUsername(saved));

    // Capture referral param from URL — store until first proof submitted
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.length > 0) {
      const normalized = ref.toLowerCase().replace(/@/g,"").trim();
      // Only store if not already set (first referrer wins)
      if (!localStorage.getItem("pog_referrer")) {
        localStorage.setItem("pog_referrer", normalized);
        console.log("[referral] captured ref:", normalized);
      }
    }
  }, []);

  // ── Persist username ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && username)
      localStorage.setItem("pog_username", username);
  }, [username]);

  // ── Debounced user data preload (identical logic to old index.js) ─────────
  useEffect(() => {
    if (!username) {
      setCurrentStreak(1); setDisplayStreak(1); setStreakStatus("");
      setStreakTone("neutral"); setShieldEligible(false);
      setMissedOneDayNoShield(false); setHasPostedToday(null);
      setUserStats(null); setLatestPurchase(null);
      setPurchaseStatus(null); setPurchaseError("");
      setLoadingUser(false);
      return;
    }
    setLoadingUser(true);
    const timer = setTimeout(async () => {
      const todayStr     = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const twoDaysAgo   = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      try {
        const [{ data: streakRow }, { count: postCount }] = await Promise.all([
          supabase.from("Streaks")
            .select("current_streak, best_streak, last_submission_date, shield_count")
            .eq("username", username).maybeSingle(),
          supabase.from("Submissions")
            .select("id", { count:"exact", head:true })
            .eq("username", username),
        ]);

        const userStreak  = streakRow?.current_streak ?? 1;
        // Fetch all ordered streaks and find position — avoids head:true filter bug
        const { data: allStreaksForRank } = await supabase
          .from("Streaks").select("username,current_streak")
          .order("current_streak", { ascending: false });
        const rankIdx = (allStreaksForRank ?? []).findIndex(
          r => r.username?.toLowerCase().trim() === username
        );
        const rankCount = rankIdx >= 0 ? rankIdx : (allStreaksForRank?.length ?? 1) - 1;

        const lastDate   = streakRow?.last_submission_date
          ? new Date(streakRow.last_submission_date).toISOString().slice(0, 10)
          : null;
        const shieldCount = streakRow?.shield_count ?? 0;
        const actual      = streakRow?.current_streak ?? 1;
        const projected   = actual + 1;
        const displayVal  = computePreviewStreak(streakRow);
        const missedOne   = lastDate === twoDaysAgo;

        if (!lastDate)                setStreakStatus("start your streak today"),    setStreakTone("neutral");
        else if (lastDate===todayStr) setStreakStatus("streak locked in for today"), setStreakTone("success");
        else if (lastDate===yesterdayStr) setStreakStatus(`submit today to reach day ${projected}`), setStreakTone("warning");
        else if (missedOne && shieldCount > 0) setStreakStatus(`day ${actual} — shield available`), setStreakTone("reset");
        else setStreakStatus("streak lost — start again today"), setStreakTone("reset");

        setShieldEligible(missedOne && shieldCount > 0);
        setMissedOneDayNoShield(missedOne && shieldCount === 0);
        setHasPostedToday(lastDate === todayStr);
        setCurrentStreak(actual);
        setDisplayStreak(displayVal);
        setUserStats({ posts: postCount ?? 0, bestStreak: streakRow?.best_streak ?? actual, rank: rankCount + 1, shields: shieldCount });

        supabase.from("ShieldPurchases")
          .select("tx_signature, status, created_at")
          .eq("username", username)
          .order("created_at", { ascending:false }).limit(1).maybeSingle()
          .then(({ data }) => setLatestPurchase(data ?? null));
      } catch (e) {
        console.error("preload failed", e);
        setStreakTone("neutral"); setStreakStatus("");
      } finally {
        setLoadingUser(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // ── Community stats ───────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const todayStart = new Date(); todayStart.setUTCHours(0,0,0,0);
    const [{ count:todayC }, { data:streakers }, { count:burnC }, { count:allC }] = await Promise.all([
      supabase.from("Submissions").select("id",{count:"exact",head:true}).in("status",["pending","approved"]).gte("created_at",todayStart.toISOString()),
      supabase.from("Streaks").select("username,current_streak").order("current_streak",{ascending:false}).limit(1),
      supabase.from("ShieldPurchases").select("id",{count:"exact",head:true}).eq("status","approved"),
      supabase.from("Submissions").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
    ]);
    setDailyCount(todayC ?? 0);
    setTotalBurned((burnC ?? 0) * 50000);
    setTotalProofs(allC ?? 0);
    if (streakers?.[0]) setTopStreaker({ username: normalizeUsername(streakers[0].username), streak: streakers[0].current_streak ?? 1 });
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase.from("Streaks").select("username,current_streak").order("current_streak",{ascending:false}).limit(8);
    if (data) {
      setLeaders(data.map(r => ({ username: normalizeUsername(r.username), streak: r.current_streak ?? 1, tier: getStreakTier(r.current_streak ?? 1) })));
      const days = data.slice(0,3).map(r => r.current_streak ?? 1);
      if (days.length) setPreviewDays(days);
    }
  }, []);

  const fetchRecentProofs = useCallback(async () => {
    const { data } = await supabase.from("Submissions").select("username,created_at").in("status",["pending","approved"]).order("created_at",{ascending:false}).limit(6);
    if (!data) return;
    const names = [...new Set(data.map(r => normalizeUsername(r.username)))];
    const { data: sRows } = await supabase.from("Streaks").select("username,current_streak").in("username",names);
    const sMap = {};
    (sRows ?? []).forEach(s => { sMap[normalizeUsername(s.username)] = s.current_streak ?? 1; });
    setRecentProofs(data.map(r => ({ username: normalizeUsername(r.username), streak: sMap[normalizeUsername(r.username)] ?? 1, created_at: r.created_at })));
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLeaderboard();
    fetchRecentProofs();
  }, []);

  // ── Shield buy handler ────────────────────────────────────────────────────
  const handleBuyShield = useCallback(async () => {
    if (!username) return;
    const tx = purchaseTxSig.trim();
    const wallet = purchaseWallet.trim();
    if (!tx || !wallet) { setPurchaseError("Enter your wallet and tx signature."); return; }
    setPurchaseStatus("loading"); setPurchaseError("");
    const { error } = await supabase.from("ShieldPurchases").insert([{ username, wallet_address: wallet, tx_signature: tx, token_amount: 50000, status: "pending" }]);
    if (error) {
      const msg = error.message ?? "";
      const isDupe = msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique");
      setPurchaseError(isDupe ? "This transaction has already been submitted." : (msg || "Submission failed — try again."));
      setPurchaseStatus("error");
      return;
    }
    setPurchaseStatus("success");
    setPurchaseTxSig(""); setPurchaseWallet("");
    supabase.from("ShieldPurchases").select("tx_signature,status,created_at").eq("username",username).order("created_at",{ascending:false}).limit(1).maybeSingle().then(({ data }) => setLatestPurchase(data ?? null));
  }, [username, purchaseTxSig, purchaseWallet]);

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = useCallback((file) => {
    if (!file || !(file instanceof Blob)) return;
    setImageSrc(URL.createObjectURL(file));
    setShowResult(false);
    setTimeout(() => setShowResult(true), 80);
  }, []);

  // ── Derived display values ────────────────────────────────────────────────
  const toneColor = { success:"#4ade80", warning:T.gold, reset:T.red, neutral:T.dim }[streakTone] || T.dim;
  const heroDay   = (hasUser && currentStreak > 0 ? currentStreak : null) ?? topStreaker?.streak ?? 67;
  const heroTier  = getStreakTier(heroDay);
  const heroColor = getTierColor(heroTier);
  const tier      = getStreakTier(currentStreak);
  const tierColor = getTierColor(tier);

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    input,textarea{font-family:'DM Sans',sans-serif;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    .fade-1{animation:fadeUp 0.6s 0.05s ease both;}
    .fade-2{animation:fadeUp 0.6s 0.16s ease both;}
    .fade-3{animation:fadeUp 0.6s 0.26s ease both;}
    .nav-link{color:${T.dim};font-size:13px;font-weight:500;text-decoration:none;letter-spacing:0.05em;transition:color 0.2s;}
    .nav-link:hover{color:${T.white};}
    .nav-link.active{color:${T.olive};}
    .btn-olive{display:inline-flex;align-items:center;gap:8px;background:${T.olive};color:${T.bg};border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:13px 22px;border-radius:8px;cursor:pointer;text-decoration:none;transition:all 0.2s;}
    .btn-olive:hover{background:#a8be6a;transform:translateY(-1px);}
    .btn-ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;color:${T.white};border:1px solid ${T.border};font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:13px 22px;border-radius:8px;cursor:pointer;text-decoration:none;transition:all 0.2s;}
    .btn-ghost:hover{border-color:${T.olive};color:${T.olive};}
    .card{background:${T.bg2};border:1px solid ${T.border};padding:26px;}
    .card-title{font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${T.muted};margin-bottom:18px;}
    .card-title-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
    .view-all{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${T.dim};text-decoration:none;font-weight:500;transition:color 0.2s;}
    .view-all:hover{color:${T.olive};}
    .username-input{background:${T.bg3};border:1px solid ${T.borderG};border-radius:8px;padding:9px 13px;color:${T.white};font-size:13px;outline:none;transition:border-color 0.2s;width:160px;}
    .username-input:focus{border-color:${T.olive};}
    .username-input::placeholder{color:${T.dim};}
    input[type=text].field,textarea.field{width:100%;background:${T.bg3};border:1px solid ${T.border};border-radius:8px;padding:10px 13px;color:${T.white};font-size:13px;outline:none;transition:border-color 0.2s;resize:none;}
    input[type=text].field:focus,textarea.field:focus{border-color:${T.olive}50;}
    input[type=text].field::placeholder,textarea.field::placeholder{color:${T.dim};}
    @media(max-width:960px){.main-grid{grid-template-columns:1fr !important;}.prog-grid{grid-template-columns:1fr !important;}}
    @media(max-width:640px){.stat-strip{flex-wrap:wrap !important;}.stat-strip>div{min-width:50% !important;}.hero-btns{flex-direction:column !important;}.nav-links{display:none !important;}}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* ── NAV ─────────────────────────────────────────────────────────── */}
        <nav style={{ position:"sticky", top:0, zIndex:200, display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}` }}>

          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:26, height:26, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>

          <div className="nav-links" style={{ display:"flex", gap:28, alignItems:"center" }}>
            <a href="#upload" className="nav-link active">Dashboard</a>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/quests" className="nav-link">Quests</Link>
            <a href="https://touchgrass.today" className="nav-link" target="_blank" rel="noopener noreferrer">Website</a>
          </div>

          {/* Username input + profile link */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <input className="username-input" type="text" placeholder="your username"
              value={rawUsername} onChange={e => setRawUsername(e.target.value)}
              style={{ width:130 }} />
            {hasUser && (
              <Link href={`/u/${username}`} style={{
                fontSize:10, color:T.olive, textDecoration:"none",
                border:`1px solid ${T.borderG}`, borderRadius:6,
                padding:"5px 9px", whiteSpace:"nowrap", flexShrink:0,
              }}>My Profile →</Link>
            )}
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section style={{ position:"relative", height:"clamp(460px,70vh,720px)", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(155deg,#1a2d0e,#2d4a18 22%,#1e3410 52%,#0e1a08)" }}>
            <div style={{ position:"absolute", inset:0, opacity:0.2, backgroundImage:"radial-gradient(ellipse at 65% 35%,#4a7a28,transparent 55%),radial-gradient(ellipse at 30% 70%,#2d5a18,transparent 45%)" }} />
          </div>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,rgba(14,15,11,0.92) 0%,rgba(14,15,11,0.16) 52%,rgba(14,15,11,0.80) 100%)" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"36%", background:"linear-gradient(180deg,transparent,rgba(14,15,11,0.97))" }} />

          {/* Left */}
          <div style={{ position:"absolute", left:"clamp(18px,5.5vw,76px)", top:"50%", transform:"translateY(-50%)", maxWidth:480 }}>
            <div className="fade-1" style={{ fontSize:10, letterSpacing:"0.22em", color:T.olive, textTransform:"uppercase", marginBottom:12, fontWeight:600 }}>Verified Outdoors</div>
            <h1 className="fade-2" style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(44px,6.5vw,88px)", fontWeight:700, color:T.white, lineHeight:0.94, letterSpacing:"-0.02em", marginBottom:18 }}>
              Proof<br />of Grass
            </h1>
            <p className="fade-2" style={{ fontSize:15, lineHeight:1.72, marginBottom:28, maxWidth:340, fontWeight:300, color:T.muted }}>
              Log your time outside. Build your streak.<br />Earn rewards. Make a difference.
            </p>
            <div className="fade-3 hero-btns" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <a href="#upload" className="btn-olive">Log Your Proof ↑</a>
              <Link href="/leaderboard" className="btn-ghost">View Leaderboard</Link>
            </div>

            {hasUser && userStats && (
              <div className="fade-3" style={{ marginTop:24, display:"flex", gap:18 }}>
                {[["Posts", userStats.posts], ["Best", `${userStats.bestStreak}d`], ["Rank", `#${userStats.rank}`], ["Shields", userStats.shields]].map(([label, val]) => (
                  <div key={label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:15, fontWeight:700, color:T.white, fontFamily:"'Cormorant Garamond',Georgia,serif" }}>{val}</div>
                    <div style={{ fontSize:8, color:T.dim, letterSpacing:"0.12em", textTransform:"uppercase" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right streak HUD — only show when signed in */}
          {hasUser && currentStreak > 0 && (
            <div style={{ position:"absolute", right:"clamp(18px,5.5vw,76px)", top:"50%", transform:"translateY(-50%)", textAlign:"right" }}>
              <div style={{ fontSize:9, letterSpacing:"0.2em", color:T.dim, textTransform:"uppercase", marginBottom:8 }}>Your Streak</div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(56px,7.5vw,98px)", fontWeight:700, color:T.white, lineHeight:0.9, letterSpacing:"-0.03em" }}>
                <span style={{ fontSize:"0.42em", color:T.muted, verticalAlign:"top", lineHeight:2.4 }}>DAY </span>
                {currentStreak}
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:7, marginTop:10 }}>
                <div style={{ width:30, height:1, background:`linear-gradient(90deg,transparent,${tierColor})` }} />
                <span style={{ fontSize:9, letterSpacing:"0.16em", color:tierColor, textTransform:"uppercase", fontWeight:600 }}>✦ {tier}</span>
              </div>
            </div>
          )}
        </section>

        {/* ── ENTER USERNAME BANNER ────────────────────────────────────────── */}
        {mounted && !hasUser && (
          <div style={{ background:`${T.olive}08`, borderBottom:`1px solid ${T.borderG}`,
            padding:"11px clamp(14px,4vw,48px)", display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:T.dim }}>Enter your username above to see your streak, log proof, and join the leaderboard.</span>
          </div>
        )}

        {/* ── STATS STRIP ───────────────────────────────────────────────────── */}
        <div className="stat-strip" style={{ display:"flex", background:T.bg2, borderBottom:`1px solid ${T.border}` }}>
          <StatCard icon="◎" value={dailyCount !== null ? dailyCount.toLocaleString() : "…"} label="Active Touchers Today" />
          <StatCard icon="◈" value={fmtBurned(totalBurned)} label="$TOUCHGRASS Burned" />
          <StatCard icon="↗" value={topStreaker ? `${topStreaker.streak}d` : "…"} sub={topStreaker ? `@${topStreaker.username}` : ""} label="Top Streak" accent />
          <StatCard icon="◉" value={totalProofs !== null ? totalProofs.toLocaleString() : "…"} label="Proofs Logged" last />
        </div>

        {/* ── MAIN THREE-COLUMN GRID ─────────────────────────────────────────── */}
        <div className="main-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
          gap:0, background:T.border, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>

          {/* LOG YOUR PROOF */}
          <div id="upload" ref={uploadSectionRef} className="card" style={{ padding:26 }}>
            <div className="card-title">Log Your Proof</div>

            {!hasUser ? (
              <div style={{ border:`1.5px dashed ${T.borderG}`, borderRadius:12, padding:"32px 20px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:12, opacity:0.4 }}>🌿</div>
                <div style={{ fontSize:13, color:T.muted, marginBottom:6, fontWeight:500 }}>Enter your username to get started</div>
                <div style={{ fontSize:11, color:T.dim, marginBottom:18 }}>Type your username in the top right corner</div>
              </div>
            ) : hasPostedToday ? (
              <div style={{ border:`1px solid ${T.borderG}`, borderRadius:12, padding:"28px 18px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:10 }}>✓</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#4ade80", marginBottom:6 }}>Streak locked in for today</div>
                <div style={{ fontSize:11, color:T.dim }}>Come back tomorrow to keep your streak alive.</div>
              </div>
            ) : showResult && imageSrc ? (
              <ResultCard
                imageSrc={imageSrc}
                username={username}
                initialStreak={displayStreak ?? currentStreak ?? 1}
                onStreakUpdate={(n) => { setCurrentStreak(n); setHasPostedToday(true); }}
              />
            ) : (
              <>
                <UploadBox onUpload={handleImageUpload} />
                <div style={{ marginTop:12, padding:"10px 13px", borderRadius:8,
                  background:T.bg3, border:`1px solid ${T.border}`, fontSize:11, color:T.dim }}>
                  {`Upload your outdoor photo to generate your Day ${displayStreak ?? currentStreak ?? 1} certificate.`}
                </div>
              </>
            )}

            {/* Shield alert */}
            {mounted && hasUser && missedOneDayNoShield && !hasPostedToday && (
              <div style={{ marginTop:14, padding:"12px 14px", borderRadius:10,
                border:`1px solid #7f1d1d`, background:"#100404" }}>
                <div style={{ fontSize:11, color:T.red, fontWeight:600, marginBottom:4 }}>⚠️ No shields available</div>
                <div style={{ fontSize:10, color:"rgba(239,68,68,0.6)", marginBottom:6 }}>Your streak resets if you miss today</div>
                <button onClick={() => setShowShieldBuy(true)}
                  style={{ background:"transparent", border:`1px solid ${T.red}`, color:T.red,
                    borderRadius:6, padding:"6px 12px", fontSize:10, cursor:"pointer",
                    fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                  🛡 Buy Shield
                </button>
              </div>
            )}
          </div>

          {/* RECENT PROOFS */}
          <div className="card" style={{ padding:26, borderLeft:`1px solid ${T.border}` }}>
            <div className="card-title-row">
              <span className="card-title" style={{ margin:0 }}>Recent Proofs</span>
              <Link href="/leaderboard" className="view-all">View All</Link>
            </div>
            {recentProofs.length > 0
              ? recentProofs.map((p, i) => <ProofRow key={i} {...p} />)
              : [1,2,3,4,5].map(i => (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                  <Skeleton w={44} h={44} />
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}><Skeleton h={10} /><Skeleton w="55%" h={8} /></div>
                </div>
              ))
            }
          </div>

          {/* LEADERBOARD */}
          <div className="card" style={{ padding:26, borderLeft:`1px solid ${T.border}` }}>
            <div className="card-title-row">
              <span className="card-title" style={{ margin:0 }}>Leaderboard</span>
              <Link href="/leaderboard" className="view-all">View All</Link>
            </div>
            {leaders.length > 0
              ? leaders.slice(0,6).map((r, i) => <LBRow key={i} rank={i+1} {...r} />)
              : [1,2,3,4,5].map(i => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                  <Skeleton w={14} h={10} />
                  <Skeleton w={32} h={32} />
                  <div style={{ flex:1 }}><Skeleton h={10} /></div>
                  <Skeleton w={28} h={18} />
                </div>
              ))
            }
          </div>
        </div>

        {/* ── PROGRESSION + RESULT CARD PREVIEW ─────────────────────────────── */}
        <div className="prog-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:0, background:T.border, borderBottom:`1px solid ${T.border}` }}>

          {/* PROGRESSION */}
          <div className="card" style={{ padding:28, borderRight:`1px solid ${T.border}` }}>
            <div className="card-title">Your Progression</div>
            {hasUser && currentStreak > 0 ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-around", marginBottom:28 }}>
                  <TierBadge name="Rooted"    day={14}  completed={currentStreak>=14} active={currentStreak>=7  && currentStreak<14} />
                  <TierBadge name="Elite"     day={30}  completed={currentStreak>=30} active={currentStreak>=14 && currentStreak<30} />
                  <TierBadge name="Legendary" day={50}  completed={currentStreak>=50} active={currentStreak>=30 && currentStreak<50} />
                  <TierBadge name="Immortal"  day={100} completed={currentStreak>=100} active={currentStreak>=50  && currentStreak<100} />
                  <TierBadge name="Mythic"    day={180} completed={currentStreak>=180} active={currentStreak>=100 && currentStreak<180} />
                  <TierBadge name="Eternal"   day={365} completed={currentStreak>=365} active={currentStreak>=180 && currentStreak<365} />
                  <TierBadge name="Ascended"  day={500} completed={currentStreak>=500} active={currentStreak>=365 && currentStreak<500} />
                </div>
                {(() => {
                  const thr = [0,7,14,30,50,100];
                  const prev = [...thr].reverse().find(t => currentStreak >= t) ?? 0;
                  const next = thr.find(t => t > currentStreak);
                  const fill = next ? Math.round(((currentStreak - prev)/(next - prev))*100) : 100;
                  const left = next ? next - currentStreak : 0;
                  return (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:11, color:T.muted }}>Next Milestone</span>
                        <span style={{ fontSize:11, color:T.dim }}>{currentStreak} / {next ?? 100}</span>
                      </div>
                      {left > 0 && <div style={{ fontSize:11, color:T.olive, marginBottom:10, fontWeight:600 }}>{left} day{left!==1?"s":""} to {next ? getStreakTier(next) : "Immortal"}</div>}
                      <div style={{ height:3, background:T.bg3, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${fill}%`, background:`linear-gradient(90deg,${T.olive},${T.gold})`, borderRadius:2, transition:"width 1.2s ease" }} />
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"28px 0" }}>
                <div style={{ fontSize:11, color:T.dim, marginBottom:16 }}>Enter your username to see your progression</div>
                <input className="username-input" type="text" placeholder="your username"
                  value={rawUsername} onChange={e => setRawUsername(e.target.value)} style={{ width:180 }} />
              </div>
            )}

            {/* Shield section */}
            <div style={{ marginTop:20, padding:"14px 16px", borderRadius:10, background:T.bg3, border:`1px solid ${T.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: showShieldBuy ? 14 : 0 }}>
                <span style={{ fontSize:18 }}>🛡</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.white }}>Shield Protection</div>
                  <div style={{ fontSize:10, color:T.dim }}>50,000 $TOUCHGRASS · Protect your streak</div>
                </div>
                <button onClick={() => setShowShieldBuy(v => !v)}
                  style={{ background:"transparent", border:`1px solid ${T.borderG}`, color:T.olive,
                    borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>
                  {showShieldBuy ? "Close" : "Buy →"}
                </button>
              </div>

              {showShieldBuy && (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ fontSize:10, color:T.dim, marginBottom:2 }}>
                    Send 50,000 $TOUCHGRASS to <span style={{ color:T.olive }}>{SOL_DOMAIN}</span>
                    {" "}(<span style={{ fontSize:9 }}>{BURN_ADDR.slice(0,8)}…</span>), then submit below.
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => { navigator.clipboard.writeText(SOL_DOMAIN).catch(()=>{}); setCopiedDomain(true); setShowPasteTip(true); setTimeout(()=>setCopiedDomain(false),1500); }}
                      style={{ flex:1, background:"transparent", border:`1px solid ${T.borderG}`, color: copiedDomain ? "#4ade80" : T.olive, borderRadius:6, padding:"7px 10px", fontSize:10, cursor:"pointer", fontWeight:600 }}>
                      {copiedDomain ? "✓ copied" : "Copy Domain"}
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(BURN_ADDR).catch(()=>{}); setCopiedAddr(true); setShowPasteTip(true); setTimeout(()=>setCopiedAddr(false),1500); }}
                      style={{ flex:1, background:"transparent", border:`1px solid ${T.borderG}`, color: copiedAddr ? "#4ade80" : T.olive, borderRadius:6, padding:"7px 10px", fontSize:10, cursor:"pointer", fontWeight:600 }}>
                      {copiedAddr ? "✓ copied" : "Copy Address"}
                    </button>
                  </div>
                  {showPasteTip && <div style={{ fontSize:10, color:T.dim }}>Paste your transaction below once sent.</div>}
                  <input type="text" className="field" placeholder="Your wallet address" value={purchaseWallet} onChange={e => setPurchaseWallet(e.target.value)} />
                  <input type="text" className="field" placeholder="Transaction signature" value={purchaseTxSig} onChange={e => setPurchaseTxSig(e.target.value)} />
                  {purchaseError && <div style={{ fontSize:10, color:T.red }}>{purchaseError}</div>}
                  {latestPurchase && purchaseStatus !== "success" && (
                    <div style={{ fontSize:10, color: latestPurchase.status==="approved" ? "#4ade80" : latestPurchase.status==="rejected" ? T.red : T.gold }}>
                      {latestPurchase.status==="approved" ? "✅ Shield credited" : latestPurchase.status==="rejected" ? "❌ Rejected — check tx" : "⏳ Pending review"}
                    </div>
                  )}
                  <button className="btn-olive" style={{ justifyContent:"center" }}
                    onClick={handleBuyShield} disabled={purchaseStatus==="loading"}>
                    {purchaseStatus==="loading" ? "Submitting…" : purchaseStatus==="success" ? "✓ Submitted!" : "🛡 Submit Shield Purchase"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVITY FEED WITH TABS */}
          <div className="card" style={{ padding:28 }}>
            
            <ActivityFeed />
          </div>

        </div>

        {/* ── QUESTS BANNER ────────────────────────────────────────────────── */}
        <div style={{
          margin:"0", padding:"24px clamp(14px,4vw,48px)",
          background:T.bg2, borderTop:`1px solid ${T.border}`,
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:16, flexWrap:"wrap",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, minWidth:0 }}>
            <div style={{ width:48, height:48, borderRadius:12, flexShrink:0,
              background:`${T.olive}14`, border:`1px solid ${T.borderG}`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
              ⭐
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.white, marginBottom:2 }}>
                Community Quests
              </div>
              <div style={{ fontSize:11, color:T.dim }}>
                Complete quests, earn XP, unlock badges, vote on DexScreener.
              </div>
            </div>
          </div>
          <Link href="/quests" style={{
            display:"inline-flex", alignItems:"center", gap:6,
            background:T.olive, color:"#0e1108",
            fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700,
            letterSpacing:"0.1em", textTransform:"uppercase",
            padding:"10px 20px", borderRadius:8, textDecoration:"none",
            flexShrink:0, transition:"background 0.2s",
            whiteSpace:"nowrap",
          }}>
            View Quests →
          </Link>
        </div>

        {/* ── FOOTER CTA ────────────────────────────────────────────────────── */}
        <section style={{ position:"relative", padding:"88px clamp(18px,5vw,72px)",
          textAlign:"center", overflow:"hidden",
          background:`linear-gradient(180deg,${T.bg} 0%,#111408 100%)` }}>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
            width:500, height:500, borderRadius:"50%",
            background:`radial-gradient(circle,${T.olive}0e 0%,transparent 70%)`, pointerEvents:"none" }} />
          <div style={{ position:"relative" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:60, height:60, objectFit:"contain", opacity:0.7, marginBottom:20 }} />
            <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(32px,5vw,68px)",
              fontWeight:700, color:T.white, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:12 }}>
              Go outside.<br /><span style={{ color:T.olive }}>Prove it.</span><br />Make a difference.
            </h2>
            <p style={{ fontSize:14, color:T.dim, marginBottom:36, fontWeight:300 }}>Every proof plants impact.</p>
            <a href="#upload" className="btn-olive" style={{ fontSize:14, padding:"14px 34px" }}>Start Your Streak ↑</a>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer style={{ borderTop:`1px solid ${T.border}`, padding:"20px clamp(14px,4vw,48px)",
          display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, background:T.bg }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:16, height:16, opacity:0.45 }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:13, color:T.dim }}>touch grass © 2024</span>
          </div>
          <div style={{ display:"flex", gap:22, flexWrap:"wrap" }}>
            {[["Leaderboard","/leaderboard"],["Website","https://touchgrass.today"],["X (Twitter)","https://twitter.com/XTouchGrass"]].map(([label,href]) => (
              <Link key={label} href={href} style={{ fontSize:10, color:T.dim, textDecoration:"none", letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em" }}>BUILT ON ◎ SOLANA</div>
        </footer>

      </div>

    </>
  );
}