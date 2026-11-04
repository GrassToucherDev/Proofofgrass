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

// Glossy pill: gradient body, coloured rim, soft shadow, top highlight and an inner light rim.
function glossPill(c, x, y, w, h, pal, r = h / 2) {
  c.save(); c.shadowColor = "rgba(20,40,10,.28)"; c.shadowBlur = 16; c.shadowOffsetY = 6;
  let g;
  if (pal.rainbow) { g = c.createLinearGradient(x, 0, x + w, 0); ["#ffd1f0", "#d6c4ff", "#bfe4ff", "#c8f7d4", "#fff3b0"].forEach((col, i, arr) => g.addColorStop(i / (arr.length - 1), col)); }
  else { g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, pal.a); g.addColorStop(1, pal.b); }
  c.fillStyle = g; rr(c, x, y, w, h, r); c.fill(); c.restore();
  c.save(); rr(c, x, y, w, h, r); c.clip();
  const hl = c.createLinearGradient(0, y, 0, y + h * 0.55); hl.addColorStop(0, "rgba(255,255,255,.60)"); hl.addColorStop(1, "rgba(255,255,255,.04)");
  c.fillStyle = hl; c.fillRect(x, y, w, h * 0.55); c.restore();
  c.lineWidth = 4; c.strokeStyle = pal.bd; rr(c, x, y, w, h, r); c.stroke();
  c.lineWidth = 2; c.strokeStyle = "rgba(255,255,255,.55)"; rr(c, x + 6, y + 6, w - 12, h - 12, Math.max(4, r - 6)); c.stroke();
}
const TIER_PAL = [null,
  { a: "#c9f27d", b: "#6fc02f", bd: "#3f8a16", tx: "#12380a" }, { a: "#9fe58a", b: "#2fa84a", bd: "#1b6e30", tx: "#0b3016" },
  { a: "#f7f9fb", b: "#b9c4d0", bd: "#8a97a6", tx: "#25303c" }, { a: "#fff0b8", b: "#f2c14e", bd: "#d9a82c", tx: "#5a3e00" },
  { a: "#ffe08a", b: "#e8a21c", bd: "#b97a0c", tx: "#4a2e00" }, { a: "#e2c4ff", b: "#9a5be6", bd: "#6a30b8", tx: "#ffffff", dark: true },
  { a: "#a9d8ff", b: "#3b86e8", bd: "#1f56b3", tx: "#ffffff", dark: true }, { a: "#fffdf0", b: "#f3dd90", bd: "#d1b251", tx: "#5a3e00" },
  { rainbow: true, bd: "#b38be0", tx: "#3d1f6e" }];

