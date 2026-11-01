// 1080×1080 share card for a WAGO: Fright Bits collectible, drawn in the browser. Uses only public data (name, art, owner handle).
function wrap(ctx, text, maxW) {
  const words = String(text).split(" "), lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });

export async function drawFrightBitsCard({ name, character, description, image_url, number, total = 10, owner }) {
  const S = 1080, c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d");
  const g = x.createRadialGradient(S / 2, S * 0.42, 80, S / 2, S / 2, S * 0.8);
  g.addColorStop(0, "#3a1a5c"); g.addColorStop(0.55, "#1b0e2e"); g.addColorStop(1, "#090512");
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.strokeStyle = "#f59e0b"; x.lineWidth = 8; x.strokeRect(28, 28, S - 56, S - 56);
  x.textAlign = "center"; x.fillStyle = "#f59e0b"; x.font = "800 34px system-ui, sans-serif";
  x.fillText("WAGO: FRIGHT BITS", S / 2, 96);
  try {
    const im = await loadImg(image_url);
    const box = 560, r = Math.min(box / im.width, box / im.height);
    x.shadowColor = "rgba(245,158,11,0.45)"; x.shadowBlur = 60;
    x.drawImage(im, (S - im.width * r) / 2, 130, im.width * r, im.height * r); x.shadowBlur = 0;
  } catch {}
  x.fillStyle = "#fff"; x.font = "800 64px system-ui, sans-serif";
  let y = 780; for (const l of wrap(x, name, 920).slice(0, 2)) { x.fillText(l, S / 2, y); y += 70; }
  x.fillStyle = "#c4b5fd"; x.font = "600 34px system-ui, sans-serif";
  x.fillText(`${character} · Rare · 1 of 1 · No. ${number} of ${total}`, S / 2, y + 4);
  if (description) { x.fillStyle = "rgba(255,255,255,0.78)"; x.font = "italic 30px system-ui, sans-serif"; let yy = y + 56; for (const l of wrap(x, description, 840).slice(0, 2)) { x.fillText(l, S / 2, yy); yy += 38; } }
  x.fillStyle = "#f59e0b"; x.font = "700 34px system-ui, sans-serif";
  if (owner) x.fillText(`Owned by @${owner}`, S / 2, 988);
  x.fillStyle = "rgba(255,255,255,0.6)"; x.font = "600 26px system-ui, sans-serif";
  x.fillText("proofofgrass.app · in-app collectible, not an NFT", S / 2, 1030);
  return c;
}

export async function shareFrightBits(item, owner) {
  const { withShareTags } = await import("./shareTags");
  const text = withShareTags(`I got ${item.name} (1 of 1) from WAGO: Fright Bits! 🎃`);
  const url = `${window.location.origin}/fright-bits/${item.slug}`;
  const canvas = await drawFrightBitsCard({ ...item, owner });
  const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
  const file = blob && new File([blob], `${item.slug}.png`, { type: "image/png" });
  if (file && navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text, url }); return; } catch (e) { if (e?.name === "AbortError") return; } }
  if (blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${item.slug}.png`; a.click(); }
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
}
