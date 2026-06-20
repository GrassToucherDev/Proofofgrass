import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";
import { COVER_DEFINITIONS, isCoverUrlReady } from "../../utils/coverDefinitions";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

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

async function generateCoverCard({ cover, username }) {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#080a06";
  ctx.fillRect(0, 0, W, H);

  // Cover image fills top 60%
  try {
    const img = await loadImage(cover.imageUrl);
    const ch = H * 0.62;
    const scale = Math.max(W/img.width, ch/img.height);
    const iw = img.width * scale, ih = img.height * scale;
    ctx.drawImage(img, W/2 - iw/2, 0, iw, ih);

    // Fade to black at bottom of image
    const fade = ctx.createLinearGradient(0, ch*0.5, 0, ch);
    fade.addColorStop(0, "transparent");
    fade.addColorStop(1, "#080a06");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, ch);
  } catch { /* skip if image fails */ }

  ctx.strokeStyle = "rgba(200,168,75,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, 24, 24, W-48, H-48, 20);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "600 18px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.5)";
  ctx.letterSpacing = "0.2em";
  ctx.fillText("PROOF OF GRASS", W/2, 856);

  ctx.font = "700 13px 'DM Sans',sans-serif";
  ctx.fillStyle = T.gold;
  ctx.letterSpacing = "0.24em";
  ctx.fillText("PRESTIGE COVER UNLOCKED", W/2, 882);

  ctx.font = "700 56px 'Cormorant Garamond',Georgia,serif";
  ctx.fillStyle = "#f0efea";
  ctx.letterSpacing = "-0.01em";
  ctx.fillText(cover.name, W/2, 970);

  ctx.font = "500 18px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.5)";
  ctx.letterSpacing = "0.04em";
  ctx.fillText(`Unlocked at Day ${cover.unlockDay}`, W/2, 1010);

  ctx.font = "600 22px 'DM Sans',sans-serif";
  ctx.fillStyle = T.olive;
  ctx.fillText(`@${username}`, W/2, 1070);

  ctx.font = "500 18px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.25)";
  ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", W/2, H - 60);

  return canvas.toDataURL("image/png");
}

export default function CoverTool() {
  const [username, setUsername] = useState(null);
  const [unlockedSlugs, setUnlockedSlugs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let u = null;
    try { u = localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim(); } catch {}
    if (!u) { setLoading(false); return; }
    setUsername(u);
    (async () => {
      const { data } = await supabase.from("Profiles").select("unlocked_covers").eq("username", u).maybeSingle();
      const unlocked = data?.unlocked_covers ?? [];
      setUnlockedSlugs(unlocked);
      const firstUnlocked = COVER_DEFINITIONS.find(c => unlocked.includes(c.slug));
      if (firstUnlocked) setSelected(firstUnlocked);
      setLoading(false);
    })();
  }, []);

  const generate = useCallback(async () => {
    if (!selected || !username) return;
    setGenerating(true);
    try {
      const dataUrl = await generateCoverCard({ cover:selected, username });
      setPreview(dataUrl);
    } catch(e) { console.error("cover card error", e); }
    setGenerating(false);
  }, [selected, username]);

  const download = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.download = `cover-${selected.slug}.png`;
    a.href = preview;
    a.click();
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    .cv-card{ position:relative; border-radius:12px; overflow:hidden; cursor:pointer;
      border:2px solid ${T.border}; aspect-ratio:16/9; transition:border-color 0.15s; }
    .cv-card.active{ border-color:${T.borderGold}; }
    .cv-card.locked{ opacity:0.35; cursor:default; }
    .cv-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    .btn{ border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:700;
      font-size:13px; border-radius:10px; padding:13px 24px; }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>
        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}` }}>
          <Link href="/create" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:24,height:24,objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:16, fontWeight:700, color:T.white }}>Creator Hub</span>
          </Link>
          <Link href="/create" style={{ fontSize:11, color:T.olive, textDecoration:"none" }}>← All Tools</Link>
        </nav>

        <div style={{ maxWidth:600, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🌄</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(26px,5vw,38px)",
              fontWeight:700, color:T.white, marginBottom:6 }}>Cover Showcase Card</h1>
            <p style={{ fontSize:12.5, color:T.dim }}>Show off a Prestige Cover you've unlocked.</p>
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:T.dim }}>Loading…</div>
          ) : !username ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:"40px 20px", textAlign:"center" }}>
              <div style={{ fontSize:13, color:T.dim }}>Visit your profile first to link your account.</div>
            </div>
          ) : (
            <>
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:18 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
                  Your Covers
                </div>
                <div className="cv-grid">
                  {COVER_DEFINITIONS.map(c => {
                    const isUnlocked = unlockedSlugs.includes(c.slug);
                    const isSel = selected?.slug === c.slug;
                    const ready = isCoverUrlReady ? isCoverUrlReady(c.imageUrl) : true;
                    return (
                      <div key={c.slug}
                        className={`cv-card ${isSel?"active":""} ${!isUnlocked?"locked":""}`}
                        onClick={() => { if (isUnlocked) { setSelected(c); setPreview(null); } }}
                        style={{ background:T.bg3 }}>
                        {isUnlocked && ready ? (
                          <img src={c.imageUrl} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        ) : (
                          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <span style={{ fontSize:24, opacity:0.3 }}>🔒</span>
                          </div>
                        )}
                        <div style={{ position:"absolute", bottom:0, left:0, right:0,
                          background:"linear-gradient(transparent,rgba(0,0,0,0.85))",
                          padding:"16px 10px 8px", fontSize:10.5, fontWeight:600, color:T.white }}>
                          {c.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {unlockedSlugs.length === 0 && (
                  <div style={{ textAlign:"center", padding:"16px 0 4px", fontSize:12, color:T.dim }}>
                    Unlock this cover first — keep your streak going.
                  </div>
                )}
              </div>

              <button className="btn" onClick={generate} disabled={generating || !selected}
                style={{ width:"100%", background:T.olive, color:"#0e1108", marginBottom:20, opacity:generating?0.7:1 }}>
                {generating ? "Generating…" : "✦ Generate Card"}
              </button>

              {preview && (
                <div>
                  <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${T.borderGold}`,
                    boxShadow:"0 0 30px rgba(200,168,75,0.15)", marginBottom:16 }}>
                    <img src={preview} alt="Cover card" style={{ width:"100%", display:"block" }} />
                  </div>
                  <button className="btn" onClick={download}
                    style={{ width:"100%", background:T.white, color:T.bg }}>
                    ↓ Save Card
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}