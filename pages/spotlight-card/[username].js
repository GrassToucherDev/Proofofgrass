import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../utils/supabase";
import { SPOTLIGHT_BADGES, getSpotlightBadge, getSpotlightCaption } from "../../utils/spotlightBadges";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

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

  const badge = getSpotlightBadge(win.category) ?? SPOTLIGHT_BADGES.longest_streak;
  const { theme } = badge;

  // ── Background ──────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   theme.bg1);
  bg.addColorStop(0.4, theme.bg2);
  bg.addColorStop(0.8, theme.bg3);
  bg.addColorStop(1,   "#080a06");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Category glow ───────────────────────────────────────────────────────────
  const glow1 = ctx.createRadialGradient(W*0.5, H*0.3, 0, W*0.5, H*0.3, 560);
  glow1.addColorStop(0, theme.glow1 + "2a");
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W*0.15, H*0.72, 0, W*0.15, H*0.72, 360);
  glow2.addColorStop(0, theme.glow2 + "14");
  glow2.addColorStop(1, "transparent");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // Gold emerald glow at center
  const glowC = ctx.createRadialGradient(W*0.5, H*0.5, 0, W*0.5, H*0.5, 400);
  glowC.addColorStop(0, "rgba(147,168,90,0.06)");
  glowC.addColorStop(1, "transparent");
  ctx.fillStyle = glowC;
  ctx.fillRect(0, 0, W, H);

  // ── Deterministic particles ─────────────────────────────────────────────────
  const rng = n => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;
  for (let i = 0; i < 90; i++) {
    const x = rng(i * 1.1) * W;
    const y = rng(i * 1.7) * H;
    const r = rng(i * 2.3) * 1.6 + 0.2;
    const a = rng(i * 3.1) * 0.5 + 0.08;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = theme.particle.replace("0.6", a.toFixed(2));
    ctx.fill();
  }

  // Space Warrior audio waves
  if (win.category === "space_warrior") {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(167,139,250,${0.06 + i*0.01})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 54; x < W - 54; x += 3) {
        const amp = 7 + Math.sin(i * 1.4) * 3;
        const yy  = H * 0.74 + i * 16 + Math.sin(x * (0.011 + i*0.002) + i) * amp;
        x === 54 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Longest Streak sunrise rays
  if (win.category === "longest_streak") {
    ctx.save();
    const cx = W/2, cy = H * 0.28;
    for (let i = 0; i < 14; i++) {
      const angle  = (i / 14) * Math.PI * 2;
      const spread = Math.PI / 18;
      const r1 = 100, r2 = 280;
      const ray = ctx.createLinearGradient(
        cx + Math.cos(angle)*r1, cy + Math.sin(angle)*r1,
        cx + Math.cos(angle)*r2, cy + Math.sin(angle)*r2
      );
      ray.addColorStop(0, "rgba(249,115,22,0.1)");
      ray.addColorStop(1, "transparent");
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle)*r1, cy + Math.sin(angle)*r1);
      ctx.lineTo(cx + Math.cos(angle-spread)*r2, cy + Math.sin(angle-spread)*r2);
      ctx.lineTo(cx + Math.cos(angle+spread)*r2, cy + Math.sin(angle+spread)*r2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Certificate border ──────────────────────────────────────────────────────
  const m = 28;
  // Outer gold border
  ctx.strokeStyle = "rgba(200,168,75,0.45)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, m, m, W-m*2, H-m*2, 22);
  ctx.stroke();
  // Inner accent
  ctx.strokeStyle = badge.color + "22";
  ctx.lineWidth = 1;
  roundRect(ctx, m+10, m+10, W-(m+10)*2, H-(m+10)*2, 16);
  ctx.stroke();
  // Corner ornaments
  [[m+2,m+2],[W-m-2,m+2],[m+2,H-m-2],[W-m-2,H-m-2]].forEach(([cx,cy]) => {
    ctx.strokeStyle = "rgba(200,168,75,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2);
    ctx.fillStyle = "rgba(200,168,75,0.45)"; ctx.fill();
  });

  // ── Top branding ─────────────────────────────────────────────────────────────
  try {
    const logo = await loadImage("/touchgrass-transparent.png");
    ctx.save(); ctx.globalAlpha = 0.65;
    ctx.drawImage(logo, W/2-20, 64, 40, 40);
    ctx.restore();
  } catch { /* continue */ }

  ctx.textAlign = "center";

  ctx.font = "600 20px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.5)";
  ctx.letterSpacing = "0.18em";
  ctx.fillText("PROOF OF GRASS", W/2, 126);

  ctx.font = "700 13px 'DM Sans',sans-serif";
  ctx.fillStyle = "#c8a84b";
  ctx.letterSpacing = "0.24em";
  ctx.fillText("COMMUNITY SPOTLIGHT", W/2, 154);

  // Top divider
  const div = (y) => {
    const g = ctx.createLinearGradient(W*0.2,0,W*0.8,0);
    g.addColorStop(0,"transparent"); g.addColorStop(0.5,"rgba(200,168,75,0.38)"); g.addColorStop(1,"transparent");
    ctx.strokeStyle = g; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W*0.2,y); ctx.lineTo(W*0.8,y); ctx.stroke();
  };
  div(172);

  // ── Trophy ──────────────────────────────────────────────────────────────────
  ctx.font = "80px serif";
  ctx.letterSpacing = "0";
  ctx.fillText("🏆", W/2, 268);

  // ── Badge image (centerpiece) ───────────────────────────────────────────────
  const badgeSize = 260;
  const badgeX = W/2 - badgeSize/2;
  const badgeY = 288;
  try {
    const badgeImg = await loadImage(badge.image);
    // Badge glow
    ctx.save();
    ctx.shadowColor  = badge.color;
    ctx.shadowBlur   = 48;
    ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
    ctx.restore();
    // Second pass without shadow for crisp render
    ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
  } catch {
    // Fallback: emoji + colored circle if image fails
    ctx.beginPath();
    ctx.arc(W/2, badgeY + badgeSize/2, badgeSize/2, 0, Math.PI*2);
    ctx.fillStyle = badge.color + "18";
    ctx.fill();
    ctx.strokeStyle = badge.color + "60";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "80px serif";
    ctx.fillText(badge.emoji, W/2, badgeY + badgeSize/2 + 28);
  }

  // ── Avatar (below badge) ────────────────────────────────────────────────────
  const avatarY = badgeY + badgeSize + 24;
  const avatarSize = 96;
  let hasAvatar = false;
  if (avatarUrl) {
    try {
      const avatarImg = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI*2);
      ctx.clip();
      ctx.drawImage(avatarImg, W/2 - avatarSize/2, avatarY, avatarSize, avatarSize);
      ctx.restore();
      // Avatar ring
      ctx.beginPath();
      ctx.arc(W/2, avatarY + avatarSize/2, avatarSize/2 + 2.5, 0, Math.PI*2);
      ctx.strokeStyle = "#c8a84b";
      ctx.lineWidth = 2;
      ctx.stroke();
      hasAvatar = true;
    } catch { /* skip */ }
  }

  const textY = hasAvatar ? avatarY + avatarSize + 32 : avatarY + 8;

  // ── Category pill ────────────────────────────────────────────────────────────
  const pillW = 360, pillH = 46, pillX = W/2 - pillW/2, pillY2 = textY;
  const pillBg = ctx.createLinearGradient(pillX, pillY2, pillX+pillW, pillY2+pillH);
  pillBg.addColorStop(0, badge.color + "20");
  pillBg.addColorStop(1, badge.color + "0c");
  ctx.fillStyle = pillBg;
  roundRect(ctx, pillX, pillY2, pillW, pillH, 23); ctx.fill();
  ctx.strokeStyle = badge.color + "55";
  ctx.lineWidth = 1;
  roundRect(ctx, pillX, pillY2, pillW, pillH, 23); ctx.stroke();
  ctx.font = "700 19px 'DM Sans',sans-serif";
  ctx.fillStyle = badge.color;
  ctx.letterSpacing = "0.14em";
  ctx.textAlign = "center";
  ctx.fillText(`${badge.emoji}  ${badge.label}`, W/2, pillY2 + 30);

  // ── Username ─────────────────────────────────────────────────────────────────
  const displayName = `@${win.display_name || win.username}`;
  ctx.letterSpacing = "-0.01em";
  let nameFontSize = 62;
  ctx.font = `700 ${nameFontSize}px 'Cormorant Garamond',Georgia,serif`;
  while (ctx.measureText(displayName).width > 860 && nameFontSize > 36) {
    nameFontSize -= 4;
    ctx.font = `700 ${nameFontSize}px 'Cormorant Garamond',Georgia,serif`;
  }
  ctx.fillStyle = "#f0efea";
  ctx.fillText(displayName, W/2, textY + 104);

  // ── Winner label ─────────────────────────────────────────────────────────────
  ctx.font = "600 15px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.42)";
  ctx.letterSpacing = "0.2em";
  ctx.fillText("COMMUNITY SPOTLIGHT WINNER", W/2, textY + 144);

  // ── Stars ────────────────────────────────────────────────────────────────────
  ctx.font = "22px serif";
  ctx.letterSpacing = "0";
  ctx.fillText("✦  ✦  ✦", W/2, textY + 188);

  // ── Week ─────────────────────────────────────────────────────────────────────
  ctx.font = "700 26px 'Cormorant Garamond',Georgia,serif";
  ctx.fillStyle = "#c8a84b";
  ctx.letterSpacing = "0.02em";
  ctx.fillText(weekNumber(win.week_start), W/2, textY + 234);
  ctx.font = "400 16px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.35)";
  ctx.letterSpacing = "0.06em";
  ctx.fillText(fmtWeek(win.week_start, win.week_end), W/2, textY + 260);

  // ── Stats row (if available) ─────────────────────────────────────────────────
  if (streakCount || grassScore || spotlightWinCount) {
    div(textY + 278);
    const stats = [];
    if (streakCount)      stats.push({ label:"STREAK",   value:`${streakCount}d` });
    if (grassScore)       stats.push({ label:"GRASS",    value:Number(grassScore).toLocaleString() });
    if (spotlightWinCount > 0) stats.push({ label:"WINS", value:`×${spotlightWinCount}` });
    const colW = Math.floor(660 / stats.length);
    const startX = W/2 - (colW * stats.length)/2 + colW/2;
    stats.forEach((s, i) => {
      const sx = startX + i * colW;
      ctx.font = "700 26px 'Cormorant Garamond',Georgia,serif";
      ctx.fillStyle = "#f0efea";
      ctx.letterSpacing = "0";
      ctx.fillText(s.value, sx, textY + 320);
      ctx.font = "500 10px 'DM Sans',sans-serif";
      ctx.fillStyle = "rgba(240,239,234,0.3)";
      ctx.letterSpacing = "0.14em";
      ctx.fillText(s.label, sx, textY + 340);
    });
  }

  // ── Bottom divider + branding ────────────────────────────────────────────────
  div(H - 112);
  ctx.font = "500 16px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.25)";
  ctx.letterSpacing = "0.08em";
  ctx.textAlign = "center";
  ctx.fillText("ProofOfGrass.app", W/2, H - 68);

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

  useEffect(() => {
    setMounted(true);
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

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html,body{background:#080a06;color:#f0efea;font-family:'DM Sans',sans-serif;max-width:100vw;overflow-x:hidden;}
    ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#080a06;}
    ::-webkit-scrollbar-thumb{background:#93a85a40;border-radius:2px;}
    .win-opt{background:#141710;border:1px solid rgba(255,255,255,0.055);border-radius:10px;
      padding:14px 16px;cursor:pointer;transition:border-color 0.15s;
      display:flex;align-items:center;gap:10px;width:100%;text-align:left;}
    .win-opt:hover{border-color:rgba(200,168,75,0.35);}
    .win-opt.sel{border-color:#c8a84b;background:rgba(200,168,75,0.05);}
    .btn{border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:700;
      font-size:13px;letter-spacing:0.06em;border-radius:10px;padding:14px 28px;
      transition:opacity 0.15s;width:100%;}
    .btn:hover{opacity:0.85;}.btn:disabled{opacity:0.4;cursor:default;}
    @media(max-width:640px){.preview-img{width:100%!important;height:auto!important;}}
  `;

  if (!mounted) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html:css }} />
      <div style={{ minHeight:"100vh", background:T.bg, maxWidth:"100vw", overflowX:"hidden" }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:26,height:26,objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:17,fontWeight:700,color:T.white }}>touch grass</span>
          </Link>
          {username && (
            <Link href={`/u/${username}`}
              style={{ fontSize:11,color:T.dim,textDecoration:"none",letterSpacing:"0.06em" }}>
              ← @{username}
            </Link>
          )}
        </nav>

        <div style={{ maxWidth:560, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>

          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:42, marginBottom:12 }}>🏆</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:"clamp(28px,5vw,44px)", fontWeight:700, color:T.white,
              lineHeight:1.1, marginBottom:8 }}>Spotlight Card</h1>
            <p style={{ fontSize:13, color:T.dim, lineHeight:1.6 }}>
              Generate your Community Spotlight award card to share on X.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:T.dim }}>Loading…</div>
          ) : wins.length === 0 ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:16,
              padding:"48px 24px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>🏆</div>
              <div style={{ fontSize:14, color:T.dim, marginBottom:6 }}>No spotlight wins yet.</div>
              <div style={{ fontSize:12, color:T.dim }}>Spotlight cards are only available to Community Spotlight winners.</div>
            </div>
          ) : (
            <>
              {/* Win selector */}
              {wins.length > 1 && (
                <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
                  borderRadius:14, padding:20, marginBottom:20 }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.18em",
                    textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
                    Select Spotlight Win
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {wins.map(w => {
                      const b = getSpotlightBadge(w.category);
                      const isSel = selectedWin?.id === w.id;
                      return (
                        <button key={w.id} className={`win-opt${isSel?" sel":""}`}
                          onClick={() => { setSelectedWin(w); setPreview(null); }}>
                          {b?.image && (
                            <img src={b.image} alt="" style={{ width:36,height:36,objectFit:"contain",flexShrink:0 }} />
                          )}
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:isSel?T.gold:T.white }}>
                              {b?.title ?? w.category}
                            </div>
                            <div style={{ fontSize:10, color:T.dim, marginTop:2 }}>
                              {fmtWeek(w.week_start, w.week_end)}
                            </div>
                          </div>
                          {isSel && <span style={{ fontSize:10,color:T.gold,fontWeight:700 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected win info card */}
              {selectedWin && badge && (
                <div style={{ background:T.bg2,
                  border:`1px solid ${badge.color}40`,
                  borderRadius:14, padding:20, marginBottom:20,
                  boxShadow:`0 0 24px ${badge.color}12` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <img src={badge.image} alt={badge.title}
                      style={{ width:64,height:64,objectFit:"contain",flexShrink:0,
                        filter:`drop-shadow(0 0 12px ${badge.color}60)` }} />
                    <div>
                      <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em",
                        textTransform:"uppercase", color:badge.color, marginBottom:4 }}>
                        {badge.emoji} {badge.label}
                      </div>
                      <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                        fontSize:20, fontWeight:700, color:T.white }}>{badge.title}</div>
                      <div style={{ fontSize:11, color:T.dim, marginTop:4 }}>
                        {fmtWeek(selectedWin.week_start, selectedWin.week_end)}
                        {" · "}{weekNumber(selectedWin.week_start)}
                      </div>
                    </div>
                  </div>
                  {selectedWin.description && (
                    <div style={{ marginTop:14, fontSize:12, color:T.muted,
                      lineHeight:1.6, borderLeft:`2px solid ${badge.color}40`, paddingLeft:12 }}>
                      {selectedWin.description}
                    </div>
                  )}
                </div>
              )}

              {/* Generate button */}
              {!preview && (
                <button className="btn" onClick={generate} disabled={generating}
                  style={{ background: badge?.color ?? T.gold, color:"#0e1108", marginBottom:16 }}>
                  {generating ? "Generating…" : "✦ Generate Spotlight Card"}
                </button>
              )}

              {/* Caption copied toast */}
              {captionCopied && (
                <div style={{ textAlign:"center", fontSize:11, color:T.olive,
                  padding:"8px 0", marginBottom:8 }}>
                  ✓ X caption copied to clipboard — ready to paste when you share!
                </div>
              )}

              {/* Preview */}
              {preview && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ borderRadius:14, overflow:"hidden",
                    border:`1px solid ${T.borderGold}`,
                    boxShadow:"0 0 40px rgba(200,168,75,0.15)", marginBottom:16 }}>
                    <img className="preview-img" src={preview} alt="Spotlight Card"
                      style={{ width:"100%", display:"block" }} />
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <button className="btn" onClick={download} disabled={downloading}
                      style={{ background: badge?.color ?? T.gold, color:"#0e1108" }}>
                      {downloading ? "Sharing…"
                        : isMob && navigator.share ? "Share Spotlight Card"
                        : "Download Spotlight Card"}
                    </button>
                    <button className="btn" onClick={copyCaption}
                      style={{ background:"rgba(147,168,90,0.1)", color:T.olive,
                        border:`1px solid rgba(147,168,90,0.3)`, fontSize:12 }}>
                      {captionCopied ? "✓ Caption Copied!" : "📋 Copy X Caption"}
                    </button>
                    <button className="btn" onClick={() => setPreview(null)}
                      style={{ background:"transparent", color:T.dim,
                        border:`1px solid ${T.border}`, fontSize:12 }}>
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}