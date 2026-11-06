// utils/flexCardRender.js — foreground of the Flex card (1080×1080). The user's cover art is drawn by the caller as the background;
// this draws the new-style glass identity panel, streak plate, stat capsules, next-milestone row and footer on top.
import { glossPill, TIER_PAL, tierFor, rr } from "./proofCardRender";
import { fitText, ellipsize, INK, GREEN, NUN, FRED } from "./cardFrame";

const TIERS = ["ROOTED", "LOCKED IN", "ELITE", "LEGENDARY", "IMMORTAL", "MYTHIC", "ETERNAL", "ASCENDED", "TRANSCENDENT"];
const THS = [7, 14, 30, 50, 100, 180, 365, 500, 1000];
const GOLD = "#f6b93b";
// Image loader that can never hang: resolves null on error or after 8s, so the card still builds without that image.
const ld = (src) => new Promise((res) => {
  const t = setTimeout(() => res(null), 8000);
  const i = new Image(); i.onload = () => { clearTimeout(t); res(i); }; i.onerror = () => { clearTimeout(t); res(null); }; i.src = src;
});
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

function sprout(ctx, x, y, r) {
  const k = r / 44;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 10 * k; ctx.shadowOffsetY = 4 * k;
  const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, "#c8f27a"); g.addColorStop(1, "#4fb21a");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  ctx.lineWidth = 6 * k; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 41 * k, 0, 7); ctx.stroke();
  ctx.lineWidth = 3 * k; ctx.strokeStyle = "#2f7d10"; ctx.beginPath(); ctx.arc(x, y, 46 * k, 0, 7); ctx.stroke();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 6 * k; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y + 22 * k); ctx.quadraticCurveTo(x + k, y + 4 * k, x, y - 6 * k); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(x - 14 * k, y - 8 * k, 15 * k, 8 * k, -0.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 14 * k, y - 14 * k, 15 * k, 8 * k, 0.6, 0, 7); ctx.fill();
}

function cream(ctx, x, y, w, h, r, border = GREEN) {
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#fffef6"); g.addColorStop(1, "#f6edcf"); ctx.fillStyle = g; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = border; rr(ctx, x, y, w, h, r); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(246,185,59,.55)"; rr(ctx, x + 7, y + 7, w - 14, h - 14, Math.max(6, r - 7)); ctx.stroke();
}

