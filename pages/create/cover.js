import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import CreateShell from "../../components/CreateShell";
import { T, CARD_SHADOW } from "../../utils/createTheme";
import { supabase } from "../../utils/supabase";
import { COVER_DEFINITIONS, isCoverUrlReady } from "../../utils/coverDefinitions";
import { BRAND, ensureFonts, roundRect, drawScene, drawPanel, drawImage, loadImg, drawFooter, MASCOT } from "../../utils/createCards";


async function generateCoverCard({ cover, username }) {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  await ensureFonts();
  drawScene(ctx, W, H, "day", 0.9);
  drawPanel(ctx, 60, 60, W - 120, H - 190, 44);

  // Cover image in a rounded frame
  const ix = 100, iy = 100, iw = W - 200, ih = 640;
  const img = await loadImg(cover.imageUrl);
  ctx.save(); roundRect(ctx, ix, iy, iw, ih, 30); ctx.clip();
  if (img) {
    const sc = Math.max(iw / img.width, ih / img.height);
    ctx.drawImage(img, ix + iw/2 - img.width*sc/2, iy + ih/2 - img.height*sc/2, img.width*sc, img.height*sc);
  } else { ctx.fillStyle = "#cfe6bd"; ctx.fillRect(ix, iy, iw, ih); }
  ctx.restore();
  roundRect(ctx, ix, iy, iw, ih, 30); ctx.strokeStyle = "rgba(125,200,50,0.6)"; ctx.lineWidth = 4; ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "800 20px 'Nunito',sans-serif"; ctx.fillStyle = BRAND.gold; ctx.letterSpacing = "0.24em";
  ctx.fillText("COVER UNLOCKED", W/2, 800); ctx.letterSpacing = "0px";
  ctx.font = "700 72px 'Fredoka',system-ui,sans-serif"; ctx.fillStyle = BRAND.forest;
  ctx.fillText(cover.name, W/2, 886);
  ctx.font = "700 26px 'Nunito',sans-serif"; ctx.fillStyle = "#4a7a30";
  ctx.fillText(cover.unlockDay ? `Unlocked at Day ${cover.unlockDay}` : (cover.description || ""), W/2, 934);
  ctx.font = "800 32px 'Nunito',sans-serif"; ctx.fillStyle = BRAND.dark;
  ctx.fillText(`@${username}`, W/2, 996);

  await drawImage(ctx, MASCOT("wave"), W - 170, H - 110, 250);
  drawFooter(ctx, W, H, "rgba(255,255,255,0.95)", H - 38);
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
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'Nunito',sans-serif;}
    .cv-card{ position:relative; border-radius:12px; overflow:hidden; cursor:pointer;
      border:2px solid ${T.border}; aspect-ratio:16/9; transition:border-color 0.15s; }
    .cv-card.active{ border-color:${T.borderGold}; }
    .cv-card.locked{ opacity:0.35; cursor:default; }
    .cv-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    .btn{ border:none; cursor:pointer; font-family:'Nunito',sans-serif; font-weight:700;
      font-size:13px; border-radius:10px; padding:13px 24px; }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <CreateShell title="Cover Showcase Card">

        <div style={{ maxWidth:600, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <img src="/mascot/wago-wave.webp" alt="" width={88} height={88} style={{ width:88, height:88, objectFit:"contain", marginBottom:6 }} />
            <h1 style={{ fontFamily:"'Fredoka',system-ui,sans-serif", fontSize:"clamp(26px,5vw,38px)",
              fontWeight:700, color:T.white, marginBottom:6 }}>Cover Showcase Card</h1>
            <p style={{ fontSize:12.5, color:T.dim }}>Show off a profile cover you've unlocked.</p>
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
                style={{ width:"100%", background:T.olive, color:"#fff", marginBottom:20, opacity:generating?0.7:1 }}>
                {generating ? "Generating…" : "Generate Card"}
              </button>

              {preview && (
                <div>
                  <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${T.borderGold}`,
                    boxShadow:"0 0 30px rgba(200,168,75,0.15)", marginBottom:16 }}>
                    <img src={preview} alt="Cover card" style={{ width:"100%", display:"block" }} />
                  </div>
                  <button className="btn" onClick={download}
                    style={{ width:"100%", background:T.white, color:T.bg }}>
                    Save Card
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </CreateShell>
    </>
  );
}