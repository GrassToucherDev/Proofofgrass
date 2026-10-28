// components/wago-drops/WagoShareCard.js
// WAGO Drops share card — its own design, separate from the Proof of Grass
// result card (which stays reserved for daily streak proofs).
//
// Renders a 4:5 canvas: the user's photo, the WAGO mascot, drop + reward +
// rarity, then offers "Share to X" (native share with the image where
// supported, otherwise download + X intent) and "Save image".
// The exact drop hint is intentionally NOT printed on the card, so sharing
// doesn't give away the spot to people who haven't walked there.

import { useEffect, useRef, useState } from "react";
import { V2, V2Styles } from "../../utils/v2Theme";
import { WAGO_POSES } from "./Wago";

import { withShareTags } from "../../utils/shareTags";
const W = 1080;
const H = 1350;

// Different mascot pose per rarity so higher drops feel bigger.
const RARITY_POSE = { common: "salute", rare: "wave", epic: "ticket", legendary: "cheer" };

const RARITY_STYLE = {
  common:    { label: "COMMON",    bg: "#e8f4fd", fg: "#1a4a0a" },
  rare:      { label: "RARE",      bg: "#c5e3f7", fg: "#0d2a5a" },
  epic:      { label: "EPIC",      bg: "#e9d9fb", fg: "#4a1a7a" },
  legendary: { label: "LEGENDARY", bg: "#fef3d8", fg: "#8a5a00" },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function coverDraw(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

async function drawCard(canvas, { photoUrl, campaignName, rewardText, rarity, tickets }) {
  const ctx = canvas.getContext("2d");
  const font = "'Nunito', -apple-system, 'Segoe UI', sans-serif";
  try { await document.fonts?.ready; } catch {}

  // Sky background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#c5e3f7"); bg.addColorStop(0.45, "#e8f4fd"); bg.addColorStop(1, "#f0f8ee");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Photo (rounded, white frame)
  const px = 60, py = 60, pw = W - 120, ph = 760;
  ctx.save();
  ctx.shadowColor = "rgba(26,74,10,0.25)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#fff"; roundRect(ctx, px - 14, py - 14, pw + 28, ph + 28, 54); ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 42); ctx.clip();
  try { coverDraw(ctx, await loadImage(photoUrl), px, py, pw, ph); }
  catch { ctx.fillStyle = "#dcebd3"; ctx.fillRect(px, py, pw, ph); }
  ctx.restore();

  // Rarity pill on photo
  const r = RARITY_STYLE[rarity] || RARITY_STYLE.common;
  ctx.font = `800 30px ${font}`;
  const rw = ctx.measureText(r.label).width + 56;
  ctx.fillStyle = r.bg; roundRect(ctx, px + 28, py + 28, rw, 58, 29); ctx.fill();
  ctx.fillStyle = r.fg; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(r.label, px + 56, py + 58);

  // Mascot overlapping photo bottom-right
  try {
    const wago = await loadImage(WAGO_POSES[RARITY_POSE[rarity]] || WAGO_POSES.salute);
    const mh = 400, mw = (wago.width / wago.height) * mh;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.drawImage(wago, W - 70 - mw, py + ph - mh + 70, mw, mh);
    ctx.restore();
  } catch {}

  // Text block
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillStyle = "#3d7a12"; ctx.font = `800 30px ${font}`;
  ctx.fillText("I FOUND A WAGO DROP", 70, 920);

  ctx.fillStyle = "#0d2a05"; ctx.font = `700 64px ${font}`;
  let name = campaignName || "WAGO Drop";
  while (ctx.measureText(name).width > 930 && name.length > 4) name = name.slice(0, -2);
  if (name !== (campaignName || "WAGO Drop")) name += "…";
  ctx.fillText(name, 70, 1000);

  ctx.fillStyle = "#5ba622";
  let rs = 76;
  ctx.font = `800 ${rs}px ${font}`;
  while (ctx.measureText(rewardText).width > 940 && rs > 40) { rs -= 4; ctx.font = `800 ${rs}px ${font}`; }
  ctx.fillText(rewardText, 70, 1100);

  if (tickets > 0) {
    const label = `🎟️  +${tickets} Grass Tickets`;
    ctx.font = `700 34px ${font}`;
    const tw = ctx.measureText(label).width + 52;
    ctx.fillStyle = "#fff"; roundRect(ctx, 70, 1132, tw, 64, 32); ctx.fill();
    ctx.fillStyle = "#1a4a0a"; ctx.textBaseline = "middle";
    ctx.fillText(label, 96, 1165);
    ctx.textBaseline = "alphabetic";
  }

  // Footer
  ctx.fillStyle = "rgba(13,42,5,0.55)"; ctx.font = `600 28px ${font}`;
  ctx.fillText("Proof I was there  ·  proofofgrass.app/wago-drops", 70, 1286);
}

export default function WagoShareCard({ photoUrl, campaignName, rewardText, rarity = "common", tickets = 0, shareText: shareTextRaw, onShared }) {
  const shareText = withShareTags(shareTextRaw);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState(null);
  const blobRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setReady(false);
    blobRef.current = null;
    drawCard(canvasRef.current, { photoUrl, campaignName, rewardText, rarity, tickets }).then(() => {
      if (!alive) return;
      canvasRef.current.toBlob(b => { blobRef.current = b; if (alive) setReady(true); }, "image/png");
    });
    return () => { alive = false; };
  }, [photoUrl, campaignName, rewardText, rarity, tickets]);

  function download(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "wago-drop.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function shareToX() {
    const blob = blobRef.current;
    if (!blob) return;
    const file = new File([blob], "wago-drop.png", { type: "image/png" });
    const intent = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        setNote("Choose X in the share sheet, post, then come back and paste the link.");
        await navigator.share({ files: [file], text: shareText });
      } else {
        download(blob);
        navigator.clipboard?.writeText(shareText).catch(() => {});
        setNote("Image saved. Attach it to your X post, then come back and paste the link.");
        intent();
      }
      onShared?.();
    } catch (e) {
      if (e?.name === "AbortError") return;   // user closed the share sheet
      download(blob);
      intent();
      setNote("Image saved. Attach it to your X post, then come back and paste the link.");
      onShared?.();
    }
  }

  return (
    <div style={{ margin: "12px 0 4px" }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: "100%", height: "auto", borderRadius: V2.radiusLg, boxShadow: V2.shadowCard, display: "block", opacity: ready ? 1 : 0.5 }} />
      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={shareToX} disabled={!ready}
          style={{ ...V2Styles.btnPrimary, flex: 1, justifyContent: "center", padding: "13px 20px", opacity: ready ? 1 : 0.5 }}>
          🚀 Share to X
        </button>
        <button onClick={() => blobRef.current && download(blobRef.current)} disabled={!ready}
          style={{ ...V2Styles.btnSecondary, padding: "13px 20px", cursor: "pointer", opacity: ready ? 1 : 0.5 }}>
          Save image
        </button>
      </div>
      {note && <div style={{ fontSize: 12, color: V2.textMuted, marginTop: 8, textAlign: "center" }}>{note}</div>}
    </div>
  );
}
