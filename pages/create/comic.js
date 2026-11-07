import { useState, useEffect, useRef, useCallback } from "react";
import fs from "fs";
import path from "path";
import CreateShell from "../../components/CreateShell";
import Ico from "../../components/Ico";
import PostToCommunity from "../../components/PostToCommunity";
import { T, CARD_SHADOW } from "../../utils/createTheme";
import { currentTheme } from "../../utils/createCommunity";
import { SCENES, loadImg, ensureFonts, roundRect, wrapText, drawScene } from "../../utils/createCards";

// ── Library ───────────────────────────────────────────────────────────────────
// Built-in WAGO poses + stickers. Anything dropped into public/comic/characters or public/comic/stickers shows up
// automatically after the next deploy (read at build time in getStaticProps).
const WAGO = [
  ["wave", "/mascot/wago-wave.webp"], ["point", "/mascot/wago-point.webp"], ["camera", "/mascot/wago-camera.webp"],
  ["celebrate", "/mascot/wago-celebrate.webp"], ["shield", "/mascot/wago-shield.webp"], ["sleep", "/mascot/wago-sleep.webp"],
  ["cheer", "/images/wago/wago-cheer.png"], ["salute", "/images/wago/wago-salute.png"], ["shrug", "/images/wago/wago-shrug.png"],
  ["ticket", "/images/wago/wago-ticket.png"], ["trophy", "/images/wago/wago-trophy.webp"],
].map(([label, src]) => ({ label, src }));
const STICKERS = ["clover", "sun", "sparkle", "flame", "crown", "gem", "rocket", "megaphone", "confetti", "medal1", "mountain", "tree", "flower", "leaf", "bolt", "gift"]
  .map(n => ({ label: n, src: `/icons3d/${n}.webp` }));

export async function getStaticProps() {
  const scan = (dir, url) => {
    try {
      return fs.readdirSync(path.join(process.cwd(), "public", dir))
        .filter(f => /\.(png|webp|jpe?g|gif)$/i.test(f))
        .map(f => ({ label: f.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), src: `${url}/${f}` }));
    } catch { return []; }
  };
  return { props: { extraChars: scan("comic/characters", "/comic/characters"), extraStickers: scan("comic/stickers", "/comic/stickers") } };
}

// ── Layouts and backgrounds ───────────────────────────────────────────────────
const W = 1080, B = 10, G = 10;
const LAYOUTS = {
  "1":  { label: "1",   cols: 1, rows: 1, ar: 1 },
  "2h": { label: "2 side by side", cols: 2, rows: 1, ar: 1 },
  "2v": { label: "2 stacked",      cols: 1, rows: 2, ar: 0.5 },
  "4":  { label: "4",   cols: 2, rows: 2, ar: 1 },
  "6":  { label: "6",   cols: 2, rows: 3, ar: 1 },
  "9":  { label: "9",   cols: 3, rows: 3, ar: 1 },
};
const BGS = [
  ...Object.keys(SCENES).map(k => ({ key: k, label: k, scene: true, swatch: SCENES[k].sky[0] })),
  { key: "white", label: "white", solid: "#ffffff", swatch: "#ffffff" },
  { key: "cream", label: "cream", solid: "#fff6dc", swatch: "#fff6dc" },
  { key: "orange", label: "orange", solid: "#f07020", swatch: "#f07020" },
  { key: "night", label: "night", solid: "#1b2a4a", swatch: "#1b2a4a" },
];

function geom(layoutKey) {
  const L = LAYOUTS[layoutKey] || LAYOUTS["4"];
  const pw = (W - 2 * B - (L.cols - 1) * G) / L.cols, ph = pw * L.ar;
  const H = Math.round(L.rows * ph + (L.rows - 1) * G + 2 * B);
  const rects = [];
  for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) rects.push({ x: B + c * (pw + G), y: B + r * (ph + G), w: pw, h: ph });
  return { W, H, rects };
}

