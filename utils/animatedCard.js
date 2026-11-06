// utils/animatedCard.js — turns a static share-card canvas into a short animated video (MP4 where the browser can, else WebM).
// Pure browser APIs (canvas.captureStream + MediaRecorder); no dependencies. Always fall back to the static PNG if this returns null.
const ld = (src) => new Promise((res) => {
  const t = setTimeout(() => res(null), 8000);
  const i = new Image(); i.onload = () => { clearTimeout(t); res(i); }; i.onerror = () => { clearTimeout(t); res(null); }; i.src = src;
});
const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return null;
  const list = [["video/mp4;codecs=avc1.42E01E", "mp4"], ["video/mp4;codecs=avc1", "mp4"], ["video/mp4", "mp4"], ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"]];
  for (const [m, ext] of list) { try { if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext }; } catch {} }
  return null;
}


// Shared recorder: drives frame(t_ms) in real time while MediaRecorder captures the canvas.
export async function recordCanvas(out, frame, { seconds = 4, fps = 30, onProgress } = {}) {
  const rec = pickRecorderMime(); if (!rec) return null;
  const D = seconds * 1000;
  frame(0);
  const stream = out.captureStream(fps);
  const mr = new MediaRecorder(stream, { mimeType: rec.mime, videoBitsPerSecond: 6_000_000 });
  const chunks = []; mr.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
  const done = new Promise((res) => { mr.onstop = res; });
  mr.start(250);
  const t0 = performance.now();
  await new Promise((res) => {
    const tick = () => { const t = performance.now() - t0; frame(Math.min(t, D)); onProgress?.(clamp01(t / D)); if (t < D) requestAnimationFrame(tick); else res(); };
    requestAnimationFrame(tick);
  });
  mr.stop(); await done;
  const blob = new Blob(chunks, { type: rec.mime.split(";")[0] });
  return { blob, mime: rec.mime, ext: rec.ext, width: out.width, height: out.height, seconds };
}

// Deterministic encoder: renders EVERY frame at an exact timestamp (no real-time dropping) and writes an MP4 via WebCodecs + mp4-muxer.
// Prefers H.264 (what X, TikTok, Instagram accept); falls back to VP9, then to the real-time MediaRecorder. Returns compat info for the UI.
export async function encodeCanvas(out, frame, { seconds = 4, fps = 30, bitrate = 6_000_000, onProgress } = {}) {
  try {
    if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") throw new Error("no webcodecs");
    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    const W = out.width, H = out.height;
    const tries = [["avc1.64002A", "avc", "h264"], ["avc1.4D002A", "avc", "h264"], ["avc1.42002A", "avc", "h264"], ["vp09.00.40.08", "vp9", "vp9"]];
    let pick = null;
    for (const [codec, mux, name] of tries) {
      try { const s = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate, framerate: fps, ...(mux === "avc" ? { avc: { format: "avc" } } : {}) }); if (s.supported) { pick = { codec, mux, name }; break; } } catch {}
    }
    if (!pick) throw new Error("no supported codec");
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({ target, video: { codec: pick.mux, width: W, height: H, frameRate: fps }, fastStart: "in-memory", firstTimestampBehavior: "offset" });
    let encErr = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { encErr = e; } });
    enc.configure({ codec: pick.codec, width: W, height: H, bitrate, framerate: fps, ...(pick.mux === "avc" ? { avc: { format: "avc" } } : {}) });
    const total = Math.round(seconds * fps);
    for (let i = 0; i < total; i++) {
      if (encErr) throw encErr;
      frame((i * 1000) / fps);
      const vf = new VideoFrame(out, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      enc.encode(vf, { keyFrame: i % fps === 0 }); vf.close();
      while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
      if (i % 4 === 0) { onProgress?.(i / total); await new Promise((r) => setTimeout(r)); } // keep the page responsive
    }
    await enc.flush(); if (encErr) throw encErr; muxer.finalize(); onProgress?.(1);
    const blob = new Blob([target.buffer], { type: "video/mp4" });
    return { blob, mime: "video/mp4", ext: "mp4", width: W, height: H, seconds, fps, frames: total, codec: pick.codec, compat: pick.name === "h264" ? "h264" : "other" };
  } catch (e) {
    const r = await recordCanvas(out, frame, { seconds, fps, onProgress });
    return r ? { ...r, fps, codec: r.mime, compat: /avc1|h264/i.test(r.mime) ? "h264" : "other", fallback: true } : null;
  }
}
export const loadImg = ld;


