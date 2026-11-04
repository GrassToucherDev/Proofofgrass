// utils/streakShareCard.js — streak / streak-milestone share card (1080×1350), same bright look as the other cards.
import { loadImageSafe } from "./spotlightImage";
import { glossPill, TIER_PAL, tierFor, rr as rrP } from "./proofCardRender";
import { withShareTags } from "./shareTags";

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 180, 365, 500, 1000];
const BADGE_TIERS = [7, 14, 30, 50, 100, 180, 365];   // art: /badges/streak-<tier>.png
export const isStreakMilestone = (n) => STREAK_MILESTONES.includes(Number(n));
const nextMilestone = (n) => STREAK_MILESTONES.find((m) => m > n) ?? null;

const INK = "#0d2a05", GREEN = "#1f6b12", CREAM = "#fdf6e2", GOLD = "#f6b93b";
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function fit(ctx, text, maxW, start, min, weight = 700, family = "'Fredoka',system-ui,sans-serif") {
  let px = start; ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = `${weight} ${px}px ${family}`; }
}

export const streakCaption = (username, streak) => withShareTags(
  isStreakMilestone(streak)
    ? `🔥 ${streak}-day streak on Proof of Grass! ${streak} days in a row of touching grass 🌱\n\nproofofgrass.app/u/${username}`
    : `🔥 Day ${streak} of touching grass on Proof of Grass 🌱\n\nproofofgrass.app/u/${username}`);

const FRED = "Fredoka,'Nunito',system-ui,sans-serif", NUN = "Nunito,system-ui,sans-serif", LIME = "#4fb21a";
const TIERS = ["ROOTED", "LOCKED IN", "ELITE", "LEGENDARY", "IMMORTAL", "MYTHIC", "ETERNAL", "ASCENDED", "TRANSCENDENT"];
const ld = (src) => loadImageSafe(src).catch(() => null);

// code-drawn Newcomer seal (lime disc, white ring, sprout)
function sprout(ctx, x, y, r) {
  const k = r / 44;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 10 * k; ctx.shadowOffsetY = 4 * k;
  const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, "#c8f27a"); g.addColorStop(1, "#4fb21a");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  ctx.lineWidth = 6 * k; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 41 * k, 0, 7); ctx.stroke();
  ctx.lineWidth = 3 * k; ctx.strokeStyle = "#2f7d10"; ctx.beginPath(); ctx.arc(x, y, 46 * k, 0, 7); ctx.stroke();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 6 * k; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y + 22 * k); ctx.quadraticCurveTo(x + k, y + 4 * k, x, y - 6 * k); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(x - 14 * k, y - 8 * k, 15 * k, 8 * k, -0.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 14 * k, y - 14 * k, 15 * k, 8 * k, 0.6, 0, 7); ctx.fill();
}

