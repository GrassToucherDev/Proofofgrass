// pages/u/[username]/index.js — V2 Profile Page (Mockup Match)
import { useState, useEffect, useRef, useCallback } from "react";
import ChallengeModal from "../../../components/ChallengeModal";
import WalletVerify from "../../../components/WalletVerify";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../../../utils/supabase";
import { resolveActiveCover, COVER_DEFINITIONS, isCoverUrlReady } from "../../../utils/coverDefinitions";
import { getSpotlightBadge } from "../../../utils/spotlightBadges";
import { V2, V2Styles, V2GlobalCSS, getV2Tier } from "../../../utils/v2Theme";

function norm(v) { return String(v??"").replace(/@/g,"").toLowerCase().trim(); }

// ── Data constants — all preserved ───────────────────────────────────────────
const REFERRAL_BADGES = [
  { count:1,   slug:"referral_community_builder",    name:"Community Builder",    emoji:"🤝" },
  { count:5,   slug:"referral_grass_recruiter",      name:"Grass Recruiter",      emoji:"🌱" },
  { count:10,  slug:"referral_community_cultivator", name:"Community Cultivator", emoji:"🌿" },
  { count:25,  slug:"referral_growth_leader",        name:"Growth Leader",        emoji:"🌳" },
  { count:50,  slug:"referral_ecosystem_builder",    name:"Ecosystem Builder",    emoji:"🏛"  },
  { count:100, slug:"referral_grass_evangelist",     name:"Grass Evangelist",     emoji:"👑" },
];

const ALL_BADGES = [
  {id:"first-step",     emoji:"🌱", name:"First Step",           desc:"Submit your first proof",          condition:(s,p,cd,cs,gs,sh)=>p>=1     },
  {id:"sun",            emoji:"☀️", name:"Sun Seeker",           desc:"Hold a 7-day streak",              condition:(s,p,cd,cs,gs,sh)=>s>=7     },
  {id:"week",           emoji:"📅", name:"Week Warrior",         desc:"7 consecutive days outside",       condition:(s,p,cd,cs,gs,sh)=>s>=7     },
  {id:"water",          emoji:"💧", name:"Water Walker",         desc:"Reach a 14-day streak",            condition:(s,p,cd,cs,gs,sh)=>s>=14    },
  {id:"forest",         emoji:"🌲", name:"Forest Friend",        desc:"Hold a 30-day streak",             condition:(s,p,cd,cs,gs,sh)=>s>=30    },
  {id:"early",          emoji:"🌅", name:"Early Bird",           desc:"Reach a 50-day streak",            condition:(s,p,cd,cs,gs,sh)=>s>=50    },
  {id:"golden",         emoji:"🌄", name:"Golden Hour",          desc:"50 consecutive days outside",      condition:(s,p,cd,cs,gs,sh)=>s>=50    },
  {id:"century",        emoji:"💯", name:"100 Club",             desc:"Reach a 100-day streak",           condition:(s,p,cd,cs,gs,sh)=>s>=100   },
  {id:"mythic-club",    emoji:"⚡", name:"Mythic Club",          desc:"Reach a 180-day streak",           condition:(s,p,cd,cs,gs,sh)=>s>=180   },
  {id:"eternal-club",   emoji:"👑", name:"Eternal",              desc:"Reach a 365-day streak",           condition:(s,p,cd,cs,gs,sh)=>s>=365   },
  {id:"trail",          emoji:"🏔️", name:"Mountain Goat",        desc:"Submit 10 total proofs",           condition:(s,p,cd,cs,gs,sh)=>p>=10    },
  {id:"proof-machine",  emoji:"⚙️", name:"Nature Lover",         desc:"Submit 50 total proofs",           condition:(s,p,cd,cs,gs,sh)=>p>=50    },
  {id:"century-prover", emoji:"📸", name:"Storm Chaser",         desc:"Submit 100 total proofs",          condition:(s,p,cd,cs,gs,sh)=>p>=100   },
  {id:"ch-starter",     emoji:"⚡", name:"Challenge Starter",    desc:"Send your first challenge",        condition:(s,p,cd,cs,gs,sh)=>cs>=1    },
  {id:"ch-veteran",     emoji:"🎯", name:"Challenge Veteran",    desc:"Complete 3 challenges",            condition:(s,p,cd,cs,gs,sh)=>cd>=3    },
  {id:"gs-1k",          emoji:"🔥", name:"Grass Score 1K",       desc:"Reach a Grass Score of 1,000",    condition:(s,p,cd,cs,gs,sh)=>gs>=1000 },
  {id:"shield",         emoji:"🛡️", name:"Shield Bearer",        desc:"Own at least 1 shield",           condition:(s,p,cd,cs,gs,sh)=>sh>=1    },
];

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w="100%", h=16, r=8 }) {
  return <div style={{ width:w, height:h, borderRadius:r,
    background:"linear-gradient(90deg,rgba(200,220,190,0.3) 0%,rgba(220,235,210,0.5) 50%,rgba(200,220,190,0.3) 100%)",
    backgroundSize:"200% 100%", animation:"v2Shimmer 1.4s ease-in-out infinite" }} />;
}

// ── Stat item ─────────────────────────────────────────────────────────────────
function StatItem({ icon, label, value, sub, chip, loading }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center",
      padding:"16px 8px", background:"white", borderRadius:14,
      boxShadow:"0 1px 8px rgba(26,74,10,0.06)", border:`1px solid ${V2.borderSoft}`,
      minWidth:0, flex:1 }}>
      <div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
        color:V2.midGray, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
        <span>{icon}</span><span>{label}</span>
      </div>
      {loading ? <Skel h={32} r={4} w="60%" /> : (
        <div style={{ fontFamily:V2.fontSerif, fontSize:"clamp(24px,3.5vw,36px)", fontWeight:700,
          color:V2.forestGreen, lineHeight:1, marginBottom:4 }}>{value}</div>
      )}
      {sub && <div style={{ fontSize:10, color:V2.midGray }}>{sub}</div>}
      {chip && <div style={{ marginTop:6, fontSize:9, fontWeight:700, color:V2.grassGreen,
        background:"rgba(125,200,50,0.1)", border:`1px solid ${V2.borderGreen}`,
        borderRadius:20, padding:"2px 10px" }}>{chip}</div>}
    </div>
  );
}

