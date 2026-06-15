import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = {
  longest_streak:  { emoji:"🔥", name:"Longest Streak",  label:"LONGEST STREAK",
    theme:{ glow1:"#f97316", glow2:"#c8a84b", accent:"#f97316",
      bg1:"#0e0800", bg2:"#1a0e00", bg3:"#0a0600",
      particle:"rgba(249,115,22,0.6)" } },
  meme_lord:       { emoji:"😂", name:"Meme Lord",        label:"MEME LORD",
    theme:{ glow1:"#c8a84b", glow2:"#93a85a", accent:"#c8a84b",
      bg1:"#0e0d00", bg2:"#1a1800", bg3:"#0a0900",
      particle:"rgba(200,168,75,0.6)" } },
  biggest_shiller: { emoji:"📣", name:"Biggest Shiller",  label:"BIGGEST SHILLER",
    theme:{ glow1:"#93a85a", glow2:"#4ade80", accent:"#93a85a",
      bg1:"#040e04", bg2:"#081a08", bg3:"#020a02",
      particle:"rgba(147,168,90,0.6)" } },
  space_warrior:   { emoji:"🎧", name:"Space Warrior",    label:"SPACE WARRIOR",
    theme:{ glow1:"#a78bfa", glow2:"#6366f1", accent:"#a78bfa",
      bg1:"#04020e", bg2:"#08041a", bg3:"#02010a",
      particle:"rgba(167,139,250,0.6)" } },
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
  const week = Math.ceil(((d - start) / 86400000 + start.getUTCDay() + 1) / 7);
  return `Week ${week}`;
}

