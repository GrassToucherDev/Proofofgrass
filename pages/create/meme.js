import { useState, useCallback } from "react";
import Link from "next/link";
import CreateShell from "../../components/CreateShell";
import { T, CARD_SHADOW } from "../../utils/createTheme";
import PostToCommunity from "../../components/PostToCommunity";
import { currentTheme } from "../../utils/createCommunity";
import { BRAND, ensureFonts, wrapText, drawScene, drawImage, drawFooter, MASCOT } from "../../utils/createCards";


// ─── Meme templates: each has a scene (sky and hill colors) and a WAGO pose ───
const TEMPLATES = [
  { key:"utc_reset",    label:"UTC Reset Panic",           top:"11:58 PM UTC", bottom:"ME SPRINTING OUTSIDE TO SAVE MY STREAK", scene:"sunrise", mascot:"celebrate" },
  { key:"day1_100",     label:"Day 1 vs Day 100",          top:"DAY 1", bottom:"DAY 100", scene:"day", mascot:"wave" },
  { key:"screen_grass", label:"Screen Toucher vs Grass Toucher", top:"SCREEN TOUCHER", bottom:"GRASS TOUCHER", scene:"blue", mascot:"point" },
  { key:"lucky_touch",  label:"Lucky Touch Activated",     top:"LUCKY TOUCH", bottom:"ACTIVATED", scene:"gold", mascot:"celebrate" },
  { key:"shield_save",  label:"Streak Shield Save",        top:"STREAK ABOUT TO BREAK", bottom:"SHIELD ACTIVATED", scene:"mint", mascot:"shield" },
  { key:"outside_dlc",  label:"Outside DLC",               top:"NEW DLC UNLOCKED:", bottom:"OUTSIDE", scene:"day", mascot:"point" },
  { key:"proof_of_day", label:"Proof of the Day",          top:"THE GALLERY IS WATCHING", bottom:"MAKE IT PROOF OF THE DAY", scene:"gold", mascot:"camera" },
  { key:"grass_draw",   label:"Grass Draw Entry",          top:"ONE MORE PROOF", bottom:"ONE MORE GRASS DRAW ENTRY", scene:"mint", mascot:"celebrate" },
  { key:"grove",        label:"My Grove",                  top:"MY GROVE:", bottom:"ALL OF US TOUCHING GRASS", scene:"day", mascot:"wave" },
  { key:"spotlight",    label:"Community Spotlight",       top:"THIS WEEK'S WINNER:", bottom:"YOU (HOPEFULLY)", scene:"gold", mascot:"trophy" },
  { key:"three_steps",  label:"Three Steps",               top:"GO OUTSIDE. TAKE PHOTO. PROVE IT.", bottom:"THAT'S THE WHOLE APP", scene:"day", mascot:"camera" },
  { key:"daily_choice", label:"Daily Choice",              top:"DOOMSCROLL", bottom:"OR TOUCH GRASS", scene:"dusk", mascot:"point" },
  { key:"future_you",   label:"Future You",                top:"FUTURE YOU:", bottom:'"THANKS FOR NOT BREAKING THE STREAK"', scene:"sunrise", mascot:"wave" },
  { key:"wago_sleeps",  label:"WAGO Is Sleeping",          top:"NO PROOF TODAY?", bottom:"WAGO IS DISAPPOINTED", scene:"dusk", mascot:"sleep" },
];

async function generateMeme({ template, topText, bottomText }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  await ensureFonts();
  const sc = drawScene(ctx, W, H, template.scene, 0.80);
  ctx.textAlign = "center"; ctx.lineJoin = "round";

  // Top text (dark green on the sky)
  ctx.font = "700 70px 'Fredoka',system-ui,sans-serif";
  const topLines = wrapText(ctx, topText.toUpperCase(), W - 150);
  let ty = 120; ctx.fillStyle = BRAND.forest;
  topLines.forEach((l) => { ctx.fillText(l, W / 2, ty); ty += 78; });

  // WAGO, standing on the hills
  await drawImage(ctx, MASCOT(template.mascot), W / 2, 800, 440);

  // Bottom text (white with a dark outline so it reads on the grass)
  ctx.font = "700 66px 'Fredoka',system-ui,sans-serif";
  const bottomLines = wrapText(ctx, bottomText.toUpperCase(), W - 150);
  let by = 892 - (bottomLines.length - 1) * 30;
  bottomLines.forEach((l) => {
    ctx.lineWidth = 14; ctx.strokeStyle = sc.accent; ctx.strokeText(l, W / 2, by);
    ctx.fillStyle = "#fff"; ctx.fillText(l, W / 2, by); by += 72;
  });
  drawFooter(ctx, W, H, "rgba(255,255,255,0.95)", H - 34);
  return canvas.toDataURL("image/png");
}

