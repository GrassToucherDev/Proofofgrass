// utils/passportCard.js — draws the WAGO Passport as a clean 1600×900 PNG (client only).
// Contains the selected artwork, the display name, and verified collection counts. It never contains
// a wallet address or any dashboard controls.
export const PASSPORT_W = 1600, PASSPORT_H = 900;
export const PP = { cream: "#f6ecd1", cream2: "#efe0b8", paper: "#fbf4e0", forest: "#12402a", forestMid: "#1f5c36", orange: "#ec7b1f", sun: "#f6a93b", gold: "#c9962f", ink: "#10301f", muted: "#6b5a3a" };
const SERIF = "Fraunces,'Playfair Display',Georgia,serif", SANS = "Nunito,system-ui,sans-serif";

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fit(ctx, text, maxW, start, min, weight, family) {
  let px = start; ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = `${weight} ${px}px ${family}`; }
  return px;
}
function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => res(im); im.onerror = () => rej(new Error("art failed to load")); im.src = src;
  });
}

function hills(ctx) {
  const g = ctx.createLinearGradient(0, 640, 0, PASSPORT_H);
  g.addColorStop(0, "rgba(31,92,54,0.0)"); g.addColorStop(1, "rgba(31,92,54,0.22)");
  ctx.fillStyle = g; ctx.fillRect(0, 640, PASSPORT_W, 260);
  ctx.fillStyle = "rgba(31,92,54,0.10)";
  ctx.beginPath(); ctx.moveTo(0, 820); ctx.quadraticCurveTo(300, 740, 640, 800); ctx.quadraticCurveTo(1000, 860, 1300, 770); ctx.quadraticCurveTo(1480, 730, 1600, 780); ctx.lineTo(1600, 900); ctx.lineTo(0, 900); ctx.closePath(); ctx.fill();
}

function tile(ctx, x, y, w, h, value, label) {
  ctx.fillStyle = "rgba(255,255,255,0.55)"; rr(ctx, x, y, w, h, 22); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(18,64,42,0.28)"; rr(ctx, x, y, w, h, 22); ctx.stroke();
  ctx.textAlign = "center"; ctx.fillStyle = PP.forest;
  ctx.font = `800 64px ${SERIF}`; ctx.fillText(String(value), x + w / 2, y + 74);
  ctx.fillStyle = PP.forestMid; ctx.font = `700 24px ${SANS}`; ctx.fillText(label, x + w / 2, y + 112);
}

// piece: { name, artUrl }  stats: [{ value, label }] (max 4)
export async function renderPassport({ piece, displayName, edition, stats }) {
  const W = PASSPORT_W, H = PASSPORT_H;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  try { await Promise.all([document.fonts.load(`800 80px Fraunces`), document.fonts.load(`700 24px Nunito`), document.fonts.load(`800 24px Nunito`)]); } catch {}
  const art = await loadImage(piece.artUrl);

  // paper + sunrise glow
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, PP.cream); bg.addColorStop(1, PP.cream2);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.86, H * 0.08, 20, W * 0.86, H * 0.08, 620);
  glow.addColorStop(0, "rgba(246,169,59,0.40)"); glow.addColorStop(1, "rgba(246,169,59,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  hills(ctx);

  // outer frame
  ctx.lineWidth = 6; ctx.strokeStyle = PP.gold; rr(ctx, 28, 28, W - 56, H - 56, 34); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(201,150,47,0.55)"; rr(ctx, 44, 44, W - 88, H - 88, 26); ctx.stroke();

  // artwork
  const ax = 96, ay = 96, as = 708;
  ctx.save(); ctx.shadowColor = "rgba(16,48,31,0.30)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 14;
  ctx.fillStyle = PP.forest; rr(ctx, ax - 14, ay - 14, as + 28, as + 28, 34); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, ax, ay, as, as, 24); ctx.clip();
  const s = Math.max(as / art.width, as / art.height), dw = art.width * s, dh = art.height * s;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(art, ax + (as - dw) / 2, ay + (as - dh) / 2, dw, dh); ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = PP.gold; rr(ctx, ax - 14, ay - 14, as + 28, as + 28, 34); ctx.stroke();

  // plate over the bottom of the art
  const plate = String(piece.name || "").toUpperCase();
  ctx.textAlign = "center"; const px = fit(ctx, plate, 520, 40, 24, 800, SERIF);
  const pw = Math.min(600, ctx.measureText(plate).width + 120), ph = 76, plx = ax + as / 2 - pw / 2, ply = ay + as - 54;
  ctx.fillStyle = PP.forest; rr(ctx, plx, ply, pw, ph, 20); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = PP.sun; rr(ctx, plx, ply, pw, ph, 20); ctx.stroke();
  ctx.fillStyle = "#fbf1cf"; ctx.font = `800 ${px}px ${SERIF}`; ctx.fillText(plate, ax + as / 2, ply + ph / 2 + px * 0.34);

  // right column
  const rx = 900, rw = 640, cx = rx + rw / 2;
  ctx.textAlign = "center"; ctx.fillStyle = PP.orange; ctx.font = `800 26px ${SANS}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "8px";
  ctx.fillText(String(edition || "").toUpperCase(), cx, 172);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.strokeStyle = "rgba(18,64,42,0.35)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(rx, 160); ctx.lineTo(rx + 70, 160); ctx.moveTo(rx + rw - 70, 160); ctx.lineTo(rx + rw, 160); ctx.stroke();

  ctx.fillStyle = PP.muted; ctx.font = `800 30px ${SERIF}`; ctx.fillText("WAGO PASSPORT", cx, 232);
  ctx.fillStyle = PP.forest; fit(ctx, displayName, rw, 118, 52, 800, SERIF); ctx.fillText(displayName, cx, 352);

  const list = (stats || []).slice(0, 4);
  const tw = 304, th = 138, gap = 32, top = 430;
  list.forEach((st, i) => tile(ctx, rx + (i % 2) * (tw + gap), top + Math.floor(i / 2) * (th + 26), tw, th, st.value, st.label));

  ctx.fillStyle = PP.forestMid; ctx.font = `700 24px ${SANS}`; ctx.textAlign = "center";
  ctx.fillText("proofofgrass.app/passport", cx, 808);

  return c;
}

export function canvasToBlob(c) {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png export failed"))), "image/png"));
}
