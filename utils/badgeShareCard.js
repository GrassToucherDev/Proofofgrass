// utils/badgeShareCard.js — "Badge earned" share card (1080×1350), same bright look as the Spotlight / Grass Draw cards.
import { loadImageSafe } from "./spotlightImage";
import { glossPill, TIER_PAL, rr as rrP } from "./proofCardRender";
import { drawFrame, drawFooter, loadFrameAssets, fitText, todayStr, INK as INK2, GREEN as GREEN2, NUN, FRED } from "./cardFrame";
import { ROMAN, TIER_COLORS } from "./badges/registry";
import { withShareTags } from "./shareTags";

const INK = "#0d2a05", GREEN = "#1f6b12", CREAM = "#fdf6e2", GOLD = "#f6b93b";

function _rrUnused(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function fit(ctx, text, maxW, start, min, weight = 700, family = "'Fredoka',system-ui,sans-serif") {
  let px = start; ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = `${weight} ${px}px ${family}`; }
}

export const badgeCaption = (username, b) =>
  withShareTags(`🏅 Just unlocked ${b.label} on Proof of Grass: ${b.count.toLocaleString()} ${b.unit}! 🌱\n\nproofofgrass.app/u/${username}`);

export async function renderBadgeCard({ username, badge }) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  try { await Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]); } catch {}
  const artTier = badge.tier > 0 ? badge.tier : 1;
  const a = await loadFrameAssets("/card/bg.jpg", [`/badges/${badge.id}-${artTier}.png`]);
  const g = drawFrame(ctx, W, H, a, "BADGE EARNED");
  const { cx, PY } = g;

  // badge art with halo (drawn medal if the art isn't there yet)
  const BS = 310, BY = PY + 334, cy = BY + BS / 2, im = a.extra[0];
  const halo = ctx.createRadialGradient(cx, cy, 30, cx, cy, BS * 0.66);
  halo.addColorStop(0, "rgba(255,255,255,0.95)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo; ctx.fillRect(0, BY - 50, W, BS + 100);
  if (im) {
    const k = Math.min(BS / im.width, BS / im.height);
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.28)"; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
    ctx.drawImage(im, cx - im.width * k / 2, cy - im.height * k / 2, im.width * k, im.height * k); ctx.restore();
  } else {
    const [rim, face] = TIER_COLORS[Math.min(badge.tier, TIER_COLORS.length - 1)];
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, BS / 2 - 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = face; ctx.beginPath(); ctx.arc(cx, cy, BS / 2 - 40, 0, Math.PI * 2); ctx.fill();
    ctx.font = "130px serif"; ctx.textBaseline = "middle"; ctx.fillStyle = INK2; ctx.fillText(badge.emoji, cx, cy + 6); ctx.textBaseline = "alphabetic";
  }

  // gold "UNLOCKED" pill, name, count, blurb
  const pal = TIER_PAL[4], py0 = BY + BS + 16, pw0 = 440;
  glossPill(ctx, cx - pw0 / 2, py0, pw0, 76, pal);
  ctx.save(); ctx.fillStyle = pal.tx; ctx.font = `700 42px ${FRED}`; ctx.letterSpacing = "2px"; ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2;
  ctx.textAlign = "center"; ctx.fillText("UNLOCKED", cx + 1, py0 + 53); ctx.restore();
  const ny = py0 + 76 + 88;
  ctx.fillStyle = INK2; fitText(ctx, badge.label, 900, 80, 44); ctx.fillText(badge.label, cx, ny);
  ctx.font = `800 32px ${NUN}`; ctx.fillStyle = "#b8741a"; ctx.letterSpacing = "2px";
  ctx.fillText(`${badge.count.toLocaleString()} ${badge.unit}`.toUpperCase(), cx + 1, ny + 48); ctx.letterSpacing = "0px";
  ctx.fillStyle = "#2d5a1a"; fitText(ctx, badge.blurb, 840, 26, 18, 700, NUN); ctx.fillText(badge.blurb, cx, ny + 92);

  // tier dots
  if (badge.maxTier > 1) {
    const n = badge.maxTier, gap = 46, x0 = cx - ((n - 1) * gap) / 2, dy = ny + 140;
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.arc(x0 + i * gap, dy, 14, 0, Math.PI * 2);
      if (i < badge.tier) { ctx.fillStyle = GOLD; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = GREEN; ctx.stroke(); }
      else { ctx.fillStyle = "#e6eadb"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#c3ccb6"; ctx.stroke(); }
    }
    ctx.font = `800 20px ${NUN}`; ctx.fillStyle = GREEN; ctx.letterSpacing = "6px";
    ctx.fillText(`TIER ${ROMAN[badge.tier]} OF ${ROMAN[badge.maxTier]}`, cx + 3, dy + 40); ctx.letterSpacing = "0px";
  }

  drawFooter(ctx, W, H, a, g, { leftLabel: "EARNED BY", leftText: `@${username}`, rightText: todayStr() });
  return c.toDataURL("image/png");
}
