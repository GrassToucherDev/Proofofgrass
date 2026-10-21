// utils/spotlightImage.js — renders the weekly "Community Spotlight" winners graphic (1672×941)
// by placing each winner's picture and X name into the template frame (public/spotlight-frame.webp).
// The frame has transparent holes where the pictures go (pictures are drawn behind it) and cream
// name plates. Slot positions come from the template artwork.

export const FRAME = {
  src: "/spotlight-frame.webp",
  width: 1672, height: 941,
  slots: [
    { key: "community_mvp",   cx: 510.5,  cy: 433.0, r: 90.0, plate: { x1: 361,  x2: 658,  y1: 500, y2: 547 } },
    { key: "meme_lord",       cx: 1160.0, cy: 433.5, r: 89.5, plate: { x1: 1015, x2: 1310, y1: 499, y2: 546 } },
    { key: "biggest_shiller", cx: 510.0,  cy: 753.5, r: 89.5, plate: { x1: 362,  x2: 659,  y1: 816, y2: 865 } },
    { key: "space_warrior",   cx: 1161.5, cy: 754.0, r: 90.0, plate: { x1: 1012, x2: 1310, y1: 816, y2: 865 } },
  ],
  date: { x1: 1155, x2: 1471, y1: 160, y2: 226 },
};

export const SPOTLIGHT_CATEGORIES = [
  { key: "community_mvp",   emoji: "🔥", name: "Community MVP" },
  { key: "meme_lord",       emoji: "😂", name: "Meme Lord" },
  { key: "biggest_shiller", emoji: "📣", name: "Biggest Shiller" },
  { key: "space_warrior",   emoji: "🎧", name: "Space Warrior" },
];

const INK = "#0d2a05";
const FRAME_GREEN = "#1f6b12";

// Load an image for canvas use without tainting it (CORS img → fetch/blob → cache-busted retry).
function loadOnce(src, mode, timeoutMs) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error("timeout " + src)), timeoutMs);
    const ok = v => { clearTimeout(timer); res(v); };
    const no = e => { clearTimeout(timer); rej(e); };
    if (mode === "img") {
      const im = new Image(); im.crossOrigin = "anonymous";
      im.onload = () => ok(im); im.onerror = () => no(new Error("img load failed " + src)); im.src = src; return;
    }
    const url = mode === "bust" ? src + (src.includes("?") ? "&" : "?") + "cb=" + Date.now() : src;
    fetch(url, { mode: "cors", cache: mode === "bust" ? "reload" : "default" })
      .then(r => { if (!r.ok) throw new Error("http " + r.status); return r.blob(); })
      .then(blob => {
        const obj = URL.createObjectURL(blob); const im = new Image();
        im.onload = () => { URL.revokeObjectURL(obj); ok(im); };
        im.onerror = () => { URL.revokeObjectURL(obj); no(new Error("img load failed")); };
        im.src = obj;
      }).catch(no);
  });
}
export async function loadImageSafe(src) {
  let last;
  for (const mode of ["img", "fetch", "bust"]) {
    try { return await loadOnce(src, mode, 8000); } catch (e) { last = e; }
  }
  throw last;
}

function coverDraw(ctx, img, cx, cy, radius) {
  const d = radius * 2, s = Math.max(d / img.width, d / img.height);
  const w = img.width * s, h = img.height * s;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function fitText(ctx, text, maxW, weight, startPx, minPx, family) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > minPx) { px -= 1; ctx.font = `${weight} ${px}px ${family}`; }
  let t = text;
  while (ctx.measureText(t).width > maxW && t.length > 3) t = t.slice(0, -1);
  return t.length < text.length ? t.slice(0, -1) + "…" : t;
}

export function weekRangeLabel(weekStart, weekEnd) {
  const s = new Date(weekStart + "T00:00:00Z");
  const e = new Date((weekEnd || weekStart) + "T00:00:00Z");
  if (!weekEnd) e.setUTCDate(s.getUTCDate() + 6);
  const mo = d => d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const sameMonth = mo(s) === mo(e) && s.getUTCFullYear() === e.getUTCFullYear();
  const y = e.getUTCFullYear();
  return sameMonth ? `${mo(s)} ${s.getUTCDate()} – ${e.getUTCDate()}, ${y}`
                   : `${mo(s)} ${s.getUTCDate()} – ${mo(e)} ${e.getUTCDate()}, ${y}`;
}