// Draws cover art as the animated backdrop. Wide panoramas (≥1.8:1) slowly PAN across the whole scene; others breathe/drift.
// Returns the image→canvas transform so theme effects can anchor to spots in the art (sun, flowers, waterfalls…).
export function drawCoverBg(ctx, img, W, H, tMs, durMs) {
  const s = tMs / 1000, wide = img.width / img.height >= 1.8;
  // The Y2K panoramas have a thin white seam baked in ~3.5% from the top and bottom edges; skip those bands for wide covers.
  const cy = wide ? Math.round(img.height * 0.045) : 0, ih = img.height - cy * 2;
  let z = wide ? 1.0 : 1.1 + 0.03 * Math.sin(s * 0.9);
  const sc = Math.max(W / img.width, H / ih) * z;
  let ox, oy;
  if (wide) {
    const range = Math.max(0, img.width * sc - W), u = 0.5 - 0.5 * Math.cos(Math.PI * clamp01(tMs / durMs));
    ox = -range * (0.12 + 0.76 * u); oy = (H - ih * sc) / 2;
  } else { ox = (W - img.width * sc) / 2 + Math.sin(s * 0.6) * 24; oy = (H - img.height * sc) / 2 + Math.cos(s * 0.5) * 18; }
  ctx.drawImage(img, 0, cy, img.width, ih, ox, oy, img.width * sc, ih * sc);
  return { ox, oy: oy - cy * sc, sc, k: img.width / 2000 };
}

