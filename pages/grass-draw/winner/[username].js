// /grass-draw/winner/[username] — shareable Grass Draw winner card (bright announcement style).
// Public. Wins come from /api/grass-draw/wins, which only returns wins that are already revealed.
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import V2Nav from "../../../components/V2Nav";
import V2BottomNav from "../../../components/V2BottomNav";
import { V2, V2GlobalCSS } from "../../../utils/v2Theme";
import { loadImageSafe } from "../../../utils/spotlightImage";
import { withShareTags } from "../../../utils/shareTags";

const INK = "#0d2a05", GREEN = "#1f6b12", CREAM = "#fdf6e2", GOLD = "#f6b93b";
const PRIZE_ART = { grass_score: "/badges/grass-score-2.png", shield: "/wheel/shield.png", profile_pack: "/wheel/pack-retro-covers.png", nft: "/wheel/nft.png" };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function fit(ctx, text, maxW, start, min, weight = 700, family = "'Fredoka',system-ui,sans-serif") {
  let px = start; ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = `${weight} ${px}px ${family}`; }
}
const caption = (w) => withShareTags(`🎉 I won ${w.prize} in the ${w.cycle_name} Grass Draw on Proof of Grass! 🌱\n\nproofofgrass.app/grass-draw`);

async function renderWinCard({ username, avatarUrl, win, totalWins }) {
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
  // Brand + ribbon
  try { const logo = await loadImageSafe("/touchgrass-transparent.png"); ctx.drawImage(logo, W/2 - 30, 52, 60, 60); } catch {}
  ctx.font = "800 24px 'Nunito',sans-serif"; ctx.fillStyle = "#1a4a0a"; ctx.letterSpacing = "0.22em";
  ctx.fillText("PROOF OF GRASS", W/2, 148);
  ctx.letterSpacing = "0px";
  const rw = 780, rh = 118, rx = (W - rw)/2, ry = 176;
  ctx.fillStyle = GOLD; rr(ctx, rx, ry, rw, rh, 59); ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = GREEN; rr(ctx, rx, ry, rw, rh, 59); ctx.stroke();
  ctx.fillStyle = INK; fit(ctx, "🎉 GRASS DRAW WINNER", rw - 70, 54, 32);
  ctx.textBaseline = "middle"; ctx.fillText("🎉 GRASS DRAW WINNER", W/2, ry + rh/2 + 3); ctx.textBaseline = "alphabetic";
  ctx.font = "800 28px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.letterSpacing = "0.06em";
  ctx.fillText(String(win.cycle_name).toUpperCase(), W/2, 336); ctx.letterSpacing = "0px";

  // Avatar
  const AY = 520, AR = 130;
  ctx.save(); ctx.beginPath(); ctx.arc(W/2, AY, AR, 0, Math.PI * 2); ctx.clip();
  let drew = false;
  if (avatarUrl) { try { const im = await loadImageSafe(avatarUrl); ctx.drawImage(im, W/2 - AR, AY - AR, AR * 2, AR * 2); drew = true; } catch {} }
  if (!drew) { ctx.fillStyle = "#e3f3d4"; ctx.fillRect(W/2 - AR, AY - AR, AR * 2, AR * 2); try { const lg = await loadImageSafe("/touchgrass-transparent.png"); ctx.drawImage(lg, W/2 - 90, AY - 90, 180, 180); } catch {} }
  ctx.restore();
  ctx.lineWidth = 10; ctx.strokeStyle = GREEN; ctx.beginPath(); ctx.arc(W/2, AY, AR + 2, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(W/2, AY, AR + 14, 0, Math.PI * 2); ctx.stroke();

  // Name
  ctx.fillStyle = INK; fit(ctx, `@${username}`, 940, 92, 52);
  ctx.fillText(`@${username}`, W/2, 740);

  // Prize panel
  const px = 70, py = 790, pw = W - 140, ph = 250;
  ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.14)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  ctx.fillStyle = CREAM; rr(ctx, px, py, pw, ph, 40); ctx.fill(); ctx.restore();
  ctx.lineWidth = 7; ctx.strokeStyle = GREEN; rr(ctx, px, py, pw, ph, 40); ctx.stroke();
  const art = PRIZE_ART[win.prize_type];
  let textCx = W/2;
  if (art) {
    try { const im = await loadImageSafe(art); const s = 180, k = Math.min(s / im.width, s / im.height);
      ctx.drawImage(im, px + 40 + (s - im.width * k)/2, py + (ph - im.height * k)/2, im.width * k, im.height * k); textCx = px + 40 + s + (pw - 40 - s - 20)/2; } catch {}
  }
  ctx.textAlign = "center";
  ctx.font = "800 26px 'Nunito',sans-serif"; ctx.fillStyle = "#b8741a"; ctx.letterSpacing = "0.2em";
  ctx.fillText("WON", textCx, py + 78); ctx.letterSpacing = "0px";
  ctx.fillStyle = INK; fit(ctx, win.prize, pw - 300, 66, 34);
  ctx.fillText(win.prize, textCx, py + 154);
  ctx.font = "700 24px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a";
  ctx.fillText("Weighted random draw", textCx, py + 206);

  // Stats
  const stats = [];
  if (win.entries) stats.push({ v: win.entries.toLocaleString(), l: "ENTRIES IN THE DRAW" });
  if (win.chance_pct != null) stats.push({ v: `${win.chance_pct}%`, l: "CHANCE OF WINNING" });
  if (totalWins > 1) stats.push({ v: String(totalWins), l: "DRAW WINS" });
  if (stats.length) {
    const gap = 18, sw = (pw - gap * (stats.length - 1)) / stats.length, sy = 1072, sh = 150;
    stats.forEach((st, i) => {
      const x = px + i * (sw + gap), cx = x + sw/2;
      ctx.fillStyle = CREAM; rr(ctx, x, sy, sw, sh, 28); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = GREEN; rr(ctx, x, sy, sw, sh, 28); ctx.stroke();
      ctx.fillStyle = INK; fit(ctx, st.v, sw - 30, 68, 36); ctx.fillText(st.v, cx, sy + 84);
      ctx.font = "800 18px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.letterSpacing = "0.06em"; ctx.fillText(st.l, cx, sy + 120); ctx.letterSpacing = "0px";
    });
  }
  ctx.font = "800 24px 'Nunito',sans-serif"; ctx.fillStyle = GREEN; ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", W/2, H - 40);
  return c.toDataURL("image/png");
}