export default function MemeTool() {
  const [selected, setSelected] = useState(TEMPLATES[0]);
  const [topText, setTopText] = useState(TEMPLATES[0].top);
  const [bottomText, setBottomText] = useState(TEMPLATES[0].bottom);
  const [preview, setPreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectTemplate = (t) => {
    setSelected(t);
    setTopText(t.top);
    setBottomText(t.bottom);
    setPreview(null);
  };

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const dataUrl = await generateMeme({ template:selected, topText, bottomText });
      setPreview(dataUrl);
    } catch(e) { console.error("meme generation error", e); }
    setGenerating(false);
  }, [selected, topText, bottomText]);

  const download = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.download = `touch-grass-meme-${selected.key}.png`;
    a.href = preview;
    a.click();
  };

  const shareToX = async () => {
    if (!preview) return;
    const text = `${FOOTER_TEXT}`;
    const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? "");
    if (isMob && navigator.share && navigator.canShare) {
      try {
        const res = await fetch(preview);
        const blob = await res.blob();
        const file = new File([blob], "touch-grass-meme.png", { type:"image/png" });
        if (navigator.canShare({ files:[file] })) {
          await navigator.share({ files:[file], title:"Touch Grass Meme", text });
          return;
        }
      } catch(e) { if (e?.name === "AbortError") return; }
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(FOOTER_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* unavailable */ }
  };

  const FOOTER_TEXT = `🌿 ${selected.label}\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nhttps://proofofgrass.app`;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'Nunito',sans-serif;}
    input{font-family:'Nunito',sans-serif;}
    .tpl-btn{ background:${T.bg3}; border:1px solid ${T.border}; color:${T.dim};
      padding:10px 12px; border-radius:9px; cursor:pointer; font-size:11px; font-weight:600;
      text-align:left; transition:all 0.15s; width:100%; }
    .tpl-btn.active{ background:rgba(125,200,50,0.16); border-color:${T.borderG}; color:${T.olive}; }
    .inp{ width:100%; background:${T.bg3}; border:1px solid ${T.border}; color:${T.white};
      padding:10px 12px; border-radius:8px; font-size:13px; outline:none; }
    .inp:focus{ border-color:${T.olive}; }
    .btn{ border:none; cursor:pointer; font-family:'Nunito',sans-serif; font-weight:700;
      font-size:13px; border-radius:10px; padding:13px 24px; }
    .tpl-grid{ display:grid; grid-template-columns:1fr; gap:6px; max-height:340px; overflow-y:auto; }
    @media(min-width:900px){ .layout{ display:grid; grid-template-columns:280px 1fr; gap:24px; } }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <CreateShell title="Meme Tool">

        <div style={{ maxWidth:1000, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <img src="/mascot/wago-celebrate.webp" alt="" width={88} height={88} style={{ width:88, height:88, objectFit:"contain", marginBottom:6 }} />
            <h1 style={{ fontFamily:"'Fredoka',system-ui,sans-serif", fontSize:"clamp(26px,5vw,38px)",
              fontWeight:700, color:T.white, marginBottom:6 }}>Meme Tool</h1>
            <p style={{ fontSize:12.5, color:T.dim }}>Pick a template, edit the text, share it.</p>
          </div>

          <div className="layout">
            {/* Template list */}
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:10 }}>
                Templates
              </div>
              <div className="tpl-grid">
                {TEMPLATES.map(t => (
                  <button key={t.key} className={`tpl-btn ${selected.key===t.key?"active":""}`}
                    onClick={() => selectTemplate(t)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor + preview */}
            <div>
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div>
                    <label style={{ fontSize:10, color:T.dim, display:"block", marginBottom:6 }}>Top Text</label>
                    <input className="inp" value={topText} onChange={e => setTopText(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, color:T.dim, display:"block", marginBottom:6 }}>Bottom Text</label>
                    <input className="inp" value={bottomText} onChange={e => setBottomText(e.target.value)} />
                  </div>
                  <button className="btn" onClick={generate} disabled={generating}
                    style={{ background:T.olive, color:"#fff", opacity:generating?0.7:1 }}>
                    {generating ? "Generating…" : "Generate Meme"}
                  </button>
                </div>
              </div>

              {preview && (
                <div>
                  <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${T.borderGold}`,
                    boxShadow:"0 0 30px rgba(200,168,75,0.12)", marginBottom:16 }}>
                    <img src={preview} alt="Meme preview" style={{ width:"100%", display:"block" }} />
                  </div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <button className="btn" onClick={shareToX}
                      style={{ background:T.white, color:T.bg, flex:"1 1 140px" }}>
                      Post to X
                    </button>
                    <button className="btn" onClick={download}
                      style={{ background:T.bg3, color:T.dim, border:`1px solid ${T.border}`, flex:"1 1 140px" }}>
                      Save
                    </button>
                    <button className="btn" onClick={copyCaption}
                      style={{ background:"rgba(125,200,50,0.16)", color:T.olive, border:`1px solid ${T.borderG}`, flex:"1 1 140px" }}>
                      {copied ? "Copied" : "Copy Caption"}
                    </button>
                  </div>
                  <div style={{ marginTop:10 }}>
                    <PostToCommunity dataUrl={preview} kind="meme" tool={selected.key} theme={currentTheme().title} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CreateShell>
    </>
  );
}