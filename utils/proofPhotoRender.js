// utils/proofPhotoRender.js — "Photo Plus" share card: the photo fills the whole card with a light branded layer on top
// (verified pill, logo, and a glass bar with day, tier, @username and date). In between the plain photo and the full result card.
import { glossPill, TIER_PAL, tierFor, rr } from "./proofCardRender";

const FRED = "Fredoka,'Nunito',system-ui,sans-serif", NUN = "Nunito,system-ui,sans-serif", INK = "#12380a", GREEN = "#1f6b12", LIME = "#4fb21a";
const TIERS = ["ROOTED", "LOCKED IN", "ELITE", "LEGENDARY", "IMMORTAL", "MYTHIC", "ETERNAL", "ASCENDED", "TRANSCENDENT"];
const ld = (src) => new Promise((res) => {
  const t = setTimeout(() => res(null), 8000);
  const i = new Image(); i.onload = () => { clearTimeout(t); res(i); }; i.onerror = () => { clearTimeout(t); res(null); }; i.src = src;
});

// Card size follows the photo (width 1600, height clamped between 4:5 portrait and 1.91:1 landscape).
export function photoCardSize(photo) {
  const W = 1600, ratio = photo ? photo.height / photo.width : 0.75;
  return { W, H: Math.round(W * Math.min(1.25, Math.max(0.52, ratio))) };
}

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

