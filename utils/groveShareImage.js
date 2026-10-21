// Renders the Grove share card (1200×630). The on-page preview is this same image, so preview == export.
import { loadImageSafe } from "./spotlightImage";
import { bannerSrc, bannerFallbackUrl } from "./groveBanners";

export const GROVE_CARD = { w: 1200, h: 630, bannerH: 420 };

function cover(ctx, img, x, y, w, h, fx = 0.5) {
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x - (dw - w) * fx, y - (dh - h) / 2, dw, dh);
}
function fit(ctx, text, maxW, weight, start, min, family) {
  let px = start; ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = `${weight} ${px}px ${family}`; }
  let t = text; while (ctx.measureText(t).width > maxW && t.length > 3) t = t.slice(0, -1);
  return t.length < text.length ? t.slice(0, -1) + "…" : t;
}

// grove: { name, slots }, streak: grove_streak result, members: [{ username, locked_today, avatarUrl }], banner: { id, art_path }
export async function renderGroveCard({ grove, streak, members, banner }) {
  const W = GROVE_CARD.w, H = GROVE_CARD.h, BH = GROVE_CARD.bannerH;
  const family = "'DM Sans','Helvetica Neue',Arial,sans-serif";
  try { await Promise.all([document.fonts.load(`800 40px ${family}`), document.fonts.load(`700 28px ${family}`)]); } catch {}
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  let art;
  try { art = await loadImageSafe(bannerSrc(banner)); } catch { art = await loadImageSafe(bannerFallbackUrl(banner?.id || "default")); }
  const [logo, ...avs] = await Promise.all([
    loadImageSafe("/touchgrass-transparent.png").catch(() => null),
    ...members.map(m => m.avatarUrl ? loadImageSafe(m.avatarUrl).catch(() => null) : Promise.resolve(null)),
  ]);

  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  cover(ctx, art, 0, 0, W, BH);
  // readability scrim behind the name, fading out toward the bottom so art in the lower-left (e.g. the default banner's logo) stays bright
  const sc = document.createElement("canvas"); sc.width = W; sc.height = BH; const sx = sc.getContext("2d");
  const g = sx.createLinearGradient(0, 0, W * 0.75, 0);
  g.addColorStop(0, "rgba(6,24,4,0.72)"); g.addColorStop(0.55, "rgba(6,24,4,0.42)"); g.addColorStop(1, "rgba(6,24,4,0)");
  sx.fillStyle = g; sx.fillRect(0, 0, W, BH);
  const mk = sx.createLinearGradient(0, 0, 0, BH);
  mk.addColorStop(0, "#000"); mk.addColorStop(0.55, "#000"); mk.addColorStop(0.85, "rgba(0,0,0,0)");
  sx.globalCompositeOperation = "destination-in"; sx.fillStyle = mk; sx.fillRect(0, 0, W, BH);
  ctx.drawImage(sc, 0, 0);

  // name + streak on the banner (live text, never part of the art)
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 8;
  ctx.fillText(fit(ctx, grove.name, 700, 800, 76, 36, family), 56, 220);
  ctx.shadowBlur = 0;
  const counted = streak?.today_needed != null;
  ctx.font = `700 34px ${family}`;
  ctx.fillText(counted ? `🔥 ${streak.streak ?? 0} day streak` : "🌱 Growing — needs 3 members", 56, 282);

  // lower panel
  const locked = members.filter(m => m.locked_today).length;
  const r = 40, gap = 100, ax = 56 + r, ay = BH + 78;
  members.slice(0, 6).forEach((m, i) => {
    const cx = ax + i * gap;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, ay, r, 0, Math.PI * 2); ctx.clip();
    if (avs[i]) cover(ctx, avs[i], cx - r, ay - r, r * 2, r * 2, 0.5);
    else { ctx.fillStyle = "#dcefc9"; ctx.fillRect(cx - r, ay - r, r * 2, r * 2); ctx.fillStyle = "#2d6b1a"; ctx.font = `800 34px ${family}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText((m.username || "?")[0].toUpperCase(), cx, ay + 2); }
    ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = m.locked_today ? "#5ba622" : "#c9d3c0"; ctx.beginPath(); ctx.arc(cx, ay, r, 0, Math.PI * 2); ctx.stroke();
    // status badge
    const bx = cx + r * 0.72, by = ay + r * 0.72;
    ctx.fillStyle = m.locked_today ? "#5ba622" : "#9aa58f"; ctx.beginPath(); ctx.arc(bx, by, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
    if (m.locked_today) { ctx.moveTo(bx - 6, by); ctx.lineTo(bx - 1.5, by + 5); ctx.lineTo(bx + 6, by - 5); }
    else { ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by); }
    ctx.stroke();
  });

  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#0d2a05"; ctx.font = `700 30px ${family}`;
  const status = counted ? `${locked} of ${streak.today_members} locked in · ${streak.today_needed} needed today` : `${locked} of ${members.length} locked in today`;
  ctx.fillText(status, 56, H - 40);
  if (counted && streak.today_complete) {
    ctx.font = `800 24px ${family}`; const tx = "✓ Daily goal reached", tw = ctx.measureText(tx).width + 32;
    ctx.fillStyle = "#e3f5d6"; ctx.beginPath(); ctx.roundRect(W - 56 - tw, BH + 28, tw, 48, 24); ctx.fill();
    ctx.fillStyle = "#2d6a10"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(tx, W - 56 - tw / 2, BH + 53);
  }
  // branding
  ctx.textAlign = "right"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#0d2a05"; ctx.font = `800 30px ${family}`;
  ctx.fillText("Touch Grass", W - 56, H - 58); ctx.font = `600 20px ${family}`; ctx.fillStyle = "#5a6b50"; ctx.fillText("proofofgrass.app/groves", W - 56, H - 30);
  if (logo) ctx.drawImage(logo, W - 56 - 250, H - 96, 56, 56);

  return canvas.toDataURL("image/png");
}