// ── Items ─────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const FONT = (px) => `700 ${px}px 'Fredoka',system-ui,sans-serif`;

function textBox(ctx, it, rect) {
  const fsz = it.fs * rect.w, w = it.w * rect.w, pad = it.style === "bubble" ? fsz * 0.55 : fsz * 0.12;
  ctx.font = FONT(fsz);
  const txt = it.style === "caption" ? String(it.text || "").toUpperCase() : String(it.text || "");
  const lines = wrapText(ctx, txt || " ", Math.max(10, w - pad * 2));
  const lh = fsz * 1.16;
  return { w, h: lines.length * lh + pad * 2, lines, fsz, lh, pad };
}
function itemBox(ctx, it, rect, imgs) {
  if (it.type === "text") return textBox(ctx, it, rect);
  const img = imgs[it.src];
  const w = it.w * rect.w;
  return { w, h: img ? w * (img.height / img.width) : w };
}

function drawItem(ctx, it, rect, imgs) {
  const bx = itemBox(ctx, it, rect, imgs);
  const cx = rect.x + it.x * rect.w, cy = rect.y + it.y * rect.h;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate((it.rot || 0) * Math.PI / 180);
  if (it.type === "img") {
    const img = imgs[it.src];
    if (img) { if (it.flip) ctx.scale(-1, 1); ctx.drawImage(img, -bx.w / 2, -bx.h / 2, bx.w, bx.h); }
  } else {
    const { w, h, lines, fsz, lh, pad } = bx;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = FONT(fsz); ctx.lineJoin = "round";
    if (it.style === "bubble") {
      const lw = Math.max(3, fsz * 0.1);
      ctx.lineWidth = lw; ctx.strokeStyle = "#1a2a10"; ctx.fillStyle = "#ffffff";
      roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(h / 2, fsz * 0.9)); ctx.fill(); ctx.stroke();
      // tail
      const tx = -w * 0.2, by = h / 2 - lw, tip = h / 2 + fsz * 0.95;
      ctx.beginPath(); ctx.moveTo(tx - fsz * 0.35, by); ctx.lineTo(tx - fsz * 0.2, tip); ctx.lineTo(tx + fsz * 0.45, by); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - fsz * 0.35, by); ctx.lineTo(tx - fsz * 0.2, tip); ctx.lineTo(tx + fsz * 0.45, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1a2a10";
      lines.forEach((l, i) => ctx.fillText(l, 0, -h / 2 + pad + lh * (i + 0.5)));
    } else {
      ctx.lineWidth = fsz * 0.2; ctx.strokeStyle = "#101a0a"; ctx.fillStyle = "#ffffff";
      lines.forEach((l, i) => { const y = -h / 2 + pad + lh * (i + 0.5); ctx.strokeText(l, 0, y); ctx.fillText(l, 0, y); });
    }
  }
  ctx.restore();
}

