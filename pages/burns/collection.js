import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";
import {
  getRandomBurnQuote,
  RARITY_TIERS, getRarityTier, getRarityTierByKey, getUnlockedTiers, formatCardNumber,
} from "../../utils/burnThemes";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.4)",
  olive:"#93a85a", gold:"#c8a84b", fire:"#f97316",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const EVENT_START = new Date("2026-06-21T00:00:00Z");
const EVENT_END   = new Date("2026-07-02T00:00:00Z");

function getUsername() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("pog_username");
    return saved ? saved.replace(/@/g,"").toLowerCase().trim() : null;
  } catch { return null; }
}

function fmtBurned(n) {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => {
      fetch(src).then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const img2 = new Image();
        img2.onload = () => { URL.revokeObjectURL(url); res(img2); };
        img2.onerror = rej;
        img2.src = url;
      }).catch(rej);
    };
    img.src = src;
  });
}

// ─── Theme-aware background renderer ─────────────────────────────────────────
function drawThemeBackground(ctx, W, H, theme) {
  const isVolcano  = theme.key === "volcano";
  const isLegendary = !!theme.isLegendary;
  const isTreasury = theme.key === "treasury";
  const isForest   = theme.key === "forest";
  const isCampfire = theme.key === "campfire";

  if (isVolcano || isLegendary) {
    // Deep dark volcanic sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    skyGrad.addColorStop(0, "#0a0000");
    skyGrad.addColorStop(0.3, "#1a0400");
    skyGrad.addColorStop(0.6, "#2d0800");
    skyGrad.addColorStop(1, "#4a1000");
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);

    const groundGrad = ctx.createLinearGradient(0, H*0.55, 0, H);
    groundGrad.addColorStop(0, "#3d0c00");
    groundGrad.addColorStop(0.4, "#1a0500");
    groundGrad.addColorStop(1, "#0a0200");
    ctx.fillStyle = groundGrad; ctx.fillRect(0, H*0.55, W, H*0.45);

    // Main volcano peak
    ctx.beginPath();
    ctx.moveTo(W*0.5, H*0.05); ctx.lineTo(W*0.82, H*0.72); ctx.lineTo(W*0.18, H*0.72);
    ctx.closePath();
    const volcGrad = ctx.createLinearGradient(W*0.5, H*0.05, W*0.5, H*0.72);
    volcGrad.addColorStop(0, "#1a0400"); volcGrad.addColorStop(0.5, "#2d0800"); volcGrad.addColorStop(1, "#1a0500");
    ctx.fillStyle = volcGrad; ctx.fill();

    // Side mountains
    ctx.beginPath(); ctx.moveTo(W*0.1,H*0.25); ctx.lineTo(W*0.32,H*0.72); ctx.lineTo(-W*0.05,H*0.72); ctx.closePath();
    ctx.fillStyle = "#0f0200"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(W*0.9,H*0.28); ctx.lineTo(W*1.05,H*0.72); ctx.lineTo(W*0.68,H*0.72); ctx.closePath();
    ctx.fillStyle = "#0f0200"; ctx.fill();

    // Eruption glow
    const eruGlow = ctx.createRadialGradient(W*0.5, H*0.06, 0, W*0.5, H*0.06, 180);
    eruGlow.addColorStop(0, "rgba(255,200,50,0.95)"); eruGlow.addColorStop(0.15, "rgba(255,120,20,0.8)");
    eruGlow.addColorStop(0.4, "rgba(200,50,0,0.5)"); eruGlow.addColorStop(1, "transparent");
    ctx.fillStyle = eruGlow; ctx.fillRect(0, 0, W, H*0.4);

    // Lava rivers
    [[W*0.42,H*0.18,W*0.38,H*0.35,W*0.3,H*0.5,W*0.22,H*0.7],
     [W*0.58,H*0.18,W*0.62,H*0.35,W*0.7,H*0.5,W*0.78,H*0.7]].forEach(([x1,y1,cx1,cy1,cx2,cy2,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.bezierCurveTo(cx1,cy1,cx2,cy2,x2,y2);
      const lg = ctx.createLinearGradient(x1,y1,x2,y2);
      lg.addColorStop(0,"rgba(255,160,0,0.9)"); lg.addColorStop(0.5,"rgba(220,80,0,0.7)"); lg.addColorStop(1,"rgba(180,40,0,0.4)");
      ctx.strokeStyle = lg; ctx.lineWidth = 8; ctx.stroke();
    });

    // Magma cracks
    [[W*0.1,H*0.78,W*0.28,H*0.82,W*0.15,H*0.88],[W*0.72,H*0.75,W*0.88,H*0.8,W*0.95,H*0.92],[W*0.35,H*0.85,W*0.48,H*0.9]].forEach(pts => {
      ctx.beginPath(); ctx.moveTo(pts[0],pts[1]);
      for (let i=2;i<pts.length;i+=2) ctx.lineTo(pts[i],pts[i+1]);
      const cg = ctx.createLinearGradient(pts[0],pts[1],pts[pts.length-2],pts[pts.length-1]);
      cg.addColorStop(0,"rgba(255,140,0,0.8)"); cg.addColorStop(1,"rgba(255,80,0,0.3)");
      ctx.strokeStyle = cg; ctx.lineWidth = 3; ctx.stroke();
    });

    // Ambient glow
    const atmGlow = ctx.createRadialGradient(W/2,H*0.4,100,W/2,H*0.4,W*0.8);
    atmGlow.addColorStop(0,"rgba(255,80,0,0.12)"); atmGlow.addColorStop(0.5,"rgba(200,50,0,0.08)"); atmGlow.addColorStop(1,"rgba(0,0,0,0.3)");
    ctx.fillStyle = atmGlow; ctx.fillRect(0,0,W,H);
  } else if (isForest) {
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#020e04"); bg.addColorStop(0.5,"#051a08"); bg.addColorStop(1,"#020c03");
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    const glow = ctx.createRadialGradient(W/2,H*0.3,0,W/2,H*0.3,500);
    glow.addColorStop(0,"rgba(74,222,128,0.2)"); glow.addColorStop(1,"transparent");
    ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);
  } else if (isTreasury) {
    const bg = ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,"#0e0d00"); bg.addColorStop(0.5,"#1a1800"); bg.addColorStop(1,"#0a0900");
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    const glow = ctx.createRadialGradient(W/2,H*0.35,0,W/2,H*0.35,480);
    glow.addColorStop(0,"rgba(200,168,75,0.2)"); glow.addColorStop(1,"transparent");
    ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);
  } else {
    // Campfire / default
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#0a0400"); bg.addColorStop(0.5,"#180800"); bg.addColorStop(1,"#080300");
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    const glow = ctx.createRadialGradient(W/2,H*0.5,0,W/2,H*0.5,400);
    glow.addColorStop(0,"rgba(251,146,60,0.22)"); glow.addColorStop(1,"transparent");
    ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);
  }

  // Legendary: heavy B&W + gold wash overlay
  if (isLegendary) {
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(0,0,W,H);
    const goldWash = ctx.createRadialGradient(W/2,H*0.4,0,W/2,H*0.4,700);
    goldWash.addColorStop(0,"rgba(255,215,0,0.18)"); goldWash.addColorStop(1,"transparent");
    ctx.fillStyle = goldWash; ctx.fillRect(0,0,W,H);
  }

  // Deterministic embers / particles
  const rng = n => Math.abs(Math.sin(n*127.1+311.7)*43758.5453)%1;
  const particleColor = theme.accent ?? "#f97316";
  for (let i=0;i<30;i++) {
    const ex = rng(i*1.3)*W, ey = rng(i*2.1)*H*0.75;
    const er = rng(i*3.7)*2.5+0.5, ea = rng(i*4.2)*0.6+0.2;
    const eg = ctx.createRadialGradient(ex,ey,0,ex,ey,er*3);
    eg.addColorStop(0,`${particleColor}${Math.round(ea*255).toString(16).padStart(2,"0")}`);
    eg.addColorStop(1,"transparent");
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex,ey,er*3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(255,220,80,${ea*0.7})`; ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.fill();
  }

  // Dark scrim for legibility
  const dark = ctx.createLinearGradient(0,0,0,H);
  dark.addColorStop(0,"rgba(0,0,0,0.5)"); dark.addColorStop(0.35,"rgba(0,0,0,0.28)");
  dark.addColorStop(0.65,"rgba(0,0,0,0.38)"); dark.addColorStop(1,"rgba(0,0,0,0.65)");
  ctx.fillStyle = dark; ctx.fillRect(0,0,W,H);
}

// ─── Card border ──────────────────────────────────────────────────────────────
function drawCardBorder(ctx, W, H, theme) {
  const isLegendary = !!theme.isLegendary;
  const m = 14;
  ctx.save();
  ctx.shadowColor = isLegendary ? "rgba(255,215,0,0.9)" : "rgba(200,150,30,0.8)";
  ctx.shadowBlur = 20;
  roundRect(ctx, m, m, W-m*2, H-m*2, 18);
  const bg = ctx.createLinearGradient(m,m,W-m,H-m);
  if (isLegendary) {
    bg.addColorStop(0,"#ffd700"); bg.addColorStop(0.25,"#fff0a0"); bg.addColorStop(0.5,"#b8860b"); bg.addColorStop(0.75,"#ffd700"); bg.addColorStop(1,"#b8860b");
  } else {
    bg.addColorStop(0,"#c8a030"); bg.addColorStop(0.25,"#f0c84a"); bg.addColorStop(0.5,"#a07820"); bg.addColorStop(0.75,"#f0c84a"); bg.addColorStop(1,"#c8a030");
  }
  ctx.strokeStyle = bg; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();

  // Inner
  const m2 = m+5;
  roundRect(ctx, m2, m2, W-m2*2, H-m2*2, 14);
  ctx.strokeStyle = isLegendary ? "rgba(255,215,0,0.3)" : "rgba(200,150,30,0.25)";
  ctx.lineWidth = 1; ctx.stroke();

  // Corner ornaments
  [[m+2,m+2],[W-m-2,m+2],[m+2,H-m-2],[W-m-2,H-m-2]].forEach(([cx,cy]) => {
    ctx.save();
    ctx.shadowColor = isLegendary ? "rgba(255,215,0,1)" : "rgba(240,180,40,0.9)";
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2);
    ctx.strokeStyle = isLegendary ? "#ffd700" : "#f0c84a"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = isLegendary ? "rgba(255,215,0,0.7)" : "rgba(240,180,40,0.6)";
    ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

// ─── Header ───────────────────────────────────────────────────────────────────
function drawHeader(ctx, W, theme) {
  ctx.textAlign = "center";
  ctx.font = "700 15px 'Georgia', serif";
  ctx.fillStyle = "#f0c84a";
  ctx.shadowColor = "rgba(240,150,0,0.8)"; ctx.shadowBlur = 8;
  ctx.fillText("DOUBLE BURN COLLECTION", W/2, 52);

  ctx.beginPath(); ctx.moveTo(W*0.12,60); ctx.lineTo(W*0.35,60);
  ctx.strokeStyle = "rgba(200,150,30,0.6)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W*0.65,60); ctx.lineTo(W*0.88,60); ctx.stroke();

  ctx.font = "600 13px 'Georgia', serif";
  ctx.fillStyle = theme.accent ?? "#f97316";
  ctx.shadowColor = `${theme.accent ?? "#f97316"}cc`; ctx.shadowBlur = 12;
  ctx.fillText(`— ${(theme.label ?? theme.title ?? "").toUpperCase()} —`, W/2, 78);
  ctx.shadowBlur = 0;
}

// ─── Main title ───────────────────────────────────────────────────────────────
function drawMainTitle(ctx, W, theme) {
  ctx.textAlign = "center";
  const accent = theme.accent ?? "#f97316";
  const isLegendary = !!theme.isLegendary;

  // DOUBLE
  ctx.save();
  ctx.font = "900 102px 'Georgia', serif";
  const dg = ctx.createLinearGradient(0,90,0,90+102);
  dg.addColorStop(0,"#fff8d0"); dg.addColorStop(0.15,"#f0c84a"); dg.addColorStop(0.4,"#c8900a");
  dg.addColorStop(0.6,"#f0c84a"); dg.addColorStop(0.85,"#a07820"); dg.addColorStop(1,"#f0c84a");
  ctx.fillStyle = dg;
  ctx.shadowColor = `${accent}aa`; ctx.shadowBlur = 28;
  ctx.fillText("DOUBLE", W/2, 182);

  // BURN
  ctx.font = "900 108px 'Georgia', serif";
  const bg = ctx.createLinearGradient(0,182,0,182+108);
  bg.addColorStop(0,"#ffe080"); bg.addColorStop(0.2,accent);
  bg.addColorStop(0.5,isLegendary?"#ffd700":accent); bg.addColorStop(0.8,"#dc2600"); bg.addColorStop(1,accent);
  ctx.fillStyle = bg;
  ctx.shadowColor = `${accent}ee`; ctx.shadowBlur = 40;
  ctx.fillText("BURN", W/2, 280);
  ctx.restore();

  // EVENT green banner
  const bx = W*0.05, bY = 296, bw = W*0.9, bh = 46;
  ctx.save();
  roundRect(ctx, bx, bY, bw, bh, 8);
  const banGrad = ctx.createLinearGradient(bx, bY, bx, bY+bh);
  banGrad.addColorStop(0,"#1a4a10"); banGrad.addColorStop(0.4,"#2d7a18"); banGrad.addColorStop(1,"#0e2a08");
  ctx.fillStyle = banGrad; ctx.fill();
  ctx.shadowColor = "rgba(45,122,24,0.8)"; ctx.shadowBlur = 16;
  ctx.strokeStyle = "#4a9a28"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  ctx.font = "18px serif"; ctx.fillStyle = "#7ed957";
  ctx.fillText("🍃", bx+18, bY+30); ctx.fillText("🍃", bx+bw-36, bY+30);

  ctx.textAlign = "center";
  ctx.font = "800 26px 'Georgia', serif"; ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(255,255,255,0.5)"; ctx.shadowBlur = 8;
  ctx.letterSpacing = "0.22em";
  ctx.fillText("EVENT", W/2, bY+32);
  ctx.shadowBlur = 0;
}

// ─── Participant badge (top right) ────────────────────────────────────────────
function drawParticipantBadge(ctx, W, cardNumber) {
  const bx = W-145, by = 22, bw = 122, bh = 64;
  ctx.save();
  roundRect(ctx, bx, by, bw, bh, 8);
  const bg = ctx.createLinearGradient(bx,by,bx,by+bh);
  bg.addColorStop(0,"rgba(20,12,0,0.92)"); bg.addColorStop(1,"rgba(10,6,0,0.92)");
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = "#c8a030"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  const cx = bx+bw/2;
  ctx.textAlign = "center";
  ctx.font = "600 9px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(200,160,48,0.85)"; ctx.letterSpacing = "0.12em";
  ctx.fillText("PARTICIPANT", cx, by+18); ctx.fillText("CARD", cx, by+30);

  ctx.font = "800 22px 'Georgia', serif"; ctx.fillStyle = "#f0c84a";
  ctx.shadowColor = "rgba(240,180,40,0.9)"; ctx.shadowBlur = 12;
  ctx.letterSpacing = "0";
  ctx.fillText(formatCardNumber(cardNumber), cx, by+54);
  ctx.shadowBlur = 0;
}

// ─── PFP section ─────────────────────────────────────────────────────────────
function drawPFPSection(ctx, W, avatarImg, theme) {
  const cx = W/2, cy = 450, r = 88;
  const accent = theme.accent ?? "#f97316";

  // Energy ring
  ctx.save();
  ctx.shadowColor = `${accent}dd`; ctx.shadowBlur = 35;
  ctx.beginPath(); ctx.arc(cx, cy, r+16, 0, Math.PI*2);
  ctx.strokeStyle = `${accent}80`; ctx.lineWidth = 6; ctx.stroke();
  ctx.restore();

  // Gold ring
  ctx.save();
  ctx.shadowColor = "rgba(240,180,40,1)"; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(cx, cy, r+7, 0, Math.PI*2);
  const rg = ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);
  rg.addColorStop(0,"#fff0a0"); rg.addColorStop(0.25,"#f0c84a");
  rg.addColorStop(0.5,"#c89020"); rg.addColorStop(0.75,"#f0c84a"); rg.addColorStop(1,"#fff0a0");
  ctx.strokeStyle = rg; ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();

  // Circle background
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
  const cbg = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
  cbg.addColorStop(0,"#3d0a00"); cbg.addColorStop(0.7,"#5a1000"); cbg.addColorStop(1,"#2d0800");
  ctx.fillStyle = cbg; ctx.fill();
  ctx.restore();

  if (avatarImg) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r-2, 0, Math.PI*2); ctx.clip();
    const scale = Math.max((r*2)/avatarImg.width, (r*2)/avatarImg.height) * 1.05;
    const dw = avatarImg.width*scale, dh = avatarImg.height*scale;
    ctx.drawImage(avatarImg, cx-dw/2, cy-dh/2, dw, dh);
    ctx.restore();
  } else {
    ctx.font = "56px serif"; ctx.textAlign = "center";
    ctx.fillText("🔥", cx, cy+18);
  }
}

// ─── Double Burner badge ──────────────────────────────────────────────────────
function drawDoubleBurnerBadge(ctx, W) {
  const bx = W/2, by = 552, bw = 210, bh = 36;
  ctx.save();
  roundRect(ctx, bx-bw/2, by, bw, bh, 18);
  const bg = ctx.createLinearGradient(bx-bw/2,by,bx-bw/2,by+bh);
  bg.addColorStop(0,"#0e2a08"); bg.addColorStop(0.5,"#1a4a10"); bg.addColorStop(1,"#0a1e06");
  ctx.fillStyle = bg; ctx.fill();
  ctx.shadowColor = "rgba(74,154,40,0.7)"; ctx.shadowBlur = 14;
  ctx.strokeStyle = "#4a9a28"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.font = "16px serif"; ctx.fillText("🛡", bx-50, by+24);
  ctx.font = "700 13px 'DM Sans', sans-serif"; ctx.fillStyle = "#7ed957";
  ctx.shadowColor = "rgba(126,217,87,0.8)"; ctx.shadowBlur = 6;
  ctx.fillText("DOUBLE", bx-18, by+24);
  ctx.font = "16px serif"; ctx.fillText("🔥", bx+22, by+24);
  ctx.font = "700 13px 'DM Sans', sans-serif"; ctx.fillStyle = "#f97316";
  ctx.shadowColor = "rgba(249,115,22,0.8)"; ctx.shadowBlur = 6;
  ctx.fillText("BURNER", bx+55, by+24);
  ctx.shadowBlur = 0;
}

// ─── Username ─────────────────────────────────────────────────────────────────
function drawUsername(ctx, W, username, theme) {
  ctx.textAlign = "center";
  let sz = 34;
  ctx.font = `700 ${sz}px 'Georgia', serif`;
  while (ctx.measureText(`@${username}`).width > W-240 && sz > 20) { sz -= 2; ctx.font = `700 ${sz}px 'Georgia', serif`; }
  ctx.shadowColor = `${theme.accent ?? "#f97316"}99`; ctx.shadowBlur = 14;
  ctx.fillStyle = "#f0efea";
  ctx.fillText(`@${username}`, W/2, 540);
  ctx.shadowBlur = 0;
}

// ─── Hero stat ────────────────────────────────────────────────────────────────
function drawHeroStat(ctx, W, totalBurned) {
  const cy = 610;
  ctx.save();
  roundRect(ctx, W*0.15, cy, W*0.7, 110, 12);
  const bg = ctx.createLinearGradient(W*0.15,cy,W*0.15,cy+110);
  bg.addColorStop(0,"rgba(60,15,0,0.88)"); bg.addColorStop(1,"rgba(30,8,0,0.88)");
  ctx.fillStyle = bg; ctx.fill();
  ctx.shadowColor = "rgba(249,115,22,0.7)"; ctx.shadowBlur = 25;
  ctx.strokeStyle = "rgba(249,115,22,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  const numText = `🔥 ${typeof totalBurned === "number" ? totalBurned.toLocaleString() : totalBurned}`;
  ctx.font = "900 58px 'Georgia', serif";
  const ng = ctx.createLinearGradient(0,cy+20,0,cy+90);
  ng.addColorStop(0,"#fff080"); ng.addColorStop(0.3,"#ff9000");
  ng.addColorStop(0.7,"#f97316"); ng.addColorStop(1,"#dc2600");
  ctx.fillStyle = ng;
  ctx.shadowColor = "rgba(249,115,22,1)"; ctx.shadowBlur = 30;
  ctx.fillText(numText, W/2, cy+68);

  ctx.font = "700 13px 'DM Sans', sans-serif"; ctx.fillStyle = "#f0c84a";
  ctx.shadowColor = "rgba(240,180,40,0.7)"; ctx.shadowBlur = 8;
  ctx.letterSpacing = "0.18em";
  ctx.fillText("TOTAL BURNED", W/2, cy+96);
  ctx.shadowBlur = 0; ctx.letterSpacing = "0";
}

// ─── Left panel ───────────────────────────────────────────────────────────────
function drawLeftPanel(ctx, theme, shieldCount) {
  const px = 22, py = 355, pw = 148, ph = 240;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 10);
  const bg = ctx.createLinearGradient(px,py,px,py+ph);
  bg.addColorStop(0,"rgba(15,5,0,0.92)"); bg.addColorStop(1,"rgba(8,3,0,0.92)");
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = "rgba(200,150,30,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  const cx = px+pw/2;
  ctx.textAlign = "center";
  ctx.font = "600 10px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,180,40,0.7)"; ctx.letterSpacing = "0.2em";
  ctx.fillText("· TIER ·", cx, py+22);

  // Shield icon with volcano motif
  const sx = cx, sy = py+75, sr = 36;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sx,sy-sr);
  ctx.quadraticCurveTo(sx+sr*0.8,sy-sr,sx+sr*0.8,sy-sr*0.3);
  ctx.lineTo(sx+sr*0.8,sy+sr*0.2);
  ctx.quadraticCurveTo(sx+sr*0.8,sy+sr,sx,sy+sr*1.1);
  ctx.quadraticCurveTo(sx-sr*0.8,sy+sr,sx-sr*0.8,sy+sr*0.2);
  ctx.lineTo(sx-sr*0.8,sy-sr*0.3);
  ctx.quadraticCurveTo(sx-sr*0.8,sy-sr,sx,sy-sr);
  ctx.closePath();
  const sg = ctx.createLinearGradient(sx-sr,sy-sr,sx+sr,sy+sr);
  sg.addColorStop(0,"#2d1a00"); sg.addColorStop(1,"#1a0d00");
  ctx.fillStyle = sg; ctx.fill();
  ctx.strokeStyle = theme.accent ?? "#c8a030"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  ctx.font = "22px serif"; ctx.fillText("🌋", sx, sy+8);

  const tierLabel = (theme.label ?? theme.title ?? "").toUpperCase();
  const tierLines = tierLabel.split(" ");
  ctx.font = "700 12px 'DM Sans', sans-serif";
  ctx.fillStyle = theme.accent ?? "#f97316";
  ctx.shadowColor = `${theme.accent ?? "#f97316"}cc`; ctx.shadowBlur = 8;
  tierLines.forEach((line, i) => ctx.fillText(line, cx, py+140+i*16));

  const divY = py + 140 + tierLines.length * 16 + 4;
  ctx.beginPath(); ctx.moveTo(px+12,divY); ctx.lineTo(px+pw-12,divY);
  ctx.strokeStyle = "rgba(200,150,30,0.4)"; ctx.lineWidth = 1; ctx.stroke();

  ctx.font = "600 11px 'DM Sans', sans-serif"; ctx.fillStyle = "#f0c84a";
  ctx.shadowColor = "rgba(240,180,40,0.6)"; ctx.shadowBlur = 5;
  ctx.fillText(`TIER ${RARITY_TIERS.find(t=>t.key===theme.key)?.minShields ?? ""}`, cx, divY+19);
  ctx.font = "500 10px 'DM Sans', sans-serif"; ctx.fillStyle = "rgba(240,239,234,0.6)"; ctx.shadowBlur = 0;
  ctx.fillText(`${shieldCount} Shield${shieldCount !== 1 ? "s" : ""}`, cx, divY+33);
  ctx.fillText("Burned", cx, divY+47);
}

// ─── Right panel ──────────────────────────────────────────────────────────────
function drawRightPanel(ctx, W, quote) {
  const pw = 148, ph = 180, px = W-pw-22, py = 355;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 10);
  const bg = ctx.createLinearGradient(px,py,px,py+ph);
  bg.addColorStop(0,"rgba(15,5,0,0.92)"); bg.addColorStop(1,"rgba(8,3,0,0.92)");
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = "rgba(200,150,30,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  const cx = px+pw/2;
  ctx.textAlign = "center";
  ctx.font = "600 9px 'DM Sans', sans-serif"; ctx.fillStyle = "rgba(200,150,30,0.7)"; ctx.letterSpacing = "0.16em";
  ctx.fillText("EVENT QUOTE", cx, py+22);

  ctx.font = "italic 32px 'Georgia', serif"; ctx.fillStyle = "rgba(200,150,30,0.5)";
  ctx.fillText("\u201C", px+18, py+58);

  const lines = quote.split("\n");
  ctx.font = "500 13px 'Georgia', serif"; ctx.fillStyle = "#f0efea"; ctx.letterSpacing = "0";
  lines.forEach((line, i) => ctx.fillText(line, cx, py+72+i*20));

  ctx.font = "italic 32px 'Georgia', serif"; ctx.fillStyle = "rgba(200,150,30,0.5)";
  ctx.fillText("\u201D", px+pw-18, py+120);

  const divY = py+135;
  ctx.beginPath(); ctx.moveTo(px+12,divY); ctx.lineTo(px+pw-12,divY);
  ctx.strokeStyle = "rgba(200,150,30,0.4)"; ctx.lineWidth = 1; ctx.stroke();

  ctx.font = "600 8px 'DM Sans', sans-serif"; ctx.fillStyle = "rgba(200,150,30,0.6)"; ctx.letterSpacing = "0.12em";
  ctx.fillText("$TOUCHGRASS BURNED", cx, py+153);
  ctx.font = "700 11px 'DM Sans', sans-serif"; ctx.fillStyle = "#f0c84a"; ctx.letterSpacing = "0.06em";
  ctx.fillText("DOUBLE BURN EVENT", cx, py+167);
}

// ─── Bottom stats ─────────────────────────────────────────────────────────────
function drawBottomStats(ctx, W, H, grassScore, shieldsBurned) {
  const statsY = H-118, statH = 60, gap = 14;
  const statW = (W*0.7-gap)/2;
  const startX = W*0.15;

  [
    { icon:"🌿", value: typeof grassScore === "number" ? grassScore.toLocaleString() : grassScore, label:"GRASS SCORE", color:"#7ed957" },
    { icon:"🛡", value: String(shieldsBurned), label:"SHIELDS BURNED", color:"#f0c84a" },
  ].forEach((stat, i) => {
    const sx = startX + i*(statW+gap);
    ctx.save();
    roundRect(ctx, sx, statsY, statW, statH, 9);
    const bg = ctx.createLinearGradient(sx,statsY,sx,statsY+statH);
    bg.addColorStop(0,"rgba(15,8,0,0.88)"); bg.addColorStop(1,"rgba(8,4,0,0.88)");
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = `${stat.color}60`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();

    const cx = sx+statW/2;
    ctx.textAlign = "center";
    ctx.font = "20px serif"; ctx.fillText(stat.icon, cx-22, statsY+34);
    ctx.font = "700 24px 'Georgia', serif"; ctx.fillStyle = stat.color;
    ctx.shadowColor = `${stat.color}80`; ctx.shadowBlur = 10;
    ctx.fillText(stat.value, cx+10, statsY+36);
    ctx.shadowBlur = 0;
    ctx.font = "600 9px 'DM Sans', sans-serif"; ctx.fillStyle = "rgba(240,239,234,0.55)"; ctx.letterSpacing = "0.1em";
    ctx.fillText(stat.label, cx, statsY+52);
  });

  ctx.textAlign = "center";
  ctx.font = "500 11px 'DM Sans', sans-serif"; ctx.fillStyle = "rgba(240,239,234,0.3)"; ctx.letterSpacing = "0.08em";
  ctx.fillText("THANK YOU FOR BURNING.  🌿  THANK YOU FOR GROWING.", W/2, H-28);
}

// ─── Touch Grass logo (top left) ─────────────────────────────────────────────
function drawTouchGrassLogo(ctx) {
  const lx = 26, ly = 26;
  ctx.save();
  ctx.beginPath(); ctx.arc(lx+22, ly+22, 22, 0, Math.PI*2);
  const bg = ctx.createRadialGradient(lx+22,ly+22,0,lx+22,ly+22,22);
  bg.addColorStop(0,"rgba(10,20,8,0.92)"); bg.addColorStop(1,"rgba(5,10,3,0.92)");
  ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = "#4a9a28"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.fillText("🌿", lx+22, ly+30);
  ctx.font = "700 9px 'DM Sans', sans-serif"; ctx.fillStyle = "#7ed957"; ctx.letterSpacing = "0.06em";
  ctx.fillText("TOUCH", lx+22, ly+52); ctx.fillText("GRASS", lx+22, ly+63);
}

// ─── Main generator — drops in as direct replacement for old generateBurnCard ─
async function generateBurnCard({ theme, username, avatarUrl, grassScore, shieldCount, totalBurned, quote, cardNumber }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Load avatar
  let avatarImg = null;
  if (avatarUrl) {
    try { avatarImg = await loadImage(avatarUrl); } catch { /* skip */ }
  }

  ctx.clearRect(0, 0, W, H);

  // 1. Background
  drawThemeBackground(ctx, W, H, theme);

  // 2. Card border
  ctx.save(); drawCardBorder(ctx, W, H, theme); ctx.restore();

  // 3. Header
  ctx.save(); ctx.letterSpacing = "0"; drawHeader(ctx, W, theme); ctx.restore();

  // 4. Main title
  ctx.save(); ctx.letterSpacing = "0"; drawMainTitle(ctx, W, theme); ctx.restore();

  // 5. Participant badge
  ctx.save(); drawParticipantBadge(ctx, W, cardNumber); ctx.restore();

  // 6. PFP
  ctx.save(); drawPFPSection(ctx, W, avatarImg, theme); ctx.restore();

  // 7. Username
  ctx.save(); ctx.letterSpacing = "0"; drawUsername(ctx, W, username, theme); ctx.restore();

  // 8. Double Burner badge
  ctx.save(); drawDoubleBurnerBadge(ctx, W); ctx.restore();

  // 9. Hero stat
  ctx.save(); ctx.letterSpacing = "0"; drawHeroStat(ctx, W, totalBurned); ctx.restore();

  // 10. Left panel
  ctx.save(); ctx.letterSpacing = "0"; drawLeftPanel(ctx, theme, shieldCount); ctx.restore();

  // 11. Right panel
  ctx.save(); ctx.letterSpacing = "0"; drawRightPanel(ctx, W, quote); ctx.restore();

  // 12. Bottom stats
  ctx.save(); ctx.letterSpacing = "0"; drawBottomStats(ctx, W, H, grassScore, shieldCount); ctx.restore();

  // 13. Touch Grass logo
  ctx.save(); ctx.letterSpacing = "0"; drawTouchGrassLogo(ctx); ctx.restore();

  return canvas.toDataURL("image/png");
}

// ─── Main page — all existing UI preserved exactly ────────────────────────────
export default function BurnerCollectionPage() {
  const [username, setUsername]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [isHolder, setIsHolder]           = useState(false);
  const [userData, setUserData]           = useState(null);
  const [unlockedTiers, setUnlockedTiers] = useState([]);
  const [selectedTierKey, setSelectedTierKey] = useState(null);
  const [quote, setQuote]                 = useState(getRandomBurnQuote());
  const [preview, setPreview]             = useState(null);
  const [generating, setGenerating]       = useState(false);

  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    if (!u) { setLoading(false); return; }

    (async () => {
      const { data: profile } = await supabase
        .from("Profiles")
        .select("avatar_url,grass_score,double_burn_shields,double_burn_total_burned,double_burn_tier,double_burn_badge_awarded,double_burn_card_number,double_burn_selected_tier")
        .eq("username", u).maybeSingle();

      const hasBadge = !!profile?.double_burn_badge_awarded;
      const shields  = profile?.double_burn_shields ?? 0;
      const unlocked = getUnlockedTiers(shields);

      setIsHolder(hasBadge);
      setUserData({
        avatarUrl:   profile?.avatar_url ?? null,
        grassScore:  profile?.grass_score ?? 0,
        shieldCount: shields,
        totalBurned: profile?.double_burn_total_burned ?? 0,
        cardNumber:  profile?.double_burn_card_number ?? null,
      });
      setUnlockedTiers(unlocked);
      const defaultTier = profile?.double_burn_selected_tier
        ?? profile?.double_burn_tier
        ?? unlocked[unlocked.length-1]?.key
        ?? null;
      setSelectedTierKey(defaultTier);
      setLoading(false);
    })();
  }, []);

  const selectTier = async (tierKey) => {
    setSelectedTierKey(tierKey);
    setPreview(null);
    if (username) {
      await supabase.from("Profiles")
        .update({ double_burn_selected_tier: tierKey })
        .eq("username", username);
    }
  };

  const generate = useCallback(async () => {
    if (!userData || !username || !selectedTierKey) return;
    setGenerating(true); setPreview(null);
    try {
      const theme = getRarityTierByKey(selectedTierKey);
      const dataUrl = await generateBurnCard({
        theme, username,
        avatarUrl:   userData.avatarUrl,
        grassScore:  userData.grassScore,
        shieldCount: userData.shieldCount,
        totalBurned: userData.totalBurned,
        cardNumber:  userData.cardNumber,
        quote,
      });
      setPreview(dataUrl);
    } catch(e) { console.error("burn card error", e); }
    setGenerating(false);
  }, [userData, username, selectedTierKey, quote]);

  const download = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.download = `double-burner-${selectedTierKey}.png`;
    a.href = preview; a.click();
  };

  const shareToX = useCallback(async () => {
    if (generating || !userData || !username || !selectedTierKey) return;
    const theme = getRarityTierByKey(selectedTierKey);
    const text = `🔥 ${theme.label} — Double Burner Collection\n\n"${quote}"\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nproofofgrass.app/burns`;
    const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? "");
    const canNativeShare = isMob && !!(navigator.share && navigator.canShare);

    let sharedWin = null;
    if (!canNativeShare) {
      sharedWin = window.open("", "_blank");
      if (sharedWin) sharedWin.document.write(`<html><body style="margin:0;background:#080a06;display:flex;align-items:center;justify-content:center;height:100vh"><p style="color:#93a85a;font-family:sans-serif;font-size:16px;text-align:center">Generating your card…</p></body></html>`);
    }

    setGenerating(true);
    try {
      const theme = getRarityTierByKey(selectedTierKey);
      const dataUrl = await generateBurnCard({
        theme, username,
        avatarUrl:   userData.avatarUrl,
        grassScore:  userData.grassScore,
        shieldCount: userData.shieldCount,
        totalBurned: userData.totalBurned,
        cardNumber:  userData.cardNumber,
        quote,
      });
      setPreview(dataUrl);

      if (canNativeShare) {
        try {
          const res  = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `double-burner-${selectedTierKey}.png`, { type:"image/png" });
          if (navigator.canShare({ files:[file] })) {
            await navigator.share({ files:[file], title:`${theme.label} — Double Burner Collection`, text });
            return;
          }
        } catch(e) {
          if (e?.name === "AbortError") return;
        }
        const link = document.createElement("a");
        link.download = `double-burner-${selectedTierKey}.png`;
        link.href = dataUrl; link.click();
      } else {
        if (sharedWin) {
          sharedWin.document.open();
          sharedWin.document.write(`<html><body style="margin:0;background:#080a06;font-family:sans-serif;padding:24px">
            <img src="${dataUrl}" style="width:100%;max-width:540px;display:block;margin:0 auto;border-radius:12px"/>
            <p style="color:#93a85a;text-align:center;padding:16px 0 8px;font-size:14px">Right-click the image to save it, then attach to your X post</p>
            <p style="text-align:center;padding-bottom:24px">
              <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}" target="_blank"
                style="display:inline-block;background:#93a85a;color:#080a06;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Post on X →</a>
            </p>
          </body></html>`);
          sharedWin.document.close();
        }
      }
    } catch(e) {
      console.error("shareToX error", e);
      if (sharedWin) sharedWin.close();
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    } finally {
      setGenerating(false);
    }
  }, [generating, userData, username, selectedTierKey, quote]);

  const reroll = () => setQuote(getRandomBurnQuote());

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    .theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;}
    .theme-card{position:relative;border-radius:12px;overflow:hidden;cursor:pointer;
      border:2px solid ${T.border};aspect-ratio:4/5;transition:border-color 0.15s;background:${T.bg3};}
    .theme-card.active{border-color:${T.borderGold};}
    .theme-card.locked{opacity:0.32;cursor:default;filter:grayscale(0.6);}
    .btn{border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:700;
      font-size:13px;border-radius:10px;padding:13px 24px;}
    .btn-share{display:inline-flex;align-items:center;justify-content:center;gap:7px;
      background:${T.white};color:${T.bg};border:none;border-radius:10px;padding:13px 24px;
      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;
      transition:all 0.2s;letter-spacing:0.04em;width:100%;}
    .btn-share:hover{background:#e8e7e2;transform:translateY(-1px);}
    .btn-share:disabled{opacity:0.6;cursor:default;transform:none;}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}` }}>
          <Link href="/burns" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:24,height:24,objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:16, fontWeight:700, color:T.white }}>Shields & Burns</span>
          </Link>
          <Link href="/burns" style={{ fontSize:11, color:T.olive, textDecoration:"none" }}>← Back</Link>
        </nav>

        <div style={{ maxWidth:680, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>

          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🔥</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(26px,5vw,40px)",
              fontWeight:700, color:T.white, marginBottom:6 }}>Double Burner Collection</h1>
            <p style={{ fontSize:12.5, color:T.dim }}>Exclusive share cards for Double Burner badge holders.</p>
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:T.dim }}>Loading…</div>
          ) : !username ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:16,
              padding:"48px 24px", textAlign:"center" }}>
              <div style={{ fontSize:13, color:T.dim }}>Set your username on the dashboard first.</div>
            </div>
          ) : !isHolder ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:16,
              padding:"56px 24px", textAlign:"center" }}>
              <div style={{ fontSize:42, marginBottom:16, opacity:0.4 }}>🔒</div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:20,
                color:T.white, marginBottom:10 }}>
                🔥 Earn the Double Burner badge to unlock this collection.
              </div>
              <div style={{ fontSize:12.5, color:T.dim, marginBottom:20, lineHeight:1.6 }}>
                Burn for a Streak Shield during the Double Burn Event to unlock your collectible card,
                a permanent participant number, and 5 tiers of background rarity.
              </div>
              <Link href="/burns" style={{ fontSize:12, fontWeight:700, color:T.olive,
                textDecoration:"none", padding:"10px 22px", borderRadius:9,
                border:`1px solid ${T.borderG}`, display:"inline-block" }}>
                View Burn Event →
              </Link>
            </div>
          ) : (
            <>
              {/* Participant number + summary */}
              <div style={{ background:"linear-gradient(145deg,#0e100b,#141710)",
                border:`1px solid ${T.borderGold}`, borderRadius:14, padding:"18px 20px", marginBottom:16,
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:T.gold, marginBottom:4 }}>Participant</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22, fontWeight:700, color:T.white }}>
                    {formatCardNumber(userData?.cardNumber)}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:T.fire, marginBottom:4 }}>Total Burned</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22, fontWeight:700, color:T.white }}>
                    {fmtBurned(userData?.totalBurned)} $TOUCHGRASS
                  </div>
                </div>
              </div>

              {/* Rarity tier selector */}
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:4 }}>
                  Background Rarity
                </div>
                <div style={{ fontSize:11, color:T.dim, marginBottom:12 }}>
                  Unlocked by cumulative shields burned. Choose any tier you've earned.
                </div>
                <div className="theme-grid">
                  {RARITY_TIERS.map(tier => {
                    const isUnlocked = unlockedTiers.some(t => t.key === tier.key);
                    const isActive   = selectedTierKey === tier.key;
                    return (
                      <div key={tier.key}
                        className={`theme-card ${isActive?"active":""} ${!isUnlocked?"locked":""}`}
                        onClick={() => { if (isUnlocked) selectTier(tier.key); }}>
                        <img src={tier.image} alt={tier.label} loading="lazy"
                          style={{ width:"100%", height:"100%", objectFit:"cover",
                            filter: tier.isLegendary && isUnlocked ? "grayscale(0.5) brightness(0.7)" : "none" }}
                          onError={e => { e.target.style.display = "none"; }} />
                        {!isUnlocked && (
                          <div style={{ position:"absolute", top:8, right:8, fontSize:16 }}>🔒</div>
                        )}
                        <div style={{ position:"absolute", bottom:0, left:0, right:0,
                          background:"linear-gradient(transparent,rgba(0,0,0,0.92))",
                          padding:"18px 8px 6px", textAlign:"center" }}>
                          <div style={{ fontSize:10, fontWeight:700, color: tier.isLegendary?"#ffd700":"#fff" }}>
                            {tier.label}
                          </div>
                          <div style={{ fontSize:8.5, color:T.dim, marginTop:2 }}>
                            {tier.minShields}+ shield{tier.minShields!==1?"s":""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quote */}
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:18,
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div style={{ fontSize:12.5, color:T.muted, fontStyle:"italic", flex:1 }}>"{quote}"</div>
                <button onClick={reroll}
                  style={{ background:T.bg3, border:`1px solid ${T.border}`, color:T.olive,
                    borderRadius:8, padding:"7px 12px", fontSize:11, cursor:"pointer", flexShrink:0 }}>
                  🔄 New Quote
                </button>
              </div>

              <button className="btn" onClick={generate} disabled={generating || !selectedTierKey}
                style={{ width:"100%", background:getRarityTierByKey(selectedTierKey)?.accent ?? T.gold,
                  color:"#0e1108", marginBottom:20, opacity:(generating || !selectedTierKey)?0.7:1 }}>
                {generating ? "Generating…" : "✦ Generate Card"}
              </button>

              {preview && (
                <div>
                  <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${T.borderGold}`,
                    boxShadow:"0 0 40px rgba(249,115,22,0.2), 0 0 80px rgba(200,100,0,0.1)", marginBottom:16 }}>
                    <img src={preview} alt="Double Burner card" style={{ width:"100%", display:"block" }} />
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <button onClick={shareToX} disabled={generating} className="btn-share">
                      {generating ? "Generating…" : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          Post to X
                        </>
                      )}
                    </button>
                    <button className="btn" onClick={download} disabled={generating}
                      style={{ width:"100%", background:T.bg3, color:T.dim,
                        border:`1px solid ${T.border}`, opacity:generating?0.6:1 }}>
                      ↓ Save Card
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}