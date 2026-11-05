// utils/luckyTouchCard.js — "Lucky Touch" share card (1080×1350), same bright look as the badge / rank / Spotlight cards.
import { glossPill, TIER_PAL } from "./proofCardRender";
import { drawFrame, drawFooter, loadFrameAssets, fitText, todayStr, INK, NUN, FRED } from "./cardFrame";
import { withShareTags } from "./shareTags";

const T = {
  common:    { pill: "LUCKY TOUCH",      pal: 2, icon: "clover", bg: "/card/bg.jpg",        blurb: "A little luck for touching grass today.", sub: "#2d5a1a" },
  rare:      { pill: "RARE LUCKY TOUCH", pal: 6, icon: "clover", bg: "/card/bg.jpg",        blurb: "Not everyone gets this one. Keep touching grass.", sub: "#4a2a8a" },
  legendary: { pill: "SUN'S BLESSING",   pal: 5, icon: "sun",    bg: "/card/bg-sunset.jpg", blurb: "A rare blessing from the Touch Grass Sun.", sub: "#8a5a00" },
};

export const luckyCaption = (username, l) => withShareTags(
  l.tier === "legendary" ? `The Sun's Blessing found me on Proof of Grass: a free shield for touching grass! ☀️\n\nproofofgrass.app/u/${username}`
  : `${l.tier === "rare" ? "A Rare Lucky Touch" : "A Lucky Touch"} on Proof of Grass: +${l.points} Grass Score for touching grass! 🍀\n\nproofofgrass.app/u/${username}`);

export async function renderLuckyTouchCard({ username, lucky }) {
  const W = 1080, H = 1350, t = T[lucky.tier] || T.common;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  try { await Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]); } catch {}
  const a = await loadFrameAssets(t.bg, [`/icons3d/${t.icon}.webp`, "/icons3d/shield.webp", "/icons3d/sprout.webp"]);
  const g = drawFrame(ctx, W, H, a, "LUCKY TOUCH");
  const { cx, PY } = g;

  // icon with halo
  const BS = 340, BY = PY + 330, cy = BY + BS / 2, im = a.extra[0];
  const halo = ctx.createRadialGradient(cx, cy, 30, cx, cy, BS * 0.7);
  halo.addColorStop(0, "rgba(255,255,255,0.95)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo; ctx.fillRect(0, BY - 60, W, BS + 120);
  if (im) { const k = Math.min(BS / im.width, BS / im.height);
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.28)"; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
    ctx.drawImage(im, cx - im.width * k / 2, cy - im.height * k / 2, im.width * k, im.height * k); ctx.restore(); }

  // tier pill
  const pal = TIER_PAL[t.pal], py0 = BY + BS + 14, pw0 = t.pill.length > 12 ? 600 : 500;
  glossPill(ctx, cx - pw0 / 2, py0, pw0, 76, pal);
  ctx.save(); ctx.fillStyle = pal.tx; ctx.font = `700 38px ${FRED}`; ctx.letterSpacing = "2px";
  if (pal.dark) { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowOffsetY = 2; } else { ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 2; }
  ctx.textAlign = "center"; ctx.fillText(t.pill, cx + 1, py0 + 52); ctx.restore();

  // reward
  const ny = py0 + 76 + 100, isShield = lucky.type === "shield";
  ctx.fillStyle = INK; ctx.textAlign = "center";
  const big = isShield ? "+1 SHIELD" : `+${lucky.points}`;
  fitText(ctx, big, 860, 104, 56, 800); ctx.fillText(big, cx, ny);
  ctx.font = `800 32px ${NUN}`; ctx.fillStyle = t.sub; ctx.letterSpacing = "6px";
  ctx.fillText(isShield ? "STREAK PROTECTION" : "GRASS SCORE", cx + 3, ny + 50); ctx.letterSpacing = "0px";
  ctx.fillStyle = "#2d5a1a"; fitText(ctx, t.blurb, 840, 26, 18, 700, NUN); ctx.fillText(t.blurb, cx, ny + 98);

  drawFooter(ctx, W, H, a, g, { leftLabel: "TOUCHED BY", leftText: `@${username}`, rightText: todayStr() });
  return c.toDataURL("image/png");
}
