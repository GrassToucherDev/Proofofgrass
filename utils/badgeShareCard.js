// utils/badgeShareCard.js — "Badge earned" share card (1080×1350), same bright look as the Spotlight / Grass Draw cards.
import { loadImageSafe } from "./spotlightImage";
import { ROMAN, TIER_COLORS } from "./badges/registry";
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

export const badgeCaption = (username, b) =>
  withShareTags(`🏅 Just unlocked ${b.label} on Proof of Grass: ${b.count.toLocaleString()} ${b.unit}! 🌱\n\nproofofgrass.app/u/${username}`);

export async function renderBadgeCard({ username, badge }) {
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

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  try { const logo = await loadImageSafe("/touchgrass-transparent.png"); ctx.drawImage(logo, W/2 - 30, 52, 60, 60); } catch {}
  ctx.font = "800 24px 'Nunito',sans-serif"; ctx.fillStyle = "#1a4a0a"; ctx.letterSpacing = "0.22em";
  ctx.fillText("PROOF OF GRASS", W/2, 148); ctx.letterSpacing = "0px";

  // Ribbon
  const rw = 700, rh = 112, rx = (W - rw)/2, ry = 176;
  ctx.fillStyle = GOLD; rr(ctx, rx, ry, rw, rh, 56); ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = GREEN; rr(ctx, rx, ry, rw, rh, 56); ctx.stroke();
  ctx.fillStyle = INK; ctx.font = "700 52px 'Fredoka',system-ui,sans-serif"; ctx.textBaseline = "middle";
  ctx.fillText("🏅 BADGE EARNED", W/2, ry + rh/2 + 3); ctx.textBaseline = "alphabetic";

  // Badge art (halo + image, or a drawn medal if the art isn't there yet)
  const BY = 330, BS = 480, cx = W/2, cy = BY + BS/2;
  const halo = ctx.createRadialGradient(cx, cy, 40, cx, cy, BS * 0.62);
  halo.addColorStop(0, "rgba(255,255,255,0.95)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo; ctx.fillRect(0, BY - 60, W, BS + 120);
  const artTier = badge.tier > 0 ? badge.tier : 1;
  let drew = false;
  try {
    const im = await loadImageSafe(`/badges/${badge.id}-${artTier}.png`);
    const k = Math.min(BS / im.width, BS / im.height);
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.25)"; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
    ctx.drawImage(im, cx - im.width * k / 2, cy - im.height * k / 2, im.width * k, im.height * k); ctx.restore(); drew = true;
  } catch {}
  if (!drew) {
    const [rim, face] = TIER_COLORS[Math.min(badge.tier, TIER_COLORS.length - 1)];
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, BS/2 - 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = face; ctx.beginPath(); ctx.arc(cx, cy, BS/2 - 60, 0, Math.PI * 2); ctx.fill();
    ctx.font = "170px serif"; ctx.textBaseline = "middle"; ctx.fillStyle = INK; ctx.fillText(badge.emoji, cx, cy + 8); ctx.textBaseline = "alphabetic";
  }

  // Name + count
  ctx.fillStyle = INK; fit(ctx, badge.label, 900, 92, 48); ctx.fillText(badge.label, cx, 878);
  ctx.font = "800 34px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a";
  ctx.fillText(`${badge.count.toLocaleString()} ${badge.unit}`, cx, 928);

  // Panel: blurb + tier dots + username
  const px = 70, py = 968, pw = W - 140, ph = 268;
  const multi = badge.maxTier > 1;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.14)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  ctx.fillStyle = CREAM; rr(ctx, px, py, pw, ph, 40); ctx.fill(); ctx.restore();
  ctx.lineWidth = 7; ctx.strokeStyle = GREEN; rr(ctx, px, py, pw, ph, 40); ctx.stroke();
  ctx.fillStyle = INK; fit(ctx, `@${username}`, pw - 80, 66, 36); ctx.fillText(`@${username}`, cx, py + (multi ? 88 : 118));
  ctx.font = "700 28px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.fillText(badge.blurb, cx, py + (multi ? 138 : 176));
  if (badge.maxTier > 1) {
    const n = badge.maxTier, gap = 46, x0 = cx - ((n - 1) * gap) / 2;
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.arc(x0 + i * gap, py + 190, 15, 0, Math.PI * 2);
      if (i < badge.tier) { ctx.fillStyle = GOLD; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = GREEN; ctx.stroke(); }
      else { ctx.fillStyle = "#e6eadb"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#c3ccb6"; ctx.stroke(); }
    }
    ctx.font = "800 20px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.letterSpacing = "0.08em";
    ctx.fillText(`TIER ${ROMAN[badge.tier]} OF ${ROMAN[badge.maxTier]}`, cx, py + 240); ctx.letterSpacing = "0px";
  }
  ctx.font = "800 24px 'Nunito',sans-serif"; ctx.fillStyle = GREEN; ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", cx, H - 40); ctx.letterSpacing = "0px";
  return c.toDataURL("image/png");
}
