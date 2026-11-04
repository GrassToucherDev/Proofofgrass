// utils/rankShareCard.js — leaderboard "my rank" share card (1080×1350), same bright look as the other cards.
import { loadImageSafe } from "./spotlightImage";
import { glossPill, TIER_PAL, rr as rrP } from "./proofCardRender";
import { drawFrame, drawFooter, loadFrameAssets, fitText, todayStr, INK as INK2, GREEN as GREEN2, NUN, FRED } from "./cardFrame";
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
  try { await Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]); } catch {}
  const a = await loadFrameAssets("/card/bg.jpg", ["/touchgrass-transparent.png"]);
  const g = drawFrame(ctx, W, H, a, "LEADERBOARD RANK");
  const { cx, PX, PW } = g;

  // avatar
  const AY = 478, AR = 82;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,.25)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, AY, AR + 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, AY, AR, 0, Math.PI * 2); ctx.clip();
  let drew = false;
  if (r.avatarUrl) { try { const im = await loadImageSafe(r.avatarUrl); ctx.drawImage(im, cx - AR, AY - AR, AR * 2, AR * 2); drew = true; } catch {} }
  if (!drew) { ctx.fillStyle = "#e3f3d4"; ctx.fillRect(cx - AR, AY - AR, AR * 2, AR * 2); const lg = a.extra[0]; if (lg) ctx.drawImage(lg, cx - 58, AY - 58, 116, 116); }
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = GREEN; ctx.beginPath(); ctx.arc(cx, AY, AR + 2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = INK2; fitText(ctx, `@${r.username}`, 860, 64, 36); ctx.fillText(`@${r.username}`, cx, AY + AR + 70);

  // gold pill + big rank
  const py0 = AY + AR + 98, pal = TIER_PAL[4], pw0 = 400;
  glossPill(ctx, cx - pw0 / 2, py0, pw0, 70, pal);
  ctx.save(); ctx.fillStyle = pal.tx; ctx.font = `700 38px ${FRED}`; ctx.letterSpacing = "2px"; ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2;
  ctx.fillText("GLOBAL RANK", cx + 1, py0 + 49); ctx.restore();
  const big = `#${r.rank.toLocaleString()}`, by = py0 + 70 + 138;
  ctx.fillStyle = INK2; fitText(ctx, big, 700, 160, 80);
  const bw = ctx.measureText(big).width, hasM = !!medal(r.rank), nx = cx + (hasM ? 45 : 0);
  ctx.fillText(big, nx, by);
  if (hasM) { ctx.font = "96px serif"; ctx.fillText(medal(r.rank), nx - bw / 2 - 62, by - 8); }
  ctx.font = `800 28px ${NUN}`; ctx.fillStyle = "#2d5a1a";
  ctx.fillText(`of ${r.total.toLocaleString()} players · Top ${r.pct}%`, cx, by + 50);

  // stats
  const stats = [
    { v: Number(r.grassScore).toLocaleString(), l: "GRASS SCORE" },
    { v: `${r.currentStreak}d`, l: "CURRENT STREAK" },
    { v: `${r.bestStreak}d`, l: "BEST STREAK" },
  ];
  const gap = 18, sw = (PW - 88 - gap * 2) / 3, sy = by + 82, sh = 112;
  stats.forEach((s, i) => {
    const x = PX + 44 + i * (sw + gap), mx = x + sw / 2;
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,.16)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    const gr = ctx.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, "#fffef6"); gr.addColorStop(1, "#f6edcf"); ctx.fillStyle = gr; rrP(ctx, x, sy, sw, sh, 30); ctx.fill(); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = GREEN; rrP(ctx, x, sy, sw, sh, 30); ctx.stroke();
    ctx.fillStyle = INK2; fitText(ctx, s.v, sw - 30, 52, 28); ctx.fillText(s.v, mx, sy + 58);
    ctx.font = `800 17px ${NUN}`; ctx.fillStyle = GREEN; ctx.letterSpacing = "3px"; ctx.fillText(s.l, mx + 1, sy + 92); ctx.letterSpacing = "0px";
  });

  drawFooter(ctx, W, H, a, g, { leftLabel: "CERTIFIED BY", leftText: "Touch Grass", rightText: todayStr() });
  return c.toDataURL("image/png");
}