export async function drawFlexCard(ctx, W, H, p, loadAvatar) {
  const { username, streak, grassScore, rank, best, tierTitle, theme } = p;
  try { await withTimeout(Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]), 2500); } catch {}
  const accent = theme?.accentColor || "#7dc832", accent2 = theme?.progressTo || "#5ba622";
  const tierName = tierFor(streak), tIdx = TIERS.indexOf(tierName) + 1, newcomer = !tierName;
  const nxt = THS.find((t) => t > streak) || 1000, nIdx = THS.indexOf(nxt) + 1;
  const prv = [0, ...THS].reverse().find((t) => streak >= t) || 0;
  const [shield, nextShield, mascot] = await Promise.all([tIdx ? ld(`/card/tier-${tIdx}.png`) : null, ld(`/card/tier-${nIdx}.png`), ld("/card/mascot-side.png")]);
  ctx.textBaseline = "alphabetic"; ctx.letterSpacing = "0px";
  const geom = {}; // positions of the number and progress fill, so an animated renderer can draw them itself (p.skipNumber / p.skipFill)

  // ── identity glass panel ──
  const AX = 36, AY = 36, AW = 650, AH = 270;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = "rgba(255,255,255,0.90)"; rr(ctx, AX, AY, AW, AH, 48); ctx.fill(); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,.95)"; rr(ctx, AX, AY, AW, AH, 48); ctx.stroke();
  const R = 82, acx = AX + 34 + R, acy = AY + AH / 2;
  ctx.save(); ctx.shadowColor = accent + "88"; ctx.shadowBlur = 24; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(acx, acy, R + 12, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(acx, acy, R, 0, 7); ctx.clip();
  let ok = false;
  if (p.avatarUrl) { try { const im = await withTimeout(loadAvatar(p.avatarUrl), 20000); if (!im) throw new Error("avatar timeout"); ctx.drawImage(im, acx - R, acy - R, R * 2, R * 2); ok = true; } catch {} }
  if (!ok) { ctx.fillStyle = "#e3f3d4"; ctx.fillRect(acx - R, acy - R, R * 2, R * 2); try { const lg = await loadAvatar("/touchgrass-transparent.png"); ctx.drawImage(lg, acx - 58, acy - 58, 116, 116); } catch {} }
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = accent; ctx.beginPath(); ctx.arc(acx, acy, R + 2, 0, 7); ctx.stroke();
  // verified dot
  ctx.fillStyle = "#4fb21a"; ctx.beginPath(); ctx.arc(acx + R * 0.72, acy + R * 0.72, 22, 0, 7); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.stroke();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(acx + R * 0.72 - 9, acy + R * 0.72); ctx.lineTo(acx + R * 0.72 - 2, acy + R * 0.72 + 7); ctx.lineTo(acx + R * 0.72 + 10, acy + R * 0.72 - 8); ctx.stroke();

  const NX = acx + R + 36, NW = AX + AW - 28 - NX;
  ctx.textAlign = "left"; ctx.fillStyle = INK; fitText(ctx, `@${username}`, NW, 56, 30);
  ctx.fillText(ellipsize(ctx, `@${username}`, NW), NX, AY + 98);
  // pills: tier (or newcomer) + verified
  const tp = newcomer ? { a: "#b8f0e6", b: "#4fcfb4", bd: "#1f8f7a", tx: "#06342c" } : (TIER_PAL[tIdx] || TIER_PAL[4]);
  const tlabel = newcomer ? "NEWCOMER" : tierName;
  ctx.font = `700 32px ${FRED}`; ctx.letterSpacing = "1px";
  const tw = Math.min(NW, ctx.measureText(tlabel).width + 56);
  glossPill(ctx, NX, AY + 124, tw, 56, tp);
  ctx.save(); ctx.fillStyle = tp.tx; if (tp.dark) { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowOffsetY = 2; } else { ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2; }
  ctx.textAlign = "center"; ctx.fillText(tlabel, NX + tw / 2, AY + 124 + 39); ctx.restore(); ctx.letterSpacing = "0px";
  const vp = { a: "#9be85a", b: "#4fb21a", bd: "#2f7d10" }, vlabel = "Verified Outdoors";
  ctx.font = `700 26px ${FRED}`; const vw = Math.min(NW, ctx.measureText(vlabel).width + 56);
  glossPill(ctx, NX, AY + 194, vw, 48, vp);
  ctx.save(); ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(20,70,10,.5)"; ctx.shadowOffsetY = 2; ctx.textAlign = "center"; ctx.fillText(vlabel, NX + vw / 2, AY + 194 + 33); ctx.restore();

  // ── streak plate ──
  const SX = AX + AW + 20, SW = W - 36 - SX, SY = AY;
  cream(ctx, SX, SY, SW, AH, 48, GOLD);
  const scx = SX + SW / 2;
  if (shield) { const sh = 104, sw = sh * shield.width / shield.height; ctx.save(); ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.drawImage(shield, scx - sw / 2, SY + 18, sw, sh); ctx.restore(); }
  else sprout(ctx, scx, SY + 70, 52);
  ctx.textAlign = "center";
  const nstr = String(streak); let ns = 100; ctx.font = `700 ${ns}px ${FRED}`;
  const dayW = () => { ctx.font = `700 ${Math.round(ns * 0.5)}px ${FRED}`; const d = ctx.measureText("DAY ").width; ctx.font = `700 ${ns}px ${FRED}`; return d + ctx.measureText(nstr).width; };
  while (dayW() > SW - 44 && ns > 54) ns -= 4;
  ctx.font = `700 ${Math.round(ns * 0.5)}px ${FRED}`; const dw = ctx.measureText("DAY ").width; ctx.font = `700 ${ns}px ${FRED}`; const nw = ctx.measureText(nstr).width;
  const sx0 = scx - (dw + nw) / 2, by = SY + 200;
  ctx.textAlign = "left"; ctx.font = `700 ${Math.round(ns * 0.5)}px ${FRED}`; ctx.fillStyle = INK; ctx.fillText("DAY ", sx0, by);
  geom.num = { x: sx0 + dw, y: by, ns, font: FRED };
  ctx.font = `700 ${ns}px ${FRED}`; ctx.fillStyle = "#4fb21a"; if (!p.skipNumber) ctx.fillText(nstr, sx0 + dw, by);
  ctx.textAlign = "center"; ctx.fillStyle = GREEN; ctx.font = `800 15px ${NUN}`; ctx.letterSpacing = "4px"; ctx.fillText("CURRENT STREAK", scx + 2, SY + 238); ctx.letterSpacing = "0px";

  // ── stat capsules ──
  const gs = grassScore >= 1000 ? (grassScore / 1000).toFixed(1) + "K" : String(grassScore);
  const stats = [{ v: gs, l: "GRASS SCORE" }, { v: rank ? `#${rank}` : "—", l: "RANK" }, { v: `${best ?? streak}d`, l: "BEST STREAK" }];
  const sy = H - 340, gap = 18, sw3 = (W - 72 - gap * 2) / 3;
  stats.forEach((s, i) => {
    const x = 36 + i * (sw3 + gap), mx = x + sw3 / 2;
    cream(ctx, x, sy, sw3, 118, 59); ctx.textAlign = "center";
    ctx.fillStyle = INK; fitText(ctx, s.v, sw3 - 50, 54, 28); ctx.fillText(s.v, mx, sy + 66);
    ctx.fillStyle = GREEN; ctx.font = `800 17px ${NUN}`; ctx.letterSpacing = "3px"; ctx.fillText(s.l, mx + 1, sy + 96); ctx.letterSpacing = "0px";
  });

  // ── next milestone ──
  const my = H - 200, mh = 120;
  cream(ctx, 36, my, W - 72, mh, 60);
  const sz = 100;
  if (nextShield) { const sw = sz * nextShield.width / nextShield.height; ctx.drawImage(nextShield, 36 + 30, my + (mh - sz) / 2, sw, sz); }
  const tx = 36 + 30 + 110, tw2 = W - 36 - 40 - tx;
  ctx.textAlign = "left"; ctx.fillStyle = GREEN; ctx.font = `800 20px ${NUN}`; ctx.letterSpacing = "3px"; ctx.fillText(`NEXT BADGE · ${TIERS[nIdx - 1]}`, tx, my + 40); ctx.letterSpacing = "0px";
  ctx.fillStyle = INK; ctx.font = `700 34px ${FRED}`; ctx.textAlign = "right"; ctx.fillText(`${streak} / ${nxt}`, tx + tw2, my + 44); ctx.textAlign = "left";
  const fp = Math.min(1, (streak - prv) / Math.max(1, nxt - prv)), bw = tw2, by2 = my + 66;
  ctx.fillStyle = "rgba(31,107,18,.18)"; rr(ctx, tx, by2, bw, 22, 11); ctx.fill();
  geom.bar = { x: tx, y: by2, w: bw, fp, accent, accent2 };
  if (!p.skipFill) { const pg = ctx.createLinearGradient(tx, 0, tx + bw, 0); pg.addColorStop(0, accent); pg.addColorStop(1, accent2);
    ctx.fillStyle = pg; rr(ctx, tx, by2, Math.max(22, bw * fp), 22, 11); ctx.fill(); }

  // ── footer pill ──
  ctx.textAlign = "center"; ctx.font = `800 20px ${NUN}`; ctx.letterSpacing = "3px";
  const ft = "PROOFOFGRASS.APP  ·  BUILT ON SOLANA", fw = ctx.measureText(ft).width + 44, fy = H - 62;
  ctx.fillStyle = "rgba(253,246,226,.92)"; rr(ctx, W / 2 - fw / 2, fy, fw, 40, 20); ctx.fill();
  ctx.fillStyle = GREEN; ctx.fillText(ft, W / 2 + 2, fy + 28); ctx.letterSpacing = "0px"; ctx.textAlign = "left";
  return geom;
}
