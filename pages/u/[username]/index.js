// pages/u/[username]/index.js — V2 Profile Page (Mockup Match)
import { useState, useEffect, useRef, useCallback } from "react";
import ChallengeModal from "../../../components/ChallengeModal";
import YardRecordCard from "../../../components/yard/YardRecordCard";
import WalletVerify from "../../../components/WalletVerify";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import OgMeta, { SITE_URL } from "../../../components/OgMeta";
import FollowButton from "../../../components/FollowButton";
import ShareCardSheet from "../../../components/ShareCardSheet";
import { renderStreakCard, streakCaption } from "../../../utils/streakShareCard";
import { supabase } from "../../../utils/supabase";
import { resolveActiveCover, COVER_DEFINITIONS, isCoverUrlReady } from "../../../utils/coverDefinitions";
import { getSpotlightBadge } from "../../../utils/spotlightBadges";
import SpinnerMedal from "../../../components/wheel/SpinnerMedal";
import BadgeShelf from "../../../components/badges/BadgeShelf";
import BadgeMedal from "../../../components/badges/BadgeMedal";
import MyCollectibles from "../../../components/frightbits/MyCollectibles";
import { V2, V2Styles, V2GlobalCSS, getV2Tier } from "../../../utils/v2Theme";

import { SiteLinks, SiteMobileMenu } from "../../../components/SiteMenu";
import Ico from "../../../components/Ico";
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

// Readable label gray for this page (V2.midGray #a0b090 is too faint on white and cover art).
const LABEL = "#5c6e4d";

