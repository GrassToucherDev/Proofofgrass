// utils/yardResultCard.js — Yard challenge result share card (1080×1350): 1v1 or Grove vs Grove. Same bright look as the other cards.
import { loadImageSafe } from "./spotlightImage";
import { glossPill, TIER_PAL, rr as rrP } from "./proofCardRender";
import { drawFrame, drawFooter, loadFrameAssets, fitText, todayStr, INK as INK2, GREEN as GREEN2, NUN, FRED } from "./cardFrame";
import { withShareTags } from "./shareTags";
import { bannerSrc, bannerFallbackUrl } from "./groveBanners";

const INK = "#0d2a05", GREEN = "#1f6b12", CREAM = "#fdf6e2", GOLD = "#f6b93b";
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function fit(ctx, text, maxW, start, min, weight = 700, family = "'Fredoka',system-ui,sans-serif") {
  let px = start; ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = `${weight} ${px}px ${family}`; }
}
function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x - (dw - w) / 2, y - (dh - h) / 2, dw, dh);
}

// d: { kind:"1v1"|"grove", a:{label, avatarUrl?, banner?, days}, b:{…}, duration, result:"won"|"tied"|"no_finish", winner:"a"|"b"|null, start?, end?, link }
export function yardResultCaption(d) {
  const w = d.winner === "a" ? d.a : d.winner === "b" ? d.b : null, l = d.winner === "a" ? d.b : d.a;
  const tag = d.kind === "grove" ? "Grove challenge" : "challenge";
  let t;
  if (d.result === "won" && w) t = `🏆 ${w.label} beat ${l.label} ${w.days ?? 0}–${l.days ?? 0} in a ${d.duration}-day Proof of Grass ${tag}! 🌿`;
  else if (d.result === "tied") t = `🤝 ${d.a.label} and ${d.b.label} tied ${d.a.days ?? 0}–${d.b.days ?? 0} in a ${d.duration}-day Proof of Grass ${tag}! 🌿`;
  else t = `🌿 ${d.a.label} vs ${d.b.label}: a ${d.duration}-day Proof of Grass ${tag}.`;
  return withShareTags(`${t}\n\n${d.link}`);
}

async function sideImage(d, side) {
  if (d.kind === "grove") {
    try { return await loadImageSafe(bannerSrc(side.banner)); } catch { return loadImageSafe(bannerFallbackUrl(side.banner?.id || "default")).catch(() => null); }
  }
  if (side.avatarUrl) { try { return await loadImageSafe(side.avatarUrl); } catch {} }
  return null;
}

