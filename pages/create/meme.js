import { useState, useCallback } from "react";
import Link from "next/link";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

// ─── Meme templates — text-only, no external images needed ───────────────────
const TEMPLATES = [
  { key:"utc_reset", label:"UTC Reset Panic", top:"11:58 PM", bottom:"ME SPRINTING OUTSIDE TO SAVE MY STREAK", bg:"#1a0e00", accent:"#f97316" },
  { key:"day1_100",  label:"Day 1 vs Day 100", top:"DAY 1", bottom:"DAY 100", bg:"#0e1008", accent:"#93a85a" },
  { key:"screen_grass", label:"Screen Toucher vs Grass Toucher", top:"SCREEN TOUCHER", bottom:"GRASS TOUCHER", bg:"#0a0a14", accent:"#60a5fa" },
  { key:"lucky_touch", label:"Lucky Touch Activated", top:"🍀 LUCKY TOUCH", bottom:"ACTIVATED", bg:"#0e0d00", accent:"#c8a84b" },
  { key:"shield_save", label:"Streak Shield Save", top:"STREAK ABOUT TO BREAK", bottom:"SHIELD ACTIVATED", bg:"#04140e", accent:"#4ade80" },
  { key:"outside_dlc", label:"Outside DLC", top:"NEW DLC UNLOCKED:", bottom:"OUTSIDE", bg:"#0e0800", accent:"#f97316" },
  { key:"spotlight", label:"Community Spotlight", top:"THIS WEEK'S WINNER:", bottom:"YOU (HOPEFULLY)", bg:"#0e0d00", accent:"#c8a84b" },
  { key:"three_steps", label:"Three Steps", top:"GO OUTSIDE. TAKE PHOTO. PROVE IT.", bottom:"THAT'S THE WHOLE APP", bg:"#080a06", accent:"#93a85a" },
  { key:"daily_choice", label:"Daily Choice", top:"DOOMSCROLL", bottom:"OR TOUCH GRASS", bg:"#0a0a0a", accent:"#f0efea" },
  { key:"future_you", label:"Future You", top:"FUTURE YOU:", bottom:'"THANKS FOR NOT BREAKING THE STREAK"', bg:"#04140e", accent:"#4ade80" },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function generateMeme({ template, topText, bottomText }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, template.bg);
  bg.addColorStop(1, "#050604");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ambient glow
  const glow = ctx.createRadialGradient(W/2, H*0.4, 0, W/2, H*0.4, 500);
  glow.addColorStop(0, template.accent + "20");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = "rgba(200,168,75,0.3)";
  ctx.lineWidth = 2;
  roundRect(ctx, 24, 24, W-48, H-48, 20);
  ctx.stroke();

  // Top branding
  ctx.textAlign = "center";
  ctx.font = "600 16px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.4)";
  ctx.letterSpacing = "0.2em";
  ctx.fillText("TOUCH GRASS", W/2, 70);

  // Top text
  ctx.font = "800 64px 'DM Sans',sans-serif";
  ctx.fillStyle = "#f0efea";
  ctx.letterSpacing = "0";
  const topLines = wrapText(ctx, topText.toUpperCase(), W - 140);
  let ty = H * 0.32 - (topLines.length - 1) * 38;
  topLines.forEach(line => { ctx.fillText(line, W/2, ty); ty += 76; });

  // Divider
  ctx.font = "40px serif";
  ctx.fillStyle = template.accent;
  ctx.fillText("✦", W/2, H/2 + 14);

  // Bottom text
  ctx.font = "800 64px 'DM Sans',sans-serif";
  ctx.fillStyle = template.accent;
  const bottomLines = wrapText(ctx, bottomText.toUpperCase(), W - 140);
  let by = H * 0.68 - (bottomLines.length - 1) * 38;
  bottomLines.forEach(line => { ctx.fillText(line, W/2, by); by += 76; });

  // Bottom branding
  ctx.font = "500 16px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.25)";
  ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", W/2, H - 56);

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
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    input{font-family:'DM Sans',sans-serif;}
    .tpl-btn{ background:${T.bg3}; border:1px solid ${T.border}; color:${T.dim};
      padding:10px 12px; border-radius:9px; cursor:pointer; font-size:11px; font-weight:600;
      text-align:left; transition:all 0.15s; width:100%; }
    .tpl-btn.active{ background:rgba(147,168,90,0.1); border-color:${T.borderG}; color:${T.olive}; }
    .inp{ width:100%; background:${T.bg3}; border:1px solid ${T.border}; color:${T.white};
      padding:10px 12px; border-radius:8px; font-size:13px; outline:none; }
    .inp:focus{ border-color:${T.olive}; }
    .btn{ border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:700;
      font-size:13px; border-radius:10px; padding:13px 24px; }
    .tpl-grid{ display:grid; grid-template-columns:1fr; gap:6px; max-height:340px; overflow-y:auto; }
    @media(min-width:900px){ .layout{ display:grid; grid-template-columns:280px 1fr; gap:24px; } }
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

        <div style={{ maxWidth:1000, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>😂</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(26px,5vw,38px)",
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
                    style={{ background:T.olive, color:"#0e1108", opacity:generating?0.7:1 }}>
                    {generating ? "Generating…" : "✦ Generate Meme"}
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
                      ↓ Save
                    </button>
                    <button className="btn" onClick={copyCaption}
                      style={{ background:"rgba(147,168,90,0.1)", color:T.olive, border:`1px solid ${T.borderG}`, flex:"1 1 140px" }}>
                      {copied ? "✓ Copied" : "📋 Copy Caption"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}