import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import V2Nav from "../../components/V2Nav";
import V2BottomNav from "../../components/V2BottomNav";
import { V2, V2GlobalCSS } from "../../utils/v2Theme";
import { supabase } from "../../utils/supabase";
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
async function generateSpotlightCard({ win, avatarUrl, streakCount, grassScore, spotlightWinCount }) {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const badge = getSpotlightBadge(win.category) ?? SPOTLIGHT_BADGES.community_mvp;
  
  const acc = BRIGHT_ACCENTS[win.category] ?? BRIGHT_ACCENTS.community_mvp;

  // ── Background: bright sky → soft green, same look as the site ─────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   "#c5e3f7");
  bg.addColorStop(0.4, "#e8f4fd");
  bg.addColorStop(1,   "#f0f8ee");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Landscape along the bottom (same art as the site hero), softened
  try {
    const land = await loadImage("/hero-landscape.png");
    const lh = W * (land.height / land.width);
    ctx.save(); ctx.globalAlpha = 0.55;
    ctx.drawImage(land, 0, H - lh, W, lh);
    ctx.restore();
    const fade = ctx.createLinearGradient(0, H - lh, 0, H - lh + 260);
    fade.addColorStop(0, "rgba(232,244,253,1)");
    fade.addColorStop(1, "rgba(232,244,253,0)");
    ctx.fillStyle = fade; ctx.fillRect(0, H - lh, W, 260);
  } catch { /* continue */ }

  // Soft category glow behind the badge
  const glow1 = ctx.createRadialGradient(W*0.5, H*0.24, 0, W*0.5, H*0.24, 460);
  glow1.addColorStop(0, acc.tint + "ff");
  glow1.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  // ── White card frame ────────────────────────────────────────────────────────
  const m = 28;
  ctx.save();
  ctx.shadowColor = "rgba(26,74,10,0.16)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 8;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  roundRect(ctx, m, m, W-m*2, H-m*2, 40); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(125,200,50,0.45)"; ctx.lineWidth = 2;
  roundRect(ctx, m, m, W-m*2, H-m*2, 40); ctx.stroke();
  ctx.strokeStyle = acc.a + "33"; ctx.lineWidth = 1;
  roundRect(ctx, m+12, m+12, W-(m+12)*2, H-(m+12)*2, 30); ctx.stroke();


  // ════════════════════════════════════════════════════════════════════════
  // LAYOUT — 1080×1350 portrait, all Y coords absolute from top
  //
  // Zone A  54– 148  Branding (logo, PROOF OF GRASS, COMMUNITY SPOTLIGHT)
  // Zone B 160– 500  Badge (340px — trophy removed, badge is the statement)
  // Zone C —         (merged into Zone B)
  // Zone D 396– 560  Category pill + username + winner label  ← order fixed
  // Zone E 560– 680  Week number + date range
  // Zone F 680– 820  Stats row (3 cards)
  // Zone G 820–1350  Bottom padding + branding
  // ════════════════════════════════════════════════════════════════════════

  // ── Divider helper ────────────────────────────────────────────────────────
  const div = (y, op = 0.32) => {
    const g = ctx.createLinearGradient(W*0.12, 0, W*0.88, 0);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.5, `rgba(61,122,18,${op})`);
    g.addColorStop(1, "transparent");
    ctx.strokeStyle = g; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W*0.12, y); ctx.lineTo(W*0.88, y); ctx.stroke();
  };

  // ── ZONE A — Branding ─────────────────────────────────────────────────────
  try {
    const logo = await loadImage("/touchgrass-transparent.png");
    ctx.save(); ctx.globalAlpha = 1;
    ctx.drawImage(logo, W/2 - 16, 54, 32, 32);
    ctx.restore();
  } catch { /* continue */ }

  ctx.textAlign = "center";

  ctx.font = "600 20px 'Nunito',sans-serif";
  ctx.fillStyle = "#1a4a0a";
  ctx.letterSpacing = "0.2em";
  ctx.fillText("PROOF OF GRASS", W/2, 102);

  ctx.font = "700 13px 'Nunito',sans-serif";
  ctx.fillStyle = "#3d7a12";
  ctx.letterSpacing = "0.26em";
  ctx.fillText("COMMUNITY SPOTLIGHT", W/2, 126);

  div(142);

  // ── ZONE B+C — Badge (340px, no trophy) ─────────────────────────────────────
  // Trophy removed — badge IS the statement. Moved up to fill the space.
  const badgeSize = 380;
  const badgeX    = W/2 - badgeSize/2;
  const badgeY    = 110;

  try {
    const badgeImg = await loadImage(badge.image);
    ctx.save();
    ctx.shadowColor = acc.a + "55";
    ctx.shadowBlur  = 36;
    ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
    ctx.restore();
    ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
  } catch {
    ctx.beginPath();
    ctx.arc(W/2, badgeY + badgeSize/2, badgeSize/2, 0, Math.PI * 2);
    ctx.fillStyle = acc.tint; ctx.fill();
    ctx.strokeStyle = acc.a + "99"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "72px serif";
    ctx.fillText(badge.emoji, W/2, badgeY + badgeSize/2 + 24);
  }

  // BADGE_BOTTOM = 160 + 340 = 500

  // ── ZONE D — Category pill (y=524–586) ───────────────────────────────────────
  const PILL_Y = 464;
  const PILL_H = 62;
  const PILL_W = 520;
  const PILL_X = W/2 - PILL_W/2;

  const pillBg = ctx.createLinearGradient(PILL_X, PILL_Y, PILL_X + PILL_W, PILL_Y + PILL_H);
  pillBg.addColorStop(0, acc.tint);
  pillBg.addColorStop(1, "#ffffff");
  ctx.fillStyle = pillBg;
  roundRect(ctx, PILL_X, PILL_Y, PILL_W, PILL_H, 31); ctx.fill();
  ctx.strokeStyle = acc.a + "aa"; ctx.lineWidth = 2;
  roundRect(ctx, PILL_X, PILL_Y, PILL_W, PILL_H, 31); ctx.stroke();
  ctx.font = "700 26px 'Nunito',sans-serif";
  ctx.fillStyle = acc.a;
  ctx.letterSpacing = "0.1em";
  ctx.textAlign = "center";
  ctx.fillText(`${badge.emoji}  ${badge.label}`, W/2, PILL_Y + 40);

  // ── ZONE D — Username (baseline y=660) ───────────────────────────────────────
  // PILL bottom = 562. 660 baseline = top ~591. Gap from pill: 29px. Clean.
  const displayName = `@${win.display_name || win.username}`;
  let nameFontSize = 92;
  ctx.letterSpacing = "-0.01em";
  ctx.font = `700 ${nameFontSize}px 'Fredoka',system-ui,sans-serif`;
  while (ctx.measureText(displayName).width > 980 && nameFontSize > 52) {
    nameFontSize -= 4;
    ctx.font = `700 ${nameFontSize}px 'Fredoka',system-ui,sans-serif`;
  }
  ctx.fillStyle = "#0d2a05";
  ctx.textAlign = "center";
  ctx.fillText(displayName, W/2, 630);

  // ── ZONE D — Avatar (110px radius, centered below username) ──────────────────
  // Top = 680, center = 790, bottom = 900
  const AVATAR_R  = 110;
  const AVATAR_CY = 770;
  if (avatarUrl) {
    try {
      const avatarImg = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W/2, AVATAR_CY, AVATAR_R, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, W/2 - AVATAR_R, AVATAR_CY - AVATAR_R, AVATAR_R*2, AVATAR_R*2);
      ctx.restore();
      // Gold ring
      ctx.beginPath();
      ctx.arc(W/2, AVATAR_CY, AVATAR_R + 3, 0, Math.PI * 2);
      ctx.strokeStyle = acc.a;
      ctx.lineWidth = 5;
      ctx.stroke();
      // Outer glow ring
      ctx.beginPath();
      ctx.arc(W/2, AVATAR_CY, AVATAR_R + 9, 0, Math.PI * 2);
      ctx.strokeStyle = acc.a + "33";
      ctx.lineWidth = 3;
      ctx.stroke();
    } catch { /* skip */ }
  }

  // ── ZONE D — Winner label (baseline y=930) ────────────────────────────────────
  // Avatar bottom = 900. Winner label top ~916. Baseline 930. Gap: 16px. Tight but clean.
  ctx.font = "500 16px 'Nunito',sans-serif";
  ctx.fillStyle = "#2d5a1a";
  ctx.letterSpacing = "0.2em";
  ctx.fillText("COMMUNITY SPOTLIGHT WINNER", W/2, 910);

  // ── ZONE E — Week (y=960–1040) ────────────────────────────────────────────────
  div(930, 0.2);

  ctx.font = "700 50px 'Fredoka',system-ui,sans-serif";
  ctx.fillStyle = acc.a;
  ctx.letterSpacing = "0.01em";
  ctx.fillText(weekNumber(win.week_start), W/2, 1000);

  ctx.font = "400 20px 'Nunito',sans-serif";
  ctx.fillStyle = "#1e3a10";
  ctx.letterSpacing = "0.04em";
  ctx.fillText(fmtWeek(win.week_start, win.week_end), W/2, 1036);

  // ── ZONE F — Stats anchored near bottom (y=1080–1210) ────────────────────────
  // Canvas H=1350. Branding at 1290. Stats top 1042, height 148, bottom 1190. Gap to branding: 100px.

  const STATS_Y = 1102;
  const CARD_H  = 148;
  const stats = [];
  if (streakCount)            stats.push({ emoji:"🔥", value:`${streakCount}`, label:"Current Streak" });
  if (grassScore)             stats.push({ emoji:"⚡", value:Number(grassScore).toLocaleString(), label:"Grass Score" });
  if (spotlightWinCount > 0)  stats.push({ emoji:"🏆", value:`${spotlightWinCount}`, label:"Spotlight Wins" });

  if (stats.length > 0) {
    const totalW = 940;
    const colW   = Math.floor(totalW / stats.length);
    const startX = W/2 - totalW/2;

    stats.forEach((s, i) => {
      const cx    = startX + i * colW + colW/2;
      const cardW = colW - 14;
      const cardX = cx - cardW/2;

      // Card background
      ctx.save();
      ctx.shadowColor = "rgba(26,74,10,0.10)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, cardX, STATS_Y, cardW, CARD_H, 20); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#cfe3bf"; ctx.lineWidth = 1.5;
      roundRect(ctx, cardX, STATS_Y, cardW, CARD_H, 20); ctx.stroke();

      // Emoji
      ctx.font = "28px serif";
      ctx.letterSpacing = "0";
      ctx.fillText(s.emoji, cx, STATS_Y + 34);

      // Label ABOVE number — gives context before the number
      ctx.font = "600 16px 'Nunito',sans-serif";
      ctx.fillStyle = "#2d5a1a";
      ctx.letterSpacing = "0.06em";
      ctx.fillText(s.label, cx, STATS_Y + 68);

      // Value — large and bold
      ctx.font = "700 54px 'Fredoka',system-ui,sans-serif";
      ctx.fillStyle = "#0d2a05";
      ctx.letterSpacing = "-0.01em";
      ctx.fillText(s.value, cx, STATS_Y + 128);
    });
  }

  // ── ZONE G — Bottom branding ──────────────────────────────────────────────
  // ── ZONE G — Bottom branding ──────────────────────────────────────────────
  div(H - 90, 0.25);
  ctx.font = "500 18px 'Nunito',sans-serif";
  ctx.fillStyle = "#2d5a1a";
  ctx.letterSpacing = "0.1em";
  ctx.textAlign = "center";
  ctx.fillText("ProofOfGrass.app", W/2, H - 54);

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
