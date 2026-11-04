// utils/proofCardRender.js — the bright "Verified Outdoors" result card (1600×1200, 4:3).
// Used for the Classic theme. Premium themes keep the original dark photo card.
const GREEN = "#1f6b12", LIME = "#4fb21a", INK = "#12380a", SERIF = "Georgia,'Times New Roman',serif";
const FRED = "Fredoka,'Nunito',system-ui,sans-serif", NUN = "Nunito,system-ui,sans-serif";

const rr = (c, x, y, w, h, r) => {
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
};
const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

export function tierFor(streak) {
  return streak >= 1000 ? "TRANSCENDENT" : streak >= 500 ? "ASCENDED" : streak >= 365 ? "ETERNAL" : streak >= 180 ? "MYTHIC" : streak >= 100 ? "IMMORTAL"
    : streak >= 50 ? "LEGENDARY" : streak >= 30 ? "ELITE" : streak >= 14 ? "LOCKED IN" : streak >= 7 ? "ROOTED" : null;
}

// Laurel branch image (opens to the right); mirrored for the right-hand side. (cx,cy) = centre, h = height.
let LAUREL = null;
function laurel(c, cx, cy, flip, sz = 1) {
  if (!LAUREL) return;
  const h = 110 * sz, w = h * LAUREL.width / LAUREL.height;
  c.save(); c.translate(cx, cy); c.scale(flip ? -1 : 1, 1); c.drawImage(LAUREL, -w / 2, -h / 2, w, h); c.restore();
}

