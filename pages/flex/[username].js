import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabase";
import { resolveActiveCover, isCoverUrlReady } from "../../utils/coverDefinitions";

const T = {
  bg:     "#080a06", bg2: "#0e100b", bg3: "#141710", bg4: "#1a1e13",
  border: "rgba(255,255,255,0.055)", borderG: "rgba(147,168,90,0.2)",
  olive:  "#93a85a", oliveDim: "rgba(147,168,90,0.45)",
  gold:   "#c8a84b", goldDim: "rgba(200,168,75,0.4)",
  white:  "#f0efea", muted: "rgba(240,239,234,0.52)", dim: "rgba(240,239,234,0.24)",
  purple: "#a78bfa", blue: "#60a5fa",
};

function norm(v) { return String(v??"").replace(/@/g,"").toLowerCase().trim(); }

function getTier(n) {
  if (n>=1000) return { label:"TRANSCENDENT", color:"#f0fdf4", glow:"#ffffff" };
  if (n>=500)  return { label:"ASCENDED",     color:"#e0f2fe", glow:"#0369a1" };
  if (n>=365)  return { label:"ETERNAL",      color:"#fff9c4", glow:"#a08000" };
  if (n>=180)  return { label:"MYTHIC",       color:"#fbbf24", glow:"#92400e" };
  if (n>=100)  return { label:"IMMORTAL",     color:"#f97316", glow:"#7c2d12" };
  if (n>=50)   return { label:"LEGENDARY",    color:T.gold,    glow:"#7a5c00" };
  if (n>=30)   return { label:"ELITE",        color:T.purple,  glow:"#5b21b6" };
  if (n>=14)   return { label:"LOCKED IN",    color:T.olive,   glow:"#3a4a20" };
  if (n>=7)    return { label:"ROOTED",       color:"#b8c87a", glow:"#4a5828" };
  if (n>=3)    return { label:"GROWING",      color:"#a0b870", glow:"#3a4820" };
  return             { label:"SEED",          color:T.dim,     glow:"transparent" };
}

function getTierTitle(n) {
  if (n>=1000) return "TRANSCENDENT GRASS TOUCHER";
  if (n>=500)  return "ASCENDED GRASS TOUCHER";
  if (n>=365)  return "ETERNAL GRASS TOUCHER";
  if (n>=180)  return "MYTHIC GRASS TOUCHER";
  if (n>=100)  return "IMMORTAL GRASS TOUCHER";
  if (n>=50)   return "LEGENDARY TOUCHER";
  if (n>=30)   return "ELITE GRASS TOUCHER";
  if (n>=14)   return "LOCKED IN TOUCHER";
  if (n>=7)    return "ROOTED GRASS TOUCHER";
  return "GRASS TOUCHER";
}

const ALL_BADGES = [
  {id:"first-step",     emoji:"🌱", name:"First Step",           rarity:95, condition:(s,p)=>p>=1     },
  {id:"sun",            emoji:"☀️", name:"Sun Seeker",           rarity:72, condition:(s,p)=>s>=7     },
  {id:"week",           emoji:"📅", name:"Week Warrior",         rarity:68, condition:(s,p)=>s>=7     },
  {id:"water",          emoji:"💧", name:"Water Walker",         rarity:54, condition:(s,p)=>s>=14    },
  {id:"fortnight",      emoji:"🗓️", name:"Fortnight",            rarity:50, condition:(s,p)=>s>=14    },
  {id:"forest",         emoji:"🌲", name:"Forest Friend",        rarity:38, condition:(s,p)=>s>=30    },
  {id:"monthly",        emoji:"🌙", name:"Monthly",              rarity:35, condition:(s,p)=>s>=30    },
  {id:"early",          emoji:"🌅", name:"Early Bird",           rarity:22, condition:(s,p)=>s>=50    },
  {id:"golden",         emoji:"🌄", name:"Golden Hour",          rarity:20, condition:(s,p)=>s>=50    },
  {id:"century",        emoji:"💯", name:"100 Club",             rarity:8,  condition:(s,p)=>s>=100   },
  {id:"mythic-club",    emoji:"⚡", name:"Mythic Club",           rarity:4,  condition:(s,p)=>s>=180   },
  {id:"double-century", emoji:"🔱", name:"200 Club",              rarity:3,  condition:(s,p)=>s>=200   },
  {id:"eternal-club",   emoji:"👑", name:"Eternal",              rarity:1,  condition:(s,p)=>s>=365   },
  {id:"ascended-club",  emoji:"🌌", name:"Ascended",             rarity:0.5,condition:(s,p)=>s>=500   },
  {id:"transcendent",   emoji:"✨", name:"Transcendent",         rarity:0.1,condition:(s,p)=>s>=1000  },
  {id:"trail",          emoji:"🏔️", name:"Trail Blazer",         rarity:60, condition:(s,p)=>p>=10    },
  {id:"proof-machine",  emoji:"⚙️", name:"Proof Machine",        rarity:30, condition:(s,p)=>p>=50    },
  {id:"century-prover", emoji:"📸", name:"Century Prover",       rarity:12, condition:(s,p)=>p>=100   },
  {id:"ch-starter",     emoji:"⚡", name:"Challenge Starter",    rarity:55, condition:(s,p,cd,cs)=>cs>=1  },
  {id:"ch-veteran",     emoji:"🎯", name:"Challenge Veteran",    rarity:25, condition:(s,p,cd,cs)=>cd>=3  },
  {id:"ch-partner",     emoji:"🤝", name:"Consistency Partner",  rarity:10, condition:(s,p,cd,cs)=>cd>=10 },
  {id:"ch-legend",      emoji:"👑", name:"Legendary Challenger", rarity:3,  condition:(s,p,cd,cs)=>cd>=25 },
  {id:"gs-1k",          emoji:"🔥", name:"Grass Score 1K",       rarity:45, condition:(s,p,cd,cs,gs)=>gs>=1000 },
  {id:"gs-5k",          emoji:"🔋", name:"Grass Score 5K",       rarity:15, condition:(s,p,cd,cs,gs)=>gs>=5000 },
  {id:"goat",           emoji:"⛰️", name:"Mountain Goat",        rarity:32, condition:(s,p)=>s>=30    },
  {id:"shield",         emoji:"🛡️", name:"Shield Bearer",        rarity:28, condition:(s,p,cd,cs,gs,sh)=>sh>=1 },
];

function getRarityLabel(pct) {
  if (pct <= 5)  return { label:"Legendary", color:"#f97316" };
  if (pct <= 15) return { label:"Epic",      color:T.purple   };
  if (pct <= 30) return { label:"Rare",      color:T.gold     };
  if (pct <= 60) return { label:"Uncommon",  color:T.olive    };
  return               { label:"Common",    color:T.dim       };
}