// opts: { photo: HTMLImageElement, streak, dateStr, topPct, location }
export async function drawProofCard(ctx, W, H, opts) {
  const { photo, streak, dateStr, topPct, location } = opts;
  try { await Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]); } catch {}
  const tierName = tierFor(streak), tierIdx = ["ROOTED", "LOCKED IN", "ELITE", "LEGENDARY", "IMMORTAL", "MYTHIC", "ETERNAL", "ASCENDED", "TRANSCENDENT"].indexOf(tierName) + 1;
  const bgSrc = streak >= 365 ? "/card/bg-night.jpg" : streak >= 100 ? "/card/bg-sunset.jpg" : "/card/bg.jpg";
  const [mainLogo, bgImg, mascotImg, laurelImg, grassL, grassR, sparkles, cornerImg, pinImg, calImg, medalImg, shieldImg] = await Promise.all([
    load("/touchgrass-logo-card.png"), load(bgSrc), load("/card/mascot-side.png"), load("/card/laurel.png"), load("/card/grass-l.png"), load("/card/grass-r.png"),
    load("/card/sparkles.png"), load("/card/corner.png"), load("/card/pin.png"), load("/card/cal.png"), load("/card/medal.png"), tierIdx ? load(`/card/tier-${tierIdx}.png`) : (streak >= 1 && streak < 7 ? load("/card/tier-1.png") : Promise.resolve(null))]);
  LAUREL = laurelImg;
  ctx.save(); ctx.letterSpacing = "0px"; ctx.textBaseline = "alphabetic";

  // background art (sky, meadow, sun) with a plain-gradient fallback
  if (bgImg) ctx.drawImage(bgImg, 0, 0, W, H);
  else { const sk = ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, "#b9ddf6"); sk.addColorStop(0.55, "#e6f3fc"); sk.addColorStop(1, "#eaf5dc"); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H); }

  // glass panel
  const PX = 70, PY = 80, PW = W - 140, PH = 1040 + (H - 1200);
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
  ctx.fillStyle = INK; ctx.font = `800 76px ${FRED}`; ctx.fillText("PROOF OF GRASS", 1090, PY + 126);
  const tw = ctx.measureText("PROOF OF GRASS").width;
  laurel(ctx, 1090 - tw / 2 - 44, PY + 98, false, 1.0); laurel(ctx, 1090 + tw / 2 + 44, PY + 98, true, 1.0);
  ctx.fillStyle = GREEN; ctx.font = `800 28px ${NUN}`; ctx.letterSpacing = "10px"; ctx.fillText("VERIFIED OUTDOORS", 1100, PY + 176); ctx.letterSpacing = "0px";
  ctx.fillRect(742, PY + 166, 70, 3); ctx.fillRect(1388, PY + 166, 70, 3);

  // photo
  const FX = PX + 56, FY = PY + 250, FW = 840, FH = 590 + (H - 1200);
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
  glossPill(ctx, RX, FY, RW, 76, { a: "#9be85a", b: "#4fb21a", bd: "#2f7d10" });
  ctx.save(); ctx.font = `700 38px ${FRED}`; const vw = ctx.measureText("Verified Outdoors").width, vgap = 18, vcir = 50, vx = RC - (vcir + vgap + vw) / 2;
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(vx + vcir / 2, FY + 38, vcir / 2, 0, 7); ctx.fill();
  ctx.strokeStyle = "#3f9a14"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(vx + 13, FY + 39); ctx.lineTo(vx + 22, FY + 48); ctx.lineTo(vx + 38, FY + 29); ctx.stroke();
  ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(20,70,10,.5)"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 2;
  ctx.fillText("Verified Outdoors", vx + vcir + vgap, FY + 51); ctx.restore();

  // DAY + number, fitted to the column
  ctx.textAlign = "left";
  const num = String(streak); let ns = 180;
  const fit = () => { ctx.font = `700 ${Math.round(ns * 0.62)}px ${FRED}`; const dw = ctx.measureText("DAY ").width; ctx.font = `700 ${ns}px ${FRED}`; return dw + ctx.measureText(num).width; };
  while (fit() > RW && ns > 70) ns -= 6;
  ctx.font = `700 ${Math.round(ns * 0.62)}px ${FRED}`; const dayW = ctx.measureText("DAY ").width;
  ctx.font = `700 ${ns}px ${FRED}`; const numW = ctx.measureText(num).width;
  const sx = RC - (dayW + numW) / 2, by = FY + 250 + Math.round((H - 1200) * 0.25);
  ctx.font = `700 ${Math.round(ns * 0.62)}px ${FRED}`; ctx.fillStyle = INK; ctx.fillText("DAY ", sx, by);
  ctx.font = `700 ${ns}px ${FRED}`; ctx.fillStyle = LIME; ctx.fillText(num, sx + dayW, by);
  ctx.textAlign = "center"; ctx.fillStyle = GREEN; ctx.font = `800 28px ${NUN}`; ctx.letterSpacing = "8px"; ctx.fillText("CURRENT STREAK", RC, by + 56); ctx.letterSpacing = "0px";

  let y = by + 92;
  const tier = tierFor(streak);
  const newcomer = !tier && streak >= 1 && streak < 7;
  if (tier) {
    const pal = TIER_PAL[tierIdx] || TIER_PAL[4];
    glossPill(ctx, RX, y, RW, 88, pal);
    const tsz = tier.length > 9 ? 38 : 46; ctx.font = `700 ${tsz}px ${FRED}`;
    const sh = 112, sw = shieldImg ? sh * shieldImg.width / shieldImg.height : 0;
    if (shieldImg) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.drawImage(shieldImg, RX + 16, y + 44 - sh / 2, sw, sh); ctx.restore(); }
    ctx.save(); ctx.fillStyle = pal.tx; if (pal.dark) { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowOffsetY = 2; } else { ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2; }
    ctx.letterSpacing = "2px"; ctx.fillText(tier, RX + 16 + sw + (RW - 16 - sw) / 2 + 1, y + 60); ctx.restore();
    y += 112;
  }
  if (newcomer) {
    const pal = { a: "#b8f0e6", b: "#4fcfb4", bd: "#1f8f7a", tx: "#06342c" };
    glossPill(ctx, RX, y, RW, 88, pal);
    const bx = RX + 16 + 44, byc = y + 44;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    const bg = ctx.createLinearGradient(0, byc - 44, 0, byc + 44); bg.addColorStop(0, "#c8f27a"); bg.addColorStop(1, "#4fb21a");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, byc, 44, 0, 7); ctx.fill(); ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(bx, byc, 41, 0, 7); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = "#2f7d10"; ctx.beginPath(); ctx.arc(bx, byc, 46, 0, 7); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, byc + 22); ctx.quadraticCurveTo(bx + 1, byc + 4, bx, byc - 6); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(bx - 14, byc - 8, 15, 8, -0.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx + 14, byc - 14, 15, 8, 0.6, 0, 7); ctx.fill();
    ctx.save(); ctx.font = `700 46px ${FRED}`; ctx.textAlign = "center"; ctx.fillStyle = pal.tx; ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2;
    ctx.letterSpacing = "2px"; ctx.fillText("NEWCOMER", RX + 16 + 88 + (RW - 16 - 88) / 2 + 1, y + 60); ctx.restore();
    y += 112;
    // next badge progress
    const mh = 100, mw = shieldImg ? mh * shieldImg.width / shieldImg.height : 0, gx = 22, tx = 300, x0 = RC - (mw + gx + tx) / 2, left = 7 - streak;
    if (shieldImg) ctx.drawImage(shieldImg, x0, y, mw, mh);
    const tx0 = x0 + mw + gx;
    ctx.textAlign = "left"; ctx.fillStyle = GREEN; ctx.font = `800 22px ${NUN}`; ctx.letterSpacing = "4px"; ctx.fillText("NEXT BADGE", tx0, y + 24); ctx.letterSpacing = "0px";
    ctx.fillStyle = INK; ctx.font = `700 38px ${FRED}`; ctx.fillText(`Rooted in ${left} day${left === 1 ? "" : "s"}`, tx0, y + 64);
    ctx.fillStyle = "rgba(31,107,18,.18)"; rr(ctx, tx0, y + 78, tx, 16, 8); ctx.fill();
    const pg = ctx.createLinearGradient(tx0, 0, tx0 + tx, 0); pg.addColorStop(0, "#9be85a"); pg.addColorStop(1, "#4fb21a");
    ctx.fillStyle = pg; rr(ctx, tx0, y + 78, Math.max(16, tx * streak / 7), 16, 8); ctx.fill();
    ctx.textAlign = "center"; y += 112;
  }
  if (topPct) {
    const mh = 100, mw = medalImg ? mh * medalImg.width / medalImg.height : 0, gx = 22, tx = 300; // text block ~300 wide
    const x0 = RC - (mw + gx + tx) / 2;
    if (medalImg) {
      ctx.drawImage(medalImg, x0, y, mw, mh);
      ctx.textAlign = "center"; ctx.fillStyle = "#5a3e00"; ctx.font = `800 12px ${NUN}`; ctx.fillText("TOP", x0 + mw / 2, y + 31);
      ctx.font = `700 23px ${FRED}`; ctx.fillText(`${topPct}%`, x0 + mw / 2, y + 54);
    }
    ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = `700 40px ${FRED}`; ctx.fillText(`Top ${topPct}%`, x0 + mw + gx, y + 44);
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

  // footer: two matching capsules (certified by | date)
  const cy0 = PY + PH - 152, chh = 118, lw = RX - 36 - FX;
  const capsule = (x, w) => {
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    const g = ctx.createLinearGradient(0, cy0, 0, cy0 + chh); g.addColorStop(0, "#fffef6"); g.addColorStop(1, "#f6edcf"); ctx.fillStyle = g; rr(ctx, x, cy0, w, chh, 59); ctx.fill(); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = GREEN; rr(ctx, x, cy0, w, chh, 59); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(246,185,59,.7)"; rr(ctx, x + 7, cy0 + 7, w - 14, chh - 14, 52); ctx.stroke();
  };
  capsule(FX, lw); capsule(RX, RW);
  const cy = cy0 + chh / 2;
  // side-view mascot (pops slightly above the capsule)
  if (mascotImg) { const mh = 132, mw = mh * mascotImg.width / mascotImg.height; ctx.save(); ctx.shadowColor = "rgba(0,0,0,.18)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; ctx.drawImage(mascotImg, FX + 22, cy - mh / 2 - 8, mw, mh); ctx.restore(); }
  ctx.textAlign = "left"; ctx.fillStyle = GREEN; ctx.font = `800 22px ${NUN}`; ctx.letterSpacing = "6px"; ctx.fillText("CERTIFIED BY", FX + 200, cy - 16); ctx.letterSpacing = "0px";
  ctx.fillStyle = INK; ctx.font = `700 52px ${FRED}`; ctx.fillText("Touch Grass", FX + 200, cy + 36);
  // verified seal at the capsule's right end
  const sealX = FX + lw - 76; ctx.fillStyle = LIME; ctx.beginPath(); ctx.arc(sealX, cy, 32, 0, 7); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "#2f7d10"; ctx.stroke();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(sealX - 13, cy + 1); ctx.lineTo(sealX - 4, cy + 10); ctx.lineTo(sealX + 14, cy - 10); ctx.stroke();
  // date
  if (calImg) ctx.drawImage(calImg, RX + 34, cy - 34, 68, 68);
  ctx.fillStyle = GREEN; ctx.font = `800 22px ${NUN}`; ctx.letterSpacing = "3px"; ctx.fillText("DATE CERTIFIED", RX + 124, cy - 16); ctx.letterSpacing = "0px";
  ctx.fillStyle = INK; ctx.font = `700 52px ${FRED}`; ctx.fillText(dateStr || "", RX + 124, cy + 36);

  // grass tufts framing the bottom corners
  if (grassL) { const gh = 190, gw = gh * grassL.width / grassL.height; ctx.drawImage(grassL, PX - 56, H - gh + 16, gw, gh); }
  if (grassR) { const gh = 190, gw = gh * grassR.width / grassR.height; ctx.drawImage(grassR, W - PX + 56 - gw, H - gh + 16, gw, gh); }
  ctx.textAlign = "center"; ctx.font = `800 24px ${NUN}`; ctx.letterSpacing = "4px";
  const uw = ctx.measureText("PROOFOFGRASS.APP").width + 44; ctx.fillStyle = "rgba(253,246,226,.9)"; rr(ctx, W / 2 - uw / 2, H - 58, uw, 40, 20); ctx.fill();
  ctx.fillStyle = GREEN; ctx.fillText("PROOFOFGRASS.APP", W / 2 + 2, H - 30);
  ctx.restore();
}
