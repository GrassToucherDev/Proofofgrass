// utils/rankShareCard.js — leaderboard "my rank" share card (1080×1350), same bright look as the other cards.
import { loadImageSafe } from "./spotlightImage";
import { drawShareHeader } from "./shareHeader";
import { withShareTags } from "./shareTags";

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
const medal = (r) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : "");

export const rankCaption = (r) =>
  withShareTags(`🌿 I'm ranked #${r.rank.toLocaleString()} of ${r.total.toLocaleString()} on the Proof of Grass leaderboard, top ${r.pct}%! ${Number(r.grassScore).toLocaleString()} Grass Score.\n\nproofofgrass.app/leaderboard`);

export async function renderRankCard(r) {
  const W = 1080, H = 1350;
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

  const cx = W / 2;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  await drawShareHeader(ctx, W, "Proof of Grass", "Leaderboard");

  const rw = 760, rh = 96, rx = (W - rw) / 2, ry = 196;
  ctx.fillStyle = GOLD; rr(ctx, rx, ry, rw, rh, 48); ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = GREEN; rr(ctx, rx, ry, rw, rh, 48); ctx.stroke();
  ctx.fillStyle = INK; ctx.font = "700 50px 'Fredoka',system-ui,sans-serif"; ctx.textBaseline = "middle";
  ctx.fillText("🏆 LEADERBOARD RANK", cx, ry + rh / 2 + 3); ctx.textBaseline = "alphabetic";

  // Avatar
  const AY = 430, AR = 100;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, AY, AR, 0, Math.PI * 2); ctx.clip();
  let drew = false;
  if (r.avatarUrl) { try { const im = await loadImageSafe(r.avatarUrl); ctx.drawImage(im, cx - AR, AY - AR, AR * 2, AR * 2); drew = true; } catch {} }
  if (!drew) { ctx.fillStyle = "#e3f3d4"; ctx.fillRect(cx - AR, AY - AR, AR * 2, AR * 2); try { const lg = await loadImageSafe("/touchgrass-transparent.png"); ctx.drawImage(lg, cx - 70, AY - 70, 140, 140); } catch {} }
  ctx.restore();
  ctx.lineWidth = 9; ctx.strokeStyle = GREEN; ctx.beginPath(); ctx.arc(cx, AY, AR + 2, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, AY, AR + 13, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = INK; fit(ctx, `@${r.username}`, 920, 80, 46); ctx.fillText(`@${r.username}`, cx, 610);

  // Big rank
  const panelY = 640, panelH = 330;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.14)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  ctx.fillStyle = CREAM; rr(ctx, 70, panelY, W - 140, panelH, 44); ctx.fill(); ctx.restore();
  ctx.lineWidth = 7; ctx.strokeStyle = GREEN; rr(ctx, 70, panelY, W - 140, panelH, 44); ctx.stroke();
  ctx.font = "800 26px 'Nunito',sans-serif"; ctx.fillStyle = "#b8741a"; ctx.letterSpacing = "0.2em";
  ctx.fillText("GLOBAL RANK", cx, panelY + 62); ctx.letterSpacing = "0px";
  const big = `#${r.rank.toLocaleString()}`;
  ctx.fillStyle = INK; fit(ctx, big, 700, 176, 90);
  const bw = ctx.measureText(big).width, hasM = !!medal(r.rank), mgap = 90;
  const nx = cx + (hasM ? mgap / 2 : 0);
  ctx.fillText(big, nx, panelY + 236);
  if (hasM) { ctx.font = "100px serif"; ctx.fillText(medal(r.rank), nx - bw / 2 - 62, panelY + 226); }
  ctx.font = "800 30px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a";
  ctx.fillText(`of ${r.total.toLocaleString()} players · Top ${r.pct}%`, cx, panelY + 298);

  // Stats
  const stats = [
    { v: Number(r.grassScore).toLocaleString(), l: "GRASS SCORE" },
    { v: `${r.currentStreak}d`, l: "CURRENT STREAK" },
    { v: `${r.bestStreak}d`, l: "BEST STREAK" },
  ];
  const gap = 18, sw = (W - 140 - gap * 2) / 3, sy = 1000, sh = 190;
  stats.forEach((s, i) => {
    const x = 70 + i * (sw + gap), mx = x + sw / 2;
    ctx.fillStyle = CREAM; rr(ctx, x, sy, sw, sh, 30); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = GREEN; rr(ctx, x, sy, sw, sh, 30); ctx.stroke();
    ctx.fillStyle = INK; fit(ctx, s.v, sw - 30, 72, 34); ctx.fillText(s.v, mx, sy + 96);
    ctx.font = "800 20px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.letterSpacing = "0.06em"; ctx.fillText(s.l, mx, sy + 146); ctx.letterSpacing = "0px";
  });
  ctx.font = "800 24px 'Nunito',sans-serif"; ctx.fillStyle = GREEN; ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", cx, H - 40); ctx.letterSpacing = "0px";
  return c.toDataURL("image/png");
}