// opts: { photo, streak, dateStr, topPct, location, username }
export async function drawPhotoCard(ctx, W, H, opts) {
  const { photo, streak, dateStr, topPct, location } = opts;
  const handle = (opts.username || "").replace(/^@+/, "").trim();
  try { await Promise.race([Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]), new Promise((r) => setTimeout(r, 2500))]); } catch {}
  const tierName = tierFor(streak), tIdx = TIERS.indexOf(tierName) + 1, newcomer = !tierName;
  const [logo, shield, medal, pin] = await Promise.all([ld("/touchgrass-logo-card.png"), tIdx ? ld(`/card/tier-${tIdx}.png`) : null, ld("/card/medal.png"), ld("/card/pin.png")]);
  ctx.save(); ctx.textBaseline = "alphabetic"; ctx.letterSpacing = "0px";

  // photo, cover-fitted
  if (photo) { const sc = Math.max(W / photo.width, H / photo.height), dw = photo.width * sc, dh = photo.height * sc; ctx.drawImage(photo, (W - dw) / 2, (H - dh) / 2, dw, dh); }
  else { ctx.fillStyle = "#cfe8b8"; ctx.fillRect(0, 0, W, H); }
  // soft scrims so the overlays read on any photo
  const top = ctx.createLinearGradient(0, 0, 0, 260); top.addColorStop(0, "rgba(0,0,0,.38)"); top.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = top; ctx.fillRect(0, 0, W, 260);
  const bot = ctx.createLinearGradient(0, H - 420, 0, H); bot.addColorStop(0, "rgba(0,0,0,0)"); bot.addColorStop(1, "rgba(0,0,0,.45)"); ctx.fillStyle = bot; ctx.fillRect(0, H - 420, W, 420);

  const M = 44;
  // top-left: verified pill
  const vlabel = "Verified Outdoors"; ctx.font = `700 34px ${FRED}`; const vw = ctx.measureText(vlabel).width + 110, vh = 76;
  glossPill(ctx, M, M, vw, vh, { a: "#9be85a", b: "#4fb21a", bd: "#2f7d10" });
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(M + 14 + 24, M + vh / 2, 24, 0, 7); ctx.fill();
  ctx.strokeStyle = "#3f9a14"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(M + 28, M + vh / 2 + 1); ctx.lineTo(M + 36, M + vh / 2 + 9); ctx.lineTo(M + 50, M + vh / 2 - 8); ctx.stroke();
  ctx.save(); ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(20,70,10,.5)"; ctx.shadowOffsetY = 2; ctx.textAlign = "left"; ctx.font = `700 34px ${FRED}`; ctx.fillText(vlabel, M + 14 + 48 + 14, M + vh / 2 + 12); ctx.restore();
  // top-right: logo on a soft glass chip
  if (logo) { const lw = 300, lh = lw * logo.height / logo.width, cw = lw + 36, ch = lh + 24, cx0 = W - M - cw;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.fillStyle = "rgba(255,255,255,.9)"; rr(ctx, cx0, M, cw, ch, 34); ctx.fill(); ctx.restore();
    ctx.drawImage(logo, cx0 + 18, M + 12, lw, lh); }

  // bottom glass bar
  const BH = 200, BX = M, BW = W - M * 2, BY = H - M - BH;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = "rgba(255,255,255,.90)"; rr(ctx, BX, BY, BW, BH, 70); ctx.fill(); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,.95)"; rr(ctx, BX, BY, BW, BH, 70); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(246,185,59,.6)"; rr(ctx, BX + 8, BY + 8, BW - 16, BH - 16, 62); ctx.stroke();
  // badge pops out of the bar's left end
  const bcx = BX + 120, bcy = BY + BH / 2 - 6;
  if (shield) { const sh = 190, sw = sh * shield.width / shield.height; ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.drawImage(shield, bcx - sw / 2, bcy - sh / 2 - 12, sw, sh); ctx.restore(); }
  else sprout(ctx, bcx, bcy - 6, 66);
  // DAY N
  const nx = BX + 240; ctx.textAlign = "left";
  const num = String(streak); let ns = 120; ctx.font = `700 ${ns}px ${FRED}`;
  const fit = () => { ctx.font = `700 ${Math.round(ns * 0.5)}px ${FRED}`; const d = ctx.measureText("DAY ").width; ctx.font = `700 ${ns}px ${FRED}`; return d + ctx.measureText(num).width; };
  while (fit() > 400 && ns > 64) ns -= 4;
  ctx.font = `700 ${Math.round(ns * 0.5)}px ${FRED}`; const dw = ctx.measureText("DAY ").width; ctx.fillStyle = INK; ctx.fillText("DAY ", nx, BY + 128);
  ctx.font = `700 ${ns}px ${FRED}`; ctx.fillStyle = LIME; ctx.fillText(num, nx + dw, BY + 128);
  ctx.fillStyle = GREEN; ctx.font = `800 20px ${NUN}`; ctx.letterSpacing = "5px"; ctx.fillText("CURRENT STREAK", nx + 2, BY + 164); ctx.letterSpacing = "0px";
  // divider
  const dx = nx + 470; ctx.fillStyle = "rgba(31,107,18,.22)"; ctx.fillRect(dx, BY + 34, 3, BH - 68);
  // right block: tier pill, @username, date / location
  const rx = dx + 34, rw = BX + BW - 40 - rx;
  const pal = newcomer ? { a: "#b8f0e6", b: "#4fcfb4", bd: "#1f8f7a", tx: "#06342c" } : (TIER_PAL[tIdx] || TIER_PAL[4]);
  const tlabel = newcomer ? "NEWCOMER" : tierName; ctx.font = `700 34px ${FRED}`; ctx.letterSpacing = "1px";
  const tw = ctx.measureText(tlabel).width + 64;
  glossPill(ctx, rx, BY + 30, tw, 62, pal);
  ctx.save(); ctx.fillStyle = pal.tx; if (pal.dark) { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowOffsetY = 2; } else { ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2; }
  ctx.textAlign = "center"; ctx.fillText(tlabel, rx + tw / 2, BY + 30 + 44); ctx.restore(); ctx.letterSpacing = "0px";
  if (topPct && medal) { const mh = 62, mw = mh * medal.width / medal.height, mx = rx + tw + 18;
    ctx.drawImage(medal, mx, BY + 30, mw, mh);
    ctx.textAlign = "center"; ctx.fillStyle = "#5a3e00"; ctx.font = `800 8px ${NUN}`; ctx.fillText("TOP", mx + mw / 2, BY + 30 + 19); ctx.font = `700 15px ${FRED}`; ctx.fillText(`${topPct}%`, mx + mw / 2, BY + 30 + 34);
    ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = `700 30px ${FRED}`; ctx.fillText(`Top ${topPct}%`, mx + mw + 12, BY + 30 + 42); }
  ctx.textAlign = "left"; ctx.fillStyle = INK;
  let hs = 50; ctx.font = `800 ${hs}px ${NUN}`; const hnd = handle ? `@${handle}` : "Touch Grass";
  while (ctx.measureText(hnd).width > rw && hs > 28) { hs -= 2; ctx.font = `800 ${hs}px ${NUN}`; }
  ctx.fillText(hnd, rx, BY + 138);
  ctx.fillStyle = GREEN; ctx.font = `700 26px ${NUN}`;
  const sub = [dateStr, location].filter(Boolean).join("  ·  ");
  let st = sub; while (ctx.measureText(st).width > rw && st.length > 6) st = st.slice(0, -2); ctx.fillText(st === sub ? st : st + "…", rx, BY + 174);
  ctx.restore();
}