// ─── Canvas generator ─────────────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function generateSpotlightCard({ win, avatarUrl }) {
  const W = 1080, H = 1350; // Portrait format
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const cat = CATEGORIES[win.category] ?? CATEGORIES.longest_streak;
  const { theme } = cat;

  // ── Background gradient ─────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   theme.bg1);
  bg.addColorStop(0.4, theme.bg2);
  bg.addColorStop(0.8, theme.bg3);
  bg.addColorStop(1,   "#080a06");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Ambient glow (category-themed) ─────────────────────────────────────────
  const glow1 = ctx.createRadialGradient(W*0.5, H*0.25, 0, W*0.5, H*0.25, 520);
  glow1.addColorStop(0, theme.glow1 + "28");
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W*0.2, H*0.7, 0, W*0.2, H*0.7, 380);
  glow2.addColorStop(0, theme.glow2 + "14");
  glow2.addColorStop(1, "transparent");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // ── Particles / stars ──────────────────────────────────────────────────────
  const rng = (n) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;
  for (let i = 0; i < 80; i++) {
    const x = rng(i * 1.1) * W;
    const y = rng(i * 1.7) * H;
    const r = rng(i * 2.3) * 1.8 + 0.3;
    const a = rng(i * 3.1) * 0.7 + 0.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = theme.particle.replace("0.6", a.toFixed(2));
    ctx.fill();
  }

  // Space Warrior: audio wave accent
  if (win.category === "space_warrior") {
    ctx.save();
    ctx.strokeStyle = "rgba(167,139,250,0.12)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = H * 0.72 + i * 18;
      ctx.beginPath();
      for (let x = 60; x < W - 60; x += 4) {
        const amp = 8 + Math.sin(i * 1.3) * 4;
        const freq = 0.012 + i * 0.002;
        const yy = y + Math.sin(x * freq + i) * amp;
        x === 60 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Sunrise rays for Longest Streak
  if (win.category === "longest_streak") {
    ctx.save();
    const cx = W / 2, cy = H * 0.3;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * 90;
      const y1 = cy + Math.sin(angle) * 90;
      const x2 = cx + Math.cos(angle) * 260;
      const y2 = cy + Math.sin(angle) * 260;
      const ray = ctx.createLinearGradient(x1, y1, x2, y2);
      ray.addColorStop(0, "rgba(249,115,22,0.08)");
      ray.addColorStop(1, "transparent");
      ctx.fillStyle = ray;
      ctx.beginPath();
      const spread = Math.PI / 16;
      ctx.moveTo(x1, y1);
      ctx.lineTo(cx + Math.cos(angle - spread) * 260, cy + Math.sin(angle - spread) * 260);
      ctx.lineTo(cx + Math.cos(angle + spread) * 260, cy + Math.sin(angle + spread) * 260);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Outer border (certificate frame) ───────────────────────────────────────
  const margin = 28;
  // Outer gold border
  ctx.strokeStyle = "rgba(200,168,75,0.4)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, margin, margin, W - margin*2, H - margin*2, 20);
  ctx.stroke();
  // Inner accent line
  ctx.strokeStyle = `${theme.accent}20`;
  ctx.lineWidth = 1;
  roundRect(ctx, margin + 10, margin + 10, W - (margin+10)*2, H - (margin+10)*2, 14);
  ctx.stroke();

  // Corner ornaments
  const corners = [[margin+2, margin+2], [W-margin-2, margin+2],
                   [margin+2, H-margin-2], [W-margin-2, H-margin-2]];
  corners.forEach(([cx, cy]) => {
    ctx.strokeStyle = "rgba(200,168,75,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200,168,75,0.4)";
    ctx.fill();
  });

  // ── Top branding ────────────────────────────────────────────────────────────
  // Logo
  try {
    const logo = await loadImage("/touchgrass-transparent.png");
    const lSize = 40;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.drawImage(logo, W/2 - lSize/2, 68, lSize, lSize);
    ctx.restore();
  } catch { /* continue without logo */ }

  // PROOF OF GRASS
  ctx.font = "600 22px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.55)";
  ctx.textAlign = "center";
  ctx.letterSpacing = "0.18em";
  ctx.fillText("PROOF OF GRASS", W/2, 128);

  // COMMUNITY SPOTLIGHT
  ctx.font = "700 14px 'DM Sans', sans-serif";
  ctx.fillStyle = T.gold;
  ctx.letterSpacing = "0.22em";
  ctx.fillText("COMMUNITY SPOTLIGHT", W/2, 158);

  // Divider line
  const divGrad = ctx.createLinearGradient(W*0.2, 0, W*0.8, 0);
  divGrad.addColorStop(0,   "transparent");
  divGrad.addColorStop(0.5, "rgba(200,168,75,0.4)");
  divGrad.addColorStop(1,   "transparent");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W*0.2, 174); ctx.lineTo(W*0.8, 174);
  ctx.stroke();

  // ── Trophy icon ─────────────────────────────────────────────────────────────
  ctx.font = "160px serif";
  ctx.textAlign = "center";
  ctx.fillText("🏆", W/2, 380);

  // ── Category ────────────────────────────────────────────────────────────────
  // Category pill
  const pillW = 380, pillH = 52, pillX = W/2 - pillW/2, pillY = 410;
  const pillBg = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
  pillBg.addColorStop(0, theme.accent + "22");
  pillBg.addColorStop(1, theme.accent + "10");
  ctx.fillStyle = pillBg;
  roundRect(ctx, pillX, pillY, pillW, pillH, 26);
  ctx.fill();
  ctx.strokeStyle = theme.accent + "50";
  ctx.lineWidth = 1;
  roundRect(ctx, pillX, pillY, pillW, pillH, 26);
  ctx.stroke();

  ctx.font = "700 22px 'DM Sans', sans-serif";
  ctx.fillStyle = theme.accent;
  ctx.textAlign = "center";
  ctx.letterSpacing = "0.14em";
  ctx.fillText(`${cat.emoji}  ${cat.label}`, W/2, pillY + 33);

  // ── Avatar (if available) ───────────────────────────────────────────────────
  let avatarLoaded = false;
  const avatarY = 510;
  const avatarSize = 120;
  if (avatarUrl) {
    try {
      const avatarImg = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, W/2 - avatarSize/2, avatarY, avatarSize, avatarSize);
      ctx.restore();
      // Avatar ring
      ctx.beginPath();
      ctx.arc(W/2, avatarY + avatarSize/2, avatarSize/2 + 3, 0, Math.PI * 2);
      ctx.strokeStyle = T.gold;
      ctx.lineWidth = 2;
      ctx.stroke();
      avatarLoaded = true;
    } catch { /* skip avatar */ }
  }

  const contentY = avatarLoaded ? avatarY + avatarSize + 36 : avatarY;

  // ── Username ─────────────────────────────────────────────────────────────────
  ctx.font = "700 64px 'Cormorant Garamond', Georgia, serif";
  ctx.fillStyle = T.white;
  ctx.textAlign = "center";
  ctx.letterSpacing = "-0.01em";
  // Truncate if too long
  const displayName = `@${win.display_name || win.username}`;
  let nameFont = "700 64px 'Cormorant Garamond', Georgia, serif";
  if (ctx.measureText(displayName).width > 860) {
    nameFont = "700 48px 'Cormorant Garamond', Georgia, serif";
    ctx.font = nameFont;
  }
  ctx.fillText(displayName, W/2, contentY);

  // ── COMMUNITY SPOTLIGHT WINNER label ────────────────────────────────────────
  ctx.font = "600 18px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.45)";
  ctx.letterSpacing = "0.18em";
  ctx.fillText("COMMUNITY SPOTLIGHT WINNER", W/2, contentY + 44);

  // ── Gold star row ────────────────────────────────────────────────────────────
  ctx.font = "24px serif";
  ctx.fillText("✦  ✦  ✦", W/2, contentY + 96);

  // ── Week label ───────────────────────────────────────────────────────────────
  const weekLabel = fmtWeek(win.week_start, win.week_end);
  const weekNum   = weekNumber(win.week_start);

  ctx.font = "700 28px 'Cormorant Garamond', Georgia, serif";
  ctx.fillStyle = T.gold;
  ctx.letterSpacing = "0.02em";
  ctx.fillText(weekNum, W/2, contentY + 146);

  ctx.font = "400 18px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.38)";
  ctx.letterSpacing = "0.06em";
  ctx.fillText(weekLabel, W/2, contentY + 176);

  // ── Bottom divider ───────────────────────────────────────────────────────────
  const div2Grad = ctx.createLinearGradient(W*0.25, 0, W*0.75, 0);
  div2Grad.addColorStop(0,   "transparent");
  div2Grad.addColorStop(0.5, "rgba(200,168,75,0.3)");
  div2Grad.addColorStop(1,   "transparent");
  ctx.strokeStyle = div2Grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W*0.25, H - 120); ctx.lineTo(W*0.75, H - 120);
  ctx.stroke();

  // ── Bottom branding ──────────────────────────────────────────────────────────
  ctx.font = "500 18px 'DM Sans', sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.28)";
  ctx.letterSpacing = "0.08em";
  ctx.textAlign = "center";
  ctx.fillText("ProofOfGrass.app", W/2, H - 72);

  return canvas.toDataURL("image/png");
}

