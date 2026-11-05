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

export function y2kFx(variant, W, H) {
  const rnd = mul(variant.length * 97 + 11);
  const stars = Array.from({ length: 26 }, () => ({ x: rnd() * W, y: rnd() * H, ph: rnd() * 6.28, s: 10 + rnd() * 26, sp: 2 + rnd() * 3 }));
  const bubs = Array.from({ length: variant === "bubble" ? 22 : 16 }, () => ({ x: rnd() * W, ph: rnd(), r: 18 + rnd() * (variant === "bubble" ? 70 : 44), sp: 70 + rnd() * 120, w: rnd() * 6.28, hue: 170 + rnd() * 150 }));
  const cols = Array.from({ length: 26 }, (_, i) => ({ x: (i + 0.5) * (W / 26), ph: rnd() * 5, sp: 220 + rnd() * 380, len: 8 + ((rnd() * 10) | 0) }));
  const iri = (t, a) => { // moving iridescent sheen, additive
    return (ctx) => { const s = t / 1000, g = ctx.createLinearGradient(((s * 0.25) % 2 - 0.5) * W * 1.6, 0, ((s * 0.25) % 2 + 0.5) * W * 1.6, H);
      const h = (s * 40) % 360; g.addColorStop(0, `hsla(${h},100%,70%,0)`); g.addColorStop(0.5, `hsla(${(h + 60) % 360},100%,72%,${a})`); g.addColorStop(1, `hsla(${(h + 120) % 360},100%,70%,0)`);
      ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); };
  };
  return {
    under(ctx, t) { iri(t, variant === "cyber" ? 0.05 : 0.16)(ctx); },
    over(ctx, t) {
      const s = t / 1000;
      if (variant === "aqua" || variant === "bubble") {
        bubs.forEach((b) => { const y = H + b.r - ((s * b.sp + b.ph * H * 1.3) % (H + b.r * 2)); bubble(ctx, b.x + Math.sin(s * 1.3 + b.w) * 24, y, b.r, b.hue, 0.85); });
      }
      if (variant === "chrome" || variant === "dream" || variant === "bubble") {
        stars.forEach((st) => { const a = 0.5 + 0.5 * Math.sin(s * st.sp + st.ph); sparkle(ctx, st.x, st.y, st.s * (0.5 + a * 0.7), s * 0.4 + st.ph, `rgba(255,255,255,${0.2 + 0.75 * a})`); });
      }
      if (variant === "dream") { // shooting star every ~2s
        const c = (s % 2) / 0.55; if (c < 1) { const x = W * (0.1 + 0.8 * (Math.floor(s / 2) % 3) / 3) + c * 420, y = H * 0.1 + c * 260;
          const g = ctx.createLinearGradient(x, y, x - 260, y - 160); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.save(); ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 260, y - 160); ctx.stroke(); sparkle(ctx, x, y, 34, 0, "#fff"); ctx.restore(); } }
      if (variant === "chrome") { // lens flare glint crossing the frame
        const c = ((s * 0.35) % 1.4) - 0.2, x = c * W, y = H * 0.22 + c * H * 0.2; const g = ctx.createRadialGradient(x, y, 0, x, y, 190);
        g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.fillRect(x - 200, y - 200, 400, 400); ctx.restore(); }
      if (variant === "cyber") { // green digital rain + scanline sweep
        ctx.save(); ctx.font = "800 26px monospace"; ctx.textAlign = "center";
        cols.forEach((c, i) => { const head = ((s * c.sp + c.ph * 400) % (H + c.len * 30)) ; for (let k = 0; k < c.len; k++) { const y = head - k * 30; if (y < -30 || y > H + 30) continue;
          ctx.fillStyle = `rgba(0,255,136,${k === 0 ? 0.95 : 0.55 * (1 - k / c.len)})`; ctx.fillText(((i * 7 + k * 13 + Math.floor(s * 6)) % 2) ? "1" : "0", c.x, y); } });
        const sy = ((s * 0.4) % 1.2 - 0.1) * H; const g = ctx.createLinearGradient(0, sy - 60, 0, sy + 60);
        g.addColorStop(0, "rgba(0,255,136,0)"); g.addColorStop(0.5, "rgba(0,255,136,.18)"); g.addColorStop(1, "rgba(0,255,136,0)"); ctx.fillStyle = g; ctx.fillRect(0, sy - 60, W, 120);
        ctx.fillStyle = "rgba(0,0,0,.10)"; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2); ctx.restore(); }
    },
  };
}
export const fxForVariant = (variant, W, H) => (variant ? y2kFx(variant, W, H) : null);