export default function GrassDrawWinnerPage() {
  const router = useRouter();
  const username = String(router.query.username || "").replace(/@/g, "").toLowerCase();
  const [viewer, setViewer] = useState("");
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMob, setIsMob] = useState(false);

  useEffect(() => {
    setIsMob(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    try { const u = localStorage.getItem("pog_username"); if (u) setViewer(u.replace(/@/g, "").toLowerCase().trim()); } catch {}
  }, []);
  useEffect(() => {
    if (!username) return;
    fetch(`/api/grass-draw/wins?username=${encodeURIComponent(username)}`).then((r) => r.json())
      .then((j) => { setData(j); if (j.wins?.length) setSel(j.wins[0]); }).catch(() => setData({ wins: [] }));
  }, [username]);

  const generate = useCallback(async () => {
    if (!sel) return; setBusy(true); setPreview(null);
    try {
      setPreview(await renderWinCard({ username, avatarUrl: data.avatar_url, win: sel, totalWins: data.wins.length }));
      try { await navigator.clipboard.writeText(caption(sel)); setCopied(true); setTimeout(() => setCopied(false), 3000); } catch {}
    } catch (e) { console.error("win card", e); }
    setBusy(false);
  }, [sel, data, username]);

  const copyCap = async () => { if (!sel) return; try { await navigator.clipboard.writeText(caption(sel)); setCopied(true); setTimeout(() => setCopied(false), 3000); } catch {} };
  const share = async () => {
    if (!preview || !sel) return;
    const name = `grass-draw-${username}-${String(sel.cycle_name).toLowerCase().replace(/\W+/g, "-")}.png`;
    const dl = () => { const a = document.createElement("a"); a.href = preview; a.download = name; a.click(); };
    if (isMob && navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(preview)).blob(); const file = new File([blob], name, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: "Grass Draw winner", text: caption(sel) }); else dl();
      } catch (e) { if (e.name !== "AbortError") dl(); }
    } else dl();
  };
  const shareX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption(sel))}`, "_blank", "noopener");

  const css = V2GlobalCSS + `
    .gw-bg { min-height:100vh; background: linear-gradient(180deg, rgba(197,227,247,.55) 0%, rgba(232,244,253,.35) 45%, rgba(240,248,238,.75) 100%), url('/hero-landscape.png') center bottom / cover no-repeat fixed, ${V2.skyBlue}; }
    .gw-wrap { max-width:560px; margin:0 auto; padding:28px 16px calc(110px + env(safe-area-inset-bottom)); }
    .gw-card { background:rgba(255,255,255,.94); border:1px solid ${V2.borderWhite}; border-radius:24px; padding:clamp(16px,4vw,24px); margin-bottom:16px; box-shadow:0 4px 22px rgba(26,74,10,.09); }
    .win-opt { background:#fff; border:1px solid ${V2.borderSoft}; border-radius:16px; padding:12px 14px; cursor:pointer; display:flex; align-items:center; gap:12px; width:100%; text-align:left; font-family:inherit; min-height:56px; }
    .win-opt.sel { border-color:${V2.grassLime}; background:#eef7e6; }
    .btn { border:none; cursor:pointer; font-family:${V2.fontSans}; font-weight:800; font-size:15px; border-radius:999px; padding:16px 28px; min-height:52px; width:100%; }
    .btn:disabled { opacity:.45; cursor:default; }
    .btn-main { background:${V2.gradientGrassBtn}; color:#fff; box-shadow:0 4px 16px rgba(61,122,18,.28); }
    .btn-soft { background:#e6f3d6; color:${V2.grassDark}; border:1px solid #c9e4ad; }
    .btn-ghost { background:#fff; color:${V2.forestLight}; border:1px solid ${V2.borderSoft}; }
    @media(max-width:640px){ .preview-img{ width:100%!important; height:auto!important; } }
  `;
  const wins = data?.wins || [];
  return (
    <>
      <Head><title>Grass Draw Winner | Proof of Grass</title></Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="gw-bg">
        <V2Nav username={viewer} onUsernameChange={setViewer} showUpload={() => { window.location.href = "/#upload"; }} />
        <main className="gw-wrap">
          <header style={{ textAlign: "center", marginBottom: 22 }}>
            <h1 style={{ fontFamily: V2.fontSerif, fontWeight: 700, fontSize: "clamp(30px,8vw,46px)", lineHeight: 1.05, color: V2.forestGreen, margin: "0 0 8px" }}>🎉 Grass Draw Winner</h1>
            <p style={{ fontSize: 15, color: V2.forestLight, fontWeight: 500, lineHeight: 1.45 }}>Share your Grass Draw win.</p>
            <Link href="/grass-draw" style={{ display: "inline-block", marginTop: 10, fontSize: 13, fontWeight: 700, color: V2.forestMid, textDecoration: "none" }}>← Back to Grass Draw</Link>
          </header>

          {!data ? <div className="gw-card" style={{ textAlign: "center", fontWeight: 600, color: V2.textMuted }}>Loading…</div>
          : !wins.length ? (
            <div className="gw-card" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🍃</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: V2.forestGreen, marginBottom: 6 }}>No Grass Draw wins to show yet.</div>
              <div style={{ fontSize: 14, color: V2.forestLight, fontWeight: 500 }}>Winners appear here as soon as they're revealed.</div>
            </div>
          ) : (<>
            {wins.length > 1 && (
              <section className="gw-card">
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: V2.grassDark, marginBottom: 12 }}>Select win</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {wins.map((w) => (
                    <button key={w.id} className={`win-opt${sel?.id === w.id ? " sel" : ""}`} onClick={() => { setSel(w); setPreview(null); }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: V2.forestGreen }}>{w.prize}</div>
                        <div style={{ fontSize: 12, color: V2.forestLight, fontWeight: 600, marginTop: 2 }}>{w.cycle_name}</div>
                      </div>
                      {sel?.id === w.id && <span style={{ color: V2.grassDark, fontWeight: 800 }}>✓</span>}
                    </button>))}
                </div>
              </section>)}
            {sel && (
              <section className="gw-card">
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: V2.grassDark }}>{sel.cycle_name}</div>
                <div style={{ fontFamily: V2.fontSerif, fontSize: 26, fontWeight: 700, color: V2.forestGreen, marginTop: 4 }}>{sel.prize}</div>
                {sel.entries && <div style={{ fontSize: 13, color: V2.forestLight, fontWeight: 600, marginTop: 4 }}>{sel.entries.toLocaleString()} entries{sel.chance_pct != null ? ` · ${sel.chance_pct}% chance` : ""}</div>}
              </section>)}
            {!preview && <button className="btn btn-main" onClick={generate} disabled={busy} style={{ marginBottom: 16 }}>{busy ? "Generating…" : "✦ Generate Winner Card"}</button>}
            {copied && <div role="status" style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: V2.grassDark, padding: "8px 0", marginBottom: 8 }}>✓ Caption copied — ready to paste when you share!</div>}
            {preview && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #cfe3bf", boxShadow: "0 8px 30px rgba(26,74,10,.16)", marginBottom: 16, background: "#fff" }}>
                  <img className="preview-img" src={preview} alt="Grass Draw winner card" style={{ width: "100%", display: "block" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="btn btn-main" onClick={share}>{isMob && navigator.share ? "Share Winner Card" : "Download Winner Card"}</button>
                  <button className="btn btn-soft" onClick={shareX}>𝕏 Post on X</button>
                  <button className="btn btn-soft" onClick={copyCap}>{copied ? "✓ Caption Copied!" : "📋 Copy Caption"}</button>
                  <button className="btn btn-ghost" onClick={() => setPreview(null)}>Regenerate</button>
                </div>
              </div>)}
          </>)}
        </main>
        <V2BottomNav username={viewer} onLogProof={() => router.push("/#upload")} onMore={() => {}} />
      </div>
    </>
  );
}