// ── roundRect helper ──────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SpotlightCardPage() {
  const router   = useRouter();
  const { username } = router.query;
  const [wins,        setWins]        = useState([]);
  const [selectedWin, setSelectedWin] = useState(null);
  const [avatarUrl,   setAvatarUrl]   = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [generating,  setGenerating]  = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [isMob,       setIsMob]       = useState(false);
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMob(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!username) return;
    (async () => {
      const [{ data: spotlights }, { data: profile }] = await Promise.all([
        supabase.from("CommunitySpotlights")
          .select("*")
          .eq("username", username)
          .eq("status", "active")
          .order("week_start", { ascending: false }),
        supabase.from("Profiles")
          .select("avatar_url")
          .eq("username", username)
          .maybeSingle(),
      ]);

      const wins = spotlights ?? [];
      setWins(wins);
      if (wins.length > 0) setSelectedWin(wins[0]);
      // Avatar: admin override > profile avatar
      setAvatarUrl(wins[0]?.avatar_url || profile?.avatar_url || null);
      setLoading(false);
    })();
  }, [username]);

  // Update avatar when selection changes
  useEffect(() => {
    if (!selectedWin) return;
    const profileAvatar = wins.find(w => w.username === username)?.avatar_url;
    setAvatarUrl(selectedWin.avatar_url || profileAvatar || avatarUrl);
  }, [selectedWin]);

  const generate = useCallback(async () => {
    if (!selectedWin) return;
    setGenerating(true);
    setPreview(null);
    try {
      const dataUrl = await generateSpotlightCard({ win: selectedWin, avatarUrl });
      setPreview(dataUrl);
    } catch(e) {
      console.error("Spotlight card error:", e);
    }
    setGenerating(false);
  }, [selectedWin, avatarUrl]);

  const download = useCallback(async () => {
    if (!preview) return;
    setDownloading(true);
    const cat = CATEGORIES[selectedWin?.category];
    const filename = `spotlight-${selectedWin?.username}-${selectedWin?.category}-${selectedWin?.week_start}.png`;

    if (isMob && navigator.share && navigator.canShare) {
      try {
        const res  = await fetch(preview);
        const blob = await res.blob();
        const file = new File([blob], filename, { type:"image/png" });
        if (navigator.canShare({ files:[file] })) {
          await navigator.share({ files:[file],
            title:`Community Spotlight — ${cat?.name}`,
            text:`I won Community Spotlight on Proof of Grass! 🏆\nProofOfGrass.app` });
        } else {
          fallbackDownload(preview, filename);
        }
      } catch(e) {
        if (e.name !== "AbortError") fallbackDownload(preview, filename);
      }
    } else {
      fallbackDownload(preview, filename);
    }
    setDownloading(false);
  }, [preview, selectedWin, isMob]);

  function fallbackDownload(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  const cat = selectedWin ? CATEGORIES[selectedWin.category] : null;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html,body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;
      max-width:100vw;overflow-x:hidden;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    .win-option{background:${T.bg3};border:1px solid ${T.border};border-radius:10px;
      padding:14px 16px;cursor:pointer;transition:border-color 0.15s,background 0.15s;
      display:flex;align-items:center;gap:10;width:100%;}
    .win-option:hover{border-color:${T.borderGold};}
    .win-option.selected{border-color:${T.gold};background:rgba(200,168,75,0.06);}
    .btn{border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:700;
      font-size:13px;letter-spacing:0.06em;border-radius:10px;padding:14px 28px;
      transition:opacity 0.15s;width:100%;}
    .btn:hover{opacity:0.85;} .btn:disabled{opacity:0.4;cursor:default;}
    @media(max-width:640px){
      .card-preview img{width:100%!important;height:auto!important;}
    }
  `;

  if (!mounted) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg, maxWidth:"100vw", overflowX:"hidden" }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9,
            textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt=""
              style={{ width:26, height:26, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>
          {username && (
            <Link href={`/u/${username}`}
              style={{ fontSize:11, color:T.dim, textDecoration:"none",
                letterSpacing:"0.06em" }}>
              ← @{username}
            </Link>
          )}
        </nav>

        <div style={{ maxWidth:560, margin:"0 auto",
          padding:"32px clamp(14px,5vw,32px) 64px" }}>

          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:42, marginBottom:12 }}>🏆</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:"clamp(28px,5vw,44px)", fontWeight:700, color:T.white,
              lineHeight:1.1, marginBottom:8 }}>
              Spotlight Card
            </h1>
            <p style={{ fontSize:13, color:T.dim, lineHeight:1.6 }}>
              Generate your Community Spotlight award card to share.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:T.dim }}>Loading…</div>
          ) : wins.length === 0 ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:16,
              padding:"48px 24px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:12, opacity:0.4 }}>🏆</div>
              <div style={{ fontSize:14, color:T.dim, marginBottom:8 }}>
                No spotlight wins yet.
              </div>
              <div style={{ fontSize:12, color:T.dim }}>
                Spotlight cards are only available to Community Spotlight winners.
              </div>
            </div>
          ) : (
            <>
              {/* Win selector */}
              {wins.length > 1 && (
                <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
                  borderRadius:14, padding:"20px", marginBottom:20 }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.18em",
                    textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
                    Select Spotlight Win
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {wins.map(w => {
                      const c = CATEGORIES[w.category];
                      const isSelected = selectedWin?.id === w.id;
                      return (
                        <button key={w.id}
                          className={`win-option${isSelected ? " selected" : ""}`}
                          onClick={() => { setSelectedWin(w); setPreview(null); }}>
                          <span style={{ fontSize:20 }}>{c?.emoji}</span>
                          <div style={{ flex:1, textAlign:"left" }}>
                            <div style={{ fontSize:13, fontWeight:600,
                              color: isSelected ? T.gold : T.white }}>
                              {c?.name}
                            </div>
                            <div style={{ fontSize:10, color:T.dim, marginTop:2 }}>
                              {fmtWeek(w.week_start, w.week_end)}
                            </div>
                          </div>
                          {isSelected && (
                            <span style={{ fontSize:10, color:T.gold,
                              fontWeight:700, letterSpacing:"0.08em" }}>✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected win info */}
              {selectedWin && (
                <div style={{ background:T.bg2,
                  border:`1px solid ${cat ? cat.theme.accent + "40" : T.borderGold}`,
                  borderRadius:14, padding:"20px", marginBottom:20,
                  boxShadow: cat ? `0 0 24px ${cat.theme.accent}12` : "none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:32 }}>{cat?.emoji}</span>
                    <div>
                      <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em",
                        textTransform:"uppercase", color: cat?.theme.accent ?? T.gold,
                        marginBottom:4 }}>
                        {cat?.label}
                      </div>
                      <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                        fontSize:20, fontWeight:700, color:T.white }}>
                        Community Spotlight Winner
                      </div>
                      <div style={{ fontSize:11, color:T.dim, marginTop:4 }}>
                        {fmtWeek(selectedWin.week_start, selectedWin.week_end)}
                        {" · "}{weekNumber(selectedWin.week_start)}
                      </div>
                    </div>
                  </div>
                  {selectedWin.description && (
                    <div style={{ marginTop:14, fontSize:12, color:T.muted,
                      lineHeight:1.6, borderLeft:`2px solid ${cat?.theme.accent ?? T.gold}40`,
                      paddingLeft:12 }}>
                      {selectedWin.description}
                    </div>
                  )}
                </div>
              )}

              {/* Generate button */}
              {!preview && (
                <button className="btn" onClick={generate} disabled={generating}
                  style={{ background: cat ? cat.theme.accent : T.gold,
                    color: "#0e1108", marginBottom:16 }}>
                  {generating ? "Generating…" : "✦ Generate Spotlight Card"}
                </button>
              )}

              {/* Card preview */}
              {preview && (
                <div className="card-preview" style={{ marginBottom:16 }}>
                  <div style={{ borderRadius:14, overflow:"hidden",
                    border:`1px solid ${T.borderGold}`,
                    boxShadow:"0 0 40px rgba(200,168,75,0.15)", marginBottom:16 }}>
                    <img src={preview} alt="Spotlight Card"
                      style={{ width:"100%", display:"block" }} />
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <button className="btn" onClick={download} disabled={downloading}
                      style={{ background: cat ? cat.theme.accent : T.gold,
                        color:"#0e1108" }}>
                      {downloading ? "Sharing…"
                        : isMob && navigator.share ? "Share Spotlight Card"
                        : "Download Spotlight Card"}
                    </button>
                    <button className="btn" onClick={() => { setPreview(null); }}
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