// utils/streakShareCard.js — streak / streak-milestone share card (1080×1350), same bright look as the other cards.
import { loadImageSafe } from "./spotlightImage";
import { drawShareHeader } from "./shareHeader";
import { withShareTags } from "./shareTags";

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 180, 365, 500, 1000];
const BADGE_TIERS = [7, 14, 30, 50, 100, 180, 365];   // art: /badges/streak-<tier>.png
export const isStreakMilestone = (n) => STREAK_MILESTONES.includes(Number(n));
const nextMilestone = (n) => STREAK_MILESTONES.find((m) => m > n) ?? null;

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

export const streakCaption = (username, streak) => withShareTags(
  isStreakMilestone(streak)
    ? `🔥 ${streak}-day streak on Proof of Grass! ${streak} days in a row of touching grass 🌱\n\nproofofgrass.app/u/${username}`
    : `🔥 Day ${streak} of touching grass on Proof of Grass 🌱\n\nproofofgrass.app/u/${username}`);

export async function renderStreakCard({ username, streak, best }) {
  const W = 1080, H = 1350, cx = W / 2;
  const milestone = isStreakMilestone(streak);
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
  await drawShareHeader(ctx, W, "Proof of Grass", "Streaks");

  const label = milestone ? "🔥 STREAK MILESTONE" : "🔥 DAY STREAK";
  const rw = 780, rh = 96, rx = (W - rw) / 2, ry = 196;
  ctx.fillStyle = GOLD; rr(ctx, rx, ry, rw, rh, 48); ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = GREEN; rr(ctx, rx, ry, rw, rh, 48); ctx.stroke();
  ctx.fillStyle = INK; ctx.font = "700 50px 'Fredoka',system-ui,sans-serif"; ctx.textBaseline = "middle";
  ctx.fillText(label, cx, ry + rh / 2 + 3); ctx.textBaseline = "alphabetic";

  // Streak badge art for the highest tier reached (falls back to nothing if missing)
  const tier = Math.max(1, BADGE_TIERS.filter((t) => streak >= t).length);
  const BS = 390, BY = 316;
  const halo = ctx.createRadialGradient(cx, BY + BS / 2, 30, cx, BY + BS / 2, BS * 0.62);
  halo.addColorStop(0, "rgba(255,255,255,0.95)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo; ctx.fillRect(0, BY - 60, W, BS + 120);
  try {
    const im = await loadImageSafe(`/badges/streak-${tier}.png`);
    const k = Math.min(BS / im.width, BS / im.height);
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.25)"; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
    ctx.drawImage(im, cx - im.width * k / 2, BY + BS / 2 - im.height * k / 2, im.width * k, im.height * k); ctx.restore();
  } catch {}

  // Big number
  ctx.fillStyle = INK; fit(ctx, String(streak), 760, 230, 110); ctx.fillText(String(streak), cx, 910);
  ctx.font = "800 36px 'Nunito',sans-serif"; ctx.fillStyle = "#b8741a"; ctx.letterSpacing = "0.24em";
  ctx.fillText(streak === 1 ? "DAY STREAK" : "DAYS IN A ROW", cx, 968); ctx.letterSpacing = "0px";

  // Panel
  const px = 70, py = 1010, pw = W - 140, ph = 210;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.14)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  ctx.fillStyle = CREAM; rr(ctx, px, py, pw, ph, 40); ctx.fill(); ctx.restore();
  ctx.lineWidth = 7; ctx.strokeStyle = GREEN; rr(ctx, px, py, pw, ph, 40); ctx.stroke();
  ctx.fillStyle = INK; fit(ctx, `@${username}`, pw - 80, 66, 36); ctx.fillText(`@${username}`, cx, py + 86);
  const nm = nextMilestone(streak);
  const line = best && best > streak ? `Best streak: ${best} days` : nm ? `${nm - streak} day${nm - streak === 1 ? "" : "s"} to the ${nm}-day milestone` : "Legend status unlocked";
  ctx.font = "800 28px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.fillText(line, cx, py + 150);

  ctx.font = "800 24px 'Nunito',sans-serif"; ctx.fillStyle = GREEN; ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", cx, H - 40); ctx.letterSpacing = "0px";
  return c.toDataURL("image/png");
}