// ── Stat item ─────────────────────────────────────────────────────────────────
function StatItem({ icon, label, value, sub, chip, loading }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center",
      padding:"16px 8px", background:"white", borderRadius:14,
      boxShadow:"0 1px 8px rgba(26,74,10,0.06)", border:`1px solid ${V2.borderSoft}`,
      minWidth:0, flex:1 }}>
      <div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
        color:LABEL, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
        <span><Ico n={icon} size={20} /></span><span>{label}</span>
      </div>
      {loading ? <Skel h={32} r={4} w="60%" /> : (
        <div style={{ fontFamily:V2.fontSerif, fontSize:"clamp(24px,3.5vw,36px)", fontWeight:700,
          color:V2.forestGreen, lineHeight:1, marginBottom:4 }}>{value}</div>
      )}
      {sub && <div style={{ fontSize:11, fontWeight:600, color:LABEL }}>{sub}</div>}
      {chip && <div style={{ marginTop:6, fontSize:10, fontWeight:800, color:"#2f6b12",
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
        <Ico n={b.emoji} size={28} />
      </div>
      <div style={{ fontSize:9, fontWeight:600, color:b.earned?V2.forestGreen:LABEL,
        textAlign:"center", lineHeight:1.3, maxWidth:64 }}>{b.name}</div>
    </div>
  );
}

// ── Proof card ────────────────────────────────────────────────────────────────
function ProofCard({ proof }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ borderRadius:12, overflow:"hidden", flexShrink:0,
      width:"clamp(100px,28vw,160px)", background:"#e8f4ee",
      border:`1px solid ${V2.borderSoft}`, boxShadow:V2.shadowSm }}>
      {proof.photo_url && !failed
        ? <img src={proof.photo_url} alt="" loading="lazy" onError={()=>setFailed(true)}
            style={{ width:"100%", height:110, objectFit:"cover" }} />
        : <div style={{ height:110, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:32 }}><Ico n="🌿" size={22} /></div>
      }
      <div style={{ padding:"6px 8px", background:"rgba(255,255,255,0.9)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
          <span style={{ fontSize:9, fontWeight:700, color:V2.grassGreen,
            background:"rgba(125,200,50,0.1)", borderRadius:20, padding:"1px 7px" }}>✓ Verified</span>
        </div>
        <div style={{ fontSize:10, color:LABEL }}>{proof.when}</div>
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
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:LABEL }}>
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
            <div style={{ fontSize:14, fontWeight:700, color:tier.color }}><Ico inline n={tier.emoji} size={18} />{tier.name}</div>
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
              <span style={{ fontSize:11, color:LABEL }}>{prev} days</span>
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
              <div style={{ fontSize:11, color:LABEL, marginBottom:4 }}>Next milestone</div>
              <div style={{ fontFamily:V2.fontSerif, fontSize:16, fontWeight:700, color:V2.forestGreen }}>
                {next} Day Streak
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:nextTier.color }}>{nextTier.name}</div>
              <div style={{ fontSize:11, color:LABEL, marginTop:2 }}>{next-current} days away</div>
            </div>
          )}
          {!next && (
            <div style={{ padding:"12px 14px", borderRadius:12,
              background:"rgba(125,200,50,0.08)", border:`1px solid ${V2.borderGreen}`,
              textAlign:"center" }}>
              <div style={{ fontSize:14, fontWeight:700, color:V2.grassGreen }}><Ico inline n="✦" size={18} />Maximum tier reached</div>
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
  const [period, setPeriod] = useState({ proofs:0, activeDays:0, days:30 });
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
      // Bucket by real 7-day weeks (oldest first), keeping empty weeks so the line is honest
      const weeks = Math.ceil(days/7);
      const counts = Array(weeks).fill(0);
      const dayKeys = new Set();
      (data||[]).forEach(s=>{
        const ago = Math.floor((Date.now()-new Date(s.created_at).getTime())/86400000);
        const w = weeks-1-Math.min(weeks-1, Math.floor(ago/7));
        counts[w] += 1;
        dayKeys.add(new Date(s.created_at).toDateString());
      });
      setPoints(counts);
      setPeriod({ proofs:(data||[]).length, activeDays:dayKeys.size, days });
      setLoading(false);
    })();
  },[username,tab]);

  const max = Math.max(...points,1);
  const H = 110;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:LABEL }}>
          Stats Overview
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {["30D","90D","ALL"].map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:"4px 10px", borderRadius:20, border:"none", cursor:"pointer", fontSize:11,
                fontWeight:700, background:tab===t?V2.grassGreen:"rgba(200,220,190,0.3)",
                color:tab===t?"white":LABEL, transition:"all 0.15s" }}>
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
            color:LABEL, fontSize:12 }}>No data for this period</div>
        )}
      </div>

      {/* Summary stats for the selected period */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {[
          { label:"Proofs", value:period.proofs },
          { label:"Active days", value:period.activeDays },
          { label:"Consistency", value:`${Math.round((period.activeDays/period.days)*100)}%` },
        ].map(s=>(
          <div key={s.label} style={{ padding:"10px 8px", borderRadius:10,
            background:"rgba(125,200,50,0.06)", border:`1px solid ${V2.borderSoft}`, textAlign:"center" }}>
            <div style={{ fontFamily:V2.fontSerif, fontSize:18, fontWeight:700,
              color:V2.forestGreen, lineHeight:1, marginBottom:4 }}>{loading?"…":s.value}</div>
            <div style={{ fontSize:10, fontWeight:600, color:LABEL, textTransform:"uppercase",
              letterSpacing:"0.08em" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skin / Theme panel ────────────────────────────────────────────────────────
// Holder-only picture change: pick a photo, crop it square in the browser, upload through /api/profile/avatar.
function AvatarPicker({ username, current, onClose, onSaved }) {
  const [preview,setPreview]=useState(null);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const pick=(file)=>{
    setErr("");
    if(!file) return;
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){ setErr("Please choose a JPG, PNG or WebP image."); return; }
    const img=new Image(); const u=URL.createObjectURL(file);
    img.onload=()=>{
      const S=512, c=document.createElement("canvas"); c.width=S; c.height=S;
      const sc=Math.max(S/img.width,S/img.height), w=img.width*sc, h=img.height*sc;
      const cx=c.getContext("2d"); cx.fillStyle="#ffffff"; cx.fillRect(0,0,S,S); cx.drawImage(img,(S-w)/2,(S-h)/2,w,h);
      URL.revokeObjectURL(u);
      setPreview(c.toDataURL("image/jpeg",0.88));
    };
    img.onerror=()=>{ URL.revokeObjectURL(u); setErr("Couldn't read that image."); };
    img.src=u;
  };
  const send=async(body)=>{
    setBusy(true); setErr("");
    try{
      const r=await fetch("/api/profile/avatar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,...body})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){ setErr(j.error||"Could not save."); setBusy(false); return; }
      onSaved(j.avatar_url||null);
    }catch{ setErr("Could not save. Please try again."); setBusy(false); }
  };
  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(13,42,5,0.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:20, padding:22, width:"100%", maxWidth:360, textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontWeight:800, fontSize:18, color:V2.forestGreen, marginBottom:4 }}>Change your picture</div>
        <div style={{ fontSize:12.5, color:"#4a5a40", marginBottom:14 }}>Holder perk. Your photo is cropped to a circle.</div>
        <div style={{ width:140, height:140, borderRadius:"50%", margin:"0 auto 14px", overflow:"hidden", border:"3px solid #5ba622", background:"#eef6e2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48 }}>
          {(preview||current) ? <img src={preview||current} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (username?.[0]||"?").toUpperCase()}
        </div>
        <label style={{ display:"inline-block", cursor:"pointer", padding:"10px 18px", borderRadius:12, background:"#eef6e2", border:"1px solid rgba(26,74,10,0.2)", fontWeight:700, fontSize:13.5, color:V2.forestGreen }}>
          Choose photo
          <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display:"none" }} onChange={e=>pick(e.target.files?.[0])} />
        </label>
        {err && <div style={{ color:"#c0392b", fontSize:12.5, marginTop:10 }}>{err}</div>}
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:16, flexWrap:"wrap" }}>
          <button onClick={()=>send({image:preview})} disabled={!preview||busy} className="pf-action-btn" style={{ opacity:(!preview||busy)?0.5:1 }}>{busy?"Saving...":"Save"}</button>
          {current && <button onClick={()=>send({remove:true})} disabled={busy} className="pf-action-btn">Remove</button>}
          <button onClick={onClose} disabled={busy} className="pf-action-btn">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SkinPanel({ activeCover, unlockedCovers, profileRow, isOwner, onEquip }) {
  const owned = COVER_DEFINITIONS.filter(c=>unlockedCovers.includes(c.slug));
  const packName = activeCover?.pack
    ? activeCover.pack.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())
    : "Default Theme";

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
        textTransform:"uppercase", color:LABEL, marginBottom:14 }}>Skin / Theme</div>

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
          {activeCover?.name && <div style={{ fontSize:11, color:LABEL }}>{activeCover.name}</div>}
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
        <div style={{ marginTop:10, fontSize:11, color:LABEL, textAlign:"center" }}>
          {owned.length} cover{owned.length!==1?"s":""} owned
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfilePage({ og }) {
  const router   = useRouter();
  const { username:slug } = router.query;
  const username = norm(slug??"");

  const [viewer,          setViewer]          = useState("");
  const isOwner = viewer && viewer===username;

  const [streakRow,       setStreakRow]        = useState(null);
  const [profileRow,      setProfileRow]       = useState(null);
  const canPfp = !!(isOwner && (profileRow?.has_grass_toucher || profileRow?.has_screen_toucher));
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
  const [disconnecting,   setDisconnecting]   = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
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
  const [wheelBadge,      setWheelBadge]        = useState(null);
  const [badgeShelf,      setBadgeShelf]        = useState([]);
  const [sharingStreak,   setSharingStreak]     = useState(false);

  useEffect(()=>{
    const saved = typeof window!=="undefined"?localStorage.getItem("pog_username"):null;
    if(saved) setViewer(norm(saved));
  },[]);

  // Wheel Spinner badge (a spin count turned into a tier by the server).
  useEffect(()=>{
    if(!username) return;
    let alive=true;
    fetch(`/api/wheel/badge?username=${encodeURIComponent(username)}`).then(r=>r.ok?r.json():null)
      .then(d=>{if(alive&&d?.badge) setWheelBadge(d.badge);}).catch(()=>{});
    return ()=>{alive=false;};
  },[username]);

  // Unified badge shelf (every experience), computed on the server.
  useEffect(()=>{
    if(!username) return;
    let alive=true;
    fetch(`/api/badges?username=${encodeURIComponent(username)}`).then(r=>r.ok?r.json():null)
      .then(d=>{if(alive&&Array.isArray(d?.badges)) setBadgeShelf(d.badges);}).catch(()=>{});
    return ()=>{alive=false;};
  },[username]);

  // ── All data fetching — preserved from V1 ────────────────────────────────
  useEffect(()=>{
    if(!username) return;
    (async()=>{
      setLoading(true);
      const [{data:sr},{data:pr},{data:invRaw},{count:subs}] = await Promise.all([
        supabase.from("Streaks").select("current_streak,best_streak,last_submission_date,shield_count").eq("username",username).maybeSingle(),
        supabase.from("Profiles").select("bio,location,avatar_emoji,avatar_url,avatar_frame,joined_at,wallet_verified,has_touchgrass_holder,has_grass_toucher,has_screen_toucher,referral_count_successful,referral_count_pending,referral_badge,grass_score,active_cover_id,unlocked_covers,lucky_touch_count").eq("username",username).maybeSingle(),
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
      setWalletAddr(null); setWalletVerified(pr?.wallet_verified??false);
      fetch(`/api/profile/wallet-status?username=${encodeURIComponent(username)}`).then(r=>r.json()).then(w=>{ if(w&&!w.error){ setWalletAddr(w.address??null); setWalletVerified(!!w.verified); } }).catch(()=>{});
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

  const saveField=async(field,value)=>{
    const before=profileRow?.[field];
    setProfileRow(prev=>({...prev,[field]:value}));
    try{
      const r=await fetch("/api/profile/update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,field,value})});
      if(!r.ok){setProfileRow(prev=>({...prev,[field]:before}));const j=await r.json().catch(()=>({}));if(typeof window!=="undefined"&&j?.error) window.alert(j.code==="unclaimed"?"Secure your username with Google first to edit your profile.":j.code==="not_signed_in"?"Sign in with Google to edit your profile.":j.error);}
    }catch{setProfileRow(prev=>({...prev,[field]:before}));}
  };
  const disconnectWallet = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/profile/wallet',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({username})});
      setWalletAddr(null); setWalletVerified(false); setDisconnectConfirm(false);
    } catch(e) { console.error('[wallet] disconnect failed:', e); }
    setDisconnecting(false);
  };

  const equipCover=(slug)=>saveField('active_cover_id',slug);
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
      padding: 20px; min-width: 0;
    }
    .pf-stats-row {
      display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 10px;
    }
    .pf-three-col {
      display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 16px;
    }
    .pf-two-one-col {
      display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr); gap: 16px; align-items: start;
    }
    .pf-three-col > *, .pf-two-one-col > * { min-width: 0; }
    .skel { background: rgba(200,220,190,0.3); border-radius:6px; animation:v2Shimmer 1.4s ease-in-out infinite; }
    .pf-proof-scroll { display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none; }
    .pf-proof-scroll::-webkit-scrollbar { display:none; }
    @media(max-width:900px) {
      .pf-three-col { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
      .pf-two-one-col { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
    }
    @media(max-width:640px) {
      .pf-stats-row { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
      .pf-three-col { grid-template-columns: minmax(0,1fr) !important; }
      .pf-two-one-col { grid-template-columns: minmax(0,1fr) !important; }
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
      {og && <OgMeta {...og} />}
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
        <SiteLinks />
        <div style={{ flex:1 }} className="sm-spacer" />
        <div style={{ marginLeft:"auto", display:"flex", gap:8, flexShrink:0 }}>
          {isOwner&&<button onClick={()=>setEditMode(v=>!v)} className="pf-action-btn" style={{ fontSize:11, padding:"6px 12px" }}>{editMode?"Done":<><Ico inline n="✏️" size={16} />Edit</>}</button>}
          <button onClick={copyProfile} style={{ ...V2Styles.btnPrimary, padding:"8px 18px", fontSize:12 }}>{copied?"✓ Copied":"↗ Share"}</button>
          <SiteMobileMenu />
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
                  background:"rgba(255,255,255,0.9)", border:`1px solid ${V2.borderGreen}`,
                  boxShadow:"0 1px 6px rgba(26,74,10,0.12)",
                  borderRadius:20, padding:"4px 12px" }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:V2.grassGreen, display:"inline-block" }} />
                  <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:"#2f6b12" }}>Verified Outdoors</span>
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
                    cursor:(editMode&&canPfp)?"pointer":"default" }}
                    onClick={()=>{ if(editMode&&canPfp)setShowAvatarPicker(true); }}>
                    {profileRow?.avatar_url
                      ? <img src={profileRow.avatar_url} alt="" style={{ width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover" }} />
                      : loading?username?.[0]?.toUpperCase()??"?":(profileRow?.avatar_emoji||"🌿")
                    }
                    {editMode&&canPfp&&<div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}><Ico n="✏️" size={22} /></div>}
                  </div>

                  <div>
                    <h1 style={{ fontFamily:V2.fontSans, fontWeight:800,
                      fontSize:"clamp(22px,4vw,42px)", color:V2.forestGreen,
                      lineHeight:1, marginBottom:6 }}>@{username||"—"}</h1>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:10, flexWrap:"wrap",
                      background:"rgba(255,255,255,0.88)", borderRadius:20, padding:"4px 12px",
                      boxShadow:"0 1px 6px rgba(26,74,10,0.12)" }}>
                      <span style={{ fontSize:12, fontWeight:800, color:accent }}><Ico inline n={tier.emoji} size={18} /><span style={{ filter:"brightness(0.7)" }}>{tier.name}</span></span>
                      {joinDate && <span style={{ fontSize:12, fontWeight:600, color:"#4a5a40" }}><Ico inline n="📅" size={16} />Joined {joinDate}</span>}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {profileRow?.bio && (
                  <p style={{ fontSize:13, fontWeight:600, color:"#2a3a22", lineHeight:1.6, marginBottom:12, maxWidth:400,
                    textShadow:"0 0 6px rgba(255,255,255,0.95), 0 1px 2px rgba(255,255,255,0.9)" }}>
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
                {showAvatarPicker && canPfp && (
                  <AvatarPicker username={username} current={profileRow?.avatar_url}
                    onClose={()=>setShowAvatarPicker(false)}
                    onSaved={(url)=>{ setProfileRow(prev=>({...prev,avatar_url:url})); setShowAvatarPicker(false); }} />
                )}

                {/* Action buttons */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                  <button onClick={copyProfile} className="pf-action-btn">
                    ↗ Share Profile
                  </button>
                  {isOwner && current>0 && (
                    <button onClick={()=>setSharingStreak(true)} className="pf-action-btn">
                      🔥 Share Streak
                    </button>
                  )}
                  <Link href={`/flex/${username}`} className="pf-action-btn">
                    <Ico inline n="✦" size={16} />Flex Card
                  </Link>
                  {!isOwner&&username&&viewer&&<FollowButton viewer={viewer} username={username} className="pf-action-btn" style={{}} />}
                  {!isOwner&&username&&(
                    <button onClick={()=>setShowChallenge(true)} className="pf-action-btn">
                      <Ico inline n="⚡" size={16} />Challenge
                    </button>
                  )}
                  <button className="pf-action-btn" style={{ padding:"8px 12px" }}><Ico n="more" size={18} /></button>
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
                {/* Wheel Spinner badge */}
                {wheelBadge&&wheelBadge.tier>0 && (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginLeft:8,
                    padding:"4px 16px 4px 8px", borderRadius:20,
                    background:"rgba(255,255,255,0.7)", border:`1px solid ${V2.borderSoft}`,
                    fontSize:12, fontWeight:700, color:V2.forestGreen }}>
                    <SpinnerMedal tier={wheelBadge.tier} size={26} />
                    {wheelBadge.label} · {wheelBadge.count} spins
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
                    textTransform:"uppercase", color:LABEL, marginBottom:6 }}>Current Streak</div>
                  <div style={{ fontSize:12, fontWeight:600, color:LABEL, marginBottom:4 }}>DAY</div>
                  {loading ? <Skel h={72} r={6} /> : (
                    <div style={{ fontFamily:V2.fontSerif, fontSize:72, fontWeight:700,
                      color:V2.forestGreen, lineHeight:1, letterSpacing:"-0.03em" }}>{current}</div>
                  )}
                  <div style={{ marginTop:12, fontSize:13, fontWeight:700, color:accent,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <span><Ico n="✦" size={14} /></span>{tier.name}<span><Ico n="✦" size={14} /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Streak card — mobile only */}
        <div style={{ padding:"16px clamp(14px,4vw,48px) 0", display:"none" }} className="pf-streak-card-mobile">
          <div className="pf-card" style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:LABEL, marginBottom:4 }}>Current Streak</div>
            <div style={{ fontFamily:V2.fontSerif, fontSize:56, fontWeight:700, color:V2.forestGreen, lineHeight:1 }}>{current}</div>
            <div style={{ fontSize:13, fontWeight:700, color:accent }}><Ico inline n={tier.emoji} size={18} />{tier.name}</div>
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
          <div style={{ textAlign:"center", marginTop:12, fontSize:11, color:LABEL }}>
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
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:LABEL }}>Recent Proofs</div>
                <Link href={`/u/${username}`} style={{ fontSize:11, color:V2.grassGreen, textDecoration:"none",
                  background:"rgba(125,200,50,0.1)", border:`1px solid ${V2.borderGreen}`, borderRadius:20, padding:"3px 10px" }}>
                  View All
                </Link>
              </div>
              <div className="pf-proof-scroll">
                {loading
                  ? [1,2,3].map(i=><div key={i} className="skel" style={{ width:110, height:140, borderRadius:12, flexShrink:0 }} />)
                  : recentProofs.length>0
                    ? recentProofs.slice(0,4).map((p,i)=><ProofCard key={i} proof={p} />)
                    : <div style={{ color:LABEL, fontSize:12, padding:"20px 0" }}>No proofs yet.</div>
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
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:LABEL }}>Favorite Badges</div>
                <button onClick={()=>{try{document.getElementById("badge-shelf")?.scrollIntoView({behavior:"smooth",block:"start"});}catch{}}} style={{ fontSize:11, color:V2.grassGreen, background:"rgba(125,200,50,0.1)",
                  border:`1px solid ${V2.borderGreen}`, borderRadius:20, padding:"3px 10px", cursor:"pointer" }}>
                  View All
                </button>
              </div>
              {badgeShelf.length>0 ? (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                  {[...badgeShelf].filter(b=>b.tier>0).sort((a,b)=>(b.tier/b.maxTier)-(a.tier/a.maxTier)||b.tier-a.tier).slice(0,6).map(b=>(
                    <div key={b.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, textAlign:"center" }}>
                      <BadgeMedal id={b.id} tier={b.tier} emoji={b.emoji} name={b.label} size={72} />
                      <div style={{ fontSize:12, fontWeight:700, color:V2.textBody, lineHeight:1.2 }}>{b.label}</div>
                    </div>
                  ))}
                  {badgeShelf.every(b=>b.tier===0) && <div style={{ gridColumn:"1 / -1", fontSize:13, color:LABEL }}>No badges earned yet.</div>}
                </div>
              ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                {badges.filter(b=>b.earned).slice(0,6).map(b=><BadgeItem key={b.id} b={b} />)}
                {badges.filter(b=>!b.earned).slice(0,Math.max(0,6-badges.filter(b=>b.earned).length)).map(b=><BadgeItem key={b.id} b={b} />)}
              </div>
              )}
            </div>
          </div>

          {/* Yard record: only appears once they have Yard history */}
          <YardRecordCard username={username} />

          {sharingStreak && (
            <ShareCardSheet title="Share your streak" caption={streakCaption(username, current)}
              filename={`streak-${current}-${username}.png`}
              render={() => renderStreakCard({ username, streak: current, best })} onClose={()=>setSharingStreak(false)} />
          )}

          <MyCollectibles username={username} />

          {/* Badge shelf: all experiences */}
          {badgeShelf.length>0 && (
            <div id="badge-shelf" className="pf-card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:LABEL, marginBottom:14 }}>Badges</div>
              <BadgeShelf badges={badgeShelf} shareFor={isOwner ? username : ""} />
            </div>
          )}

          {/* Row 2: Community | Stats Overview | Skin/Theme + Account */}
          <div className="pf-two-one-col">

            {/* Community (bio already shows in the banner) */}
            <div className="pf-card">
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:LABEL, marginBottom:14 }}>Community</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"10px 14px", borderRadius:10, background:"rgba(125,200,50,0.06)" }}>
                  <span style={{ fontSize:13, color:V2.textBody }}>Community Rank</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#2f6b12" }}>
                    {pct!=="—"?`Top ${pct}%`:"—"}
                  </span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"10px 14px", borderRadius:10, background:"rgba(125,200,50,0.06)" }}>
                  <span style={{ fontSize:13, color:V2.textBody }}>Referrals</span>
                  <span style={{ fontSize:13, fontWeight:700, color:V2.forestGreen }}>{refSuccessful}</span>
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
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:LABEL, marginBottom:14 }}>Account</div>
                {[
                  { icon:"👤", label:"Edit Profile", action:()=>setEditMode(v=>!v) },
                ].map((item,i)=>(
                  <button key={i} onClick={item.action}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"12px 0", background:"transparent", border:"none",
                      cursor:"pointer", textAlign:"left" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ width:20 }}><Ico n={item.icon} size={20} /></span>
                      <span style={{ fontSize:13, fontWeight:500, color:V2.forestGreen }}>{item.label}</span>
                    </div>
                    <span style={{ color:LABEL, fontSize:16 }}>›</span>
                  </button>
                ))}
                {isOwner && walletVerified && walletAddr && (
                  <div style={{ marginTop:10, padding:"12px 14px", borderRadius:10,
                    background:"rgba(125,200,50,0.06)", border:`1px solid ${V2.borderGreen}` }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:2 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:V2.grassGreen }}>◎ Wallet Connected</div>
                      <button onClick={()=>setDisconnectConfirm(true)}
                        style={{ fontSize:10, color:LABEL, background:"none", border:"none",
                          cursor:"pointer", textDecoration:"underline", fontFamily:V2.fontSans }}>
                        Change
                      </button>
                    </div>
                    <div style={{ fontSize:11, color:LABEL, fontFamily:"monospace", marginBottom:disconnectConfirm?10:0 }}>
                      {walletAddr.slice(0,6)}...{walletAddr.slice(-4)}
                    </div>
                    {disconnectConfirm && (
                      <div style={{ marginTop:8, padding:"10px 12px", borderRadius:8,
                        background:"rgba(230,80,80,0.06)", border:"1px solid rgba(230,80,80,0.2)" }}>
                        <div style={{ fontSize:11, color:"#e05050", marginBottom:8, lineHeight:1.5 }}>
                          Disconnect this wallet? You will need to re-verify a new one.
                          This will affect WAGO Drops eligibility.
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={disconnectWallet} disabled={disconnecting}
                            style={{ flex:1, padding:"7px", borderRadius:8, border:"none",
                              background:"#e05050", color:"white", fontSize:11, fontWeight:700,
                              cursor:disconnecting?"default":"pointer", fontFamily:V2.fontSans }}>
                            {disconnecting?"Disconnecting…":"Disconnect"}
                          </button>
                          <button onClick={()=>setDisconnectConfirm(false)}
                            style={{ flex:1, padding:"7px", borderRadius:8,
                              border:`1px solid ${V2.borderSoft}`, background:"white",
                              color:V2.forestGreen, fontSize:11, fontWeight:600,
                              cursor:"pointer", fontFamily:V2.fontSans }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wallet section — show connect UI when not verified */}
          {isOwner && !walletVerified && (
            <div className="pf-card" id="wallet-section">
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:LABEL, marginBottom:16 }}>Solana Wallet</div>
              <WalletVerify username={username} currentWallet={walletAddr} currentVerified={walletVerified}
                onVerified={(addr)=>{ setWalletAddr(addr); setWalletVerified(!!addr); }} />
            </div>
          )}

          {/* Cover gallery */}
          {unlockedCovers.length > 0 && (
            <div className="pf-card">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:LABEL }}>
                  My Covers
                </div>
                <div style={{ fontSize:11, color:LABEL }}>{unlockedCovers.length} owned</div>
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
                        {isActive && <div style={{ fontSize:7, color:V2.grassLime }}><Ico inline n="✦" size={9} />Active</div>}
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
            <div style={{ fontSize:64, flexShrink:0, opacity:0.6 }}><Ico n="🌳" size={22} /></div>
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
          { href:"/#upload",     label:"Log Proof",  icon:"camera" },
          { href:`/u/${username}`,label:"Profile",   icon:"👤", active:true },
          { href:"/leaderboard", label:"Leaderboard",icon:"🏆" },
          { href:"/grass-draw",  label:"Grass Draw", icon:"🌱" },
        ].map((tab,i)=>(
          <Link key={i} href={tab.href} style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:3, textDecoration:"none",
            color:tab.active?V2.grassGreen:LABEL, fontSize:10, fontWeight:tab.active?700:500,
            fontFamily:V2.fontSans }}>
            <span style={{ width:24 }}><Ico n={tab.icon} size={24} /></span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>

      {showChallenge && <ChallengeModal targetUsername={username} viewerUsername={viewer} onClose={()=>setShowChallenge(false)} />}
    </>
  );
}
// Server-side so link previews (X, Discord, iMessage…) get this person's card instead of the generic site one.
export async function getServerSideProps({ params, res }) {
  const name = String(params.username || "").replace(/@/g, "").toLowerCase().trim().replace(/[^a-z0-9_.-]/g, "").slice(0, 40);
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  if (!name) return { props: { og: null } };
  let streak = null;
  try {
    const { supabase } = await import("../../../utils/supabase");
    const { data } = await supabase.from("Streaks").select("current_streak").eq("username", name).maybeSingle();
    streak = data?.current_streak ?? null;
  } catch {}
  return { props: { og: {
    title: `@${name} on Proof of Grass`,
    description: streak ? `${streak}-day streak. See @${name}'s profile, badges and proofs on Proof of Grass.` : `See @${name}'s profile, badges and proofs on Proof of Grass.`,
    image: `${SITE_URL}/api/og?type=profile&u=${encodeURIComponent(name)}`,
    url: `${SITE_URL}/u/${name}`,
  } } };
}
