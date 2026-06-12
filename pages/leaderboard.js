import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

// ─── Tokens (match dashboard exactly) ────────────────────────────────────────
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeUsername(val) {
  return String(val ?? "").replace(/@/g, "").toLowerCase().trim();
}

function getStreakTier(streak) {
  if (streak >= 1000) return { label:"TRANSCENDENT", color:"#f0fdf4", border:"rgba(240,253,244,0.5)" };
  if (streak >= 500)  return { label:"ASCENDED",     color:"#e0f2fe", border:"rgba(224,242,254,0.5)" };
  if (streak >= 365)  return { label:"ETERNAL",      color:"#fff9c4", border:"#a08000" };
  if (streak >= 180)  return { label:"MYTHIC",       color:"#fbbf24", border:"#92400e" };
  if (streak >= 100)  return { label:"IMMORTAL",     color:"#f97316", border:"#7c2d12" };
  if (streak >= 50)   return { label:"LEGENDARY",    color:T.gold,    border:"#7a5c00" };
  if (streak >= 30)   return { label:"ELITE",        color:"#c084fc", border:"#6d28d9" };
  if (streak >= 14)   return { label:"LOCKED IN",    color:T.olive,   border:"#4a5a28" };
  if (streak >= 7)    return { label:"ROOTED",       color:"#b8c87a", border:"#5a6a30" };
  if (streak >= 3)    return { label:"GROWING",      color:"#a0b870", border:"#4a5828" };
  return { label:"SEED", color:"rgba(240,239,234,0.35)", border:"rgba(255,255,255,0.1)" };
}

function getNextTier(streak) {
  const tiers = [3, 7, 14, 30, 50, 100, 180, 365, 500, 1000];
  const next = tiers.find(t => streak < t);
  if (!next) return null;
  return { days: next, remaining: next - streak };
}

function getTopPercent(streak) {
  if (streak >= 30) return 1;
  if (streak >= 14) return 5;
  if (streak >= 7)  return 10;
  return null;
}

// Leaderboard built from Streaks as source of truth.
// sortBy: 'grass_score' (default/main) | 'current_streak' | 'referral_count'
function buildLeaderboard(streaks, countMap, dateMap, scoreMap, referralMap, filterFn, sortBy = "grass_score") {
  return (streaks || [])
    .filter(s => normalizeUsername(s.username))
    .filter(filterFn ?? (() => true))
    .map(s => {
      const u = normalizeUsername(s.username);
      return {
        username: u,
        current_streak: s.current_streak ?? 1,
        best_streak: s.best_streak ?? 1,
        grass_score: scoreMap?.[u] ?? 0,
        referral_count: referralMap?.[u] ?? 0,
        count: countMap[u] ?? 0,
        created_at: dateMap[u] ?? s.last_submission_date ?? new Date(0).toISOString(),
      };
    })
    .sort((a, b) => b[sortBy] - a[sortBy]);
}

