import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabase";

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
  if (n>=365) return { label:"ETERNAL",   color:"#fff9c4", glow:"#a08000" };
  if (n>=180) return { label:"MYTHIC",    color:"#fbbf24", glow:"#92400e" };
  if (n>=100) return { label:"IMMORTAL",  color:"#f97316", glow:"#7c2d12" };
  if (n>=50)  return { label:"LEGENDARY", color:T.gold,    glow:"#7a5c00" };
  if (n>=30)  return { label:"ELITE",     color:T.purple,  glow:"#5b21b6" };
  if (n>=14)  return { label:"LOCKED IN", color:T.olive,   glow:"#3a4a20" };
  if (n>=7)   return { label:"ROOTED",    color:"#b8c87a", glow:"#4a5828" };
  if (n>=3)   return { label:"GROWING",   color:"#a0b870", glow:"#3a4820" };
  return { label:"SEED", color:T.dim, glow:"transparent" };
}

function getTierTitle(n) {
  if (n>=365) return "ETERNAL GRASS TOUCHER";
  if (n>=180) return "MYTHIC GRASS TOUCHER";
  if (n>=100) return "IMMORTAL GRASS TOUCHER";
  if (n>=50)  return "LEGENDARY TOUCHER";
  if (n>=30)  return "ELITE GRASS TOUCHER";
  if (n>=14)  return "LOCKED IN TOUCHER";
  if (n>=7)   return "ROOTED GRASS TOUCHER";
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

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function StreakHeatmap({ submissions, streak }) {
  const days = 63; // 9 weeks
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
            {week.map((cell, di) => (
              <div key={cell.key} style={{
                width:10, height:10, borderRadius:2,
                background: cell.active
                  ? `rgba(147,168,90,${cell.isToday ? 1 : 0.75})`
                  : `rgba(255,255,255,0.05)`,
                border: cell.isToday ? `1px solid ${T.olive}` : "none",
                transition:"background 0.2s",
              }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:10 }}>
        <span style={{ fontSize:9, color:T.dim, letterSpacing:"0.12em", textTransform:"uppercase" }}>
          Consistency Rate
        </span>
        <span style={{ fontSize:12, fontWeight:700, color:T.olive }}>{consistency}%</span>
      </div>
    </div>
  );
}

// ─── Badge hexagon ────────────────────────────────────────────────────────────
function BadgeHex({ badge, size = 80, showRarity = true, totalUsers = 100 }) {
  const rarity = getRarityLabel(badge.rarity);
  const holders = Math.max(1, Math.round((badge.rarity / 100) * totalUsers));
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{
        width: size, height: size * 1.1,
        clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
        background:`linear-gradient(145deg,${T.bg3},${T.bg4})`,
        border:"none", position:"relative",
        display:"flex", alignItems:"center", justifyContent:"center",
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
            <div style={{ fontSize:9, color:rarity.color, fontWeight:600, letterSpacing:"0.06em" }}>
              {rarity.label}
            </div>
            <div style={{ fontSize:9, color:T.dim }}>{badge.rarity}% of users</div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────
function StatCell({ icon, value, label, sub, accent, last }) {
  return (
    <div style={{ flex:"1 1 0", minWidth:0, display:"flex", flexDirection:"column",
      alignItems:"center", gap:5, padding:"18px 10px",
      borderRight: last ? "none" : `1px solid ${T.border}` }}>
      <span style={{ fontSize:22 }}>{icon}</span>
      <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
        fontSize:"clamp(18px,3vw,28px)", fontWeight:700, color: accent ? T.gold : T.white,
        lineHeight:1, letterSpacing:"-0.02em" }}>{value}</span>
      {sub && <span style={{ fontSize:9, color:accent?T.goldDim:T.olive,
        letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600 }}>{sub}</span>}
      <span style={{ fontSize:8.5, color:T.dim, letterSpacing:"0.13em",
        textTransform:"uppercase", textAlign:"center", lineHeight:1.3 }}>{label}</span>
    </div>
  );
}

// ─── Quote pool ──────────────────────────────────────────────────────────────
const QUOTE_POOL = {
  seed:     ["Every legend starts with day one.","The streak starts now.","Outside is where it begins.","Step one. Then step two.","The hardest part is starting."],
  growing:  ["Building something real.","Momentum is everything.","Show up. Every day.","Small steps. Big life.","The habit is forming."],
  rooted:   ["Seven days of proof.","The streak is real now.","Outside every day. No excuses.","Consistency is the flex.","One week down. Keep going."],
  locked:   ["Two weeks outside. That's rare.","Most people won't do this.","The proof speaks for itself.","Discipline over motivation.","Locked in. Stay locked in."],
  elite:    ["Thirty days. Not everyone makes it.","Elite is a standard, not a title.","Outside is my default setting.","The grind is outdoors.","30 days of proof. For real."],
  legendary:["Consistency compounds.","Fifty days outside. That's legendary.","Not everyone becomes legendary.","The streak doesn't lie.","Built different. Outside daily."],
  immortal: ["100 days. Most won't even try.","The streak is the identity.","Immortal status. Earned outside.","Three figures. Outdoor certified.","Day 100. The streak lives on."],
  mythic:   ["Half a year outside. Daily.","Mythic isn't given. It's earned.","180 days of proof.","The outside is home.","Consistency at a mythic level."],
  eternal:  ["365 days. A full year outside.","Eternal. Because I earned it.","One year of proof. Every day.","The streak is eternal now.","A year outside. No days off."],
};

function getQuote(streak, bio) {
  if (bio && bio.trim().length > 0 && bio.trim().length <= 60) return `"${bio.trim()}"`;
  const pool = streak>=365?QUOTE_POOL.eternal:streak>=180?QUOTE_POOL.mythic:streak>=100?QUOTE_POOL.immortal:streak>=50?QUOTE_POOL.legendary:streak>=30?QUOTE_POOL.elite:streak>=14?QUOTE_POOL.locked:streak>=7?QUOTE_POOL.rooted:streak>=3?QUOTE_POOL.growing:QUOTE_POOL.seed;
  return `"${pool[streak % pool.length]}"`;
}

// ─── Share image generator ───────────────────────────────────────────────────
async function generateShareImage({ username, streak, tier, tierTitle, grassScore, rank, subCount, badges, best, shields, bio }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   "#080a06");
  bg.addColorStop(0.5, "#0e110a");
  bg.addColorStop(1,   "#080a06");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ambient glow
  const glow = ctx.createRadialGradient(W*0.75, H*0.2, 0, W*0.75, H*0.2, 480);
  glow.addColorStop(0, tier.glow + "30");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
  ctx.strokeStyle = "rgba(147,168,90,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Card border
  ctx.strokeStyle = "rgba(147,168,90,0.25)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 40, 40, W-80, H-80, 24);
  ctx.stroke();

  // Inner card fill
  ctx.fillStyle = "rgba(14,17,10,0.85)";
  roundRect(ctx, 40, 40, W-80, H-80, 24);
  ctx.fill();

  // Top section divider
  ctx.fillStyle = "rgba(147,168,90,0.08)";
  ctx.fillRect(40, 40, W-80, 320);

  // Left column layout — evenly spaced top to bottom
  // Row 1 (y=72): Logo + "Touch Grass" brand
  // Row 2 (y=140): VERIFIED OUTDOORS badge
  // Row 3 (y=220): @username
  // Row 4 (y=300): Tier title pill

  // Logo + brand name
  try {
    const logo = await loadImage("/touchgrass-transparent.png");
    ctx.globalAlpha = 0.6;
    ctx.drawImage(logo, 72, 72, 44, 44);
    ctx.globalAlpha = 1;
  } catch(e) {}
  ctx.font = "600 26px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.4)";
  ctx.fillText("Touch Grass", 126, 101);

  // VERIFIED OUTDOORS badge — 20px gap below logo
  const vbadgeW = 210, vbadgeH = 30, vbadgeX = 72, vbadgeY = 132;
  ctx.strokeStyle = "rgba(147,168,90,0.45)";
  ctx.lineWidth = 1;
  roundRect(ctx, vbadgeX, vbadgeY, vbadgeW, vbadgeH, 15);
  ctx.stroke();
  ctx.fillStyle = "rgba(147,168,90,0.12)";
  roundRect(ctx, vbadgeX, vbadgeY, vbadgeW, vbadgeH, 15);
  ctx.fill();
  ctx.fillStyle = "#93a85a";
  ctx.textAlign = "center";
  ctx.font = "700 13px 'DM Sans', sans-serif";
  ctx.fillText("◎  VERIFIED OUTDOORS", vbadgeX + vbadgeW/2, vbadgeY + 20);
  ctx.textAlign = "left";

  // @username — pushed down from badge, more breathing room
  const uFontSize = username.length > 14 ? 66 : username.length > 11 ? 76 : username.length > 8 ? 86 : 96;
  ctx.font = `700 ${uFontSize}px 'Georgia', serif`;
  ctx.fillStyle = "#f5f4ef";
  ctx.shadowColor = "rgba(147,168,90,0.3)";
  ctx.shadowBlur = 14;
  ctx.fillText(`@${username}`, 72, 252);
  ctx.shadowBlur = 0;

  // Tier title pill — pinned to bottom of hero section (hero divider ~y=370)
  const pillW = 320, pillH = 40, pillX = 72, pillY = 318;
  ctx.strokeStyle = tier.color + "55";
  ctx.lineWidth = 1;
  roundRect(ctx, pillX, pillY, pillW, pillH, 20);
  ctx.stroke();
  ctx.fillStyle = tier.color + "15";
  roundRect(ctx, pillX, pillY, pillW, pillH, 20);
  ctx.fill();
  ctx.font = "700 16px 'DM Sans', sans-serif";
  ctx.fillStyle = tier.color;
  ctx.textAlign = "center";
  ctx.fillText(`✦  ${tierTitle}`, pillX + pillW/2, pillY + 26);
  ctx.textAlign = "left";

  // Right side — CURRENT STREAK label + DAY XX only, no tier pill
  ctx.textAlign = "right";

  // "CURRENT STREAK" label at top
  ctx.font = "600 16px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.45)";
  ctx.fillText("CURRENT STREAK", W - 80, 88);

  // Large streak number
  const numSize = streak >= 100 ? 148 : 178;
  ctx.font = `700 ${numSize}px 'Georgia', serif`;
  const numW = ctx.measureText(`${streak}`).width;

  ctx.fillStyle = "#f5f4ef";
  ctx.shadowColor = tier.glow;
  ctx.shadowBlur = 55;
  ctx.fillText(`${streak}`, W - 80, 288);
  ctx.shadowBlur = 0;

  // DAY label to left of number
  ctx.font = "600 32px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.5)";
  ctx.fillText("DAY", W - 80 - numW - 10, 288);

  ctx.textAlign = "left";

  // Divider
  ctx.strokeStyle = "rgba(147,168,90,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(72, 370); ctx.lineTo(W-72, 370); ctx.stroke();

  // Stats row
  const stats = [
    { icon:"⚡", value: grassScore >= 1000 ? (grassScore/1000).toFixed(1)+"K" : String(grassScore), label:"GRASS SCORE" },
    { icon:"🔥", value: `${best}d`, label:"BEST STREAK" },
    { icon:"🛡", value: String(shields), label:"SHIELDS" },
    { icon:"👑", value: rank ? `#${rank}` : "—", label:"GLOBAL RANK" },
  ];
  const statW = (W - 144) / 4;
  stats.forEach((s, i) => {
    const x = 72 + i * statW;
    const cx = x + statW / 2;
    if (i > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 390); ctx.lineTo(x, 510); ctx.stroke();
    }
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(s.icon, cx, 425);
    ctx.font = `700 ${s.value.length > 4 ? 32 : 40}px 'Georgia', serif`;
    ctx.fillStyle = i === 3 ? "#c8a84b" : "#f0efea";
    ctx.fillText(s.value, cx, 480);
    ctx.font = "600 14px 'DM Sans', sans-serif";
    ctx.fillStyle = "rgba(240,239,234,0.55)";
    ctx.fillText(s.label, cx, 510);
  });
  ctx.textAlign = "left";

  // Divider
  ctx.strokeStyle = "rgba(147,168,90,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(72, 540); ctx.lineTo(W-72, 540); ctx.stroke();

  // Badges section
  ctx.font = "700 18px 'DM Sans', sans-serif";
  ctx.fillStyle = "#93a85a";
  ctx.fillText("✦  BADGES EARNED", 72, 585);
  ctx.font = "600 18px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.55)";
  ctx.textAlign = "right";
  ctx.fillText(`${badges.length} / ${ALL_BADGES.length} collected`, W-72, 585);
  ctx.textAlign = "left";

  // Badge hexagons
  const earnedTop = badges.slice(0, 6);
  const hexSize = 90;
  const hexGap  = (W - 144 - hexSize * 6) / 5;
  earnedTop.forEach((badge, i) => {
    const x = 72 + i * (hexSize + hexGap) + hexSize/2;
    const y = 640;
    // Hex shape
    ctx.save();
    ctx.translate(x, y);
    hexPath(ctx, hexSize/2);
    const rarity = getRarityLabel(badge.rarity);
    ctx.fillStyle = "rgba(20,23,16,0.9)";
    ctx.fill();
    ctx.strokeStyle = rarity.color + "50";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    // Emoji
    ctx.font = "36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(badge.emoji, x, y + 12);
    // Name
    ctx.font = "700 13px 'DM Sans', sans-serif";
    ctx.fillStyle = "#f0efea";
    ctx.fillText(badge.name.length > 10 ? badge.name.slice(0,9)+"…" : badge.name, x, y + 64);
  });
  ctx.textAlign = "left";

  // Divider after badges
  ctx.strokeStyle = "rgba(147,168,90,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(72, 730); ctx.lineTo(W-72, 730); ctx.stroke();

  // Streak progress bar section
  const thresholds = [7,14,30,50,100,180,365];
  const nextT = thresholds.find(t => t > streak) || 365;
  const prevT = [...[0,...thresholds]].reverse().find(t => streak >= t) || 0;
  const fillPct = Math.min(1, (streak - prevT) / (nextT - prevT));
  const tierLabel2 = nextT >= 365 ? "ETERNAL" : nextT >= 180 ? "MYTHIC" : nextT >= 100 ? "IMMORTAL" : nextT >= 50 ? "LEGENDARY" : nextT >= 30 ? "ELITE" : nextT >= 14 ? "LOCKED IN" : "ROOTED";

  ctx.font = "600 16px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.45)";
  ctx.fillText(`NEXT MILESTONE — ${tierLabel2} (DAY ${nextT})`, 72, 762);
  ctx.font = "600 16px 'DM Sans', sans-serif";
  ctx.fillStyle = tier.color;
  ctx.textAlign = "right";
  ctx.fillText(`${streak} / ${nextT}`, W - 72, 762);
  ctx.textAlign = "left";
  // Track
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  roundRect(ctx, 72, 775, W-144, 10, 5);
  ctx.fill();
  // Fill
  const grad2 = ctx.createLinearGradient(72, 0, 72 + (W-144)*fillPct, 0);
  grad2.addColorStop(0, "#93a85a");
  grad2.addColorStop(1, "#c8a84b");
  ctx.fillStyle = grad2;
  roundRect(ctx, 72, 775, (W-144)*fillPct, 10, 5);
  ctx.fill();

  // Divider before quote
  ctx.strokeStyle = "rgba(147,168,90,0.10)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(72, 808); ctx.lineTo(W-72, 808); ctx.stroke();

  // Quote — lower, in the space between progress bar and footer
  ctx.font = "italic 38px 'Georgia', serif";
  ctx.fillStyle = "rgba(240,239,234,0.82)";
  ctx.textAlign = "center";
  const quote = getQuote(streak, bio ?? "");
  const qSize = quote.length > 50 ? 30 : quote.length > 38 ? 34 : 38;
  ctx.font = `italic ${qSize}px 'Georgia', serif`;
  ctx.textAlign = "center";
  ctx.fillText(quote, W / 2, 910);
  ctx.textAlign = "left";
  ctx.textAlign = "left";

  // Footer divider
  ctx.strokeStyle = "rgba(147,168,90,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(72, H-90); ctx.lineTo(W-72, H-90); ctx.stroke();
  // Hashtags
  ctx.font = "700 22px 'DM Sans', sans-serif";
  ctx.fillStyle = "#93a85a";
  ctx.fillText("$TOUCHGRASS  #TouchGrass  #ProofOfGrass", 72, H - 56);
  // URL
  ctx.textAlign = "right";
  ctx.font = "500 20px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.5)";
  ctx.fillText("proofofgrass.app", W - 72, H - 56);
  ctx.textAlign = "left";
  // Solana branding
  ctx.font = "500 15px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.28)";
  ctx.fillText("BUILT ON ◎ SOLANA  ·  PROOF OF GRASS", 72, H - 28);

  return canvas.toDataURL("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

function hexPath(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = r * Math.cos(angle), py = r * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────
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
  const cardRef = useRef(null);

  // Viewer identity — from localStorage (set by OAuth or manual entry)
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
        supabase.from("Profiles").select("bio,location,avatar_emoji,joined_at,wallet_verified").eq("username",username).maybeSingle(),
        supabase.from("Submissions").select("id",{count:"exact",head:true}).eq("username",username).in("status",["pending","approved"]),
        supabase.from("Submissions").select("created_at").eq("username",username).in("status",["pending","approved"]).order("created_at",{ascending:false}).limit(63),
      ]);

      const [{ data:allStreaks }, { data:chals }] = await Promise.all([
        supabase.from("Streaks").select("username,current_streak").order("current_streak",{ascending:false}),
        supabase.from("Challenges").select("id,status,challenger").or(`challenger.eq.${username},challenged.eq.${username}`),
      ]);

      setStreakRow(sr);
      setProfileRow(pr);
      setSubCount(subs ?? 0);
      setSubmissions(recentSubs ?? []);

      const allRows = allStreaks ?? [];
      const idx = allRows.findIndex(r => norm(r.username) === username);
      setRank(idx >= 0 ? idx + 1 : null);
      setTotalUsers(allRows.length || 1);

      const chalList = chals ?? [];
      setChalDone(chalList.filter(c=>c.status==="completed").length);
      setChalSent(chalList.filter(c=>norm(c.challenger)===username).length);

      setLoading(false);
    })();
  }, [username]);

  const streak     = streakRow?.current_streak ?? 0;
  const best       = streakRow?.best_streak ?? 0;
  const shields    = streakRow?.shield_count ?? 0;
  const grassScore = Math.floor(streak * 38 + subCount * 12 + best * 22);
  const tier       = getTier(streak);
  const tierTitle  = getTierTitle(streak);
  const pct        = totalUsers > 0 ? ((rank / totalUsers) * 100).toFixed(1) : "—";

  const earnedBadges = ALL_BADGES.filter(b => b.condition(streak, subCount, chalDone, chalSent, grassScore, shields));
  const topBadges    = earnedBadges.slice(0, 6);
  const joinDate     = profileRow?.joined_at
    ? new Date(profileRow.joined_at).toLocaleDateString("en-US",{month:"long",year:"numeric"})
    : null;

  // Milestones
  const milestones = [
    { label:"7 Day Streak",    target:7,   icon:"🌱", done: streak>=7,   date: streak>=7   ? "Unlocked" : `${streak}/7`   },
    { label:"30 Day Streak",   target:30,  icon:"🌿", done: streak>=30,  date: streak>=30  ? "Unlocked" : `${streak}/30`  },
    { label:"50 Day Streak",   target:50,  icon:"🌳", done: streak>=50,  date: streak>=50  ? "Unlocked" : `${streak}/50`  },
    { label:"100 Day Goal",    target:100, icon:"💯", done: streak>=100, date: streak>=100 ? "Unlocked" : `${streak}/100` },
  ];

  const isOwner = !!(viewer && viewer === username);

  const shareUrl = typeof window !== "undefined" ? window.location.href : `https://proofofgrass.app/u/${username}/flex`;
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false), 1800);
  };

  const [generatingImg, setGeneratingImg] = useState(false);

  const shareToX = useCallback(async () => {
    const text = `Day ${streak} — ${tier.label} 🌿\n\nBuilding my outdoor legacy on @XTouchGrass\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nproofofgrass.app/flex/${username}`;
    const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? "");

    setGeneratingImg(true);
    try {
      const dataUrl = await generateShareImage({
        username, streak, tier, tierTitle, grassScore,
        rank, subCount, badges: earnedBadges, best, shields,
        bio: profileRow?.bio ?? "",
      });

      if (isMob && navigator.share && navigator.canShare) {
        // Mobile — convert to JPEG to reduce size for native share
        try {
          const res  = await fetch(dataUrl);
          const blob = await res.blob();
          // Re-compress via canvas to JPEG at 0.88 quality — much smaller file
          const img = await new Promise((res, rej) => {
            const i = new Image();
            i.onload = () => res(i);
            i.onerror = rej;
            i.src = dataUrl;
          });
          const cv2 = document.createElement("canvas");
          cv2.width = img.width; cv2.height = img.height;
          cv2.getContext("2d").drawImage(img, 0, 0);
          const jpegUrl  = cv2.toDataURL("image/jpeg", 0.88);
          const res2     = await fetch(jpegUrl);
          const jpegBlob = await res2.blob();
          const file = new File([jpegBlob], "proof-of-grass-flex.jpg", { type:"image/jpeg" });
          if (navigator.canShare({ files:[file] })) {
            await navigator.share({ files:[file], text });
            setGeneratingImg(false);
            return;
          }
        } catch(shareErr) {
          console.warn("native share failed, falling back", shareErr);
        }
      }

      // Desktop — download image + open X intent
      const link = document.createElement("a");
      link.download = `proof-of-grass-${username}-day${streak}.png`;
      link.href = dataUrl;
      link.click();
      setTimeout(() => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
      }, 600);
    } catch(e) {
      console.error("share image error", e);
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    }
    setGeneratingImg(false);
  }, [username, streak, tier, tierTitle, grassScore, rank, subCount, earnedBadges, best]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
    @keyframes glowPulse{0%,100%{opacity:0.6;}50%{opacity:1;}}
    @keyframes shimmer{0%,100%{opacity:0.4;}50%{opacity:0.8;}}
    .fade{animation:fadeUp 0.7s ease both;}
    .fade2{animation:fadeUp 0.7s 0.1s ease both;}
    .fade3{animation:fadeUp 0.7s 0.2s ease both;}
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
            {isOwner && (
              <button onClick={shareToX} disabled={generatingImg} className="btn-share"
                style={{ fontSize:11, padding:"7px 14px", opacity:generatingImg?0.7:1 }}>
                {generatingImg ? "Generating…" : <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Share
                </>}
              </button>
            )}
          </div>
        </nav>

        <div style={{ maxWidth:720, margin:"0 auto", padding:"32px clamp(14px,4vw,32px) 60px" }}>

          {/* ── THE FLEX CARD ─────────────────────────────────────────────── */}
          <div ref={cardRef} style={{
            background:`linear-gradient(160deg,${T.bg2} 0%,${T.bg3} 50%,${T.bg2} 100%)`,
            border:`1px solid ${T.borderG}`,
            borderRadius:20,
            overflow:"hidden",
            boxShadow:`0 0 60px ${tier.glow}20, 0 32px 80px rgba(0,0,0,0.6)`,
            position:"relative",
          }}>

            {/* Ambient glow */}
            <div style={{ position:"absolute", top:-80, right:-80, width:320, height:320,
              borderRadius:"50%", background:`${tier.glow}`, opacity:0.06,
              filter:"blur(80px)", pointerEvents:"none" }} />

            {/* ── HERO ─────────────────────────────────────────────────── */}
            <div className="fade" style={{ padding:"28px 28px 22px",
              background:`linear-gradient(135deg,${T.bg3},${T.bg2})`,
              borderBottom:`1px solid ${T.border}`, position:"relative",
              display:"flex", alignItems:"flex-start", justifyContent:"space-between",
              gap:16, flexWrap:"wrap" }}>

              {/* Left — identity */}
              <div style={{ display:"flex", gap:16, alignItems:"flex-start", minWidth:0 }}>
                {/* Avatar */}
                <div style={{ width:72, height:72, borderRadius:"50%", flexShrink:0,
                  background:`linear-gradient(135deg,${T.bg4},${T.olive}22)`,
                  border:`2px solid ${tier.color}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:28, boxShadow:`0 0 24px ${tier.glow}40`,
                  fontFamily:"'Cormorant Garamond',Georgia,serif", fontWeight:700, color:T.white }}>
                  {profileRow?.avatar_emoji || username[0]?.toUpperCase() || "🌿"}
                </div>
                <div style={{ minWidth:0 }}>
                  {/* Verified badge */}
                  <div style={{ display:"inline-flex", alignItems:"center", gap:5,
                    fontSize:8, color:T.olive, letterSpacing:"0.14em", textTransform:"uppercase",
                    fontWeight:700, border:`1px solid ${T.olive}`, borderRadius:20,
                    padding:"2px 8px", marginBottom:7 }}>
                    ◎ VERIFIED OUTDOORS
                  </div>
                  <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:"clamp(26px,5vw,44px)", fontWeight:700, color:T.white,
                    lineHeight:0.95, letterSpacing:"-0.02em", marginBottom:5 }}>
                    {username || "—"}
                  </h1>
                  <div style={{ fontSize:12, color:T.dim, marginBottom:10 }}>@{username}</div>
                  {/* Title pill */}
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                    background:`${tier.color}15`, border:`1px solid ${tier.color}50`,
                    borderRadius:20, padding:"4px 12px" }}>
                    <span style={{ color:tier.color, fontSize:9, fontWeight:700,
                      letterSpacing:"0.16em", textTransform:"uppercase" }}>
                      ✦ {tierTitle}
                    </span>
                  </div>
                  {joinDate && (
                    <div style={{ fontSize:10, color:T.dim, marginTop:8 }}>📅 JOINED {joinDate.toUpperCase()}</div>
                  )}
                </div>
              </div>

              {/* Right — streak hero */}
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:9, letterSpacing:"0.2em", color:T.dim,
                  textTransform:"uppercase", marginBottom:6 }}>Current Streak</div>
                {loading
                  ? <div className="skel" style={{ width:120, height:72, marginBottom:8 }} />
                  : <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:"clamp(52px,8vw,88px)", fontWeight:700, color:T.white,
                    lineHeight:0.88, letterSpacing:"-0.04em",
                    textShadow:`0 0 40px ${tier.glow}60` }}>
                    <span style={{ fontSize:"0.35em", color:T.dim, verticalAlign:"top",
                      lineHeight:3.1, letterSpacing:"0.04em" }}>DAY </span>
                    {streak}
                  </div>
                }
                <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                  background:`${tier.color}12`, border:`1px solid ${tier.color}40`,
                  borderRadius:20, padding:"4px 12px", marginTop:6 }}>
                  <span style={{ fontSize:9, letterSpacing:"0.16em", color:tier.color,
                    textTransform:"uppercase", fontWeight:700 }}>✦ {tier.label}</span>
                </div>
              </div>
            </div>

            {/* ── STATS GRID ────────────────────────────────────────────── */}
            <div className="stats-grid fade2" style={{
              display:"grid", gridTemplateColumns:"repeat(4,1fr)",
              borderBottom:`1px solid ${T.border}` }}>
              <StatCell icon="⚡" value={loading?"…":grassScore.toLocaleString()}   label="Grass Score"          />
              <StatCell icon="🔥" value={loading?"…":`${best}d`}                    label="Longest Streak"       />
              <StatCell icon="🛡" value={loading?"…":shields}                       label="Shields Owned"        />
              <StatCell icon="👑" value={loading?"…":(rank?`#${rank}`:"—")}         label={`Global Rank\nTop ${pct}%`} last accent />
            </div>

            {/* ── BADGES ────────────────────────────────────────────────── */}
            <div className="fade2" style={{ padding:"22px 24px", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:18 }}>
                <div className="ct" style={{ margin:0 }}>Top Badges</div>
                <span style={{ fontSize:10, color:T.gold, fontWeight:600 }}>
                  {earnedBadges.length} / {ALL_BADGES.length} Collected
                </span>
              </div>
              {topBadges.length > 0 ? (
                <div className="badge-row" style={{ display:"grid",
                  gridTemplateColumns:"repeat(6,1fr)", gap:12 }}>
                  {topBadges.map(b => (
                    <BadgeHex key={b.id} badge={b} size={52} totalUsers={totalUsers} />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize:12, color:T.dim, padding:"12px 0" }}>
                  No badges earned yet — keep going.
                </div>
              )}
            </div>

            {/* ── MILESTONES + HEATMAP ──────────────────────────────────── */}
            <div className="bottom-row fade3" style={{ display:"grid",
              gridTemplateColumns:"1fr 1fr", borderBottom:`1px solid ${T.border}` }}>

              {/* Milestones */}
              <div style={{ padding:"22px 24px", borderRight:`1px solid ${T.border}` }}>
                <div className="ct">Milestones</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {milestones.map(m => (
                    <div key={m.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
                        background: m.done ? `${T.olive}18` : T.bg3,
                        border:`1.5px solid ${m.done ? T.olive : T.border}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:13 }}>{m.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, fontWeight:600,
                          color: m.done ? T.white : T.dim }}>{m.label}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        {m.done
                          ? <span style={{ fontSize:10, color:T.olive }}>✓</span>
                          : <span style={{ fontSize:10, color:T.dim }}>{m.date}</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap */}
              <div style={{ padding:"22px 24px" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:14 }}>
                  <div className="ct" style={{ margin:0 }}>Streak Heatmap</div>
                  <span style={{ fontSize:9, color:T.olive, fontWeight:700,
                    letterSpacing:"0.1em" }}>{streak} DAYS STRONG</span>
                </div>
                {loading
                  ? <div className="skel" style={{ height:80 }} />
                  : <StreakHeatmap submissions={submissions} streak={streak} />
                }
              </div>
            </div>

            {/* ── MOTTO + LOCATION ──────────────────────────────────────── */}
            <div className="fade3" style={{ padding:"18px 24px",
              borderBottom:`1px solid ${T.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              gap:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ fontSize:8, letterSpacing:"0.18em", color:T.dim,
                  textTransform:"uppercase", marginBottom:5 }}>I Touch Grass to...</div>
                <div style={{ fontSize:13, color:T.muted, fontStyle:"italic",
                  lineHeight:1.6, fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:15 }}>
                  {getQuote(streak, profileRow?.bio ?? "")}
                </div>
              </div>
              {profileRow?.location && (
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:8, letterSpacing:"0.18em", color:T.dim,
                    textTransform:"uppercase", marginBottom:5 }}>Favorite Spot</div>
                  <div style={{ fontSize:11, color:T.muted }}>
                    📍 {profileRow.location}
                  </div>
                </div>
              )}
            </div>

            {/* ── COMMUNITY + CHALLENGES ────────────────────────────────── */}
            <div className="fade3" style={{ display:"flex",
              borderBottom:`1px solid ${T.border}` }}>
              {[
                { icon:"🏆", value:chalDone,          label:"Challenges Won" },
                { icon:"⚡", value:chalSent,           label:"Challenges Sent" },
                { icon:"🌿", value:subCount,           label:"Proofs Logged" },
                { icon:"🔥", value:`${grassScore >= 1000 ? (grassScore/1000).toFixed(1)+"K" : grassScore}`, label:"Grass Score" },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ flex:1, display:"flex", flexDirection:"column",
                  alignItems:"center", gap:5, padding:"16px 8px",
                  borderRight: i < arr.length-1 ? `1px solid ${T.border}` : "none" }}>
                  <span style={{ fontSize:20 }}>{s.icon}</span>
                  <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:22, fontWeight:700, color:T.white, lineHeight:1 }}>{s.value}</span>
                  <span style={{ fontSize:8.5, color:T.dim, letterSpacing:"0.1em",
                    textTransform:"uppercase", textAlign:"center" }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* ── FOOTER ────────────────────────────────────────────────── */}
            <div className="fade3" style={{ padding:"16px 24px",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <img src="/touchgrass-transparent.png" alt="" style={{ width:16, height:16, opacity:0.5 }} />
                <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:12, color:T.dim, fontStyle:"italic" }}>
                  {getQuote(streak, profileRow?.bio ?? "")}
                </span>
              </div>
              <div style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em" }}>
                #TouchGrass #ProofOfGrass · proofofgrass.app
              </div>
            </div>
          </div>

          {/* ── SHARE ACTIONS ─────────────────────────────────────────────── */}
          <div className="fade3" style={{ display:"flex", gap:10, marginTop:20,
            justifyContent:"center", flexWrap:"wrap" }}>
            {isOwner ? (
              <button onClick={shareToX} disabled={generatingImg} className="btn-share"
                style={{opacity:generatingImg?0.7:1}}>
                {generatingImg ? "Generating image…" : <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Share on X
                </>}
              </button>
            ) : (
              <div style={{ fontSize:12, color:"rgba(240,239,234,0.35)", padding:"11px 20px",
                border:"1px solid rgba(255,255,255,0.06)", borderRadius:9 }}>
                Sign in to share your flex card
              </div>
            )}
            <button onClick={copyLink} className="btn-ghost">
              {copied ? "✓ Copied" : "↗ Copy Link"}
            </button>
            <Link href={`/u/${username}`} className="btn-ghost" style={{ textDecoration:"none" }}>
              ← Full Profile
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}