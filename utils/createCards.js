// Canvas helpers for the /create cards (memes, achievement and cover cards). One light, sunny look that matches the app.
export const BRAND = { forest: "#0d2a05", mid: "#1a4a0a", dark: "#3d7a12", grass: "#5ba622", lime: "#7dc832", gold: "#b8760a", goldBright: "#e8a020" };

// Scene palettes: sky top to bottom, then two hill greens.
export const SCENES = {
  day:     { sky: ["#a8d4f0", "#d4ecf7", "#f0f8ee"], hills: ["#8fd14a", "#5ba622"], accent: "#2d6b1a" },
  sunrise: { sky: ["#ffd3a1", "#ffe7c9", "#fff6e6"], hills: ["#a9d94f", "#6aae27"], accent: "#c4570a" },
  mint:    { sky: ["#b9ecd6", "#dcf6ea", "#f0faf3"], hills: ["#6fd08c", "#2f9e5b"], accent: "#1b7a43" },
  gold:    { sky: ["#ffe9a8", "#fff3cf", "#fffbea"], hills: ["#b5d84a", "#7cae1f"], accent: "#a86a00" },
  dusk:    { sky: ["#c9c3f2", "#e4dff8", "#f4f1fc"], hills: ["#8ccf6a", "#4f9e3a"], accent: "#5b3fb3" },
  blue:    { sky: ["#8fc9f2", "#c6e4f8", "#e9f5fd"], hills: ["#79c93f", "#4a9a22"], accent: "#1f6fb5" },
};

const cache = {};
export function loadImg(src) {
  if (!cache[src]) cache[src] = new Promise((res) => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => {
      fetch(src).then((r) => r.blob()).then((b) => { const u = URL.createObjectURL(b); const i2 = new Image(); i2.onload = () => res(i2); i2.onerror = () => res(null); i2.src = u; }).catch(() => res(null));
    };
    img.src = src;
  });
  return cache[src];
}

export async function ensureFonts() {
  try { await Promise.all([document.fonts.load("700 64px Fredoka"), document.fonts.load("800 32px Nunito"), document.fonts.load("600 18px Nunito")]); } catch {}
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

export function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(" "), lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxWidth && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// Sky, soft sun and two rolling hills across the bottom. `hillTop` = how far down the hills start (0..1).
export function drawScene(ctx, W, H, sceneKey = "day", hillTop = 0.78) {
  const s = SCENES[sceneKey] || SCENES.day;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, s.sky[0]); g.addColorStop(0.55, s.sky[1]); g.addColorStop(1, s.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(W * 0.82, H * 0.14, 0, W * 0.82, H * 0.14, W * 0.32);
  sun.addColorStop(0, "rgba(255,244,190,0.95)"); sun.addColorStop(1, "rgba(255,244,190,0)");
  ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
  const hill = (top, amp, color, phase) => {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * top + Math.sin(x / W * Math.PI * 2 + phase) * amp);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };
  hill(hillTop, H * 0.018, s.hills[0], 0.6);
  hill(hillTop + 0.07, H * 0.014, s.hills[1], 2.4);
  return s;
}

export function drawPanel(ctx, x, y, w, h, r = 36) {
  ctx.save();
  ctx.shadowColor = "rgba(26,74,10,0.22)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 12;
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = "rgba(255,255,255,0.94)"; ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, r); ctx.strokeStyle = "rgba(125,200,50,0.45)"; ctx.lineWidth = 3; ctx.stroke();
}

// Draws a mascot image centered on cx with its feet (bottom) at bottomY and the given height. Returns false if it didn't load.
export async function drawImage(ctx, src, cx, bottomY, h) {
  const img = await loadImg(src);
  if (!img) return false;
  const w = img.width * (h / img.height);
  ctx.drawImage(img, cx - w / 2, bottomY - h, w, h);
  return true;
}
export const MASCOT = (k) => (k === "trophy" ? "/images/wago/wago-trophy.webp" : `/mascot/wago-${k}.webp`);

export function drawFooter(ctx, W, H, color = "rgba(255,255,255,0.95)", y = H - 44) {
  ctx.textAlign = "center"; ctx.font = "800 22px 'Nunito',sans-serif"; ctx.fillStyle = color;
  ctx.letterSpacing = "0.06em"; ctx.fillText("proofofgrass.app", W / 2, y); ctx.letterSpacing = "0px";
}
