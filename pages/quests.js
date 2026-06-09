import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:"#0a0b08", bg2:"#111209", bg3:"#181a12", bg4:"#1e2016",
  border:"rgba(255,255,255,0.06)", borderG:"rgba(147,168,90,0.18)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.48)", dim:"rgba(240,239,234,0.22)",
};

function norm(v) { return String(v??"").replace(/@/g,"").toLowerCase().trim(); }

// ─── Quest definitions (mirrors DB seed) ─────────────────────────────────────
const DEXSCREENER_URL = "https://dexscreener.com/solana/HCSSW5tyLPCRUYcVUxRfYtmJQ3niAPzstsPHg8srt5CH";

const QUEST_DEFS = [
  { slug:"daily-proof",      title:"Daily Proof",            desc:"Submit your proof of grass today.",            type:"daily",   xp:25,  tokens:100, icon:"☀️", target:1 },
  { slug:"vote-dexscreener", title:"Vote on DexScreener",    desc:"Boost $TOUCHGRASS — vote on DexScreener.",    type:"daily",   xp:50,  tokens:200, icon:"🗳️", target:1, link:DEXSCREENER_URL },
  { slug:"flex-profile-weekly", title:"Flex Your Profile",   desc:"Share your Proof of Grass flex card on X this week.", type:"weekly",  xp:75,  tokens:0,   icon:"✨", target:1, link:null },
  { slug:"challenge-friend", title:"Challenge a Friend",     desc:"Challenge another user to a 7-day streak.",   type:"weekly",  xp:50,  tokens:200, icon:"⚡", target:1 },
  { slug:"reach-day-30",     title:"Reach Day 30",           desc:"Build a 30-day streak and unlock Elite rank.", type:"ongoing", xp:75,  tokens:0,   icon:"🔥", target:1 },
  { slug:"reach-day-50",     title:"Reach Day 50",           desc:"Reach Legendary status with a 50-day streak.", type:"ongoing", xp:150, tokens:0,   icon:"🌟", target:1 },
  { slug:"log-7-days",       title:"7-Day Streak",           desc:"Log outdoor proof 7 days in a row.",           type:"ongoing", xp:40,  tokens:100, icon:"📅", target:7 },
];

const BADGE_DEFS = [
  { id:"rooted",      emoji:"🌱", name:"Rooted",            desc:"14-day streak",            condition: (s,c) => s >= 14 },
  { id:"explorer",    emoji:"🏔️", name:"Explorer",          desc:"Submit from 3+ locations", condition: (s,c) => c >= 3  },
  { id:"challenger",  emoji:"🔥", name:"Challenge Veteran", desc:"Complete 3 challenges",    condition: (s,c,ch) => ch >= 3 },
  { id:"consistency", emoji:"☀️", name:"Consistency King",  desc:"50-day streak",            condition: (s) => s >= 50 },
  { id:"builder",     emoji:"🤝", name:"Community Builder", desc:"Send 3+ challenges",       condition: (s,c,ch,sent) => sent >= 3 },
  { id:"legendary",   emoji:"🏆", name:"Legendary",         desc:"50-day streak",            condition: (s) => s >= 50 },
];

const FEED_ITEMS = [
  { username:"drey_0011",   action:"completed",  target:"Daily Proof",        time:"2m ago",   emoji:"🌿" },
  { username:"kerrymcook",  action:"unlocked",   target:"Legendary badge",    time:"14m ago",  emoji:"🏆" },
  { username:"kato",        action:"completed",  target:"30-Day Challenge",   time:"1h ago",   emoji:"🔥" },
  { username:"firstkhal",   action:"earned",     target:"Explorer Badge",     time:"2h ago",   emoji:"🏔️" },
  { username:"nixart001",   action:"challenged", target:"@drey_0011",         time:"3h ago",   emoji:"⚡" },
];