// ── Badge item ────────────────────────────────────────────────────────────────
function BadgeItem({ b }) {
  return (
    <div title={`${b.name} — ${b.desc}`}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6,
        opacity:b.earned?1:0.22, cursor:"default" }}>
      <div style={{ width:56, height:56, borderRadius:16,
        background:b.earned?"white":"rgba(200,220,190,0.2)",
        border:`2px solid ${b.earned?V2.borderGreen:V2.borderSoft}`,
        boxShadow:b.earned?"0 2px 12px rgba(125,200,50,0.2)":"none",
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:26,
        transition:"transform 0.15s" }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e=>e.currentTarget.style.transform=""}>
        {b.emoji}
      </div>
      <div style={{ fontSize:9, fontWeight:600, color:b.earned?V2.forestGreen:V2.midGray,
        textAlign:"center", lineHeight:1.3, maxWidth:64 }}>{b.name}</div>
    </div>
  );
}

// ── Proof card ────────────────────────────────────────────────────────────────
function ProofCard({ proof }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ borderRadius:12, overflow:"hidden", flexShrink:0,
      width:"clamp(120px,30vw,180px)", background:"#e8f4ee",
      border:`1px solid ${V2.borderSoft}`, boxShadow:V2.shadowSm }}>
      {proof.photo_url && !failed
        ? <img src={proof.photo_url} alt="" loading="lazy" onError={()=>setFailed(true)}
            style={{ width:"100%", height:260, objectFit:"cover" }} />
        : <div style={{ height:260, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:32 }}>🌿</div>
      }
      <div style={{ padding:"6px 8px", background:"rgba(255,255,255,0.9)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
          <span style={{ fontSize:9, fontWeight:700, color:V2.grassGreen,
            background:"rgba(125,200,50,0.1)", borderRadius:20, padding:"1px 7px" }}>✓ Verified</span>
        </div>
        <div style={{ fontSize:10, color:V2.midGray }}>{proof.when}</div>
      </div>
    </div>
  );
}

