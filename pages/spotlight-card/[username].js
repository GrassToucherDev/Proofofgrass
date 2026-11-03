import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import V2Nav from "../../components/V2Nav";
import V2BottomNav from "../../components/V2BottomNav";
import { V2, V2GlobalCSS } from "../../utils/v2Theme";
import { supabase } from "../../utils/supabase";
import { renderWinnersImage, loadImageSafe } from "../../utils/spotlightImage";
import { SPOTLIGHT_BADGES, getSpotlightBadge, getSpotlightCaption } from "../../utils/spotlightBadges";

function fmtWeek(start, end) {
  if (!start || !end) return "";
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end   + "T00:00:00Z");
  const opts = { month:"short", day:"numeric", timeZone:"UTC" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US",
    { ...opts, year:"numeric" })}`;
}
function weekNumber(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00Z");
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `Week ${Math.ceil(((d - start) / 86400000 + start.getUTCDay() + 1) / 7)}`;
}

// Bright per-category colours (match /spotlight)
const BRIGHT_ACCENTS = {
  community_mvp:   { a:"#c2410c", t:"#ffe9df", tint:"#ffe9df" },
  meme_lord:       { a:"#92700c", t:"#fdf0cf", tint:"#fdf0cf" },
  biggest_shiller: { a:"#2d6b1a", t:"#e3f3d4", tint:"#e3f3d4" },
  space_warrior:   { a:"#5b3fc4", t:"#ece7fb", tint:"#ece7fb" },
};

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ─── Canvas generator ─────────────────────────────────────────────────────────
// Matches the weekly "Community Spotlight" announcement graphic: we render that same
// artwork with just this winner filled in, then crop the banner and the winner's panel
// from it and build the rest of the card in the same cream / forest-green style.
const INK = "#0d2a05", GREEN = "#1f6b12", CREAM = "#fdf6e2", GOLD = "#f6b93b";
const PANEL = {   // outer panel bounds inside the 1672×941 announcement artwork
  community_mvp:   { x1:158, x2:832,  y1:252, y2:575 },
  meme_lord:       { x1:838, x2:1514, y1:252, y2:575 },
  biggest_shiller: { x1:158, x2:832,  y1:576, y2:898 },
  space_warrior:   { x1:838, x2:1514, y1:576, y2:898 },
};

async function generateSpotlightCard({ win, avatarUrl, streakCount, grassScore, spotlightWinCount }) {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  try { await Promise.all([document.fonts.load("700 40px 'Fredoka'"), document.fonts.load("800 30px 'Nunito'")]); } catch {}

  const badge = getSpotlightBadge(win.category) ?? SPOTLIGHT_BADGES.community_mvp;
  const key = PANEL[win.category] ? win.category : "community_mvp";
  const acc = BRIGHT_ACCENTS[key];

  // Backdrop (same soft green as the announcement)
  ctx.fillStyle = "#eef6e2"; ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "rgba(197,227,247,0.55)"); sky.addColorStop(0.35, "rgba(238,246,226,0)");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // The announcement artwork with only this winner filled in
  const weekLabel = fmtWeek(win.week_start, win.week_end);
  const artUrl = await renderWinnersImage({
    weekLabel,
    winners: { [key]: { handle: win.display_name || win.username, avatarUrl } },
  });
  const art = await loadImageSafe(artUrl);

  // Header banner (logo + "Community Spotlight" + date pill)
  const hx = 125, hy = 18, hw = 1420, hh = 232;
  const HW = 1000, HH = HW * hh / hw;
  ctx.drawImage(art, hx, hy, hw, hh, (W - HW) / 2, 36, HW, HH);

  // Winner panel (category ribbon, avatar, name plate)
  const P = PANEL[key];
  const pw = P.x2 - P.x1, ph = P.y2 - P.y1;
  const PW = 960, PH = PW * ph / pw, PX = (W - PW) / 2, PY = 36 + HH + 14;
  ctx.save();
  roundRect(ctx, PX, PY, PW, PH, 38); ctx.clip();
  ctx.drawImage(art, P.x1, P.y1, pw, ph, PX, PY, PW, PH);
  ctx.restore();

  // Badge
  const BY = PY + PH + 12, BH = 360;
  try {
    const badgeImg = await loadImageSafe(badge.image);
    const BW = BH * 924 / 1160;
    ctx.save(); ctx.shadowColor = "rgba(26,74,10,0.25)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    ctx.drawImage(badgeImg, 50, 188, 924, 1160, W/2 - BW/2, BY, BW, BH);
    ctx.restore();
  } catch { /* skip */ }

  // Side pills flanking the badge (week + winner), in the announcement's gold-ribbon style
  const pill = (txt, cx, cy, w) => {
    ctx.save();
    ctx.fillStyle = GOLD; roundRect(ctx, cx - w/2, cy - 48, w, 96, 48); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = GREEN; roundRect(ctx, cx - w/2, cy - 48, w, 96, 48); ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 44px 'Fredoka','Nunito',sans-serif"; ctx.letterSpacing = "0";
    ctx.fillText(txt, cx, cy + 3);
    ctx.restore();
  };
  pill(weekNumber(win.week_start), 205, BY + BH/2 - 22, 310);
  pill(`${badge.emoji} Winner`, W - 205, BY + BH/2 - 22, 310);
  ctx.save();
  ctx.fillStyle = acc.a; ctx.textAlign = "center"; ctx.font = "800 27px 'Nunito',sans-serif"; ctx.letterSpacing = "0.1em";
  ctx.fillText(badge.label, 205, BY + BH/2 + 68);
  ctx.fillText("SPOTLIGHT", W - 205, BY + BH/2 + 68);
  ctx.restore();

  // Stats (cream cards with forest-green borders, like the panels)
  const stats = [];
  if (streakCount)           stats.push({ emoji:"🔥", value:`${streakCount}`, label:"Current Streak" });
  if (grassScore)            stats.push({ emoji:"⚡", value:Number(grassScore).toLocaleString(), label:"Grass Score" });
  if (spotlightWinCount > 0) stats.push({ emoji:"🏆", value:`${spotlightWinCount}`, label:"Spotlight Wins" });
  const SY = BY + BH + 26, SH = 188;
  if (stats.length) {
    const totalW = 960, gap = 18, cw = (totalW - gap * (stats.length - 1)) / stats.length;
    stats.forEach((st, i) => {
      const x = (W - totalW)/2 + i * (cw + gap), cx = x + cw/2;
      ctx.fillStyle = CREAM; roundRect(ctx, x, SY, cw, SH, 28); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = GREEN; roundRect(ctx, x, SY, cw, SH, 28); ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.letterSpacing = "0";
      ctx.font = "44px serif"; ctx.fillStyle = INK; ctx.fillText(st.emoji, cx, SY + 54);
      ctx.font = "800 21px 'Nunito',sans-serif"; ctx.fillStyle = "#2d5a1a"; ctx.letterSpacing = "0.06em";
      ctx.fillText(st.label.toUpperCase(), cx, SY + 90);
      ctx.font = "700 68px 'Fredoka',system-ui,sans-serif"; ctx.fillStyle = INK; ctx.letterSpacing = "-0.01em";
      ctx.fillText(st.value, cx, SY + 164);
    });
  }

  // Footer
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = "800 22px 'Nunito',sans-serif"; ctx.fillStyle = GREEN; ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", W/2, H - 34);

  return canvas.toDataURL("image/png");
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SpotlightCardPage() {
  const router = useRouter();
  const { username } = router.query;
  const [wins,          setWins]          = useState([]);
  const [selectedWin,   setSelectedWin]   = useState(null);
  const [profileData,   setProfileData]   = useState({});
  const [preview,       setPreview]       = useState(null);
  const [generating,    setGenerating]    = useState(false);
  const [downloading,   setDownloading]   = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [isMob,         setIsMob]         = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [viewer,        setViewer]        = useState("");

  useEffect(() => {
    setMounted(true);
    try { const u = localStorage.getItem("pog_username"); if (u) setViewer(u.replace(/@/g, "").toLowerCase().trim()); } catch {}
    setIsMob(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!username) return;
    (async () => {
      const [{ data: spotlights }, { data: profile }, { data: streak }] = await Promise.all([
        supabase.from("CommunitySpotlights").select("*")
          .eq("username", username).eq("status","active")
          .order("week_start", { ascending:false }),
        supabase.from("Profiles").select("avatar_url,grass_score").eq("username",username).maybeSingle(),
        supabase.from("Streaks").select("current_streak").eq("username",username).maybeSingle(),
      ]);
      const ws = spotlights ?? [];
      setWins(ws);
      if (ws.length > 0) setSelectedWin(ws[0]);
      setProfileData({
        avatarUrl:         ws[0]?.avatar_url || profile?.avatar_url || null,
        grassScore:        profile?.grass_score ?? null,
        currentStreak:     streak?.current_streak ?? null,
        spotlightWinCount: ws.length,
      });
      setLoading(false);
    })();
  }, [username]);

  // Update avatar override when selection changes
  useEffect(() => {
    if (!selectedWin) return;
    setProfileData(p => ({
      ...p,
      avatarUrl: selectedWin.avatar_url || p.avatarUrl,
    }));
  }, [selectedWin]);

  const generate = useCallback(async () => {
    if (!selectedWin) return;
    setGenerating(true); setPreview(null);
    try {
      const dataUrl = await generateSpotlightCard({
        win:              selectedWin,
        avatarUrl:        profileData.avatarUrl,
        streakCount:      profileData.currentStreak,
        grassScore:       profileData.grassScore,
        spotlightWinCount: profileData.spotlightWinCount,
      });
      setPreview(dataUrl);
      // Auto-copy X caption
      const caption = getSpotlightCaption(
        selectedWin.category,
        selectedWin.username,
        fmtWeek(selectedWin.week_start, selectedWin.week_end)
      );
      try {
        await navigator.clipboard.writeText(caption);
        setCaptionCopied(true);
        setTimeout(() => setCaptionCopied(false), 3000);
      } catch { /* clipboard not available */ }
    } catch(e) {
      console.error("Spotlight card error:", e);
    }
    setGenerating(false);
  }, [selectedWin, profileData]);

  const download = useCallback(async () => {
    if (!preview || !selectedWin) return;
    setDownloading(true);
    const filename = `spotlight-${selectedWin.username}-${selectedWin.category}-${selectedWin.week_start}.png`;
    if (isMob && navigator.share && navigator.canShare) {
      try {
        const res  = await fetch(preview);
        const blob = await res.blob();
        const file = new File([blob], filename, { type:"image/png" });
        if (navigator.canShare({ files:[file] })) {
          await navigator.share({ files:[file],
            title:`Community Spotlight — ${getSpotlightBadge(selectedWin.category)?.title}`,
            text:getSpotlightCaption(selectedWin.category, selectedWin.username,
              fmtWeek(selectedWin.week_start, selectedWin.week_end)) });
        } else { fallbackDownload(preview, filename); }
      } catch(e) { if (e.name !== "AbortError") fallbackDownload(preview, filename); }
    } else { fallbackDownload(preview, filename); }
    setDownloading(false);
  }, [preview, selectedWin, isMob]);

  const copyCaption = useCallback(async () => {
    if (!selectedWin) return;
    const caption = getSpotlightCaption(selectedWin.category, selectedWin.username,
      fmtWeek(selectedWin.week_start, selectedWin.week_end));
    try {
      await navigator.clipboard.writeText(caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 3000);
    } catch { /* not available */ }
  }, [selectedWin]);

  function fallbackDownload(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl; a.download = filename; a.click();
  }

  const badge = selectedWin ? getSpotlightBadge(selectedWin.category) : null;

  const acc = BRIGHT_ACCENTS[selectedWin?.category] ?? BRIGHT_ACCENTS.community_mvp;

  const css = V2GlobalCSS + `
    .sc-bg { min-height:100vh; background:
      linear-gradient(180deg, rgba(197,227,247,.55) 0%, rgba(232,244,253,.35) 45%, rgba(240,248,238,.75) 100%),
      url('/hero-landscape.png') center bottom / cover no-repeat fixed, ${V2.skyBlue}; }
    .sc-wrap { max-width:560px; margin:0 auto; padding:28px 16px calc(110px + env(safe-area-inset-bottom)); }
    .sc-card { background:rgba(255,255,255,.94); border:1px solid ${V2.borderWhite}; border-radius:24px; padding:clamp(16px,4vw,24px); margin-bottom:16px; box-shadow:0 4px 22px rgba(26,74,10,.09); }
    .sc-eyebrow { display:flex; align-items:center; justify-content:center; gap:10px; font-size:12px; font-weight:800; letter-spacing:.3em; text-transform:uppercase; color:${V2.grassDark}; margin-bottom:6px; }
    .sc-eyebrow i { width:8px; height:8px; border-radius:50%; background:${V2.grassLime}; display:block; }
    .sc-label { font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:${V2.grassDark}; margin-bottom:12px; }
    .win-opt { background:#fff; border:1px solid ${V2.borderSoft}; border-radius:16px; padding:12px 14px; cursor:pointer; transition:border-color .15s, background .15s; display:flex; align-items:center; gap:12px; width:100%; text-align:left; font-family:inherit; min-height:56px; }
    .win-opt:hover { border-color:${V2.grassLime}; }
    .win-opt.sel { border-color:${V2.grassLime}; background:#eef7e6; }
    .btn { border:none; cursor:pointer; font-family:${V2.fontSans}; font-weight:800; font-size:15px; border-radius:999px; padding:16px 28px; min-height:52px; transition:transform .15s, opacity .15s; width:100%; }
    .btn:hover { opacity:.9; } .btn:active { transform:scale(.98); } .btn:disabled { opacity:.45; cursor:default; }
    .btn-main { background:${V2.gradientGrassBtn}; color:#fff; box-shadow:0 4px 16px rgba(61,122,18,.28); }
    .btn-soft { background:#e6f3d6; color:${V2.grassDark}; border:1px solid #c9e4ad; }
    .btn-ghost { background:#fff; color:${V2.forestLight}; border:1px solid ${V2.borderSoft}; }
    .sc-wrap a:focus-visible, .sc-wrap button:focus-visible { outline:3px solid ${V2.grassLime}; outline-offset:2px; }
    @media(max-width:640px){ .preview-img{ width:100%!important; height:auto!important; } }
  `;

  if (!mounted) return null;

  return (
    <>
      <Head><title>Spotlight Card | Proof of Grass</title></Head>
      <style dangerouslySetInnerHTML={{ __html:css }} />
      <div className="sc-bg">
        <V2Nav username={viewer} onUsernameChange={setViewer} showUpload={() => { window.location.href = "/#upload"; }} />
        <main className="sc-wrap">

          <header style={{ textAlign:"center", marginBottom:22 }}>
            <div className="sc-eyebrow"><i aria-hidden="true" />Community Spotlight</div>
            <h1 style={{ fontFamily:V2.fontSerif, fontWeight:700, fontSize:"clamp(30px,8vw,46px)", lineHeight:1.05,
              color:V2.forestGreen, margin:"0 0 8px" }}>🏆 Spotlight Card</h1>
            <p style={{ fontSize:15, color:V2.forestLight, fontWeight:500, lineHeight:1.45 }}>
              Generate your Community Spotlight award card to share on X.
            </p>
            {username && (
              <Link href="/spotlight" style={{ display:"inline-block", marginTop:10, fontSize:13, fontWeight:700,
                color:V2.forestMid, textDecoration:"none" }}>← Back to Spotlight</Link>
            )}
          </header>

          {loading ? (
            <div className="sc-card" style={{ textAlign:"center", color:V2.textMuted, fontWeight:600 }}>Loading…</div>
          ) : wins.length === 0 ? (
            <div className="sc-card" style={{ textAlign:"center", padding:"40px 24px" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🏆</div>
              <div style={{ fontSize:16, fontWeight:800, color:V2.forestGreen, marginBottom:6 }}>No spotlight wins yet.</div>
              <div style={{ fontSize:14, color:V2.forestLight, fontWeight:500 }}>Spotlight cards are only available to Community Spotlight winners.</div>
            </div>
          ) : (
            <>
              {wins.length > 1 && (
                <section className="sc-card">
                  <div className="sc-label">Select Spotlight Win</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {wins.map(w => {
                      const b = getSpotlightBadge(w.category);
                      const isSel = selectedWin?.id === w.id;
                      return (
                        <button key={w.id} className={`win-opt${isSel?" sel":""}`}
                          onClick={() => { setSelectedWin(w); setPreview(null); }}>
                          {b?.image && <img src={b.image} alt="" style={{ width:40,height:40,objectFit:"contain",flexShrink:0 }} />}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:15, fontWeight:800, color:V2.forestGreen }}>{b?.title ?? w.category}</div>
                            <div style={{ fontSize:12, color:V2.forestLight, fontWeight:600, marginTop:2 }}>{fmtWeek(w.week_start, w.week_end)}</div>
                          </div>
                          {isSel && <span style={{ fontSize:14, color:V2.grassDark, fontWeight:800 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {selectedWin && badge && (
                <section className="sc-card" style={{ borderColor:acc.a + "44" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <img src={badge.image} alt={badge.title}
                      style={{ width:72,height:72,objectFit:"contain",flexShrink:0 }} />
                    <div style={{ minWidth:0 }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11, fontWeight:800,
                        letterSpacing:".08em", textTransform:"uppercase", padding:"6px 11px", borderRadius:999,
                        background:acc.tint, color:acc.a, marginBottom:6 }}>
                        {badge.emoji} {badge.label}
                      </span>
                      <div style={{ fontFamily:V2.fontSerif, fontSize:22, fontWeight:700, color:V2.forestGreen }}>{badge.title}</div>
                      <div style={{ fontSize:13, color:V2.forestLight, fontWeight:600, marginTop:3 }}>
                        {fmtWeek(selectedWin.week_start, selectedWin.week_end)}{" · "}{weekNumber(selectedWin.week_start)}
                      </div>
                    </div>
                  </div>
                  {selectedWin.description && (
                    <div style={{ marginTop:14, fontSize:14, color:V2.forestLight, fontWeight:500,
                      lineHeight:1.5, borderLeft:`3px solid ${acc.a}66`, paddingLeft:12 }}>
                      {selectedWin.description}
                    </div>
                  )}
                </section>
              )}

              {!preview && (
                <button className="btn btn-main" onClick={generate} disabled={generating} style={{ marginBottom:16 }}>
                  {generating ? "Generating…" : "✦ Generate Spotlight Card"}
                </button>
              )}

              {captionCopied && (
                <div role="status" style={{ textAlign:"center", fontSize:13, fontWeight:700, color:V2.grassDark, padding:"8px 0", marginBottom:8 }}>
                  ✓ X caption copied to clipboard — ready to paste when you share!
                </div>
              )}

              {preview && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ borderRadius:20, overflow:"hidden", border:"1px solid #cfe3bf",
                    boxShadow:"0 8px 30px rgba(26,74,10,.16)", marginBottom:16, background:"#fff" }}>
                    <img className="preview-img" src={preview} alt="Spotlight Card" style={{ width:"100%", display:"block" }} />
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <button className="btn btn-main" onClick={download} disabled={downloading}>
                      {downloading ? "Sharing…" : isMob && navigator.share ? "Share Spotlight Card" : "Download Spotlight Card"}
                    </button>
                    <button className="btn btn-soft" onClick={copyCaption}>
                      {captionCopied ? "✓ Caption Copied!" : "📋 Copy X Caption"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setPreview(null)}>Regenerate</button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
        <V2BottomNav username={viewer} onLogProof={() => router.push("/#upload")} onMore={() => {}} />
      </div>
    </>
  );
}
