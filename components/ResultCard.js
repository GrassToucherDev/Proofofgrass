import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "../utils/supabase";

// ── Premium+ Themes ──────────────────────────────────────────────────────────
const THEMES = {
  classic:         { name:"Classic",         bgOverlay:null,                    accent:null,                    border:null,                    bracket:null,                    muted:null },
  golden_hour:     { name:"Golden Hour",     bgOverlay:"rgba(30,15,0,0.35)",    accent:"rgba(245,158,11,1.0)",  border:"rgba(245,158,11,0.55)", bracket:"rgba(245,158,11,0.85)", muted:"rgba(245,158,11,0.75)" },
  emerald_forest:  { name:"Emerald Forest",  bgOverlay:"rgba(0,20,8,0.35)",     accent:"rgba(16,185,129,1.0)",  border:"rgba(16,185,129,0.55)", bracket:"rgba(16,185,129,0.85)", muted:"rgba(16,185,129,0.75)" },
  midnight_meadow: { name:"Midnight Meadow", bgOverlay:"rgba(4,8,16,0.45)",     accent:"rgba(103,232,249,1.0)", border:"rgba(103,232,249,0.45)",bracket:"rgba(103,232,249,0.75)",muted:"rgba(103,232,249,0.65)"},
  summit:          { name:"Summit",          bgOverlay:"rgba(10,12,18,0.38)",   accent:"rgba(203,213,225,1.0)", border:"rgba(203,213,225,0.45)",bracket:"rgba(203,213,225,0.75)",muted:"rgba(203,213,225,0.65)"},
  aurora:          { name:"Aurora",          bgOverlay:"rgba(4,6,22,0.42)",     accent:"rgba(167,139,250,1.0)", border:"rgba(167,139,250,0.50)",bracket:"rgba(167,139,250,0.80)",muted:"rgba(167,139,250,0.70)"},
  sunset_glow:     { name:"Sunset Glow",     bgOverlay:"rgba(26,8,0,0.38)",     accent:"rgba(249,115,22,1.0)",  border:"rgba(249,115,22,0.50)", bracket:"rgba(249,115,22,0.80)", muted:"rgba(249,115,22,0.70)" },
};

const CAPTION_POOLS = {
  beginner: [
    "just touched grass. strong start. 🌿",
    "day one. certified grass toucher.",
    "left the screen. touched the ground. character arc initiated.",
    "outside logged. vitamin d detected. streak: active.",
    "not financial advice, but touch grass. this is my proof.",
    "skill check passed. grass interaction: successful.",
    "gm from outside. yes, outside. the big open-world map.",
    "offline for 20 minutes. came back with grass on my shoes.",
    "step one: go outside. step two: take photo. step three: this.",
    "touched grass before checking price. personal record.",
    "irl visit confirmed. grass: present. cope: absent.",
    "proof of work. the work was touching grass.",
    "walked outside. did not refresh x. felt fine.",
    "logged off. went out. came back stronger.",
    "fresh air acquired. timestamp verified. streak: initiated.",
  ],
  momentum: [
    "still going. streak getting real. 🌿",
    "the algorithm does not know where i am.",
    "grass touched again. this might be a habit.",
    "consistent. outside. undefeated.",
    "real-world xp farming session complete. streak: locked.",
    "the outdoor meta is holding. i am staying in.",
    "disconnected from wi-fi. connected to chlorophyll. again.",
    "dev update: shipped another walk. zero bugs.",
    "day after day. grass after grass. no signs of stopping.",
    "momentum is real. the outdoors keeps paying dividends.",
  ],
  strong: [
    "consistency looking dangerous. 🌿",
    "the grass knows my name now.",
    "this is no longer a coincidence.",
    "streak so strong it has its own lore.",
    "this started as a joke. it is not a joke anymore.",
    "certified long-term grass enjoyer. data-backed.",
    "i have touched more grass than most nfts.",
    "the streak is real. the grass is real. i am real.",
    "the outdoors have accepted me.",
    "daily grass interaction: active. cope: zero.",
  ],
  elite: [
    "this isn't a phase anymore. it's identity. 🌿",
    "i am the outdoor meta.",
    "streak unlocked: outdoor main character.",
    "the leaderboard feared this day.",
    "some people have lore. i have a streak.",
    "i do not go outside anymore. i simply return.",
    "fully on-chain. fully outside. no contradictions.",
    "elite grass toucher. verified. unstoppable.",
    "the streak has a market cap now.",
    "at this point the grass is just an extension of my wallet.",
  ],
  veteran: [
    "thirty days of proof. the streak is a structure now. 🌿",
    "a full month outside. no asterisks.",
    "the streak has survived a calendar month. it is not stopping.",
    "thirty days of daily discipline. the outdoors know me by now.",
    "veteran status. earned one day at a time.",
    "a month of proof on the books. this is the long game.",
    "one month in and the streak still feels hungry.",
    "the calendar turned. the streak did not.",
    "thirty days confirmed. the habit is now load-bearing.",
    "monthly outdoor certification. stamp of discipline.",
  ],
  legendary: [
    "fifty days outside and still counting. 🌿",
    "fifty-day streak. this is not a coincidence. this is a calling.",
    "the leaderboard takes me seriously now.",
    "fifty consecutive proofs. the chain is untouched.",
    "half a century of daily outdoor proof. legendary tier confirmed.",
    "fifty days certified. i did not come this far to stop.",
    "the streak is old enough to have its own reputation.",
    "fifty logs submitted. zero missed. the record is perfect.",
    "at fifty days, the streak starts speaking for itself.",
    "legendary status is not claimed. it is logged. every day.",
  ],
  mythic: [
    "a hundred days of daily proof. the streak is mythology. 🌿",
    "one hundred certified. no asterisks. no days off.",
    "the leaderboard is a trophy case and i have a reserved spot.",
    "one hundred consecutive outdoor logs. the chain is untouched.",
    "triple digits. the streak does not acknowledge limits.",
    "a hundred days outside. this is no longer a habit. it is identity.",
    "one hundred proofs submitted. the record is flawless.",
    "mythic status reached. the outdoors and i have an agreement.",
    "a hundred day streak is not something you build. it is something you become.",
    "the streak has a three-digit story now. every log matters.",
  ],
};

