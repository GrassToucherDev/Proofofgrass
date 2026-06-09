import { useState, useEffect, useRef } from "react";
import ChallengeModal from "../../../components/ChallengeModal";
import WalletVerify from "../../../components/WalletVerify";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../../utils/supabase";

const T = {
  bg:"#0a0b08", bg2:"#111209", bg3:"#181a12",
  border:"rgba(255,255,255,0.06)", borderG:"rgba(147,168,90,0.18)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.48)", dim:"rgba(240,239,234,0.22)",
  red:"#ef4444",
};

function norm(v) { return String(v??"").replace(/@/g,"").toLowerCase().trim(); }

const REFERRAL_BADGES = [
  { count:1,   slug:"community-builder",     name:"Community Builder",    emoji:"🤝" },
  { count:5,   slug:"grass-recruiter",       name:"Grass Recruiter",      emoji:"🌱" },
  { count:10,  slug:"community-grower",      name:"Community Grower",     emoji:"🌿" },
  { count:25,  slug:"movement-builder",      name:"Movement Builder",     emoji:"🌳" },
  { count:50,  slug:"founding-ambassador",   name:"Founding Ambassador",  emoji:"🏛" },
  { count:100, slug:"touchgrass-ambassador", name:"Touch Grass Ambassador",emoji:"👑"},
];

function getTier(n) {
  if (n>=1000) return {label:"TRANSCENDENT", color:"#f0fdf4", border:"#ffffff"};
  if (n>=500)  return {label:"ASCENDED",     color:"#e0f2fe", border:"#0369a1"};
  if (n>=365)  return {label:"ETERNAL",      color:"#fff9c4", border:"#a08000"};
  if (n>=180)  return {label:"MYTHIC",       color:"#fbbf24", border:"#92400e"};
  if (n>=100)  return {label:"IMMORTAL",     color:"#f97316", border:"#7c2d12"};
  if (n>=50)   return {label:"LEGENDARY",    color:T.gold,    border:"#7a5c00"};
  if (n>=30)   return {label:"ELITE",        color:"#c084fc", border:"#6d28d9"};
  if (n>=14)   return {label:"LOCKED IN",    color:T.olive,   border:"#4a5a28"};
  if (n>=7)    return {label:"ROOTED",       color:"#b8c87a", border:"#5a6a30"};
  if (n>=3)    return {label:"GROWING",      color:"#a0b870", border:"#4a5828"};
  return             {label:"SEED",          color:"rgba(240,239,234,0.35)", border:T.border};
}

const ALL_BADGES = [
  // Streak milestones
  {id:"first-step",     emoji:"🌱", name:"First Step",           desc:"Submit your first proof",          condition:(s,p,cd,cs,gs,sh)=>p>=1     },
  {id:"sun",            emoji:"☀️", name:"Sun Seeker",           desc:"Hold a 7-day streak",              condition:(s,p,cd,cs,gs,sh)=>s>=7     },
  {id:"week",           emoji:"📅", name:"Week Warrior",         desc:"7 consecutive days outside",       condition:(s,p,cd,cs,gs,sh)=>s>=7     },
  {id:"water",          emoji:"💧", name:"Water Walker",         desc:"Reach a 14-day streak",            condition:(s,p,cd,cs,gs,sh)=>s>=14    },
  {id:"fortnight",      emoji:"🗓️", name:"Fortnight",            desc:"14 consecutive days outside",      condition:(s,p,cd,cs,gs,sh)=>s>=14    },
  {id:"forest",         emoji:"🌲", name:"Forest Friend",        desc:"Hold a 30-day streak",             condition:(s,p,cd,cs,gs,sh)=>s>=30    },
  {id:"monthly",        emoji:"🌙", name:"Monthly",              desc:"30 consecutive days outside",      condition:(s,p,cd,cs,gs,sh)=>s>=30    },
  {id:"early",          emoji:"🌅", name:"Early Bird",           desc:"Reach a 50-day streak",            condition:(s,p,cd,cs,gs,sh)=>s>=50    },
  {id:"golden",         emoji:"🌄", name:"Golden Hour",          desc:"50 consecutive days outside",      condition:(s,p,cd,cs,gs,sh)=>s>=50    },
  {id:"century",        emoji:"💯", name:"100 Club",             desc:"Reach a 100-day streak",           condition:(s,p,cd,cs,gs,sh)=>s>=100   },
  {id:"mythic-club",    emoji:"⚡", name:"Mythic Club",           desc:"Reach a 180-day streak",           condition:(s,p,cd,cs,gs,sh)=>s>=180   },
  {id:"double-century", emoji:"🔱", name:"200 Club",              desc:"Reach a 200-day streak",           condition:(s,p,cd,cs,gs,sh)=>s>=200   },
  {id:"quarter-millennium",emoji:"🏺",name:"Quarter Millennium",  desc:"Reach a 250-day streak",           condition:(s,p,cd,cs,gs,sh)=>s>=250   },
  {id:"eternal-club",   emoji:"👑", name:"Eternal",              desc:"Reach a 365-day streak — one full year", condition:(s,p,cd,cs,gs,sh)=>s>=365 },
  {id:"ascended-club",  emoji:"🌌", name:"Ascended",             desc:"Reach a 500-day streak",           condition:(s,p,cd,cs,gs,sh)=>s>=500   },
  {id:"transcendent",   emoji:"✨", name:"Transcendent",         desc:"Reach a 1000-day streak",          condition:(s,p,cd,cs,gs,sh)=>s>=1000  },
  // Proof milestones
  {id:"trail",          emoji:"🏔️", name:"Trail Blazer",         desc:"Submit 10 total proofs",           condition:(s,p,cd,cs,gs,sh)=>p>=10    },
  {id:"proof-machine",  emoji:"⚙️", name:"Proof Machine",        desc:"Submit 50 total proofs",           condition:(s,p,cd,cs,gs,sh)=>p>=50    },
  {id:"century-prover", emoji:"📸", name:"Century Prover",       desc:"Submit 100 total proofs",          condition:(s,p,cd,cs,gs,sh)=>p>=100   },
  // Challenge milestones
  {id:"ch-starter",     emoji:"⚡", name:"Challenge Starter",    desc:"Send your first challenge",        condition:(s,p,cd,cs,gs,sh)=>cs>=1    },
  {id:"ch-veteran",     emoji:"🎯", name:"Challenge Veteran",    desc:"Complete 3 challenges",            condition:(s,p,cd,cs,gs,sh)=>cd>=3    },
  {id:"ch-partner",     emoji:"🤝", name:"Consistency Partner",  desc:"Complete 10 challenges",           condition:(s,p,cd,cs,gs,sh)=>cd>=10   },
  {id:"ch-legend",      emoji:"👑", name:"Legendary Challenger", desc:"Complete 25 challenges",           condition:(s,p,cd,cs,gs,sh)=>cd>=25   },
  // Grass Score milestones
  {id:"gs-1k",          emoji:"🔥", name:"Grass Score 1K",       desc:"Reach a Grass Score of 1,000",     condition:(s,p,cd,cs,gs,sh)=>gs>=1000 },
  {id:"gs-5k",          emoji:"🔋", name:"Grass Score 5K",       desc:"Reach a Grass Score of 5,000",     condition:(s,p,cd,cs,gs,sh)=>gs>=5000 },
  // Special
  {id:"goat",           emoji:"⛰️", name:"Mountain Goat",        desc:"Reach a 30-day streak",            condition:(s,p,cd,cs,gs,sh)=>s>=30    },
  {id:"shield",         emoji:"🛡️", name:"Shield Bearer",        desc:"Own at least 1 shield",            condition:(s,p,cd,cs,gs,sh)=>sh>=1    },
];

const PROOF_BG = [
  "linear-gradient(135deg,#2d4a1a,#4a7a28,#1a3012)",
  "linear-gradient(135deg,#3d5a20,#6a9a38,#2a4018)",
  "linear-gradient(135deg,#1a3d2a,#2d6a45,#0e2a1a)",
  "linear-gradient(135deg,#2a4d3a,#3d7a58,#183020)",
  "linear-gradient(135deg,#3a5218,#5a8228,#283810)",
  "linear-gradient(135deg,#2d4820,#4a7830,#1c3015)",
];

// ─── Atoms ────────────────────────────────────────────────────────────────────
function StatPill({icon,value,label,sub,accent,last}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:3,padding:"20px 14px",
      borderRight:last?"none":`1px solid ${T.border}`,minWidth:0,flex:"1 1 0"}}>
      <span style={{fontSize:17,marginBottom:2}}>{icon}</span>
      <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
        fontSize:"clamp(20px,2.8vw,34px)",fontWeight:700,lineHeight:1,
        color:accent?T.gold:T.white,letterSpacing:"-0.02em"}}>{value}</span>
      {sub&&<span style={{fontSize:10,color:T.olive,fontWeight:600,letterSpacing:"0.06em"}}>{sub}</span>}
      <span style={{fontSize:9,color:T.dim,letterSpacing:"0.14em",textTransform:"uppercase",marginTop:2}}>{label}</span>
    </div>
  );
}

