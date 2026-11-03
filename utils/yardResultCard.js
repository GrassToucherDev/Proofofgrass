// utils/yardResultCard.js — Yard challenge result share card (1080×1350): 1v1 or Grove vs Grove. Same bright look as the other cards.
import { loadImageSafe } from "./spotlightImage";
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
  const W = 1080, H = 1350, cx = W / 2;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  try { await Promise.all([document.fonts.load("700 40px 'Fredoka'"), document.fonts.load("800 30px 'Nunito'")]); } catch {}

  ctx.fillStyle = "#eef6e2"; ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "rgba(197,227,247,0.7)"); sky.addColorStop(0.4, "rgba(238,246,226,0)");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  try {
    const land = await loadImageSafe("/hero-landscape.png");
    const lh = W * land.height / land.width;
    ctx.save(); ctx.globalAlpha = 0.5; ctx.drawImage(land, 0, H - lh, W, lh); ctx.restore();
    const f = ctx.createLinearGradient(0, H - lh, 0, H - lh + 240);
    f.addColorStop(0, "rgba(238,246,226,1)"); f.addColorStop(1, "rgba(238,246,226,0)");
    ctx.fillStyle = f; ctx.fillRect(0, H - lh, W, 240);
  } catch {}

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const logo = await loadImageSafe("/touchgrass-transparent.png").catch(() => null);
  if (logo) ctx.drawImage(logo, cx - 30, 52, 60, 60);
  ctx.font = "800 24px 'Nunito',sans-serif"; ctx.fillStyle = "#1a4a0a"; ctx.letterSpacing = "0.22em";
  ctx.fillText("PROOF OF GRASS", cx, 148); ctx.letterSpacing = "0px";

  const label = d.kind === "grove" ? "🌳 GROVE CHALLENGE" : "⚔️ CHALLENGE RESULT";
  const rw = 800, rh = 112, rx = (W - rw) / 2, ry = 176;
  ctx.fillStyle = GOLD; rr(ctx, rx, ry, rw, rh, 56); ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = GREEN; rr(ctx, rx, ry, rw, rh, 56); ctx.stroke();
  ctx.fillStyle = INK; fit(ctx, label, rw - 70, 50, 30); ctx.textBaseline = "middle"; ctx.fillText(label, cx, ry + rh / 2 + 3); ctx.textBaseline = "alphabetic";
  ctx.font = "800 28px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.letterSpacing = "0.12em";
  ctx.fillText(`${d.duration}-DAY CHALLENGE`, cx, 330); ctx.letterSpacing = "0px";

  const sides = [{ s: d.a, x: 290, k: "a" }, { s: d.b, x: 790, k: "b" }];
  const imgs = await Promise.all(sides.map((o) => sideImage(d, o.s)));
  const VY = 410, VS = 240;
  for (let i = 0; i < 2; i++) {
    const { s, x, k } = sides[i], win = d.winner === k, im = imgs[i];
    const vcy = VY + VS / 2;
    ctx.save();
    if (d.kind === "grove") {
      const bw = 400, bh = VS - 10, bx = x - bw / 2, by = VY + 5;
      ctx.save(); ctx.shadowColor = win ? "rgba(246,185,59,0.7)" : "rgba(26,74,10,0.18)"; ctx.shadowBlur = win ? 36 : 18; ctx.fillStyle = "#cfe8c0"; rr(ctx, bx, by, bw, bh, 30); ctx.fill(); ctx.restore();
      ctx.save(); rr(ctx, bx, by, bw, bh, 30); ctx.clip(); if (im) cover(ctx, im, bx, by, bw, bh); ctx.restore();
      ctx.lineWidth = win ? 9 : 6; ctx.strokeStyle = win ? GOLD : GREEN; rr(ctx, bx, by, bw, bh, 30); ctx.stroke();
    } else {
      const R = VS / 2;
      ctx.save(); ctx.shadowColor = win ? "rgba(246,185,59,0.8)" : "rgba(26,74,10,0.18)"; ctx.shadowBlur = win ? 40 : 18; ctx.fillStyle = "#e3f3d4"; ctx.beginPath(); ctx.arc(x, vcy, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(x, vcy, R, 0, Math.PI * 2); ctx.clip();
      if (im) cover(ctx, im, x - R, vcy - R, R * 2, R * 2); else if (logo) ctx.drawImage(logo, x - 80, vcy - 80, 160, 160);
      ctx.restore();
      ctx.lineWidth = win ? 11 : 8; ctx.strokeStyle = win ? GOLD : GREEN; ctx.beginPath(); ctx.arc(x, vcy, R + 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (win) {
      const pw = 230, ph = 56, px = x - pw / 2, py = VY - 34;
      ctx.fillStyle = GOLD; rr(ctx, px, py, pw, ph, 28); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = GREEN; rr(ctx, px, py, pw, ph, 28); ctx.stroke();
      ctx.fillStyle = INK; ctx.font = "700 30px 'Fredoka',system-ui,sans-serif"; ctx.textBaseline = "middle"; ctx.fillText("🏆 WINNER", x, py + ph / 2 + 2); ctx.textBaseline = "alphabetic";
    }
    ctx.fillStyle = INK; fit(ctx, s.label, 440, 50, 28); ctx.fillText(s.label, x, 742);
    // score card
    const cw = 420, ch = 170, cxl = x - cw / 2, cy = 785;
    ctx.fillStyle = CREAM; rr(ctx, cxl, cy, cw, ch, 32); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = win ? GOLD : GREEN; rr(ctx, cxl, cy, cw, ch, 32); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = "700 92px 'Fredoka',system-ui,sans-serif"; ctx.fillText(String(s.days ?? 0), x, cy + 98);
    ctx.font = "800 22px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.letterSpacing = "0.06em";
    ctx.fillText(`OF ${d.duration} DAYS`, x, cy + 144); ctx.letterSpacing = "0px";
  }
  // VS
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(cx, VY + VS / 2, 50, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = GREEN; ctx.beginPath(); ctx.arc(cx, VY + VS / 2, 50, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = INK; ctx.font = "700 44px 'Fredoka',system-ui,sans-serif"; ctx.textBaseline = "middle"; ctx.fillText("VS", cx, VY + VS / 2 + 3); ctx.textBaseline = "alphabetic";

  // Result ribbon
  const w = d.winner === "a" ? d.a : d.winner === "b" ? d.b : null;
  const res = d.result === "won" && w ? `🏆 ${w.label} won` : d.result === "tied" ? "🤝 It's a tie" : "💤 No finish";
  const bw = 900, bh = 120, bx = (W - bw) / 2, by = 1000;
  ctx.fillStyle = CREAM; rr(ctx, bx, by, bw, bh, 60); ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = GREEN; rr(ctx, bx, by, bw, bh, 60); ctx.stroke();
  ctx.fillStyle = INK; fit(ctx, res, bw - 80, 58, 32); ctx.textBaseline = "middle"; ctx.fillText(res, cx, by + bh / 2 + 3); ctx.textBaseline = "alphabetic";
  if (d.start && d.end) {
    const f = (x) => new Date(x).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    ctx.font = "800 28px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.fillText(`${f(d.start)} → ${f(d.end)}`, cx, 1180);
  }
  ctx.font = "800 24px 'Nunito',sans-serif"; ctx.fillStyle = GREEN; ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", cx, H - 40); ctx.letterSpacing = "0px";
  return c.toDataURL("image/png");
}
