import { useState, useCallback, useRef } from "react";
import Link from "next/link";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const OVERLAYS = [
  { key:"sun_halo",  label:"Touch Grass Sun Halo", color:"#f97316", desc:"Golden ring with sun rays" },
  { key:"grass",     label:"Grass Border",         color:"#93a85a", desc:"Clean olive ring" },
  { key:"legendary", label:"Legendary Border",     color:"#a78bfa", desc:"Rotating gradient ring" },
  { key:"lucky",     label:"Lucky Touch Border",   color:"#4ade80", desc:"Clover-flecked emerald ring" },
  { key:"spotlight", label:"Spotlight Winner Border", color:"#c8a84b", desc:"Gold championship ring" },
  { key:"ecosystem", label:"Ecosystem Holder Border", color:"#60a5fa", desc:"Verified holder ring" },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

async function generatePFP({ imageSrc, overlay }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#080a06";
  ctx.fillRect(0, 0, W, H);

  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = imageSrc;
  });

  // Draw image cover-fit into circle
  const r = 430;
  const cx = W/2, cy = H/2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const scale = Math.max(W/img.width, H/img.height) * 1.05;
  const iw = img.width * scale, ih = img.height * scale;
  ctx.drawImage(img, cx - iw/2, cy - ih/2, iw, ih);
  ctx.restore();

  const o = OVERLAYS.find(x => x.key === overlay) ?? OVERLAYS[0];

  // Overlay-specific ring effects
  if (o.key === "sun_halo") {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * (r + 6);
      const y1 = cy + Math.sin(angle) * (r + 6);
      const x2 = cx + Math.cos(angle) * (r + 50);
      const y2 = cy + Math.sin(angle) * (r + 50);
      const ray = ctx.createLinearGradient(x1, y1, x2, y2);
      ray.addColorStop(0, "rgba(249,115,22,0.55)");
      ray.addColorStop(1, "transparent");
      ctx.strokeStyle = ray;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI*2);
    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 8; ctx.stroke();
  } else if (o.key === "legendary") {
    const grad = ctx.createConicGradient ? ctx.createConicGradient(0, cx, cy) : null;
    if (grad) {
      grad.addColorStop(0, "#a78bfa"); grad.addColorStop(0.33, "#c8a84b");
      grad.addColorStop(0.66, "#4ade80"); grad.addColorStop(1, "#a78bfa");
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI*2);
      ctx.strokeStyle = grad; ctx.lineWidth = 12; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI*2);
      ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 12; ctx.stroke();
    }
  } else if (o.key === "lucky") {
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI*2);
    ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 10; ctx.stroke();
    const rng = n => Math.abs(Math.sin(n*127.1)*43758.5)%1;
    for (let i = 0; i < 8; i++) {
      const angle = (i/8) * Math.PI*2 + rng(i)*0.3;
      const x = cx + Math.cos(angle) * (r + 5);
      const y = cy + Math.sin(angle) * (r + 5);
      ctx.font = "28px serif";
      ctx.textAlign = "center";
      ctx.fillText("🍀", x, y + 10);
    }
  } else if (o.key === "spotlight") {
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI*2);
    ctx.strokeStyle = "#c8a84b"; ctx.lineWidth = 14; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(200,168,75,0.3)"; ctx.lineWidth = 22; ctx.stroke();
    ctx.font = "64px serif"; ctx.textAlign = "center";
    ctx.fillText("🏆", cx, cy - r - 30);
  } else if (o.key === "ecosystem") {
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI*2);
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 8; ctx.stroke();
    ctx.font = "32px serif"; ctx.textAlign = "center";
    ctx.fillText("◎", cx, cy + r + 50);
  } else {
    // grass — default clean ring
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI*2);
    ctx.strokeStyle = "#93a85a"; ctx.lineWidth = 10; ctx.stroke();
  }

  return canvas.toDataURL("image/png");
}

