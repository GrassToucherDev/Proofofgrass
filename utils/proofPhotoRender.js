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
  const logo = await ld("/touchgrass-logo-card.png");
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
  if (logo) { const lw = 330, lh = lw * logo.height / logo.width; // no chip: the logo sits straight on the photo with a soft shadow
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4; ctx.drawImage(logo, W - M - lw, M - 6, lw, lh); ctx.restore(); }

  // bottom glass name plate: slim, translucent, sized to its content and tucked in the bottom-left.
  const BH = 136, BX = M, BY = H - M - BH;
  const num = String(streak), hnd = handle ? `@${handle}` : "Touch Grass", sub = [dateStr, location].filter(Boolean).join("  ·  ");
  ctx.textAlign = "left";
  ctx.font = `700 34px ${FRED}`; const dayW = ctx.measureText("DAY ").width; ctx.font = `700 66px ${FRED}`; const numW = ctx.measureText(num).width;
  const PADL = 52, PADR = 52, GAP = 36, maxText = W - M * 2 - PADL - dayW - numW - 40 - 3 - GAP - PADR;
  let hs = 46; ctx.font = `800 ${hs}px ${NUN}`; while (ctx.measureText(hnd).width > maxText && hs > 26) { hs -= 2; ctx.font = `800 ${hs}px ${NUN}`; }
  const hndW = ctx.measureText(hnd).width;
  ctx.font = `700 26px ${NUN}`; let st = sub; while (ctx.measureText(st).width > maxText && st.length > 6) st = st.slice(0, -2); if (st !== sub) st += "…";
  const subW = ctx.measureText(st).width, textW = Math.max(hndW, subW);
  const BW = Math.min(W - M * 2, PADL + dayW + numW + 40 + 3 + GAP + textW + PADR);
  // frosted glass: the photo behind the plate is blurred (where the browser supports ctx.filter), then lightly tinted white
  const frosted = photo && typeof ctx.filter === "string";
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.14)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6; ctx.fillStyle = frosted ? "rgba(255,255,255,.01)" : "rgba(255,255,255,.55)"; rr(ctx, BX, BY, BW, BH, 68); ctx.fill(); ctx.restore();
  if (frosted) {
    ctx.save(); rr(ctx, BX, BY, BW, BH, 68); ctx.clip();
    ctx.filter = "blur(16px)";
    const sc = Math.max(W / photo.width, H / photo.height), dw = photo.width * sc, dh = photo.height * sc; ctx.drawImage(photo, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.filter = "none"; ctx.fillStyle = "rgba(255,255,255,.34)"; ctx.fillRect(BX, BY, BW, BH);
    const sheen = ctx.createLinearGradient(0, BY, 0, BY + BH); sheen.addColorStop(0, "rgba(255,255,255,.28)"); sheen.addColorStop(0.55, "rgba(255,255,255,0)"); ctx.fillStyle = sheen; ctx.fillRect(BX, BY, BW, BH);
    ctx.restore();
  }
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.75)"; rr(ctx, BX, BY, BW, BH, 68); ctx.stroke();
  const gx = BX + PADL, gy = BY + BH / 2 + 22;
  ctx.font = `700 34px ${FRED}`; ctx.fillStyle = INK; ctx.fillText("DAY ", gx, gy);
  ctx.font = `700 66px ${FRED}`; ctx.fillStyle = LIME; ctx.fillText(num, gx + dayW, gy);
  const dx = gx + dayW + numW + 40; ctx.fillStyle = "rgba(31,107,18,.28)"; ctx.fillRect(dx, BY + 28, 3, BH - 56);
  const rx = dx + 3 + GAP;
  ctx.fillStyle = INK; ctx.font = `800 ${hs}px ${NUN}`; ctx.fillText(hnd, rx, BY + 66);
  ctx.fillStyle = GREEN; ctx.font = `700 26px ${NUN}`; ctx.fillText(st, rx, BY + 106);
  ctx.restore();
}