function StreakHeatmap({ submissions, streak }) {
  const days = 63;
  const today = new Date();
  today.setHours(0,0,0,0);
  const subDates = new Set(
    (submissions ?? []).map(s => new Date(s.created_at).toISOString().slice(0,10))
  );
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0,10);
    const isToday = i === days - 1;
    return { key, active: subDates.has(key), isToday };
  });
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const consistency = days > 0 ? Math.round((cells.filter(c=>c.active).length / days) * 100) : 0;
  return (
    <div>
      <div style={{ display:"flex", gap:4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {week.map((cell) => (
              <div key={cell.key} style={{
                width:10, height:10, borderRadius:2,
                background: cell.active ? `rgba(147,168,90,${cell.isToday ? 1 : 0.75})` : `rgba(255,255,255,0.05)`,
                border: cell.isToday ? `1px solid ${T.olive}` : "none",
              }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:10 }}>
        <span style={{ fontSize:9, color:T.dim, letterSpacing:"0.12em", textTransform:"uppercase" }}>Consistency Rate</span>
        <span style={{ fontSize:12, fontWeight:700, color:T.olive }}>{consistency}%</span>
      </div>
    </div>
  );
}

function BadgeHex({ badge, size = 80, showRarity = true, totalUsers = 100 }) {
  const rarity = getRarityLabel(badge.rarity);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{
        width: size, height: size * 1.1,
        clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
        background:`linear-gradient(145deg,${T.bg3},${T.bg4})`,
        position:"relative", display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:`0 0 20px ${rarity.color}30, inset 0 1px 0 rgba(255,255,255,0.08)`,
        fontSize: size * 0.38,
      }}>
        <div style={{ position:"absolute", inset:2,
          clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
          border:`1px solid ${rarity.color}40`,
          background:`linear-gradient(145deg,${rarity.color}08,transparent)`,
        }} />
        {badge.emoji}
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.white, marginBottom:2 }}>{badge.name}</div>
        {showRarity && (
          <>
            <div style={{ fontSize:9, color:rarity.color, fontWeight:600, letterSpacing:"0.06em" }}>{rarity.label}</div>
            <div style={{ fontSize:9, color:T.dim }}>{badge.rarity}% of users</div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCell({ icon, value, label, sub, accent, last }) {
  return (
    <div style={{ flex:"1 1 0", minWidth:0, display:"flex", flexDirection:"column",
      alignItems:"center", gap:5, padding:"18px 10px",
      borderRight: last ? "none" : `1px solid ${T.border}` }}>
      <span style={{ fontSize:22 }}>{icon}</span>
      <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
        fontSize:"clamp(18px,3vw,28px)", fontWeight:700, color: accent ? T.gold : T.white,
        lineHeight:1, letterSpacing:"-0.02em" }}>{value}</span>
      {sub && <span style={{ fontSize:9, color:accent?T.goldDim:T.olive, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600 }}>{sub}</span>}
      <span style={{ fontSize:8.5, color:T.dim, letterSpacing:"0.13em", textTransform:"uppercase", textAlign:"center", lineHeight:1.3 }}>{label}</span>
    </div>
  );
}

const QUOTE_POOL = {
  seed:        ["Every legend starts with day one.","The streak starts now.","Outside is where it begins.","Step one. Then step two.","The hardest part is starting."],
  growing:     ["Building something real.","Momentum is everything.","Show up. Every day.","Small steps. Big life.","The habit is forming."],
  rooted:      ["The streak is real now.","Outside every day. No excuses.","Consistency is the flex.","One week down. Keep going.","Seven days of proof."],
  locked:      ["Most people won't do this.","The proof speaks for itself.","Discipline over motivation.","Locked in. Stay locked in.","Two weeks of showing up."],
  elite:       ["Elite is a standard, not a title.","Outside is my default setting.","The grind is outdoors.","Not everyone gets here.","Thirty days is just the start."],
  legendary:   ["Consistency compounds.","Not everyone becomes legendary.","The streak doesn't lie.","Built different. Outside daily.","Legendary is earned, not given."],
  immortal:    ["The streak is the identity.","Immortal status. Earned outside.","Three figures. Outdoor certified.","Most won't even try.","The streak lives on."],
  mythic:      ["Half a year outside. Daily.","Mythic isn't given. It's earned.","The outside is home.","Consistency at a mythic level.","Built over months of proof."],
  eternal:     ["Eternal. Because I earned it.","One year of proof. Every day.","The streak is eternal now.","A year outside. No days off.","365 days of showing up."],
  ascended:    ["Beyond the leaderboard now.","Ascended. The streak transcends.","500 days of proof. Unreachable.","The outdoors chose me.","Above the noise. Outside daily."],
  transcendent:["A thousand days outside. Unmatched.","The streak has no ceiling.","Transcendent. No words left.","1000 days. The legend is complete.","The greatest outdoor streak alive."],
};

function getQuote(streak, bio) {
  if (bio && bio.trim().length > 0 && bio.trim().length <= 60) return `"${bio.trim()}"`;
  const pool = streak>=1000?QUOTE_POOL.transcendent:streak>=500?QUOTE_POOL.ascended:streak>=365?QUOTE_POOL.eternal:streak>=180?QUOTE_POOL.mythic:streak>=100?QUOTE_POOL.immortal:streak>=50?QUOTE_POOL.legendary:streak>=30?QUOTE_POOL.elite:streak>=14?QUOTE_POOL.locked:streak>=7?QUOTE_POOL.rooted:streak>=3?QUOTE_POOL.growing:QUOTE_POOL.seed;
  return `"${pool[streak % pool.length]}"`;
}

async function generateShareImage({ username, streak, tier, tierTitle, grassScore, rank, subCount, badges, best, shields, bio, hasTG, hasGT, hasST, avatarUrl, avatarFrame, theme }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ── 1. BACKGROUND ─────────────────────────────────────────────────────────
  ctx.fillStyle = "#060807";
  ctx.fillRect(0, 0, W, H);

  // ── 2. COVER ART — full bleed, light scrim only at edges ──────────────────
  if (theme.imageUrl && theme.imageUrl !== "PASTE_URL_HERE") {
    try {
      const coverImg = await loadImage(theme.imageUrl);
      const ir = coverImg.width / coverImg.height, cr = W / H;
      let dw, dh, dx, dy;
      if (ir > cr) { dh=H; dw=H*ir; dx=(W-dw)/2; dy=0; }
      else { dw=W; dh=W/ir; dx=0; dy=(H-dh)/2; }
      ctx.drawImage(coverImg, dx, dy, dw, dh);
      // Light vignette only — let art breathe
      const vig = ctx.createRadialGradient(W/2,H/2,H*0.28,W/2,H/2,H*0.78);
      vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,0.55)");
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
    } catch(e) {
      console.warn("[flex] cover failed:", e?.message);
      ctx.fillStyle=theme.fallback; ctx.fillRect(0,0,W,H);
    }
  } else {
    ctx.fillStyle=theme.fallback; ctx.fillRect(0,0,W,H);
  }

  // ── 3. OUTER BORDER ───────────────────────────────────────────────────────
  ctx.strokeStyle=theme.borderColor; ctx.lineWidth=3;
  roundRect(ctx,20,20,W-40,H-40,18); ctx.stroke();

  // ── Helper: frosted panel ─────────────────────────────────────────────────
  function frostPanel(x,y,w,h,r=12) {
    ctx.fillStyle=theme.panelTint;
    roundRect(ctx,x,y,w,h,r); ctx.fill();
    ctx.strokeStyle=theme.borderColor; ctx.lineWidth=1;
    roundRect(ctx,x,y,w,h,r); ctx.stroke();
  }

  // ── 4. TOP LEFT — Avatar + Username + Tier ────────────────────────────────
  const aSize=90, aX=44, aY=44;
  // Avatar
  try {
    if(avatarUrl) {
      const ai=await loadImage(avatarUrl);
      ctx.save(); ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2,0,Math.PI*2); ctx.clip();
      ctx.drawImage(ai,aX,aY,aSize,aSize); ctx.restore();
    } else throw new Error("no avatar");
  } catch {
    ctx.fillStyle=theme.accentColor+"40";
    ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2,0,Math.PI*2); ctx.fill();
    ctx.font="700 34px Georgia,serif"; ctx.fillStyle=theme.accentColor;
    ctx.textAlign="center"; ctx.fillText((username[0]||"?").toUpperCase(),aX+aSize/2,aY+aSize/2+12); ctx.textAlign="left";
  }
  // Avatar ring
  ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2+3,0,Math.PI*2);
  ctx.strokeStyle=avatarFrame==="crown"?"#c8a84b":theme.accentColor;
  ctx.lineWidth=3; ctx.stroke();

  // Username
  const nX=aX+aSize+16;
  const uSz=username.length>14?42:username.length>10?52:62;
  ctx.font=`700 ${uSz}px Georgia,serif`; ctx.fillStyle="#f5f4ef";
  ctx.shadowColor="rgba(0,0,0,0.95)"; ctx.shadowBlur=14;
  ctx.fillText(`@${username}`,nX,aY+56); ctx.shadowBlur=0;

  // Verified checkmark
  const nameW=ctx.measureText(`@${username}`).width;
  ctx.font="700 28px sans-serif"; ctx.fillText("✅",nX+nameW+8,aY+52);

  // Tier pill
  const pillTxt=`✦ ${tierTitle}`;
  ctx.font="700 15px 'DM Sans',sans-serif";
  const pW=ctx.measureText(pillTxt).width+28;
  ctx.fillStyle="rgba(0,0,0,0.55)"; roundRect(ctx,nX,aY+66,pW,28,14); ctx.fill();
  ctx.strokeStyle=theme.accentColor; ctx.lineWidth=1.5; roundRect(ctx,nX,aY+66,pW,28,14); ctx.stroke();
  ctx.fillStyle=theme.accentColor; ctx.textAlign="center";
  ctx.fillText(pillTxt,nX+pW/2,aY+85); ctx.textAlign="left";

  // ── 5. TOP RIGHT — Streak Box ─────────────────────────────────────────────
  const sbW=280, sbH=200, sbX=W-sbW-36, sbY=30;
  // Background panel
  ctx.fillStyle="rgba(0,0,0,0.60)";
  roundRect(ctx,sbX,sbY,sbW,sbH,14); ctx.fill();
  // Decorative border with corner marks
  ctx.strokeStyle=theme.accentColor; ctx.lineWidth=2;
  roundRect(ctx,sbX,sbY,sbW,sbH,14); ctx.stroke();
  // Corner + marks
  const corners=[[sbX+18,sbY+14],[sbX+sbW-18,sbY+14],[sbX+18,sbY+sbH-14],[sbX+sbW-18,sbY+sbH-14]];
  ctx.font="700 18px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor; ctx.textAlign="center";
  corners.forEach(([cx,cy])=>ctx.fillText("+",cx,cy+6));
  // Label
  ctx.font="600 14px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.7)";
  ctx.fillText("CURRENT STREAK",sbX+sbW/2,sbY+32);
  // Big number
  const nSz=streak>=100?100:streak>=10?118:134;
  ctx.font=`700 ${nSz}px Georgia,serif`;
  ctx.fillStyle=theme.accentColor;
  ctx.shadowColor=theme.glowColor; ctx.shadowBlur=30;
  ctx.fillText(`${streak}`,sbX+sbW/2,sbY+sbH-52); ctx.shadowBlur=0;
  // DAYS pill
  ctx.fillStyle="rgba(0,0,0,0.5)"; roundRect(ctx,sbX+sbW/2-44,sbY+sbH-44,88,28,14); ctx.fill();
  ctx.strokeStyle=theme.accentColor; ctx.lineWidth=1; roundRect(ctx,sbX+sbW/2-44,sbY+sbH-44,88,28,14); ctx.stroke();
  ctx.font="700 14px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor;
  ctx.fillText("✦ DAYS ✦",sbX+sbW/2,sbY+sbH-24); ctx.textAlign="left";

  // ── 6. LEFT STATS PANEL — stacked vertically ──────────────────────────────
  const spX=36, spY=160, spW=220;
  const statsData=[
    {e:"⚡",v:grassScore>=1000?(grassScore/1000).toFixed(1)+"K":String(grassScore),l:"GRASS SCORE"},
    {e:"🔥",v:`${best}d`,l:"BEST STREAK"},
    {e:"🛡",v:String(shields),l:"SHIELDS EARNED",hide:shields===0},
    {e:"👑",v:rank?`#${rank}`:"—",l:"GLOBAL RANK"},
  ].filter(s=>!s.hide);

  const spH=statsData.length*90+20;
  frostPanel(spX,spY,spW,spH,12);

  statsData.forEach((s,i)=>{
    const sy=spY+18+i*90;
    if(i>0){ctx.strokeStyle=theme.borderColor;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(spX+16,sy-4);ctx.lineTo(spX+spW-16,sy-4);ctx.stroke();}
    ctx.font="26px sans-serif"; ctx.fillStyle="#f0efea"; ctx.textAlign="left";
    ctx.fillText(s.e,spX+16,sy+26);
    ctx.font=`700 ${s.v.length>4?32:40}px Georgia,serif`;
    ctx.fillStyle=s.l==="GLOBAL RANK"?theme.accentColor:"#f5f4ef";
    ctx.fillText(s.v,spX+56,sy+30);
    ctx.font="600 12px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.5)";
    ctx.fillText(s.l,spX+16,sy+54);
  });

  // ── 7. BOTTOM — Badges + Pack callout ────────────────────────────────────
  const earnedBadges=badges.slice(0,6);
  const hasBadges=earnedBadges.length>0;
  const hasPackInfo=theme.name;

  // Badge panel — bottom left
  const bpY=H-240, bpX=36, bpW=hasBadges?(hasPackInfo?580:W-72):0;
  if(hasBadges) {
    frostPanel(bpX,bpY,bpW,200,12);
    // Header
    ctx.font="700 14px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor; ctx.textAlign="left";
    ctx.fillText(">> BADGES EARNED <<",bpX+bpW/2,bpY+24);
    // Badges
    const bSz=70, bGap=(bpW-32-bSz*6)/5;
    earnedBadges.forEach((badge,i)=>{
      const bx=bpX+16+i*(bSz+bGap)+bSz/2, by=bpY+110;
      ctx.save(); ctx.translate(bx,by); hexPath(ctx,bSz/2);
      ctx.fillStyle="rgba(6,8,6,0.85)"; ctx.fill();
      ctx.strokeStyle=theme.badgeStroke; ctx.lineWidth=2; ctx.stroke(); ctx.restore();
      ctx.font="28px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#f0efea";
      ctx.fillText(badge.emoji,bx,by+10);
      ctx.font="700 11px 'DM Sans',sans-serif"; ctx.fillStyle="#f0efea";
      ctx.fillText(badge.name.length>9?badge.name.slice(0,8)+"…":badge.name,bx,by+bSz/2-2);
    });
    // Center header text
    ctx.textAlign="center"; ctx.font="700 15px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor;
    ctx.fillText(">> BADGES EARNED <<",bpX+bpW/2,bpY+26); ctx.textAlign="left";
  }

  // Pack callout — bottom right
  if(hasPackInfo) {
    const ppW=hasBadges?W-36-bpX-bpW-16:W-72;
    const ppX=hasBadges?bpX+bpW+16:36;
    frostPanel(ppX,bpY,ppW,200,12);

    // Pack icon — use first char of cover name as emoji placeholder
    const packEmoji = theme.name.includes("Beach")?"🏖":theme.name.includes("Mountain")?"⛰":theme.name.includes("Sunflower")?"🌻":theme.name.includes("Waterfall")?"💧":theme.name.includes("Night")?"🌙":theme.name.includes("Golden")?"🌅":theme.name.includes("Forest")?"🌲":theme.name.includes("Summit")?"🏔":theme.name.includes("Sky")?"✨":theme.name.includes("Temple")?"🌞":theme.name.includes("Garden")?"🌸":theme.name.includes("Celestial")?"💫":"🎨";
    ctx.font="48px sans-serif"; ctx.textAlign="center";
    ctx.fillText(packEmoji,ppX+ppW/2,bpY+74);

    // Pack name — if marketplace show pack name, else show "STREAK COVER"
    if(theme.marketplaceOnly) {
      ctx.font="700 13px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor;
      ctx.fillText("RETRO VIBES PACK",ppX+ppW/2,bpY+110);
    } else {
      ctx.font="700 12px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor;
      ctx.fillText("STREAK COVER",ppX+ppW/2,bpY+110);
    }
    ctx.font="600 16px 'DM Sans',sans-serif"; ctx.fillStyle="#f5f4ef";
    ctx.fillText(theme.name.toUpperCase(),ppX+ppW/2,bpY+138);

    // Star badge for marketplace
    if(theme.marketplaceOnly) {
      ctx.font="600 11px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor;
      ctx.fillText("★ MARKETPLACE EXCLUSIVE ★",ppX+ppW/2,bpY+162);
    } else {
      ctx.font="600 11px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.45)";
      ctx.fillText(`UNLOCKED AT DAY ${theme.unlockDay||"?"}`,ppX+ppW/2,bpY+162);
    }
    ctx.textAlign="left";
  }

  // ── 8. FOOTER ─────────────────────────────────────────────────────────────
  const fY=H-30;
  // Left
  ctx.font="600 13px 'DM Sans',sans-serif"; ctx.fillStyle="#9945ff";
  ctx.textAlign="left"; ctx.fillText("BUILT ON ◎ SOLANA",36,fY);
  ctx.fillStyle=theme.accentColor; ctx.fillText("  ·  PROOF OF GRASS",36+ctx.measureText("BUILT ON ◎ SOLANA").width,fY);
  // Center — Touch Grass logo + wordmark
  try{const logo=await loadImage("/touchgrass-transparent.png");ctx.globalAlpha=0.85;ctx.drawImage(logo,W/2-60,fY-30,34,34);ctx.globalAlpha=1;}catch(e){}
  ctx.font="700 18px Georgia,serif"; ctx.fillStyle="#f5f4ef"; ctx.textAlign="center";
  ctx.fillText("TOUCH GRASS",W/2+4,fY-8);
  ctx.font="500 11px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor+"99";
  ctx.fillText("PROOF OF GRASS",W/2,fY+8);
  // Right
  ctx.font="500 13px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.45)";
  ctx.textAlign="right"; ctx.fillText("proofofgrass.app",W-36,fY);
  // Solana globe icon
  ctx.fillText("🌐",W-36-ctx.measureText("proofofgrass.app").width-20,fY);
  ctx.textAlign="left";

  try { return canvas.toDataURL("image/png"); }
  catch(e) { throw new Error("canvas_tainted: "+e.message); }
}) {
  // theme object drives ALL visual decisions — layout is fixed
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ── 1. BASE ───────────────────────────────────────────────────────────────
  ctx.fillStyle = "#060807";
  ctx.fillRect(0, 0, W, H);

  // ── 2. COVER / THEME BACKGROUND ───────────────────────────────────────────
  let hasCover = false;
  if (theme.imageUrl && theme.imageUrl !== "PASTE_URL_HERE") {
    try {
      const coverImg = await loadImage(theme.imageUrl);
      const ir = coverImg.width / coverImg.height, cr = W / H;
      let dw, dh, dx, dy;
      if (ir > cr) { dh=H; dw=H*ir; dx=(W-dw)/2; dy=0; }
      else { dw=W; dh=W/ir; dx=0; dy=(H-dh)/2; }
      ctx.drawImage(coverImg, dx, dy, dw, dh);
      hasCover = true;
      // Directional scrim — heavy top/bottom, clear centre
      const st = ctx.createLinearGradient(0,0,0,H*0.52);
      st.addColorStop(0, theme.scrimTop); st.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=st; ctx.fillRect(0,0,W,H*0.52);
      const sb = ctx.createLinearGradient(0,H*0.48,0,H);
      sb.addColorStop(0,"rgba(0,0,0,0)"); sb.addColorStop(1,theme.scrimBot);
      ctx.fillStyle=sb; ctx.fillRect(0,H*0.48,W,H*0.52);
    } catch(e) {
      console.warn("[flex] cover load failed:", e?.message);
      ctx.fillStyle=theme.fallback; ctx.fillRect(0,0,W,H);
    }
  } else {
    ctx.fillStyle=theme.fallback; ctx.fillRect(0,0,W,H);
  }

  // ── 3. OUTER BORDER ───────────────────────────────────────────────────────
  ctx.strokeStyle=theme.borderColor; ctx.lineWidth=3;
  roundRect(ctx,28,28,W-56,H-56,22); ctx.stroke();

  // Corner accent marks
  const cm=28,cl=40;
  [[cm,cm],[W-cm,cm],[cm,H-cm],[W-cm,H-cm]].forEach(([cx,cy])=>{
    ctx.strokeStyle=theme.accentColor; ctx.lineWidth=2;
    const dx=cx===cm?1:-1, dy=cy===cm?1:-1;
    ctx.beginPath(); ctx.moveTo(cx,cy+dy*cl); ctx.lineTo(cx,cy); ctx.lineTo(cx+dx*cl,cy); ctx.stroke();
  });

  // ── 4. TOP PANEL — frosted glass ──────────────────────────────────────────
  const topH=210;
  ctx.fillStyle=theme.panelTint;
  roundRect(ctx,28,28,W-56,topH,22); ctx.fill();
  // Bottom edge of top panel
  ctx.strokeStyle=theme.borderColor; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(28,28+topH); ctx.lineTo(W-28,28+topH); ctx.stroke();

  // Avatar
  const aSize=110, aX=56, aY=54;
  try {
    if(avatarUrl) {
      const ai=await loadImage(avatarUrl);
      ctx.save(); ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2,0,Math.PI*2); ctx.clip();
      ctx.drawImage(ai,aX,aY,aSize,aSize); ctx.restore();
    } else throw new Error("no avatar");
  } catch(e) {
    ctx.fillStyle=theme.accentColor+"30";
    ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2,0,Math.PI*2); ctx.fill();
    ctx.font="700 42px Georgia,serif"; ctx.fillStyle=theme.accentColor;
    ctx.textAlign="center"; ctx.fillText((username[0]||"?").toUpperCase(),aX+aSize/2,aY+aSize/2+14); ctx.textAlign="left";
  }
  // Avatar ring
  ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2+3,0,Math.PI*2);
  ctx.strokeStyle = avatarFrame==="crown"?"#c8a84b":avatarFrame==="glow"?theme.accentColor:theme.borderColor;
  ctx.lineWidth = avatarFrame==="crown"?4:2.5; ctx.stroke();

  // Username + tier
  const nX=aX+aSize+18;
  const uSize=username.length>14?42:username.length>11?50:username.length>8?58:66;
  ctx.font=`700 ${uSize}px Georgia,serif`; ctx.fillStyle="#f5f4ef";
  ctx.shadowColor="rgba(0,0,0,0.9)"; ctx.shadowBlur=12;
  ctx.fillText(`@${username}`,nX,118); ctx.shadowBlur=0;

  const pillTxt=`✦ ${tierTitle}`;
  ctx.font="700 14px 'DM Sans',sans-serif";
  const pW=ctx.measureText(pillTxt).width+26;
  ctx.fillStyle=theme.accentColor+"22"; roundRect(ctx,nX,130,pW,26,13); ctx.fill();
  ctx.strokeStyle=theme.accentColor+"70"; ctx.lineWidth=1; roundRect(ctx,nX,130,pW,26,13); ctx.stroke();
  ctx.fillStyle=theme.accentColor; ctx.textAlign="center"; ctx.fillText(pillTxt,nX+pW/2,148); ctx.textAlign="left";

  // Marketplace badge — if cover is a paid cosmetic, make it pop
  if(theme.marketplaceOnly && theme.name) {
    const mTxt=`★ ${theme.name}`;
    ctx.font="700 13px 'DM Sans',sans-serif";
    const mW=ctx.measureText(mTxt).width+24;
    ctx.fillStyle=theme.accentColor+"28"; roundRect(ctx,nX,164,mW,24,12); ctx.fill();
    ctx.strokeStyle=theme.accentColor; ctx.lineWidth=1.5; roundRect(ctx,nX,164,mW,24,12); ctx.stroke();
    ctx.fillStyle=theme.accentColor; ctx.textAlign="center";
    ctx.font="700 12px 'DM Sans',sans-serif";
    ctx.fillText(mTxt,nX+mW/2,180); ctx.textAlign="left";
  }

  // Streak — top right
  ctx.textAlign="right";
  ctx.font="600 13px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.5)";
  ctx.fillText("CURRENT STREAK",W-50,80);
  const nSz=streak>=100?128:streak>=10?148:166;
  ctx.font=`700 ${nSz}px Georgia,serif`;
  ctx.fillStyle="#f5f4ef";
  ctx.shadowColor=theme.glowColor; ctx.shadowBlur=50;
  ctx.fillText(`${streak}`,W-50,200); ctx.shadowBlur=0;
  const nW=ctx.measureText(`${streak}`).width;
  ctx.font="600 24px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.45)";
  ctx.fillText("DAYS",W-50-nW-8,200);
  ctx.textAlign="left";

  // ── 5. STATS STRIP ────────────────────────────────────────────────────────
  const stY=28+topH, stH=96;
  ctx.fillStyle=theme.panelTint; ctx.fillRect(28,stY,W-56,stH);
  ctx.strokeStyle=theme.borderColor; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(28,stY+stH); ctx.lineTo(W-28,stY+stH); ctx.stroke();

  const stats=[
    {e:"⚡",v:grassScore>=1000?(grassScore/1000).toFixed(1)+"K":String(grassScore),l:"GRASS SCORE"},
    {e:"🔥",v:`${best}d`,l:"BEST STREAK"},
    {e:"🛡",v:String(shields),l:"SHIELDS"},
    {e:"👑",v:rank?`#${rank}`:"—",l:"RANK",gold:true},
  ];
  const sW=(W-56)/4;
  stats.forEach((s,i)=>{
    const cx=28+i*sW+sW/2;
    if(i>0){ctx.strokeStyle="rgba(255,255,255,0.07)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(28+i*sW,stY+10);ctx.lineTo(28+i*sW,stY+stH-10);ctx.stroke();}
    ctx.font="20px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#f0efea"; ctx.fillText(s.e,cx,stY+26);
    ctx.font=`700 ${s.v.length>4?26:32}px Georgia,serif`;
    ctx.fillStyle=s.gold?theme.accentColor:"#f5f4ef"; ctx.fillText(s.v,cx,stY+62);
    ctx.font="600 11px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.45)"; ctx.fillText(s.l,cx,stY+82);
  });
  ctx.textAlign="left";

  // ── 6. BADGES ROW ─────────────────────────────────────────────────────────
  const bY=stY+stH, bH=138;
  ctx.fillStyle=theme.panelTint; ctx.fillRect(28,bY,W-56,bH);
  ctx.strokeStyle=theme.borderColor; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(28,bY+bH); ctx.lineTo(W-28,bY+bH); ctx.stroke();

  const earnedTop=badges.slice(0,7);
  const bSz=50, bGap=(W-56-bSz*7)/8;
  earnedTop.forEach((badge,i)=>{
    const bx=28+bGap+i*(bSz+bGap)+bSz/2, by=bY+bH/2;
    ctx.save(); ctx.translate(bx,by); hexPath(ctx,bSz/2);
    ctx.fillStyle="rgba(8,10,6,0.85)"; ctx.fill();
    ctx.strokeStyle=theme.badgeStroke; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore();
    ctx.font="20px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#f0efea"; ctx.fillText(badge.emoji,bx,by+7);
    ctx.font="600 9px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.65)";
    ctx.fillText(badge.name.length>9?badge.name.slice(0,8)+"…":badge.name,bx,by+bSz/2-3);
  });
  if(earnedTop.length===0){
    ctx.font="500 15px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.2)"; ctx.textAlign="center";
    ctx.fillText("No badges yet — keep going",W/2,bY+bH/2+6); ctx.textAlign="left";
  }

  // ── 7. PROGRESS BAR ───────────────────────────────────────────────────────
  const prY=bY+bH, prH=48;
  ctx.fillStyle=theme.panelTint; ctx.fillRect(28,prY,W-56,prH);
  ctx.strokeStyle=theme.borderColor; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(28,prY+prH); ctx.lineTo(W-28,prY+prH); ctx.stroke();

  const thresholds=[7,14,30,50,100,180,365,500,1000];
  const nextT=thresholds.find(t=>t>streak)||1000;
  const prevT=[...[0,...thresholds]].reverse().find(t=>streak>=t)||0;
  const fillPct=Math.min(1,(streak-prevT)/Math.max(1,nextT-prevT));
  const nextLabel=nextT>=1000?"TRANSCENDENT":nextT>=500?"ASCENDED":nextT>=365?"ETERNAL":nextT>=180?"MYTHIC":nextT>=100?"IMMORTAL":nextT>=50?"LEGENDARY":nextT>=30?"ELITE":nextT>=14?"LOCKED IN":"ROOTED";

  const barX=56,barW=W-112,barH=8,barY=prY+20;
  ctx.fillStyle="rgba(255,255,255,0.07)"; roundRect(ctx,barX,barY,barW,barH,4); ctx.fill();
  const grad=ctx.createLinearGradient(barX,0,barX+barW*fillPct,0);
  grad.addColorStop(0,theme.progressFrom); grad.addColorStop(1,theme.progressTo);
  ctx.fillStyle=grad; roundRect(ctx,barX,barY,barW*fillPct,barH,4); ctx.fill();
  ctx.shadowColor=theme.glowColor; ctx.shadowBlur=8;
  ctx.fillStyle=theme.progressTo; roundRect(ctx,barX,barY,barW*fillPct,barH,4); ctx.fill();
  ctx.shadowBlur=0;

  ctx.font="600 11px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.4)";
  ctx.fillText(`NEXT: ${nextLabel} · DAY ${nextT}`,barX,prY+44);
  ctx.textAlign="right"; ctx.fillStyle=theme.accentColor; ctx.fillText(`${streak}/${nextT}`,W-56,prY+44); ctx.textAlign="left";

  // ── 8. BOTTOM PANEL ───────────────────────────────────────────────────────
  const botY=prY+prH;
  ctx.fillStyle=theme.panelTint;
  roundRect(ctx,28,botY,W-56,H-botY-28,22); ctx.fill();
  ctx.strokeStyle=theme.borderColor; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(28,botY); ctx.lineTo(W-28,botY); ctx.stroke();

  // Cover name badge — milestone covers show name, marketplace covers get premium treatment
  if(theme.name) {
    const prefix=theme.marketplaceOnly?"★ ":"";
    const cnTxt=`${prefix}${theme.name}`;
    ctx.font=`${theme.marketplaceOnly?"700":"600"} 13px 'DM Sans',sans-serif`;
    const cnW=ctx.measureText(cnTxt).width+24;
    ctx.fillStyle=theme.accentColor+(theme.marketplaceOnly?"30":"18");
    roundRect(ctx,56,botY+14,cnW,24,12); ctx.fill();
    ctx.strokeStyle=theme.accentColor+(theme.marketplaceOnly?"cc":"60");
    ctx.lineWidth=theme.marketplaceOnly?1.5:1;
    roundRect(ctx,56,botY+14,cnW,24,12); ctx.stroke();
    ctx.fillStyle=theme.accentColor; ctx.textAlign="center";
    ctx.fillText(cnTxt,56+cnW/2,botY+30); ctx.textAlign="left";
  }

  // Quote
  const quote=getQuote(streak,bio??"");
  const qSz=quote.length>55?20:quote.length>40?24:28;
  ctx.font=`italic ${qSz}px Georgia,serif`; ctx.fillStyle="rgba(240,239,234,0.72)"; ctx.textAlign="center";
  const maxW=W-120, qWords=quote.split(" ");
  let line="", qLines=[];
  for(const w of qWords){const t=line+w+" ";if(ctx.measureText(t).width>maxW&&line){qLines.push(line.trim());line=w+" ";}else line=t;}
  if(line)qLines.push(line.trim());
  const qStartY=botY+(theme.name?58:36);
  qLines.forEach((l,i)=>ctx.fillText(l,W/2,qStartY+i*(qSz+8)));
  ctx.textAlign="left";

  // Branding footer
  const fY=H-62;
  try{const logo=await loadImage("/touchgrass-transparent.png");ctx.globalAlpha=0.65;ctx.drawImage(logo,56,fY-14,32,32);ctx.globalAlpha=1;}catch(e){}
  ctx.font="700 16px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor+"88";
  ctx.fillText("PROOF OF GRASS",96,fY+6);
  ctx.font="600 13px 'DM Sans',sans-serif"; ctx.fillStyle=theme.accentColor+"aa"; ctx.textAlign="center";
  ctx.fillText("$TOUCHGRASS  ·  #TouchGrass  ·  #ProofOfGrass",W/2,fY+6);
  ctx.font="500 13px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.35)"; ctx.textAlign="right";
  ctx.fillText("proofofgrass.app",W-56,fY+6); ctx.textAlign="left";

  try { return canvas.toDataURL("image/png"); }
  catch(e) { throw new Error("canvas_tainted: "+e.message); }
}) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#080a06"); bg.addColorStop(0.5, "#0e110a"); bg.addColorStop(1, "#080a06");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (coverUrl && coverUrl !== "PASTE_URL_HERE") {
    try {
      const coverImg = await loadImage(coverUrl);
      const imgRatio = coverImg.width / coverImg.height;
      const canvasRatio = W / H;
      let drawW, drawH, drawX, drawY;
      if (imgRatio > canvasRatio) { drawH = H; drawW = H * imgRatio; drawX = (W - drawW) / 2; drawY = 0; }
      else { drawW = W; drawH = W / imgRatio; drawX = 0; drawY = (H - drawH) / 2; }
      ctx.drawImage(coverImg, drawX, drawY, drawW, drawH);
      const scrim = ctx.createLinearGradient(0, 0, W, H);
      scrim.addColorStop(0, "rgba(8,10,6,0.55)"); scrim.addColorStop(0.5, "rgba(14,17,10,0.65)"); scrim.addColorStop(1, "rgba(8,10,6,0.8)");
      ctx.fillStyle = scrim; ctx.fillRect(0, 0, W, H);
    } catch(e) { console.warn("[flex] cover image failed, skipping:", e?.message); }
  }
  const glow = ctx.createRadialGradient(W*0.75, H*0.2, 0, W*0.75, H*0.2, 480);
  glow.addColorStop(0, tier.glow + "30"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(147,168,90,0.04)"; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.strokeStyle = "rgba(147,168,90,0.25)"; ctx.lineWidth = 1.5;
  roundRect(ctx, 40, 40, W-80, H-80, 24); ctx.stroke();
  ctx.fillStyle = "rgba(14,17,10,0.85)"; roundRect(ctx, 40, 40, W-80, H-80, 24); ctx.fill();
  ctx.fillStyle = "rgba(147,168,90,0.08)"; ctx.fillRect(40, 40, W-80, 320);
  try { const logo = await loadImage("/touchgrass-transparent.png"); ctx.globalAlpha=0.6; ctx.drawImage(logo,72,72,44,44); ctx.globalAlpha=1; } catch(e) {}
  ctx.font="600 30px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.4)"; ctx.fillText("Touch Grass",126,101);
  if (avatarUrl) {
    try {
      // Some avatar URLs (Twitter CDN, etc.) block cross-origin canvas reads.
      // If it fails for any reason, skip the avatar — don't crash the card.
      const avatarImg = await loadImage(avatarUrl);
      const aSize=80,aX=72,aY=174;
      ctx.save(); ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2,0,Math.PI*2); ctx.clip();
      ctx.drawImage(avatarImg,aX,aY,aSize,aSize); ctx.restore();
      ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2+2,0,Math.PI*2);
      ctx.strokeStyle=avatarFrame==="crown"?"#c8a84b":avatarFrame==="glow"?"#93a85a":"rgba(147,168,90,0.5)";
      ctx.lineWidth=avatarFrame==="crown"?3:2; ctx.stroke();
    } catch(e) {
      console.warn("[flex] avatar image failed, skipping:", e?.message);
      // Draw initials fallback
      const aSize=80,aX=72,aY=174;
      ctx.save();
      ctx.fillStyle="rgba(147,168,90,0.15)"; ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(147,168,90,0.4)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(aX+aSize/2,aY+aSize/2,aSize/2,0,Math.PI*2); ctx.stroke();
      ctx.font="700 32px 'Georgia',serif"; ctx.fillStyle="#93a85a"; ctx.textAlign="center";
      ctx.fillText((username[0]||"?").toUpperCase(), aX+aSize/2, aY+aSize/2+11);
      ctx.textAlign="left"; ctx.restore();
    }
  }
  const vbadgeW=210,vbadgeH=30,vbadgeX=72,vbadgeY=132;
  ctx.strokeStyle="rgba(147,168,90,0.45)"; ctx.lineWidth=1; roundRect(ctx,vbadgeX,vbadgeY,vbadgeW,vbadgeH,15); ctx.stroke();
  ctx.fillStyle="rgba(147,168,90,0.12)"; roundRect(ctx,vbadgeX,vbadgeY,vbadgeW,vbadgeH,15); ctx.fill();
  ctx.fillStyle="#93a85a"; ctx.textAlign="center"; ctx.font="700 13px 'DM Sans',sans-serif";
  ctx.fillText("◎  VERIFIED OUTDOORS",vbadgeX+vbadgeW/2,vbadgeY+20); ctx.textAlign="left";
  const uFontSize=username.length>14?56:username.length>11?64:username.length>8?72:82;
  ctx.font=`700 ${uFontSize}px 'Georgia',serif`; ctx.fillStyle="#f5f4ef";
  ctx.shadowColor="rgba(147,168,90,0.3)"; ctx.shadowBlur=14;
  ctx.fillText(`@${username}`,168,240); ctx.shadowBlur=0;
  const pillW=320,pillH=40,pillX=72,pillY=290;
  ctx.strokeStyle=tier.color+"55"; ctx.lineWidth=1; roundRect(ctx,pillX,pillY,pillW,pillH,20); ctx.stroke();
  ctx.fillStyle=tier.color+"15"; roundRect(ctx,pillX,pillY,pillW,pillH,20); ctx.fill();
  ctx.font="700 16px 'DM Sans',sans-serif"; ctx.fillStyle=tier.color; ctx.textAlign="center";
  ctx.fillText(`✦  ${tierTitle}`,pillX+pillW/2,pillY+26); ctx.textAlign="left";
  ctx.textAlign="right";
  ctx.font="600 16px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.45)"; ctx.fillText("CURRENT STREAK",W-80,88);
  const numSize=streak>=100?148:178;
  ctx.font=`700 ${numSize}px 'Georgia',serif`;
  const numW=ctx.measureText(`${streak}`).width;
  ctx.fillStyle="#f5f4ef"; ctx.shadowColor=tier.glow; ctx.shadowBlur=55;
  ctx.fillText(`${streak}`,W-80,288); ctx.shadowBlur=0;
  ctx.font="600 32px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.5)";
  ctx.fillText("DAY",W-80-numW-10,288); ctx.textAlign="left";
  ctx.strokeStyle="rgba(147,168,90,0.15)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(72,370); ctx.lineTo(W-72,370); ctx.stroke();
  const stats=[
    {icon:"⚡",value:grassScore>=1000?(grassScore/1000).toFixed(1)+"K":String(grassScore),label:"GRASS SCORE"},
    {icon:"🔥",value:`${best}d`,label:"BEST STREAK"},
    {icon:"🛡",value:String(shields),label:"SHIELDS"},
    {icon:"👑",value:rank?`#${rank}`:"—",label:"GLOBAL RANK"},
  ];
  const statW=(W-144)/4;
  stats.forEach((s,i)=>{
    const x=72+i*statW,cx=x+statW/2;
    if(i>0){ctx.strokeStyle="rgba(255,255,255,0.06)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,390);ctx.lineTo(x,510);ctx.stroke();}
    ctx.font="24px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#f0efea"; ctx.fillText(s.icon,cx,425);
    ctx.font=`700 ${s.value.length>4?32:40}px 'Georgia',serif`;
    ctx.fillStyle=i===3?"#c8a84b":"#f0efea"; ctx.fillText(s.value,cx,480);
    ctx.font="600 14px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.55)"; ctx.fillText(s.label,cx,510);
  });
  ctx.textAlign="left";
  ctx.strokeStyle="rgba(147,168,90,0.12)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(72,540); ctx.lineTo(W-72,540); ctx.stroke();
  ctx.font="700 18px 'DM Sans',sans-serif"; ctx.fillStyle="#93a85a"; ctx.fillText("✦  BADGES EARNED",72,585);
  ctx.font="600 18px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.55)"; ctx.textAlign="right";
  ctx.fillText(`${badges.length} / ${ALL_BADGES.length} collected`,W-72,585); ctx.textAlign="left";
  const earnedTop=badges.slice(0,6);
  const hexSize=90,hexGap=(W-144-hexSize*6)/5;
  earnedTop.forEach((badge,i)=>{
    const x=72+i*(hexSize+hexGap)+hexSize/2,y=640;
    ctx.save(); ctx.translate(x,y); hexPath(ctx,hexSize/2);
    const rarity=getRarityLabel(badge.rarity);
    ctx.fillStyle="rgba(20,23,16,0.9)"; ctx.fill();
    ctx.strokeStyle=rarity.color+"50"; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore();
    ctx.font="36px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#f0efea"; ctx.fillText(badge.emoji,x,y+12);
    ctx.font="700 13px 'DM Sans',sans-serif"; ctx.fillStyle="#f0efea";
    ctx.fillText(badge.name.length>10?badge.name.slice(0,9)+"…":badge.name,x,y+64);
  });
  ctx.textAlign="left";
  ctx.strokeStyle="rgba(147,168,90,0.12)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(72,730); ctx.lineTo(W-72,730); ctx.stroke();
  const thresholds=[7,14,30,50,100,180,365,500,1000];
  const nextT=thresholds.find(t=>t>streak)||365;
  const prevT=[...[0,...thresholds]].reverse().find(t=>streak>=t)||0;
  const fillPct=Math.min(1,(streak-prevT)/(nextT-prevT));
  const tierLabel2=nextT>=1000?"TRANSCENDENT":nextT>=500?"ASCENDED":nextT>=365?"ETERNAL":nextT>=180?"MYTHIC":nextT>=100?"IMMORTAL":nextT>=50?"LEGENDARY":nextT>=30?"ELITE":nextT>=14?"LOCKED IN":"ROOTED";
  ctx.font="600 16px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.45)";
  ctx.fillText(`NEXT MILESTONE — ${tierLabel2} (DAY ${nextT})`,72,762);
  ctx.fillStyle=tier.color; ctx.textAlign="right"; ctx.fillText(`${streak} / ${nextT}`,W-72,762); ctx.textAlign="left";
  ctx.fillStyle="rgba(255,255,255,0.07)"; roundRect(ctx,72,775,W-144,10,5); ctx.fill();
  const grad2=ctx.createLinearGradient(72,0,72+(W-144)*fillPct,0);
  grad2.addColorStop(0,"#93a85a"); grad2.addColorStop(1,"#c8a84b");
  ctx.fillStyle=grad2; roundRect(ctx,72,775,(W-144)*fillPct,10,5); ctx.fill();
  ctx.strokeStyle="rgba(147,168,90,0.10)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(72,808); ctx.lineTo(W-72,808); ctx.stroke();
  const quote=getQuote(streak,bio??"");
  const qSize=quote.length>50?30:quote.length>38?34:38;
  ctx.font=`italic ${qSize}px 'Georgia',serif`; ctx.fillStyle="rgba(240,239,234,0.82)";
  ctx.textAlign="center"; ctx.fillText(quote,W/2,845); ctx.textAlign="left";
  const ecoItems=[
    {label:"$TOUCHGRASS",verified:hasTG},
    {label:"GRASS TOUCHER",verified:hasGT},
    {label:"SCREEN TOUCHER",verified:hasST},
  ];
  const ecoCount=[hasTG,hasGT,hasST].filter(Boolean).length;
  const ecoY=H-200;
  if(ecoCount===3){
    ctx.fillStyle="rgba(200,168,75,0.12)"; roundRect(ctx,72,ecoY,W-144,40,8); ctx.fill();
    ctx.strokeStyle="rgba(200,168,75,0.4)"; ctx.lineWidth=1; roundRect(ctx,72,ecoY,W-144,40,8); ctx.stroke();
    ctx.font="700 16px 'DM Sans',sans-serif"; ctx.fillStyle="#c8a84b"; ctx.textAlign="center";
    ctx.fillText("👑  FULL ECOSYSTEM TOUCHER",W/2,ecoY+26); ctx.textAlign="left";
  } else {
    const itemW=(W-144-16)/3;
    ecoItems.forEach((item,i)=>{
      const ix=72+i*(itemW+8);
      ctx.fillStyle=item.verified?"rgba(147,168,90,0.1)":"rgba(255,255,255,0.03)";
      roundRect(ctx,ix,ecoY,itemW,36,7); ctx.fill();
      ctx.strokeStyle=item.verified?"rgba(147,168,90,0.4)":"rgba(255,255,255,0.08)";
      ctx.lineWidth=1; roundRect(ctx,ix,ecoY,itemW,36,7); ctx.stroke();
      ctx.font="600 13px 'DM Sans',sans-serif";
      ctx.fillStyle=item.verified?"#93a85a":"rgba(240,239,234,0.25)"; ctx.textAlign="center";
      ctx.fillText(`${item.verified?"✓":"✗"}  ${item.label}`,ix+itemW/2,ecoY+23); ctx.textAlign="left";
    });
  }
  ctx.strokeStyle="rgba(147,168,90,0.2)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(72,H-150); ctx.lineTo(W-72,H-150); ctx.stroke();
  ctx.font="700 22px 'DM Sans',sans-serif"; ctx.fillStyle="#93a85a";
  ctx.fillText("$TOUCHGRASS  #TouchGrass  #ProofOfGrass",72,H-110);
  ctx.textAlign="right"; ctx.font="500 20px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.5)";
  ctx.fillText("proofofgrass.app",W-72,H-110); ctx.textAlign="left";
  ctx.font="500 15px 'DM Sans',sans-serif"; ctx.fillStyle="rgba(240,239,234,0.28)";
  ctx.fillText("BUILT ON ◎ SOLANA  ·  PROOF OF GRASS",72,H-82);
  try {
    return canvas.toDataURL("image/png");
  } catch(e) {
    // Canvas tainted by cross-origin image (usually the cover)
    throw new Error("canvas_tainted: " + e.message);
  }
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

function hexPath(ctx,r){
  ctx.beginPath();
  for(let i=0;i<6;i++){const angle=(Math.PI/3)*i-Math.PI/6;const px=r*Math.cos(angle),py=r*Math.sin(angle);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}
  ctx.closePath();
}

function loadImage(src){
  return new Promise((res,rej)=>{
    // 8 second timeout — prevents hanging on slow/blocked resources
    const timer = setTimeout(() => rej(new Error("loadImage timeout: " + src)), 8000);
    const done = (val) => { clearTimeout(timer); res(val); };
    const fail = (err) => { clearTimeout(timer); rej(err); };
    const img=new Image(); img.crossOrigin="anonymous";
    img.onload=()=>done(img);
    img.onerror=()=>{
      // Try via fetch blob URL to bypass some CORS restrictions
      fetch(src,{mode:"cors"})
        .then(r=>r.blob())
        .then(blob=>{
          const url=URL.createObjectURL(blob);
          const img2=new Image();
          img2.onload=()=>{URL.revokeObjectURL(url);done(img2);};
          img2.onerror=()=>{URL.revokeObjectURL(url);fail(new Error("img load failed"));};
          img2.src=url;
        })
        .catch(fail);
    };
    img.src=src;
  });
}

export default function FlexCardPage() {
  const router = useRouter();
  const { username: slug } = router.query;
  const username = norm(slug ?? "");

  const [streakRow,    setStreakRow]    = useState(null);
  const [subCount,     setSubCount]    = useState(0);
  const [submissions,  setSubmissions] = useState([]);
  const [rank,         setRank]        = useState(null);
  const [totalUsers,   setTotalUsers]  = useState(1);
  const [chalDone,     setChalDone]    = useState(0);
  const [chalSent,     setChalSent]    = useState(0);
  const [profileRow,   setProfileRow]  = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [copied,       setCopied]      = useState(false);
  const [generatingImg,setGeneratingImg]=useState(false);
  const [downloaded,   setDownloaded]  = useState(false);
  const cardRef     = useRef(null);
  const flexFileRef  = useRef(null); // pre-built File — built ahead of tap
  const flexDataUrl  = useRef(null); // data URL for desktop fallback
  const [cardReady,  setCardReady]  = useState(false); // true when file is pre-built

  const [viewer, setViewer] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pog_username") ?? "";
      setViewer(norm(saved));
    }
  }, []);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const [{ data:sr }, { data:pr }, { count:subs }, { data:recentSubs }] = await Promise.all([
        supabase.from("Streaks").select("current_streak,best_streak,shield_count").eq("username",username).maybeSingle(),
        supabase.from("Profiles").select("bio,location,avatar_emoji,avatar_url,avatar_frame,joined_at,wallet_verified,has_touchgrass_holder,has_grass_toucher,has_screen_toucher,referral_count_successful,referral_badge,grass_score,active_cover_id,unlocked_covers").eq("username",username).maybeSingle(),
        supabase.from("Submissions").select("id",{count:"exact",head:true}).eq("username",username).in("status",["pending","approved"]),
        supabase.from("Submissions").select("created_at").eq("username",username).in("status",["pending","approved"]).order("created_at",{ascending:false}).limit(63),
      ]);
      const [{ data:allProfiles }, { data:chals }] = await Promise.all([
        supabase.from("Profiles").select("username,grass_score").order("grass_score",{ascending:false}),
        supabase.from("Challenges").select("id,status,challenger").or(`challenger.eq.${username},challenged.eq.${username}`),
      ]);
      setStreakRow(sr); setProfileRow(pr); setSubCount(subs??0); setSubmissions(recentSubs??[]);
      const allRows=allProfiles??[];
      const idx=allRows.findIndex(r=>norm(r.username)===username);
      setRank(idx>=0?idx+1:null); setTotalUsers(allRows.length||1);
      const chalList=chals??[];
      setChalDone(chalList.filter(c=>c.status==="completed").length);
      setChalSent(chalList.filter(c=>norm(c.challenger)===username).length);
      setLoading(false);
    })();
  }, [username]);

  const streak     = streakRow?.current_streak ?? 0;
  const best       = streakRow?.best_streak ?? 0;
  const shields    = streakRow?.shield_count ?? 0;
  const grassScore = profileRow?.grass_score != null
    ? profileRow.grass_score
    : Math.floor(streak*38+subCount*12+best*22);
  const activeCover = resolveActiveCover(profileRow);
  const tier        = getTier(streak);
  const tierTitle   = getTierTitle(streak);
  const pct         = totalUsers > 0 ? ((rank/totalUsers)*100).toFixed(1) : "—";
  const earnedBadges = ALL_BADGES.filter(b=>b.condition(streak,subCount,chalDone,chalSent,grassScore,shields));
  const topBadges    = earnedBadges.slice(0,6);
  const joinDate     = profileRow?.joined_at ? new Date(profileRow.joined_at).toLocaleDateString("en-US",{month:"long",year:"numeric"}) : null;

  const milestones = [
    {label:"7 Day Streak",   target:7,   icon:"🌱", done:streak>=7,   date:`${streak}/7`   },
    {label:"30 Day Streak",  target:30,  icon:"🌿", done:streak>=30,  date:`${streak}/30`  },
    {label:"50 Day Streak",  target:50,  icon:"🌳", done:streak>=50,  date:`${streak}/50`  },
    {label:"100 Day — Immortal",target:100,icon:"💯",done:streak>=100,date:`${streak}/100` },
    {label:"180 Day — Mythic",  target:180,icon:"⚡",done:streak>=180,date:`${streak}/180` },
    {label:"365 Day — Eternal", target:365,icon:"👑",done:streak>=365,date:`${streak}/365` },
    {label:"500 Day — Ascended",target:500,icon:"🌌",done:streak>=500,date:`${streak}/500` },
  ].filter((m,i)=>i<4||streak>=m.target-20||(i===4&&streak>=80));

  // Pre-build the share file as soon as card data is loaded
  // so the tap → navigator.share() call is fully synchronous
  useEffect(() => {
    if (loading || !username || streak === 0) return;
    let cancelled = false;
    setCardReady(false);
    flexFileRef.current  = null;
    flexDataUrl.current  = null;
    (async () => {
      try {
        let params = buildImageParams();
        let dataUrl;
        try {
          dataUrl = await generateShareImage(params);
        } catch(e) {
          // Canvas may be tainted by a cross-origin cover image — retry without cover
          console.warn("[flex] card gen failed, retrying without cover:", e?.message);
          dataUrl = await generateShareImage({ ...params, theme: { ...params.theme, imageUrl: null } });
        }
        if (cancelled) return;
        flexDataUrl.current = dataUrl;
        const res  = await fetch(dataUrl);
        const blob = await res.blob();
        if (cancelled) return;
        flexFileRef.current = new File(
          [blob],
          `proof-of-grass-${username}-day${streak}.png`,
          { type: "image/png" }
        );
        setCardReady(true);
      } catch(e) {
        console.warn("[flex] pre-build failed:", e?.message);
        setCardReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, username, streak, activeCover]);

  const isOwner = !!(viewer && viewer === username);
  const shareUrl = typeof window !== "undefined" ? window.location.href : `https://proofofgrass.app/u/${username}/flex`;
  const copyLink = () => { navigator.clipboard.writeText(shareUrl).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),1800); };

  const buildImageParams = useCallback(() => {
    // Build theme from active cover — drives all visual decisions in canvas
    const theme = activeCover ? {
      imageUrl:     activeCover.imageUrl     || null,
      fallback:     activeCover.fallback     || "linear-gradient(135deg,#0a0c08,#0a0c08)",
      accentColor:  activeCover.accentColor  || "#93a85a",
      borderColor:  activeCover.borderColor  || "rgba(147,168,90,0.35)",
      panelTint:    activeCover.panelTint    || "rgba(6,8,4,0.72)",
      scrimTop:     activeCover.scrimTop     || "rgba(4,6,4,0.82)",
      scrimBot:     activeCover.scrimBot     || "rgba(4,6,4,0.94)",
      glowColor:    activeCover.glowColor    || "#93a85a",
      badgeStroke:  activeCover.badgeStroke  || "rgba(147,168,90,0.45)",
      progressFrom: activeCover.progressFrom || "#5a8a30",
      progressTo:   activeCover.progressTo   || "#93a85a",
      name:         activeCover.name         || null,
      marketplaceOnly: activeCover.marketplaceOnly || false,
      unlockDay:    activeCover.unlockDay    || null,
    } : {
      imageUrl: null, fallback:"linear-gradient(135deg,#0a0c08,#141a10,#0a0c08)",
      accentColor:"#93a85a", borderColor:"rgba(147,168,90,0.35)",
      panelTint:"rgba(6,8,4,0.72)", scrimTop:"rgba(4,6,4,0.82)", scrimBot:"rgba(4,6,4,0.94)",
      glowColor:"#93a85a", badgeStroke:"rgba(147,168,90,0.45)",
      progressFrom:"#5a8a30", progressTo:"#93a85a",
      name:null, marketplaceOnly:false, unlockDay:null,
    };
    return {
      username, streak, tier, tierTitle, grassScore,
      rank, subCount, badges:earnedBadges, best, shields,
      bio: profileRow?.bio ?? "",
      hasTG: profileRow?.has_touchgrass_holder ?? false,
      hasGT: profileRow?.has_grass_toucher     ?? false,
      hasST: profileRow?.has_screen_toucher    ?? false,
      avatarUrl:   profileRow?.avatar_url   || null,
      avatarFrame: profileRow?.avatar_frame || null,
      theme,
    };
  }, [username, streak, tier, tierTitle, grassScore, rank, subCount, earnedBadges, best, shields, profileRow, activeCover]);

  const downloadCard = useCallback(async () => {
    setGeneratingImg(true);
    try {
      const dataUrl = await generateShareImage(buildImageParams());
      const link = document.createElement("a");
      link.download = `proof-of-grass-${username}-day${streak}.png`;
      link.href = dataUrl; link.click();
      setDownloaded(true); setTimeout(()=>setDownloaded(false),4000);
      try { localStorage.setItem("pog_flexed_week",new Date().toISOString()); } catch(e) {}
    } catch(e) { console.error("download error",e); }
    setGeneratingImg(false);
  }, [buildImageParams, username, streak]);

  // flexToX — fully synchronous tap handler.
  // Image is pre-built in useEffect above so there is ZERO async work
  // between the button tap and navigator.share() — iOS requires this.
  const flexToX = useCallback(() => {
    const text = `Day ${streak} — ${tier.label} 🌿\n\nBuilding my outdoor legacy daily on @XTouchGrass\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nproofofgrass.app/flex/${username}`;
    const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? "");
    const canNativeShare = isMob
      && typeof navigator.share === "function"
      && typeof navigator.canShare === "function";

    const file    = flexFileRef.current;
    const dataUrl = flexDataUrl.current;

    if (canNativeShare && file && navigator.canShare({ files:[file] })) {
      // iOS / Android — synchronous call, no awaits before this
      navigator.share({ files:[file], title:`Day ${streak} — ${tier.label} 🌿`, text })
        .then(() => {
          try { localStorage.setItem("pog_flexed_week", new Date().toISOString()); } catch(e) {}
        })
        .catch(e => {
          if (e?.name === "AbortError") return;
          // Share failed — download as fallback
          if (dataUrl) { const a=document.createElement("a"); a.href=dataUrl; a.download=file.name; a.click(); }
        });
      return;
    }

    // Desktop or no share API — open X compose + download image
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    if (dataUrl) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `proof-of-grass-${username}-day${streak}.png`;
      a.click();
    }
  }, [username, streak, tier]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${T.bg};}::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
    @keyframes shimmer{0%,100%{opacity:0.4;}50%{opacity:0.8;}}
    .fade{animation:fadeUp 0.7s ease both;}.fade2{animation:fadeUp 0.7s 0.1s ease both;}.fade3{animation:fadeUp 0.7s 0.2s ease both;}
    .skel{background:${T.bg3};border-radius:6px;animation:shimmer 1.8s ease-in-out infinite;}
    .panel{background:${T.bg2};border:1px solid ${T.border};border-radius:16px;padding:22px;}
    .ct{font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${T.oliveDim};margin-bottom:16px;display:flex;align-items:center;gap:7px;}
    .ct::before{content:"✦";color:${T.olive};font-size:8px;}
    .btn-share{display:inline-flex;align-items:center;gap:7px;background:${T.white};color:${T.bg};border:none;border-radius:9px;padding:11px 22px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:0.04em;}
    .btn-share:hover{background:#e8e7e2;transform:translateY(-1px);}
    .btn-ghost{display:inline-flex;align-items:center;gap:7px;background:transparent;border:1px solid ${T.border};border-radius:9px;padding:11px 22px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:${T.white};cursor:pointer;transition:all 0.2s;}
    .btn-ghost:hover{border-color:${T.olive};color:${T.olive};}
    .nav-lk{color:${T.dim};font-size:13px;font-weight:500;text-decoration:none;transition:color 0.2s;}
    .nav-lk:hover{color:${T.white};}
    @media(max-width:640px){
      .stats-grid{grid-template-columns:repeat(2,1fr)!important;}
      .bottom-row{grid-template-columns:1fr!important;}
      .badge-row{grid-template-columns:repeat(3,1fr)!important;}
      .nav-links{display:none!important;}
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:200, display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"0 clamp(14px,4vw,48px)", height:56, gap:12,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:26, height:26, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, fontWeight:700, color:T.white }}>Touch Grass</span>
          </Link>
          <div className="nav-links" style={{ display:"flex", gap:24 }}>
            <Link href="/" className="nav-lk">Dashboard</Link>
            <Link href="/leaderboard" className="nav-lk">Leaderboard</Link>
            <Link href={`/u/${username}`} className="nav-lk">Profile</Link>
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <button onClick={flexToX} disabled={!cardReady} className="btn-share"
              style={{ fontSize:11, padding:"7px 14px", opacity:!cardReady?0.5:1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              {!cardReady ? "…" : "Flex to X"}
            </button>
          </div>
        </nav>

        <div style={{ maxWidth:720, margin:"0 auto", padding:"32px clamp(14px,4vw,32px) 60px" }}>

          {/* FLEX CARD */}
          <div ref={cardRef} style={{
            background:`linear-gradient(160deg,${T.bg2} 0%,${T.bg3} 50%,${T.bg2} 100%)`,
            border:`1px solid ${T.borderG}`, borderRadius:20, overflow:"hidden",
            boxShadow:`0 0 60px ${tier.glow}20, 0 32px 80px rgba(0,0,0,0.6)`, position:"relative",
          }}>
            <div style={{ position:"absolute", top:-80, right:-80, width:320, height:320,
              borderRadius:"50%", background:`${tier.glow}`, opacity:0.06,
              filter:"blur(80px)", pointerEvents:"none" }} />

            {/* HERO */}
            <div className="fade" style={{ padding:"28px 28px 22px",
              background: activeCover && isCoverUrlReady(activeCover.imageUrl)
                ? `linear-gradient(135deg,rgba(20,21,16,0.55),rgba(20,21,16,0.85)), url(${activeCover.imageUrl})`
                : activeCover?.fallback ? activeCover.fallback
                : `linear-gradient(135deg,${T.bg3},${T.bg2})`,
              backgroundSize:"cover", backgroundPosition:"center",
              borderBottom:`1px solid ${T.border}`, position:"relative",
              display:"flex", alignItems:"flex-start", justifyContent:"space-between",
              gap:16, flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:16, alignItems:"flex-start", minWidth:0 }}>
                <div style={{ width:72, height:72, borderRadius:"50%", flexShrink:0,
                  background:`linear-gradient(135deg,${T.bg4},${T.olive}22)`,
                  overflow:"hidden",
                  boxShadow: profileRow?.avatar_frame==="crown"
                    ? `0 0 0 3px ${T.gold}, 0 0 20px ${T.gold}60`
                    : profileRow?.avatar_frame==="glow"
                      ? `0 0 0 2px ${T.olive}, 0 0 16px ${T.olive}50`
                      : `0 0 24px ${tier.glow}40`,
                  border: profileRow?.avatar_frame==="crown" ? `2px solid ${T.gold}`
                    : profileRow?.avatar_frame==="glow" ? `2px solid ${T.olive}`
                    : `2px solid ${tier.color}`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:28,
                  fontFamily:"'Cormorant Garamond',Georgia,serif", fontWeight:700, color:T.white }}>
                  {profileRow?.avatar_url
                    ? <img src={profileRow.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : (profileRow?.avatar_emoji || username[0]?.toUpperCase() || "🌿")}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:5,
                    fontSize:8, color:T.olive, letterSpacing:"0.14em", textTransform:"uppercase",
                    fontWeight:700, border:`1px solid ${T.olive}`, borderRadius:20,
                    padding:"2px 8px", marginBottom:7 }}>◎ VERIFIED OUTDOORS</div>
                  <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:"clamp(26px,5vw,44px)", fontWeight:700, color:T.white,
                    lineHeight:0.95, letterSpacing:"-0.02em", marginBottom:5 }}>
                    {username || "—"}
                  </h1>
                  <div style={{ fontSize:12, color:T.dim, marginBottom:10 }}>@{username}</div>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                    background:`${tier.color}15`, border:`1px solid ${tier.color}50`,
                    borderRadius:20, padding:"4px 12px" }}>
                    <span style={{ color:tier.color, fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase" }}>
                      ✦ {tierTitle}
                    </span>
                  </div>
                  {joinDate && <div style={{ fontSize:10, color:T.dim, marginTop:8 }}>📅 JOINED {joinDate.toUpperCase()}</div>}
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:9, letterSpacing:"0.2em", color:T.dim, textTransform:"uppercase", marginBottom:6 }}>Current Streak</div>
                {loading
                  ? <div className="skel" style={{ width:120, height:72, marginBottom:8 }} />
                  : <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:"clamp(52px,8vw,88px)", fontWeight:700, color:T.white,
                    lineHeight:0.88, letterSpacing:"-0.04em", textShadow:`0 0 40px ${tier.glow}60` }}>
                    <span style={{ fontSize:"0.35em", color:T.dim, verticalAlign:"top", lineHeight:3.1, letterSpacing:"0.04em" }}>DAY </span>
                    {streak}
                  </div>}
                <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                  background:`${tier.color}12`, border:`1px solid ${tier.color}40`,
                  borderRadius:20, padding:"4px 12px", marginTop:6 }}>
                  <span style={{ fontSize:9, letterSpacing:"0.16em", color:tier.color, textTransform:"uppercase", fontWeight:700 }}>✦ {tier.label}</span>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="stats-grid fade2" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", borderBottom:`1px solid ${T.border}` }}>
              <StatCell icon="🌱" value={loading?"…":grassScore.toLocaleString()} label="Grass Score" accent />
              <StatCell icon="👑" value={loading?"…":(rank?`#${rank}`:"—")} label={`Global Rank\nTop ${pct}%`} />
              <StatCell icon="🔥" value={loading?"…":`${streak}d`} label="Current Streak" last />
            </div>
            <div className="stats-grid fade2" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", borderBottom:`1px solid ${T.border}` }}>
              <StatCell icon="🏆" value={loading?"…":`${best}d`} label="Longest Streak" />
              <StatCell icon="🤝" value={loading?"…":(profileRow?.referral_count_successful??0)} label="Successful Referrals" />
              <StatCell icon="🎖" value={loading?"…":earnedBadges.length} label="Badges Earned" last />
            </div>

            {/* BADGES */}
            <div className="fade2" style={{ padding:"22px 24px", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div className="ct" style={{ margin:0 }}>Top Badges</div>
                <span style={{ fontSize:10, color:T.gold, fontWeight:600 }}>{earnedBadges.length} / {ALL_BADGES.length} Collected</span>
              </div>
              {topBadges.length > 0 ? (
                <div className="badge-row" style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12 }}>
                  {topBadges.map(b => <BadgeHex key={b.id} badge={b} size={52} totalUsers={totalUsers} />)}
                </div>
              ) : (
                <div style={{ fontSize:12, color:T.dim, padding:"12px 0" }}>No badges earned yet — keep going.</div>
              )}
            </div>

            {/* MILESTONES + HEATMAP */}
            <div className="bottom-row fade3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ padding:"22px 24px", borderRight:`1px solid ${T.border}` }}>
                <div className="ct">Milestones</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {milestones.map(m => (
                    <div key={m.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
                        background:m.done?`${T.olive}18`:T.bg3,
                        border:`1.5px solid ${m.done?T.olive:T.border}`,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>{m.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:m.done?T.white:T.dim }}>{m.label}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        {m.done
                          ? <span style={{ fontSize:10, color:T.olive }}>✓</span>
                          : <span style={{ fontSize:10, color:T.dim }}>{m.date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding:"22px 24px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div className="ct" style={{ margin:0 }}>Streak Heatmap</div>
                  <span style={{ fontSize:9, color:T.olive, fontWeight:700, letterSpacing:"0.1em" }}>{streak} DAYS STRONG</span>
                </div>
                {loading ? <div className="skel" style={{ height:80 }} /> : <StreakHeatmap submissions={submissions} streak={streak} />}
              </div>
            </div>

            {/* MOTTO + LOCATION */}
            <div className="fade3" style={{ padding:"18px 24px", borderBottom:`1px solid ${T.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ fontSize:8, letterSpacing:"0.18em", color:T.dim, textTransform:"uppercase", marginBottom:5 }}>I Touch Grass to...</div>
                <div style={{ fontSize:15, color:T.muted, fontStyle:"italic", lineHeight:1.6, fontFamily:"'Cormorant Garamond',Georgia,serif" }}>
                  {getQuote(streak, profileRow?.bio ?? "")}
                </div>
              </div>
              {profileRow?.location && (
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:8, letterSpacing:"0.18em", color:T.dim, textTransform:"uppercase", marginBottom:5 }}>Favorite Spot</div>
                  <div style={{ fontSize:11, color:T.muted }}>📍 {profileRow.location}</div>
                </div>
              )}
            </div>

            {/* COMMUNITY + CHALLENGES */}
            <div className="fade3" style={{ display:"flex", borderBottom:`1px solid ${T.border}` }}>
              {[
                {icon:"🏆",value:chalDone,label:"Challenges Won"},
                {icon:"⚡",value:chalSent,label:"Challenges Sent"},
                {icon:"🌿",value:subCount,label:"Proofs Logged"},
                {icon:"🔥",value:`${grassScore>=1000?(grassScore/1000).toFixed(1)+"K":grassScore}`,label:"Grass Score"},
              ].map((s,i,arr)=>(
                <div key={s.label} style={{ flex:1, display:"flex", flexDirection:"column",
                  alignItems:"center", gap:5, padding:"16px 8px",
                  borderRight:i<arr.length-1?`1px solid ${T.border}`:"none" }}>
                  <span style={{ fontSize:20 }}>{s.icon}</span>
                  <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22, fontWeight:700, color:T.white, lineHeight:1 }}>{s.value}</span>
                  <span style={{ fontSize:8.5, color:T.dim, letterSpacing:"0.1em", textTransform:"uppercase", textAlign:"center" }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* COMMUNITY BUILDER */}
            {(() => {
              const refCount=profileRow?.referral_count_successful??0;
              if(refCount===0)return null;
              const RBADGES=[
                {count:1,name:"Community Builder",emoji:"🤝"},
                {count:5,name:"Grass Recruiter",emoji:"🌱"},
                {count:10,name:"Community Cultivator",emoji:"🌿"},
                {count:25,name:"Growth Leader",emoji:"🌳"},
                {count:50,name:"Ecosystem Builder",emoji:"🏛"},
                {count:100,name:"Grass Evangelist",emoji:"👑"},
              ];
              const badge=[...RBADGES].reverse().find(b=>refCount>=b.count);
              const next=RBADGES.find(b=>refCount<b.count);
              return (
                <div className="fade3" style={{padding:"16px 24px",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:T.muted,display:"flex",alignItems:"center",gap:6}}>
                      <span>🤝</span> Community Builder
                    </div>
                    {badge&&<span style={{fontSize:11,color:T.gold,fontWeight:600}}>{badge.emoji} {badge.name}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:16,marginTop:10}}>
                    <div>
                      <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:28,fontWeight:700,color:T.gold}}>{refCount}</span>
                      <span style={{fontSize:10,color:T.dim,marginLeft:5}}>successful referral{refCount!==1?"s":""}</span>
                    </div>
                    {next&&(
                      <div style={{flex:1,minWidth:80}}>
                        <div style={{fontSize:9,color:T.dim,marginBottom:4}}>Next: {next.emoji} {next.name}</div>
                        <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
                          <div style={{height:"100%",borderRadius:99,background:`linear-gradient(90deg,${T.olive},${T.gold})`,width:`${Math.min(100,Math.round((refCount/next.count)*100))}%`}}/>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ECOSYSTEM STATUS */}
            <div className="fade3" style={{ padding:"18px 24px", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:T.muted, marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ color:T.olive }}>🌱</span> Ecosystem Status
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                {[
                  {key:"hasTG",icon:"🪙",name:"$TOUCHGRASS HOLDER",label:profileRow?.has_touchgrass_holder?"VERIFIED HOLDER":"NOT VERIFIED",verified:profileRow?.has_touchgrass_holder,accent:T.gold,note:"Hold 100K+ $TOUCHGRASS to qualify"},
                  {key:"hasGT",icon:"🌿",name:"GRASS TOUCHER",label:profileRow?.has_grass_toucher?"NFT HOLDER":"LOCKED",verified:profileRow?.has_grass_toucher,accent:T.olive,note:null},
                  {key:"hasST",icon:"📱",name:"SCREEN TOUCHER",label:profileRow?.has_screen_toucher?"NFT HOLDER":"LOCKED",verified:profileRow?.has_screen_toucher,accent:"#a78bfa",note:null},
                ].map(item=>(
                  <div key={item.key} style={{ flex:"1 1 0", minWidth:0, borderRadius:10, padding:"12px 10px", textAlign:"center",
                    background:item.verified?`${item.accent}0a`:T.bg3,
                    border:`1px solid ${item.verified?item.accent+"50":T.border}`,
                    opacity:item.verified?1:0.45 }}>
                    <div style={{ fontSize:22, marginBottom:6 }}>{item.icon}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:item.verified?T.white:T.dim, letterSpacing:"0.04em", marginBottom:5 }}>{item.name}</div>
                    <div style={{ fontSize:8, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
                      color:item.verified?item.accent:T.dim,
                      border:`1px solid ${item.verified?item.accent+"40":T.border}`,
                      borderRadius:20, padding:"2px 7px", display:"inline-block" }}>
                      {item.verified?"✓":"✗"} {item.label}
                    </div>
                    {!item.verified&&item.note&&<div style={{ fontSize:8, color:T.dim, marginTop:5, lineHeight:1.4 }}>{item.note}</div>}
                  </div>
                ))}
              </div>
              {(() => {
                const count=[profileRow?.has_touchgrass_holder,profileRow?.has_grass_toucher,profileRow?.has_screen_toucher].filter(Boolean).length;
                const pct2=Math.round((count/3)*100);
                return (
                  <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                    <div style={{ flex:1, minWidth:120 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                        <span style={{ fontSize:9, color:T.dim, letterSpacing:"0.12em", textTransform:"uppercase" }}>Ecosystem Completion</span>
                        <span style={{ fontSize:11, fontWeight:700, color:count===3?T.gold:T.olive }}>{count}/3</span>
                      </div>
                      <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct2}%`, borderRadius:99, background:`linear-gradient(90deg,${T.olive},${T.gold})`, transition:"width 1.2s ease" }} />
                      </div>
                    </div>
                    {count===3&&<div style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:"0.06em", flexShrink:0 }}>👑 FULL ECOSYSTEM TOUCHER</div>}
                  </div>
                );
              })()}
            </div>

            {/* FOOTER */}
            <div className="fade3" style={{ padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <img src="/touchgrass-transparent.png" alt="" style={{ width:16, height:16, opacity:0.5 }} />
                <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:12, color:T.dim, fontStyle:"italic" }}>
                  {getQuote(streak, profileRow?.bio ?? "")}
                </span>
              </div>
              <div style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em" }}>#TouchGrass #ProofOfGrass · proofofgrass.app</div>
            </div>
          </div>

          {/* SHARE ACTIONS */}
          <div className="fade3" style={{ display:"flex", gap:10, marginTop:20, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={flexToX} disabled={!cardReady} className="btn-share" style={{ opacity:!cardReady?0.5:1 }}>
              <span style={{display:"flex",alignItems:"center",gap:7}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                {!cardReady ? "Preparing…" : "Flex to X"}
              </span>
            </button>
            <button onClick={downloadCard} disabled={generatingImg} className="btn-ghost" style={{ opacity:generatingImg?0.7:1 }}>
              {downloaded ? "✓ Downloaded!" : "↓ Save Card"}
            </button>
            <button onClick={copyLink} className="btn-ghost">
              {copied ? "✓ Copied" : "↗ Copy Link"}
            </button>
            <Link href={`/u/${username}`} className="btn-ghost" style={{ textDecoration:"none" }}>← Full Profile</Link>
          </div>
          {downloaded && <p style={{ textAlign:"center", fontSize:11, color:"rgba(147,168,90,0.7)", marginTop:8 }}>Card saved to device ✓</p>}

        </div>
      </div>
    </>
  );
}