// winners: { [categoryKey]: { handle: "name" (no @), avatarUrl?: string } | undefined }
export async function renderWinnersImage({ weekLabel, winners }) {
  const family = "'DM Sans', 'Helvetica Neue', Arial, sans-serif";
  try { await Promise.all([document.fonts.load(`800 30px ${family}`), document.fonts.load(`700 30px ${family}`)]); } catch {}
  const canvas = document.createElement("canvas");
  canvas.width = FRAME.width; canvas.height = FRAME.height;
  const ctx = canvas.getContext("2d");
  const [frame, logo] = await Promise.all([
    loadImageSafe(FRAME.src),
    loadImageSafe("/touchgrass-transparent.png").catch(() => null),
  ]);

  ctx.fillStyle = "#eef6e2"; ctx.fillRect(0, 0, FRAME.width, FRAME.height); // solid backdrop so X doesn't show transparency as black

  // 1) pictures, behind the frame (they show through the transparent holes)
  for (const slot of FRAME.slots) {
    const w = winners?.[slot.key];
    const R = slot.r + 10;
    ctx.save();
    ctx.beginPath(); ctx.arc(slot.cx, slot.cy, R, 0, Math.PI * 2); ctx.clip();
    let drawn = false;
    if (w?.avatarUrl) {
      try { coverDraw(ctx, await loadImageSafe(w.avatarUrl), slot.cx, slot.cy, R); drawn = true; } catch {}
    }
    if (!drawn) {
      const g = ctx.createLinearGradient(slot.cx - R, slot.cy - R, slot.cx + R, slot.cy + R);
      if (w) { g.addColorStop(0, "#e9f6d8"); g.addColorStop(1, "#cfe8b0"); } else { g.addColorStop(0, "#f2f4ee"); g.addColorStop(1, "#e3e7dc"); }
      ctx.fillStyle = g; ctx.fillRect(slot.cx - R, slot.cy - R, R * 2, R * 2);
      if (w && logo) { const L = slot.r * 1.25; ctx.drawImage(logo, slot.cx - L / 2, slot.cy - L / 2, L, L); }
      else if (!w) { // neutral silhouette
        ctx.fillStyle = "#b9c1b2";
        ctx.beginPath(); ctx.arc(slot.cx, slot.cy - slot.r * 0.22, slot.r * 0.34, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(slot.cx, slot.cy + slot.r * 0.85, slot.r * 0.7, slot.r * 0.62, 0, Math.PI, 0); ctx.fill();
      }
    }
    ctx.restore();
  }

  // 2) the template on top
  ctx.drawImage(frame, 0, 0, FRAME.width, FRAME.height);

  // 3) picture rings (clean edge) — drawn over the frame
  for (const slot of FRAME.slots) {
    ctx.save();
    ctx.beginPath(); ctx.rect(slot.cx - slot.r - 10, slot.cy - slot.r - 10, slot.r * 2 + 20, slot.plate.y1 - (slot.cy - slot.r - 10) - 1); ctx.clip();
    ctx.beginPath(); ctx.arc(slot.cx, slot.cy, slot.r + 1, 0, Math.PI * 2);
    ctx.lineWidth = 6; ctx.strokeStyle = FRAME_GREEN; ctx.stroke();
    ctx.restore();
  }

  // 4) names on the plates
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const slot of FRAME.slots) {
    const w = winners?.[slot.key];
    const p = slot.plate, maxW = (p.x2 - p.x1) - 28;
    const txt = fitText(ctx, w ? "@" + w.handle : "No winner yet", maxW, 800, 30, 16, family);
    ctx.fillStyle = w ? INK : "#6b7d60";
    ctx.fillText(txt, (p.x1 + p.x2) / 2, (p.y1 + p.y2) / 2 + 2);
  }

  // 5) week range
  const d = FRAME.date;
  ctx.fillStyle = INK;
  ctx.fillText(fitText(ctx, weekLabel, (d.x2 - d.x1) - 30, 800, 32, 18, family), (d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2 + 2);

  return canvas.toDataURL("image/png");
}

// ── Post text ────────────────────────────────────────────────────────────────
export const TONES = [
  { id: "hype",   label: "Hype" },
  { id: "clean",  label: "Short & clean" },
  { id: "thanks", label: "Thank-you" },
];

export function buildAnnouncementText({ weekLabel, winners, tone = "hype", url = "proofofgrass.app/spotlight" }) {
  const lines = SPOTLIGHT_CATEGORIES.filter(c => winners?.[c.key])
    .map(c => `${c.emoji} ${c.name}: @${winners[c.key].handle}`);
  const tags = "$TOUCHGRASS #TouchGrass #ProofOfGrass";
  if (!lines.length) return "";
  if (tone === "clean") return `🏆 Community Spotlight · ${weekLabel}\n\n${lines.join("\n")}\n\n${url}\n${tags}`;
  if (tone === "thanks") return `Huge thank you to everyone showing up for Touch Grass this week. 🌿\n\nCommunity Spotlight · ${weekLabel}\n\n${lines.join("\n")}\n\nYou make this community what it is.\n\n${url}\n${tags}`;
  return `🏆 Community Spotlight is here! ${weekLabel}\n\n${lines.join("\n")}\n\nCongrats, and thank you for touching grass with us! 🌿\n\n${url}\n${tags}`;
}

// X counts every link as 23 characters.
export function xLength(text) {
  return Array.from(text.replace(/\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/gi, "x".repeat(23))).length;
}
