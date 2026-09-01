import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabase";
import { resolveActiveCover, isCoverUrlReady, COVER_DEFINITIONS } from "../../utils/coverDefinitions";
import Head from "next/head";

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

  // ── Font loading ──────────────────────────────────────────────────────────
  try {
    const f = new FontFace("Bebas Neue","url(https://fonts.gstatic.com/s/bebasneuepro/v3/2V0FKg2vH0NRXP81hDDSSXVeI0g.woff2)");
    await f.load(); document.fonts.add(f);
  } catch {}

  // ── Accent color from theme ───────────────────────────────────────────────
  const accent  = theme.accentColor  || "#7dc832";
  const accent2 = theme.progressTo   || "#5ba622";
  const glow    = theme.glowColor    || "#7dc832";
  const border  = theme.borderColor  || "rgba(125,200,50,0.5)";

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = "#e8f4fd"; ctx.fillRect(0,0,W,H);
  if (theme.imageUrl && theme.imageUrl !== "PASTE_URL_HERE") {
    try {
      const ci = await loadImage(theme.imageUrl);
      const ir=ci.width/ci.height, cr=W/H;
      let dw,dh,dx,dy;
      if(ir>cr){dh=H;dw=H*ir;dx=(W-dw)/2;dy=0;}
      else{dw=W;dh=W/ir;dx=0;dy=(H-dh)/2;}
      ctx.drawImage(ci,dx,dy,dw,dh);
    } catch {
      // Fallback gradient
      const gb = ctx.createLinearGradient(0,0,0,H);
      gb.addColorStop(0,"#c5e3f7"); gb.addColorStop(1,"#d8f0e8");
      ctx.fillStyle=gb; ctx.fillRect(0,0,W,H);
    }
  } else {
    const gb = ctx.createLinearGradient(0,0,0,H);
    gb.addColorStop(0,"#c5e3f7"); gb.addColorStop(1,"#d8f0e8");
    ctx.fillStyle=gb; ctx.fillRect(0,0,W,H);
  }

  // ── Outer rounded border ───────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 6;
  roundRect(ctx,12,12,W-24,H-24,28); ctx.stroke();

  // ── Helper: glass panel ───────────────────────────────────────────────────
  function glassPanel(x,y,w,h,r=16,alpha=0.82) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    roundRect(ctx,x,y,w,h,r); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5;
    roundRect(ctx,x,y,w,h,r); ctx.stroke();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1 — TOP IDENTITY + STREAK CARD
  // ─────────────────────────────────────────────────────────────────────────
  const TOP_Y = 40, TOP_H = 260;

  // Identity — no background panel
  const ID_X = 36, ID_Y = TOP_Y, ID_W = 580, ID_H = TOP_H;

  // Avatar
  const AV = 160, AV_X = ID_X, AV_Y = ID_Y - 20;
  ctx.save();
  ctx.beginPath(); ctx.arc(AV_X+AV/2, AV_Y+AV/2, AV/2, 0, Math.PI*2); ctx.clip();
  try {
    if(!avatarUrl) throw new Error();
    const ai = await loadImage(avatarUrl);
    ctx.drawImage(ai, AV_X, AV_Y, AV, AV);
  } catch {
    const ag = ctx.createLinearGradient(AV_X,AV_Y,AV_X+AV,AV_Y+AV);
    ag.addColorStop(0,accent+"44"); ag.addColorStop(1,accent+"22");
    ctx.fillStyle=ag; ctx.fill();
    ctx.font="700 48px Georgia,serif"; ctx.fillStyle=accent; ctx.textAlign="center";
    ctx.fillText((username[0]||"?").toUpperCase(), AV_X+AV/2, AV_Y+AV/2+17);
  }
  ctx.restore();
  // Avatar ring
  ctx.strokeStyle = avatarFrame==="crown" ? "#c8a84b" : "rgba(255,255,255,0.95)";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(AV_X+AV/2, AV_Y+AV/2, AV/2+5, 0, Math.PI*2); ctx.stroke();
  // Verified dot
  ctx.fillStyle = "#5ba622";
  ctx.beginPath(); ctx.arc(AV_X+AV-8, AV_Y+AV-8, 14, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "white"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("✓", AV_X+AV-8, AV_Y+AV-4); ctx.textAlign = "left";

  // Username
  const NX = AV_X + AV + 16;
  const uSz = username.length>14 ? 52 : username.length>11 ? 62 : 72;
  const NY = ID_Y + 68;
  ctx.font = `700 ${uSz}px 'Playfair Display',Georgia,serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 2;
  ctx.fillText(`@${username}`, NX, NY);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Tier chip
  const T_Y = NY + 10;
  const T_TXT = `✦ ${tierTitle.toUpperCase()}`;
  ctx.font = "700 13px 'DM Sans',sans-serif";
  const T_W = ctx.measureText(T_TXT).width + 28;
  ctx.fillStyle = accent + "22";
  roundRect(ctx, NX, T_Y, T_W, 28, 14); ctx.fill();
  ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
  roundRect(ctx, NX, T_Y, T_W, 28, 14); ctx.stroke();
  ctx.fillStyle = "#0a2005"; ctx.fillText(T_TXT, NX+14, T_Y+19);

  // Skin chip (if has active cover)
  if (theme.name) {
    const S_Y = T_Y + 36;
    const skinEmoji = theme.name.includes("Blossom")?"🌸":theme.name.includes("Beach")?"🏖":
      theme.name.includes("Mountain")?"⛰":theme.name.includes("Sunflower")?"🌻":
      theme.name.includes("Night")?"🌙":theme.name.includes("Torii")?"⛩":
      theme.name.includes("Sunrise")?"🌅":theme.name.includes("City")?"🌆":
      theme.name.includes("Chrome")?"🪩":theme.name.includes("Aqua")?"🌊":
      theme.name.includes("Bubble")?"🫧":theme.name.includes("Dream")?"✨":
      theme.name.includes("Garden")?"🌿":theme.name.includes("ATH")?"🚀":
      theme.name.includes("Rug")?"📉":theme.name.includes("Bear")?"🐻":
      theme.name.includes("Moon")?"🌕":theme.name.includes("Lagoon")?"💧":"🎨";
    const S_TXT = `${skinEmoji} ${theme.name.toUpperCase()}`;
    ctx.font = "700 13px 'DM Sans',sans-serif";
    const S_W = ctx.measureText(S_TXT).width + 28;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, NX, S_Y, S_W, 28, 14); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    roundRect(ctx, NX, S_Y, S_W, 28, 14); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.fillText(S_TXT, NX+14, S_Y+19);
  }

  // ── STREAK CARD — top right ───────────────────────────────────────────────
  const SC_W = 340, SC_H = TOP_H + 30, SC_X = W - SC_W - 36, SC_Y = TOP_Y - 10;
  // White glass card with soft shadow
  ctx.shadowColor = "rgba(26,74,10,0.15)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  glassPanel(SC_X, SC_Y, SC_W, SC_H, 24, 0.90);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Decorative top bar
  const bar_g = ctx.createLinearGradient(SC_X,SC_Y,SC_X+SC_W,SC_Y);
  bar_g.addColorStop(0, accent+"44"); bar_g.addColorStop(1, accent2+"22");
  ctx.fillStyle = bar_g;
  roundRect(ctx,SC_X,SC_Y,SC_W,5,3); ctx.fill();

  // "CURRENT STREAK" label
  ctx.font = "700 14px 'DM Sans',sans-serif";
  ctx.fillStyle = accent; ctx.textAlign = "center";
  ctx.fillText("— CURRENT STREAK —", SC_X+SC_W/2, SC_Y+38);

  // Big streak number — serif, theme-accented
  const nSz = streak>=1000?130:streak>=100?160:190;
  ctx.font = `400 ${nSz}px 'Fredoka One',cursive`;
  ctx.fillStyle = "#1a4a0a";
  ctx.shadowColor = accent+"60"; ctx.shadowBlur = 32;
  ctx.fillText(`${streak}`, SC_X+SC_W/2, SC_Y+46+nSz*0.85);
  ctx.shadowBlur = 0;

  // "DAYS" label
  ctx.font = "700 18px 'DM Sans',sans-serif";
  ctx.fillStyle = accent;
  ctx.fillText("DAYS", SC_X+SC_W/2, SC_Y+SC_H-36);

  // Decorative lines flanking DAYS
  const daysY = SC_Y+SC_H-36;
  const lineW = 60;
  const daysW = ctx.measureText("DAYS").width;
  ctx.strokeStyle = accent+"60"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(SC_X+SC_W/2-daysW/2-14,daysY-5); ctx.lineTo(SC_X+SC_W/2-daysW/2-14-lineW,daysY-5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(SC_X+SC_W/2+daysW/2+14,daysY-5); ctx.lineTo(SC_X+SC_W/2+daysW/2+14+lineW,daysY-5); ctx.stroke();
  ctx.textAlign = "left";

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2 — BACKGROUND (open space, cover shows through)
  // ─────────────────────────────────────────────────────────────────────────
  // No panel — the cosmetic background is the hero

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3 — STATS PANEL (4 stats horizontal)
  // ─────────────────────────────────────────────────────────────────────────
  const SP_Y = 780, SP_H = 160, SP_X = 36, SP_W = W - 72;
  ctx.shadowColor = "rgba(26,74,10,0.12)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 4;
  glassPanel(SP_X, SP_Y, SP_W, SP_H, 20, 0.88);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  const gsVal = grassScore>=1000 ? (grassScore/1000).toFixed(1)+"K" : String(grassScore);
  const statsData = [
    { icon:"🌿", label:"GRASS SCORE",   value:gsVal,                 color:"#1a4a0a" },
    { icon:"🔥", label:"BEST STREAK",   value:`${best}d`,            color:"#e05050" },
    { icon:"👑", label:"GLOBAL RANK",   value:rank?`#${rank}`:"—",   color:"#c8a84b" },
    { icon:"🏅", label:"BADGES EARNED", value:String(badges.length), color:"#7b5ea7" },
  ];

  const colW4 = SP_W / statsData.length;
  statsData.forEach((s, i) => {
    const cx = SP_X + colW4*i + colW4/2;
    const cy = SP_Y + SP_H/2;

    // Divider (not first)
    if (i > 0) {
      ctx.strokeStyle = "rgba(200,220,190,0.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(SP_X+colW4*i, SP_Y+20); ctx.lineTo(SP_X+colW4*i, SP_Y+SP_H-20); ctx.stroke();
    }

    // Icon circle
    ctx.fillStyle = s.color + "18";
    ctx.beginPath(); ctx.arc(cx, cy-24, 22, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = s.color+"40"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy-24, 22, 0, Math.PI*2); ctx.stroke();
    ctx.font = "22px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(s.icon, cx, cy-17);

    // Label
    ctx.font = "700 11px 'Plus Jakarta Sans',sans-serif";
    ctx.fillStyle = s.color; ctx.textAlign = "center";
    ctx.fillText(s.label, cx, cy+8);

    // Value
    const valSz = s.value.length>5 ? 32 : 40;
    ctx.font = `700 ${valSz}px 'Playfair Display',Georgia,serif`;
    ctx.fillStyle = "#050f02";
    ctx.fillText(s.value, cx, cy+48);
  });
  ctx.textAlign = "left";

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4 — MILESTONE PROGRESS BAR
  // ─────────────────────────────────────────────────────────────────────────
  const MP_Y = SP_Y + SP_H + 16, MP_H = 100, MP_X = 36, MP_W = W - 72;
  ctx.shadowColor = "rgba(26,74,10,0.10)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 3;
  glassPanel(MP_X, MP_Y, MP_W, MP_H, 16, 0.88);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  const ths = [7,14,30,50,100,180,365,500,1000];
  const nxt = ths.find(t=>t>streak)||1000;
  const prv = [...[0,...ths]].reverse().find(t=>streak>=t)||0;
  const fp  = Math.min(1,(streak-prv)/Math.max(1,nxt-prv));
  const nxtLabels = {7:"ROOTED",14:"LOCKED IN",30:"ELITE",50:"LEGENDARY",100:"IMMORTAL",180:"MYTHIC",365:"ETERNAL",500:"ASCENDED",1000:"TRANSCENDENT"};
  const nxtL = nxtLabels[nxt]||"MYTHIC";
  const nxtEmoji = nxt>=1000?"✨":nxt>=500?"🌌":nxt>=365?"👑":nxt>=180?"⚡":nxt>=100?"💯":nxt>=50?"🌅":nxt>=30?"🌲":nxt>=14?"💧":"🌱";

  // Milestone icon circle (left)
  const MC_CX = MP_X + 34, MC_CY = MP_Y + MP_H/2;
  ctx.fillStyle = accent+"22";
  ctx.beginPath(); ctx.arc(MC_CX, MC_CY, 22, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = accent+"66"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(MC_CX, MC_CY, 22, 0, Math.PI*2); ctx.stroke();
  ctx.font = "22px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(nxtEmoji, MC_CX, MC_CY+8);

  // Label row
  ctx.font = "700 14px 'DM Sans',sans-serif"; ctx.fillStyle = "#1a4a0a"; ctx.textAlign = "left";
  ctx.fillText(`${nxtL} · DAY ${nxt}`, MP_X+68, MP_Y+22);
  ctx.font = "600 13px 'DM Sans',sans-serif"; ctx.fillStyle = accent; ctx.textAlign = "right";
  ctx.fillText(`${streak} / ${nxt}`, MP_X+MP_W-16, MP_Y+22);

  // Progress bar track
  const BX = MP_X+68, BY = MP_Y+32, BW = MP_W-84, BH = 14;
  ctx.fillStyle = "rgba(200,220,190,0.5)";
  roundRect(ctx,BX,BY,BW,BH,7); ctx.fill();

  // Progress fill
  const pg = ctx.createLinearGradient(BX,0,BX+BW*fp,0);
  pg.addColorStop(0, accent); pg.addColorStop(1, accent2);
  ctx.fillStyle = pg;
  ctx.shadowColor = glow; ctx.shadowBlur = 10;
  roundRect(ctx,BX,BY,BW*fp,BH,7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // Footer removed

  try { return canvas.toDataURL("image/png"); }
  catch(e) { throw new Error("canvas_tainted: "+e.message); }
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

function loadImage(src){
  return new Promise((res,rej)=>{
    const timer = setTimeout(() => rej(new Error("loadImage timeout: " + src)), 8000);
    const done = (val) => { clearTimeout(timer); res(val); };
    const fail = (err) => { clearTimeout(timer); rej(err); };
    const img=new Image(); img.crossOrigin="anonymous";
    img.onload=()=>done(img);
    img.onerror=()=>{
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

  // Award Grass Draw bonus in background — non-blocking, fire-and-forget
  const awardFlexDrawBonus = useCallback(() => {
    if (!username) return;
    fetch("/api/grass-draw/award-bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        entry_type: "flex_card",
        source_id: `flex_${username}_${new Date().toISOString().split("T")[0]}`,
        notes: `Flex Card shared — Day ${streak}`,
      }),
    }).catch(() => {}); // silent — never block the share
  }, [username, streak]);

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
          awardFlexDrawBonus();
        })
        .catch(e => {
          if (e?.name === "AbortError") return;
          // Share failed — download as fallback
          if (dataUrl) { const a=document.createElement("a"); a.href=dataUrl; a.download=file.name; a.click(); }
        });
      return;
    }

    // Desktop or no share API — open X compose + download image
    awardFlexDrawBonus();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    if (dataUrl) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `proof-of-grass-${username}-day${streak}.png`;
      a.click();
    }
  }, [username, streak, tier, awardFlexDrawBonus]);

  const [activeTab, setActiveTab] = useState("backgrounds");
  const [previewCover, setPreviewCover] = useState(null); // temp preview cover

  // All packs the user has unlocked
  const unlockedCovers = profileRow?.unlocked_covers ?? [];

  // All cover definitions grouped by pack
  const SUPABASE_URL = "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public";
  const PACK_DEFS = [
    {
      id:"retro_covers_pack", name:"Retro Vibes Pack", emoji:"🌅",
      bg:"linear-gradient(135deg,#8B4513,#D2691E)",
      covers:[
        { slug:"marketplace_retro_beach",     name:"Retro Beach",     imageUrl:`${SUPABASE_URL}/covers/retro_beach.png`,     fallback:"linear-gradient(135deg,#001a2e,#003d5c)" },
        { slug:"marketplace_retro_mountain",  name:"Retro Mountain",  imageUrl:`${SUPABASE_URL}/covers/retro_mountain.png`,  fallback:"linear-gradient(135deg,#0d0d14,#1a1a2e)" },
        { slug:"marketplace_retro_sunflower", name:"Retro Sunflower", imageUrl:`${SUPABASE_URL}/covers/retro_sunflower.png`, fallback:"linear-gradient(135deg,#1a1200,#3d2e00)" },
        { slug:"marketplace_retro_waterfall", name:"Retro Waterfall", imageUrl:`${SUPABASE_URL}/covers/retro_waterfall.png`, fallback:"linear-gradient(135deg,#001a14,#00352a)" },
        { slug:"marketplace_retro_night",     name:"Retro Night",     imageUrl:`${SUPABASE_URL}/covers/retro_night.png`,     fallback:"linear-gradient(135deg,#04040e,#0a0a1e)" },
      ],
    },
    {
      id:"anime_nature_pack", name:"Anime Outdoors", emoji:"🌸",
      bg:"linear-gradient(135deg,#FF69B4,#9370DB)",
      covers:[
        { slug:"marketplace_cherry_blossom", name:"Cherry Blossom", imageUrl:`${SUPABASE_URL}/covers/cherry_blossom.png`, fallback:"linear-gradient(135deg,#1a0010,#3d0028)" },
        { slug:"marketplace_torii_forest",   name:"Torii Forest",   imageUrl:`${SUPABASE_URL}/covers/torii_forest.png`,   fallback:"linear-gradient(135deg,#0d0a00,#2a1a00)" },
        { slug:"marketplace_lake_sunrise",   name:"Lake Sunrise",   imageUrl:`${SUPABASE_URL}/covers/lake_sunrise.png`,   fallback:"linear-gradient(135deg,#001018,#002030)" },
        { slug:"marketplace_beach_coast",    name:"Beach Coast",    imageUrl:`${SUPABASE_URL}/covers/beach_coast.png`,    fallback:"linear-gradient(135deg,#001824,#003040)" },
        { slug:"marketplace_city_view",      name:"City View",      imageUrl:`${SUPABASE_URL}/covers/city_view.png`,      fallback:"linear-gradient(135deg,#06050e,#0e0c1e)" },
      ],
    },
    {
      id:"y2k_pack", name:"Y2K Outdoors", emoji:"💿",
      bg:"linear-gradient(135deg,#00CED1,#9370DB)",
      covers:[
        { slug:"marketplace_chrome_meadow", name:"Chrome Meadow", imageUrl:`${SUPABASE_URL}/covers/chrome_meadow.png`, fallback:"linear-gradient(135deg,#0a0a14,#1a1a2e)" },
        { slug:"marketplace_aqua_coast",    name:"Aqua Coast",    imageUrl:`${SUPABASE_URL}/covers/aqua_coast.png`,    fallback:"linear-gradient(135deg,#001a1a,#003030)" },
        { slug:"marketplace_bubble_forest", name:"Bubble Forest", imageUrl:`${SUPABASE_URL}/covers/bubble_forest.png`, fallback:"linear-gradient(135deg,#140020,#280040)" },
        { slug:"marketplace_dream_sky",     name:"Dream Sky",     imageUrl:`${SUPABASE_URL}/covers/dream_sky.png`,     fallback:"linear-gradient(135deg,#001428,#002050)" },
        { slug:"marketplace_cyber_garden",  name:"Cyber Garden",  imageUrl:`${SUPABASE_URL}/covers/cyber_garden.png`,  fallback:"linear-gradient(135deg,#001408,#002810)" },
      ],
    },
    {
      id:"trenches_pack", name:"The Trenches", emoji:"🌿",
      bg:"linear-gradient(135deg,#1a2d0e,#3d7a12)",
      covers:[
        { slug:"marketplace_ath_overlook",         name:"ATH Overlook",         imageUrl:`${SUPABASE_URL}/covers/ath_overlook.png`,         fallback:"linear-gradient(135deg,#0a1400,#142800)" },
        { slug:"marketplace_rug_pull_ravine",      name:"Rug Pull Ravine",      imageUrl:`${SUPABASE_URL}/covers/rug_pull_ravine.png`,     fallback:"linear-gradient(135deg,#140000,#280000)" },
        { slug:"marketplace_bear_market_blizzard", name:"Bear Market Blizzard", imageUrl:`${SUPABASE_URL}/covers/bear_market_blizzard.png`, fallback:"linear-gradient(135deg,#060810,#0c1020)" },
        { slug:"marketplace_moonbag_camp",         name:"Moonbag Camp",         imageUrl:`${SUPABASE_URL}/covers/moonbag_camp.png`,        fallback:"linear-gradient(135deg,#0a0800,#1e1400)" },
        { slug:"marketplace_liquidity_lagoon",     name:"Liquidity Lagoon",     imageUrl:`${SUPABASE_URL}/covers/liquidity_lagoon.png`,    fallback:"linear-gradient(135deg,#001418,#002830)" },
      ],
    },
  ];

  // Effective cover — previewCover overrides active
  const effectiveCover = previewCover || activeCover;

  const V2G = {
    bg:"white", green:"#5ba622", darkGreen:"#1a4a0a",
    midGray:"#6b7d60", border:"rgba(200,220,190,0.5)",
    lightBg:"rgba(125,200,50,0.06)",
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:#e8f4fd;font-family:'DM Sans',sans-serif;}
    .fcs-tab{padding:10px 18px;border-radius:20px;border:1.5px solid rgba(200,220,190,0.5);
      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;
      transition:all 0.15s;white-space:nowrap;background:white;color:#1a4a0a;}
    .fcs-tab:hover{border-color:#5ba622;color:#5ba622;}
    .fcs-tab.active{background:#5ba622;color:white;border-color:#5ba622;
      box-shadow:0 2px 10px rgba(91,166,34,0.3);}
    .fcs-cover-card{border-radius:12px;overflow:hidden;cursor:pointer;
      transition:transform 0.15s,box-shadow 0.15s;border:2px solid transparent;}
    .fcs-cover-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(26,74,10,0.14);}
    .fcs-cover-card.active{border-color:#5ba622;box-shadow:0 0 0 2px rgba(91,166,34,0.3);}
    .fcs-pack-card{border-radius:14px;overflow:hidden;cursor:pointer;
      transition:transform 0.15s;background:white;border:1.5px solid rgba(200,220,190,0.5);}
    .fcs-pack-card:hover{transform:translateY(-2px);}
    .skel{background:rgba(200,220,190,0.3);border-radius:6px;animation:fcsShimmer 1.4s ease-in-out infinite;}
    @keyframes fcsShimmer{0%,100%{opacity:0.5;}50%{opacity:0.9;}}
    @media(max-width:640px){
      .fcs-grid{grid-template-columns:repeat(2,1fr)!important;}
    }
  `;

  return (
    <>
      <Head>
        <title>Flex Card Studio — @{username} | Touch Grass</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html:css }} />

      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)" }}>

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav style={{ position:"sticky", top:0, zIndex:200, height:60,
          display:"flex", alignItems:"center", padding:"0 clamp(14px,4vw,40px)", gap:16,
          background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)",
          borderBottom:"1px solid rgba(200,220,190,0.5)",
          boxShadow:"0 2px 16px rgba(26,74,10,0.07)" }}>

          {/* Back */}
          <Link href={`/u/${username}`}
            style={{ display:"flex", alignItems:"center", gap:6, textDecoration:"none",
              color:"#1a4a0a", fontSize:13, fontWeight:600, flexShrink:0 }}>
            ← Back
          </Link>

          {/* Title */}
          <div style={{ flex:1, textAlign:"center" }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#1a4a0a" }}>Flex Card Studio</div>
          </div>

          {/* Help */}
          <button style={{ background:"transparent", border:"1.5px solid rgba(200,220,190,0.5)",
            borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:600,
            color:"#6b7d60", cursor:"pointer", flexShrink:0, fontFamily:"DM Sans,sans-serif" }}>
            Help
          </button>
        </nav>

        {/* ── COSMETICS BANNER ─────────────────────────────────────────────── */}
        <div style={{ background:"rgba(125,200,50,0.08)", borderBottom:"1px solid rgba(125,200,50,0.2)",
          padding:"10px clamp(14px,4vw,40px)", display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16 }}>🎨</span>
            <span style={{ fontSize:13, fontWeight:600, color:"#1a4a0a" }}>
              Skins are cosmetics from the Marketplace
            </span>
          </div>
          <Link href="/marketplace"
            style={{ fontSize:12, fontWeight:700, color:"#5ba622", textDecoration:"none",
              background:"rgba(125,200,50,0.1)", border:"1px solid rgba(125,200,50,0.3)",
              borderRadius:20, padding:"5px 14px" }}>
            Browse Marketplace →
          </Link>
        </div>

        <div style={{ maxWidth:800, margin:"0 auto", padding:"24px clamp(14px,4vw,24px) 80px" }}>

          {/* ── LIVE FLEX CARD PREVIEW ────────────────────────────────────── */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
              textTransform:"uppercase", color:"#6b7d60", marginBottom:12,
              display:"flex", alignItems:"center", gap:8 }}>
              <span>👁</span> Live Preview
              {previewCover && (
                <span style={{ fontSize:10, color:"#5ba622", fontWeight:600,
                  background:"rgba(125,200,50,0.1)", borderRadius:20, padding:"2px 10px" }}>
                  Previewing: {previewCover.name}
                </span>
              )}
            </div>

            {/* Card preview */}
            <div ref={cardRef} style={{
              borderRadius:20, overflow:"hidden", position:"relative",
              background:effectiveCover?.fallback||"linear-gradient(135deg,#1a4a0a,#2d7a1a)",
              boxShadow:"0 8px 40px rgba(26,74,10,0.2)",
              minHeight:260,
            }}>
              {/* Cover bg */}
              {effectiveCover?.imageUrl && (
                <div style={{ position:"absolute", inset:0,
                  backgroundImage:`url(${effectiveCover.imageUrl})`,
                  backgroundSize:"cover", backgroundPosition:"center" }} />
              )}
              {/* Scrim */}
              <div style={{ position:"absolute", inset:0,
                background:"linear-gradient(180deg,rgba(0,0,0,0.3) 0%,rgba(0,0,0,0.75) 100%)" }} />

              {/* Card content */}
              <div style={{ position:"relative", padding:"28px 28px 24px", display:"flex",
                flexDirection:"column", gap:16 }}>

                {/* Top row — avatar + username + tier */}
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", flexShrink:0,
                    background:"rgba(125,200,50,0.3)", border:"2px solid rgba(255,255,255,0.6)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:26,
                    overflow:"hidden" }}>
                    {profileRow?.avatar_url
                      ? <img src={profileRow.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
                      : (profileRow?.avatar_emoji||"🌿")
                    }
                  </div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800, color:"white", lineHeight:1 }}>
                      @{username}
                    </div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:3 }}>
                      {tier.label} {tier.emoji}
                    </div>
                  </div>
                  <div style={{ marginLeft:"auto", textAlign:"right" }}>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", letterSpacing:"0.1em",
                      textTransform:"uppercase", marginBottom:2 }}>Day</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                      fontSize:48, fontWeight:700, color:"white", lineHeight:1 }}>{streak}</div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {[
                    { label:"Streak",     value:`${streak}d` },
                    { label:"Best",       value:`${best}d`   },
                    { label:"Proofs",     value:subCount      },
                    { label:"Grass Score",value:grassScore.toLocaleString() },
                  ].map(s=>(
                    <div key={s.label} style={{ background:"rgba(255,255,255,0.12)",
                      backdropFilter:"blur(8px)", borderRadius:10, padding:"8px 12px",
                      border:"1px solid rgba(255,255,255,0.2)", flex:"1 1 80px", minWidth:0 }}>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.6)",
                        textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>{s.label}</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                        fontSize:18, fontWeight:700, color:"white" }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Touch Grass branding */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <img src="/touchgrass-transparent.png" alt="" style={{ width:16, height:16, opacity:0.7 }} />
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em" }}>
                      proofofgrass.app
                    </span>
                  </div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", letterSpacing:"0.06em" }}>
                    BUILT ON ◎ SOLANA
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── TABS ─────────────────────────────────────────────────────────── */}
          <div style={{ display:"flex", gap:8, marginBottom:20, overflowX:"auto",
            scrollbarWidth:"none", paddingBottom:4 }}>
            {[
              { id:"backgrounds", label:"🖼 Background Pack" },
              { id:"layout",      label:"📐 Layout" },
              { id:"badges",      label:"🏅 Badges" },
              { id:"preview",     label:"👁 Preview" },
            ].map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                className={`fcs-tab ${activeTab===tab.id?"active":""}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB CONTENT ──────────────────────────────────────────────────── */}

          {/* Backgrounds tab */}
          {activeTab==="backgrounds" && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#6b7d60", marginBottom:16 }}>
                Marketplace Backgrounds
              </div>

              {PACK_DEFS.map(pack=>{
                const hasAny = pack.covers.some(c=>unlockedCovers.includes(c.slug));
                return (
                  <div key={pack.id} style={{ marginBottom:24 }}>
                    {/* Pack header */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:pack.bg,
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                          {pack.emoji}
                        </div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:"#1a4a0a" }}>{pack.name}</div>
                          <div style={{ fontSize:11, color:"#6b7d60" }}>
                            {hasAny?"Owned":"Not owned"} · {pack.covers.length} covers
                          </div>
                        </div>
                      </div>
                      {!hasAny && (
                        <Link href="/marketplace"
                          style={{ fontSize:12, fontWeight:700, color:"#5ba622",
                            textDecoration:"none", background:"rgba(125,200,50,0.1)",
                            border:"1px solid rgba(125,200,50,0.3)", borderRadius:20,
                            padding:"5px 14px" }}>
                          Buy Pack →
                        </Link>
                      )}
                    </div>

                    {/* Cover grid */}
                    <div className="fcs-grid" style={{ display:"grid",
                      gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
                      {pack.covers.map(cover=>{
                        const owned  = unlockedCovers.includes(cover.slug);
                        const active = (profileRow?.active_cover_id===cover.slug)||
                                       (previewCover?.slug===cover.slug);
                        return (
                          <div key={cover.slug}
                            className={`fcs-cover-card ${active?"active":""}`}
                            style={{ opacity:owned?1:0.4,
                              cursor:owned?"pointer":"default",
                              position:"relative" }}
                            onClick={()=>{
                              if(!owned) return;
                              setPreviewCover(cover);
                            }}>
                            {/* Cover image */}
                            <div style={{ height:70, background:cover.fallback, overflow:"hidden" }}>
                              <img src={cover.imageUrl} alt={cover.name} loading="lazy"
                                style={{ width:"100%", height:"100%", objectFit:"cover" }}
                                onError={e=>{e.currentTarget.style.display="none";}} />
                            </div>
                            {/* Name */}
                            <div style={{ padding:"6px 8px", background:"white",
                              fontSize:9, fontWeight:600, color:"#1a4a0a",
                              lineHeight:1.3 }}>{cover.name}</div>
                            {/* Lock overlay */}
                            {!owned && (
                              <div style={{ position:"absolute", inset:0, display:"flex",
                                alignItems:"center", justifyContent:"center",
                                background:"rgba(255,255,255,0.5)", fontSize:18 }}>🔒</div>
                            )}
                            {/* Active check */}
                            {active && owned && (
                              <div style={{ position:"absolute", top:6, right:6, width:20, height:20,
                                borderRadius:"50%", background:"#5ba622",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:10, color:"white" }}>✓</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Milestone covers */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:36, height:36, borderRadius:10,
                    background:"linear-gradient(135deg,#1a4a0a,#2d7a1a)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🌿</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#1a4a0a" }}>Milestone Covers</div>
                    <div style={{ fontSize:11, color:"#6b7d60" }}>Unlocked by reaching streak milestones</div>
                  </div>
                </div>
                <div className="fcs-grid" style={{ display:"grid",
                  gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
                  {COVER_DEFINITIONS.filter(c=>!c.marketplaceOnly).map(cov=>{
                    const owned  = unlockedCovers.includes(cov.slug);
                    const active = (profileRow?.active_cover_id===cov.slug)||
                                   (previewCover?.slug===cov.slug);
                    return (
                      <div key={cov.slug}
                        className={`fcs-cover-card ${active?"active":""}`}
                        style={{ opacity:owned?1:0.4,
                          cursor:owned?"pointer":"default",
                          position:"relative", borderRadius:12, overflow:"hidden",
                          border:`2px solid ${active?"#5ba622":"rgba(200,220,190,0.5)"}` }}
                        onClick={()=>{ if(owned) setPreviewCover(cov); }}>
                        <div style={{ height:70, background:cov.fallback, overflow:"hidden" }}>
                          {cov.imageUrl && (
                            <img src={cov.imageUrl} alt={cov.name} loading="lazy"
                              style={{ width:"100%", height:"100%", objectFit:"cover" }}
                              onError={e=>{e.currentTarget.style.display="none";}} />
                          )}
                        </div>
                        <div style={{ padding:"6px 8px", background:"white",
                          fontSize:9, fontWeight:600, color:"#1a4a0a", lineHeight:1.3 }}>
                          {cov.name}
                          {!owned && <div style={{ fontSize:8, color:"#6b7d60" }}>Day {cov.unlockDay}</div>}
                        </div>
                        {active && owned && (
                          <div style={{ position:"absolute", top:6, right:6, width:20, height:20,
                            borderRadius:"50%", background:"#5ba622",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:10, color:"white" }}>✓</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Layout tab */}
          {activeTab==="layout" && (
            <div style={{ padding:"32px", textAlign:"center", background:"white",
              borderRadius:16, border:"1px solid rgba(200,220,190,0.5)" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📐</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#1a4a0a", marginBottom:6 }}>Layout Options</div>
              <div style={{ fontSize:13, color:"#6b7d60" }}>Coming soon — custom layouts are on the roadmap.</div>
            </div>
          )}

          {/* Badges tab */}
          {activeTab==="badges" && (
            <div style={{ background:"white", borderRadius:16, padding:"20px",
              border:"1px solid rgba(200,220,190,0.5)" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:"#6b7d60", marginBottom:16 }}>
                Your Earned Badges
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12 }}>
                {earnedBadges.slice(0,12).map(b=>(
                  <div key={b.id} style={{ display:"flex", flexDirection:"column",
                    alignItems:"center", gap:6 }} title={b.name}>
                    <div style={{ width:52, height:52, borderRadius:14,
                      background:"rgba(125,200,50,0.1)", border:"1.5px solid rgba(125,200,50,0.3)",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                      {b.emoji}
                    </div>
                    <div style={{ fontSize:8, fontWeight:600, color:"#1a4a0a",
                      textAlign:"center", lineHeight:1.3 }}>{b.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview tab */}
          {activeTab==="preview" && (
            <div style={{ background:"white", borderRadius:16, padding:"20px",
              border:"1px solid rgba(200,220,190,0.5)" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:"#6b7d60", marginBottom:16 }}>
                Card Preview
              </div>
              {loading ? (
                <div className="skel" style={{ height:200 }} />
              ) : (
                <div style={{ fontSize:13, color:"#6b7d60", textAlign:"center", padding:"20px 0" }}>
                  Your live card preview is shown above. Use the Backgrounds tab to change your skin.
                </div>
              )}
            </div>
          )}

          {/* ── ACTION BUTTONS ────────────────────────────────────────────── */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:24 }}>
            {/* Apply background */}
            {previewCover && (
              <button
                onClick={async()=>{
                  // Save active cover to profile
                  await supabase.from("Profiles")
                    .upsert({ username, active_cover_id:previewCover.slug }, { onConflict:"username" });
                  setPreviewCover(null);
                }}
                style={{ background:"linear-gradient(135deg,#7dc832,#5ba622)",
                  color:"white", border:"none", borderRadius:12, padding:"14px",
                  fontSize:15, fontWeight:700, cursor:"pointer",
                  boxShadow:"0 4px 16px rgba(125,200,50,0.35)", fontFamily:"DM Sans,sans-serif",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                ✓ Apply Background
              </button>
            )}

            {/* Preview Flex Card */}
            <button onClick={flexToX} disabled={!cardReady}
              style={{ background:cardReady?"linear-gradient(135deg,#7dc832,#5ba622)":"rgba(200,220,190,0.4)",
                color:cardReady?"white":"#6b7d60", border:"none", borderRadius:12, padding:"14px",
                fontSize:15, fontWeight:700, cursor:cardReady?"pointer":"default",
                boxShadow:cardReady?"0 4px 16px rgba(125,200,50,0.35)":"none",
                fontFamily:"DM Sans,sans-serif",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {!cardReady?"⏳ Building Card…":"🚀 Share Flex Card to X"}
            </button>

            {/* Download + copy */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={downloadCard} disabled={generatingImg}
                style={{ flex:1, padding:"12px", borderRadius:12, cursor:"pointer",
                  background:"white", border:"1.5px solid rgba(200,220,190,0.5)",
                  color:"#1a4a0a", fontSize:13, fontWeight:600, fontFamily:"DM Sans,sans-serif" }}>
                {downloaded?"✓ Downloaded!":"↓ Download Card"}
              </button>
              <button onClick={copyLink}
                style={{ flex:1, padding:"12px", borderRadius:12, cursor:"pointer",
                  background:"white", border:"1.5px solid rgba(200,220,190,0.5)",
                  color:"#1a4a0a", fontSize:13, fontWeight:600, fontFamily:"DM Sans,sans-serif" }}>
                {copied?"✓ Copied!":"↗ Copy Link"}
              </button>
            </div>

            {/* View profile link */}
            <Link href={`/u/${username}`}
              style={{ textAlign:"center", fontSize:12, color:"#6b7d60",
                textDecoration:"none", marginTop:4 }}>
              ← Back to Profile
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}