// ── Milestone progress ────────────────────────────────────────────────────────
function MilestoneCard({ current, loading }) {
  const tier  = getV2Tier(current);
  const thresholds = [7,14,30,50,100,180,365,500];
  const prev  = [...[0,...thresholds]].reverse().find(t=>current>=t)??0;
  const next  = thresholds.find(t=>t>current);
  const fill  = next?Math.min(100,Math.round(((current-prev)/(next-prev))*100)):100;
  const nextTier = next?getV2Tier(next):null;

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:V2.midGray }}>
          Milestone Progress
        </div>
        <Link href="/leaderboard" style={{ fontSize:11, color:V2.grassGreen, textDecoration:"none",
          background:"rgba(125,200,50,0.1)", border:`1px solid ${V2.borderGreen}`,
          borderRadius:20, padding:"3px 10px" }}>View All</Link>
      </div>

      {loading ? <Skel h={120} /> : (
        <>
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <div style={{ fontFamily:V2.fontSerif, fontSize:22, fontWeight:700, color:V2.forestGreen, marginBottom:4 }}>
              {current} Day Streak
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:tier.color }}>{tier.emoji} {tier.name}</div>
          </div>

          {/* Badge illustration */}
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <div style={{ width:80, height:80, borderRadius:20,
              background:`linear-gradient(135deg,${tier.color}20,${tier.color}08)`,
              border:`2px solid ${tier.color}40`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:44 }}>
              {tier.emoji}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11, color:V2.midGray }}>{prev} days</span>
              <span style={{ fontSize:11, fontWeight:700, color:V2.grassGreen }}>{current} / {next??current} days</span>
            </div>
            <div style={{ height:10, background:"rgba(200,220,190,0.4)", borderRadius:5, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${fill}%`, borderRadius:5,
                background:V2.gradientGrassBtn, transition:"width 1.2s ease" }} />
            </div>
          </div>

          {/* Next milestone */}
          {next && nextTier && (
            <div style={{ padding:"12px 14px", borderRadius:12,
              background:"rgba(200,220,190,0.15)", border:`1px solid ${V2.borderSoft}` }}>
              <div style={{ fontSize:11, color:V2.midGray, marginBottom:4 }}>Next milestone</div>
              <div style={{ fontFamily:V2.fontSerif, fontSize:16, fontWeight:700, color:V2.forestGreen }}>
                {next} Day Streak
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:nextTier.color }}>{nextTier.name}</div>
              <div style={{ fontSize:11, color:V2.midGray, marginTop:2 }}>{next-current} days away</div>
            </div>
          )}
          {!next && (
            <div style={{ padding:"12px 14px", borderRadius:12,
              background:"rgba(125,200,50,0.08)", border:`1px solid ${V2.borderGreen}`,
              textAlign:"center" }}>
              <div style={{ fontSize:14, fontWeight:700, color:V2.grassGreen }}>✦ Maximum tier reached</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Stats chart (uses actual submission data) ─────────────────────────────────
function StatsOverview({ username, subCount, grassScore }) {
  const [tab, setTab] = useState("30D");
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if(!username) return;
    (async()=>{
      setLoading(true);
      const days = tab==="30D"?30:tab==="90D"?90:180;
      const since = new Date(Date.now()-days*86400000).toISOString();
      const {data} = await supabase.from("Submissions")
        .select("created_at").eq("username",username)
        .in("status",["pending","approved"])
        .gte("created_at",since)
        .order("created_at",{ascending:true});
      // Bucket by week
      const buckets = {};
      (data||[]).forEach(s=>{
        const d = new Date(s.created_at);
        const week = `${d.getFullYear()}-W${Math.floor(d.getDate()/7)}`;
        buckets[week]=(buckets[week]||0)+1;
      });
      setPoints(Object.values(buckets));
      setLoading(false);
    })();
  },[username,tab]);

  const max = Math.max(...points,1);
  const H = 80;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:V2.midGray }}>
          Stats Overview
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {["30D","90D","ALL"].map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:"4px 10px", borderRadius:20, border:"none", cursor:"pointer", fontSize:11,
                fontWeight:700, background:tab===t?V2.grassGreen:"rgba(200,220,190,0.3)",
                color:tab===t?"white":V2.midGray, transition:"all 0.15s" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ height:H+16, marginBottom:14, position:"relative" }}>
        {loading ? <Skel h={H} /> : points.length>0 ? (
          <svg width="100%" height={H} viewBox={`0 0 ${points.length*20} ${H}`} preserveAspectRatio="none"
            style={{ display:"block" }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={V2.grassGreen} stopOpacity="0.3" />
                <stop offset="100%" stopColor={V2.grassGreen} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polyline
              points={points.map((v,i)=>`${i*20+10},${H-Math.round((v/max)*H*0.85)-4}`).join(" ")}
              fill="none" stroke={V2.grassGreen} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <polygon
              points={[
                ...points.map((v,i)=>`${i*20+10},${H-Math.round((v/max)*H*0.85)-4}`),
                `${(points.length-1)*20+10},${H}`, "10,"+H
              ].join(" ")}
              fill="url(#chartGrad)" />
          </svg>
        ) : (
          <div style={{ height:H, display:"flex", alignItems:"center", justifyContent:"center",
            color:V2.midGray, fontSize:12 }}>No data for this period</div>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {[
          { label:"Proofs", value:subCount??0, chip:"+12%" },
          { label:"Grass Score", value:(grassScore||0).toLocaleString(), chip:"+18%" },
          { label:"Consistency", value:"—", chip:null },
        ].map(s=>(
          <div key={s.label} style={{ padding:"10px 8px", borderRadius:10,
            background:"rgba(125,200,50,0.06)", border:`1px solid ${V2.borderSoft}`, textAlign:"center" }}>
            <div style={{ fontFamily:V2.fontSerif, fontSize:18, fontWeight:700,
              color:V2.forestGreen, lineHeight:1, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:9, color:V2.midGray, textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:s.chip?4:0 }}>{s.label}</div>
            {s.chip && <div style={{ fontSize:9, color:V2.grassGreen, fontWeight:700 }}>{s.chip}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skin / Theme panel ────────────────────────────────────────────────────────
function SkinPanel({ activeCover, unlockedCovers, profileRow, isOwner, onEquip }) {
  const owned = COVER_DEFINITIONS.filter(c=>unlockedCovers.includes(c.slug));
  const packName = activeCover?.pack
    ? activeCover.pack.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())
    : "Default Theme";

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
        textTransform:"uppercase", color:V2.midGray, marginBottom:14 }}>Skin / Theme</div>

      {/* Current skin */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px",
        background:"rgba(125,200,50,0.06)", borderRadius:12, border:`1px solid ${V2.borderGreen}`,
        marginBottom:12 }}>
        <div style={{ width:56, height:42, borderRadius:8, overflow:"hidden", flexShrink:0,
          background:activeCover?.fallback||V2.gradientHero }}>
          {activeCover&&isCoverUrlReady(activeCover.imageUrl)&&(
            <img src={activeCover.imageUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:V2.forestGreen, marginBottom:2 }}>{packName}</div>
          {activeCover?.name && <div style={{ fontSize:11, color:V2.midGray }}>{activeCover.name}</div>}
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:V2.grassGreen, flexShrink:0 }}>Applied ✓</div>
      </div>

      {/* Change theme button */}
      <button style={{ width:"100%", padding:"10px", borderRadius:10, border:`1px solid ${V2.borderSoft}`,
        background:"white", color:V2.forestGreen, fontSize:12, fontWeight:700, cursor:"pointer",
        letterSpacing:"0.08em" }}>
        CHANGE THEME
      </button>

      {/* Owned count */}
      {owned.length>0 && (
        <div style={{ marginTop:10, fontSize:11, color:V2.midGray, textAlign:"center" }}>
          {owned.length} cover{owned.length!==1?"s":""} owned
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router   = useRouter();
  const { username:slug } = router.query;
  const username = norm(slug??"");

  const [viewer,          setViewer]          = useState("");
  const isOwner = viewer && viewer===username;

  const [streakRow,       setStreakRow]        = useState(null);
  const [profileRow,      setProfileRow]       = useState(null);
  const [subCount,        setSubCount]         = useState(null);
  const [rank,            setRank]             = useState(null);
  const [totalUsers,      setTotalUsers]       = useState(null);
  const [recentProofs,    setRecentProofs]      = useState([]);
  const [topStreaks,       setTopStreaks]        = useState([]);
  const [challenges,      setChallenges]        = useState([]);
  const [chalProgress,    setChalProgress]      = useState([]);
  const [challengesDone,  setChallengesDone]    = useState(0);
  const [challengesSent,  setChallengesSent]    = useState(0);
  const [loading,         setLoading]           = useState(true);
  const [walletAddr,      setWalletAddr]        = useState(null);
  const [walletVerified,  setWalletVerified]    = useState(false);
  const [copied,          setCopied]            = useState(false);
  const [editMode,        setEditMode]          = useState(false);
  const [showAvatarPicker,setShowAvatarPicker]  = useState(false);
  const [avatarUploading, setAvatarUploading]   = useState(false);
  const [avatarError,     setAvatarError]       = useState("");
  const [showChallenge,   setShowChallenge]     = useState(false);
  const [globalRank,      setGlobalRank]        = useState(null);
  const [scoreBreakdown,  setScoreBreakdown]    = useState({daily_proof:0,streak_milestone:0,badge:0,referral:0,ecosystem:0});
  const [spotlightData,   setSpotlightData]     = useState({count:0,latest:null,badgeCounts:{}});
  const [referrals,       setReferrals]         = useState([]);
  const [refLinkCopied,   setRefLinkCopied]     = useState(false);
  const [inventory,       setInventory]         = useState([]);

  useEffect(()=>{
    const saved = typeof window!=="undefined"?localStorage.getItem("pog_username"):null;
    if(saved) setViewer(norm(saved));
  },[]);

  // ── All data fetching — preserved from V1 ────────────────────────────────
  useEffect(()=>{
    if(!username) return;
    (async()=>{
      setLoading(true);
      const [{data:sr},{data:pr},{data:invRaw},{count:subs}] = await Promise.all([
        supabase.from("Streaks").select("current_streak,best_streak,last_submission_date,shield_count").eq("username",username).maybeSingle(),
        supabase.from("Profiles").select("bio,location,avatar_emoji,avatar_url,avatar_frame,joined_at,wallet_verified,wallet_address,has_touchgrass_holder,has_grass_toucher,has_screen_toucher,referral_count_successful,referral_count_pending,referral_badge,grass_score,active_cover_id,unlocked_covers,lucky_touch_count").eq("username",username).maybeSingle(),
        supabase.from("UserInventory").select("item_id,owned,equipped,purchased_at").eq("username",username).eq("owned",true),
        supabase.from("Submissions").select("id",{count:"exact",head:true}).eq("username",username).in("status",["pending","approved"]),
      ]);
      setInventory(invRaw??[]);

      const [{data:allStreaks},{data:recentSubs},{data:chalRows},{data:referralRows},{data:allScores},{data:spotlightWins}] = await Promise.all([
        supabase.from("Streaks").select("username,current_streak").order("current_streak",{ascending:false}),
        supabase.from("Submissions").select("created_at,photo_url").eq("username",username).in("status",["pending","approved"]).order("created_at",{ascending:false}).limit(6),
        supabase.from("Challenges").select("*").or(`challenger.eq.${username},challenged.eq.${username}`).order("created_at",{ascending:false}).limit(20),
        supabase.from("Referrals").select("referred_username,status,converted_at,created_at").eq("referrer_username",username).order("created_at",{ascending:false}).limit(20),
        supabase.from("Profiles").select("username,grass_score").order("grass_score",{ascending:false}),
        supabase.from("CommunitySpotlights").select("id,category,week_start,display_name").eq("username",username).eq("status","active").order("week_start",{ascending:false}),
      ]);

      const gsRankIdx=(allScores??[]).findIndex(p=>norm(p.username)===username);
      setGlobalRank(gsRankIdx===-1?null:gsRankIdx+1);

      const wins=spotlightWins??[];
      const badgeCounts={};
      wins.forEach(w=>{badgeCounts[w.category]=(badgeCounts[w.category]??0)+1;});
      const latestBadge=wins[0]?getSpotlightBadge(wins[0].category):null;
      setSpotlightData({count:wins.length,badgeCounts,latest:wins[0]?{category:wins[0].category,name:latestBadge?.title??wins[0].category}:null});

      const chalList=chalRows??[];
      setChallenges(chalList);
      setChallengesDone(chalList.filter(c=>c.status==="completed").length);
      setChallengesSent(chalList.filter(c=>norm(c.challenger)===username).length);
      setReferrals(referralRows??[]);

      const activeChalIds=chalList.filter(c=>c.status==="active").map(c=>c.id);
      if(activeChalIds.length>0){
        const{data:progRows}=await supabase.from("ChallengeProgress").select("*").in("challenge_id",activeChalIds);
        setChalProgress(progRows??[]);
      }

      const allRows=allStreaks??[];
      const rankIdx=allRows.findIndex(r=>norm(r.username)===username);
      setStreakRow(sr); setProfileRow(pr);
      setWalletAddr(pr?.wallet_address??null); setWalletVerified(pr?.wallet_verified??false);
      setSubCount(subs??0); setRank(rankIdx>=0?rankIdx+1:null); setTotalUsers(allRows.length||1);
      setTopStreaks((allRows??[]).slice(0,5).map(r=>({username:norm(r.username),streak:r.current_streak??1})));

      const streak=sr?.current_streak??1;
      setRecentProofs((recentSubs??[]).map((sub,i)=>{
        const subDate=new Date(sub.created_at).toISOString().slice(0,10);
        const derivedPath=`${username}/${subDate}.png`;
        const{data:urlData}=supabase.storage.from("proof-photos").getPublicUrl(derivedPath);
        return{day:Math.max(1,streak-i),photo_url:sub.photo_url||urlData?.publicUrl||null,when:new Date(sub.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})};
      }));

      setLoading(false);
    })();
  },[username]);

  useEffect(()=>{
    if(typeof window==="undefined") return;
    const params=new URLSearchParams(window.location.search);
    if(params.get("wallet_verify")!=="1") return;
    const pubkey=params.get("publicKey");
    if(!pubkey||!username) return;
    (async()=>{
      const{error}=await supabase.from("Profiles").upsert({username,wallet_address:pubkey,wallet_verified:true,wallet_verified_at:new Date().toISOString(),holder_tier:"none",wallet_last_checked_at:new Date().toISOString()},{onConflict:"username"});
      if(!error){setWalletAddr(pubkey);setWalletVerified(true);window.history.replaceState({},"",`/u/${username}`);}
    })();
  },[username]);

  const saveField=async(field,value)=>{
    setProfileRow(prev=>({...prev,[field]:value}));
    await supabase.from("Profiles").upsert({username,[field]:value},{onConflict:"username"});
  };
  const equipCover=(slug)=>saveField("active_cover_id",slug);
  const copyProfile=()=>{
    if(typeof window!=="undefined") navigator.clipboard.writeText(window.location.href).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),1800);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const current    = streakRow?.current_streak??0;
  const best       = streakRow?.best_streak??0;
  const shields    = streakRow?.shield_count??0;
  const tier       = getV2Tier(current);
  const pct        = (rank!==null&&totalUsers>0)?((rank/totalUsers)*100).toFixed(1):"—";
  const grassScore = profileRow?.grass_score!=null?profileRow.grass_score:Math.floor(current*38+(subCount??0)*12+best*22);
  const activeCover = resolveActiveCover(profileRow);
  const unlockedCovers = profileRow?.unlocked_covers??[];
  const badges = ALL_BADGES.map(b=>({...b,earned:b.condition(current,subCount??0,challengesDone,challengesSent,grassScore,shields)}));
  const refSuccessful = profileRow?.referral_count_successful??0;
  const joinDate = profileRow?.joined_at?new Date(profileRow.joined_at).toLocaleDateString("en-US",{month:"long",year:"numeric"}):null;

  // Accent from active cover or tier
  const accent = activeCover?.accentColor||tier.color;

  const css = V2GlobalCSS + `
    .pf-hero {
      position: relative; overflow: hidden; width: 100%;
      min-height: clamp(340px,48vh,540px);
      display: flex; align-items: flex-end;
    }
    .pf-hero-scrim {
      position: absolute; inset: 0;
      background: linear-gradient(180deg,
        rgba(255,255,255,0.08) 0%,
        rgba(255,255,255,0.35) 45%,
        rgba(255,255,255,0.92) 100%);
    }
    .pf-content { padding: 0 clamp(14px,4vw,48px); }
    .pf-card {
      background: white; border-radius: 16px;
      border: 1px solid ${V2.borderSoft};
      box-shadow: 0 2px 16px rgba(26,74,10,0.07);
      padding: 20px;
    }
    .pf-stats-row {
      display: grid; grid-template-columns: repeat(6,1fr); gap: 10px;
    }
    .pf-three-col {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
    }
    .pf-two-one-col {
      display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 16px;
    }
    .skel { background: rgba(200,220,190,0.3); border-radius:6px; animation:v2Shimmer 1.4s ease-in-out infinite; }
    .pf-proof-scroll { display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none; }
    .pf-proof-scroll::-webkit-scrollbar { display:none; }
    @media(max-width:900px) {
      .pf-three-col { grid-template-columns: 1fr 1fr !important; }
      .pf-two-one-col { grid-template-columns: 1fr 1fr !important; }
    }
    @media(max-width:640px) {
      .pf-stats-row { grid-template-columns: repeat(2,1fr) !important; }
      .pf-three-col { grid-template-columns: 1fr !important; }
      .pf-two-one-col { grid-template-columns: 1fr !important; }
      .pf-streak-card-desktop { display: none !important; }
    }
    .pf-action-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: white; border: 1.5px solid rgba(200,220,190,0.6);
      border-radius: 20px; padding: 8px 16px;
      font-size: 12px; font-weight: 700; color: ${V2.forestGreen};
      cursor: pointer; text-decoration: none; white-space: nowrap;
      box-shadow: 0 1px 6px rgba(26,74,10,0.08);
      transition: all 0.15s; font-family: ${V2.fontSans};
    }
    .pf-action-btn:hover { background: rgba(125,200,50,0.08); border-color: ${V2.grassGreen}; }
  `;

  return (
    <>
      <Head>
        <title>@{username} — Proof of Grass</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html:css }} />

      {/* V2 Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:200, height:60,
        display:"flex", alignItems:"center", padding:"0 clamp(14px,4vw,40px)", gap:24,
        background:"rgba(255,255,255,0.92)", backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${V2.borderSoft}`,
        boxShadow:"0 2px 16px rgba(26,74,10,0.08)" }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", flexShrink:0 }}>
          <img src="/touchgrass-transparent.png" alt="" style={{ width:32, height:32, objectFit:"contain" }} />
          <span style={{ fontFamily:V2.fontSans, fontSize:15, fontWeight:700, color:V2.forestGreen }}>
            Touch Grass <span style={{ fontWeight:400, opacity:0.6 }}>| Proof of Grass</span>
          </span>
        </Link>
        <div style={{ display:"flex", gap:4, flex:1, overflowX:"auto" }} className="v2-desktop-only">
          {[["Dashboard","/"],["Leaderboard","/leaderboard"],["Grass Draw","/grass-draw"],["Marketplace","/marketplace"]].map(([l,h])=>(
            <Link key={l} href={h} style={{ fontSize:13, fontWeight:500, color:V2.forestGreen,
              textDecoration:"none", padding:"6px 12px", borderRadius:20, whiteSpace:"nowrap" }}>{l}</Link>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, flexShrink:0 }}>
          {isOwner&&<button onClick={()=>setEditMode(v=>!v)} className="pf-action-btn" style={{ fontSize:11, padding:"6px 12px" }}>{editMode?"✓ Done":"✏ Edit"}</button>}
          <button onClick={copyProfile} style={{ ...V2Styles.btnPrimary, padding:"8px 18px", fontSize:12 }}>{copied?"✓ Copied":"↗ Share"}</button>
        </div>
      </nav>

      <div style={{ paddingBottom:80 }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="pf-hero">
          {/* Cover background */}
          {activeCover&&isCoverUrlReady(activeCover.imageUrl)
            ? <div style={{ position:"absolute", inset:0, backgroundImage:`url(${activeCover.imageUrl})`, backgroundSize:"cover", backgroundPosition:"center" }} />
            : activeCover?.fallback
              ? <div style={{ position:"absolute", inset:0, background:activeCover.fallback }} />
              : <div style={{ position:"absolute", inset:0, background:V2.gradientHero }} />
          }
          <div className="pf-hero-scrim" />

          {/* Hero content */}
          <div style={{ position:"relative", width:"100%", padding:"0 clamp(14px,4vw,48px) 28px" }}>
            <div style={{ display:"flex", alignItems:"flex-end", gap:20, flexWrap:"wrap" }}>

              {/* Left — identity */}
              <div style={{ flex:1, minWidth:0 }}>
                {/* Verified badge */}
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, marginBottom:10,
                  background:"rgba(125,200,50,0.18)", border:`1px solid ${V2.borderGreen}`,
                  borderRadius:20, padding:"4px 12px" }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:V2.grassGreen, display:"inline-block" }} />
                  <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:V2.grassGreen }}>Verified Outdoors</span>
                </div>

                {/* Avatar + username row */}
                <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:10 }}>
                  {/* Avatar */}
                  <div style={{ width:80, height:80, borderRadius:"50%", flexShrink:0,
                    background:V2.gradientGrassBtn,
                    border:`3px solid white`,
                    boxShadow:`0 4px 16px rgba(26,74,10,0.2), 0 0 0 3px ${accent}30`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:36, overflow:"hidden", position:"relative",
                    cursor:editMode?"pointer":"default" }}
                    onClick={()=>{ if(editMode)setShowAvatarPicker(true); }}>
                    {profileRow?.avatar_url
                      ? <img src={profileRow.avatar_url} alt="" style={{ width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover" }} />
                      : loading?username?.[0]?.toUpperCase()??"?":(profileRow?.avatar_emoji||"🌿")
                    }
                    {editMode&&<div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✏</div>}
                  </div>

                  <div>
                    <h1 style={{ fontFamily:V2.fontSans, fontWeight:800,
                      fontSize:"clamp(22px,4vw,42px)", color:V2.forestGreen,
                      lineHeight:1, marginBottom:6 }}>@{username||"—"}</h1>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <span style={{ fontSize:12, fontWeight:700, color:accent }}>{tier.emoji} {tier.name}</span>
                      {joinDate && <span style={{ fontSize:12, color:V2.midGray }}>📅 Joined {joinDate}</span>}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {profileRow?.bio && (
                  <p style={{ fontSize:13, color:V2.textBody, lineHeight:1.6, marginBottom:12, maxWidth:400 }}>
                    {profileRow.bio}
                  </p>
                )}
                {editMode && (
                  <div style={{ marginBottom:12 }}>
                    <input defaultValue={profileRow?.bio||""} onBlur={e=>saveField("bio",e.target.value)}
                      placeholder="Add a bio..."
                      style={{ ...V2Styles.input, fontSize:13, maxWidth:400 }} />
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                  <button onClick={copyProfile} className="pf-action-btn">
                    ↗ Share Profile
                  </button>
                  <Link href={`/flex/${username}`} className="pf-action-btn">
                    ✦ Flex Card
                  </Link>
                  {!isOwner&&username&&(
                    <button onClick={()=>setShowChallenge(true)} className="pf-action-btn">
                      ⚡ Challenge
                    </button>
                  )}
                  <button className="pf-action-btn" style={{ padding:"8px 12px" }}>•••</button>
                </div>

                {/* Spotlight recognition */}
                {spotlightData.count>0 && (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:8,
                    padding:"8px 16px", borderRadius:20,
                    background:"rgba(232,160,32,0.12)", border:`1px solid ${V2.borderGold}`,
                    fontSize:12, fontWeight:700, color:V2.gold }}>
                    🏆 Spotlight Winner{spotlightData.latest&&` · ${spotlightData.latest.name}`}
                  </div>
                )}
              </div>

              {/* Right — streak card (desktop) */}
              <div className="pf-streak-card-desktop" style={{ width:200, flexShrink:0 }}>
                <div style={{ background:"rgba(255,255,255,0.88)", backdropFilter:"blur(20px)",
                  borderRadius:20, padding:"24px 20px", textAlign:"center",
                  border:`1px solid rgba(255,255,255,0.7)`,
                  boxShadow:"0 8px 32px rgba(26,74,10,0.12)" }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em",
                    textTransform:"uppercase", color:V2.midGray, marginBottom:6 }}>Current Streak</div>
                  <div style={{ fontSize:12, fontWeight:600, color:V2.midGray, marginBottom:4 }}>DAY</div>
                  {loading ? <Skel h={72} r={6} /> : (
                    <div style={{ fontFamily:V2.fontSerif, fontSize:72, fontWeight:700,
                      color:V2.forestGreen, lineHeight:1, letterSpacing:"-0.03em" }}>{current}</div>
                  )}
                  <div style={{ marginTop:12, fontSize:13, fontWeight:700, color:accent,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <span>✦</span>{tier.name}<span>✦</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Streak card — mobile only */}
        <div style={{ padding:"16px clamp(14px,4vw,48px) 0", display:"none" }} className="pf-streak-card-mobile">
          <div className="pf-card" style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:V2.midGray, marginBottom:4 }}>Current Streak</div>
            <div style={{ fontFamily:V2.fontSerif, fontSize:56, fontWeight:700, color:V2.forestGreen, lineHeight:1 }}>{current}</div>
            <div style={{ fontSize:13, fontWeight:700, color:accent }}>{tier.emoji} {tier.name}</div>
          </div>
        </div>

        {/* ── STATS ROW ────────────────────────────────────────────────────── */}
        <div style={{ padding:"16px clamp(14px,4vw,48px)" }}>
          <div className="pf-stats-row">
            <StatItem icon="🔥" label="Day Streak"     value={loading?"…":current}                              sub={`Best: ${best}d`}          loading={loading} />
            <StatItem icon="🏆" label="Longest Streak" value={loading?"…":best}                                  sub="All time best"             loading={loading} />
            <StatItem icon="🌱" label="Proofs Logged"  value={loading?"…":(subCount??0)}                         chip="+3 today"                 loading={loading} />
            <StatItem icon="⚡" label="Grass Score"    value={loading?"…":grassScore.toLocaleString()}           chip={pct!=="—"?`Top ${pct}%`:null} loading={loading} />
            <StatItem icon="🍀" label="Lucky Touches"  value={loading?"…":(profileRow?.lucky_touch_count??0)}    chip="Keep going!"              loading={loading} />
            <StatItem icon="🛡" label="Shields"        value={loading?"…":shields}                               chip={shields===0?"Add shield":null} loading={loading} />
          </div>
          <div style={{ textAlign:"center", marginTop:12, fontSize:11, color:V2.midGray }}>
            Grass Score is lifetime progress. Streaks can reset. Progress stays.
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <div className="pf-content" style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Row 1: Recent Proofs | Milestone Progress | Favorite Badges */}
          <div className="pf-three-col">

            {/* Recent Proofs */}
            <div className="pf-card">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:V2.midGray }}>Recent Proofs</div>
                <Link href={`/u/${username}`} style={{ fontSize:11, color:V2.grassGreen, textDecoration:"none",
                  background:"rgba(125,200,50,0.1)", border:`1px solid ${V2.borderGreen}`, borderRadius:20, padding:"3px 10px" }}>
                  View All
                </Link>
              </div>
              <div className="pf-proof-scroll">
                {loading
                  ? [1,2,3].map(i=><div key={i} className="skel" style={{ width:110, height:140, borderRadius:12, flexShrink:0 }} />)
                  : recentProofs.length>0
                    ? recentProofs.slice(0,3).map((p,i)=><ProofCard key={i} proof={p} />)
                    : <div style={{ color:V2.midGray, fontSize:12, padding:"20px 0" }}>No proofs yet.</div>
                }
              </div>
            </div>

            {/* Milestone Progress */}
            <div className="pf-card">
              <MilestoneCard current={current} loading={loading} />
            </div>

            {/* Favorite Badges */}
            <div className="pf-card">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:V2.midGray }}>Favorite Badges</div>
                <button style={{ fontSize:11, color:V2.grassGreen, background:"rgba(125,200,50,0.1)",
                  border:`1px solid ${V2.borderGreen}`, borderRadius:20, padding:"3px 10px", cursor:"pointer" }}>
                  View All
                </button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                {badges.filter(b=>b.earned).slice(0,6).map(b=><BadgeItem key={b.id} b={b} />)}
                {badges.filter(b=>!b.earned).slice(0,Math.max(0,6-badges.filter(b=>b.earned).length)).map(b=><BadgeItem key={b.id} b={b} />)}
              </div>
            </div>
          </div>

          {/* Row 2: About Me | Stats Overview | Skin/Theme + Account */}
          <div className="pf-two-one-col">

            {/* About Me */}
            <div className="pf-card">
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:V2.midGray, marginBottom:14 }}>About Me</div>
              {profileRow?.bio
                ? <p style={{ fontSize:13, color:V2.textBody, lineHeight:1.65, marginBottom:16 }}>{profileRow.bio}</p>
                : <p style={{ fontSize:13, color:V2.midGray, marginBottom:16 }}>No bio yet.</p>
              }
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"10px 14px", borderRadius:10, background:"rgba(125,200,50,0.06)" }}>
                  <span style={{ fontSize:13, color:V2.textBody }}>Community Rank</span>
                  <span style={{ fontSize:13, fontWeight:700, color:V2.grassGreen }}>
                    {pct!=="—"?`Top ${pct}%`:"—"}
                  </span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"10px 14px", borderRadius:10, background:"rgba(125,200,50,0.06)" }}>
                  <span style={{ fontSize:13, color:V2.textBody }}>Referrals</span>
                  <span style={{ fontSize:13, fontWeight:700, color:V2.forestGreen }}>{refSuccessful}</span>
                </div>
              </div>
              {isOwner && (
                <button onClick={()=>{
                  const link=typeof window!=="undefined"?`${window.location.origin}/?ref=${username}`:`https://proofofgrass.app/?ref=${username}`;
                  navigator.clipboard.writeText(link).catch(()=>{});
                  setRefLinkCopied(true); setTimeout(()=>setRefLinkCopied(false),2000);
                }} style={{ width:"100%", padding:"11px", borderRadius:12,
                  background:"white", border:`1.5px solid ${V2.borderSoft}`,
                  color:V2.forestGreen, fontSize:12, fontWeight:700, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  🔗 {refLinkCopied?"Copied!":"My Referral Link"}
                </button>
              )}
            </div>

            {/* Stats Overview */}
            <div className="pf-card">
              <StatsOverview username={username} subCount={subCount} grassScore={grassScore} />
            </div>

            {/* Skin/Theme + Account */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div className="pf-card">
                <SkinPanel
                  activeCover={activeCover}
                  unlockedCovers={unlockedCovers}
                  profileRow={profileRow}
                  isOwner={isOwner}
                  onEquip={equipCover}
                />
              </div>

              <div className="pf-card">
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:V2.midGray, marginBottom:14 }}>Account</div>
                {[
                  { icon:"👤", label:"Edit Profile", action:()=>setEditMode(v=>!v) },
                  { icon:"⚙️", label:"Settings", action:()=>{} },
                ].map((item,i)=>(
                  <button key={i} onClick={item.action}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"12px 0", borderBottom:i===0?`1px solid ${V2.borderSoft}`:"none",
                      background:"transparent", border:"none", borderBottom:i===0?`1px solid ${V2.borderSoft}`:"none",
                      cursor:"pointer", textAlign:"left" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:16 }}>{item.icon}</span>
                      <span style={{ fontSize:13, fontWeight:500, color:V2.forestGreen }}>{item.label}</span>
                    </div>
                    <span style={{ color:V2.midGray, fontSize:16 }}>›</span>
                  </button>
                ))}
                {isOwner && walletVerified && walletAddr && (
                  <div style={{ marginTop:10, padding:"10px 12px", borderRadius:10,
                    background:"rgba(125,200,50,0.06)", border:`1px solid ${V2.borderGreen}` }}>
                    <div style={{ fontSize:11, fontWeight:600, color:V2.grassGreen, marginBottom:2 }}>◎ Wallet Connected</div>
                    <div style={{ fontSize:11, color:V2.midGray, fontFamily:"monospace" }}>{walletAddr.slice(0,4)}...{walletAddr.slice(-4)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wallet section for owners without wallet */}
          {isOwner && !walletVerified && (
            <div className="pf-card" id="wallet-section">
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:V2.midGray, marginBottom:16 }}>Solana Wallet</div>
              <WalletVerify username={username} currentWallet={walletAddr} currentVerified={walletVerified}
                onVerified={(addr)=>{ setWalletAddr(addr); setWalletVerified(!!addr); }} />
            </div>
          )}

          {/* Cover gallery */}
          {unlockedCovers.length > 0 && (
            <div className="pf-card">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:V2.midGray }}>
                  My Covers
                </div>
                <div style={{ fontSize:11, color:V2.midGray }}>{unlockedCovers.length} owned</div>
              </div>
              <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:6, scrollbarWidth:"none" }}>
                {COVER_DEFINITIONS.filter(c=>unlockedCovers.includes(c.slug)).map(cov=>{
                  const isActive = profileRow?.active_cover_id===cov.slug;
                  return (
                    <div key={cov.slug}
                      onClick={()=>{ if(isOwner&&!isActive) equipCover(cov.slug); }}
                      style={{ position:"relative", borderRadius:10, overflow:"hidden", flexShrink:0,
                        width:130, height:82, border:`2px solid ${isActive?V2.grassGreen:V2.borderSoft}`,
                        cursor:isOwner?"pointer":"default", boxShadow:isActive?"0 0 16px rgba(125,200,50,0.3)":"none" }}>
                      {isCoverUrlReady(cov.imageUrl)
                        ? <img src={cov.imageUrl} alt={cov.name} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : <div style={{ width:"100%", height:"100%", background:cov.fallback }} />
                      }
                      <div style={{ position:"absolute", bottom:0, left:0, right:0,
                        background:"linear-gradient(180deg,transparent,rgba(0,0,0,0.7))", padding:"4px 7px" }}>
                        <div style={{ fontSize:9, fontWeight:700, color:"white" }}>{cov.name}</div>
                        {isActive && <div style={{ fontSize:7, color:V2.grassLime }}>✦ Active</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM CTA ───────────────────────────────────────────────────── */}
        <div style={{ margin:"24px clamp(14px,4vw,48px)" }}>
          <div style={{ borderRadius:20, overflow:"hidden", position:"relative",
            background:"linear-gradient(135deg,#e8f4fd 0%,#f0f8ee 100%)",
            border:`1px solid ${V2.borderSoft}`,
            padding:"40px clamp(20px,5vw,60px)",
            display:"flex", alignItems:"center", gap:32, flexWrap:"wrap",
            boxShadow:V2.shadowMd }}>
            {/* Illustration placeholder */}
            <div style={{ fontSize:72, flexShrink:0 }}>🌻</div>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontFamily:V2.fontSans, fontWeight:800,
                fontSize:"clamp(22px,3vw,36px)", color:V2.forestGreen,
                lineHeight:1.15, marginBottom:8 }}>
                Go outside.<br/>
                <span style={{ color:V2.grassGreen }}>Prove it.</span><br/>
                Make a difference.
              </div>
            </div>
            <div>
              <p style={{ fontSize:13, color:V2.textMuted, lineHeight:1.6, marginBottom:16, maxWidth:280 }}>
                Every proof plants impact. We fund youth athletics and environmental sustainability through your actions.
              </p>
              <Link href="/" style={{ ...V2Styles.btnPrimary, textDecoration:"none", fontSize:14 }}>
                Log Your Next Proof 🌿
              </Link>
            </div>
            {/* Decorative tree */}
            <div style={{ fontSize:64, flexShrink:0, opacity:0.6 }}>🌳</div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV ───────────────────────────────────────────────────────── */}
      <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:150,
        height:64, display:"flex", alignItems:"stretch",
        background:"rgba(255,255,255,0.96)", backdropFilter:"blur(20px)",
        borderTop:`1px solid ${V2.borderSoft}`,
        boxShadow:"0 -2px 20px rgba(26,74,10,0.08)",
        paddingBottom:"env(safe-area-inset-bottom)" }}>
        <style>{`@media(min-width:768px){.pf-bottom-nav{display:none!important;}}`}</style>
        {[
          { href:"/",            label:"Home",       icon:"🏠" },
          { href:"/#upload",     label:"Log Proof",  icon:"🌿" },
          { href:`/u/${username}`,label:"Profile",   icon:"👤", active:true },
          { href:"/leaderboard", label:"Leaderboard",icon:"🏆" },
          { href:"/grass-draw",  label:"Grass Draw", icon:"🌱" },
        ].map((tab,i)=>(
          <Link key={i} href={tab.href} style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:3, textDecoration:"none",
            color:tab.active?V2.grassGreen:V2.midGray, fontSize:10, fontWeight:tab.active?700:500,
            fontFamily:V2.fontSans }}>
            <span style={{ fontSize:20 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>

      {showChallenge && <ChallengeModal targetUsername={username} viewerUsername={viewer} onClose={()=>setShowChallenge(false)} />}
    </>
  );
}