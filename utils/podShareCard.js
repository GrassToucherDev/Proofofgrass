// utils/podShareCard.js — "Proof of the Day" winner card (1080×1350), same bright look as the streak card, with the winning photo.
import { loadImageSafe } from "./spotlightImage";
import { rr } from "./proofCardRender";
import { withShareTags } from "./shareTags";

const INK = "#0d2a05", GREEN = "#1f6b12", GOLD = "#f4c542";
const FRED = "Fredoka,'Nunito',system-ui,sans-serif", NUN = "Nunito,system-ui,sans-serif";
const ld = (src) => loadImageSafe(src).catch(() => null);
function fit(ctx, text, maxW, start, min, weight = 700, family = FRED) {
  let px = start; ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = `${weight} ${px}px ${family}`; }
}

export const podCaption = (username) => withShareTags(
  `👑 Proof of the Day on Proof of Grass! The community picked my proof today 🌱\n\nproofofgrass.app/u/${username}`);

export async function renderPodCard({ username, photo, streak, reactions }) {
  const W = 1080, H = 1350, cx = W / 2;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  try { await Promise.all([document.fonts.load("700 40px Fredoka"), document.fonts.load("800 20px Nunito")]); } catch {}
  const [bg, logo, laurelI, sparkles, mascot, calI, grassL, grassR, crown, pic] = await Promise.all([
    ld("/card/bg.jpg"), ld("/touchgrass-logo-card.png"), ld("/card/laurel.png"), ld("/card/sparkles.png"), ld("/card/mascot-side.png"), ld("/card/cal.png"),
    ld("/card/grass-l.png"), ld("/card/grass-r.png"), ld("/card/crown.png"), ld(photo)]);
  if (!pic) throw new Error("photo unavailable");
  ctx.textBaseline = "alphabetic"; ctx.letterSpacing = "0px";
  if (bg) { const sc = Math.max(W / bg.width, H / bg.height); ctx.drawImage(bg, (W - bg.width * sc) / 2, (H - bg.height * sc) / 2, bg.width * sc, bg.height * sc); }
  else { const sk = ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, "#b9ddf6"); sk.addColorStop(1, "#eaf5dc"); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H); }

  const PX = 50, PY = 60, PW = W - 100, PH = 1170;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.fillStyle = "rgba(255,255,255,0.90)"; rr(ctx, PX, PY, PW, PH, 60); ctx.fill(); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.95)"; rr(ctx, PX, PY, PW, PH, 60); ctx.stroke();
  if (sparkles) ctx.drawImage(sparkles, 0, 0, W, H);

  ctx.textAlign = "center";
  if (logo) { const lw = 290, lh = lw * logo.height / logo.width; ctx.drawImage(logo, cx - lw / 2, PY + 16, lw, lh); }
  ctx.fillStyle = INK; ctx.font = `800 58px ${FRED}`; ctx.fillText("PROOF OF THE DAY", cx, PY + 238);
  const tw = ctx.measureText("PROOF OF THE DAY").width;
  if (laurelI) { const lh = 84, lw = lh * laurelI.width / laurelI.height;
    ctx.drawImage(laurelI, cx - tw / 2 - 26 - lw, PY + 238 - 52, lw, lh);
    ctx.save(); ctx.translate(cx + tw / 2 + 26 + lw, PY + 238 - 52); ctx.scale(-1, 1); ctx.drawImage(laurelI, 0, 0, lw, lh); ctx.restore(); }
  ctx.fillStyle = "#b8741a"; ctx.font = `800 24px ${NUN}`; ctx.letterSpacing = "8px";
  ctx.fillText("COMMUNITY FAVORITE", cx + 4, PY + 280); ctx.letterSpacing = "0px";

  // the winning photo, cover-cropped into a gold-framed rounded square
  const S = 600, bx = cx - S / 2, by = PY + 358;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,.3)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
  ctx.fillStyle = GOLD; rr(ctx, bx - 12, by - 12, S + 24, S + 24, 44); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, bx, by, S, S, 34); ctx.clip();
  const k = Math.max(S / pic.width, S / pic.height);
  ctx.drawImage(pic, bx + (S - pic.width * k) / 2, by + (S - pic.height * k) / 2, pic.width * k, pic.height * k); ctx.restore();
  if (crown) { const ch = 84, cw = ch * crown.width / crown.height; ctx.drawImage(crown, cx - cw / 2, by - ch + 18, cw, ch); }

  const total = (reactions?.leaf || 0) + (reactions?.fire || 0);
  ctx.fillStyle = "#2d5a1a"; ctx.font = `800 30px ${NUN}`;
  ctx.fillText(`Day ${streak}${total ? ` · ${total} reaction${total === 1 ? "" : "s"}` : ""}`, cx, by + S + 58);

  // footer capsules: username | date
  const ch = 104, cy0 = PY + PH - ch - 28, gap = 22, lw2 = 540, rw2 = PW - 88 - lw2 - gap, lx = PX + 44, rx = lx + lw2 + gap;
  const cap = (x, w) => {
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,.22)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    const g = ctx.createLinearGradient(0, cy0, 0, cy0 + ch); g.addColorStop(0, "#fffef6"); g.addColorStop(1, "#f6edcf"); ctx.fillStyle = g; rr(ctx, x, cy0, w, ch, ch / 2); ctx.fill(); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = GREEN; rr(ctx, x, cy0, w, ch, ch / 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(246,185,59,.7)"; rr(ctx, x + 7, cy0 + 7, w - 14, ch - 14, ch / 2 - 7); ctx.stroke();
  };
  cap(lx, lw2); cap(rx, rw2);
  const cyy = cy0 + ch / 2;
  if (mascot) { const mh = 112, mw = mh * mascot.width / mascot.height; ctx.drawImage(mascot, lx + 14, cyy - mh / 2 - 12, mw, mh); }
  ctx.textAlign = "left";
  const tx = lx + 140;
  ctx.fillStyle = GREEN; ctx.font = `800 18px ${NUN}`; ctx.letterSpacing = "4px"; ctx.fillText("GRASS TOUCHER", tx, cyy - 14); ctx.letterSpacing = "0px";
  let un = `@${username}`; fit(ctx, un, lx + lw2 - 36 - tx, 44, 26);
  while (ctx.measureText(un).width > lx + lw2 - 36 - tx && un.length > 4) un = un.slice(0, -2) + "…";
  ctx.fillStyle = INK; ctx.fillText(un, tx, cyy + 34);
  if (calI) { const h2 = 60; ctx.drawImage(calI, rx + 26, cyy - h2 / 2, h2 * calI.width / calI.height, h2); }
  const ds = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  ctx.fillStyle = GREEN; ctx.font = `800 18px ${NUN}`; ctx.letterSpacing = "4px"; ctx.fillText("DATE", rx + 106, cyy - 14); ctx.letterSpacing = "0px";
  ctx.fillStyle = INK; fit(ctx, ds, rw2 - 106 - 24, 38, 24); ctx.fillText(ds, rx + 106, cyy + 34);

  if (grassL) { const gh = 170, gw = gh * grassL.width / grassL.height; ctx.drawImage(grassL, PX - 50, H - gh + 16, gw, gh); }
  if (grassR) { const gh = 170, gw = gh * grassR.width / grassR.height; ctx.drawImage(grassR, W - PX + 50 - gw, H - gh + 16, gw, gh); }
  ctx.textAlign = "center"; ctx.font = `800 20px ${NUN}`; ctx.letterSpacing = "3px";
  const uw = ctx.measureText("PROOFOFGRASS.APP").width + 40; ctx.fillStyle = "rgba(253,246,226,.92)"; rr(ctx, cx - uw / 2, H - 56, uw, 38, 19); ctx.fill();
  ctx.fillStyle = GREEN; ctx.fillText("PROOFOFGRASS.APP", cx + 2, H - 29); ctx.letterSpacing = "0px";
  return c.toDataURL("image/png");
}