export default function PFPTool() {
  const fileRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [overlay, setOverlay] = useState("grass");
  const [preview, setPreview] = useState(null);
  const [generating, setGenerating] = useState(false);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImageSrc(reader.result); setPreview(null); };
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImageSrc(reader.result); setPreview(null); };
    reader.readAsDataURL(file);
  };

  const generate = useCallback(async () => {
    if (!imageSrc) return;
    setGenerating(true);
    try {
      const dataUrl = await generatePFP({ imageSrc, overlay });
      setPreview(dataUrl);
    } catch(e) { console.error("pfp generation error", e); }
    setGenerating(false);
  }, [imageSrc, overlay]);

  const download = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.download = `touch-grass-pfp-${overlay}.png`;
    a.href = preview;
    a.click();
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    .ov-btn{ background:${T.bg3}; border:1px solid ${T.border}; padding:12px;
      border-radius:10px; cursor:pointer; text-align:left; transition:all 0.15s; width:100%; }
    .ov-btn.active{ background:rgba(147,168,90,0.08); border-color:${T.borderG}; }
    .btn{ border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:700;
      font-size:13px; border-radius:10px; padding:13px 24px; }
    .drop-zone{ border:2px dashed ${T.border}; border-radius:14px; padding:40px 20px;
      text-align:center; cursor:pointer; transition:border-color 0.15s; }
    .drop-zone:hover{ border-color:${T.borderG}; }
    .sr-only{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden;
      clip:rect(0,0,0,0); white-space:nowrap; border:0; }
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

        <div style={{ maxWidth:560, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🖼️</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(26px,5vw,38px)",
              fontWeight:700, color:T.white, marginBottom:6 }}>PFP Tool</h1>
            <p style={{ fontSize:12.5, color:T.dim }}>Upload your photo, add a Touch Grass frame.</p>
          </div>

          {/* Upload */}
          {!imageSrc ? (
            <label className="drop-zone" onDrop={onDrop} onDragOver={e => e.preventDefault()}
              style={{ display:"block", marginBottom:20 }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="sr-only" />
              <div style={{ fontSize:32, marginBottom:10, opacity:0.5 }}>📷</div>
              <div style={{ fontSize:13, color:T.muted, marginBottom:4 }}>Drop your photo here or tap to browse</div>
              <div style={{ fontSize:11, color:T.dim }}>PNG, JPG — any size</div>
            </label>
          ) : (
            <div style={{ marginBottom:20 }}>
              <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${T.border}`, marginBottom:10 }}>
                <img src={imageSrc} alt="" style={{ width:"100%", display:"block", maxHeight:240, objectFit:"cover" }} />
              </div>
              <button onClick={() => { setImageSrc(null); setPreview(null); }}
                style={{ background:"none", border:"none", color:T.dim, fontSize:11, cursor:"pointer", textDecoration:"underline" }}>
                Choose a different photo
              </button>
            </div>
          )}

          {/* Overlay selector */}
          {imageSrc && (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:18 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
                Choose Frame
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {OVERLAYS.map(o => (
                  <button key={o.key} className={`ov-btn ${overlay===o.key?"active":""}`}
                    onClick={() => { setOverlay(o.key); setPreview(null); }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:14, height:14, borderRadius:"50%", background:o.color, flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color: overlay===o.key ? T.white : T.muted }}>{o.label}</div>
                        <div style={{ fontSize:10.5, color:T.dim, marginTop:1 }}>{o.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {imageSrc && (
            <button className="btn" onClick={generate} disabled={generating}
              style={{ width:"100%", background:T.olive, color:"#0e1108", marginBottom:20, opacity:generating?0.7:1 }}>
              {generating ? "Generating…" : "✦ Apply Frame"}
            </button>
          )}

          {preview && (
            <div>
              <div style={{ borderRadius:"50%", overflow:"hidden", width:280, height:280, margin:"0 auto 18px",
                border:`1px solid ${T.borderGold}`, boxShadow:"0 0 30px rgba(200,168,75,0.15)" }}>
                <img src={preview} alt="PFP preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <button className="btn" onClick={download}
                style={{ width:"100%", background:T.white, color:T.bg }}>
                ↓ Save PFP
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}