function getPool(streak) {
  if (streak >= 100) return CAPTION_POOLS.mythic;
  if (streak >= 50)  return CAPTION_POOLS.legendary;
  if (streak >= 30)  return CAPTION_POOLS.veteran;
  if (streak >= 14)  return CAPTION_POOLS.elite;
  if (streak >= 7)   return CAPTION_POOLS.strong;
  if (streak >= 3)   return CAPTION_POOLS.momentum;
  return CAPTION_POOLS.beginner;
}
function pickCaption(streak, exclude) {
  const pool = getPool(streak).filter(c => c !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}
function getTopPercent(streak) {
  if (streak >= 30) return 1;
  if (streak >= 14) return 5;
  if (streak >= 7)  return 10;
  return null;
}
function isValidXStatusUrl(raw) {
  try {
    const url = new URL(raw.trim());
    const validHosts = ["x.com","www.x.com","twitter.com","www.twitter.com"];
    if (!validHosts.includes(url.hostname.toLowerCase())) return false;
    return /\/status\/\d+/i.test(url.pathname);
  } catch { return false; }
}

const REFERRAL_BADGES = [
  { count:1,   slug:"community-builder",      name:"Community Builder",     emoji:"🤝" },
  { count:5,   slug:"grass-recruiter",        name:"Grass Recruiter",       emoji:"🌱" },
  { count:10,  slug:"community-grower",       name:"Community Grower",      emoji:"🌿" },
  { count:25,  slug:"movement-builder",       name:"Movement Builder",      emoji:"🌳" },
  { count:50,  slug:"founding-ambassador",    name:"Founding Ambassador",   emoji:"🏛"  },
  { count:100, slug:"touchgrass-ambassador",  name:"Touch Grass Ambassador",emoji:"👑" },
];

async function checkAndAwardReferralBadge(referrerUsername) {
  if (!referrerUsername) return;
  try {
    const { data:prof } = await supabase.from("Profiles")
      .select("referral_count_successful,referral_badge").eq("username",referrerUsername).maybeSingle();
    if (!prof) return;
    const count = (prof.referral_count_successful||0)+1;
    const earned = [...REFERRAL_BADGES].reverse().find(b=>count>=b.count);
    if (!earned||prof.referral_badge===earned.slug) return;
    await supabase.from("Profiles").update({referral_badge:earned.slug}).eq("username",referrerUsername);
  } catch(e) { console.warn("[referral badge]",e?.message); }
}

// ── canvas helpers ────────────────────────────────────────────────────────────
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ResultCard({ imageSrc, proofFile=null, username, initialStreak=1, onStreakUpdate, hasPremiumProofs=false }) {
  const canvasRef = useRef(null);
  const sharableFileRef = useRef(null);
  const outdoorFileRef  = useRef(null);

  const [downloadUrl,    setDownloadUrl]    = useState(null);
  const [caption,        setCaption]        = useState(()=>pickCaption(initialStreak,null));
  const [copied,         setCopied]         = useState(false);
  const [currentStreak,  setCurrentStreak]  = useState(initialStreak);
  const [tweetUrl,       setTweetUrl]       = useState("");
  const [submitStatus,   setSubmitStatus]   = useState(null);
  const [submitError,    setSubmitError]    = useState("");
  const [shareHint,      setShareHint]      = useState(false);
  const [showStylePicker,setShowStylePicker]= useState(false);
  const [shareInitiated, setShareInitiated] = useState(false);
  const [sunsetWarning,  setSunsetWarning]  = useState(false);
  const [sunsetActivated,setSunsetActivated]= useState(false);
  const [sunsetPasses,   setSunsetPasses]   = useState(0);
  const [activatingSunset,setActivatingSunset]=useState(false);
  const [luckyTouch,     setLuckyTouch]     = useState(null);
  const [selectedTheme,  setSelectedTheme]  = useState("classic");
  const [inAppBrowserMode,setInAppBrowserMode]=useState(false);
  const [shareStyle,     setShareStyle]     = useState(()=>{
    if(typeof localStorage!=="undefined") return localStorage.getItem("pog_preferred_share_style")||"outdoor_photo";
    return "outdoor_photo";
  });
  const [locationMode,   setLocationMode]   = useState(null);
  const [locationCity,   setLocationCity]   = useState("");
  const [locationRegion, setLocationRegion] = useState("");
  const [locationCountry,setLocationCountry]= useState("");
  const [gpsLat,         setGpsLat]         = useState(null);
  const [gpsLng,         setGpsLng]         = useState(null);
  const [gpsRequesting,  setGpsRequesting]  = useState(false);
  const [gpsError,       setGpsError]       = useState("");
  const [dateStr,        setDateStr]        = useState("");
  const [mounted,        setMounted]        = useState(false);

  useEffect(()=>setMounted(true),[]);
  useEffect(()=>{
    setDateStr(new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"2-digit"}).toUpperCase());
  },[]);
  useEffect(()=>{
    setCurrentStreak(initialStreak);
    setCaption(prev=>pickCaption(initialStreak,prev));
  },[initialStreak]);

  // Pre-build outdoor file
  useEffect(()=>{
    outdoorFileRef.current=null;
    if(!proofFile) return;
    if(proofFile instanceof File){
      outdoorFileRef.current=new File([proofFile],"proof-of-grass-outdoor.png",{type:proofFile.type||"image/png"});
      return;
    }
    if(typeof imageSrc==="string"&&imageSrc.startsWith("blob:")){
      fetch(imageSrc).then(r=>r.blob()).then(blob=>{
        outdoorFileRef.current=new File([blob],"proof-of-grass-outdoor.png",{type:"image/png"});
      }).catch(()=>{});
    }
  },[proofFile,imageSrc]);

  const requestGpsLocation = useCallback(()=>{
    if(!navigator.geolocation){setGpsError("Location not supported.");return;}
    setGpsRequesting(true);setGpsError("");
    navigator.geolocation.getCurrentPosition(
      pos=>{setGpsLat(Math.round(pos.coords.latitude*100)/100);setGpsLng(Math.round(pos.coords.longitude*100)/100);setLocationMode("gps");setGpsRequesting(false);},
      err=>{setGpsError(err.code===1?"Location permission denied.":"Couldn't get location.");setGpsRequesting(false);},
      {enableHighAccuracy:false,timeout:8000,maximumAge:300000}
    );
  },[]);

  const HANDLE = "@XTouchGrass";
  const TAGS   = "$TOUCHGRASS #TouchGrass #ProofOfGrass";

  const buildShareText = useCallback(()=>{
    return `${caption}\n\nDay ${currentStreak} · proof of grass 🌿\n\n${TAGS}\n${HANDLE}`;
  },[caption,currentStreak]);

  const handleNewCaption = useCallback(()=>{
    setCaption(prev=>pickCaption(currentStreak,prev));setCopied(false);
  },[currentStreak]);

  const handleCopy = useCallback(()=>{
    navigator.clipboard.writeText(buildShareText()).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  },[buildShareText]);

  const selectShareStyle=(style)=>{
    setShareStyle(style);
    try{localStorage.setItem("pog_preferred_share_style",style);}catch{}
  };

  // ── Lock In Streak ────────────────────────────────────────────────────────
  const lockInStreak = useCallback(async()=>{
    // Fallback to localStorage if username prop is empty
    const effectiveUsername = username ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim() : null);
    if(!effectiveUsername) return;
    if(submitStatus==="success") return;
    setSubmitStatus("loading");setSubmitError("");
    const rpcWithRetry = async(retries=5)=>{
      for(let attempt=0;attempt<=retries;attempt++){
        try{
          const locationPayload = locationMode==="gps"
            ?{p_location_lat_rounded:gpsLat,p_location_lng_rounded:gpsLng,p_location_label:"Nearby Region",p_location_source:"gps"}
            :locationMode==="manual"&&locationCity.trim()
              ?{p_location_city:locationCity.trim()||null,p_location_region:locationRegion.trim()||null,p_location_country:locationCountry.trim()||null,p_location_label:[locationCity.trim(),locationRegion.trim()].filter(Boolean).join(", ")||null,p_location_source:"manual"}
              :{p_location_source:"none"};
          const res = await supabase.rpc("lock_in_streak",{p_username:effectiveUsername,p_tweet_url:null,p_verification:"self_attested",...locationPayload});
          return res;
        }catch(e){
          console.warn(`lock_in_streak attempt ${attempt+1} failed:`,e?.message);
          if(attempt===retries) throw e;
          await new Promise(r=>setTimeout(r,1000*Math.pow(2,attempt)));
        }
      }
    };
    try{
      const{data:result,error:rpcError}=await rpcWithRetry();
      if(rpcError){
        try{
          const todayUTC=new Date().toISOString().slice(0,10);
          const{data:streakCheck}=await supabase.from("Streaks").select("current_streak,last_submission_date").ilike("username",effectiveUsername).maybeSingle();
          if(streakCheck?.last_submission_date&&String(streakCheck.last_submission_date).slice(0,10)===todayUTC){
            setCurrentStreak(streakCheck.current_streak??currentStreak);
            onStreakUpdate?.(streakCheck.current_streak??currentStreak);
            setSubmitStatus("success");return;
          }
        }catch{}
        setSubmitError("Streak log failed — tap again.");setSubmitStatus("error");return;
      }
      if(result?.status==="already_submitted"){setSubmitStatus("success");return;}
      const newStreak=result?.current_streak??currentStreak;
      setCurrentStreak(newStreak);onStreakUpdate?.(newStreak);setSubmitStatus("success");
      if(result?.lucky_touch?.triggered) setLuckyTouch(result.lucky_touch);
      // Referral handling
      try{
        const referrer=typeof localStorage!=="undefined"?localStorage.getItem("pog_referrer"):null;
        if(referrer&&referrer!==effectiveUsername){
          const{data:existing}=await supabase.from("Referrals").select("id").eq("referred_username",effectiveUsername).maybeSingle();
          if(!existing){
            const{data:refExists}=await supabase.from("Streaks").select("username").eq("username",referrer).maybeSingle();
            if(refExists){
              await supabase.from("Referrals").insert([{referrer_username:referrer,referred_username:effectiveUsername,status:"pending",source_url:typeof window!=="undefined"?window.location.href:null}]);
              const{data:rp}=await supabase.from("Profiles").select("referral_count_pending").eq("username",referrer).maybeSingle();
              await supabase.from("Profiles").update({referral_count_pending:(rp?.referral_count_pending??0)+1}).eq("username",referrer);
            }
          }
        }
      }catch(refErr){console.warn("[referral] insert non-fatal:",refErr?.message);}
      // Referral conversion
      try{
        if(newStreak>=10){
          const{data:pendingRef}=await supabase.from("Referrals").select("id,referrer_username").eq("referred_username",username).eq("status","pending").maybeSingle();
          if(pendingRef){
            const{count:proofCount}=await supabase.from("Submissions").select("id",{count:"exact",head:true}).eq("username",username).in("status",["pending","approved"]);
            if(proofCount>=7){
              await supabase.from("Referrals").update({status:"converted",converted_at:new Date().toISOString(),referred_reached_day_10:true}).eq("id",pendingRef.id);
              const{data:rProf}=await supabase.from("Profiles").select("referral_count_successful,referral_count_pending").eq("username",pendingRef.referrer_username).maybeSingle();
              await supabase.from("Profiles").update({referral_count_successful:(rProf?.referral_count_successful??0)+1,referral_count_pending:Math.max(0,(rProf?.referral_count_pending??1)-1)}).eq("username",pendingRef.referrer_username);
              await checkAndAwardReferralBadge(pendingRef.referrer_username);
              if(typeof localStorage!=="undefined") localStorage.removeItem("pog_referrer");
            }
          }
        }
      }catch(convErr){console.warn("[referral] conversion non-fatal:",convErr?.message);}
      // Challenge progress
      try{
        const todayUTC=new Date().toISOString().slice(0,10);
        const{data:activeChals}=await supabase.from("Challenges").select("id").or(`challenger.eq.${username},challenged.eq.${username}`).eq("status","active");
        if(activeChals?.length){
          for(const ch of activeChals){
            const{data:prog}=await supabase.from("ChallengeProgress").select("id,days_complete,last_checked").eq("challenge_id",ch.id).eq("username",username).maybeSingle();
            if(prog&&prog.last_checked!==todayUTC){
              await supabase.from("ChallengeProgress").update({days_complete:(prog.days_complete??0)+1,last_checked:todayUTC}).eq("id",prog.id);
              await supabase.from("ChallengeEvents").insert([{challenge_id:ch.id,username,event_type:"day_logged"}]);
            }
          }
        }
      }catch(chalErr){console.warn("challenge progress update failed",chalErr);}
    }catch(err){console.error("lock_in_streak exception",err);setSubmitError("Something went wrong — tap again.");setSubmitStatus("error");}
  },[username,currentStreak,onStreakUpdate,locationMode,gpsLat,gpsLng,locationCity,locationRegion,locationCountry]);

  const isInAppBrowser = typeof navigator!=="undefined"&&(/Twitter/i.test(navigator.userAgent)||/Instagram/i.test(navigator.userAgent)||/FBAN|FBAV/i.test(navigator.userAgent)||/MicroMessenger/i.test(navigator.userAgent));

  const buildShareFile = useCallback(async(style)=>{
    if(style==="outdoor_photo"){
      if(proofFile instanceof File) return new File([proofFile],"proof-of-grass-outdoor.png",{type:proofFile.type||"image/png"});
      if(imageSrc&&imageSrc.startsWith("blob:")){
        try{const res=await fetch(imageSrc);const blob=await res.blob();return new File([blob],"proof-of-grass-outdoor.png",{type:"image/png"});}catch{return null;}
      }
      return null;
    }
    if(!downloadUrl) return null;
    let file=sharableFileRef.current;
    if(!file&&downloadUrl.startsWith("data:")){
      try{const res=await fetch(downloadUrl);const blob=await res.blob();file=new File([blob],"proof-of-grass-result-card.png",{type:"image/png"});sharableFileRef.current=file;}catch{file=null;}
    }
    return file;
  },[proofFile,imageSrc,downloadUrl]);

  // ── Canvas rendering ──────────────────────────────────────────────────────
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas||!imageSrc) return;
    const ctx=canvas.getContext("2d");
    const W=1600,H=900;
    canvas.width=W;canvas.height=H;
    const img=new Image();
    img.onerror=()=>{console.error("[canvas] failed to load imageSrc:",imageSrc);};
    img.onload=()=>{try{
      const scale=Math.max(W/img.width,H/img.height);
      const dw=img.width*scale,dh=img.height*scale;
      const overflow=dw-W;
      const dx=overflow>0?-overflow*0.65:(W-dw)/2;
      const dy=(H-dh)/2;
      ctx.drawImage(img,dx,dy,dw,dh);
      const theme=THEMES[selectedTheme]||THEMES.classic;
      const defaultAccent=currentStreak>=50?"rgba(212,175,55,1.0)":"rgba(147,208,120,1.0)";
      const defaultMuted=currentStreak>=50?"rgba(212,175,55,0.75)":"rgba(255,255,255,0.62)";
      const accentText=theme.accent||defaultAccent;
      const mutedText=theme.muted||defaultMuted;
      // Vignette
      const vBot=ctx.createLinearGradient(0,H*0.62,0,H);vBot.addColorStop(0,"rgba(0,0,0,0)");vBot.addColorStop(1,"rgba(0,0,0,0.72)");ctx.fillStyle=vBot;ctx.fillRect(0,H*0.62,W,H*0.38);
      const vTop=ctx.createLinearGradient(0,0,0,H*0.22);vTop.addColorStop(0,"rgba(0,0,0,0.52)");vTop.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=vTop;ctx.fillRect(0,0,W,H*0.22);
      const vL=ctx.createLinearGradient(0,0,W*0.08,0);vL.addColorStop(0,"rgba(0,0,0,0.28)");vL.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=vL;ctx.fillRect(0,0,W*0.08,H);
      const vR=ctx.createLinearGradient(W*0.92,0,W,0);vR.addColorStop(0,"rgba(0,0,0,0)");vR.addColorStop(1,"rgba(0,0,0,0.28)");ctx.fillStyle=vR;ctx.fillRect(W*0.92,0,W*0.08,H);
      if(theme.bgOverlay){const tintG=ctx.createLinearGradient(0,0,0,H);tintG.addColorStop(0,theme.bgOverlay);tintG.addColorStop(0.5,theme.bgOverlay.replace(/[\d.]+\)$/,"0.12)"));tintG.addColorStop(1,theme.bgOverlay);ctx.fillStyle=tintG;ctx.fillRect(0,0,W,H);}
      // Grain
      const grainCanvas=document.createElement("canvas");grainCanvas.width=200;grainCanvas.height=200;const gc=grainCanvas.getContext("2d");const gd=gc.createImageData(200,200);for(let i=0;i<gd.data.length;i+=4){const v=Math.random()*255;gd.data[i]=gd.data[i+1]=gd.data[i+2]=v;gd.data[i+3]=7;}gc.putImageData(gd,0,0);const grainPattern=ctx.createPattern(grainCanvas,"repeat");ctx.fillStyle=grainPattern;ctx.fillRect(0,0,W,H);
      // Border
      const INSET=28;
      const borderCol=theme.border||(currentStreak>=50?"rgba(212,175,55,0.50)":"rgba(255,255,255,0.18)");
      const bracketCol=theme.bracket||(currentStreak>=50?"rgba(212,175,55,0.85)":"rgba(255,255,255,0.60)");
      ctx.strokeStyle=borderCol;ctx.lineWidth=1;ctx.strokeRect(INSET,INSET,W-INSET*2,H-INSET*2);
      ctx.save();ctx.globalAlpha=0.25;ctx.strokeStyle=bracketCol;ctx.lineWidth=0.5;ctx.strokeRect(INSET+3,INSET+3,W-INSET*2-6,H-INSET*2-6);ctx.restore();
      const bLen=44,bGap=INSET;ctx.strokeStyle=bracketCol;ctx.lineWidth=1.8;ctx.shadowColor="rgba(0,0,0,0.6)";ctx.shadowBlur=6;
      [[bGap,bGap,1,1],[W-bGap,bGap,-1,1],[bGap,H-bGap,1,-1],[W-bGap,H-bGap,-1,-1]].forEach(([cx,cy,sx,sy])=>{ctx.beginPath();ctx.moveTo(cx+sx*bLen,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*bLen);ctx.stroke();});
      ctx.lineWidth=0.7;ctx.globalAlpha=0.45;const bLen2=18,bGap2=INSET+8;
      [[bGap2,bGap2,1,1],[W-bGap2,bGap2,-1,1],[bGap2,H-bGap2,1,-1],[W-bGap2,H-bGap2,-1,-1]].forEach(([cx,cy,sx,sy])=>{ctx.beginPath();ctx.moveTo(cx+sx*bLen2,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*bLen2);ctx.stroke();});
      ctx.globalAlpha=1;ctx.shadowBlur=0;
      // Ghost helper
      const ghost=(text,x,y,size,align="left",col="rgba(255,255,255,0.92)",weight="400",tracking="0.12em")=>{ctx.save();ctx.font=`${weight} ${size}px 'Helvetica Neue',Helvetica,Arial,sans-serif`;ctx.fillStyle=col;ctx.textAlign=align;ctx.letterSpacing=tracking;ctx.shadowColor="rgba(0,0,0,0.90)";ctx.shadowBlur=12;ctx.shadowOffsetY=1;ctx.fillText(text,x,y);ctx.restore();};
      // Top left
      const TL_X=INSET+28,TL_Y=INSET+52;
      ghost("PROOF OF GRASS",TL_X,TL_Y,13,"left","rgba(255,255,255,0.55)","600","0.28em");
      ghost("verified outdoors",TL_X,TL_Y+28,26,"left","rgba(255,255,255,0.96)","700","0.04em");
      ctx.save();ctx.shadowColor="rgba(0,0,0,0.5)";ctx.shadowBlur=4;const ruleGrad=ctx.createLinearGradient(TL_X,0,TL_X+220,0);ruleGrad.addColorStop(0,accentText);ruleGrad.addColorStop(1,"rgba(0,0,0,0)");ctx.strokeStyle=ruleGrad;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(TL_X,TL_Y+40);ctx.lineTo(TL_X+220,TL_Y+40);ctx.stroke();ctx.restore();
      // Top right streak
      const TR_X=W-INSET-32,TR_Y=INSET+52;
      ghost("CURRENT STREAK",TR_X,TR_Y,11,"right",mutedText,"600","0.24em");
      ctx.save();ctx.shadowColor="rgba(0,0,0,0.95)";ctx.shadowBlur=20;ctx.textAlign="right";
      ctx.font=`300 22px 'Helvetica Neue',Helvetica,Arial,sans-serif`;ctx.fillStyle="rgba(255,255,255,0.55)";ctx.letterSpacing="0.18em";ctx.fillText("DAY",TR_X,TR_Y+60);
      ctx.font=`400 110px 'Helvetica Neue',Helvetica,Arial,sans-serif`;ctx.fillStyle=accentText;ctx.letterSpacing="-0.03em";ctx.fillText(String(currentStreak),TR_X,TR_Y+158);
      ctx.restore();
      if(currentStreak>=7){
        const tierLabel=currentStreak>=1000?"TRANSCENDENT":currentStreak>=500?"ASCENDED":currentStreak>=365?"ETERNAL":currentStreak>=180?"MYTHIC":currentStreak>=100?"IMMORTAL":currentStreak>=50?"LEGENDARY":currentStreak>=30?"ELITE":currentStreak>=14?"LOCKED IN":"ROOTED";
        const tierW=tierLabel.length*8+32;ctx.save();ctx.shadowBlur=0;ctx.fillStyle="rgba(0,0,0,0.35)";roundRect(ctx,TR_X-tierW,TR_Y+168,tierW,24,4);ctx.fill();ctx.restore();
        ghost(`✦ ${tierLabel} ✦`,TR_X-tierW/2,TR_Y+184,11,"center",accentText,"600","0.18em");
      }
      // Side text
      ctx.save();ctx.translate(INSET+20,H*0.68);ctx.rotate(-Math.PI/2);ctx.font="300 11px 'Helvetica Neue',Helvetica,Arial,sans-serif";ctx.fillStyle="rgba(255,255,255,0.30)";ctx.letterSpacing="0.22em";ctx.shadowColor="rgba(0,0,0,0.80)";ctx.shadowBlur=6;ctx.textAlign="center";ctx.fillText("KEEP GOING  ·  LIVE BETTER  ·  TOUCH MORE",0,0);ctx.restore();
      ctx.save();ctx.translate(W-INSET-20,H*0.38);ctx.rotate(Math.PI/2);ctx.font="300 11px 'Helvetica Neue',Helvetica,Arial,sans-serif";ctx.fillStyle="rgba(255,255,255,0.25)";ctx.letterSpacing="0.22em";ctx.shadowColor="rgba(0,0,0,0.80)";ctx.shadowBlur=6;ctx.textAlign="center";ctx.fillText("REAL MOMENTS  ·  REAL LIFE",0,0);ctx.restore();
      // Bottom
      const BL_X=INSET+28,BL_BASE=H-INSET-32;
      ghost("DATE OF CERTIFICATION",BL_X,BL_BASE-28,10,"left",mutedText,"600","0.26em");
      ghost(dateStr,BL_X,BL_BASE,22,"left","rgba(255,255,255,0.96)","300","0.08em");
      const BR_X=W-INSET-32,BR_BASE=H-INSET-32;
      ghost("CERTIFIED BY",BR_X,BR_BASE-28,10,"right",mutedText,"600","0.26em");
      ghost("touch grass",BR_X,BR_BASE,22,"right","rgba(255,255,255,0.96)","300","0.08em");
      // Seal
      const topPct=getTopPercent(currentStreak);
      if(topPct!==null){
        const SEAL_CX=BR_X-72,SEAL_Y=BR_BASE-130;
        const R1=52,R2=44,R3=38;
        ctx.save();ctx.shadowColor="rgba(0,0,0,0.75)";ctx.shadowBlur=16;
        ctx.strokeStyle=accentText;ctx.lineWidth=1.2;ctx.globalAlpha=0.75;ctx.beginPath();ctx.arc(SEAL_CX,SEAL_Y,R1,0,Math.PI*2);ctx.stroke();
        ctx.lineWidth=0.6;ctx.globalAlpha=0.40;ctx.beginPath();ctx.arc(SEAL_CX,SEAL_Y,R2,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=0.30;ctx.beginPath();ctx.arc(SEAL_CX,SEAL_Y,R3,0,Math.PI*2);ctx.stroke();
        ctx.lineWidth=0.8;ctx.globalAlpha=0.45;
        for(let t=0;t<12;t++){const angle=(t/12)*Math.PI*2;const outer=R1+2,inner=t%3===0?R1-6:R1-3;ctx.beginPath();ctx.moveTo(SEAL_CX+Math.cos(angle)*outer,SEAL_Y+Math.sin(angle)*outer);ctx.lineTo(SEAL_CX+Math.cos(angle)*inner,SEAL_Y+Math.sin(angle)*inner);ctx.stroke();}
        ctx.restore();
        ghost(`TOP ${topPct}%`,SEAL_CX,SEAL_Y,17,"center",accentText,"700","0.06em");
        ghost("GRASS TOUCHERS",SEAL_CX,SEAL_Y+20,9,"center","rgba(255,255,255,0.80)","600","0.14em");
      }
      // Logo
      const logo=new Image();
      const cacheForPreview=(dataUrl)=>{
        setDownloadUrl(dataUrl);
        try{fetch(dataUrl).then(res=>res.blob()).then(blob=>{sharableFileRef.current=new File([blob],"proof-of-grass.png",{type:"image/png"});});}catch(e){console.warn("[photo] preview cache failed:",e?.message);}
      };
      logo.onload=()=>{ctx.save();ctx.globalAlpha=0.55;ctx.drawImage(logo,BL_X-4,BL_BASE-72,36,36);ctx.restore();cacheForPreview(canvas.toDataURL("image/png"));};
      logo.onerror=()=>cacheForPreview(canvas.toDataURL("image/png"));
      logo.src="/touchgrass-transparent.png";
    }catch(canvasErr){console.error("[canvas] render error:",canvasErr?.message,canvasErr);try{setDownloadUrl(canvas.toDataURL("image/png"));}catch{}}};
    img.src=imageSrc;
  },[imageSrc,dateStr,currentStreak,selectedTheme]);

  // ── V2 UI constants ───────────────────────────────────────────────────────
  const V2G = {
    bg:"white", border:"rgba(200,220,190,0.5)", green:"#5ba622",
    darkGreen:"#1a4a0a", midGray:"#6b7d60", lightBg:"rgba(125,200,50,0.06)",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0, width:"100%",
      background:"white", borderRadius:16,
      border:`1px solid ${V2G.border}`,
      boxShadow:"0 2px 20px rgba(26,74,10,0.08)" }}>

      <canvas ref={canvasRef} style={{display:"none"}} />

      {/* ── Step 1: Your Proof ─────────────────────────────────────────── */}
      <div style={{ padding:"20px 20px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <div style={{ width:24, height:24, borderRadius:"50%", background:V2G.green,
            color:"white", fontSize:11, fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center" }}>1</div>
          <span style={{ fontSize:14, fontWeight:700, color:V2G.darkGreen }}>Your Proof 🌿</span>
          <button style={{ marginLeft:"auto", background:"transparent",
            border:`1px solid ${V2G.border}`, borderRadius:20, padding:"4px 12px",
            fontSize:11, color:V2G.midGray, cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>
            Retake
          </button>
        </div>
        <div style={{ borderRadius:12, overflow:"hidden", marginBottom:12,
          background:"rgba(200,220,190,0.2)", minHeight:200,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          {imageSrc
            ? <img src={imageSrc} alt="Your proof" style={{ width:"100%", objectFit:"cover", maxHeight:300 }} />
            : <div style={{ padding:40, textAlign:"center", color:V2G.midGray }}>
                <div style={{ fontSize:40, marginBottom:8 }}>🌿</div>
                <div style={{ fontSize:13 }}>Upload your outdoor photo</div>
              </div>
          }
        </div>
        {imageSrc && !downloadUrl && (
          <div style={{ textAlign:"center", fontSize:11, color:V2G.midGray, marginBottom:8, padding:"8px" }}>
            ⏳ Building your result card…
          </div>
        )}
      </div>

      {downloadUrl && (
        <div style={{ padding:"0 20px" }}>

          {/* ── Step 2: Card Type ─────────────────────────────────────────── */}
          <div style={{ margin:"16px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:V2G.green,
                color:"white", fontSize:11, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center" }}>2</div>
              <span style={{ fontSize:14, fontWeight:700, color:V2G.darkGreen }}>Card Type 🎴</span>
              <span style={{ fontSize:11, color:V2G.midGray, marginLeft:4 }}>What would you like to share?</span>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>selectShareStyle("outdoor_photo")}
                style={{ flex:1, padding:"14px 12px", borderRadius:12, cursor:"pointer",
                  border:`2px solid ${shareStyle==="outdoor_photo"?V2G.green:V2G.border}`,
                  background:shareStyle==="outdoor_photo"?"rgba(125,200,50,0.08)":"white",
                  display:"flex", flexDirection:"column", gap:6, textAlign:"left",
                  fontFamily:"DM Sans,sans-serif" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:20 }}>📸</span>
                  {shareStyle==="outdoor_photo" && (
                    <div style={{ width:20, height:20, borderRadius:"50%", background:V2G.green,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:10, color:"white" }}>✓</div>
                  )}
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:V2G.darkGreen }}>Outdoor Photo</div>
                <div style={{ fontSize:10, color:V2G.midGray }}>+ Proof Details</div>
              </button>
              <button onClick={()=>selectShareStyle("result_card")}
                style={{ flex:1, padding:"14px 12px", borderRadius:12, cursor:"pointer",
                  border:`2px solid ${shareStyle==="result_card"?V2G.green:V2G.border}`,
                  background:shareStyle==="result_card"?"rgba(125,200,50,0.08)":"white",
                  display:"flex", flexDirection:"column", gap:6, textAlign:"left",
                  fontFamily:"DM Sans,sans-serif" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:20 }}>✨</span>
                  {shareStyle==="result_card" && (
                    <div style={{ width:20, height:20, borderRadius:"50%", background:V2G.green,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:10, color:"white" }}>✓</div>
                  )}
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:V2G.darkGreen }}>Result Card</div>
                <div style={{ fontSize:10, color:V2G.midGray }}>Styled Share</div>
              </button>
            </div>
          </div>

          {/* ── Step 3: Location ──────────────────────────────────────────── */}
          <div style={{ margin:"16px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:V2G.green,
                color:"white", fontSize:11, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center" }}>3</div>
              <span style={{ fontSize:14, fontWeight:700, color:V2G.darkGreen }}>Location 📍</span>
              <span style={{ fontSize:11, color:V2G.midGray, marginLeft:4 }}>Display location</span>
            </div>
            {locationMode===null ? (
              <div>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <button onClick={requestGpsLocation} disabled={gpsRequesting}
                    style={{ flex:1, padding:"10px 8px", borderRadius:20, cursor:"pointer",
                      border:`1.5px solid ${V2G.green}`, background:"rgba(125,200,50,0.08)",
                      color:V2G.green, fontSize:12, fontWeight:600, fontFamily:"DM Sans,sans-serif" }}>
                    📍 {gpsRequesting?"Locating…":"Use My Location"}
                  </button>
                  <button onClick={()=>setLocationMode("manual")}
                    style={{ flex:1, padding:"10px 8px", borderRadius:20, cursor:"pointer",
                      border:`1.5px solid ${V2G.border}`, background:"white",
                      color:V2G.darkGreen, fontSize:12, fontWeight:600, fontFamily:"DM Sans,sans-serif" }}>
                    ✏️ Enter City
                  </button>
                  <button onClick={()=>setLocationMode("none")}
                    style={{ flex:1, padding:"10px 8px", borderRadius:20, cursor:"pointer",
                      border:`1.5px solid ${V2G.border}`, background:"white",
                      color:V2G.midGray, fontSize:12, fontWeight:600, fontFamily:"DM Sans,sans-serif" }}>
                    Skip
                  </button>
                </div>
                {gpsError&&<div style={{ fontSize:11, color:"#e05050", marginTop:4 }}>{gpsError}</div>}
              </div>
            ) : locationMode==="manual" ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <input value={locationCity} onChange={e=>setLocationCity(e.target.value)}
                  placeholder="City (e.g. Tampa)"
                  style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${V2G.border}`,
                    fontSize:13, color:V2G.darkGreen, outline:"none", fontFamily:"DM Sans,sans-serif" }} />
                <div style={{ display:"flex", gap:8 }}>
                  <input value={locationRegion} onChange={e=>setLocationRegion(e.target.value)}
                    placeholder="State/Region"
                    style={{ flex:1, padding:"10px 14px", borderRadius:10, border:`1.5px solid ${V2G.border}`,
                      fontSize:13, color:V2G.darkGreen, outline:"none", fontFamily:"DM Sans,sans-serif" }} />
                  <input value={locationCountry} onChange={e=>setLocationCountry(e.target.value)}
                    placeholder="Country"
                    style={{ flex:1, padding:"10px 14px", borderRadius:10, border:`1.5px solid ${V2G.border}`,
                      fontSize:13, color:V2G.darkGreen, outline:"none", fontFamily:"DM Sans,sans-serif" }} />
                </div>
                <button onClick={()=>setLocationMode(null)}
                  style={{ fontSize:11, color:V2G.midGray, background:"none", border:"none",
                    cursor:"pointer", textAlign:"left", textDecoration:"underline", fontFamily:"DM Sans,sans-serif" }}>
                  ← Back
                </button>
              </div>
            ) : locationMode==="gps" ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"10px 14px", borderRadius:10, background:"rgba(125,200,50,0.08)",
                border:`1px solid ${V2G.green}` }}>
                <span style={{ fontSize:12, color:V2G.green }}>📍 Approximate location added</span>
                <button onClick={()=>{setLocationMode(null);setGpsLat(null);setGpsLng(null);}}
                  style={{ fontSize:11, color:V2G.midGray, background:"none", border:"none",
                    cursor:"pointer", textDecoration:"underline", fontFamily:"DM Sans,sans-serif" }}>
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"10px 14px", borderRadius:10, background:"rgba(200,220,190,0.15)",
                border:`1px solid ${V2G.border}` }}>
                <span style={{ fontSize:12, color:V2G.midGray }}>No location</span>
                <button onClick={()=>setLocationMode(null)}
                  style={{ fontSize:11, color:V2G.green, background:"none", border:"none",
                    cursor:"pointer", textDecoration:"underline", fontFamily:"DM Sans,sans-serif" }}>
                  Add location
                </button>
              </div>
            )}
            {(locationCity||gpsLat) && (
              <div style={{ fontSize:11, color:V2G.midGray, marginTop:6 }}>
                📍 {locationMode==="gps"?"Nearby Region (approx.)":[locationCity,locationRegion,locationCountry].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          {/* ── Step 4: Caption Preview ────────────────────────────────────── */}
          <div style={{ margin:"16px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:V2G.green,
                color:"white", fontSize:11, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center" }}>4</div>
              <span style={{ fontSize:14, fontWeight:700, color:V2G.darkGreen }}>Caption Preview ✏️</span>
            </div>
            <div style={{ position:"relative", padding:"12px 14px", borderRadius:10,
              border:`1.5px solid ${V2G.border}`, background:"rgba(125,200,50,0.03)" }}>
              <p style={{ fontSize:12, color:V2G.darkGreen, lineHeight:1.6, margin:0 }}>{caption}</p>
              <p style={{ fontSize:11, color:V2G.green, margin:"6px 0 0", lineHeight:1.6 }}>
                {TAGS}<br/>@TouchGrass #GrassTouchers
              </p>
              <button onClick={handleNewCaption}
                style={{ position:"absolute", top:10, right:10, background:"none",
                  border:`1px solid ${V2G.border}`, borderRadius:20, padding:"3px 10px",
                  fontSize:10, color:V2G.midGray, cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>
                ✏️ Edit
              </button>
            </div>
          </div>

          {/* ── Step 5: Card Skin ──────────────────────────────────────────── */}
          {hasPremiumProofs && (
            <div style={{ margin:"16px 0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:V2G.green,
                  color:"white", fontSize:11, fontWeight:800,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>5</div>
                <span style={{ fontSize:14, fontWeight:700, color:V2G.darkGreen }}>Card Skin 🎨</span>
                <span style={{ fontSize:11, color:V2G.midGray }}>Choose a background skin</span>
              </div>
              <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:6, scrollbarWidth:"none" }}>
                {Object.entries(THEMES).map(([key,theme])=>(
                  <button key={key} onClick={()=>setSelectedTheme(key)}
                    style={{ flexShrink:0, width:72, padding:0,
                      border:`2px solid ${selectedTheme===key?V2G.green:V2G.border}`,
                      borderRadius:10, overflow:"hidden", cursor:"pointer", background:"white",
                      display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:"100%", height:48, background:theme.bgOverlay
                      ?`linear-gradient(135deg,${theme.accent}44,${theme.accent}22)`
                      :"linear-gradient(135deg,#1a4a0a,#2d7a1a)" }} />
                    <div style={{ fontSize:9, fontWeight:600, color:V2G.darkGreen,
                      padding:"4px 2px", textAlign:"center", lineHeight:1.2 }}>{theme.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Share CTAs ────────────────────────────────────────────────────── */}
      {downloadUrl && !inAppBrowserMode && submitStatus!=="success" && (
        <div style={{ padding:"0 20px 20px", display:"flex", flexDirection:"column", gap:10 }}>
          {/* Sunset warning */}
          {sunsetWarning && !sunsetActivated && (
            <div style={{ padding:"12px 14px", borderRadius:10,
              background:"rgba(232,160,32,0.08)", border:"1px solid rgba(232,160,32,0.3)",
              display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#c8a84b", marginBottom:2 }}>⏰ Deadline in ~1 hour</div>
                <div style={{ fontSize:11, color:"rgba(200,168,75,0.7)" }}>
                  {sunsetPasses>0
                    ?`You have ${sunsetPasses} Sunset Pass${sunsetPasses>1?"es":""}. Activate to extend to 2:00 AM UTC.`
                    :"No Sunset Passes. Purchase one in the Marketplace."}
                </div>
              </div>
              {sunsetPasses>0 && (
                <button onClick={()=>{}} disabled={activatingSunset}
                  style={{ background:"rgba(200,168,75,0.15)", border:"1px solid rgba(200,168,75,0.4)",
                    borderRadius:8, padding:"8px 14px", color:"#c8a84b", fontSize:12, fontWeight:700,
                    cursor:"pointer", flexShrink:0, opacity:activatingSunset?0.6:1, fontFamily:"DM Sans,sans-serif" }}>
                  {activatingSunset?"Activating…":"🌅 Activate Pass"}
                </button>
              )}
            </div>
          )}
          {sunsetActivated && (
            <div style={{ fontSize:12, color:"#5ba622", padding:"8px 12px", borderRadius:8,
              background:"rgba(125,200,50,0.08)", border:"1px solid rgba(125,200,50,0.2)" }}>
              🌅 Sunset Pass active — deadline extended to 2:00 AM UTC
            </div>
          )}

          {/* Primary — Lock In Streak */}
          <button onClick={lockInStreak}
            disabled={submitStatus==="loading"||submitStatus==="success"}
            style={{
              background:submitStatus==="loading"?"rgba(125,200,50,0.5)":"linear-gradient(135deg,#7dc832,#5ba622)",
              color:"white", border:"none", borderRadius:12, padding:"18px", width:"100%",
              fontSize:17, fontWeight:800,
              cursor:(submitStatus==="loading"||submitStatus==="success")?"default":"pointer",
              boxShadow:"0 4px 20px rgba(125,200,50,0.4)", fontFamily:"DM Sans,sans-serif",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10, letterSpacing:"0.02em",
              WebkitAppearance:"none", touchAction:"manipulation", userSelect:"none",
            }}>
            {submitStatus==="loading"?"⏳ Locking in…":"🔒 Lock In My Streak"}
          </button>

          {/* Secondary — Share to X */}
          <button onClick={()=>setShowStylePicker(true)} disabled={submitStatus==="loading"}
            style={{
              background:"white", color:V2G.darkGreen,
              border:`1.5px solid ${V2G.border}`, borderRadius:12, padding:"13px", width:"100%",
              fontSize:14, fontWeight:700,
              cursor:submitStatus==="loading"?"default":"pointer",
              fontFamily:"DM Sans,sans-serif",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              WebkitAppearance:"none", touchAction:"manipulation", userSelect:"none",
            }}>
            🚀 Share to X
          </button>

          {shareHint && (
            <p style={{ fontSize:11, color:"#5ba622", textAlign:"center", margin:0 }}>
              Select X from the share sheet, then post
            </p>
          )}
          {submitStatus==="error" && submitError && (
            <p style={{ fontSize:11, color:"#e05050", textAlign:"center", margin:0 }}>{submitError}</p>
          )}
          <p style={{ fontSize:11, color:"#6b7d60", textAlign:"center", margin:0 }}>
            Tap <strong>Lock In My Streak</strong> first, then share to X separately.
          </p>
        </div>
      )}

      {/* ── Success state ────────────────────────────────────────────────── */}
      {submitStatus==="success" && (
        <div style={{ margin:"0 20px 20px", borderRadius:14, overflow:"hidden",
          border:"1px solid rgba(125,200,50,0.3)", background:"rgba(125,200,50,0.05)" }}>
          <div style={{ padding:"16px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
              background:"rgba(125,200,50,0.15)", border:"1.5px solid rgba(125,200,50,0.4)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>✓</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#1a4a0a", marginBottom:2 }}>
                Day {currentStreak} Locked In! 🎉
              </div>
              <div style={{ fontSize:12, color:"#5ba622" }}>Your streak is saved for today.</div>
            </div>
          </div>
          <div style={{ padding:"0 16px 16px", display:"flex", gap:8 }}>
            <button onClick={()=>setShowStylePicker(true)}
              style={{ flex:1, padding:"11px", borderRadius:10, cursor:"pointer",
                background:"rgba(125,200,50,0.12)", border:"1.5px solid rgba(125,200,50,0.3)",
                color:"#5ba622", fontSize:13, fontWeight:700, fontFamily:"DM Sans,sans-serif" }}>
              📤 Share to X
            </button>
            <a href={downloadUrl} download={`proof-of-grass-day-${currentStreak}.png`}
              style={{ flex:1, padding:"11px", borderRadius:10, cursor:"pointer",
                background:"white", border:"1.5px solid rgba(200,220,190,0.5)",
                color:"#1a4a0a", fontSize:13, fontWeight:600, textDecoration:"none",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              ↓ Download Card
            </a>
          </div>
        </div>
      )}

      {/* ── Style Picker Modal ────────────────────────────────────────────── */}
      {showStylePicker && (()=>{
        const cardStyle=(style)=>({
          flex:"1 1 0", minWidth:0,
          border:`2px solid ${shareStyle===style?"#5ba622":"rgba(200,220,190,0.5)"}`,
          borderRadius:12, padding:"14px 12px", cursor:"pointer",
          background:shareStyle===style?"rgba(125,200,50,0.08)":"white",
          display:"flex", flexDirection:"column", gap:8, transition:"all 0.15s", outline:"none",
        });
        return (
          <>
            <div onClick={()=>setShowStylePicker(false)} role="button"
              style={{position:"fixed",inset:0,zIndex:997,background:"rgba(26,74,10,0.4)",backdropFilter:"blur(4px)"}} />
            <div role="dialog" aria-modal="true"
              onKeyDown={e=>{if(e.key==="Escape")setShowStylePicker(false);}} tabIndex={-1}
              style={{position:"fixed",left:0,right:0,bottom:0,zIndex:998,background:"white",
                borderTop:"1px solid rgba(200,220,190,0.5)",borderRadius:"20px 20px 0 0",
                padding:"24px 20px clamp(24px,env(safe-area-inset-bottom,24px)+24px,48px)",
                maxHeight:"85vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(26,74,10,0.12)"}}>
              <div style={{width:40,height:4,borderRadius:2,background:"rgba(200,220,190,0.5)",margin:"0 auto 20px"}} />
              <div style={{fontSize:15,fontWeight:700,color:"#1a4a0a",textAlign:"center",marginBottom:18}}>
                Choose Your Proof Style
              </div>
              <div style={{display:"flex",gap:12,marginBottom:20}}>
                <button style={cardStyle("outdoor_photo")} onClick={()=>selectShareStyle("outdoor_photo")}>
                  <div style={{width:"100%",height:140,borderRadius:8,overflow:"hidden",background:"rgba(200,220,190,0.2)",flexShrink:0}}>
                    {imageSrc&&<img src={imageSrc} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#1a4a0a"}}>Outdoor Photo</div>
                      <div style={{fontSize:10,color:"#6b7d60"}}>Authentic and simple</div>
                    </div>
                    {shareStyle==="outdoor_photo"&&<span style={{fontSize:16}}>✓</span>}
                  </div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#93a85a",background:"rgba(147,168,90,0.12)",borderRadius:20,padding:"2px 10px",alignSelf:"flex-start"}}>
                    Recommended
                  </div>
                </button>
                <button style={cardStyle("result_card")} onClick={()=>selectShareStyle("result_card")}>
                  <div style={{width:"100%",height:140,borderRadius:8,overflow:"hidden",background:"rgba(200,220,190,0.2)",flexShrink:0}}>
                    {downloadUrl&&<img src={downloadUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#1a4a0a"}}>Result Card</div>
                      <div style={{fontSize:10,color:"#6b7d60"}}>Branded and streak-focused</div>
                    </div>
                    {shareStyle==="result_card"&&<span style={{fontSize:16}}>✓</span>}
                  </div>
                </button>
              </div>
              <div style={{background:"rgba(125,200,50,0.04)",border:"1px solid rgba(200,220,190,0.5)",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#1a4a0a",lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                {buildShareText()}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setShowStylePicker(false)}
                  style={{flex:"0 0 auto",padding:"12px 18px",borderRadius:8,border:"1px solid rgba(200,220,190,0.5)",background:"white",color:"#6b7d60",fontSize:13,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>
                  Cancel
                </button>
                <button
                  onClick={()=>{
                    setShowStylePicker(false);
                    const text=buildShareText();
                    const isAndroid=/Android/i.test(navigator.userAgent??"");
                    const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent??"");
                    const file=shareStyle==="outdoor_photo"?outdoorFileRef.current:sharableFileRef.current;
                    setShareInitiated(true);
                    lockInStreak();
                    if(isIOS){
                      const canShare=!isInAppBrowser&&typeof navigator.share==="function"&&typeof navigator.canShare==="function";
                      if(canShare&&file&&navigator.canShare({files:[file]})){
                        setShareHint(true);
                        navigator.share({files:[file],text}).then(()=>setShareHint(false)).catch(err=>{setShareHint(false);if(err?.name!=="AbortError"){navigator.clipboard.writeText(text).catch(()=>{});window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,"_blank");}});
                      }else{navigator.clipboard.writeText(text).catch(()=>{});window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,"_blank");}
                    }else if(isAndroid){
                      try{if(file){const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}}catch{}
                      navigator.clipboard.writeText(text).catch(()=>{});
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,"_blank");
                    }else{
                      navigator.clipboard.writeText(text).catch(()=>{});
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,"_blank");
                    }
                  }}
                  style={{flex:1,padding:"13px",borderRadius:8,border:"none",background:"#93a85a",color:"#0e1108",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:"0.08em"}}>
                  Continue to X →
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Lucky Touch Modal ─────────────────────────────────────────────── */}
      {luckyTouch?.triggered && (
        <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,5,3,0.85)",backdropFilter:"blur(8px)",padding:"24px"}}
          onClick={()=>setLuckyTouch(null)}>
          <div style={{position:"relative",background:luckyTouch.tier==="legendary"?"linear-gradient(145deg,#1a1200,#2d2000,#1a0e00)":luckyTouch.tier==="rare"?"linear-gradient(145deg,#0a0e14,#141e2a,#0a0e14)":"linear-gradient(145deg,#0a100a,#141e10,#0a100a)",border:`1px solid ${luckyTouch.tier==="legendary"?"#c8a84b":luckyTouch.tier==="rare"?"#a78bfa":"#93a85a"}`,borderRadius:20,padding:"40px 32px",maxWidth:340,width:"100%",textAlign:"center",boxShadow:luckyTouch.tier==="legendary"?"0 0 60px rgba(200,168,75,0.35)":luckyTouch.tier==="rare"?"0 0 40px rgba(167,139,250,0.3)":"0 0 30px rgba(147,168,90,0.2)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:48,marginBottom:16}}>{luckyTouch.tier==="legendary"?"☀️":"🍀"}</div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:10,color:luckyTouch.tier==="legendary"?"#c8a84b":luckyTouch.tier==="rare"?"#a78bfa":"#93a85a"}}>
              {luckyTouch.tier==="legendary"?"☀ Sun's Blessing":luckyTouch.tier==="rare"?"🍀 Rare Lucky Touch":"🍀 Lucky Touch"}
            </div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:28,fontWeight:700,lineHeight:1.1,marginBottom:12,color:"#f0efea"}}>
              {luckyTouch.tier==="legendary"?"A Rare Blessing":luckyTouch.tier==="rare"?"Rare Reward":"Lucky Touch"}
            </div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:600,marginBottom:8,color:luckyTouch.tier==="legendary"?"#c8a84b":luckyTouch.tier==="rare"?"#a78bfa":"#93a85a"}}>
              {luckyTouch.type==="shield"?"🛡 +1 Shield":`🌱 +${luckyTouch.points} Grass Score`}
            </div>
            <div style={{fontSize:12,color:"rgba(240,239,234,0.45)",lineHeight:1.6,marginBottom:28}}>
              {luckyTouch.tier==="legendary"?"A rare blessing from the Touch Grass Sun.":luckyTouch.tier==="rare"?"Not everyone gets this. Keep touching grass.":"Keep touching grass."}
            </div>
            <button onClick={()=>setLuckyTouch(null)}
              style={{width:"100%",padding:"14px",background:luckyTouch.tier==="legendary"?"#c8a84b":luckyTouch.tier==="rare"?"#a78bfa":"#93a85a",color:luckyTouch.tier==="rare"?"#f0efea":"#0e1108",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,letterSpacing:"0.06em"}}>
              Keep Going ✦
            </button>
          </div>
          <style>{`@keyframes ltPop{from{opacity:0;transform:scale(0.82) translateY(16px);}to{opacity:1;transform:scale(1) translateY(0);}}`}</style>
        </div>
      )}
    </div>
  );
}