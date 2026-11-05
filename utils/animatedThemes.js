// utils/animatedThemes.js — procedural animation themes for share videos. A theme is just code + a few numbers (a few KB, no video files).
// Each theme returns { under(ctx, tMs), over(ctx, tMs) }: "under" draws behind the card, "over" draws on top of it.
// Marketplace: animated themes are SEPARATE items from the static packs. Ids are reserved here; they become purchasable only once they
// get a price in utils/marketplaceCatalog.js (MARKET_PRICES_USD) — until then verify-purchase/checkout reject them.
export const ANIMATED_ITEMS = {
  y2k_animated_pack:  { id: "y2k_animated_pack",  theme: "y2k", name: "Y2K Outdoors — Animated",        covers: "y2k_pack", scope: "flex"  },
  y2k_animated_proof: { id: "y2k_animated_proof", theme: "y2k", name: "Y2K Outdoors — Animated Proofs", covers: "y2k_pack", scope: "proof" },
};
// Which animated variant each cover gets
export const Y2K_VARIANTS = {
  marketplace_chrome_meadow: "chrome", marketplace_aqua_coast: "aqua", marketplace_bubble_forest: "bubble",
  marketplace_dream_sky: "dream", marketplace_cyber_garden: "cyber",
};
export const themeForCover = (slug) => (Y2K_VARIANTS[slug] ? "y2k" : null);