// opts: { photo: HTMLImageElement, streak, dateStr, topPct, location }
export async function drawProofCard(ctx, W, H, opts) {
  const { photo, streak, dateStr, topPct, location } = opts;
  try { await Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]); } catch {}
  const tierName = tierFor(streak), tierIdx = ["ROOTED", "LOCKED IN", "ELITE", "LEGENDARY", "IMMORTAL", "MYTHIC", "ETERNAL", "ASCENDED", "TRANSCENDENT"].indexOf(tierName) + 1;
  const bgSrc = streak >= 365 ? "/card/bg-night.jpg" : streak >= 100 ? "/card/bg-sunset.jpg" : "/card/bg.jpg";
  const [mainLogo, bgImg, logo, laurelImg, grassL, grassR, sparkles, cornerImg, pinImg, calImg, medalImg, shieldImg] = await Promise.all([
    load("/touchgrass-logo-card.png"), load(bgSrc), load("/images/touchgrass-token.png"), load("/card/laurel.png"), load("/card/grass-l.png"), load("/card/grass-r.png"),
    load("/card/sparkles.png"), load("/card/corner.png"), load("/card/pin.png"), load("/card/cal.png"), load("/card/medal.png"), tierIdx ? load(`/card/tier-${tierIdx}.png`) : Promise.resolve(null)]);
  LAUREL = laurelImg;
  ctx.save(); ctx.letterSpacing = "0px"; ctx.textBaseline = "alphabetic";

  // background art (sky, meadow, sun) with a plain-gradient fallback
  if (bgImg) ctx.drawImage(bgImg, 0, 0, W, H);
  else { const sk = ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, "#b9ddf6"); sk.addColorStop(0.55, "#e6f3fc"); sk.addColorStop(1, "#eaf5dc"); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H); }

  // glass panel
  const PX = 70, PY = 80, PW = W - 140, PH = 1040;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.fillStyle = "rgba(255,255,255,0.90)"; rr(ctx, PX, PY, PW, PH, 64); ctx.fill(); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.95)"; rr(ctx, PX, PY, PW, PH, 64); ctx.stroke();
  // hills inside the panel bottom
  ctx.save(); rr(ctx, PX, PY, PW, PH, 64); ctx.clip();
  ctx.fillStyle = "rgba(125,200,50,0.16)"; ctx.beginPath(); ctx.ellipse(W * 0.72, PY + PH + 30, 760, 120, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(125,200,50,0.12)"; ctx.beginPath(); ctx.ellipse(W * 0.25, PY + PH + 50, 700, 100, 0, 0, 7); ctx.fill();
  ctx.restore();
  if (sparkles) ctx.drawImage(sparkles, 0, 0, W, H);

  // header: mascot + wordmark | title
  if (mainLogo) { // official Touch Grass logo
    const lw = 440, lh = lw * mainLogo.height / mainLogo.width;
    ctx.drawImage(mainLogo, PX + 56 + (500 - lw) / 2, PY + 40 + (170 - lh) / 2, lw, lh);
  }
  ctx.fillStyle = "rgba(31,107,18,.35)"; ctx.fillRect(612, PY + 60, 3, 130);
  ctx.textAlign = "center";
  ctx.fillStyle = INK; ctx.font = `800 76px ${SERIF}`; ctx.fillText("PROOF OF GRASS", 1090, PY + 126);
  const tw = ctx.measureText("PROOF OF GRASS").width;
  laurel(ctx, 1090 - tw / 2 - 44, PY + 98, false, 1.0); laurel(ctx, 1090 + tw / 2 + 44, PY + 98, true, 1.0);
  ctx.fillStyle = GREEN; ctx.font = `800 28px ${NUN}`; ctx.letterSpacing = "10px"; ctx.fillText("VERIFIED OUTDOORS", 1100, PY + 176); ctx.letterSpacing = "0px";
  ctx.fillRect(742, PY + 166, 70, 3); ctx.fillRect(1388, PY + 166, 70, 3);

  // photo
  const FX = PX + 56, FY = PY + 250, FW = 780, FH = 590;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,.28)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10; ctx.fillStyle = "#fff"; rr(ctx, FX - 8, FY - 8, FW + 16, FH + 16, 46); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, FX, FY, FW, FH, 40); ctx.clip();
  if (photo) { const sc = Math.max(FW / photo.width, FH / photo.height), dw = photo.width * sc, dh = photo.height * sc; ctx.drawImage(photo, FX + (FW - dw) / 2, FY + (FH - dh) / 2, dw, dh); }
  else { ctx.fillStyle = "#cfe8b8"; ctx.fillRect(FX, FY, FW, FH); }
  ctx.restore();

  // glossy corner ornaments on the photo frame
  if (cornerImg) {
    const cw0 = 96, ch0 = cw0 * cornerImg.height / cornerImg.width;
    [[FX - 14, FY - 14, 1, 1], [FX + FW + 14, FY - 14, -1, 1], [FX - 14, FY + FH + 14, 1, -1], [FX + FW + 14, FY + FH + 14, -1, -1]].forEach(([x0, y0, sx, sy]) => {
      ctx.save(); ctx.translate(x0, y0); ctx.scale(sx, sy); ctx.drawImage(cornerImg, 0, 0, cw0, ch0); ctx.restore();
    });
  }

  // right column
  const RX = FX + FW + 60, RW = PX + PW - 56 - RX, RC = RX + RW / 2;
  ctx.save(); const pg = ctx.createLinearGradient(0, FY, 0, FY + 70); pg.addColorStop(0, "#f4fbe9"); pg.addColorStop(1, "#dcf0c4");
  ctx.fillStyle = pg; rr(ctx, RX, FY, RW, 72, 36); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(125,200,50,.55)"; ctx.stroke(); ctx.restore();
  ctx.fillStyle = LIME; ctx.beginPath(); ctx.arc(RX + 52, FY + 36, 24, 0, 7); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(RX + 41, FY + 37); ctx.lineTo(RX + 49, FY + 45); ctx.lineTo(RX + 64, FY + 28); ctx.stroke();
  ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = `800 34px ${NUN}`; ctx.fillText("Verified Outdoors", RX + 96, FY + 48);

  // DAY + number, fitted to the column
  const num = String(streak); let ns = 180;
  const fit = () => { ctx.font = `italic 800 ${Math.round(ns * 0.62)}px ${SERIF}`; const dw = ctx.measureText("DAY ").width; ctx.font = `italic 800 ${ns}px ${SERIF}`; return dw + ctx.measureText(num).width; };
  while (fit() > RW && ns > 70) ns -= 6;
  ctx.font = `italic 800 ${Math.round(ns * 0.62)}px ${SERIF}`; const dayW = ctx.measureText("DAY ").width;
  ctx.font = `italic 800 ${ns}px ${SERIF}`; const numW = ctx.measureText(num).width;
  const sx = RC - (dayW + numW) / 2, by = FY + 250;
  ctx.font = `italic 800 ${Math.round(ns * 0.62)}px ${SERIF}`; ctx.fillStyle = INK; ctx.fillText("DAY ", sx, by);
  ctx.font = `italic 800 ${ns}px ${SERIF}`; ctx.fillStyle = LIME; ctx.fillText(num, sx + dayW, by);
  ctx.textAlign = "center"; ctx.fillStyle = GREEN; ctx.font = `800 28px ${NUN}`; ctx.letterSpacing = "8px"; ctx.fillText("CURRENT STREAK", RC, by + 56); ctx.letterSpacing = "0px";

  let y = by + 92;
  const tier = tierFor(streak);
  if (tier) {
    ctx.save(); const tg = ctx.createLinearGradient(0, y, 0, y + 84); tg.addColorStop(0, "#fff0b8"); tg.addColorStop(1, "#f2c14e");
    ctx.shadowColor = "rgba(184,150,46,.35)"; ctx.shadowBlur = 14; ctx.fillStyle = tg; rr(ctx, RX, y, RW, 84, 42); ctx.fill(); ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = "#d9a82c"; rr(ctx, RX, y, RW, 84, 42); ctx.stroke();
    const tsz = tier.length > 9 ? 36 : 44; ctx.fillStyle = "#5a3e00"; ctx.font = `italic 800 ${tsz}px ${SERIF}`;
    const sh = 104, sw = shieldImg ? sh * shieldImg.width / shieldImg.height : 0;
    if (shieldImg) ctx.drawImage(shieldImg, RX + 14, y + 42 - sh / 2, sw, sh);
    ctx.fillText(tier, RX + 14 + sw + (RW - 14 - sw) / 2, y + 58);
    y += 108;
  }
  if (topPct) {
    const mh = 100, mw = medalImg ? mh * medalImg.width / medalImg.height : 0, gx = 22, tx = 300; // text block ~300 wide
    const x0 = RC - (mw + gx + tx) / 2;
    if (medalImg) {
      ctx.drawImage(medalImg, x0, y, mw, mh);
      ctx.textAlign = "center"; ctx.fillStyle = "#5a3e00"; ctx.font = `800 12px ${NUN}`; ctx.fillText("TOP", x0 + mw / 2, y + 31);
      ctx.font = `italic 800 23px ${SERIF}`; ctx.fillText(`${topPct}%`, x0 + mw / 2, y + 54);
    }
    ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = `italic 800 40px ${SERIF}`; ctx.fillText(`Top ${topPct}%`, x0 + mw + gx, y + 44);
    ctx.fillStyle = GREEN; ctx.font = `800 24px ${NUN}`; ctx.fillText("of all Grass Touchers", x0 + mw + gx, y + 80);
    ctx.textAlign = "center"; y += 112;
  }
  ctx.fillStyle = "rgba(31,107,18,.18)"; ctx.fillRect(RX, y, RW, 3); y += 46;
  if (location) {
    ctx.textAlign = "left"; ctx.font = `800 34px ${NUN}`; ctx.fillStyle = INK;
    let t = location; while (ctx.measureText(t).width > RW - 60 && t.length > 4) t = t.slice(0, -2);
    if (pinImg) ctx.drawImage(pinImg, RX + 8, y - 34, 34 * pinImg.width / pinImg.height, 34);
    ctx.fillText(t === location ? t : t + "…", RX + 58, y);
  }

  // footer: certified + date
  const bY = PY + PH - 112;
  ctx.fillStyle = "rgba(31,107,18,.18)"; ctx.fillRect(FX, bY - 34, PW - 112, 3);
  if (logo) ctx.drawImage(logo, FX + 40, bY - 8, 96, 96);
  ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = `italic 700 40px ${SERIF}`; ctx.fillText("Certified by ", FX + 164, bY + 50);
  const cw = ctx.measureText("Certified by ").width; ctx.fillStyle = LIME; ctx.font = `italic 800 44px ${SERIF}`; ctx.fillText("Touch Grass", FX + 164 + cw, bY + 50);
  ctx.fillStyle = "rgba(31,107,18,.35)"; ctx.fillRect(RX - 20, bY, 3, 80);
  if (calImg) ctx.drawImage(calImg, RX + 6, bY + 12, 58, 58);
  ctx.fillStyle = GREEN; ctx.font = `800 24px ${NUN}`; ctx.fillText("Date of Certification", RX + 84, bY + 28);
  ctx.fillStyle = INK; ctx.font = `800 40px ${NUN}`; ctx.fillText(dateStr || "", RX + 84, bY + 72);

  // grass tufts framing the bottom corners
  if (grassL) { const gh = 190, gw = gh * grassL.width / grassL.height; ctx.drawImage(grassL, PX - 56, H - gh + 16, gw, gh); }
  if (grassR) { const gh = 190, gw = gh * grassR.width / grassR.height; ctx.drawImage(grassR, W - PX + 56 - gw, H - gh + 16, gw, gh); }
  ctx.textAlign = "center"; ctx.font = `800 24px ${NUN}`; ctx.letterSpacing = "4px";
  const uw = ctx.measureText("PROOFOFGRASS.APP").width + 44; ctx.fillStyle = "rgba(253,246,226,.9)"; rr(ctx, W / 2 - uw / 2, H - 58, uw, 40, 20); ctx.fill();
  ctx.fillStyle = GREEN; ctx.fillText("PROOFOFGRASS.APP", W / 2 + 2, H - 30);
  ctx.restore();
}