function star(ctx, x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (Math.PI / 4) * i, rr = i % 2 ? r * 0.28 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function rrPath(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// staticCard: any share-card canvas (the result card is 1600×1200). format: "4:5" (X / Instagram feed) or "9:16" (TikTok / Reels / Stories).
export async function renderAnimatedCard(staticCard, { format = "4:5", seconds = 4, fps = 30, headline = "", bgImage, fx, confetti = true, onProgress } = {}) {
  if (!pickRecorderMime()) return null;
  const W = 1080, H = format === "9:16" ? 1920 : 1350, D = seconds * 1000;
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  const [bg, wago] = await Promise.all([bgImage ? Promise.resolve(bgImage) : ld("/card/bg.jpg"), ld("/mascot/wago-celebrate.webp")]);

  // layout of the card inside the frame
  const cw = W * 0.94, ch = cw * staticCard.height / staticCard.width;
  const cy0 = (format === "9:16" ? H * 0.47 : H * 0.5) - ch / 2;
  try { await Promise.all([document.fonts.load("800 80px Fredoka"), document.fonts.load("800 24px Nunito")]); } catch {}

  // confetti (seeded so every render looks the same)
  const rnd = mulberry(7), cols = ["#7dc832", "#f6b93b", "#ffffff", "#e8a21c", "#a9e86b", "#fff0b8"];
  const conf = Array.from({ length: 90 }, () => ({ a: -Math.PI / 2 + (rnd() - 0.5) * 2.4, v: 700 + rnd() * 900, w: 10 + rnd() * 14, h: 6 + rnd() * 10, r: rnd() * 6, vr: (rnd() - 0.5) * 12, c: cols[(rnd() * cols.length) | 0] }));
  const twinkle = Array.from({ length: 14 }, () => ({ x: rnd() * W, y: rnd() * H, ph: rnd() * 6.28, s: 10 + rnd() * 18 }));

  const frame = (t) => {
    // background
    if (bg && fx) { const tf = drawCoverBg(ctx, bg, W, H, t, D); fx.bg?.(ctx, t, tf); }
    else if (bg) { const sc = Math.max(W / bg.width, H / bg.height); ctx.drawImage(bg, (W - bg.width * sc) / 2, (H - bg.height * sc) / 2, bg.width * sc, bg.height * sc); }
    else { ctx.fillStyle = "#cfe8f7"; ctx.fillRect(0, 0, W, H); }
    fx?.under?.(ctx, t);
    // twinkling sparkles
    ctx.fillStyle = "#fff";
    if (!fx) twinkle.forEach((s) => { const a = 0.5 + 0.5 * Math.sin(t / 1000 * 4 + s.ph); ctx.globalAlpha = 0.25 + 0.6 * a; star(ctx, s.x, s.y, s.s * (0.6 + a * 0.6), t / 1500 + s.ph); });
    ctx.globalAlpha = 1;
    // headline pops in above the card
    if (headline) {
      const hk = clamp01((t - 150) / 600), hs = 0.6 + 0.4 * easeOutBack(hk);
      let px = 112; ctx.font = `800 ${px}px Fredoka,system-ui,sans-serif`;
      while (ctx.measureText(headline).width > W * 0.9 && px > 48) { px -= 4; ctx.font = `800 ${px}px Fredoka,system-ui,sans-serif`; }
      ctx.save(); ctx.globalAlpha = clamp01(hk * 2); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.translate(W / 2, cy0 - (format === "9:16" ? 150 : 95)); ctx.scale(hs, hs);
      ctx.lineJoin = "round"; ctx.lineWidth = 22; ctx.strokeStyle = "#fff"; ctx.strokeText(headline, 0, 0);
      ctx.fillStyle = "#12380a"; ctx.fillText(headline, 0, 0); ctx.restore();
    }
    // card entrance + gentle float
    const k = clamp01(t / 750), sc = 0.82 + 0.18 * easeOutBack(k), op = easeOutCubic(clamp01(t / 350));
    const float = Math.sin(t / 1000 * 2) * 6 * clamp01((t - 700) / 400);
    ctx.save(); ctx.globalAlpha = op;
    ctx.translate(W / 2, cy0 + ch / 2 + float + (1 - easeOutCubic(k)) * 90); ctx.scale(sc, sc);
    ctx.shadowColor = "rgba(26,74,10,.35)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
    rrPath(ctx, -cw / 2, -ch / 2, cw, ch, 40); ctx.fillStyle = "#fff"; ctx.fill(); ctx.shadowColor = "transparent";
    ctx.drawImage(staticCard, -cw / 2, -ch / 2, cw, ch);
    // shine sweep, clipped to the card
    const sk = clamp01((t - 1100) / 900);
    if (sk > 0 && sk < 1) {
      ctx.save(); rrPath(ctx, -cw / 2, -ch / 2, cw, ch, 40); ctx.clip();
      const x = -cw / 2 - 300 + (cw + 600) * easeOutCubic(sk);
      const g = ctx.createLinearGradient(x - 160, 0, x + 160, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.rotate(-0.35); ctx.fillStyle = g; ctx.fillRect(x - 160, -ch, 320, ch * 2); ctx.restore();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    // WAGO hops in from the bottom-right
    if (wago) {
      const wk = clamp01((t - 900) / 650), hop = Math.abs(Math.sin(Math.max(0, t - 1500) / 1000 * 5)) * 46 * clamp01((t - 1500) / 300);
      const wh = format === "9:16" ? 330 : 280, ww = wh * wago.width / wago.height;
      const wx = W - ww - 30, wy = H - wh - (format === "9:16" ? 120 : 34) + (1 - easeOutBack(wk)) * (wh + 80) - hop;
      ctx.save(); ctx.shadowColor = "rgba(26,74,10,.3)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.drawImage(wago, wx, wy, ww, wh); ctx.restore();
    }
    // confetti burst
    const ct = (t - 500) / 1000;
    if (confetti && ct > 0) conf.forEach((p) => {
      const x = W / 2 + Math.cos(p.a) * p.v * ct, y = cy0 + ch * 0.32 + Math.sin(p.a) * p.v * ct + 1500 * ct * ct;
      if (y > H + 40 || ct > 2.6) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.r + p.vr * ct); ctx.globalAlpha = clamp01(1.3 - ct / 2.2); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
    ctx.globalAlpha = 1;
    fx?.over?.(ctx, t);
    // url pill
    ctx.save(); ctx.font = "800 28px Nunito,system-ui,sans-serif"; ctx.letterSpacing = "4px"; ctx.textAlign = "center";
    const uw = ctx.measureText("PROOFOFGRASS.APP").width + 56, uy = H - (format === "9:16" ? 150 : 70);
    ctx.fillStyle = "rgba(253,246,226,.94)"; rrPath(ctx, W / 2 - uw / 2 - 150, uy - 30, uw, 56, 28); ctx.fill();
    ctx.fillStyle = "#1f6b12"; ctx.fillText("PROOFOFGRASS.APP", W / 2 - 150 + 2, uy + 9); ctx.restore();
  };

  return encodeCanvas(out, frame, { seconds, fps, onProgress });
}

// Flex card: animated cover art behind the (static, transparent-background) foreground panel.
// fgCanvas: drawFlexCard output on a transparent canvas (1080×1080). bgImage: the cover art (or null).
export async function renderAnimatedFlex(fgCanvas, { bgImage, format = "1:1", seconds = 4, fps = 30, fx, headline = "", onProgress } = {}) {
  if (!pickRecorderMime()) return null;
  const W = 1080, H = format === "9:16" ? 1920 : format === "4:5" ? 1350 : 1080;
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  try { await Promise.all([document.fonts.load("800 80px Fredoka"), document.fonts.load("800 24px Nunito")]); } catch {}
  // The foreground is a square layout: identity + streak at the top, stats + next badge + footer at the bottom, art showing between.
  // For tall formats we split it into those two groups and place each inside the platform safe areas (TikTok/Reels UI covers the top ~220px and bottom ~430px).
  const k0 = W / fgCanvas.width, FH = fgCanvas.height, TOP_H = Math.round(342 * (FH / 1080)), BOT_Y = Math.round(735 * (FH / 1080)), BOT_H = FH - BOT_Y - Math.round(10 * (FH / 1080));
  let slices, hy;
  if (format === "1:1") slices = [{ sy: 0, sh: FH, dy: 0 }];
  else { // one compact block (headline, identity row, stats group) centred inside the platform safe area
    const topPx = TOP_H * k0, botPx = BOT_H * k0, block = 110 + 40 + topPx + 60 + botPx;
    const safeT = format === "9:16" ? 220 : 0, safeB = format === "9:16" ? 430 : 0;
    const y0 = safeT + (H - safeT - safeB - block) / 2;
    hy = y0 + 55; const ty = y0 + 150;
    slices = [{ sy: 0, sh: TOP_H, dy: ty }, { sy: BOT_Y, sh: BOT_H, dy: ty + topPx + 60 }];
  }
  const frame = (t) => {
    const s = t / 1000;
    ctx.fillStyle = "#0b0b12"; ctx.fillRect(0, 0, W, H);
    if (bgImage) { const tf = drawCoverBg(ctx, bgImage, W, H, t, seconds * 1000); fx?.bg?.(ctx, t, tf); }
    fx?.under?.(ctx, t);
    const k = clamp01(t / 700), a = easeOutCubic(clamp01(t / 450)), sc2 = 0.95 + 0.05 * easeOutBack(k), fl = Math.sin(s * 2) * 4 * clamp01((t - 600) / 400);
    slices.forEach((sl, i) => {
      const dh = sl.sh * k0, late = clamp01((t - i * 150) / 450);
      ctx.save(); ctx.globalAlpha = i ? easeOutCubic(late) : a; ctx.translate(W / 2, sl.dy + dh / 2 + (i ? -fl : fl)); ctx.scale(sc2, sc2);
      ctx.drawImage(fgCanvas, 0, sl.sy, fgCanvas.width, sl.sh, -W / 2, -dh / 2, W, dh);
      const sk = clamp01((t - 1200 - i * 250) / 900);
      if (sk > 0 && sk < 1) { // shine sweep
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.beginPath(); ctx.rect(-W / 2, -dh / 2, W, dh); ctx.clip();
        const x = -W / 2 - 300 + (W + 600) * easeOutCubic(sk), g = ctx.createLinearGradient(x - 140, 0, x + 140, 0);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.22)"); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.rotate(-0.35); ctx.fillStyle = g; ctx.fillRect(x - 140, -dh, 280, dh * 2); ctx.restore();
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    fx?.over?.(ctx, t);
    if (headline && format !== "1:1") {
      let px = 112; ctx.font = `800 ${px}px Fredoka,system-ui,sans-serif`;
      while (ctx.measureText(headline).width > W * 0.88 && px > 48) { px -= 4; ctx.font = `800 ${px}px Fredoka,system-ui,sans-serif`; }
      ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.globalAlpha = easeOutCubic(clamp01((t - 200) / 500));
      ctx.lineWidth = 22; ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.strokeText(headline, W / 2, hy); ctx.fillStyle = "#fff"; ctx.fillText(headline, W / 2, hy); ctx.restore();
    }
  };
  return encodeCanvas(out, frame, { seconds, fps, onProgress });
}