// ─── Circular progress SVG ────────────────────────────────────────────────────
function CircularProgress({ pct, size = 90, stroke = 6 }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={T.gold} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition:"stroke-dasharray 1.2s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill={T.white} fontSize={size * 0.2} fontWeight={700}
        fontFamily="'Cormorant Garamond',Georgia,serif"
        style={{ transform:"rotate(90deg)", transformOrigin:"center" }}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── Quest card ───────────────────────────────────────────────────────────────
function QuestCard({ quest, progress, completed, onComplete }) {
  const prog    = progress?.progress ?? 0;
  const fill    = quest.target > 0 ? Math.min(100, Math.round((prog / quest.target) * 100)) : 0;
  const isDone  = completed || progress?.completed;
  const hasLink = !!quest.link;

  const handleClick = () => {
    if (!hasLink) return;
    // For daily link quests, mark complete on click via localStorage
    if (quest.slug === "vote-dexscreener" && !isDone) {
      try {
        localStorage.setItem("pog_dex_voted", new Date().toISOString());
        onComplete?.(quest.slug);
      } catch(e) {}
    }
    window.open(quest.link, "_blank", "noopener,noreferrer");
  };

  return (
    <div onClick={hasLink ? handleClick : undefined} style={{
      display:"flex", alignItems:"center", gap:14,
      padding:"16px 18px", marginBottom:8,
      background: isDone ? `${T.olive}08` : T.bg2,
      border:`1px solid ${isDone ? T.olive : hasLink ? T.borderG : T.border}`,
      borderRadius:14, transition:"all 0.2s",
      cursor: hasLink ? "pointer" : "default",
    }}
    onMouseEnter={e => { if (hasLink) e.currentTarget.style.borderColor = T.olive; }}
    onMouseLeave={e => { if (hasLink) e.currentTarget.style.borderColor = T.borderG; }}>
      {/* Icon */}
      <div style={{
        width:50, height:50, borderRadius:12, flexShrink:0,
        background: isDone ? `${T.olive}18` : T.bg3,
        border:`1px solid ${isDone ? T.olive : T.border}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
      }}>{quest.icon}</div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:T.white, marginBottom:3 }}>{quest.title}</div>
        <div style={{ fontSize:11, color:T.dim, lineHeight:1.5 }}>{quest.desc}</div>
        {hasLink && (
          <div style={{ marginTop:6, fontSize:10, color:T.olive, fontWeight:600,
            letterSpacing:"0.08em", display:"flex", alignItems:"center", gap:4 }}>
            Tap to vote ↗
          </div>
        )}
        {quest.target > 1 && (
          <div style={{ marginTop:8 }}>
            <div style={{ height:2, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${fill}%`, background:`linear-gradient(90deg,${T.olive},${T.gold})`, borderRadius:99, transition:"width 1s ease" }} />
            </div>
          </div>
        )}
      </div>

      {/* Reward + Status */}
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.olive, marginBottom:2 }}>+{quest.xp} XP</div>
        {quest.tokens > 0 && <div style={{ fontSize:10, color:T.gold, marginBottom:6 }}>◎ {quest.tokens}</div>}
        <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:"flex-end" }}>
          {isDone ? (
            <>
              <span style={{ fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", color:T.olive, fontWeight:700 }}>Completed</span>
              <span style={{ fontSize:14 }}>✅</span>
            </>
          ) : (
            <>
              <span style={{ fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", color:T.dim }}>
                {quest.target > 1 ? `${prog}/${quest.target}` : "In Progress"}
              </span>
              <div style={{ width:14, height:14, borderRadius:"50%", border:`1.5px solid ${T.border}` }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Badge item ───────────────────────────────────────────────────────────────
function BadgeItem({ badge, earned }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      gap:8, opacity:earned ? 1 : 0.25 }}>
      <div style={{
        width:60, height:60, borderRadius:16,
        background: earned ? `${T.olive}14` : "transparent",
        border:`1.5px solid ${earned ? T.olive : T.border}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:24,
        boxShadow: earned ? `0 0 16px ${T.olive}22` : "none",
      }}>{badge.emoji}</div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:10, fontWeight:700, color:earned ? T.white : T.dim,
          letterSpacing:"0.04em", marginBottom:2 }}>{badge.name}</div>
        <div style={{ fontSize:9, color:T.dim }}>{badge.desc}</div>
      </div>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label }) {
  return (
    <div style={{ flex:"1 1 0", minWidth:0, display:"flex", flexDirection:"column",
      alignItems:"center", gap:4, padding:"16px 8px",
      borderRight:`1px solid ${T.border}` }}>
      <span style={{ fontSize:20 }}>{icon}</span>
      <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
        fontSize:"clamp(22px,4vw,32px)", fontWeight:700, color:T.white, lineHeight:1 }}>{value}</span>
      <span style={{ fontSize:9, color:T.dim, letterSpacing:"0.12em",
        textTransform:"uppercase", textAlign:"center" }}>{label}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function QuestsPage() {
  const [username,     setUsername]     = useState("");
  const [streakRow,    setStreakRow]    = useState(null);
  const [subCount,     setSubCount]    = useState(0);
  const [questProgress,setQuestProgress] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [communityCount, setCommunityCount] = useState(8642);
  const [totalProofs,  setTotalProofs] = useState(0);
  const [challengesSent, setChallengesSent] = useState(0);
  const [challengesDone, setChallengesDone] = useState(0);
  const [loading,      setLoading]     = useState(true);
  const [mounted,      setMounted]     = useState(false);
  const WEEKLY_GOAL = 12000;
  const MONTHLY_GOAL = 10000;

  useEffect(() => {
    setMounted(true);
    const saved = typeof window !== "undefined" ? localStorage.getItem("pog_username") : null;
    if (saved) setUsername(norm(saved));
  }, []);

  // Community stats — no username needed
  useEffect(() => {
    (async () => {
      const weekStart = new Date();
      weekStart.setUTCHours(0,0,0,0);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

      const [{ count: weekSubs }, { count: allSubs }] = await Promise.all([
        supabase.from("Submissions").select("id", { count:"exact", head:true })
          .in("status",["pending","approved"])
          .gte("created_at", weekStart.toISOString()),
        supabase.from("Submissions").select("id", { count:"exact", head:true })
          .in("status",["pending","approved"]),
      ]);
      setCommunityCount(weekSubs ?? 0);
      setTotalProofs(allSubs ?? 0);
    })();
  }, []);

  // User-specific data
  useEffect(() => {
    if (!username) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const todayStr = new Date().toISOString().slice(0,10);
      const weekStart = new Date();
      weekStart.setUTCHours(0,0,0,0);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

      const [{ data: sr }, { count: subs }, { count: chalSent }, { count: chalDone }] = await Promise.all([
        supabase.from("Streaks").select("current_streak,best_streak,shield_count").eq("username", username).maybeSingle(),
        supabase.from("Submissions").select("id",{count:"exact",head:true}).eq("username",username).in("status",["pending","approved"]),
        supabase.from("Challenges").select("id",{count:"exact",head:true}).eq("challenger",username),
        supabase.from("Challenges").select("id",{count:"exact",head:true})
          .or(`challenger.eq.${username},challenged.eq.${username}`)
          .eq("status","completed"),
      ]);

      setStreakRow(sr);
      setSubCount(subs ?? 0);
      setChallengesSent(chalSent ?? 0);
      setChallengesDone(chalDone ?? 0);

      // Auto-compute quest completion from real data
      const streak   = sr?.current_streak ?? 0;
      const todayStr2 = new Date().toISOString().slice(0,10);

      // Check if user has a submission today
      const { count: todaySubs } = await supabase.from("Submissions")
        .select("id",{count:"exact",head:true})
        .eq("username",username).in("status",["pending","approved"])
        .gte("created_at", new Date(todayStr2).toISOString());

      // Check challenges sent this week
      const { count: weekChal } = await supabase.from("Challenges")
        .select("id",{count:"exact",head:true})
        .eq("challenger",username)
        .gte("created_at", weekStart.toISOString());

      // Check if user flexed this week via localStorage
      let flexedThisWeek = false;
      try {
        const flexKey = localStorage.getItem("pog_flexed_week");
        if (flexKey) {
          const flexedWeekStart = new Date(flexKey);
          flexedThisWeek = flexedWeekStart >= weekStart;
        }
      } catch(e) {}

      const progress = {
        "daily-proof":      { progress: todaySubs ?? 0,      completed: (todaySubs ?? 0) >= 1 },
        "flex-profile-weekly": { progress: flexedThisWeek ? 1 : 0, completed: flexedThisWeek },
        "vote-dexscreener": (() => {
          // Daily reset — check if voted today via localStorage
          try {
            const key = "pog_dex_voted";
            const stored = localStorage.getItem(key);
            if (stored) {
              const votedDate = stored.slice(0, 10);
              const today2    = new Date().toISOString().slice(0, 10);
              if (votedDate === today2) return { progress: 1, completed: true };
            }
          } catch(e) {}
          return { progress: 0, completed: false };
        })(),
        "challenge-friend": { progress: weekChal ?? 0,       completed: (weekChal ?? 0) >= 1  },
        "reach-day-30":     { progress: Math.min(streak,30), completed: streak >= 30           },
        "reach-day-50":     { progress: Math.min(streak,50), completed: streak >= 50           },
        "log-7-days":       { progress: Math.min(streak,7),  completed: streak >= 7            },
      };
      setQuestProgress(progress);
      setLoading(false);
    })();
  }, [username]);

  const streak         = streakRow?.current_streak ?? 0;
  const communityPct   = Math.min(100, Math.round((communityCount / WEEKLY_GOAL) * 100));
  const monthlyPct     = Math.min(100, Math.round((totalProofs / MONTHLY_GOAL) * 100));
  const questsDone     = Object.values(questProgress).filter(p => p?.completed).length;
  const xpEarned       = QUEST_DEFS.filter(q => questProgress[q.slug]?.completed).reduce((s,q) => s + q.xp, 0);
  const badgesEarned   = BADGE_DEFS.filter(b => b.condition(streak, subCount, challengesDone, challengesSent)).length;

  const filteredQuests = QUEST_DEFS.filter(q => {
    if (activeFilter === "all")       return true;
    if (activeFilter === "daily")     return q.type === "daily";
    if (activeFilter === "weekly")    return q.type === "weekly";
    if (activeFilter === "ongoing")   return q.type === "ongoing";
    if (activeFilter === "completed") return questProgress[q.slug]?.completed;
    return true;
  });

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
    @keyframes logoFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
    .fade{animation:fadeUp 0.6s ease both;}
    .fade2{animation:fadeUp 0.6s 0.1s ease both;}
    .nav-lk{color:${T.dim};font-size:13px;font-weight:500;text-decoration:none;transition:color 0.2s;}
    .nav-lk:hover{color:${T.white};}
    .nav-lk.active{color:${T.olive};}
    .filter-btn{padding:8px 16px;border-radius:6px;border:1px solid ${T.border};cursor:pointer;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;transition:all 0.2s;background:transparent;color:${T.dim};}
    .filter-btn:hover{border-color:${T.olive};color:${T.olive};}
    .filter-active{background:${T.olive}!important;color:#0e1108!important;border-color:${T.olive}!important;}
    .card{background:${T.bg2};border:1px solid ${T.border};border-radius:14px;padding:22px;}
    .ct{font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${T.muted};margin-bottom:16px;}
    .stat-strip>div:last-child{border-right:none!important;}
    @media(max-width:640px){
      .nav-links{display:none!important;}
      .stat-strip{flex-wrap:wrap!important;}
      .stat-strip>div{min-width:50%!important;}
      .badge-grid{grid-template-columns:repeat(3,1fr)!important;}
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <nav style={{ position:"sticky", top:0, zIndex:200, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56, gap:12,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:26, height:26, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>
          <div className="nav-links" style={{ display:"flex", gap:24, alignItems:"center" }}>
            <Link href="/" className="nav-lk">Dashboard</Link>
            <Link href="/leaderboard" className="nav-lk">Leaderboard</Link>
            {username && <Link href={`/u/${username}`} className="nav-lk">Profile</Link>}
            <Link href="/quests" className="nav-lk active">Quests</Link>
          </div>
          {mounted && username && (
            <Link href={`/u/${username}`} style={{ display:"flex", alignItems:"center", gap:6,
              padding:"5px 10px", borderRadius:8, border:`1px solid ${T.borderG}`,
              fontSize:11, color:T.olive, textDecoration:"none", flexShrink:0, whiteSpace:"nowrap" }}>
              ◎ @{username}{streak > 0 && ` · ${streak}d`}
            </Link>
          )}
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section style={{ position:"relative", overflow:"hidden",
          minHeight:"clamp(240px,36vh,380px)", display:"flex", alignItems:"flex-end" }}>
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(155deg,#1a2d0e,#2d4a18 22%,#1a3010 52%,#0a1508)" }}>
            <div style={{ position:"absolute", inset:0, opacity:0.25,
              backgroundImage:"radial-gradient(ellipse at 75% 25%,#4a7a28,transparent 55%),radial-gradient(ellipse at 20% 75%,#2d5a18,transparent 45%)" }} />
          </div>
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(180deg,rgba(10,11,8,0.2) 0%,rgba(10,11,8,0.85) 65%,rgba(10,11,8,0.99) 100%)" }} />
          <div style={{ position:"relative", width:"100%", padding:"0 clamp(14px,5vw,64px) 36px",
            display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:16 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="fade" style={{ fontSize:10, letterSpacing:"0.22em", color:T.olive,
                textTransform:"uppercase", marginBottom:10, fontWeight:600 }}>Community</div>
              <h1 className="fade" style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(48px,7vw,88px)", fontWeight:700, color:T.white,
                lineHeight:0.92, letterSpacing:"-0.02em", marginBottom:14 }}>Quests</h1>
              <p className="fade2" style={{ fontSize:14, color:T.muted, lineHeight:1.7,
                fontWeight:300, maxWidth:360 }}>
                Complete quests. Earn badges.<br />Grow the movement.
              </p>
            </div>
            {/* Logo — fills right side of hero */}
            <div className="fade2" style={{ flexShrink:0, display:"flex",
              alignItems:"flex-end", paddingBottom:4 }}>
              <img src="/touchgrass-transparent.png" alt="Touch Grass"
                style={{
                  width:"clamp(100px,18vw,180px)",
                  height:"clamp(100px,18vw,180px)",
                  objectFit:"contain",
                  opacity:0.88,
                  filter:"drop-shadow(0 8px 32px rgba(147,168,90,0.25)) drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
                  animation:"logoFloat 5s ease-in-out infinite",
                }} />
            </div>
          </div>
        </section>

        <div style={{ padding:"28px clamp(14px,5vw,64px)" }}>

          {/* ── COMMUNITY PROGRESS ──────────────────────────────────────── */}
          <div className="card fade" style={{ marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
              <CircularProgress pct={communityPct} size={96} stroke={7} />
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontSize:9, letterSpacing:"0.18em", color:T.dim,
                  textTransform:"uppercase", marginBottom:6 }}>Community Progress</div>
                <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:"clamp(28px,5vw,42px)", fontWeight:700, color:T.white,
                  lineHeight:1, letterSpacing:"-0.02em", marginBottom:4 }}>
                  {communityCount.toLocaleString()}
                  <span style={{ fontSize:"0.45em", color:T.dim, fontWeight:400 }}> / {WEEKLY_GOAL.toLocaleString()}</span>
                </div>
                <div style={{ fontSize:11, color:T.dim, marginBottom:10 }}>Quests completed this week</div>
                <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${communityPct}%`, borderRadius:99,
                    background:`linear-gradient(90deg,${T.olive},${T.gold})`,
                    transition:"width 1.2s ease" }} />
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:9, letterSpacing:"0.16em", color:T.dim,
                  textTransform:"uppercase", marginBottom:6 }}>Weekly Goal</div>
                <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:32, fontWeight:700, color:T.gold, lineHeight:1,
                  marginBottom:6 }}>{WEEKLY_GOAL.toLocaleString()}</div>
                <div style={{ fontSize:11, color:T.dim }}>🌿 TouchGrass Together</div>
              </div>
            </div>
          </div>

          {/* ── FILTERS ────────────────────────────────────────────────── */}
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
            {["all","daily","weekly","ongoing","completed"].map(f => (
              <button key={f} className={`filter-btn${activeFilter===f?" filter-active":""}`}
                onClick={() => setActiveFilter(f)}>
                {f === "all" ? "All Quests" : f}
              </button>
            ))}
          </div>

          {/* ── ACTIVE QUESTS ───────────────────────────────────────────── */}
          <div style={{ marginBottom:24 }}>
            <div className="ct">Active Quests</div>
            {filteredQuests.length === 0 && (
              <div style={{ fontSize:13, color:T.dim, padding:"20px 0" }}>
                {activeFilter === "completed" ? "No quests completed yet." : "No quests in this category."}
              </div>
            )}
            {filteredQuests.map(q => (
              <QuestCard key={q.slug} quest={q}
                progress={questProgress[q.slug]}
                completed={questProgress[q.slug]?.completed}
                onComplete={(slug) => {
                  setQuestProgress(prev => ({
                    ...prev,
                    [slug]: { progress: 1, completed: true },
                  }));
                }}
              />
            ))}
          </div>

          {/* ── FEATURED COMMUNITY QUEST ────────────────────────────────── */}
          <div style={{ marginBottom:24, borderRadius:14, overflow:"hidden",
            background:"linear-gradient(135deg,#1a2d0e,#2a4a1a)",
            border:`1px solid ${T.olive}30`,
            padding:24, position:"relative" }}>
            <div style={{ position:"absolute", right:20, top:20, fontSize:48, opacity:0.15 }}>🌿</div>
            <div style={{ fontSize:9, letterSpacing:"0.18em", color:T.olive,
              textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>
              ✦ Community Quest
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:"clamp(26px,4vw,40px)", fontWeight:700, color:T.white,
              lineHeight:1.1, marginBottom:8 }}>10K Outside</div>
            <div style={{ fontSize:13, color:T.muted, marginBottom:16, maxWidth:320, lineHeight:1.6 }}>
              Let's reach 10,000 outdoor proofs together this month.
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              gap:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:22, fontWeight:700, color:T.white }}>
                    {totalProofs.toLocaleString()}
                    <span style={{ fontSize:14, color:T.dim }}> / {MONTHLY_GOAL.toLocaleString()}</span>
                  </span>
                </div>
                <div style={{ height:4, background:"rgba(255,255,255,0.08)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${monthlyPct}%`, borderRadius:99,
                    background:`linear-gradient(90deg,${T.olive},${T.gold})`,
                    transition:"width 1.2s ease" }} />
                </div>
              </div>
              <div style={{ fontSize:11, color:T.olive, fontWeight:600, flexShrink:0 }}>
                🕐 {new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate() - new Date().getDate()} days left
              </div>
            </div>
          </div>

          {/* ── INVITE A FRIEND QUEST ───────────────────────────────────── */}
          <div className="card fade2" style={{ marginBottom:16 }}>
            <div style={{ fontSize:9, letterSpacing:"0.18em", color:T.olive,
              textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>
              ✦ Community Quest
            </div>
            <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:22, fontWeight:700, color:T.white, marginBottom:6 }}>
                  Invite a Friend
                </div>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.6, marginBottom:10 }}>
                  Grow the movement. Invite someone to start their outdoor streak.
                </div>
                <div style={{ fontSize:11, color:T.olive, fontWeight:600 }}>
                  Counts when they reach Day 10.
                </div>
              </div>
              {username && (
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontSize:9, color:T.dim, letterSpacing:"0.12em",
                    textTransform:"uppercase", marginBottom:7 }}>Your Referral Link</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <div style={{ flex:1, minWidth:0, background:T.bg3,
                      border:`1px solid ${T.border}`, borderRadius:7,
                      padding:"8px 10px", fontSize:10, color:T.muted,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      proofofgrass.app/?ref={username}
                    </div>
                    <button onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/?ref=${username}`
                      ).catch(()=>{});
                    }} style={{
                      background:"transparent", border:`1px solid ${T.borderG}`,
                      borderRadius:7, padding:"8px 12px", fontSize:10,
                      fontWeight:600, color:T.olive, cursor:"pointer", flexShrink:0,
                      fontFamily:"'DM Sans',sans-serif",
                    }}>Copy</button>
                  </div>
                  <div style={{ fontSize:10, color:T.dim, marginTop:6 }}>
                    🤝 Reward: Community Builder badge
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BADGES ──────────────────────────────────────────────────── */}
          <div className="card fade2" style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div className="ct" style={{ margin:0 }}>Badges</div>
              <div style={{ fontSize:11, color:T.dim }}>{badgesEarned}/{BADGE_DEFS.length} earned</div>
            </div>
            <div className="badge-grid" style={{ display:"grid",
              gridTemplateColumns:"repeat(6,1fr)", gap:14 }}>
              {BADGE_DEFS.map(b => (
                <BadgeItem key={b.id} badge={b}
                  earned={b.condition(streak, subCount, challengesDone, challengesSent)} />
              ))}
            </div>
          </div>

          {/* ── YOUR QUEST STATS ────────────────────────────────────────── */}
          <div className="card fade" style={{ marginBottom:16 }}>
            <div className="ct">Your Quest Stats</div>
            <div className="stat-strip" style={{ display:"flex" }}>
              <StatPill icon="⭐" value={questsDone}            label="Quests Completed" />
              <StatPill icon="🔥" value={streak}               label="Day Streak"        />
              <StatPill icon="⚡" value={xpEarned}             label="Total XP Earned"   />
              <StatPill icon="🎖" value={badgesEarned}         label="Badges Earned"     />
            </div>
          </div>

          {/* ── COMMUNITY ACTIVITY FEED ─────────────────────────────────── */}
          <div className="card fade2" style={{ marginBottom:16 }}>
            <div className="ct">Community Activity</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {FEED_ITEMS.map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"10px 14px", background:T.bg3, borderRadius:10,
                  border:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:20 }}>{item.emoji}</span>
                  <div style={{ flex:1 }}>
                    <Link href={`/u/${item.username}`} style={{ fontSize:13,
                      fontWeight:600, color:T.white, textDecoration:"none" }}>
                      @{item.username}
                    </Link>
                    <span style={{ fontSize:13, color:T.dim }}> {item.action} </span>
                    <span style={{ fontSize:13, color:T.muted }}>{item.target}</span>
                  </div>
                  <span style={{ fontSize:10, color:T.dim, flexShrink:0 }}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer style={{ borderTop:`1px solid ${T.border}`, padding:"18px clamp(14px,4vw,48px)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:12, background:T.bg }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:15, height:15, opacity:0.4 }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:12, color:T.dim }}>touch grass © 2024</span>
          </div>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            {[["Dashboard","/"],["Leaderboard","/leaderboard"],["Website","https://touchgrass.today"]].map(([l,h])=>(
              <Link key={l} href={h} style={{ fontSize:10, color:T.dim, textDecoration:"none",
                letterSpacing:"0.08em", textTransform:"uppercase" }}>{l}</Link>
            ))}
          </div>
          <div style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em" }}>BUILT ON ◎ SOLANA</div>
        </footer>

      </div>
    </>
  );
}