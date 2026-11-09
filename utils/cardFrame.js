// utils/cardFrame.js — shared "new style" frame for 1080×1350 share cards (sunny bg, glass panel, logo + laurel title, capsule footer).
import { loadImageSafe } from "./spotlightImage";
import { rr } from "./proofCardRender";

export const INK = "#12380a", GREEN = "#1f6b12", NUN = "Nunito,system-ui,sans-serif", FRED = "Fredoka,'Nunito',system-ui,sans-serif";
const ld = (src) => loadImageSafe(src).catch(() => null);

export function fitText(ctx, text, maxW, start, min, weight = 700, family = FRED) {
  let px = start; ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = `${weight} ${px}px ${family}`; }
  return px;
}
export function ellipsize(ctx, text, maxW) {
  let t = text; while (ctx.measureText(t).width > maxW && t.length > 4) t = t.slice(0, -2) + "…"; return t;
}
export async function loadFrameAssets(bgSrc = "/card/bg.jpg", extra = []) {
  const names = [bgSrc, "/touchgrass-logo-card.png", "/card/laurel.png", "/card/sparkles.png", "/card/mascot-side.png", "/card/cal.png", "/card/grass-l.png", "/card/grass-r.png", ...extra];
  const im = await Promise.all(names.map(ld));
  return { bg: im[0], logo: im[1], laurel: im[2], sparkles: im[3], mascot: im[4], cal: im[5], grassL: im[6], grassR: im[7], extra: im.slice(8) };
}

// Draws background, glass panel, logo, "PROOF OF GRASS" title with laurels and a spaced subtitle. Returns panel geometry.
export function drawFrame(ctx, W, H, a, subtitle) {
  const cx = W / 2, PX = 50, PY = 60, PW = W - 100, PH = 1170;
  ctx.textBaseline = "alphabetic"; ctx.letterSpacing = "0px"; ctx.textAlign = "center";
  if (a.bg) { const sc = Math.max(W / a.bg.width, H / a.bg.height); ctx.drawImage(a.bg, (W - a.bg.width * sc) / 2, (H - a.bg.height * sc) / 2, a.bg.width * sc, a.bg.height * sc); }
  else { const sk = ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, "#b9ddf6"); sk.addColorStop(0.55, "#e6f3fc"); sk.addColorStop(1, "#eaf5dc"); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H); }
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.fillStyle = "rgba(255,255,255,0.90)"; rr(ctx, PX, PY, PW, PH, 60); ctx.fill(); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.95)"; rr(ctx, PX, PY, PW, PH, 60); ctx.stroke();
  if (a.sparkles) ctx.drawImage(a.sparkles, 0, 0, W, H);
  if (a.logo) { const lw = 400, lh = lw * a.logo.height / a.logo.width; ctx.drawImage(a.logo, cx - lw / 2, PY + 24, lw, lh); }
  ctx.fillStyle = INK; ctx.font = `800 62px ${FRED}`; ctx.fillText("PROOF OF GRASS", cx, PY + 262);
  const tw = ctx.measureText("PROOF OF GRASS").width;
  if (a.laurel) { const lh = 90, lw = lh * a.laurel.width / a.laurel.height;
    ctx.drawImage(a.laurel, cx - tw / 2 - 30 - lw, PY + 206, lw, lh);
    ctx.save(); ctx.translate(cx + tw / 2 + 30 + lw, PY + 206); ctx.scale(-1, 1); ctx.drawImage(a.laurel, 0, 0, lw, lh); ctx.restore(); }
  ctx.fillStyle = GREEN; ctx.font = `800 26px ${NUN}`; ctx.letterSpacing = "9px"; ctx.fillText(subtitle, cx + 4, PY + 306); ctx.letterSpacing = "0px";
  return { cx, PX, PY, PW, PH };
}

// Footer: left capsule (mascot + label + text) and right capsule (calendar + label + text), grass tufts and url pill.
export function drawFooter(ctx, W, H, a, g, { leftLabel, leftText, rightLabel = "DATE", rightText }) {
  const { cx, PX, PY, PW, PH } = g, ch = 104, cy0 = PY + PH - ch - 28, gap = 22, lw = 540, rw = PW - 88 - lw - gap, lx = PX + 44, rx = lx + lw + gap, cyy = cy0 + ch / 2;
  const cap = (x, w) => {
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    const gr = ctx.createLinearGradient(0, cy0, 0, cy0 + ch); gr.addColorStop(0, "#fffef6"); gr.addColorStop(1, "#f6edcf"); ctx.fillStyle = gr; rr(ctx, x, cy0, w, ch, ch / 2); ctx.fill(); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = GREEN; rr(ctx, x, cy0, w, ch, ch / 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(246,185,59,.7)"; rr(ctx, x + 7, cy0 + 7, w - 14, ch - 14, ch / 2 - 7); ctx.stroke();
  };
  cap(lx, lw); cap(rx, rw);
  if (a.mascot) { const mh = 112, mw = mh * a.mascot.width / a.mascot.height; ctx.drawImage(a.mascot, lx + 14, cyy - mh / 2 - 12, mw, mh); }
  ctx.textAlign = "left";
  const label = (t, x) => { ctx.fillStyle = GREEN; ctx.font = `800 18px ${NUN}`; ctx.letterSpacing = "4px"; ctx.fillText(t, x, cyy - 14); ctx.letterSpacing = "0px"; };
  const tx = lx + 140, maxL = lx + lw - 36 - tx;
  label(leftLabel, tx); fitText(ctx, leftText, maxL, 44, 26); ctx.fillStyle = INK; ctx.fillText(ellipsize(ctx, leftText, maxL), tx, cyy + 34);
  if (a.cal) { const h2 = 60; ctx.drawImage(a.cal, rx + 26, cyy - h2 / 2, h2 * a.cal.width / a.cal.height, h2); }
  const tx2 = rx + 106, maxR = rw - 106 - 24;
  label(rightLabel, tx2); fitText(ctx, rightText, maxR, 38, 24); ctx.fillStyle = INK; ctx.fillText(ellipsize(ctx, rightText, maxR), tx2, cyy + 34);
  if (a.grassL) { const gh = 170, gw = gh * a.grassL.width / a.grassL.height; ctx.drawImage(a.grassL, PX - 50, H - gh + 16, gw, gh); }
  if (a.grassR) { const gh = 170, gw = gh * a.grassR.width / a.grassR.height; ctx.drawImage(a.grassR, W - PX + 50 - gw, H - gh + 16, gw, gh); }
  ctx.textAlign = "center"; ctx.font = `800 20px ${NUN}`; ctx.letterSpacing = "3px";
  const uw = ctx.measureText("START YOUR STREAK  ·  PROOFOFGRASS.APP").width + 40; ctx.fillStyle = "rgba(253,246,226,.92)"; rr(ctx, cx - uw / 2, H - 56, uw, 38, 19); ctx.fill();
  ctx.fillStyle = GREEN; ctx.fillText("START YOUR STREAK  ·  PROOFOFGRASS.APP", cx + 2, H - 29); ctx.letterSpacing = "0px";
}
export const todayStr = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