export async function renderYardResultCard(d) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  try { await Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]); } catch {}
  const a = await loadFrameAssets("/card/bg.jpg", ["/touchgrass-transparent.png"]);
  const g = drawFrame(ctx, W, H, a, "THE YARD");
  const { cx } = g, logo = a.extra[0];

  // mode pill
  const label = `${d.kind === "grove" ? "GROVE VS GROVE" : "HEAD TO HEAD"} · ${d.duration} DAYS`, pal = TIER_PAL[4];
  const pw0 = 660, py0 = 386;
  glossPill(ctx, cx - pw0 / 2, py0, pw0, 66, pal);
  ctx.save(); ctx.fillStyle = pal.tx; ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2; ctx.letterSpacing = "2px";
  fitText(ctx, label, pw0 - 60, 36, 22); ctx.textAlign = "center"; ctx.fillText(label, cx + 1, py0 + 46); ctx.restore();

  const sides = [{ s: d.a, x: 300, k: "a" }, { s: d.b, x: 780, k: "b" }];
  const imgs = await Promise.all(sides.map((o) => sideImage(d, o.s)));
  const VY = 490, VS = 200, vcy = VY + VS / 2;
  for (let i = 0; i < 2; i++) {
    const { s, x, k } = sides[i], win = d.winner === k, im = imgs[i];
    ctx.save();
    if (d.kind === "grove") {
      const bw = 380, bh = VS - 10, bx = x - bw / 2, by = VY + 5;
      ctx.save(); ctx.shadowColor = win ? "rgba(246,185,59,0.7)" : "rgba(26,74,10,0.18)"; ctx.shadowBlur = win ? 36 : 18; ctx.fillStyle = "#cfe8c0"; rr(ctx, bx, by, bw, bh, 30); ctx.fill(); ctx.restore();
      ctx.save(); rr(ctx, bx, by, bw, bh, 30); ctx.clip(); if (im) cover(ctx, im, bx, by, bw, bh); ctx.restore();
      ctx.lineWidth = win ? 9 : 6; ctx.strokeStyle = win ? GOLD : GREEN; rr(ctx, bx, by, bw, bh, 30); ctx.stroke();
    } else {
      const R = VS / 2;
      ctx.save(); ctx.shadowColor = win ? "rgba(246,185,59,0.8)" : "rgba(26,74,10,0.18)"; ctx.shadowBlur = win ? 40 : 18; ctx.fillStyle = "#e3f3d4"; ctx.beginPath(); ctx.arc(x, vcy, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(x, vcy, R, 0, Math.PI * 2); ctx.clip();
      if (im) cover(ctx, im, x - R, vcy - R, R * 2, R * 2); else if (logo) ctx.drawImage(logo, x - 70, vcy - 70, 140, 140);
      ctx.restore();
      ctx.lineWidth = win ? 11 : 8; ctx.strokeStyle = win ? GOLD : GREEN; ctx.beginPath(); ctx.arc(x, vcy, R + 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (win) { // winner badge sits on the bottom edge of the avatar
      const bw2 = 210, bh2 = 52, by2 = VY + VS - 24;
      glossPill(ctx, x - bw2 / 2, by2, bw2, bh2, TIER_PAL[4]);
      ctx.save(); ctx.fillStyle = TIER_PAL[4].tx; ctx.font = `700 30px ${FRED}`; ctx.letterSpacing = "2px"; ctx.textAlign = "center"; ctx.fillText("WINNER", x + 1, by2 + 38); ctx.restore();
    }
    ctx.textAlign = "center"; ctx.fillStyle = INK2; fitText(ctx, s.label, 430, 46, 26); ctx.fillText(s.label, x, VY + VS + 82);
    // score capsule
    const cw = 380, ch = 138, cxl = x - cw / 2, cy = VY + VS + 108;
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,.16)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    const gr = ctx.createLinearGradient(0, cy, 0, cy + ch); gr.addColorStop(0, "#fffef6"); gr.addColorStop(1, "#f6edcf"); ctx.fillStyle = gr; rrP(ctx, cxl, cy, cw, ch, 34); ctx.fill(); ctx.restore();
    ctx.lineWidth = 5; ctx.strokeStyle = win ? GOLD : GREEN; rrP(ctx, cxl, cy, cw, ch, 34); ctx.stroke();
    ctx.fillStyle = INK2; ctx.font = `700 84px ${FRED}`; ctx.fillText(String(s.days ?? 0), x, cy + 84);
    ctx.font = `800 20px ${NUN}`; ctx.fillStyle = GREEN; ctx.letterSpacing = "4px"; ctx.fillText(`OF ${d.duration} DAYS`, x + 2, cy + 118); ctx.letterSpacing = "0px";
  }
  // VS badge
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  const vg = ctx.createLinearGradient(0, vcy - 46, 0, vcy + 46); vg.addColorStop(0, "#fff0b8"); vg.addColorStop(1, "#f2c14e"); ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(cx, vcy, 46, 0, 7); ctx.fill(); ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = GREEN; ctx.beginPath(); ctx.arc(cx, vcy, 46, 0, 7); ctx.stroke();
  ctx.fillStyle = INK2; ctx.font = `700 40px ${FRED}`; ctx.textBaseline = "middle"; ctx.fillText("VS", cx, vcy + 3); ctx.textBaseline = "alphabetic";

  // result pill
  const w = d.winner === "a" ? d.a : d.winner === "b" ? d.b : null;
  const res = d.result === "won" && w ? `${w.label} WON` : d.result === "tied" ? "IT'S A TIE" : "NO FINISH";
  const rp = d.result === "won" ? TIER_PAL[4] : d.result === "tied" ? TIER_PAL[3] : { a: "#e9eee2", b: "#bcc6b0", bd: "#8b9a7c", tx: "#2d3a22" };
  const rw = 860, rh = 90, ry = 966;
  glossPill(ctx, cx - rw / 2, ry, rw, rh, rp);
  ctx.save(); ctx.fillStyle = rp.tx; ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2; ctx.letterSpacing = "2px";
  fitText(ctx, res, rw - 80, 52, 28); ctx.textAlign = "center"; ctx.fillText(res, cx + 1, ry + rh / 2 + 18); ctx.restore();

  let rightLabel = "DATE", rightText = todayStr();
  if (d.start && d.end) {
    const f = (x) => new Date(x).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    rightLabel = "DATES"; rightText = `${f(d.start)} → ${f(d.end)}`;
  }
  drawFooter(ctx, W, H, a, g, { leftLabel: "CERTIFIED BY", leftText: "Touch Grass", rightLabel, rightText });
  return c.toDataURL("image/png");
}