const mul = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const cl = (x) => Math.max(0, Math.min(1, x));
function sparkle(ctx, x, y, r, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (Math.PI / 4) * i, rr = i % 2 ? r * 0.18 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function bubble(ctx, x, y, r, hue, alpha) {
  ctx.save(); ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, "rgba(255,255,255,.85)"); g.addColorStop(0.35, `hsla(${hue},90%,80%,.18)`); g.addColorStop(0.85, `hsla(${(hue + 60) % 360},90%,70%,.22)`); g.addColorStop(1, `hsla(${hue},95%,85%,.65)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.45, r * 0.18, r * 0.1, -0.7, 0, 7); ctx.fill(); ctx.restore();
}

// Art-anchored hotspots, in the 2000px-wide cover space ([x, y, size]); tuned to the actual Y2K covers.
const HOT = {
  aqua:   { glints: [[625,103,70],[493,175,46],[478,462,40],[240,350,34],[1560,395,30],[1230,420,30]], glows: [[625,103,230,"255,245,220"],[493,175,140,"255,255,255"]], shimmer: [[130,345,1330,215]] },
  bubble: { glints: [[200,125,52],[530,135,46],[255,385,50],[1540,130,44],[720,40,34]], glows: [[405,255,95,"120,150,255"],[450,265,80,"140,120,255"],[580,325,80,"120,160,255"],[855,380,80,"120,170,255"],[1540,235,90,"140,130,255"],[1300,365,80,"120,170,255"],[1905,215,80,"130,150,255"]], shimmer: [[780,520,500,130]] },
  chrome: { glints: [[115,540,80],[1690,520,90],[1685,225,70],[1840,385,60],[460,115,56],[1425,110,56],[375,440,40]], glows: [[1690,0,330,"255,250,225"]], shimmer: [] },
  cyber:  { glints: [[1100,40,44],[520,90,40],[1180,300,50],[330,255,44],[1590,200,50],[860,300,36]], glows: [[1180,300,170,"120,230,255"],[1230,490,130,"120,230,255"],[330,255,130,"120,230,255"],[1590,200,150,"120,230,255"],[1830,260,110,"120,230,255"]], shimmer: [[700,480,820,170]] },
  dream:  { glints: [[1215,225,52],[670,270,48],[960,100,40],[1060,290,34],[1475,380,36],[545,520,36]], glows: [[1115,110,260,"255,245,235"],[1780,360,130,"170,210,255"],[1420,490,100,"170,210,255"],[540,525,100,"170,210,255"]], shimmer: [[680,555,580,90]] },
};
const P = (tf, x, y) => [tf.ox + x * tf.k * tf.sc, tf.oy + y * tf.k * tf.sc];

export function y2kFx(variant, W, H) {
  const rnd = mul(variant.length * 97 + 11), hot = HOT[variant] || HOT.chrome;
  const motes = Array.from({ length: variant === "chrome" ? 34 : 22 }, () => ({ x: rnd() * W, ph: rnd(), sp: 18 + rnd() * 40, w: rnd() * 6.28, r: 3 + rnd() * 5 }));
  const bubs = Array.from({ length: variant === "bubble" ? 12 : variant === "dream" ? 8 : variant === "aqua" ? 9 : 0 }, () => ({ x: rnd() * W, ph: rnd(), r: 22 + rnd() * 46, sp: 60 + rnd() * 90, w: rnd() * 6.28, hue: 170 + rnd() * 150 }));
  const shim = hot.shimmer.map(([x, y, w, h]) => ({ x, y, w, h, pts: Array.from({ length: 38 }, () => ({ u: rnd(), v: rnd(), ph: rnd() * 6.28, sp: 2 + rnd() * 4 })) }));
  const tint = variant === "cyber" ? "0,255,200" : variant === "dream" ? "255,200,255" : "255,255,255";
  return {
    // art-anchored effects: drawn right after the cover, so they sit IN the scene
    bg(ctx, t, tf) {
      const s = t / 1000;
      ctx.save(); ctx.globalCompositeOperation = "screen";
      hot.glows.forEach(([x, y, r, rgb], i) => { const [X, Y] = P(tf, x, y), R = r * tf.k * tf.sc, a = 0.16 + 0.16 * (0.5 + 0.5 * Math.sin(s * 2.2 + i * 1.7));
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, R); g.addColorStop(0, `rgba(${rgb},${a * 2.2})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(X - R, Y - R, R * 2, R * 2); });
      ctx.restore();
      shim.forEach((z) => { const [X, Y] = P(tf, z.x, z.y), w = z.w * tf.k * tf.sc, h = z.h * tf.k * tf.sc;
        z.pts.forEach((p) => { const a = Math.max(0, Math.sin(s * p.sp + p.ph)); if (a < 0.55) return; sparkle(ctx, X + p.u * w, Y + p.v * h, (6 + 12 * a) * tf.k * tf.sc * 1.4, s * 0.5 + p.ph, `rgba(255,255,255,${0.85 * a})`); }); });
      hot.glints.forEach(([x, y, size], i) => { const [X, Y] = P(tf, x, y), a = 0.5 + 0.5 * Math.sin(s * (2.4 + (i % 3) * 0.7) + i * 2.1);
        sparkle(ctx, X, Y, size * tf.k * tf.sc * (0.45 + a * 0.75), s * 0.35 + i, `rgba(255,255,255,${0.35 + 0.65 * a})`); });
    },
    // screen-space effects on top
    over(ctx, t) {
      const s = t / 1000;
      bubs.forEach((b) => { const y = H + b.r - ((s * b.sp + b.ph * H * 1.3) % (H + b.r * 2)); bubble(ctx, b.x + Math.sin(s * 1.3 + b.w) * 24, y, b.r, b.hue, 0.8); });
      motes.forEach((m) => { const y = H - ((s * m.sp + m.ph * H) % (H + 20)), x = m.x + Math.sin(s * 0.9 + m.w) * 30, a = 0.35 + 0.35 * Math.sin(s * 3 + m.w);
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = `rgb(${tint})`; ctx.shadowColor = `rgb(${tint})`; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x, y, m.r, 0, 7); ctx.fill(); ctx.restore(); });
      if (variant === "dream") { const c = (s % 2.4) / 0.55; if (c < 1) { const x = W * (0.15 + 0.7 * ((Math.floor(s / 2.4) % 3) / 3)) + c * 380, y = H * 0.12 + c * 240;
        const g = ctx.createLinearGradient(x, y, x - 240, y - 150); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.save(); ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 240, y - 150); ctx.stroke(); sparkle(ctx, x, y, 34, 0, "#fff"); ctx.restore(); } }
    },
  };
}
export const fxForVariant = (variant, W, H) => (variant ? y2kFx(variant, W, H) : null);
