// utils/shareHeader.js — the Spotlight-announcement header (Touch Grass mascot + bubble title on a sky strip)
// shared by every share card. Occupies y 28–178 of a 1080-wide canvas.
import { loadImageSafe } from "./spotlightImage";

const GREEN = "#1f6b12";
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

export const HEADER_BOTTOM = 178;

export async function drawShareHeader(ctx, W, line1, line2) {
  const BX = 40, BY = 28, BW = W - 80, BH = 150;
  ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.25)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  const sg = ctx.createLinearGradient(0, BY, 0, BY + BH); sg.addColorStop(0, "#6ec0f2"); sg.addColorStop(0.7, "#bfe6fa"); sg.addColorStop(1, "#8fd24a");
  ctx.fillStyle = sg; rr(ctx, BX, BY, BW, BH, 60); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, BX, BY, BW, BH, 60); ctx.clip();
  ctx.fillStyle = "#5fb52a"; ctx.beginPath(); ctx.moveTo(BX, BY + BH - 20); ctx.quadraticCurveTo(BX + 250, BY + BH - 40, BX + 520, BY + BH - 22);
  ctx.quadraticCurveTo(BX + 800, BY + BH - 4, BX + BW, BY + BH - 24); ctx.lineTo(BX + BW, BY + BH); ctx.lineTo(BX, BY + BH); ctx.fill();
  ctx.fillStyle = "#fff"; [[BX + 560, BY + BH - 16], [BX + 900, BY + BH - 15]].forEach(([fx, fy]) => { ctx.beginPath(); ctx.arc(fx, fy, 6, 0, 7); ctx.fill(); });
  try {
    const frame = await loadImageSafe("/spotlight-frame.webp");
    const sw = 486, sh = 232, sc = (BH - 6) / sh, w = Math.round(sw * sc), h = Math.round(sh * sc);
    const oc = document.createElement("canvas"); oc.width = w; oc.height = h; const o = oc.getContext("2d");
    o.drawImage(frame, 125, 18, sw, sh, 0, 0, w, h);
    o.globalCompositeOperation = "destination-out";
    const m = o.createLinearGradient(w - 40, 0, w, 0); m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(1, "rgba(0,0,0,1)");
    o.fillStyle = m; o.fillRect(w - 40, 0, 40, h);
    ctx.drawImage(oc, BX + 6, BY + 3);
  } catch {
    try { const logo = await loadImageSafe("/touchgrass-transparent.png"); ctx.drawImage(logo, BX + 60, BY + 20, 110, 110); } catch {}
  }
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = GREEN; rr(ctx, BX, BY, BW, BH, 60); ctx.stroke();
  const bubble = (txt, x, y, fill) => {
    let px = 56; ctx.font = `700 ${px}px 'Fredoka',system-ui,sans-serif`;
    while (ctx.measureText(txt).width > 520 && px > 30) { px -= 2; ctx.font = `700 ${px}px 'Fredoka',system-ui,sans-serif`; }
    ctx.lineJoin = "round"; ctx.lineWidth = 14; ctx.strokeStyle = "#0f4a08"; ctx.strokeText(txt, x, y);
    ctx.fillStyle = fill; ctx.fillText(txt, x, y);
  };
  const tx = BX + 710;
  bubble(line1, tx, BY + 72, "#fff8e0"); bubble(line2, tx, BY + 128, "#9be83a");
  ctx.restore();
}
