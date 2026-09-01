// pages/leaderboard.js — V2 Leaderboard (Mockup Match)
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Head from "next/head";
import { supabase } from "../utils/supabase";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";

function norm(v) { return String(v ?? "").replace(/@/g, "").toLowerCase().trim(); }

const PAGE_SIZE = 20;

// ── Tier logic ────────────────────────────────────────────────────────────────
function getTier(n) {
  if (n>=1000) return { label:"TRANSCENDENT", color:"#f0fdf4", emoji:"✨" };
  if (n>=500)  return { label:"ASCENDED",     color:"#e0f2fe", emoji:"🌌" };
  if (n>=365)  return { label:"ETERNAL",      color:"#fef9c3", emoji:"👑" };
  if (n>=180)  return { label:"MYTHIC",       color:"#fbbf24", emoji:"⚡" };
  if (n>=100)  return { label:"IMMORTAL",     color:"#f97316", emoji:"💯" };
  if (n>=50)   return { label:"LEGENDARY",    color:"#c8a84b", emoji:"🌅" };
  if (n>=30)   return { label:"ELITE",        color:"#a78bfa", emoji:"🌲" };
  if (n>=14)   return { label:"LOCKED IN",    color:"#7dc832", emoji:"💧" };
  if (n>=7)    return { label:"ROOTED",       color:"#b8c87a", emoji:"🌱" };
  return             { label:"SEED",          color:"#6b7d60", emoji:"🌱" };
}

function getNextMilestone(streak) {
  const ths = [7,14,30,50,100,180,365,500,1000];
  const names = {7:"ROOTED",14:"LOCKED IN",30:"ELITE",50:"LEGENDARY",
    100:"IMMORTAL",180:"MYTHIC",365:"ETERNAL",500:"ASCENDED",1000:"TRANSCENDENT"};
  const next = ths.find(t => t > streak);
  if (!next) return null;
  return { days: next - streak, name: names[next] };
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkelRow() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px",
      borderBottom:`1px solid ${V2.borderSoft}` }}>
      <div style={{ width:32, height:32, borderRadius:8, background:"rgba(200,220,190,0.3)" }} />
      <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(200,220,190,0.3)", flexShrink:0 }} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ height:14, width:"40%", borderRadius:4, background:"rgba(200,220,190,0.3)" }} />
        <div style={{ height:10, width:"25%", borderRadius:4, background:"rgba(200,220,190,0.2)" }} />
      </div>
      <div style={{ height:32, width:80, borderRadius:8, background:"rgba(200,220,190,0.2)" }} />
    </div>
  );
}

// ── Medal ─────────────────────────────────────────────────────────────────────
function Medal({ rank }) {
  if (rank === 1) return <div style={{ fontSize:28, width:36, textAlign:"center" }}>🥇</div>;
  if (rank === 2) return <div style={{ fontSize:28, width:36, textAlign:"center" }}>🥈</div>;
  if (rank === 3) return <div style={{ fontSize:28, width:36, textAlign:"center" }}>🥉</div>;
  return <div style={{ width:36, textAlign:"center", fontFamily:V2.fontSerif,
    fontSize:16, fontWeight:700, color:V2.midGray }}>{rank}</div>;
}