function Badge({b}) {
  return (
    <div className="badge-wrap" style={{display:"flex",flexDirection:"column",
      alignItems:"center",gap:7,opacity:b.earned?1:0.22,cursor:"default",position:"relative"}}>
      {/* Hover tooltip */}
      <div className="badge-tip" style={{
        position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",
        background:"#1e2016",border:"1px solid rgba(147,168,90,0.3)",borderRadius:8,
        padding:"8px 12px",width:152,textAlign:"center",pointerEvents:"none",
        opacity:0,transition:"opacity 0.18s",zIndex:100,whiteSpace:"normal",
        boxShadow:"0 4px 16px rgba(0,0,0,0.5)"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#f0efea",marginBottom:3}}>{b.name}</div>
        <div style={{fontSize:9,color:"rgba(240,239,234,0.5)",lineHeight:1.4}}>{b.desc}</div>
        <div style={{fontSize:9,fontWeight:700,marginTop:5,
          color:b.earned?"#93a85a":"rgba(240,239,234,0.3)"}}>
          {b.earned?"✓ Earned":"🔒 Locked"}
        </div>
      </div>
      <div style={{width:56,height:56,borderRadius:14,
        background:b.earned?`${T.olive}14`:"transparent",
        border:`1.5px solid ${b.earned?T.olive:T.border}`,
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
        boxShadow:b.earned?`0 0 14px ${T.olive}20`:"none",
        transition:"transform 0.15s"}}
        onMouseEnter={e=>{
          e.currentTarget.style.transform="scale(1.08)";
          e.currentTarget.parentNode.querySelector(".badge-tip").style.opacity="1";
        }}
        onMouseLeave={e=>{
          e.currentTarget.style.transform="";
          e.currentTarget.parentNode.querySelector(".badge-tip").style.opacity="0";
        }}>
        {b.emoji}
      </div>
      <div style={{fontSize:9,fontWeight:700,color:b.earned?T.white:T.dim,
        textAlign:"center",lineHeight:1.3}}>{b.name}</div>
    </div>
  );
}

function ProofCard({proof, idx}) {
  const hasPic = !!proof.photo_url;
  return (
    <div style={{borderRadius:12,overflow:"hidden",flexShrink:0,
      width:"clamp(130px,20vw,190px)",
      background:hasPic?"#000":PROOF_BG[idx%6],
      border:`1px solid ${T.borderG}`,position:"relative",
      boxShadow:"0 4px 20px rgba(0,0,0,0.4)",cursor:"pointer",
      transition:"transform 0.18s,box-shadow 0.18s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.03)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";}}>
      {hasPic
        ? <img src={proof.photo_url} alt="" style={{width:"100%",height:140,objectFit:"cover"}} />
        : <div style={{height:140,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,opacity:0.4}}>🌿</div>
      }
      <div style={{position:"absolute",top:8,right:9,textAlign:"right"}}>
        <div style={{fontSize:6,color:"rgba(255,255,255,0.5)",letterSpacing:"0.12em",textTransform:"uppercase"}}>DAY</div>
        <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:24,
          fontWeight:700,color:T.white,lineHeight:1,textShadow:"0 0 16px rgba(0,0,0,0.9)"}}>{proof.day}</div>
      </div>
      <div style={{padding:"9px 11px",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)"}}>
        <div style={{fontSize:10,fontWeight:600,color:T.white}}>{proof.when}</div>
      </div>
    </div>
  );
}

function TierBadge({name,day,active,completed}) {
  const col = completed?T.olive:active?T.gold:"rgba(255,255,255,0.14)";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:7}}>
      <div style={{width:50,height:50,borderRadius:"50%",border:`1.5px solid ${col}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        background:active?`${T.gold}18`:completed?`${T.olive}12`:"transparent",
        boxShadow:active?`0 0 18px ${T.gold}28`:"none",fontSize:17}}>
        {completed?"✦":active?"◎":"○"}
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:8.5,fontWeight:700,color:col,letterSpacing:"0.1em",textTransform:"uppercase"}}>{name}</div>
        <div style={{fontSize:8.5,color:T.dim}}>Day {day}</div>
      </div>
    </div>
  );
}

// ─── Editable profile field ───────────────────────────────────────────────────
function EditableField({label,value,onSave,multiline}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const ref = useRef(null);

  useEffect(()=>{ if (editing) ref.current?.focus(); },[editing]);

  const commit = () => { setEditing(false); if (draft !== value) onSave(draft); };

  return (
    <div style={{marginBottom:8}}>
      <div style={{fontSize:9,letterSpacing:"0.14em",color:T.dim,textTransform:"uppercase",marginBottom:4}}>{label}</div>
      {editing
        ? multiline
          ? <textarea ref={ref} value={draft} onChange={e=>setDraft(e.target.value)}
              onBlur={commit} rows={3}
              style={{width:"100%",background:T.bg3,border:`1px solid ${T.borderG}`,
                borderRadius:8,padding:"8px 12px",color:T.white,fontFamily:"'DM Sans',sans-serif",
                fontSize:13,outline:"none",resize:"none"}} />
          : <input ref={ref} type="text" value={draft} onChange={e=>setDraft(e.target.value)}
              onBlur={commit} onKeyDown={e=>e.key==="Enter"&&commit()}
              style={{width:"100%",background:T.bg3,border:`1px solid ${T.borderG}`,
                borderRadius:8,padding:"7px 12px",color:T.white,fontFamily:"'DM Sans',sans-serif",
                fontSize:13,outline:"none"}} />
        : <div onClick={()=>setEditing(true)}
            style={{fontSize:14,color:value?T.muted:T.dim,cursor:"text",lineHeight:1.6,
              borderBottom:`1px dashed ${T.border}`,paddingBottom:2,
              fontStyle:value?"normal":"italic"}}>
            {value||`Add ${label.toLowerCase()}…`}
          </div>
      }
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Avatar Picker Modal ──────────────────────────────────────────────────────
function AvatarPickerModal({ profileRow, username, uploading, error, onClose, onSelectEmoji, onUploadPhoto, onRemovePhoto }) {
  const T2 = {
    bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
    border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
    olive:"#93a85a", gold:"#c8a84b", purple:"#a78bfa",
    white:"#f0efea", dim:"rgba(240,239,234,0.24)", muted:"rgba(240,239,234,0.52)",
  };

  const canUpload = profileRow?.has_grass_toucher || profileRow?.has_screen_toucher;
  const hasPhoto  = !!profileRow?.avatar_url;
  const frame     = profileRow?.avatar_frame;
  const isFullEco = profileRow?.has_touchgrass_holder && profileRow?.has_grass_toucher && profileRow?.has_screen_toucher;
  const isNFT     = profileRow?.has_grass_toucher || profileRow?.has_screen_toucher;

  const EMOJIS = ["🌿","🌱","🌲","🏔️","☀️","🦅","🐾","🌊","🍃","🌾"];

  const fileInputRef = { current: null };

  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",
        backdropFilter:"blur(6px)",zIndex:9990,
      }}/>
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:9991,
        background:T2.bg2,borderRadius:"20px 20px 0 0",
        border:`1px solid ${T2.borderG}`,borderBottom:"none",
        padding:`24px 20px calc(28px + env(safe-area-inset-bottom, 0px))`,
        boxShadow:"0 -24px 60px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:20,fontWeight:700,color:T2.white}}>
            Profile Picture
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${T2.border}`,
            borderRadius:8,padding:"5px 10px",color:T2.dim,fontSize:13,cursor:"pointer"}}>✕</button>
        </div>

        {/* Current avatar preview */}
        {hasPhoto && (
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,
            padding:"12px 14px",background:T2.bg3,borderRadius:10,
            border:`1px solid ${frame==="crown"?T2.gold+"50":frame==="glow"?T2.olive+"50":T2.border}`}}>
            <div style={{
              width:52,height:52,borderRadius:"50%",overflow:"hidden",flexShrink:0,
              boxShadow:frame==="crown"?`0 0 0 3px ${T2.gold},0 0 16px ${T2.gold}60`
                :frame==="glow"?`0 0 0 2px ${T2.olive},0 0 12px ${T2.olive}50`:"none",
            }}>
              <img src={profileRow.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:T2.white,marginBottom:3}}>Current photo</div>
              {frame && (
                <div style={{fontSize:10,fontWeight:700,color:frame==="crown"?T2.gold:T2.olive,
                  letterSpacing:"0.08em"}}>
                  {frame==="crown"?"👑 Crown Frame":"✨ Glow Frame"} · NFT Holder
                </div>
              )}
            </div>
            <button onClick={onRemovePhoto} style={{
              background:"transparent",border:`1px solid rgba(248,113,113,0.3)`,
              borderRadius:7,padding:"6px 10px",fontSize:11,color:"#f87171",
              cursor:"pointer",flexShrink:0,
            }}>Remove</button>
          </div>
        )}

        {/* Upload section — NFT gated */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",
            color:T2.muted,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:T2.olive,fontSize:8}}>✦</span>
            {canUpload ? "Upload Photo" : "Photo Upload · NFT Required"}
          </div>

          {canUpload ? (
            <div>
              <label style={{
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                width:"100%",padding:"13px 0",
                background: uploading ? T2.bg3 : `${T2.olive}12`,
                border:`1px dashed ${uploading?T2.border:T2.olive}`,
                borderRadius:10,cursor: uploading?"default":"pointer",
                fontSize:13,fontWeight:600,color:uploading?T2.dim:T2.olive,
                transition:"all 0.2s",
              }}>
                {uploading ? "Uploading…" : "📷  Choose Photo"}
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  style={{display:"none"}}
                  disabled={uploading}
                  onChange={e=>{
                    const f = e.target.files?.[0];
                    if (f) onUploadPhoto(f);
                  }}/>
              </label>
              {/* Frame indicator */}
              <div style={{marginTop:8,fontSize:10,color:T2.dim,lineHeight:1.5}}>
                {isFullEco
                  ? <span style={{color:T2.gold}}>👑 Your photo will display with a Crown Frame</span>
                  : isNFT
                    ? <span style={{color:T2.olive}}>✨ Your photo will display with a Glow Frame</span>
                    : null
                }
              </div>
              {error && <div style={{marginTop:8,fontSize:11,color:"#f87171"}}>{error}</div>}
              <div style={{marginTop:6,fontSize:10,color:T2.dim}}>JPEG, PNG or WebP · Max 2MB</div>
            </div>
          ) : (
            <div style={{
              padding:"16px",background:T2.bg3,borderRadius:10,
              border:`1px solid ${T2.border}`,
            }}>
              <div style={{fontSize:12,color:T2.dim,lineHeight:1.6,marginBottom:10}}>
                Upload a custom profile photo by holding a <span style={{color:T2.olive,fontWeight:600}}>Grass Toucher</span> or <span style={{color:"#a78bfa",fontWeight:600}}>Screen Toucher</span> NFT.
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1,padding:"8px 10px",background:T2.bg2,
                  border:`1px solid rgba(147,168,90,0.2)`,borderRadius:7,
                  fontSize:10,color:"rgba(147,168,90,0.5)",textAlign:"center",
                  opacity:0.6}}>🌿 Grass Toucher</div>
                <div style={{flex:1,padding:"8px 10px",background:T2.bg2,
                  border:`1px solid rgba(167,139,250,0.2)`,borderRadius:7,
                  fontSize:10,color:"rgba(167,139,250,0.5)",textAlign:"center",
                  opacity:0.6}}>📱 Screen Toucher</div>
              </div>
            </div>
          )}
        </div>

        {/* Emoji section — always available */}
        <div>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",
            color:T2.muted,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:T2.olive,fontSize:8}}>✦</span>
            Choose Emoji
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["🌿","🌱","🌲","🏔️","☀️","🦅","🐾","🌊","🍃","🌾"].map(e=>(
              <button key={e} onClick={()=>onSelectEmoji(e)} style={{
                width:44,height:44,borderRadius:10,fontSize:22,
                background: profileRow?.avatar_emoji===e && !hasPhoto
                  ? `${T2.olive}20` : T2.bg3,
                border:`1px solid ${profileRow?.avatar_emoji===e && !hasPhoto ? T2.olive : T2.border}`,
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all 0.15s",
              }}>{e}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const {username:slug} = router.query;
  const username = norm(slug??"");

  // Viewer identity (from localStorage)
  const [viewer,   setViewer]   = useState("");
  const isOwner = viewer && viewer === username;

  // Data
  const [streakRow,    setStreakRow]    = useState(null);
  const [profileRow,   setProfileRow]   = useState(null);
  const [subCount,     setSubCount]     = useState(null);
  const [rank,         setRank]         = useState(null);
  const [totalUsers,   setTotalUsers]   = useState(null);
  const [recentProofs,   setRecentProofs]   = useState([]);
  const [topStreaks,     setTopStreaks]     = useState([]);
  const [communityTop,  setCommunityTop]   = useState([]);
  const [impact,        setImpact]         = useState(null);
  const [referrals,     setReferrals]      = useState([]);
  const [refLinkCopied, setRefLinkCopied]  = useState(false);
  const [challenges,    setChallenges]     = useState([]);
  const [chalProgress,  setChalProgress]   = useState([]);
  const [challengesDone,setChallengesDone] = useState(0);
  const [challengesSent,setChallengesSent] = useState(0);
  const [loading,       setLoading]        = useState(true);
  const [walletAddr,    setWalletAddr]     = useState(null);
  const [walletVerified,setWalletVerified] = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [editMode,      setEditMode]      = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarUploading,  setAvatarUploading]  = useState(false);
  const [avatarError,      setAvatarError]      = useState("");
  const [showChallenge,setShowChallenge] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState([]);

  useEffect(()=>{
    const saved = typeof window!=="undefined" ? localStorage.getItem("pog_username") : null;
    if (saved) setViewer(norm(saved));
  },[]);

  useEffect(()=>{
    if (!username) return;
    (async()=>{
      setLoading(true);

      // Step 1: user streak + profile + submissions (parallel — no dependencies)
      const [{data:sr},{data:pr},{count:subs}] = await Promise.all([
        supabase.from("Streaks").select("current_streak,best_streak,last_submission_date,shield_count").eq("username",username).maybeSingle(),
        supabase.from("Profiles").select("bio,location,avatar_emoji,avatar_url,avatar_frame,joined_at,wallet_verified,has_touchgrass_holder,has_grass_toucher,has_screen_toucher,referral_count_successful,referral_count_pending,referral_badge").eq("username",username).maybeSingle(),
        supabase.from("Submissions").select("id",{count:"exact",head:true}).eq("username",username).in("status",["pending","approved"]),
      ]);

      // Step 2: community data + full leaderboard for rank lookup
      // Fetch active challenges for this user
      const { data: challengeRows } = await supabase
        .from("Challenges")
        .select("*")
        .or(`challenger.eq.${username},challenged.eq.${username}`)
        .in("status", ["pending","active"])
        .order("created_at", { ascending: false })
        .limit(5);
      setActiveChallenges(challengeRows ?? []);

      const [{data:allStreaks},{data:recentSubs},{data:impactRows},{data:chalRows},{data:referralRows}] = await Promise.all([
        supabase.from("Streaks").select("username,current_streak").order("current_streak",{ascending:false}),
        supabase.from("Submissions").select("created_at,photo_url").eq("username",username).in("status",["pending","approved"]).order("created_at",{ascending:false}).limit(10),
        supabase.from("Impact").select("trees_funded,co2_lbs,donated_usd").eq("username",username),
        supabase.from("Challenges").select("*").or(`challenger.eq.${username},challenged.eq.${username}`).order("created_at",{ascending:false}).limit(20),
        supabase.from("Referrals").select("referred_username,status,converted_at,created_at").eq("referrer_username",username).order("created_at",{ascending:false}).limit(20),
      ]);

      // Process challenges
      const chalList = chalRows ?? [];
      setChallenges(chalList);
      setChallengesDone(chalList.filter(c => c.status === "completed").length);
      setChallengesSent(chalList.filter(c => norm(c.challenger) === username).length);
      setReferrals(referralRows ?? []);

      // Fetch progress rows for active challenges
      const activeChalIds = chalList.filter(c => c.status === "active").map(c => c.id);
      if (activeChalIds.length > 0) {
        const { data: progRows } = await supabase
          .from("ChallengeProgress").select("*").in("challenge_id", activeChalIds);
        setChalProgress(progRows ?? []);
      }

      // Find user's rank by position in the ordered list
      const allRows = allStreaks ?? [];
      const rankIdx = allRows.findIndex(r => norm(r.username) === username);
      const computedRank = rankIdx >= 0 ? rankIdx + 1 : null;
      const topRows = allRows.slice(0, 8);

      setStreakRow(sr);
      setProfileRow(pr);
      setWalletAddr(pr?.wallet_address ?? null);
      setWalletVerified(pr?.wallet_verified ?? false);
      setSubCount(subs??0);
      setRank(computedRank);
      setTotalUsers(allRows.length || 1);

      const streak = sr?.current_streak??1;
      setRecentProofs((recentSubs??[]).map((sub,i)=>({
        day: Math.max(1,streak-i),
        photo_url: sub.photo_url||null,
        when: new Date(sub.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      })));

      setTopStreaks((topRows??[]).map(r=>({username:norm(r.username),streak:r.current_streak??1})));
      setCommunityTop((topRows??[]).filter(r=>norm(r.username)!==username).slice(0,5).map(r=>({username:norm(r.username),streak:r.current_streak??1})));

      // Aggregate impact
      if (impactRows?.length) {
        setImpact({
          trees:  impactRows.reduce((s,r)=>s+(r.trees_funded??0),0),
          co2:    impactRows.reduce((s,r)=>s+(r.co2_lbs??0),0),
          donated:impactRows.reduce((s,r)=>s+(r.donated_usd??0),0),
        });
      }

      setLoading(false);
    })();
  },[username]);

  // Handle Phantom mobile deep link return
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("wallet_verify") !== "1") return;
    const pubkey = params.get("publicKey");
    if (!pubkey || !username) return;

    // Save wallet to Supabase
    (async () => {
      const { error: saveErr } = await supabase.from("Profiles").upsert({
        username,
        wallet_address:         pubkey,
        wallet_verified:        true,
        wallet_verified_at:     new Date().toISOString(),
        holder_tier:            "none",
        wallet_last_checked_at: new Date().toISOString(),
      }, { onConflict: "username" });

      if (!saveErr) {
        setWalletAddr(pubkey);
        setWalletVerified(true);
        // Clean URL
        window.history.replaceState({}, "", `/u/${username}`);
      }
    })();
  }, [username]);

  // Save profile field to Supabase
  const saveField = async (field, value) => {
    setProfileRow(prev=>({...prev,[field]:value}));
    await supabase.from("Profiles").upsert({username, [field]:value},{onConflict:"username"});
  };

  const copyProfile = ()=>{
    if (typeof window!=="undefined") navigator.clipboard.writeText(window.location.href).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),1800);
  };

  const current = streakRow?.current_streak??0;
  const best    = streakRow?.best_streak??0;
  const shields = streakRow?.shield_count??0;
  const tier    = getTier(current);
  const pct     = (rank !== null && totalUsers>0) ? ((rank/totalUsers)*100).toFixed(2) : "—";
  const grassScore = Math.floor(current*38+(subCount??0)*12+best*22);
  const badges  = ALL_BADGES.map(b=>({...b,earned:b.condition(current,subCount??0,challengesDone,challengesSent,grassScore,shields)}));
  // Merge referral badges
  const refSuccessful = profileRow?.referral_count_successful ?? 0;
  const referralBadgeList = REFERRAL_BADGES.map(b => ({
    ...b, id:b.slug,
    desc:`Refer ${b.count} friend${b.count>1?"s":""} who reach Day 10`,
    earned: refSuccessful >= b.count,
    condition:()=>false,
  }));
  const allBadgesDisplay = [...badges, ...referralBadgeList];
  const earnedCount = allBadgesDisplay.filter(b=>b.earned).length;
  const thresholds=[7,14,30,50,100,180,365,500,1000];
  const prev2  = [...[0,...thresholds]].reverse().find(t=>current>=t)??0;
  const nextT  = thresholds.find(t=>t>current);
  const fill   = nextT?Math.round(((current-prev2)/(nextT-prev2))*100):100;
  const daysLeft = nextT?nextT-current:0;
  const joinDate = profileRow?.joined_at
    ? new Date(profileRow.joined_at).toLocaleDateString("en-US",{month:"long",year:"numeric"})
    : null;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
    @keyframes shimmer{0%,100%{opacity:0.5;}50%{opacity:0.9;}}
    .fade{animation:fadeUp 0.6s ease both;}
    .fade2{animation:fadeUp 0.6s 0.1s ease both;}
    .fade3{animation:fadeUp 0.6s 0.2s ease both;}
    .proof-scroll{display:flex;gap:11px;overflow-x:auto;padding-bottom:10px;scrollbar-width:none;}
    .proof-scroll::-webkit-scrollbar{display:none;}
    .card{background:${T.bg2};border:1px solid ${T.border};border-radius:14px;padding:22px;}
    .ct{font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${T.muted};margin-bottom:16px;}
    .ctr{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
    .va{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${T.dim};text-decoration:none;font-weight:500;transition:color 0.2s;}
    .va:hover{color:${T.olive};}
    .btn-out{background:transparent;border:1px solid ${T.border};border-radius:8px;padding:8px 16px;color:${T.white};font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;letter-spacing:0.08em;transition:all 0.2s;text-decoration:none;display:inline-flex;align-items:center;gap:5px;}
    .btn-out:hover{border-color:${T.olive};color:${T.olive};}
    .btn-ol{background:${T.olive};border:none;border-radius:8px;padding:8px 16px;color:#0e1108;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:0.1em;text-transform:uppercase;transition:all 0.2s;}
    .btn-ol:hover{background:#a8be6a;}
    .skel{background:${T.bg3};border-radius:6px;animation:shimmer 1.8s ease-in-out infinite;}
    .nav-lk{color:${T.dim};font-size:13px;font-weight:500;text-decoration:none;letter-spacing:0.04em;transition:color 0.2s;}
    .nav-lk:hover{color:${T.white};}
    @media(max-width:768px){
      .hi{flex-direction:column!important;align-items:stretch!important;}
      .shud{width:100%!important;min-width:0!important;margin-top:12px!important;
        padding:20px 16px!important;order:2;}
      .hi>.fade{order:1;}
      .two{grid-template-columns:1fr!important;}
      .three{grid-template-columns:1fr!important;}
      .strip{flex-wrap:wrap!important;}
      .strip>div{flex:1 1 calc(33% - 1px)!important;min-width:0!important;
        border-right:none!important;border-bottom:1px solid ${T.border}!important;}
      .badge-grid{grid-template-columns:repeat(4,1fr)!important;}
      .nav-links{display:none!important;}
      .nav-brand{font-size:15px!important;}
      .hero-actions a,.hero-actions button{
        font-size:10px!important;padding:6px 9px!important;letter-spacing:0.02em!important;}
    }
    @media(max-width:480px){
      .strip>div{flex:1 1 calc(50% - 1px)!important;}
      .badge-grid{grid-template-columns:repeat(3,1fr)!important;}
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}} />
      <div style={{minHeight:"100vh",background:T.bg}}>

        {/* NAV */}
        <nav style={{position:"sticky",top:0,zIndex:200,display:"flex",alignItems:"center",
          justifyContent:"space-between",padding:"0 clamp(10px,3vw,48px)",height:52,gap:8,
          background:`${T.bg}ec`,backdropFilter:"blur(18px)",borderBottom:`1px solid ${T.border}`}}>
          <Link href="/" style={{display:"flex",alignItems:"center",gap:7,textDecoration:"none",flexShrink:0}}>
            <img src="/touchgrass-transparent.png" alt="" style={{width:24,height:24,objectFit:"contain"}} />
            <span className="nav-brand" style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:16,fontWeight:700,color:T.white,whiteSpace:"nowrap"}}>Touch Grass</span>
          </Link>
          <div className="nav-links" style={{display:"flex",gap:20,flex:1,justifyContent:"center"}}>
            <Link href="/" className="nav-lk">Dashboard</Link>
            <Link href="/leaderboard" className="nav-lk">Leaderboard</Link>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {isOwner && (
              <button onClick={()=>setEditMode(v=>!v)} className="btn-out"
                style={{fontSize:10,padding:"5px 10px",whiteSpace:"nowrap"}}>
                {editMode?"✓ Done":"✏ Edit"}
              </button>
            )}
            <button onClick={copyProfile} className="btn-ol"
              style={{fontSize:10,padding:"5px 10px",whiteSpace:"nowrap"}}>
              {copied?"✓":"↗ Share"}
            </button>
          </div>
        </nav>

        {/* HERO */}
        <section style={{position:"relative",overflow:"hidden",
          minHeight:"clamp(280px,40vh,460px)",display:"flex",alignItems:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(155deg,#1a2d0e,#2d4a18 25%,#1a3010 55%,#0a1508)"}}>
            <div style={{position:"absolute",inset:0,opacity:0.22,backgroundImage:"radial-gradient(ellipse at 70% 30%,#4a7a28,transparent 55%),radial-gradient(ellipse at 25% 70%,#2d5a18,transparent 45%)"}} />
          </div>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(10,11,8,0.3) 0%,rgba(10,11,8,0.88) 70%,rgba(10,11,8,0.99) 100%)"}} />

          <div style={{position:"relative",width:"100%",padding:"0 clamp(14px,4vw,48px) 24px"}}>
            <div className="hi" style={{display:"flex",alignItems:"flex-start",gap:20}}>

              {/* Identity */}
              <div className="fade" style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                  {/* Avatar with emoji */}
                  <div style={{width:76,height:76,borderRadius:"50%",flexShrink:0,
                    background:`linear-gradient(135deg,${T.bg3},${T.olive}30)`,
                    border:`2px solid ${tier.color}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:profileRow?.avatar_emoji?32:28,overflow:"hidden",
                    fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontWeight:700,color:T.white,
                    boxShadow: profileRow?.avatar_frame==="crown"
                      ? `0 0 0 3px ${T.gold}, 0 0 20px ${T.gold}60`
                      : profileRow?.avatar_frame==="glow"
                        ? `0 0 0 2px ${T.olive}, 0 0 16px ${T.olive}50`
                        : `0 0 22px ${tier.color}28`,
                    cursor:editMode?"pointer":"default",
                    position:"relative",
                    title:editMode?"Click to change avatar":""}}
                    onClick={()=>{ if (editMode) setShowAvatarPicker(true); }}>
                    {profileRow?.avatar_url
                      ? <img src={profileRow.avatar_url} alt=""
                          style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}} />
                      : (loading ? username?.[0]?.toUpperCase()??"?" : (profileRow?.avatar_emoji||"🌿"))
                    }
                    {editMode && (
                      <div style={{position:"absolute",inset:0,borderRadius:"50%",
                        background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",
                        justifyContent:"center",fontSize:16}}>✏</div>
                    )}
                  </div>
                  <div>
                    <span style={{display:"inline-block",fontSize:8,color:T.olive,letterSpacing:"0.16em",
                      textTransform:"uppercase",fontWeight:700,border:`1px solid ${T.olive}`,
                      borderRadius:4,padding:"2px 7px",marginBottom:6}}>◎ VERIFIED OUTDOORS</span>
                    <h1 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                      fontSize:"clamp(26px,4.5vw,50px)",fontWeight:700,color:T.white,
                      lineHeight:1,letterSpacing:"-0.02em"}}>{username||"—"}</h1>
                    <div style={{fontSize:12,color:T.dim,marginTop:3}}>@{username}
                      {joinDate&&<span style={{marginLeft:10,fontSize:11,color:T.dim}}>· Joined {joinDate}</span>}
                    </div>
                  </div>
                </div>

                {/* Bio + Location — editable if owner */}
                {editMode
                  ? <div style={{maxWidth:380,background:"rgba(0,0,0,0.3)",borderRadius:12,padding:16}}>
                      <EditableField label="Bio" value={profileRow?.bio||""} onSave={v=>saveField("bio",v)} multiline />
                      <EditableField label="Location" value={profileRow?.location||""} onSave={v=>saveField("location",v)} />
                    </div>
                  : <>
                    {profileRow?.bio&&<p style={{fontSize:13,color:T.muted,lineHeight:1.65,marginBottom:8,maxWidth:360,fontWeight:300}}>{profileRow.bio}</p>}
                    {profileRow?.location&&<div style={{fontSize:11,color:T.dim,marginBottom:12}}>📍 {profileRow.location}</div>}
                  </>
                }

                {/* Challenge highlight */}
                {(() => {
                  const activeChallenge = challenges.find(c => c.status === "active");
                  const topAchievement  = challengesDone >= 25 ? "Legendary Challenger"
                    : challengesDone >= 10 ? "Consistency Partner"
                    : challengesDone >= 3  ? "Challenge Veteran"
                    : null;
                  if (!activeChallenge && !topAchievement) return null;
                  return (
                    <div style={{marginTop:10,marginBottom:4,display:"flex",alignItems:"center",
                      gap:8,padding:"7px 12px",background:"rgba(147,168,90,0.08)",
                      border:`1px solid ${T.borderG}`,borderRadius:8,
                      width:"fit-content",maxWidth:"100%"}}>
                      {activeChallenge ? (
                        <>
                          <span style={{fontSize:12}}>⚡</span>
                          <Link href={`/challenge/${activeChallenge.slug}`} style={{
                            fontSize:11,color:T.olive,textDecoration:"none",fontWeight:600,
                            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {norm(activeChallenge.challenger)===username
                              ? `vs @${norm(activeChallenge.challenged)}`
                              : `vs @${norm(activeChallenge.challenger)}`
                            } · Active Challenge
                          </Link>
                        </>
                      ) : (
                        <>
                          <span style={{fontSize:12}}>🎯</span>
                          <span style={{fontSize:11,color:T.olive,fontWeight:600}}>{topAchievement}</span>
                          <span style={{fontSize:10,color:T.dim}}>· {challengesDone} completed</span>
                        </>
                      )}
                    </div>
                  );
                })()}
                <div className="hero-actions" style={{display:"flex",gap:7,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
                  <Link href="/" className="btn-out">← Dashboard</Link>
                  <button onClick={copyProfile} className="btn-ol">{copied?"✓ Copied":"↗ Share Profile"}</button>
                  <Link href={`/flex/${username}`} className="btn-out"
                    style={{borderColor:T.gold,color:T.gold,textDecoration:"none"}}>
                    ✦ Flex Card
                  </Link>
                  {!isOwner && username && (
                    <button onClick={()=>setShowChallenge(true)} className="btn-out"
                      style={{borderColor:T.gold,color:T.gold}}>
                      ⚡ Challenge
                    </button>
                  )}
                </div>

              </div>

              {/* Streak HUD */}
              <div className="shud fade2" style={{width:320,flexShrink:0,
                background:"rgba(12,13,10,0.84)",backdropFilter:"blur(20px)",
                border:`1px solid ${tier.color}40`,borderRadius:14,
                padding:"28px 32px",
                boxShadow:`0 0 40px ${tier.color}14`,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                textAlign:"center"}}>
                <div style={{fontSize:9,letterSpacing:"0.22em",color:T.dim,
                  textTransform:"uppercase",marginBottom:12}}>Current Streak</div>
                {loading
                  ? <div className="skel" style={{height:90,width:"80%",marginBottom:10}} />
                  : <>
                    <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                      fontSize:"clamp(88px,10vw,120px)",fontWeight:700,lineHeight:0.85,
                      letterSpacing:"-0.04em",color:T.white,marginBottom:16,
                      display:"flex",alignItems:"flex-start",justifyContent:"center",gap:6}}>
                      <span style={{fontSize:"0.3em",color:T.dim,paddingTop:"0.8em",letterSpacing:"0.06em",fontWeight:400}}>DAY</span>
                      <span>{current}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      <div style={{width:24,height:1,background:`linear-gradient(90deg,${tier.color},transparent)`}} />
                      <span style={{fontSize:10,letterSpacing:"0.18em",color:tier.color,
                        textTransform:"uppercase",fontWeight:700}}>✦ {tier.label}</span>
                      <div style={{width:24,height:1,background:`linear-gradient(90deg,transparent,${tier.color})`}} />
                    </div>
                  </>
                }
              </div>
            </div>
          </div>
        </section>

        {/* STATS STRIP */}
        <div className="strip" style={{display:"flex",background:T.bg2,borderBottom:`1px solid ${T.border}`}}>
          <StatPill icon="🔥" value={loading?"…":current}                    label="Day Streak"     accent />
          <StatPill icon="🏆" value={loading?"…":best}                        label="Longest Streak" />
          <StatPill icon="🌿" value={loading?"…":(subCount??0)}               label="Proofs Logged"  />
          <StatPill icon="⚡" value={loading?"…":grassScore.toLocaleString()} label="Grass Score"    />
          <StatPill icon="🛡" value={loading?"…":shields}                     label="Shields"        last />
        </div>

        {/* MAIN CONTENT */}
        <div style={{padding:"28px clamp(14px,5vw,64px)"}}>

          {/* ── WALLET VERIFICATION (owner only) ──────────────────────────── */}
          {isOwner && (
            <div className="card fade" style={{marginBottom:14}}>
              <div className="ct">Solana Wallet</div>
              <WalletVerify
                username={username}
                currentWallet={walletAddr}
                currentVerified={walletVerified}
                onVerified={(addr) => {
                  setWalletAddr(addr);
                  setWalletVerified(!!addr);
                }}
              />
            </div>
          )}

          {/* Show wallet publicly if verified — non-owners */}
          {!isOwner && walletVerified && walletAddr && (
            <div className="card fade" style={{marginBottom:14,
              display:"flex", alignItems:"center", gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,flexShrink:0,
                background:"rgba(147,168,90,0.1)",border:`1px solid rgba(147,168,90,0.2)`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>◎</div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:"#93a85a",marginBottom:2}}>Wallet Verified</div>
                <div style={{fontSize:11,color:"rgba(240,239,234,0.35)",fontFamily:"monospace",letterSpacing:"0.04em"}}>
                  {walletAddr.slice(0,4)}...{walletAddr.slice(-4)}
                </div>
              </div>
            </div>
          )}

          {/* ── ECOSYSTEM STATUS ─────────────────────────────────────────── */}
          {(() => {
            const hasTG = profileRow?.has_touchgrass_holder ?? false;
            const hasGT = profileRow?.has_grass_toucher     ?? false;
            const hasST = profileRow?.has_screen_toucher    ?? false;
            const count = [hasTG,hasGT,hasST].filter(Boolean).length;
            const pct   = Math.round((count/3)*100);
            const title = count===3?"FULL ECOSYSTEM TOUCHER":count===2?"ECOSYSTEM MEMBER":count===1?"TOKEN SUPPORTER":null;
            const EcoCard = ({verified,icon,name,label,accent,note}) => (
              <div style={{flex:"1 1 80px",minWidth:0,borderRadius:12,padding:"14px 8px",
                background:verified?`${accent}0a`:T.bg3,
                border:`1px solid ${verified?accent+"50":T.border}`,
                display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                opacity:verified?1:0.42,
                boxShadow:verified?`0 0 20px ${accent}18`:"none"}}>
                <div style={{fontSize:30}}>{icon}</div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:11,fontWeight:700,color:verified?T.white:T.dim,
                    letterSpacing:"0.06em",marginBottom:5}}>{name}</div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:4,
                    fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
                    color:verified?accent:T.dim,
                    border:`1px solid ${verified?accent+"40":T.border}`,
                    borderRadius:20,padding:"2px 8px",
                    background:verified?`${accent}10`:"transparent"}}>
                    {verified?"✓":"✗"} {label}
                  </div>
                  {!verified && note && (
                    <div style={{fontSize:9,color:T.dim,marginTop:6,lineHeight:1.5,
                      textAlign:"center"}}>
                      {note}
                    </div>
                  )}
                </div>
              </div>
            );
            return (
              <div className="card fade2" style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:16}}>
                  <span style={{fontSize:13}}>🌱</span>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",
                    textTransform:"uppercase",color:T.muted}}>Ecosystem Status</span>
                </div>
                <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
                  <EcoCard verified={hasTG} icon="🪙" name="$TOUCHGRASS HOLDER"
                    label={hasTG?"VERIFIED HOLDER":"NOT VERIFIED"} accent={T.gold}
                    note="Hold 100K+ $TOUCHGRASS to qualify"/>
                  <EcoCard verified={hasGT} icon="🌿" name="GRASS TOUCHER"
                    label={hasGT?"NFT HOLDER":"LOCKED"} accent={T.olive}/>
                  <EcoCard verified={hasST} icon="📱" name="SCREEN TOUCHER"
                    label={hasST?"NFT HOLDER":"LOCKED"} accent="#a78bfa"/>
                </div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"stretch"}}>
                  <div style={{flex:1,minWidth:160}}>
                    <div style={{fontSize:9,letterSpacing:"0.16em",color:T.dim,
                      textTransform:"uppercase",marginBottom:8}}>Ecosystem Completion</div>
                    <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                      fontSize:28,fontWeight:700,color:T.white,lineHeight:1,marginBottom:6}}>
                      {count} <span style={{fontSize:16,color:T.dim,fontWeight:400}}>/ 3 VERIFIED</span>
                    </div>
                    <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                      <div style={{height:"100%",width:`${pct}%`,borderRadius:99,
                        background:`linear-gradient(90deg,${T.olive},${T.gold})`,transition:"width 1.2s ease"}}/>
                    </div>
                    <div style={{fontSize:10,color:T.dim}}>{pct}%</div>
                  </div>
                  {title && (
                    <div style={{flex:1,minWidth:160,borderRadius:12,padding:"14px 16px",
                      background:count===3?`linear-gradient(135deg,${T.gold}18,${T.gold}08)`:`${T.olive}08`,
                      border:`1px solid ${count===3?T.gold+"50":T.borderG}`,
                      display:"flex",flexDirection:"column",justifyContent:"center",
                      boxShadow:count===3?`0 0 24px ${T.gold}20`:"none"}}>
                      <div style={{fontSize:8,letterSpacing:"0.18em",color:T.dim,
                        textTransform:"uppercase",marginBottom:6}}>You Are A</div>
                      {count===3&&<div style={{fontSize:16,marginBottom:4}}>👑</div>}
                      <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                        fontSize:count===3?18:15,fontWeight:700,
                        color:count===3?T.gold:T.olive,letterSpacing:"0.04em",lineHeight:1.2,
                        textShadow:count===3?`0 0 20px ${T.gold}60`:"none"}}>
                        {title}
                      </div>
                      {count===3&&(
                        <div style={{fontSize:9,color:"rgba(200,168,75,0.5)",marginTop:6}}>
                          Holds $TOUCHGRASS + Grass Toucher + Screen Toucher
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── COMMUNITY BUILDER ────────────────────────────────────────── */}
          {(() => {
            const refSuccessful = profileRow?.referral_count_successful ?? 0;
            const refPending    = profileRow?.referral_count_pending    ?? 0;
            const currentBadge  = REFERRAL_BADGES.slice().reverse().find(b => refSuccessful >= b.count);
            const nextBadge     = REFERRAL_BADGES.find(b => refSuccessful < b.count);
            const pct           = nextBadge ? Math.min(100, Math.round((refSuccessful / nextBadge.count) * 100)) : 100;
            const refLink       = typeof window !== "undefined"
              ? `${window.location.origin}/?ref=${username}` : `https://proofofgrass.app/?ref=${username}`;

            const copyRefLink = () => {
              navigator.clipboard.writeText(refLink).catch(()=>{});
              setRefLinkCopied(true);
              setTimeout(() => setRefLinkCopied(false), 2000);
            };

            // Only show to profile owner, or if they have referrals
            if (!isOwner && refSuccessful === 0) return null;

            return (
              <div className="card fade2" style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:16,
                  justifyContent:"space-between",flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:13}}>🤝</span>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",
                      textTransform:"uppercase",color:T.muted}}>Community Builder</span>
                  </div>
                  {currentBadge && (
                    <div style={{fontSize:11,color:T.gold,fontWeight:600}}>
                      {currentBadge.emoji} {currentBadge.name}
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div style={{display:"flex",gap:0,marginBottom:18,
                  borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`}}>
                  {[
                    {label:"Successful Referrals",value:refSuccessful,accent:true},
                    {label:"Pending",value:refPending,accent:false},
                    {label:"Total Invited",value:refSuccessful+refPending,accent:false},
                  ].map((s,i,arr) => (
                    <div key={s.label} style={{flex:1,textAlign:"center",padding:"14px 8px",
                      background:T.bg3,
                      borderRight:i<arr.length-1?`1px solid ${T.border}`:"none"}}>
                      <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                        fontSize:26,fontWeight:700,
                        color:s.accent?T.gold:T.white,lineHeight:1,marginBottom:4}}>
                        {s.value}
                      </div>
                      <div style={{fontSize:9,color:T.dim,letterSpacing:"0.1em",
                        textTransform:"uppercase"}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Next badge progress */}
                {nextBadge && (
                  <div style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",marginBottom:6}}>
                      <span style={{fontSize:10,color:T.dim,letterSpacing:"0.1em",
                        textTransform:"uppercase"}}>Next: {nextBadge.emoji} {nextBadge.name}</span>
                      <span style={{fontSize:11,fontWeight:600,color:T.olive}}>
                        {refSuccessful} / {nextBadge.count}
                      </span>
                    </div>
                    <div style={{height:4,background:"rgba(255,255,255,0.06)",
                      borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,borderRadius:99,
                        background:`linear-gradient(90deg,${T.olive},${T.gold})`,
                        transition:"width 1s ease"}}/>
                    </div>
                  </div>
                )}
                {!nextBadge && refSuccessful >= 100 && (
                  <div style={{fontSize:11,color:T.gold,marginBottom:16,
                    textAlign:"center",fontWeight:600}}>
                    👑 Maximum rank achieved — Touch Grass Ambassador
                  </div>
                )}

                {/* Referral link — only for owner */}
                {isOwner && (
                  <div style={{marginBottom:refSuccessful>0?16:0}}>
                    <div style={{fontSize:9,color:T.dim,letterSpacing:"0.12em",
                      textTransform:"uppercase",marginBottom:7}}>Your Referral Link</div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:0,background:T.bg3,
                        border:`1px solid ${T.border}`,borderRadius:7,
                        padding:"8px 12px",fontSize:11,color:T.muted,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {refLink}
                      </div>
                      <button onClick={copyRefLink} style={{
                        background:refLinkCopied?T.olive:"transparent",
                        border:`1px solid ${refLinkCopied?T.olive:T.borderG}`,
                        borderRadius:7,padding:"8px 14px",
                        fontSize:11,fontWeight:600,
                        color:refLinkCopied?T.bg:T.olive,cursor:"pointer",
                        flexShrink:0,transition:"all 0.2s",
                        fontFamily:"'DM Sans',sans-serif"}}>
                        {refLinkCopied?"✓ Copied":"Copy"}
                      </button>
                    </div>
                    <div style={{fontSize:10,color:T.dim,marginTop:6,lineHeight:1.5}}>
                      Referral counts after your invitee reaches Day 10.
                    </div>
                  </div>
                )}

                {/* Recent converts */}
                {referrals.length > 0 && (
                  <div>
                    <div style={{fontSize:9,color:T.dim,letterSpacing:"0.12em",
                      textTransform:"uppercase",marginBottom:10}}>Recent Activity</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {referrals.slice(0,5).map(r => (
                        <div key={r.referred_username} style={{
                          display:"flex",alignItems:"center",gap:10,
                          padding:"8px 10px",borderRadius:8,background:T.bg3,
                          border:`1px solid ${T.border}`}}>
                          <span style={{fontSize:14}}>
                            {r.status==="converted"?"✅":"🕐"}
                          </span>
                          <span style={{fontSize:12,color:T.white,flex:1}}>
                            @{r.referred_username}
                          </span>
                          <span style={{fontSize:10,fontWeight:600,
                            color:r.status==="converted"?T.olive:T.dim}}>
                            {r.status==="converted"?"Day 10 ✓":"Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Progression + Badges */}
          <div className="two" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div className="card fade2">
              <div className="ct">Your Progression</div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:22}}>
                <TierBadge name="Rooted"    day={14}  completed={current>=14}  active={current>=7  && current<14}  />
                <TierBadge name="Elite"     day={30}  completed={current>=30}  active={current>=14 && current<30}  />
                <TierBadge name="Legendary" day={50}  completed={current>=50}  active={current>=30 && current<50}  />
                <TierBadge name="Immortal"  day={100} completed={current>=100} active={current>=50  && current<100} />
                <TierBadge name="Mythic"    day={180} completed={current>=180} active={current>=100 && current<180} />
                <TierBadge name="Eternal"   day={365} completed={current>=365} active={current>=180 && current<365} />
                <TierBadge name="Ascended"  day={500} completed={current>=500} active={current>=365 && current<500} />
              </div>
              {nextT
                ? <>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:11,color:T.muted}}>Next Milestone</span>
                    <span style={{fontSize:11,color:T.dim}}>{current} / {nextT}</span>
                  </div>
                  <div style={{fontSize:11,color:T.gold,marginBottom:9,fontWeight:600}}>
                    {daysLeft} day{daysLeft!==1?"s":""} to {getTier(nextT).label}
                  </div>
                  <div style={{height:3,background:T.bg3,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${fill}%`,borderRadius:99,
                      background:`linear-gradient(90deg,${T.olive},${T.gold})`,transition:"width 1.2s ease"}} />
                  </div>
                </>
                : <div style={{fontSize:12,color:T.gold,fontWeight:700}}>✦ Maximum tier reached</div>
              }
            </div>

            <div className="card fade3">
              <div className="ct">Badges</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {allBadgesDisplay.map(b=><Badge key={b.id} b={b} />)}
              </div>
            </div>
          </div>

          {/* Recent Proofs */}
          <div className="card fade2" style={{marginBottom:14}}>
            <div className="ct">Recent Proofs</div>
            <div className="proof-scroll">
              {loading
                ? [1,2,3,4].map(i=><div key={i} className="skel" style={{width:160,height:188,borderRadius:12,flexShrink:0}} />)
                : recentProofs.length>0
                  ? recentProofs.map((p,i)=><ProofCard key={i} proof={p} idx={i} />)
                  : <p style={{color:T.dim,fontSize:13,padding:"20px 0"}}>No proofs logged yet.</p>
              }
            </div>
          </div>

          {/* ── CHALLENGE RECORD ─────────────────────────────────────────── */}
          {challenges.length > 0 && (
            <div className="card fade" style={{marginBottom:14}}>
              <div className="ct">Challenge Record</div>
              <div style={{display:"flex",flexWrap:"wrap"}}>
                {(() => {
                  const started    = challenges.length;
                  const completed  = challengesDone;
                  const active     = challenges.filter(c=>c.status==="active").length;
                  const rate       = started > 0 ? Math.round((completed/started)*100) : 0;
                  return [
                    {label:"Completed",   value:completed},
                    {label:"Active",      value:active},
                    {label:"Started",     value:started},
                    {label:"Completion",  value:`${rate}%`},
                  ].map((s,i,arr) => (
                    <div key={s.label} style={{flex:"1 1 0",minWidth:0,
                      display:"flex",flexDirection:"column",alignItems:"center",
                      padding:"14px 8px",gap:4,
                      borderRight:i<arr.length-1?`1px solid ${T.border}`:"none"}}>
                      <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                        fontSize:"clamp(22px,4vw,32px)",fontWeight:700,
                        color:T.white,lineHeight:1}}>{s.value}</span>
                      <span style={{fontSize:9,color:T.dim,letterSpacing:"0.12em",
                        textTransform:"uppercase",textAlign:"center"}}>{s.label}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ── ACTIVE CHALLENGES ─────────────────────────────────────────── */}
          {challenges.filter(c=>c.status==="active").length > 0 && (
            <div className="card fade2" style={{marginBottom:14}}>
              <div className="ct">Active Challenges</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {challenges.filter(c=>c.status==="active").map(ch => {
                  const opponent = norm(ch.challenger)===username ? norm(ch.challenged) : norm(ch.challenger);
                  const myProg   = chalProgress.find(p => norm(p.username)===username && p.challenge_id===ch.id);
                  const days     = myProg?.days_complete ?? 0;
                  const pct      = Math.min(100,Math.round((days/ch.duration_days)*100));
                  const daysLeft = ch.ends_at
                    ? Math.max(0,Math.ceil((new Date(ch.ends_at)-Date.now())/86400000))
                    : ch.duration_days;
                  return (
                    <Link key={ch.id} href={`/challenge/${ch.slug}`} style={{
                      textDecoration:"none",display:"flex",flexDirection:"column",gap:10,
                      padding:"16px 18px",background:T.bg3,
                      border:`1px solid ${T.borderG}`,borderRadius:12,
                      transition:"border-color 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=T.olive}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=T.borderG}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:T.white,marginBottom:2}}>
                            @{norm(ch.challenger)} vs @{norm(ch.challenged)}
                          </div>
                          <div style={{fontSize:10,color:T.dim}}>{ch.duration_days}-day challenge</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                            fontSize:22,fontWeight:700,color:T.white,lineHeight:1}}>
                            {days}<span style={{fontSize:13,color:T.dim,fontWeight:400}}>/{ch.duration_days}</span>
                          </div>
                          <div style={{fontSize:9,color:T.dim}}>{daysLeft}d left</div>
                        </div>
                      </div>
                      <div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,borderRadius:99,
                          background:`linear-gradient(90deg,${T.olive},${T.gold})`,transition:"width 1s ease"}} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── COMPLETED CHALLENGES ──────────────────────────────────────── */}
          {challenges.filter(c=>c.status==="completed").length > 0 && (
            <div className="card fade2" style={{marginBottom:14}}>
              <div className="ct">Completed Challenges</div>
              <div style={{display:"flex",flexDirection:"column"}}>
                {challenges.filter(c=>c.status==="completed").slice(0,5).map((ch,i,arr) => {
                  const completedDate = ch.ends_at
                    ? new Date(ch.ends_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
                    : "";
                  return (
                    <Link key={ch.id} href={`/challenge/${ch.slug}`} style={{
                      textDecoration:"none",display:"flex",alignItems:"center",gap:14,
                      padding:"12px 0",
                      borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none"}}>
                      <div style={{width:36,height:36,borderRadius:10,flexShrink:0,
                        background:`${T.gold}12`,border:`1px solid ${T.gold}30`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✦</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:T.white,marginBottom:2,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          @{norm(ch.challenger)} vs @{norm(ch.challenged)}
                        </div>
                        <div style={{fontSize:10,color:T.dim}}>{ch.duration_days}-day challenge · {completedDate}</div>
                      </div>
                      <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",
                        color:T.gold,fontWeight:700,flexShrink:0}}>Completed</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rank + Top Streaks + Community */}
          <div className="three" style={{display:"grid",gridTemplateColumns:"1fr 1.6fr 1fr",gap:14,marginBottom:14}}>

            <div className="card fade">
              <div className="ct">Leaderboard Rank</div>
              <div style={{textAlign:"center",padding:"10px 0"}}>
                <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:58,fontWeight:700,color:T.white,lineHeight:1,
                  letterSpacing:"-0.03em",marginBottom:8}}>
                  {loading?"…": rank !== null ? `#${rank}` : "—"}
                </div>
                <div style={{fontSize:9,letterSpacing:"0.14em",color:T.dim,textTransform:"uppercase",marginBottom:4}}>Global Rank</div>
                <div style={{fontSize:12,color:T.olive,fontWeight:600,marginBottom:22}}>
                  {pct !== "—" ? `Top ${pct}% of Grass Touchers` : "Not yet ranked"}
                </div>
                <Link href="/leaderboard" className="btn-out" style={{fontSize:11}}>View Leaderboard →</Link>
              </div>
            </div>

            <div className="card fade2">
              <div className="ctr">
                <span className="ct" style={{margin:0}}>Top Streaks</span>
                <Link href="/leaderboard" className="va">View All</Link>
              </div>
              {(loading?[1,2,3,4,5]:topStreaks).map((r,i)=>{
                if (loading) return <div key={i} className="skel" style={{height:34,marginBottom:8,borderRadius:8}} />;
                const isMe=norm(r.username)===username;
                const rt=getTier(r.streak);
                return (
                  <Link key={r.username} href={`/u/${r.username}`} style={{textDecoration:"none",
                    display:"flex",alignItems:"center",gap:10,padding:"9px 6px",
                    borderBottom:`1px solid ${T.border}`,borderRadius:isMe?6:0,
                    background:isMe?`${T.olive}0a`:"transparent"}}>
                    <span style={{fontSize:10,color:T.dim,width:14,textAlign:"right",flexShrink:0}}>{i+1}</span>
                    <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                      background:`linear-gradient(135deg,${T.bg3},${T.olive}28)`,
                      border:`1px solid ${T.border}`,display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:11,fontWeight:700,color:T.muted}}>
                      {r.username[0]?.toUpperCase()}
                    </div>
                    <span style={{flex:1,fontSize:12,color:isMe?T.olive:T.white,fontWeight:isMe?700:500,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>@{r.username}</span>
                    <span style={{fontSize:14,fontWeight:700,color:rt.color,
                      fontFamily:"'Cormorant Garamond',Georgia,serif",flexShrink:0}}>{r.streak}d</span>
                    <span style={{fontSize:7,color:rt.color,letterSpacing:"0.09em",textTransform:"uppercase",
                      flexShrink:0,minWidth:46,textAlign:"right"}}>{rt.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="card fade3">
              <div className="ctr">
                <span className="ct" style={{margin:0}}>Community</span>
                <Link href="/leaderboard" className="va">View All</Link>
              </div>
              {(loading?[1,2,3,4,5]:communityTop).map((f,i)=>{
                if (loading) return <div key={i} className="skel" style={{height:30,marginBottom:8,borderRadius:8}} />;
                const ft=getTier(f.streak);
                return (
                  <Link key={f.username} href={`/u/${f.username}`} style={{textDecoration:"none",
                    display:"flex",alignItems:"center",gap:9,padding:"8px 0",
                    borderBottom:`1px solid ${T.border}`}}>
                    <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                      background:`linear-gradient(135deg,${T.bg3},${T.olive}25)`,
                      border:`1px solid ${T.border}`,display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:10,fontWeight:700,color:T.muted}}>
                      {f.username[0]?.toUpperCase()}
                    </div>
                    <span style={{flex:1,fontSize:12,color:T.white,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>@{f.username}</span>
                    <span style={{fontSize:14,fontWeight:700,color:ft.color,
                      fontFamily:"'Cormorant Garamond',Georgia,serif"}}>{f.streak}d</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Active Challenges */}
          {activeChallenges.length > 0 && (
            <div className="card fade" style={{marginBottom:14}}>
              <div className="ct">Active Challenges</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {activeChallenges.map(ch => {
                  const opponent = norm(ch.challenger) === username ? norm(ch.challenged) : norm(ch.challenger);
                  const isChallenger = norm(ch.challenger) === username;
                  return (
                    <a key={ch.id} href={`/challenge/${ch.slug}`}
                      style={{textDecoration:"none",display:"flex",alignItems:"center",
                        gap:14,padding:"14px 16px",background:T.bg3,
                        border:`1px solid ${ch.status==="active"?T.olive:T.border}`,
                        borderRadius:12,transition:"border-color 0.2s"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:T.white,marginBottom:3}}>
                          vs @{opponent}
                        </div>
                        <div style={{fontSize:10,color:T.dim}}>
                          {ch.duration_days}-day challenge · {ch.status === "pending" ? (isChallenger ? "Waiting for response" : "Awaiting your response") : "Active"}
                        </div>
                      </div>
                      <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",
                        color:ch.status==="active"?T.olive:T.dim,flexShrink:0}}>
                        {ch.status === "active" ? "⚡ Active" : "⏳ Pending"}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Impact */}
          <div className="card fade" style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:"clamp(20px,3.5vw,38px)",fontWeight:700,color:T.white,lineHeight:1.1}}>
                  Every proof<br />plants impact.
                </div>
                {!impact&&!loading&&<div style={{fontSize:11,color:T.dim,marginTop:8}}>Impact data will appear as your contributions are tracked.</div>}
              </div>
              {impact
                ? <div style={{display:"flex",gap:28,flexWrap:"wrap"}}>
                    {[
                      {icon:"🌱",v:impact.trees,l:"Trees Funded"},
                      {icon:"💨",v:impact.co2%1===0?impact.co2:`${impact.co2.toFixed(1)}`,l:"lbs CO₂ Offset"},
                      {icon:"💚",v:`$${impact.donated.toLocaleString()}`,l:"Donated"},
                    ].map(s=>(
                      <div key={s.l} style={{textAlign:"center"}}>
                        <div style={{fontSize:22,marginBottom:3}}>{s.icon}</div>
                        <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:26,fontWeight:700,color:T.white,lineHeight:1}}>{s.v}</div>
                        <div style={{fontSize:9,color:T.dim,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:3}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                : loading
                  ? <div style={{display:"flex",gap:20}}>
                      {[1,2,3].map(i=><div key={i} className="skel" style={{width:80,height:60,borderRadius:8}} />)}
                    </div>
                  : null
              }
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <footer style={{borderTop:`1px solid ${T.border}`,padding:"18px clamp(14px,4vw,48px)",
          display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,background:T.bg}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <img src="/touchgrass-transparent.png" alt="" style={{width:15,height:15,opacity:0.4}} />
            <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:12,color:T.dim}}>touch grass © 2024</span>
          </div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {[["Dashboard","/"],["Leaderboard","/leaderboard"],["Website","https://touchgrass.today"]].map(([l,h])=>(
              <Link key={l} href={h} style={{fontSize:10,color:T.dim,textDecoration:"none",letterSpacing:"0.08em",textTransform:"uppercase"}}>{l}</Link>
            ))}
          </div>
          <div style={{fontSize:10,color:T.dim,letterSpacing:"0.1em"}}>BUILT ON ◎ SOLANA</div>
        </footer>
      </div>

        {/* Avatar Picker Modal */}
        {showAvatarPicker && isOwner && (
          <AvatarPickerModal
            profileRow={profileRow}
            username={username}
            uploading={avatarUploading}
            error={avatarError}
            onClose={()=>{ setShowAvatarPicker(false); setAvatarError(""); }}
            onSelectEmoji={async (emoji)=>{
              await supabase.from("Profiles").update({
                avatar_emoji: emoji, avatar_url: null, avatar_frame: null,
              }).eq("username", username);
              setShowAvatarPicker(false);
              window.location.reload();
            }}
            onUploadPhoto={async (file)=>{
              setAvatarUploading(true); setAvatarError("");
              try {
                if (file.size > 2 * 1024 * 1024) { setAvatarError("Image must be under 2MB."); setAvatarUploading(false); return; }
                if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { setAvatarError("JPEG, PNG or WebP only."); setAvatarUploading(false); return; }
                const ext = file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
                const { error: upErr } = await supabase.storage.from("avatars")
                  .upload(`${username}.${ext}`, file, { contentType:file.type, upsert:true });
                if (upErr) { setAvatarError("Upload failed — try again."); setAvatarUploading(false); return; }
                const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(`${username}.${ext}`);
                const publicUrl = `${urlData?.publicUrl}?t=${Date.now()}`;
                const frame = (profileRow?.has_touchgrass_holder && profileRow?.has_grass_toucher && profileRow?.has_screen_toucher) ? "crown"
                  : (profileRow?.has_grass_toucher || profileRow?.has_screen_toucher) ? "glow" : null;
                await supabase.from("Profiles").update({
                  avatar_url: publicUrl, avatar_emoji: null,
                  avatar_frame: frame ?? null,
                }).eq("username", username);
                window.location.reload();
              } catch(e) { setAvatarError("Something went wrong."); }
              setAvatarUploading(false);
            }}
            onRemovePhoto={async ()=>{
              await supabase.from("Profiles").update({ avatar_url:null, avatar_frame:null, avatar_emoji:"🌿" }).eq("username",username);
              window.location.reload();
            }}
          />
        )}

        {/* Challenge Modal */}
        {showChallenge && (
          <ChallengeModal
            targetUsername={username}
            viewerUsername={viewer}
            onClose={() => setShowChallenge(false)}
          />
        )}
    </>
  );
}