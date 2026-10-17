// Shareable Trail completion card (4:5 canvas), same visual language as WagoShareCard.
import { useEffect, useRef, useState } from "react";
import { V2, V2Styles } from "../../../utils/v2Theme";
import { WAGO_POSES } from "../Wago";

const W = 1080, H = 1350;
const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function cover(ctx, img, x, y, w, h) { const s = Math.max(w / img.width, h / img.height); ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s); }

async function draw(canvas, { coverUrl, name, city, stops, distanceText, durationText, rewardText }) {
  const ctx = canvas.getContext("2d");
  const font = "'DM Sans', -apple-system, 'Segoe UI', sans-serif";
  try { await document.fonts?.ready; } catch {}
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#c5e3f7"); bg.addColorStop(0.45, "#e8f4fd"); bg.addColorStop(1, "#f0f8ee");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const px = 60, py = 60, pw = W - 120, ph = 640;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.25)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#fff"; rr(ctx, px - 14, py - 14, pw + 28, ph + 28, 54); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, px, py, pw, ph, 42); ctx.clip();
  const g = ctx.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, "#a8d4f0"); g.addColorStop(1, "#d8efc4");
  ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
  if (coverUrl) { try { cover(ctx, await loadImage(coverUrl), px, py, pw, ph); } catch {} }
  ctx.restore();

  // Numbered path along the bottom of the photo
  const n = Math.min(stops, 5), gap = 110, startX = px + 60;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.beginPath();
  ctx.moveTo(startX, py + ph - 70); ctx.lineTo(startX + gap * (n - 1), py + ph - 70); ctx.stroke();
  for (let i = 0; i < n; i++) {
    const cx = startX + gap * i, cy = py + ph - 70;
    ctx.fillStyle = "#5ba622"; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `800 36px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✓", cx, cy + 2);
  }

  try {
    const wago = await loadImage(WAGO_POSES.cheer);
    const mh = 420, mw = (wago.width / wago.height) * mh;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.drawImage(wago, W - 70 - mw, py + ph - mh + 80, mw, mh); ctx.restore();
  } catch {}

  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#3d7a12"; ctx.font = `800 30px ${font}`; ctx.fillText("I COMPLETED A WAGO TRAIL", 70, 820);
  ctx.fillStyle = "#0d2a05"; ctx.font = `700 70px ${font}`;
  let t = name || "WAGO Trail";
  while (ctx.measureText(t).width > 940 && t.length > 4) t = t.slice(0, -2);
  if (t !== (name || "WAGO Trail")) t += "…";
  ctx.fillText(t, 70, 910);
  if (city) { ctx.fillStyle = "rgba(13,42,5,0.6)"; ctx.font = `600 34px ${font}`; ctx.fillText(city, 70, 962); }

  // Stat pills
  const pills = [`${stops} stops`, distanceText, durationText].filter(Boolean);
  let x = 70;
  ctx.font = `700 34px ${font}`;
  for (const p of pills) {
    const w = ctx.measureText(p).width + 56;
    ctx.fillStyle = "#fff"; rr(ctx, x, 1000, w, 68, 34); ctx.fill();
    ctx.fillStyle = "#1a4a0a"; ctx.textBaseline = "middle"; ctx.fillText(p, x + 28, 1035); ctx.textBaseline = "alphabetic";
    x += w + 16;
  }
  if (rewardText) {
    ctx.fillStyle = "#5ba622"; let s = 64; ctx.font = `800 ${s}px ${font}`;
    while (ctx.measureText(rewardText).width > 940 && s > 36) { s -= 4; ctx.font = `800 ${s}px ${font}`; }
    ctx.fillText(rewardText, 70, 1160);
  }
  ctx.fillStyle = "rgba(13,42,5,0.55)"; ctx.font = `600 28px ${font}`;
  ctx.fillText("Walked it for real  ·  proofofgrass.app/wago-drops/trails", 70, 1286);
}

export default function TrailShareCard(props) {
  const { coverUrl, name, city, stops, distanceText, durationText, rewardText, shareText } = props;
  const ref = useRef(null), blobRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState(null);

  useEffect(() => {
    let alive = true; setReady(false); blobRef.current = null;
    draw(ref.current, { coverUrl, name, city, stops, distanceText, durationText, rewardText }).then(() => {
      if (!alive) return; ref.current.toBlob(b => { blobRef.current = b; if (alive) setReady(true); }, "image/png");
    });
    return () => { alive = false; };
  }, [coverUrl, name, city, stops, distanceText, durationText, rewardText]);

  function download(blob) { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = "wago-trail.png"; a.click(); setTimeout(() => URL.revokeObjectURL(u), 5000); }
  async function share() {
    const blob = blobRef.current; if (!blob) return;
    const file = new File([blob], "wago-trail.png", { type: "image/png" });
    const intent = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ files: [file], text: shareText });
      else { download(blob); navigator.clipboard?.writeText(shareText).catch(() => {}); setNote("Image saved. Attach it to your X post."); intent(); }
    } catch (e) { if (e?.name === "AbortError") return; download(blob); intent(); setNote("Image saved. Attach it to your X post."); }
  }
  return (
    <div style={{ margin: "12px 0 4px" }}>
      <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "auto", borderRadius: V2.radiusLg, boxShadow: V2.shadowCard, display: "block", opacity: ready ? 1 : 0.5 }} />
      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={share} disabled={!ready} style={{ ...V2Styles.btnPrimary, flex: 1, justifyContent: "center", padding: "13px 20px", opacity: ready ? 1 : 0.5 }}>🚀 Share to X</button>
        <button onClick={() => blobRef.current && download(blobRef.current)} disabled={!ready} style={{ ...V2Styles.btnSecondary, padding: "13px 20px", cursor: "pointer", opacity: ready ? 1 : 0.5 }}>Save image</button>
      </div>
      {note && <div style={{ fontSize: 12, color: V2.textMuted, marginTop: 8, textAlign: "center" }}>{note}</div>}
    </div>
  );
}
