import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import CreateShell from "../../components/CreateShell";
import { T, CARD_SHADOW } from "../../utils/createTheme";
import PostToCommunity from "../../components/PostToCommunity";
import { currentTheme } from "../../utils/createCommunity";
import { V2_TIERS } from "../../utils/v2Theme";
import { loadImg } from "../../utils/createCards";


const OVERLAYS = [
  { key:"sun_halo",  label:"Touch Grass Sun Halo", color:"#f97316", desc:"Golden ring with sun rays" },
  { key:"grass",     label:"Grass Border",         color:"#93a85a", desc:"Clean olive ring" },
  { key:"legendary", label:"Legendary Border",     color:"#a78bfa", desc:"Rotating gradient ring" },
  { key:"lucky",     label:"Lucky Touch Border",   color:"#4ade80", desc:"Clover-flecked emerald ring" },
  { key:"spotlight", label:"Spotlight Winner Border", color:"#c8a84b", desc:"Gold championship ring" },
  { key:"ecosystem", label:"Ecosystem Holder Border", color:"#60a5fa", desc:"Verified holder ring" },
];
OVERLAYS.push(...V2_TIERS.filter(t => t.min > 0).map(t => ({ key:`tier_${t.name.toLowerCase()}`, label:`${t.name} Ring`, color:t.color, desc:`Tier frame, Day ${t.min}+`, tier:true })));

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

  ctx.fillStyle = "#f3f9ee";
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
  const cloverImg = o.key === "lucky" ? await loadImg("/icons3d/clover.webp") : null;
  const trophyImg = o.key === "spotlight" ? await loadImg("/icons3d/trophy.webp") : null;

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
      if (cloverImg) ctx.drawImage(cloverImg, x - 22, y - 22, 44, 44);
    }
  } else if (o.key === "spotlight") {
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI*2);
    ctx.strokeStyle = "#c8a84b"; ctx.lineWidth = 14; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(200,168,75,0.3)"; ctx.lineWidth = 22; ctx.stroke();
    if (trophyImg) ctx.drawImage(trophyImg, cx - 42, cy - r - 80, 84, 84);
  } else if (o.key === "ecosystem") {
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI*2);
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath(); ctx.arc(cx, cy + r + 40, 14, 0, Math.PI*2); ctx.fill();
  } else if (o.tier) {
    // tier ring: solid ring plus a crown of petals in the tier color
    for (let i = 0; i < 24; i++) {
      const a = (i/24) * Math.PI*2;
      ctx.save(); ctx.translate(cx + Math.cos(a)*(r + 26), cy + Math.sin(a)*(r + 26)); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, Math.PI*2);
      ctx.fillStyle = o.color + "cc"; ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI*2);
    ctx.strokeStyle = o.color; ctx.lineWidth = 12; ctx.stroke();
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

  const PFP_TEXT = `New profile pic from the Touch Grass PFP tool.\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nhttps://proofofgrass.app/create/pfp`;
  const shareToX = async () => {
    if (!preview) return;
    const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? "");
    if (isMob && navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(preview)).blob();
        const file = new File([blob], "touch-grass-pfp.png", { type:"image/png" });
        if (navigator.canShare({ files:[file] })) { await navigator.share({ files:[file], title:"Touch Grass PFP", text:PFP_TEXT }); return; }
      } catch(e) { if (e?.name === "AbortError") return; }
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(PFP_TEXT)}`, "_blank");
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'Nunito',sans-serif;}
    .ov-btn{ background:${T.bg3}; border:1px solid ${T.border}; padding:12px;
      border-radius:10px; cursor:pointer; text-align:left; transition:all 0.15s; width:100%; }
    .ov-btn.active{ background:rgba(125,200,50,0.16); border-color:${T.borderG}; }
    .btn{ border:none; cursor:pointer; font-family:'Nunito',sans-serif; font-weight:700;
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
      <CreateShell title="PFP Tool">

        <div style={{ maxWidth:560, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <img src="/mascot/wago-camera.webp" alt="" width={88} height={88} style={{ width:88, height:88, objectFit:"contain", marginBottom:6 }} />
            <h1 style={{ fontFamily:"'Fredoka',system-ui,sans-serif", fontSize:"clamp(26px,5vw,38px)",
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
              style={{ width:"100%", background:T.olive, color:"#fff", marginBottom:20, opacity:generating?0.7:1 }}>
              {generating ? "Generating…" : "Apply Frame"}
            </button>
          )}

          {preview && (
            <div>
              <div style={{ borderRadius:"50%", overflow:"hidden", width:280, height:280, margin:"0 auto 18px",
                border:`1px solid ${T.borderGold}`, boxShadow:"0 0 30px rgba(200,168,75,0.15)" }}>
                <img src={preview} alt="PFP preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <button className="btn" onClick={shareToX}
                  style={{ flex:"1 1 140px", background:T.white, color:T.bg }}>
                  Post to X
                </button>
                <button className="btn" onClick={download}
                  style={{ flex:"1 1 140px", background:T.bg3, color:T.dim, border:`1px solid ${T.border}` }}>
                  Save PFP
                </button>
              </div>
              <div style={{ marginTop:10 }}>
                <PostToCommunity dataUrl={preview} kind="pfp" tool={overlay} theme={currentTheme().title} />
              </div>
            </div>
          )}
        </div>
      </CreateShell>
    </>
  );
}