// ── Leaderboard row ───────────────────────────────────────────────────────────
function LBRow({ row, rank, lbType, isCurrentUser }) {
  const tier = getTier(row.current_streak ?? row.best_streak ?? 0);
  const next = getNextMilestone(row.current_streak ?? 0);
  const streak = lbType === "streaks" ? (row.current_streak ?? 0) : (row.best_streak ?? 0);
  const gs = row.grass_score ?? 0;
  const refs = row.referral_count_successful ?? 0;
  const rankColors = { 1:"rgba(200,168,75,0.08)", 2:"rgba(180,180,180,0.08)", 3:"rgba(205,127,50,0.08)" };
  const rankBorders = { 1:"rgba(200,168,75,0.3)", 2:"rgba(180,180,180,0.3)", 3:"rgba(205,127,50,0.3)" };

  return (
    <Link href={`/u/${row.username}`} style={{ textDecoration:"none", display:"block" }}>
      <div style={{
        display:"flex", alignItems:"center", gap:12, padding:"14px 20px",
        borderBottom:`1px solid ${V2.borderSoft}`,
        background: isCurrentUser
          ? "rgba(125,200,50,0.08)"
          : rankColors[rank] || "white",
        borderLeft: isCurrentUser
          ? `3px solid ${V2.grassGreen}`
          : rank <= 3 ? `3px solid ${rankBorders[rank]}` : "3px solid transparent",
        transition:"background 0.15s",
      }}
      onMouseEnter={e=>e.currentTarget.style.background=isCurrentUser?"rgba(125,200,50,0.12)":"rgba(125,200,50,0.04)"}
      onMouseLeave={e=>e.currentTarget.style.background=isCurrentUser?"rgba(125,200,50,0.08)":rankColors[rank]||"white"}>

        {/* Rank / Medal */}
        <Medal rank={rank} />

        {/* Avatar */}
        <div style={{ width:48, height:48, borderRadius:"50%", flexShrink:0,
          background:`linear-gradient(135deg,${V2.grassGreen}40,${V2.grassGreen}20)`,
          border:`2px solid ${rank===1?"rgba(200,168,75,0.5)":rank===2?"rgba(180,180,180,0.5)":rank===3?"rgba(205,127,50,0.5)":V2.borderSoft}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:20, overflow:"hidden" }}>
          {row.avatar_url
            ? <img src={row.avatar_url} alt="" loading="lazy"
                style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }}
                onError={e=>{ e.currentTarget.style.display="none"; }} />
            : (row.avatar_emoji || row.username?.[0]?.toUpperCase() || "🌿")
          }
        </div>

        {/* Username + tier */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:V2.forestGreen,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            @{row.username}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3, flexWrap:"wrap" }}>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.08em",
              background:`${tier.color}30`, color:V2.forestGreen,
              border:`1px solid ${tier.color}60`, borderRadius:20, padding:"2px 8px" }}>
              {tier.emoji} {tier.label}
            </span>
            {next && (
              <span style={{ fontSize:10, color:V2.midGray }}>
                · {next.days}d to {next.name}
              </span>
            )}
          </div>
        </div>

        {/* Secondary stats — hidden on very small screens */}
        <div style={{ display:"flex", gap:16, flexShrink:0 }} className="lb-secondary">
          {lbType !== "community" && (
            <div style={{ textAlign:"center", minWidth:56 }}>
              <div style={{ fontSize:14, fontWeight:700, color:V2.forestGreen }}>
                🔥 {streak}d
              </div>
              <div style={{ fontSize:9, color:V2.midGray, textTransform:"uppercase",
                letterSpacing:"0.08em" }}>
                {lbType === "streaks" ? "Streak" : "Best Streak"}
              </div>
            </div>
          )}
          {lbType !== "community" && (
            <div style={{ textAlign:"center", minWidth:48 }}>
              <div style={{ fontSize:14, fontWeight:700, color:V2.gold }}>
                🤝 {refs}
              </div>
              <div style={{ fontSize:9, color:V2.midGray, textTransform:"uppercase",
                letterSpacing:"0.08em" }}>Referrals</div>
            </div>
          )}
          {lbType === "community" && (
            <div style={{ textAlign:"center", minWidth:56 }}>
              <div style={{ fontSize:14, fontWeight:700, color:V2.forestGreen }}>
                🔥 {streak}d
              </div>
              <div style={{ fontSize:9, color:V2.midGray, textTransform:"uppercase",
                letterSpacing:"0.08em" }}>Streak</div>
            </div>
          )}
        </div>

        {/* Primary score */}
        <div style={{ flexShrink:0, textAlign:"right",
          background:`${V2.grassGreen}10`,
          border:`1px solid ${V2.borderGreen}`,
          borderRadius:12, padding:"8px 14px", minWidth:90 }}>
          <div style={{ fontFamily:V2.fontSerif,
            fontSize:lbType==="community"?20:18, fontWeight:700,
            color:V2.forestGreen, lineHeight:1 }}>
            🌱 {lbType==="community"
              ? refs
              : lbType==="streaks"
                ? `${streak}d`
                : gs.toLocaleString()}
          </div>
          <div style={{ fontSize:9, color:V2.midGray, textTransform:"uppercase",
            letterSpacing:"0.08em", marginTop:2 }}>
            {lbType==="community" ? "referrals" : lbType==="streaks" ? "streak" : "grass score"}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const [lbType,      setLbType]      = useState("grass_score");
  const [timeFilter,  setTimeFilter]  = useState("all");
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(0);
  const [hasMore,     setHasMore]     = useState(true);
  const [error,       setError]       = useState("");

  const [rankInput,   setRankInput]   = useState("");
  const [rankResult,  setRankResult]  = useState(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankError,   setRankError]   = useState("");
  const [currentUser, setCurrentUser] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("pog_username") : null;
    if (saved) { setCurrentUser(norm(saved)); setRankInput(norm(saved)); }
  }, []);

  const fetchRows = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setRows([]); setPage(0); setHasMore(true); }
    else setLoadingMore(true);
    setError("");

    const offset = reset ? 0 : page * PAGE_SIZE;

    try {
      let query;
      if (lbType === "grass_score") {
        query = supabase.from("Profiles")
          .select("username,grass_score,avatar_url,avatar_emoji,referral_count_successful")
          .order("grass_score", { ascending:false })
          .range(offset, offset + PAGE_SIZE - 1);
      } else if (lbType === "streaks") {
        query = supabase.from("Streaks")
          .select("username,current_streak,best_streak")
          .order("current_streak", { ascending:false })
          .range(offset, offset + PAGE_SIZE - 1);
      } else {
        query = supabase.from("Profiles")
          .select("username,referral_count_successful,grass_score,avatar_url,avatar_emoji")
          .order("referral_count_successful", { ascending:false })
          .range(offset, offset + PAGE_SIZE - 1);
      }

      const { data, error: err } = await query;
      if (err) throw err;

      // For streaks, join grass_score from Profiles
      let enriched = data || [];
      if (lbType === "streaks" && enriched.length > 0) {
        const usernames = enriched.map(r => r.username);
        const { data: profiles } = await supabase.from("Profiles")
          .select("username,grass_score,avatar_url,avatar_emoji,referral_count_successful")
          .in("username", usernames);
        const profileMap = Object.fromEntries((profiles||[]).map(p=>[norm(p.username),p]));
        enriched = enriched.map(r => ({ ...r, ...profileMap[norm(r.username)] }));
      }

      if (reset) {
        setRows(enriched);
      } else {
        setRows(prev => [...prev, ...enriched]);
      }
      setHasMore(enriched.length === PAGE_SIZE);
      setPage(reset ? 1 : page + 1);
    } catch(e) {
      setError("Couldn't load the leaderboard. Try again.");
    }

    setLoading(false); setLoadingMore(false);
  }, [lbType, timeFilter, page]);

  useEffect(() => { fetchRows(true); }, [lbType, timeFilter]);

  const checkRank = useCallback(async () => {
    const u = norm(rankInput);
    if (!u) return;
    setRankLoading(true); setRankError(""); setRankResult(null);
    try {
      const [{ data:pr }, { data:sr }, { data:allGs }] = await Promise.all([
        supabase.from("Profiles").select("grass_score,referral_count_successful,avatar_url")
          .ilike("username",u).maybeSingle(),
        supabase.from("Streaks").select("current_streak,best_streak")
          .ilike("username",u).maybeSingle(),
        supabase.from("Profiles").select("username,grass_score")
          .order("grass_score",{ascending:false}),
      ]);
      if (!pr && !sr) { setRankError("Username not found."); setRankLoading(false); return; }
      const rank = (allGs||[]).findIndex(r=>norm(r.username)===u) + 1;
      const pct  = allGs?.length ? ((rank/allGs.length)*100).toFixed(1) : "—";
      setRankResult({
        username:u, rank, total:allGs?.length||0, pct,
        grassScore: pr?.grass_score ?? 0,
        bestStreak: sr?.best_streak ?? 0,
        currentStreak: sr?.current_streak ?? 0,
        refs: pr?.referral_count_successful ?? 0,
        avatarUrl: pr?.avatar_url ?? null,
      });
    } catch(e) { setRankError("Failed to load rank."); }
    setRankLoading(false);
  }, [rankInput]);

  const css = V2GlobalCSS + `
    .lb-type-btn { padding:12px 18px; border-radius:14px; cursor:pointer;
      border:1.5px solid ${V2.borderSoft}; font-family:${V2.fontSans};
      font-size:13px; font-weight:600; transition:all 0.15s; white-space:nowrap; }
    .lb-type-btn.active { background:${V2.grassGreen}; color:white;
      border-color:${V2.grassGreen}; box-shadow:0 2px 12px rgba(125,200,50,0.3); }
    .lb-type-btn.inactive { background:white; color:${V2.forestGreen}; }
    .lb-time-btn { padding:8px 16px; border-radius:20px; cursor:pointer;
      border:1.5px solid ${V2.borderSoft}; font-family:${V2.fontSans};
      font-size:12px; font-weight:600; transition:all 0.15s; white-space:nowrap; }
    .lb-time-btn.active { background:${V2.forestGreen}; color:white; border-color:${V2.forestGreen}; }
    .lb-time-btn.inactive { background:white; color:${V2.forestGreen}; }
    .lb-time-btn.soon { opacity:0.4; cursor:default; }
    @media(max-width:600px) {
      .lb-secondary { display:none !important; }
    }
  `;

  const LB_TYPES = [
    { id:"grass_score", icon:"🌿", label:"Grass Score",       sub:"Overall progression" },
    { id:"streaks",     icon:"🔥", label:"Streaks",           sub:"Consistency"         },
    { id:"community",   icon:"🤝", label:"Community Builder", sub:"Referrals"           },
  ];

  return (
    <>
      <Head>
        <title>Outdoor Leaderboard | Proof of Grass</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html:css }} />

      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)" }}>

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav style={{ position:"sticky", top:0, zIndex:200, height:64,
          display:"flex", alignItems:"center", padding:"0 clamp(14px,4vw,40px)", gap:20,
          background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${V2.borderSoft}`,
          boxShadow:"0 2px 16px rgba(26,74,10,0.07)" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10,
            textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:36, height:36, objectFit:"contain" }} />
            <span style={{ fontFamily:V2.fontSans, fontSize:16, fontWeight:800, color:V2.forestGreen }}>
              Touch Grass <span style={{ fontWeight:400, opacity:0.5 }}>| Proof of Grass</span>
            </span>
          </Link>
          <div style={{ display:"flex", gap:4, flex:1, overflowX:"auto", scrollbarWidth:"none" }}>
            {[["Dashboard","/"],["Leaderboard","/leaderboard"],["Grass Draw","/grass-draw"],["Marketplace","/marketplace"]].map(([l,h])=>(
              <Link key={l} href={h} style={{ fontSize:13, fontWeight:l==="Leaderboard"?700:500,
                color:l==="Leaderboard"?V2.grassGreen:V2.forestGreen,
                textDecoration:"none", padding:"6px 12px", borderRadius:20, whiteSpace:"nowrap" }}>{l}</Link>
            ))}
          </div>
          {currentUser && (
            <Link href={`/u/${currentUser}`} style={{ display:"flex", alignItems:"center", gap:8,
              background:"white", border:`1px solid ${V2.borderSoft}`, borderRadius:20,
              padding:"6px 14px", textDecoration:"none", flexShrink:0 }}>
              <span style={{ fontSize:16 }}>🌿</span>
              <span style={{ fontSize:13, fontWeight:600, color:V2.forestGreen }}>@{currentUser}</span>
            </Link>
          )}
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div style={{ position:"relative", overflow:"hidden", minHeight:500,
          background:"linear-gradient(160deg,#c5e3f7 0%,#d8f0e8 60%,#e8f4fd 100%)",
          padding:"40px clamp(14px,4vw,48px) 32px" }}>

          {/* Banner image */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
            <img src="/leaderboard-banner.png" alt=""
              style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }} />
          </div>
          {/* Overlay */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none",
            background:"linear-gradient(90deg,rgba(197,227,247,0.95) 0%,rgba(197,227,247,0.80) 55%,rgba(197,227,247,0.15) 100%)" }} />

          <div style={{ position:"relative", maxWidth:560 }}>
            {/* Community badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:16,
              background:"rgba(255,255,255,0.85)", border:`1px solid ${V2.borderGreen}`,
              borderRadius:20, padding:"6px 16px" }}>
              <span style={{ fontSize:14 }}>🌿</span>
              <span style={{ fontSize:12, fontWeight:700, letterSpacing:"0.1em",
                textTransform:"uppercase", color:V2.grassGreen }}>Community</span>
            </div>

            <h1 style={{ fontFamily:V2.fontSans, fontWeight:900,
              fontSize:"clamp(32px,6vw,60px)", color:V2.forestGreen,
              lineHeight:1.1, marginBottom:14 }}>
              The Outdoor<br/>Leaderboard
            </h1>
            <p style={{ fontSize:15, color:V2.textBody, lineHeight:1.6, marginBottom:28, maxWidth:420 }}>
              Daily proofs, milestones, badges, and referrals — every contribution counts.
            </p>

            {/* LB type buttons */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
              {LB_TYPES.map(t => (
                <button key={t.id} onClick={()=>setLbType(t.id)}
                  className={`lb-type-btn ${lbType===t.id?"active":"inactive"}`}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:18 }}>{t.icon}</span>
                    <div style={{ textAlign:"left" }}>
                      <div>{t.label}</div>
                      <div style={{ fontSize:10, opacity:0.7, fontWeight:400 }}>{t.sub}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Time filters */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>setTimeFilter("all")}
                className={`lb-time-btn ${timeFilter==="all"?"active":"inactive"}`}>
                🏆 All Time
              </button>
              <button onClick={()=>setTimeFilter("week")}
                className={`lb-time-btn ${timeFilter==="week"?"active":"inactive"}`}>
                📅 This Week
              </button>
              <button className="lb-time-btn soon" disabled>
                👥 Friends <span style={{ fontSize:9, background:V2.grassGreen, color:"white",
                  borderRadius:20, padding:"1px 6px", marginLeft:4 }}>SOON</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth:960, margin:"0 auto", padding:"24px clamp(14px,4vw,24px) 80px" }}>

          {/* ── CHECK YOUR RANK ──────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:20, padding:"24px",
            boxShadow:"0 4px 24px rgba(26,74,10,0.10)", border:`1px solid ${V2.borderSoft}`,
            marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
              gap:20, flexWrap:"wrap" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>🌱</span>
                  <span style={{ fontSize:16, fontWeight:800, color:V2.forestGreen }}>Check Your Rank</span>
                </div>
                <div style={{ fontSize:13, color:V2.textMuted }}>Type your username to see where you stand.</div>
              </div>
              <div style={{ display:"flex", gap:10, flex:1, minWidth:240, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:160, display:"flex", alignItems:"center", gap:8,
                  background:"rgba(125,200,50,0.04)", border:`1.5px solid ${V2.borderSoft}`,
                  borderRadius:12, padding:"10px 14px" }}>
                  <span style={{ fontSize:16, color:V2.midGray }}>🔍</span>
                  <input value={rankInput} onChange={e=>setRankInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&checkRank()}
                    placeholder="Enter username..."
                    style={{ flex:1, border:"none", outline:"none", fontSize:14,
                      color:V2.forestGreen, background:"transparent", fontFamily:V2.fontSans }} />
                </div>
                <button onClick={checkRank} disabled={rankLoading||!rankInput}
                  style={{ ...V2Styles.btnPrimary, padding:"10px 20px", fontSize:13,
                    opacity:!rankInput?0.5:1 }}>
                  {rankLoading ? "Loading…" : "🌿 Check Rank"}
                </button>
              </div>
            </div>
            {rankError && (
              <div style={{ marginTop:12, fontSize:13, color:"#e05050" }}>{rankError}</div>
            )}
          </div>

          {/* ── LEADERBOARD LIST ──────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:20, overflow:"hidden",
            boxShadow:"0 4px 24px rgba(26,74,10,0.10)", border:`1px solid ${V2.borderSoft}`,
            marginBottom:24 }}>

            {/* Header */}
            <div style={{ padding:"20px 24px", borderBottom:`1px solid ${V2.borderSoft}`,
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18 }}>🌱</span>
                  <span style={{ fontSize:16, fontWeight:800, color:V2.forestGreen }}>
                    Top Grass Touchers
                  </span>
                </div>
                <div style={{ fontSize:12, color:V2.midGray, marginTop:3 }}>
                  Ranked by {lbType==="grass_score"?"Grass Score":lbType==="streaks"?"Current Streak":"Referrals"}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6,
                background:"rgba(125,200,50,0.08)", borderRadius:20, padding:"6px 12px" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:V2.grassGreen,
                  boxShadow:`0 0 6px ${V2.grassGreen}` }} />
                <span style={{ fontSize:11, fontWeight:700, color:V2.grassGreen }}>Updating Live</span>
              </div>
            </div>

            {/* Rows */}
            {loading ? (
              Array.from({length:8}).map((_,i) => <SkelRow key={i} />)
            ) : error ? (
              <div style={{ padding:"60px 24px", textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>😕</div>
                <div style={{ fontSize:14, fontWeight:700, color:V2.forestGreen, marginBottom:8 }}>{error}</div>
                <button onClick={()=>fetchRows(true)}
                  style={{ ...V2Styles.btnPrimary, fontSize:13 }}>Retry</button>
              </div>
            ) : rows.length === 0 ? (
              <div style={{ padding:"60px 24px", textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🌱</div>
                <div style={{ fontSize:14, fontWeight:700, color:V2.forestGreen, marginBottom:6 }}>
                  No entries yet
                </div>
                <div style={{ fontSize:13, color:V2.midGray }}>
                  Be the first to log a Proof and start climbing.
                </div>
              </div>
            ) : (
              rows.map((row, i) => (
                <LBRow key={row.username || i}
                  row={row} rank={i+1} lbType={lbType}
                  isCurrentUser={currentUser && norm(row.username)===currentUser} />
              ))
            )}

            {/* Load more */}
            {!loading && hasMore && rows.length > 0 && (
              <div style={{ padding:"16px 24px", textAlign:"center",
                borderTop:`1px solid ${V2.borderSoft}` }}>
                <button onClick={()=>fetchRows(false)} disabled={loadingMore}
                  style={{ ...V2Styles.btnSecondary, fontSize:13, padding:"10px 24px" }}>
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
          </div>

          {/* ── USER RANK SUMMARY ────────────────────────────────────────── */}
          {rankResult && (
            <div style={{ background:"linear-gradient(135deg,rgba(125,200,50,0.08),rgba(125,200,50,0.04))",
              borderRadius:20, padding:"28px 24px",
              boxShadow:"0 4px 24px rgba(26,74,10,0.10)",
              border:`1.5px solid ${V2.borderGreen}`,
              display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>

              {/* Avatar + headline */}
              <div style={{ display:"flex", alignItems:"center", gap:16, flex:1, minWidth:200 }}>
                <div style={{ width:64, height:64, borderRadius:"50%", flexShrink:0,
                  background:V2.gradientGrassBtn, border:`3px solid white`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:28, overflow:"hidden", boxShadow:V2.shadowGlow }}>
                  {rankResult.avatarUrl
                    ? <img src={rankResult.avatarUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
                    : "🌿"}
                </div>
                <div>
                  <div style={{ fontFamily:V2.fontSans, fontSize:18, fontWeight:800,
                    color:V2.forestGreen, marginBottom:4 }}>
                    You are in the top {rankResult.pct}%
                  </div>
                  <div style={{ fontSize:13, color:V2.grassGreen, fontWeight:600 }}>
                    Keep touching grass and climb higher!
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:"flex", gap:20, flexWrap:"wrap", flexShrink:0 }}>
                {[
                  { label:"Your Rank",   value:`#${rankResult.rank}`,                    sub:`Top ${rankResult.pct}%`     },
                  { label:"Grass Score", value:rankResult.grassScore.toLocaleString(),   sub:`↑ ${rankResult.refs} refs`  },
                  { label:"Best Streak", value:`${rankResult.bestStreak}d`,              sub:"Keep it up!"                },
                ].map(s=>(
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em",
                      textTransform:"uppercase", color:V2.midGray, marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontFamily:V2.fontSerif, fontSize:28, fontWeight:700,
                      color:V2.forestGreen, lineHeight:1, marginBottom:3 }}>{s.value}</div>
                    <div style={{ fontSize:11, color:V2.grassGreen, fontWeight:600 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ────────────────────────────────────────────────── */}
      <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:150,
        height:64, display:"flex", alignItems:"stretch",
        background:"rgba(255,255,255,0.96)", backdropFilter:"blur(20px)",
        borderTop:`1px solid ${V2.borderSoft}`,
        boxShadow:"0 -2px 20px rgba(26,74,10,0.08)" }}>
        <style>{`@media(min-width:768px){.lb-bottom-nav{display:none!important;}}`}</style>
        {[
          { href:"/",             label:"Home",        icon:"🏠" },
          { href:"/#upload",      label:"Log Proof",   icon:"🌿" },
          { href:`/u/${currentUser||""}`, label:"Profile", icon:"👤" },
          { href:"/leaderboard",  label:"Leaderboard", icon:"🏆", active:true },
          { href:"/grass-draw",   label:"Grass Draw",  icon:"🌱" },
        ].map((tab,i)=>(
          <Link key={i} href={tab.href} style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:3, textDecoration:"none",
            color:tab.active?V2.grassGreen:V2.midGray, fontSize:10,
            fontWeight:tab.active?700:500, fontFamily:V2.fontSans }}>
            <span style={{ fontSize:20 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}