function drawBg(ctx, rect, key) {
  const bg = BGS.find(b => b.key === key) || BGS[0];
  if (bg.scene) {
    ctx.save(); ctx.translate(rect.x, rect.y); drawScene(ctx, rect.w, rect.h, bg.key, 0.8); ctx.restore();
  } else { ctx.fillStyle = bg.solid; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
}

function drawAll(ctx, s, imgs, ui) {
  const { H, rects } = geom(s.layout);
  ctx.fillStyle = "#0d2a05"; ctx.fillRect(0, 0, W, H);
  rects.forEach((r, p) => {
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    drawBg(ctx, r, s.bgs[p]);
    s.items.filter(it => it.panel === p).forEach(it => drawItem(ctx, it, r, imgs));
    ctx.restore();
  });
  // small watermark, bottom-right of the last panel
  const lr = rects[rects.length - 1];
  ctx.save(); ctx.textAlign = "right"; ctx.textBaseline = "alphabetic"; ctx.font = `800 ${Math.max(13, lr.w * 0.032)}px 'Nunito',sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 4;
  ctx.fillText("proofofgrass.app", lr.x + lr.w - 10, lr.y + lr.h - 10); ctx.restore();
  if (ui) {
    const sc = ui.scale;
    const pr = rects[s.selPanel];
    if (pr && !s.selId) { ctx.save(); ctx.setLineDash([14 * sc, 9 * sc]); ctx.lineWidth = 4 * sc; ctx.strokeStyle = "#7dc832"; ctx.strokeRect(pr.x + 2 * sc, pr.y + 2 * sc, pr.w - 4 * sc, pr.h - 4 * sc); ctx.restore(); }
    const it = s.items.find(i => i.id === s.selId);
    if (it) {
      const r = rects[it.panel], bx = itemBox(ctx, it, r, imgs);
      ctx.save(); ctx.translate(r.x + it.x * r.w, r.y + it.y * r.h); ctx.rotate((it.rot || 0) * Math.PI / 180);
      ctx.lineWidth = 3 * sc; ctx.strokeStyle = "#2f80ed"; ctx.setLineDash([10 * sc, 7 * sc]); ctx.strokeRect(-bx.w / 2, -bx.h / 2, bx.w, bx.h); ctx.setLineDash([]);
      const dot = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 13 * sc, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); };
      dot(bx.w / 2, bx.h / 2); dot(0, -bx.h / 2 - 34 * sc);
      ctx.restore();
    }
  }
}

// ── Starter comic ─────────────────────────────────────────────────────────────
const mkImg = (panel, src, x, y, w, extra = {}) => ({ id: uid(), type: "img", panel, src, x, y, w, rot: 0, flip: false, ...extra });
const mkText = (panel, text, style, x, y, w, fs, extra = {}) => ({ id: uid(), type: "text", panel, text, style, x, y, w, fs, rot: 0, ...extra });
function starter() {
  return {
    layout: "4", selId: null, selPanel: 0,
    bgs: ["day", "sunrise", "dusk", "gold", "day", "mint", "blue", "sunrise", "day"],
    items: [
      mkImg(0, "/mascot/wago-wave.webp", 0.35, 0.62, 0.5), mkText(0, "Day 1. Let's go!", "bubble", 0.62, 0.17, 0.62, 0.075),
      mkImg(1, "/mascot/wago-camera.webp", 0.4, 0.62, 0.5), mkText(1, "Proof of grass!", "bubble", 0.62, 0.17, 0.6, 0.075),
      mkImg(2, "/mascot/wago-shield.webp", 0.4, 0.62, 0.5), mkText(2, "Streak protected.", "bubble", 0.62, 0.17, 0.62, 0.075),
      mkImg(3, "/mascot/wago-celebrate.webp", 0.5, 0.58, 0.55), mkText(3, "Streak +1", "caption", 0.5, 0.9, 0.9, 0.11),
    ],
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ComicMaker({ extraChars = [], extraStickers = [] }) {
  const [s, setS] = useState(() => starter());
  const sRef = useRef(s); sRef.current = s;
  const hist = useRef([]);
  const [imgs, setImgs] = useState({});
  const [fontsReady, setFontsReady] = useState(false);
  const [tab, setTab] = useState("wago");
  const [preview, setPreview] = useState(null);
  const canvasRef = useRef(null);
  const drag = useRef(null);

  const apply = useCallback((fn, record = true) => {
    const next = fn(sRef.current);
    if (record) { hist.current.push(sRef.current); if (hist.current.length > 60) hist.current.shift(); }
    sRef.current = next; setS(next); setPreview(null);
  }, []);
  const undo = () => { const p = hist.current.pop(); if (p) { sRef.current = p; setS(p); setPreview(null); } };

  useEffect(() => { ensureFonts().then(() => setFontsReady(true)); }, []);
  useEffect(() => {
    let live = true;
    s.items.filter(i => i.type === "img" && !imgs[i.src]).forEach(i => loadImg(i.src).then(im => { if (im && live) setImgs(m => ({ ...m, [i.src]: im })); }));
    return () => { live = false; };
  }, [s.items, imgs]);

  const { H } = geom(s.layout);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = W; c.height = H;
    const sc = c.getBoundingClientRect().width ? W / c.getBoundingClientRect().width : 1.6;
    drawAll(c.getContext("2d"), s, imgs, { scale: sc });
  }, [s, imgs, fontsReady, H]);

  // pointer helpers (canvas CSS size -> logical 1080 space)
  const toLogical = (e) => { const r = canvasRef.current.getBoundingClientRect(); const k = W / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k }; };
  const panelAt = (rects, x, y) => rects.findIndex(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  const hit = (ctx, st, rects, x, y) => {
    for (let i = st.items.length - 1; i >= 0; i--) {
      const it = st.items[i], r = rects[it.panel], bx = itemBox(ctx, it, r, imgs);
      const cx = r.x + it.x * r.w, cy = r.y + it.y * r.h, a = -(it.rot || 0) * Math.PI / 180;
      const dx = x - cx, dy = y - cy, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= bx.w / 2 && Math.abs(ly) <= bx.h / 2) return it;
    }
    return null;
  };

  const onDown = (e) => {
    const c = canvasRef.current, ctx = c.getContext("2d"), st = sRef.current, { rects } = geom(st.layout);
    const p = toLogical(e); c.setPointerCapture?.(e.pointerId);
    const sel = st.items.find(i => i.id === st.selId);
    if (sel) {
      const r = rects[sel.panel], bx = itemBox(ctx, sel, r, imgs), cx = r.x + sel.x * r.w, cy = r.y + sel.y * r.h, a = (sel.rot || 0) * Math.PI / 180;
      const hp = (lx, ly) => ({ x: cx + lx * Math.cos(a) - ly * Math.sin(a), y: cy + lx * Math.sin(a) + ly * Math.cos(a) });
      const rs = hp(bx.w / 2, bx.h / 2), ro = hp(0, -bx.h / 2 - 34 * p.k), R = 26 * p.k;
      if (Math.hypot(p.x - rs.x, p.y - rs.y) < R) { hist.current.push(st); drag.current = { mode: "resize", id: sel.id, d0: Math.hypot(p.x - cx, p.y - cy) || 1, w0: sel.w, fs0: sel.fs }; return; }
      if (Math.hypot(p.x - ro.x, p.y - ro.y) < R) { hist.current.push(st); drag.current = { mode: "rotate", id: sel.id }; return; }
    }
    const it = hit(ctx, st, rects, p.x, p.y);
    if (it) {
      hist.current.push(st);
      const r = rects[it.panel];
      drag.current = { mode: "move", id: it.id, ox: p.x - (r.x + it.x * r.w), oy: p.y - (r.y + it.y * r.h) };
      const n = { ...st, selId: it.id, selPanel: it.panel }; sRef.current = n; setS(n);
    } else {
      const pi = panelAt(rects, p.x, p.y);
      const n = { ...st, selId: null, selPanel: pi >= 0 ? pi : st.selPanel }; sRef.current = n; setS(n);
    }
  };
  const onMove = (e) => {
    const d = drag.current; if (!d) return;
    const st = sRef.current, { rects } = geom(st.layout), p = toLogical(e);
    const it = st.items.find(i => i.id === d.id); if (!it) return;
    let upd;
    if (d.mode === "move") {
      const gx = p.x - d.ox, gy = p.y - d.oy;
      let pi = panelAt(rects, gx, gy); if (pi < 0) pi = it.panel;
      const r = rects[pi];
      upd = { panel: pi, x: Math.max(-0.1, Math.min(1.1, (gx - r.x) / r.w)), y: Math.max(-0.1, Math.min(1.1, (gy - r.y) / r.h)) };
    } else if (d.mode === "resize") {
      const r = rects[it.panel], cx = r.x + it.x * r.w, cy = r.y + it.y * r.h;
      const k = Math.hypot(p.x - cx, p.y - cy) / d.d0;
      upd = { w: Math.max(0.08, Math.min(1.6, d.w0 * k)) };
    } else {
      const r = rects[it.panel], cx = r.x + it.x * r.w, cy = r.y + it.y * r.h;
      let deg = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
      if (Math.abs(deg % 90) < 4 || Math.abs((deg % 90) - 90) < 4) deg = Math.round(deg / 90) * 90;
      upd = { rot: Math.round(deg) };
    }
    const n = { ...st, selPanel: upd.panel ?? st.selPanel, items: st.items.map(i => i.id === d.id ? { ...i, ...upd } : i) };
    sRef.current = n; setS(n);
  };
  const onUp = () => { drag.current = null; setPreview(null); };

  // actions
  const sel = s.items.find(i => i.id === s.selId);
  const addImg = (src) => apply(st => { const it = mkImg(st.selPanel, src, 0.5, 0.58, src.includes("icons3d") ? 0.28 : 0.5); return { ...st, items: [...st.items, it], selId: it.id }; });
  const addText = (style) => apply(st => {
    const it = style === "bubble" ? mkText(st.selPanel, "Type here", "bubble", 0.5, 0.2, 0.6, 0.075) : mkText(st.selPanel, "Caption", "caption", 0.5, 0.88, 0.9, 0.1);
    return { ...st, items: [...st.items, it], selId: it.id };
  });
  const patch = (obj, record = true) => apply(st => ({ ...st, items: st.items.map(i => i.id === st.selId ? { ...i, ...obj } : i) }), record);
  const order = (dir) => apply(st => {
    const i = st.items.findIndex(x => x.id === st.selId); if (i < 0) return st;
    const a = st.items.slice(), [it] = a.splice(i, 1); dir > 0 ? a.push(it) : a.unshift(it); return { ...st, items: a };
  });
  const del = () => apply(st => ({ ...st, items: st.items.filter(i => i.id !== st.selId), selId: null }));
  const dup = () => apply(st => { const it = st.items.find(i => i.id === st.selId); if (!it) return st; const c = { ...it, id: uid(), x: Math.min(1, it.x + 0.06), y: Math.min(1, it.y + 0.06) }; return { ...st, items: [...st.items, c], selId: c.id }; });
  const setLayout = (k) => apply(st => {
    const n = geom(k).rects.length;
    return { ...st, layout: k, selPanel: Math.min(st.selPanel, n - 1), selId: null, items: st.items.filter(i => i.panel < n) };
  });
  const setBg = (key, all) => apply(st => ({ ...st, bgs: all ? st.bgs.map(() => key) : st.bgs.map((b, i) => (i === st.selPanel ? key : b)) }));
  const clearPanel = () => apply(st => ({ ...st, items: st.items.filter(i => i.panel !== st.selPanel), selId: null }));
  const clearAll = () => apply(st => ({ ...st, items: [], selId: null }));

  const finish = async () => {
    await ensureFonts();
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    drawAll(c.getContext("2d"), { ...sRef.current, selId: null, selPanel: -1 }, imgs, null);
    setPreview(c.toDataURL("image/png"));
    setTimeout(() => document.getElementById("comic-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const download = () => { const a = document.createElement("a"); a.download = "touch-grass-comic.png"; a.href = preview; a.click(); };
  const TEXT = `Made this on the Touch Grass comic maker.\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nhttps://proofofgrass.app/create/comic`;
  const shareToX = async () => {
    const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? "");
    if (isMob && navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(preview)).blob(); const file = new File([blob], "touch-grass-comic.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Touch Grass comic", text: TEXT }); return; }
      } catch (e) { if (e?.name === "AbortError") return; }
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(TEXT)}`, "_blank");
  };

  const chars = [...WAGO, ...extraChars], stickers = [...STICKERS, ...extraStickers];
  const lib = tab === "wago" ? chars : stickers;
  const curBg = s.bgs[Math.max(0, s.selPanel)];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'Nunito',sans-serif;}
    .btn{border:none;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;border-radius:10px;padding:11px 16px;}
    .chip{border:1px solid ${T.border};background:${T.bg3};color:${T.muted};font-family:'Nunito',sans-serif;font-weight:800;font-size:12px;border-radius:999px;padding:7px 13px;cursor:pointer;white-space:nowrap;}
    .chip.on{background:rgba(125,200,50,0.18);border-color:${T.borderG};color:${T.white};}
    .lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:8px;max-height:230px;overflow-y:auto;}
    .lib button{background:${T.bg3};border:1px solid ${T.border};border-radius:10px;padding:6px;cursor:pointer;aspect-ratio:1;display:flex;align-items:center;justify-content:center;}
    .lib button:hover{border-color:${T.borderG};}
    .lib img{max-width:100%;max-height:100%;object-fit:contain;}
    .card{background:${T.bg2};border:1px solid ${T.border};border-radius:14px;padding:16px;box-shadow:${CARD_SHADOW};}
    .lbl{font-size:9px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${T.dim};margin-bottom:8px;}
    .row{display:flex;gap:8px;flex-wrap:wrap;}
    textarea.tx{width:100%;border:1px solid ${T.border};border-radius:10px;padding:10px;font-family:'Nunito',sans-serif;font-size:14px;resize:vertical;min-height:54px;color:${T.white};background:#fff;}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <CreateShell title="Comic Maker">
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img src="/mascot/wago-celebrate.webp" alt="" width={84} height={84} style={{ width: 84, height: 84, objectFit: "contain", marginBottom: 6 }} />
            <h1 style={{ fontFamily: "'Fredoka',system-ui,sans-serif", fontSize: "clamp(26px,5vw,38px)", fontWeight: 700, color: T.white, marginBottom: 6 }}>Comic Maker</h1>
            <p style={{ fontSize: 12.5, color: T.dim }}>Pick a layout, drop in WAGO, add speech bubbles, share it.</p>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="lbl">Layout</div>
            <div className="row">
              {Object.keys(LAYOUTS).map(k => (
                <button key={k} className={`chip ${s.layout === k ? "on" : ""}`} onClick={() => setLayout(k)}>{LAYOUTS[k].label}{/^\d+$/.test(k) ? (k === "1" ? " panel" : " panels") : ""}</button>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: CARD_SHADOW, marginBottom: 6, border: `1px solid ${T.border}`, background: "#0d2a05" }}>
            <canvas ref={canvasRef} width={W} height={H} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              style={{ display: "block", width: "100%", height: "auto", touchAction: "none", cursor: "grab" }} />
          </div>
          <p style={{ fontSize: 11.5, color: T.dim, textAlign: "center", marginBottom: 14 }}>Tap a panel to select it. Drag characters and text to move them, use the corner dot to resize and the top dot to rotate.</p>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row" style={{ marginBottom: 12 }}>
              <button className={`chip ${tab === "wago" ? "on" : ""}`} onClick={() => setTab("wago")}>WAGO</button>
              <button className={`chip ${tab === "stickers" ? "on" : ""}`} onClick={() => setTab("stickers")}>Stickers</button>
              <span style={{ flex: 1 }} />
              <button className="chip" onClick={() => addText("bubble")}>+ Speech bubble</button>
              <button className="chip" onClick={() => addText("caption")}>+ Caption</button>
            </div>
            <div className="lib">
              {lib.map(c => (<button key={c.src} title={c.label} onClick={() => addImg(c.src)}><img src={c.src} alt={c.label} loading="lazy" /></button>))}
            </div>
            <p style={{ fontSize: 11, color: T.dim, marginTop: 8 }}>Adds to panel {s.selPanel + 1}.</p>
          </div>

          {sel && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="lbl">{sel.type === "text" ? (sel.style === "bubble" ? "Speech bubble" : "Caption") : "Selected"}</div>
              {sel.type === "text" && (
                <div style={{ marginBottom: 10 }}>
                  <textarea className="tx" value={sel.text} maxLength={120} onFocus={() => hist.current.push(sRef.current)} onChange={e => patch({ text: e.target.value }, false)} />
                  <div className="row" style={{ marginTop: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: T.muted }}>Text size</span>
                    <input type="range" min="0.04" max="0.2" step="0.005" value={sel.fs} onPointerDown={() => hist.current.push(sRef.current)} onChange={e => patch({ fs: parseFloat(e.target.value) }, false)} style={{ flex: 1, minWidth: 120 }} />
                    <button className="chip" onClick={() => patch({ style: sel.style === "bubble" ? "caption" : "bubble" })}>{sel.style === "bubble" ? "Make caption" : "Make bubble"}</button>
                  </div>
                </div>
              )}
              <div className="row">
                {sel.type === "img" && <button className="chip" onClick={() => patch({ flip: !sel.flip })}>Flip</button>}
                <button className="chip" onClick={() => patch({ rot: (sel.rot || 0) - 15 })}>Rotate left</button>
                <button className="chip" onClick={() => patch({ rot: (sel.rot || 0) + 15 })}>Rotate right</button>
                <button className="chip" onClick={() => patch({ w: Math.min(1.6, sel.w * 1.12) })}>Bigger</button>
                <button className="chip" onClick={() => patch({ w: Math.max(0.08, sel.w / 1.12) })}>Smaller</button>
                <button className="chip" onClick={() => order(1)}>To front</button>
                <button className="chip" onClick={() => order(-1)}>To back</button>
                <button className="chip" onClick={dup}>Duplicate</button>
                <button className="chip" style={{ color: T.red }} onClick={del}>Delete</button>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="lbl">Background for panel {s.selPanel + 1}</div>
            <div className="row" style={{ marginBottom: 10 }}>
              {BGS.map(b => (
                <button key={b.key} className={`chip ${curBg === b.key ? "on" : ""}`} onClick={() => setBg(b.key, false)} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: b.swatch, border: "1px solid rgba(0,0,0,0.2)", display: "inline-block" }} />{b.label}
                </button>
              ))}
            </div>
            <div className="row">
              <button className="chip" onClick={() => setBg(curBg, true)}>Use for all panels</button>
              <button className="chip" onClick={clearPanel}>Clear panel</button>
              <button className="chip" onClick={clearAll}>Clear all</button>
              <button className="chip" onClick={undo}>Undo</button>
            </div>
          </div>

          <button className="btn" onClick={finish} style={{ width: "100%", background: T.olive, color: "#fff", marginBottom: 18 }}>Finish comic</button>

          {preview && (
            <div id="comic-result">
              <img src={preview} alt="Comic preview" style={{ width: "100%", display: "block", borderRadius: 12, boxShadow: CARD_SHADOW, marginBottom: 14, border: `1px solid ${T.border}` }} />
              <div className="row">
                <button className="btn" onClick={shareToX} style={{ flex: "1 1 140px", background: T.white, color: T.bg }}>Post to X</button>
                <button className="btn" onClick={download} style={{ flex: "1 1 140px", background: T.bg3, color: T.dim, border: `1px solid ${T.border}` }}>Save PNG</button>
              </div>
              <div style={{ marginTop: 10 }}>
                <PostToCommunity dataUrl={preview} kind="meme" tool="comic" theme={currentTheme().title} />
              </div>
            </div>
          )}
        </div>
      </CreateShell>
    </>
  );
}
