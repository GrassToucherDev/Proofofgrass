import { useState, useEffect, useRef } from "react";
import ChallengeModal from "../../components/ChallengeModal";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabase";

const T = {
  bg:"#0a0b08", bg2:"#111209", bg3:"#181a12",
  border:"rgba(255,255,255,0.06)", borderG:"rgba(147,168,90,0.18)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.48)", dim:"rgba(240,239,234,0.22)",
  red:"#ef4444",
};

function norm(v) { return String(v??"").replace(/@/g,"").toLowerCase().trim(); }

function getTier(n) {
  if (n>=365) return {label:"ETERNAL",   color:"#fff9c4", border:"#a08000"};
  if (n>=180) return {label:"MYTHIC",    color:"#fbbf24", border:"#92400e"};
  if (n>=100) return {label:"IMMORTAL",  color:"#f97316", border:"#7c2d12"};
  if (n>=50)  return {label:"LEGENDARY", color:T.gold,    border:"#7a5c00"};
  if (n>=30)  return {label:"ELITE",     color:"#c084fc", border:"#6d28d9"};
  if (n>=14)  return {label:"LOCKED IN", color:T.olive,   border:"#4a5a28"};
  if (n>=7)   return {label:"ROOTED",    color:"#b8c87a", border:"#5a6a30"};
  if (n>=3)   return {label:"GROWING",   color:"#a0b870", border:"#4a5828"};
  return {label:"SEED", color:"rgba(240,239,234,0.35)", border:T.border};
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
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:7,opacity:b.earned?1:0.22}}>
      <div style={{width:56,height:56,borderRadius:14,
        background:b.earned?`${T.olive}14`:"transparent",
        border:`1.5px solid ${b.earned?T.olive:T.border}`,
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
        boxShadow:b.earned?`0 0 14px ${T.olive}20`:"none"}}>
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
  const [challenges,    setChallenges]     = useState([]);
  const [chalProgress,  setChalProgress]   = useState([]);
  const [challengesDone,setChallengesDone] = useState(0);
  const [challengesSent,setChallengesSent] = useState(0);
  const [loading,       setLoading]        = useState(true);
  const [copied,       setCopied]       = useState(false);
  const [editMode,     setEditMode]     = useState(false);
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
        supabase.from("Profiles").select("bio,location,avatar_emoji,joined_at").eq("username",username).maybeSingle(),
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

      const [{data:allStreaks},{data:recentSubs},{data:impactRows},{data:chalRows}] = await Promise.all([
        supabase.from("Streaks").select("username,current_streak").order("current_streak",{ascending:false}),
        supabase.from("Submissions").select("created_at,photo_url").eq("username",username).in("status",["pending","approved"]).order("created_at",{ascending:false}).limit(10),
        supabase.from("Impact").select("trees_funded,co2_lbs,donated_usd").eq("username",username),
        supabase.from("Challenges").select("*").or(`challenger.eq.${username},challenged.eq.${username}`).order("created_at",{ascending:false}).limit(20),
      ]);

      // Process challenges
      const chalList = chalRows ?? [];
      setChallenges(chalList);
      setChallengesDone(chalList.filter(c => c.status === "completed").length);
      setChallengesSent(chalList.filter(c => norm(c.challenger) === username).length);

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
  const thresholds=[14,30,50,100];
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
      .hi{flex-direction:column!important;}
      .shud{width:100%!important;margin-top:14px!important;}
      .two{grid-template-columns:1fr!important;}
      .three{grid-template-columns:1fr!important;}
      .strip{flex-wrap:wrap!important;}
      .strip>div{min-width:50%!important;border-right:none!important;border-bottom:1px solid ${T.border};}
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}} />
      <div style={{minHeight:"100vh",background:T.bg}}>

        {/* NAV */}
        <nav style={{position:"sticky",top:0,zIndex:200,display:"flex",alignItems:"center",
          justifyContent:"space-between",padding:"0 clamp(14px,4vw,48px)",height:56,
          background:`${T.bg}ec`,backdropFilter:"blur(18px)",borderBottom:`1px solid ${T.border}`}}>
          <Link href="/" style={{display:"flex",alignItems:"center",gap:9,textDecoration:"none"}}>
            <img src="/touchgrass-transparent.png" alt="" style={{width:26,height:26,objectFit:"contain"}} />
            <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:17,fontWeight:700,color:T.white}}>touch grass</span>
          </Link>
          <div style={{display:"flex",gap:24}}>
            <Link href="/" className="nav-lk">Dashboard</Link>
            <Link href="/leaderboard" className="nav-lk">Leaderboard</Link>
          </div>
          <div style={{display:"flex",gap:8}}>
            {isOwner && (
              <button onClick={()=>setEditMode(v=>!v)} className="btn-out" style={{fontSize:11}}>
                {editMode?"✓ Done":"✏ Edit Profile"}
              </button>
            )}
            <button onClick={copyProfile} className="btn-ol">{copied?"✓ Copied":"↗ Share"}</button>
          </div>
        </nav>

        {/* HERO */}
        <section style={{position:"relative",overflow:"hidden",
          minHeight:"clamp(280px,40vh,460px)",display:"flex",alignItems:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(155deg,#1a2d0e,#2d4a18 25%,#1a3010 55%,#0a1508)"}}>
            <div style={{position:"absolute",inset:0,opacity:0.22,backgroundImage:"radial-gradient(ellipse at 70% 30%,#4a7a28,transparent 55%),radial-gradient(ellipse at 25% 70%,#2d5a18,transparent 45%)"}} />
          </div>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(10,11,8,0.3) 0%,rgba(10,11,8,0.88) 70%,rgba(10,11,8,0.99) 100%)"}} />

          <div style={{position:"relative",width:"100%",padding:"0 clamp(14px,5vw,64px) 36px"}}>
            <div className="hi" style={{display:"flex",alignItems:"flex-end",gap:28}}>

              {/* Identity */}
              <div className="fade" style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                  {/* Avatar with emoji */}
                  <div style={{width:76,height:76,borderRadius:"50%",flexShrink:0,
                    background:`linear-gradient(135deg,${T.bg3},${T.olive}30)`,
                    border:`2px solid ${tier.color}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:profileRow?.avatar_emoji?32:28,
                    fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontWeight:700,color:T.white,boxShadow:`0 0 22px ${tier.color}28`,
                    cursor:editMode?"pointer":"default",
                    title:editMode?"Click to change avatar":""}}
                    onClick={()=>{
                      if (!editMode) return;
                      const emojis=["🌿","🌱","🌲","🏔️","☀️","🦅","🐾","🌊","🍃","🌾"];
                      const cur = profileRow?.avatar_emoji||"🌿";
                      const next = emojis[(emojis.indexOf(cur)+1)%emojis.length];
                      saveField("avatar_emoji",next);
                    }}>
                    {loading?username?.[0]?.toUpperCase()??"?":(profileRow?.avatar_emoji||"🌿")}
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
                <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
                  <Link href="/" className="btn-out">← Dashboard</Link>
                  <button onClick={copyProfile} className="btn-ol">{copied?"✓ Copied":"↗ Share Profile"}</button>
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

          {/* Progression + Badges */}
          <div className="two" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div className="card fade2">
              <div className="ct">Your Progression</div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:22}}>
                <TierBadge name="Rooted"    day={14}  completed={current>=14}  active={current>=7  && current<14}  />
                <TierBadge name="Elite"     day={30}  completed={current>=30}  active={current>=14 && current<30}  />
                <TierBadge name="Legendary" day={50}  completed={current>=50}  active={current>=30 && current<50}  />
                <TierBadge name="Immortal"  day={100} completed={current>=100} active={current>=50 && current<100} />
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
                {badges.map(b=><Badge key={b.id} b={b} />)}
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