export async function renderStreakCard({ username, streak, best }) {
  const W = 1080, H = 1350, cx = W / 2;
  const milestone = isStreakMilestone(streak);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  try { await Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]); } catch {}
  const tierName = tierFor(streak), tierIdx = TIERS.indexOf(tierName) + 1, newcomer = !tierName;
  const bgSrc = streak >= 365 ? "/card/bg-night.jpg" : streak >= 100 ? "/card/bg-sunset.jpg" : "/card/bg.jpg";
  const [bg, logo, laurelI, sparkles, mascot, calI, grassL, grassR, shield, nextShield] = await Promise.all([
    ld(bgSrc), ld("/touchgrass-logo-card.png"), ld("/card/laurel.png"), ld("/card/sparkles.png"), ld("/card/mascot-side.png"), ld("/card/cal.png"),
    ld("/card/grass-l.png"), ld("/card/grass-r.png"), tierIdx ? ld(`/card/tier-${tierIdx}.png`) : Promise.resolve(null),
    ld(`/card/tier-${Math.min(9, tierIdx + 1)}.png`)]);
  ctx.textBaseline = "alphabetic"; ctx.letterSpacing = "0px";

  // background (cover-crop)
  if (bg) { const sc = Math.max(W / bg.width, H / bg.height); ctx.drawImage(bg, (W - bg.width * sc) / 2, (H - bg.height * sc) / 2, bg.width * sc, bg.height * sc); }
  else { const sk = ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, "#b9ddf6"); sk.addColorStop(0.55, "#e6f3fc"); sk.addColorStop(1, "#eaf5dc"); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H); }

  // glass panel
  const PX = 50, PY = 60, PW = W - 100, PH = 1170;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.fillStyle = "rgba(255,255,255,0.90)"; rrP(ctx, PX, PY, PW, PH, 60); ctx.fill(); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.95)"; rrP(ctx, PX, PY, PW, PH, 60); ctx.stroke();
  if (sparkles) ctx.drawImage(sparkles, 0, 0, W, H);

  // header
  ctx.textAlign = "center";
  if (logo) { const lw = 400, lh = lw * logo.height / logo.width; ctx.drawImage(logo, cx - lw / 2, PY + 24, lw, lh); }
  ctx.fillStyle = INK; ctx.font = `800 62px ${FRED}`; ctx.fillText("PROOF OF GRASS", cx, PY + 262);
  const tw = ctx.measureText("PROOF OF GRASS").width;
  if (laurelI) { const lh = 90, lw = lh * laurelI.width / laurelI.height;
    ctx.drawImage(laurelI, cx - tw / 2 - 30 - lw, PY + 262 - 56, lw, lh);
    ctx.save(); ctx.translate(cx + tw / 2 + 30 + lw, PY + 262 - 56); ctx.scale(-1, 1); ctx.drawImage(laurelI, 0, 0, lw, lh); ctx.restore(); }
  ctx.fillStyle = GREEN; ctx.font = `800 26px ${NUN}`; ctx.letterSpacing = "9px";
  ctx.fillText(milestone ? "STREAK MILESTONE" : "DAILY STREAK", cx + 4, PY + 306); ctx.letterSpacing = "0px";

  // big tier shield (or newcomer sprout) with halo
  const SY = PY + 330, SS = 296;
  const halo = ctx.createRadialGradient(cx, SY + SS / 2, 20, cx, SY + SS / 2, SS * 0.66);
  halo.addColorStop(0, "rgba(255,255,255,0.95)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo; ctx.fillRect(0, SY - 50, W, SS + 100);
  if (shield) {
    const k = Math.min(SS / shield.width, SS / shield.height);
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.28)"; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
    ctx.drawImage(shield, cx - shield.width * k / 2, SY + SS / 2 - shield.height * k / 2, shield.width * k, shield.height * k); ctx.restore();
  } else sprout(ctx, cx, SY + SS / 2, 130);

  // tier pill
  const pal = newcomer ? { a: "#b8f0e6", b: "#4fcfb4", bd: "#1f8f7a", tx: "#06342c" } : (TIER_PAL[tierIdx] || TIER_PAL[4]);
  const label = newcomer ? "NEWCOMER" : tierName, py0 = SY + SS + 12, pw0 = 500;
  glossPill(ctx, cx - pw0 / 2, py0, pw0, 80, pal);
  ctx.save(); ctx.fillStyle = pal.tx; ctx.font = `700 ${label.length > 9 ? 38 : 44}px ${FRED}`; ctx.letterSpacing = "2px";
  if (pal.dark) { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowOffsetY = 2; } else { ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2; }
  ctx.fillText(label, cx + 1, py0 + 56); ctx.restore();

  // number
  const ny = py0 + 80 + 150;
  ctx.fillStyle = INK; fit(ctx, String(streak), 760, 170, 90, 700, FRED); ctx.fillText(String(streak), cx, ny);
  ctx.font = `800 30px ${NUN}`; ctx.fillStyle = "#b8741a"; ctx.letterSpacing = "10px";
  ctx.fillText(streak === 1 ? "DAY STREAK" : "DAYS IN A ROW", cx + 5, ny + 50); ctx.letterSpacing = "0px";

  // progress to the next milestone
  const nm = nextMilestone(streak), prev = [...STREAK_MILESTONES].reverse().find((m) => m <= streak) || 0;
  const gy = ny + 90;
  ctx.fillStyle = "#2d5a1a"; ctx.font = `800 28px ${NUN}`;
  ctx.fillText(nm ? `${nm - streak} day${nm - streak === 1 ? "" : "s"} to the ${nm}-day milestone` : "Legend status unlocked", cx, gy);
  if (nm) {
    const bw = 560, bx = cx - bw / 2, by = gy + 16;
    ctx.fillStyle = "rgba(31,107,18,.18)"; rrP(ctx, bx, by, bw, 18, 9); ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, "#9be85a"); g.addColorStop(1, "#4fb21a");
    ctx.fillStyle = g; rrP(ctx, bx, by, Math.max(18, bw * (streak - prev) / (nm - prev)), 18, 9); ctx.fill();
  }

  // footer capsules: username | date
  const ch = 104, cy0 = PY + PH - ch - 28, gap = 22, lw2 = 540, rw2 = PW - 88 - lw2 - gap, lx = PX + 44, rx = lx + lw2 + gap;
  const cap = (x, w) => {
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    const g = ctx.createLinearGradient(0, cy0, 0, cy0 + ch); g.addColorStop(0, "#fffef6"); g.addColorStop(1, "#f6edcf"); ctx.fillStyle = g; rrP(ctx, x, cy0, w, ch, ch / 2); ctx.fill(); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = GREEN; rrP(ctx, x, cy0, w, ch, ch / 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(246,185,59,.7)"; rrP(ctx, x + 7, cy0 + 7, w - 14, ch - 14, ch / 2 - 7); ctx.stroke();
  };
  cap(lx, lw2); cap(rx, rw2);
  const cyy = cy0 + ch / 2;
  if (mascot) { const mh = 112, mw = mh * mascot.width / mascot.height; ctx.drawImage(mascot, lx + 14, cyy - mh / 2 - 12, mw, mh); }
  ctx.textAlign = "left";
  const tx = lx + 140;
  ctx.fillStyle = GREEN; ctx.font = `800 18px ${NUN}`; ctx.letterSpacing = "4px";
  ctx.fillText(best && best > streak ? `BEST STREAK ${best}` : "GRASS TOUCHER", tx, cyy - 14); ctx.letterSpacing = "0px";
  let un = `@${username}`; fit(ctx, un, lx + lw2 - 36 - tx, 44, 26, 700, FRED); while (ctx.measureText(un).width > lx + lw2 - 36 - tx && un.length > 4) un = un.slice(0, -2) + "…";
  ctx.fillStyle = INK; ctx.fillText(un, tx, cyyy(cyy));
  if (calI) { const ch2 = 60; ctx.drawImage(calI, rx + 26, cyy - ch2 / 2, ch2 * calI.width / calI.height, ch2); }
  const ds = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  ctx.fillStyle = GREEN; ctx.font = `800 18px ${NUN}`; ctx.letterSpacing = "4px"; ctx.fillText("DATE", rx + 106, cyy - 14); ctx.letterSpacing = "0px";
  ctx.fillStyle = INK; fit(ctx, ds, rw2 - 106 - 24, 38, 24, 700, FRED); ctx.fillText(ds, rx + 106, cyyy(cyy));

  // grass + url pill
  if (grassL) { const gh = 170, gw = gh * grassL.width / grassL.height; ctx.drawImage(grassL, PX - 50, H - gh + 16, gw, gh); }
  if (grassR) { const gh = 170, gw = gh * grassR.width / grassR.height; ctx.drawImage(grassR, W - PX + 50 - gw, H - gh + 16, gw, gh); }
  ctx.textAlign = "center"; ctx.font = `800 20px ${NUN}`; ctx.letterSpacing = "3px";
  const uw = ctx.measureText("PROOFOFGRASS.APP").width + 40; ctx.fillStyle = "rgba(253,246,226,.92)"; rrP(ctx, cx - uw / 2, H - 56, uw, 38, 19); ctx.fill();
  ctx.fillStyle = GREEN; ctx.fillText("PROOFOFGRASS.APP", cx + 2, H - 29); ctx.letterSpacing = "0px";
  return c.toDataURL("image/png");
}
const cyyy = (cy) => cy + 34;
