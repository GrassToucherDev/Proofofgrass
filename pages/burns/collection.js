import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";
import { BURN_THEMES, getBurnTheme, getBurnTier, getRandomBurnQuote } from "../../utils/burnThemes";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.4)",
  olive:"#93a85a", gold:"#c8a84b", fire:"#f97316",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const EVENT_START = new Date("2026-06-21T00:00:00Z");
const EVENT_END   = new Date("2026-07-02T00:00:00Z");

function getUsername() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("pog_username");
    return saved ? saved.replace(/@/g,"").toLowerCase().trim() : null;
  } catch { return null; }
}

function fmtBurned(n) {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => {
      fetch(src).then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const img2 = new Image();
        img2.onload = () => { URL.revokeObjectURL(url); res(img2); };
        img2.onerror = rej;
        img2.src = url;
      }).catch(rej);
    };
    img.src = src;
  });
}

// ─── Canvas generator — shared layout logic for both formats ─────────────────
async function generateBurnCard({ theme, format, username, avatarUrl, streak, grassScore,
  shieldCount, totalBurned, quote }) {
  const isPortrait = format === "portrait";
  const W = 1080, H = isPortrait ? 1350 : 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const tier = getBurnTier(shieldCount);

  // ── Background artwork ────────────────────────────────────────────────────
  try {
    const bg = await loadImage(theme.image);
    const scale = Math.max(W/bg.width, H/bg.height);
    const bw = bg.width * scale, bh = bg.height * scale;
    ctx.drawImage(bg, W/2 - bw/2, H/2 - bh/2, bw, bh);
  } catch {
    // Fallback gradient if artwork fails to load
    const g = ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0, "#0e100b"); g.addColorStop(1, "#050604");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  }

  // Dark overlay for legibility — heavier at edges, lighter center where quote sits
  const overlay = ctx.createLinearGradient(0,0,0,H);
  overlay.addColorStop(0,   "rgba(6,8,5,0.55)");
  overlay.addColorStop(0.4, "rgba(6,8,5,0.35)");
  overlay.addColorStop(0.7, "rgba(6,8,5,0.55)");
  overlay.addColorStop(1,   "rgba(6,8,5,0.85)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0,0,W,H);

  // Theme-color ambient glow
  const glow = ctx.createRadialGradient(W*0.5, H*0.35, 0, W*0.5, H*0.35, isPortrait ? 560 : 480);
  glow.addColorStop(0, theme.glow);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0,0,W,H);

  // Certificate border + corner ornaments
  const m = 26;
  ctx.strokeStyle = "rgba(200,168,75,0.4)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, m, m, W-m*2, H-m*2, 20);
  ctx.stroke();
  [[m+2,m+2],[W-m-2,m+2],[m+2,H-m-2],[W-m-2,H-m-2]].forEach(([cx,cy]) => {
    ctx.strokeStyle = "rgba(200,168,75,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx,cy,7,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2);
    ctx.fillStyle = "rgba(200,168,75,0.4)"; ctx.fill();
  });

  // ── Top branding ─────────────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.font = "700 19px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.92)";
  ctx.letterSpacing = "0.18em";
  ctx.fillText("DOUBLE BURNER COLLECTION", W/2, 78);

  ctx.font = "700 14px 'DM Sans',sans-serif";
  ctx.fillStyle = theme.accent;
  ctx.letterSpacing = "0.22em";
  ctx.fillText(theme.title.toUpperCase(), W/2, 103);

  // ── Quote — directly under the theme name ────────────────────────────────────
  const quoteY = isPortrait ? 160 : 148;
  ctx.textAlign = "center";
  let qSize = isPortrait ? 34 : 28;
  ctx.font = `700 ${qSize}px 'Cormorant Garamond',Georgia,serif`;
  while (ctx.measureText(`"${quote}"`).width > W - 200 && qSize > 20) {
    qSize -= 2;
    ctx.font = `700 ${qSize}px 'Cormorant Garamond',Georgia,serif`;
  }
  ctx.fillStyle = "#f0efea";
  ctx.letterSpacing = "-0.005em";
  ctx.fillText(`"${quote}"`, W/2, quoteY);

  // Quote underline accent
  ctx.strokeStyle = theme.accent + "80";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W/2 - 50, quoteY + 22); ctx.lineTo(W/2 + 50, quoteY + 22);
  ctx.stroke();

  // ── BOTTOM: Large PFP + large username, centered above stat row ──────────────
  const avatarR = isPortrait ? 110 : 92;
  const statsY = isPortrait ? H - 130 : H - 120;
  const avatarCY = statsY - 260;

  let hasAvatar = false;
  if (avatarUrl) {
    try {
      const avImg = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath(); ctx.arc(W/2, avatarCY, avatarR, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(avImg, W/2-avatarR, avatarCY-avatarR, avatarR*2, avatarR*2);
      ctx.restore();
      ctx.beginPath(); ctx.arc(W/2, avatarCY, avatarR+4, 0, Math.PI*2);
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 3.5; ctx.stroke();
      hasAvatar = true;
    } catch { /* skip */ }
  }
  if (!hasAvatar) {
    ctx.beginPath(); ctx.arc(W/2, avatarCY, avatarR, 0, Math.PI*2);
    ctx.fillStyle = "rgba(20,23,16,0.8)"; ctx.fill();
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.font = `700 ${avatarR*0.7}px 'Cormorant Garamond',Georgia,serif`;
    ctx.fillStyle = theme.accent;
    ctx.textAlign = "center";
    ctx.fillText((username||"?")[0].toUpperCase(), W/2, avatarCY + avatarR*0.25);
  }

  // Username below avatar — large
  ctx.textAlign = "center";
  let nameSize = isPortrait ? 58 : 48;
  ctx.font = `700 ${nameSize}px 'Cormorant Garamond',Georgia,serif`;
  while (ctx.measureText(`@${username}`).width > W - 120 && nameSize > 30) {
    nameSize -= 3;
    ctx.font = `700 ${nameSize}px 'Cormorant Garamond',Georgia,serif`;
  }
  ctx.fillStyle = "#ffffff";
  ctx.letterSpacing = "0";
  const nameY = avatarCY + avatarR + (isPortrait ? 64 : 54);
  ctx.fillText(`@${username}`, W/2, nameY);

  // ── Burn stats row — Grass Score, Shields, Total Burned (streak removed) ────
  const stats = [
    { label:"GRASS SCORE",  value:fmtBurned(grassScore) },
    { label:"SHIELDS",      value:`${shieldCount}` },
    { label:"TOTAL BURNED", value:fmtBurned(totalBurned) },
  ];
  const totalW = W - 200;
  const colW = totalW / stats.length;
  const startX = 100;

  stats.forEach((s, i) => {
    const cx = startX + i*colW + colW/2;
    ctx.font = `700 ${isPortrait?48:42}px 'Cormorant Garamond',Georgia,serif`;
    ctx.fillStyle = "#ffffff";
    ctx.letterSpacing = "0";
    ctx.fillText(s.value, cx, statsY);
    ctx.font = "700 14px 'DM Sans',sans-serif";
    ctx.fillStyle = "rgba(240,239,234,0.85)";
    ctx.letterSpacing = "0.1em";
    ctx.fillText(s.label, cx, statsY + 32);
  });

  // Divider above stats
  const divG = ctx.createLinearGradient(W*0.12,0,W*0.88,0);
  divG.addColorStop(0,"transparent"); divG.addColorStop(0.5,"rgba(200,168,75,0.3)"); divG.addColorStop(1,"transparent");
  ctx.strokeStyle = divG; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W*0.12, statsY-46); ctx.lineTo(W*0.88, statsY-46); ctx.stroke();

  // ── Bottom branding ───────────────────────────────────────────────────────
  ctx.font = "500 18px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.28)";
  ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", W/2, H - 50);

  return canvas.toDataURL("image/png");
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BurnerCollectionPage() {
  const [username, setUsername]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [isHolder, setIsHolder]     = useState(false);
  const [userData, setUserData]     = useState(null);
  const [selectedTheme, setSelectedTheme] = useState("tropical_burn");
  const [format, setFormat]         = useState("portrait"); // portrait (1080x1350) | square (1080x1080)
  const [quote, setQuote]           = useState(getRandomBurnQuote());
  const [preview, setPreview]       = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    if (!u) { setLoading(false); return; }

    (async () => {
      const [{ data: burns }, { data: streakRow }, { data: profile }] = await Promise.all([
        supabase.from("BurnEvents").select("amount_burned,treasury_match_amount,shield_count,burn_type,created_at")
          .eq("username", u)
          .gte("created_at", EVENT_START.toISOString())
          .lt("created_at", EVENT_END.toISOString()),
        supabase.from("Streaks").select("current_streak,shield_count").eq("username", u).maybeSingle(),
        supabase.from("Profiles").select("avatar_url,grass_score").eq("username", u).maybeSingle(),
      ]);

      const rows = burns ?? [];
      const hasBadge = rows.some(r => r.burn_type === "shield_burn");
      const totalBurned = rows.reduce((s,r) => s + Number(r.amount_burned||0) + Number(r.treasury_match_amount||0), 0);

      setIsHolder(hasBadge);
      setUserData({
        avatarUrl: profile?.avatar_url ?? null,
        streak: streakRow?.current_streak ?? 0,
        grassScore: profile?.grass_score ?? 0,
        shieldCount: streakRow?.shield_count ?? 0,
        totalBurned,
      });
      setLoading(false);
    })();
  }, []);

  const generate = useCallback(async () => {
    if (!userData || !username) return;
    setGenerating(true); setPreview(null);
    try {
      const theme = getBurnTheme(selectedTheme);
      const dataUrl = await generateBurnCard({
        theme, format, username,
        avatarUrl: userData.avatarUrl,
        streak: userData.streak,
        grassScore: userData.grassScore,
        shieldCount: userData.shieldCount,
        totalBurned: userData.totalBurned,
        quote,
      });
      setPreview(dataUrl);
    } catch(e) { console.error("burn card error", e); }
    setGenerating(false);
  }, [userData, username, selectedTheme, format, quote]);

  const download = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.download = `double-burner-${selectedTheme}-${format}.png`;
    a.href = preview;
    a.click();
  };

  // ── Share to X — exact same process/format as the Flex Card share flow ──────
  const shareToX = useCallback(async () => {
    if (generating || !userData || !username) return; // prevent double-fire
    const theme = getBurnTheme(selectedTheme);
    const text = `🔥 ${theme.title} — Double Burner Collection\n\n"${quote}"\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nproofofgrass.app/burns`;
    const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? "");
    const canNativeShare = isMob && !!(navigator.share && navigator.canShare);

    // CRITICAL: window.open() MUST be called synchronously before any await
    // or browsers block it as a popup. Open now, write content after generation.
    let sharedWin = null;
    if (!canNativeShare) {
      sharedWin = window.open("", "_blank");
      if (sharedWin) {
        sharedWin.document.write(`<html><body style="margin:0;background:#0a0b08;display:flex;align-items:center;justify-content:center;height:100vh"><p style="color:#93a85a;font-family:sans-serif;font-size:16px;text-align:center">Generating your card…</p></body></html>`);
      }
    }

    setGenerating(true);
    try {
      const dataUrl = await generateBurnCard({
        theme, format, username,
        avatarUrl: userData.avatarUrl,
        streak: userData.streak,
        grassScore: userData.grassScore,
        shieldCount: userData.shieldCount,
        totalBurned: userData.totalBurned,
        quote,
      });
      setPreview(dataUrl);

      if (canNativeShare) {
        // Mobile native share — attach image directly
        try {
          const res  = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `double-burner-${selectedTheme}-${format}.png`, { type:"image/png" });
          if (navigator.canShare({ files:[file] })) {
            await navigator.share({ files:[file], title:`${theme.title} — Double Burner Collection`, text });
            return; // finally still runs
          }
        } catch(e) {
          if (e?.name === "AbortError") return; // finally still runs
          console.warn("native share failed, falling back to download", e);
        }
        // Mobile fallback — native share unavailable, just download the image
        const link = document.createElement("a");
        link.download = `double-burner-${selectedTheme}-${format}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        // Desktop — write card into pre-opened window with download hint + X button
        if (sharedWin) {
          sharedWin.document.open();
          sharedWin.document.write(`<html><body style="margin:0;background:#0a0b08;font-family:sans-serif;padding:24px">
            <img src="${dataUrl}" style="width:100%;max-width:540px;display:block;margin:0 auto;border-radius:12px"/>
            <p style="color:#93a85a;text-align:center;padding:16px 0 8px;font-size:14px">Right-click the image to save it, then attach to your X post</p>
            <p style="text-align:center;padding-bottom:24px">
              <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}" target="_blank"
                style="display:inline-block;background:#93a85a;color:#0a0b08;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Post on X →</a>
            </p>
          </body></html>`);
          sharedWin.document.close();
        }
      }
    } catch(e) {
      console.error("shareToX error", e);
      if (sharedWin) sharedWin.close();
      // Fallback: open X intent directly
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    } finally {
      setGenerating(false);
    }
  }, [generating, userData, username, selectedTheme, format, quote]);

  const reroll = () => setQuote(getRandomBurnQuote());

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    .theme-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; }
    .theme-card{ position:relative; border-radius:12px; overflow:hidden; cursor:pointer;
      border:2px solid ${T.border}; aspect-ratio:4/5; transition:border-color 0.15s; background:${T.bg3}; }
    .theme-card.active{ border-color:${T.borderGold}; }
    .btn{ border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:700;
      font-size:13px; border-radius:10px; padding:13px 24px; }
    .fmt-btn{ flex:1; padding:10px; border-radius:8px; border:1px solid ${T.border};
      background:${T.bg3}; color:${T.dim}; cursor:pointer; font-size:12px; font-weight:600; }
    .fmt-btn.active{ background:rgba(147,168,90,0.12); border-color:${T.borderG}; color:${T.olive}; }
    .btn-share{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:${T.white};color:${T.bg};border:none;border-radius:10px;padding:13px 24px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:0.04em;width:100%;}
    .btn-share:hover{background:#e8e7e2;transform:translateY(-1px);}
    .btn-share:disabled{opacity:0.6;cursor:default;transform:none;}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}` }}>
          <Link href="/burns" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:24,height:24,objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:16, fontWeight:700, color:T.white }}>Shields & Burns</span>
          </Link>
          <Link href="/burns" style={{ fontSize:11, color:T.olive, textDecoration:"none" }}>← Back</Link>
        </nav>

        <div style={{ maxWidth:680, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>

          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🔥</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(26px,5vw,40px)",
              fontWeight:700, color:T.white, marginBottom:6 }}>Double Burner Collection</h1>
            <p style={{ fontSize:12.5, color:T.dim }}>Exclusive share cards for Double Burner badge holders.</p>
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:T.dim }}>Loading…</div>
          ) : !username ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:16,
              padding:"48px 24px", textAlign:"center" }}>
              <div style={{ fontSize:13, color:T.dim }}>Set your username on the dashboard first.</div>
            </div>
          ) : !isHolder ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:16,
              padding:"56px 24px", textAlign:"center" }}>
              <div style={{ fontSize:42, marginBottom:16, opacity:0.4 }}>🔒</div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:20,
                color:T.white, marginBottom:10 }}>
                🔥 Earn the Double Burner badge to unlock this collection.
              </div>
              <div style={{ fontSize:12.5, color:T.dim, marginBottom:20, lineHeight:1.6 }}>
                Burn for a Streak Shield during the Double Burn Event to unlock 5 exclusive card themes.
              </div>
              <Link href="/burns" style={{ fontSize:12, fontWeight:700, color:T.olive,
                textDecoration:"none", padding:"10px 22px", borderRadius:9,
                border:`1px solid ${T.borderG}`, display:"inline-block" }}>
                View Burn Event →
              </Link>
            </div>
          ) : (
            <>
              {/* Theme selector */}
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
                  Choose Theme
                </div>
                <div className="theme-grid">
                  {Object.values(BURN_THEMES).map(theme => (
                    <div key={theme.key}
                      className={`theme-card ${selectedTheme===theme.key?"active":""}`}
                      onClick={() => { setSelectedTheme(theme.key); setPreview(null); }}>
                      <img src={theme.image} alt={theme.title} loading="lazy"
                        style={{ width:"100%", height:"100%", objectFit:"cover" }}
                        onError={e => { e.target.style.display = "none"; }} />
                      <div style={{ position:"absolute", bottom:0, left:0, right:0,
                        background:"linear-gradient(transparent,rgba(0,0,0,0.9))",
                        padding:"18px 8px 6px", fontSize:10, fontWeight:700, color:"#fff", textAlign:"center" }}>
                        {theme.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Format selector */}
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:10 }}>
                  Format
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className={`fmt-btn ${format==="portrait"?"active":""}`}
                    onClick={() => { setFormat("portrait"); setPreview(null); }}>
                    Portrait · 1080×1350
                  </button>
                  <button className={`fmt-btn ${format==="square"?"active":""}`}
                    onClick={() => { setFormat("square"); setPreview(null); }}>
                    Square · 1080×1080
                  </button>
                </div>
              </div>

              {/* Quote */}
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:18,
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div style={{ fontSize:12.5, color:T.muted, fontStyle:"italic", flex:1 }}>"{quote}"</div>
                <button onClick={reroll}
                  style={{ background:T.bg3, border:`1px solid ${T.border}`, color:T.olive,
                    borderRadius:8, padding:"7px 12px", fontSize:11, cursor:"pointer", flexShrink:0 }}>
                  🔄 New Quote
                </button>
              </div>

              <button className="btn" onClick={generate} disabled={generating}
                style={{ width:"100%", background:getBurnTheme(selectedTheme)?.accent ?? T.gold,
                  color:"#0e1108", marginBottom:20, opacity:generating?0.7:1 }}>
                {generating ? "Generating…" : "✦ Generate Card"}
              </button>

              {preview && (
                <div>
                  <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${T.borderGold}`,
                    boxShadow:"0 0 30px rgba(200,168,75,0.15)", marginBottom:16 }}>
                    <img src={preview} alt="Double Burner card" style={{ width:"100%", display:"block" }} />
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <button onClick={shareToX} disabled={generating} className="btn-share">
                      {generating ? "Generating…" : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          Post to X
                        </>
                      )}
                    </button>
                    <button className="btn" onClick={download} disabled={generating}
                      style={{ width:"100%", background:T.bg3, color:T.dim,
                        border:`1px solid ${T.border}`, opacity:generating?0.6:1 }}>
                      ↓ Save Card
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