// ─── Card component ───────────────────────────────────────────────────────────
function LBCard({ item, index, board }) {
  const tier   = getStreakTier(item.current_streak);
  const topPct = getTopPercent(item.current_streak);
  const nextTier = getNextTier(item.current_streak);
  const thresholds = [0, 3, 7, 14, 30, 50, 100, 180, 365, 500, 1000];
  const prev  = [...thresholds].reverse().find(t => item.current_streak >= t) ?? 0;
  const nextT = nextTier?.days ?? 365;
  const fill  = nextT - prev > 0 ? Math.min(100, Math.round(((item.current_streak - prev) / (nextT - prev)) * 100)) : 100;
  const barLabel = !nextTier ? "✦ transcendent" : `${nextTier.remaining}d to ${getStreakTier(nextTier.days).label}`;
  const medals = ["🥇","🥈","🥉"];

  return (
    <div className="lb-card" style={{
      overflow:"hidden",
      borderRadius:12,
      background: T.bg2,
      border: `1px solid ${index === 0 ? tier.color : tier.border}`,
      boxShadow: index === 0 ? `0 0 24px ${tier.color}22` :
                 item.current_streak >= 100 ? "0 0 16px rgba(249,115,22,0.1)" :
                 item.current_streak >= 50  ? "0 0 14px rgba(200,168,75,0.1)" : "none",
      transition:"transform 0.2s, box-shadow 0.2s",
      cursor:"pointer",
    }}
    onClick={() => window.location.href = `/u/${item.username}`}
    onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 28px ${tier.color}18`; }}
    onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
    >
      {/* Top accent line */}
      <div style={{ height:2, flexShrink:0, background:`linear-gradient(90deg,transparent,${tier.color},transparent)`, opacity:0.5 }} />

      <div style={{ flex:1, padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        {/* Rank + tier */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:18, fontWeight:700, color:tier.color, lineHeight:1 }}>
            {medals[index] ?? `#${index+1}`}
          </span>
          <span style={{ fontSize:8, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
            color:"#fff", border:`1px solid ${tier.color}`, borderRadius:4,
            padding:"2px 6px", background:`${tier.color}22`,
            textShadow:`0 0 6px ${tier.color}`, whiteSpace:"nowrap" }}>
            {tier.label}
          </span>
        </div>

        {/* Username — links to public profile */}
        <Link href={`/u/${item.username}`} onClick={e => e.stopPropagation()}
          style={{ fontSize:14, fontWeight:600, color:T.white, overflow:"hidden",
          textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif",
          textDecoration:"none", transition:"color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = tier.color}
          onMouseLeave={e => e.currentTarget.style.color = T.white}>
          @{item.username}
        </Link>

        {/* Primary ranking metric — depends on active board */}
        <div style={{ display:"flex", alignItems:"baseline", gap:5, marginTop:"auto" }}>
          {board === "current_streak" ? (
            <>
              <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:28, fontWeight:700,
                lineHeight:1, color:tier.color, textShadow:`0 0 16px ${tier.color}60` }}>
                🔥 {item.current_streak}
              </span>
              <span style={{ fontSize:11, color:T.dim, fontWeight:500 }}>
                day{item.current_streak !== 1 ? "s" : ""}
              </span>
            </>
          ) : board === "referral_count" ? (
            <>
              <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:28, fontWeight:700,
                lineHeight:1, color:tier.color, textShadow:`0 0 16px ${tier.color}60` }}>
                🤝 {item.referral_count}
              </span>
              <span style={{ fontSize:11, color:T.dim, fontWeight:500 }}>
                referral{item.referral_count !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:28, fontWeight:700,
                lineHeight:1, color:tier.color, textShadow:`0 0 16px ${tier.color}60` }}>
                🌱 {(item.grass_score ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize:11, color:T.dim, fontWeight:500 }}>
                grass score
              </span>
            </>
          )}
        </div>

        {/* Secondary stats — always show streak + grass score + referrals for context */}
        <div style={{ display:"flex", gap:10, fontSize:11, color:T.muted, flexWrap:"wrap" }}>
          {board !== "current_streak" && (
            <span>🔥 {item.current_streak}d <span style={{color:T.dim}}>· best {item.best_streak}</span></span>
          )}
          {board === "current_streak" && (
            <span>🏆 best {item.best_streak}d</span>
          )}
          {board !== "grass_score" && (
            <span style={{ color:T.dim }}>· 🌱 {(item.grass_score ?? 0).toLocaleString()}</span>
          )}
          {board !== "referral_count" && item.referral_count > 0 && (
            <span style={{ color:T.dim }}>· 🤝 {item.referral_count}</span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height:3, borderRadius:99, overflow:"hidden", background:"rgba(255,255,255,0.08)" }}>
          <div style={{ height:"100%", width:`${fill}%`, borderRadius:99,
            background:`linear-gradient(90deg,${tier.color}80,${tier.color})`,
            boxShadow:`0 0 6px ${tier.color}60`, transition:"width 1s ease" }} />
        </div>
        <div style={{ fontSize:9, color:T.dim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{barLabel}</div>

        {/* Top % badge */}
        {topPct !== null && (
          <span style={{ alignSelf:"flex-start", fontSize:9, fontWeight:700,
            letterSpacing:"0.1em", textTransform:"uppercase", color:"#fff",
            border:`1px solid ${tier.color}`, borderRadius:4, padding:"2px 6px",
            background:`${tier.color}18` }}>
            ✦ top {topPct}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const [tab,        setTab]        = useState("alltime");
  const [board,      setBoard]      = useState("grass_score"); // 'grass_score' | 'current_streak' | 'referral_count'
  const [data,       setData]       = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [rankQuery,  setRankQuery]  = useState("");
  const [loading,    setLoading]    = useState(true);

  const BOARDS = [
    { key:"grass_score",    label:"🏆 Grass Score",      sub:"Overall progression" },
    { key:"current_streak", label:"🔥 Streaks",           sub:"Consistency" },
    { key:"referral_count", label:"🤝 Community Builder", sub:"Referrals" },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      const weekStart = new Date();
      weekStart.setUTCHours(0,0,0,0);
      weekStart.setUTCDate(weekStart.getUTCDate() - 6);

      const [{ data: streaks }, { data: subs }, { data: profiles }] = await Promise.all([
        supabase.from("Streaks").select("username,current_streak,best_streak,last_submission_date"),
        supabase.from("Submissions").select("username,created_at").in("status",["pending","approved"]).order("created_at",{ascending:false}),
        supabase.from("Profiles").select("username,grass_score,referral_count_successful"),
      ]);

      const scoreMap = {}, referralMap = {};
      (profiles || []).forEach(p => {
        const u = normalizeUsername(p.username);
        scoreMap[u] = p.grass_score ?? 0;
        referralMap[u] = p.referral_count_successful ?? 0;
      });

      const countMap = {}, dateMap = {}, weeklySet = new Set();
      (subs || []).forEach(r => {
        const u = normalizeUsername(r.username);
        countMap[u] = (countMap[u] ?? 0) + 1;
        if (!dateMap[u] || new Date(r.created_at) > new Date(dateMap[u])) dateMap[u] = r.created_at;
        if (new Date(r.created_at) >= weekStart) weeklySet.add(u);
      });

      setData(buildLeaderboard(streaks, countMap, dateMap, scoreMap, referralMap, null, board));
      setWeeklyData(buildLeaderboard(streaks, countMap, dateMap, scoreMap, referralMap, s => weeklySet.has(normalizeUsername(s.username)), board));
      setLoading(false);
    })();
  }, [board]);

  const activeData = tab === "alltime" ? data : weeklyData;
  const normalizedQ = normalizeUsername(rankQuery);
  const rankResult = normalizedQ
    ? (() => {
        const idx = activeData.findIndex(r => normalizeUsername(r.username) === normalizedQ);
        return idx === -1 ? null : { rank: idx + 1, ...activeData[idx] };
      })()
    : undefined;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
    .tab-btn{border:1px solid ${T.border};border-radius:6px;padding:8px 20px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;transition:all 0.2s;}
    .tab-active{background:${T.olive};color:#0e1108;border-color:${T.olive};}
    .tab-inactive{background:transparent;color:${T.dim};}
    .tab-inactive:hover{border-color:${T.olive};color:${T.olive};}
    .rank-input{width:100%;background:${T.bg3};border:none;border-bottom:1px solid ${T.border};padding:10px 0;color:${T.white};font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color 0.2s;}
    .rank-input:focus{border-bottom-color:${T.olive};}
    .rank-input::placeholder{color:${T.dim};}
    /* Mobile nav — hide middle links, show only logo + back */
    @media(max-width:640px){
      .nav-links{display:none !important;}
      .lb-grid{grid-template-columns:1fr !important;}
    }
    /* Tablet — 2 columns */
    @media(min-width:641px) and (max-width:900px){
      .lb-grid{grid-template-columns:1fr 1fr !important;}
    }
    /* Equal height cards via grid row alignment */
    .lb-grid > a { display:flex; }
    .lb-card { display:flex; flex-direction:column; width:100%; }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}`,
          gap:12 }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:26, height:26, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>
          <div className="nav-links" style={{ display:"flex", gap:24, alignItems:"center" }}>
            <Link href="/" style={{ fontSize:13, color:T.dim, textDecoration:"none", fontWeight:500 }}>Dashboard</Link>
            <span style={{ fontSize:13, color:T.olive, fontWeight:600 }}>Leaderboard</span>
            <a href="https://touchgrass.today" style={{ fontSize:13, color:T.dim, textDecoration:"none", fontWeight:500 }} target="_blank" rel="noopener noreferrer">Website</a>
          </div>
          <Link href="/" style={{ fontSize:11, color:T.olive, textDecoration:"none", letterSpacing:"0.06em", flexShrink:0, whiteSpace:"nowrap" }}>← Back</Link>
        </nav>

        {/* HERO HEADER */}
        <div style={{ padding:"48px clamp(14px,5vw,64px) 0", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.olive, textTransform:"uppercase", marginBottom:12, fontWeight:600 }}>Community</div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(36px,6vw,72px)", fontWeight:700, color:T.white, lineHeight:1, letterSpacing:"-0.02em", marginBottom:12 }}>
            The Outdoor<br />Leaderboard
          </h1>
          <p style={{ fontSize:14, color:T.dim, marginBottom:32, fontWeight:300, maxWidth:420, lineHeight:1.7 }}>
            {board === "current_streak"
              ? "Real streaks. Real people. Going outside every day."
              : board === "referral_count"
              ? "Bring people outside. Build the movement."
              : "Daily proofs, milestones, badges, and referrals — every contribution counts."}
          </p>

          {/* BOARD SELECTOR — three competitions */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {BOARDS.map(b => (
              <button
                key={b.key}
                className={`tab-btn ${board===b.key ? "tab-active" : "tab-inactive"}`}
                onClick={() => setBoard(b.key)}
                style={{ display:"flex", flexDirection:"column", alignItems:"flex-start",
                  gap:2, padding:"10px 18px", height:"auto" }}
              >
                <span>{b.label}</span>
                <span style={{ fontSize:8, letterSpacing:"0.08em", textTransform:"none",
                  opacity:0.7, fontWeight:500 }}>{b.sub}</span>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:32 }}>
            <button className={`tab-btn ${tab==="alltime" ? "tab-active" : "tab-inactive"}`} onClick={() => setTab("alltime")}>All Time</button>
            <button className={`tab-btn ${tab==="weekly"  ? "tab-active" : "tab-inactive"}`} onClick={() => setTab("weekly")}>This Week</button>
            <button className={`tab-btn ${tab==="friends" ? "tab-active" : "tab-inactive"}`} onClick={() => setTab("friends")} style={{ position:"relative" }}>
              Friends
              <span style={{ fontSize:7, fontWeight:700, color:"#c8a84b",
                background:"rgba(200,168,75,0.15)", border:"1px solid rgba(200,168,75,0.35)",
                borderRadius:3, padding:"1px 4px", marginLeft:5,
                letterSpacing:"0.08em", verticalAlign:"middle" }}>SOON</span>
            </button>
          </div>
        </div>

        <div style={{ padding:"32px clamp(14px,5vw,64px)" }}>

          {/* YOUR RANK LOOKUP */}
          <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:"24px 28px", marginBottom:32 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:T.muted, marginBottom:16 }}>Your Rank</div>
            <input
              className="rank-input"
              type="text"
              placeholder="Enter your username"
              value={rankQuery}
              onChange={e => setRankQuery(e.target.value)}
            />
            <div style={{ marginTop:16 }}>
              {rankResult === undefined && (
                <p style={{ fontSize:12, color:T.dim }}>Type your username to see where you stand.</p>
              )}
              {rankResult === null && (
                <p style={{ fontSize:12, color:T.dim }}>Not ranked yet — submit your proof to join.</p>
              )}
              {rankResult && (
                <div style={{ display:"flex", gap:32, flexWrap:"wrap", marginTop:8 }}>
                  {[
                    ["Rank",        `#${rankResult.rank}`],
                    ["Grass Score", `🌱 ${rankResult.grass_score.toLocaleString()}`],
                    ["Streak",      `🔥 ${rankResult.current_streak}d`],
                    ["Best",        `🏆 ${rankResult.best_streak}d`],
                    ["Referrals",   `🤝 ${rankResult.referral_count}`],
                    ["Tier",        getStreakTier(rankResult.current_streak).label],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize:9, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:4 }}>{label}</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:28, fontWeight:700, color:T.white, lineHeight:1 }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GRID */}
          {tab === "friends" ? (
            <div style={{ textAlign:"center", padding:"48px 20px",
              background:T.bg2, border:`1px solid rgba(147,168,90,0.2)`,
              borderRadius:14 }}>
              <div style={{ fontSize:42, marginBottom:16 }}>👥</div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:22, fontWeight:700, color:T.white, marginBottom:8 }}>
                Friends Leaderboard
              </div>
              <div style={{ fontSize:13, color:T.dim, lineHeight:1.7,
                marginBottom:20, maxWidth:300, margin:"0 auto 20px" }}>
                See how your streak ranks among people you follow.
                Coming soon — follow some Touchers first.
              </div>
              <a href="/leaderboard" style={{
                display:"inline-block", background:"transparent",
                border:`1px solid rgba(147,168,90,0.35)`,
                borderRadius:9, padding:"10px 22px",
                fontSize:12, fontWeight:700, color:"#93a85a",
                textDecoration:"none",
              }}>Browse the Global Rankings →</a>
            </div>
          ) : loading ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }} className="lb-grid">
              {Array.from({length:8}).map((_,i) => (
                <div key={i} style={{ height:180, borderRadius:12, background:T.bg2, border:`1px solid ${T.border}`, opacity:0.5 }} />
              ))}
            </div>
          ) : activeData.length === 0 ? (
            <div style={{ textAlign:"center", padding:"64px 0", color:T.dim, fontSize:14 }}>
              {tab === "weekly" ? "No activity this week yet." : "No entries yet."}
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, alignItems:"stretch" }} className="lb-grid">
              {activeData.map((item, i) => <LBCard key={`${item.username}-${i}`} item={item} index={i} board={board} />)}
            </div>
          )}

          {/* STREAK RESETS NOTE */}
          <p style={{ fontSize:10, color:T.dim, letterSpacing:"0.12em", textTransform:"uppercase", marginTop:24, textAlign:"center" }}>
            {board === "current_streak"
              ? "Streaks reset at 00:00 UTC"
              : "Grass Score never resets — streaks can, your progress can't"}
          </p>
        </div>

        {/* FOOTER */}
        <footer style={{ borderTop:`1px solid ${T.border}`, padding:"20px clamp(14px,4vw,48px)",
          display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, background:T.bg }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:16, height:16, opacity:0.45 }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:13, color:T.dim }}>touch grass © 2024</span>
          </div>
          <div style={{ display:"flex", gap:22, flexWrap:"wrap" }}>
            {[["Dashboard","/"],["Website","https://touchgrass.today"],["X","https://twitter.com/XTouchGrass"]].map(([label,href]) => (
              <Link key={label} href={href} style={{ fontSize:10, color:T.dim, textDecoration:"none", letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em" }}>BUILT ON ◎ SOLANA</div>
        </footer>

      </div>
    </>
  );
}