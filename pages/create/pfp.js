import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import CreateShell from "../../components/CreateShell";
import { T, CARD_SHADOW } from "../../utils/createTheme";
import PostToCommunity from "../../components/PostToCommunity";
import { currentTheme } from "../../utils/createCommunity";
import { V2_TIERS } from "../../utils/v2Theme";
import { loadImg } from "../../utils/createCards";


const HOLES = {"seedling": [0.4918, 0.4978, 0.3967], "sprout": [0.4973, 0.4853, 0.3975], "rooted": [0.4939, 0.4956, 0.3826], "grounded": [0.4995, 0.4941, 0.4098], "trailhead": [0.489, 0.4973, 0.4019], "summit": [0.4984, 0.5186, 0.3817], "legend": [0.4983, 0.5204, 0.3789], "immortal": [0.4993, 0.5009, 0.3641]}; // per ring: [centre x, centre y, outer radius of the opening] as fractions of the image
const RING_TIERS = V2_TIERS.map(t => ({ key:`tier_${t.name.toLowerCase()}`, name:t.name, min:t.min, color:t.color, hole:HOLES[t.name.toLowerCase()],
  src:`/frames/ring-${t.name.toLowerCase()}.webp`, mask:`/frames/mask-${t.name.toLowerCase()}.png` }));
const SPOTLIGHT = { key:"spotlight", name:"Spotlight Winner", color:"#c8a84b" };
const FRAMES = [...RING_TIERS, SPOTLIGHT];

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

  const o = FRAMES.find(x => x.key === overlay) ?? FRAMES[0];
  const cx = W/2, cy = H/2;
  const ring = o.src ? await loadImg(o.src) : null;
  let r = 430;
  if (ring) {
    // photo goes in the ring's opening: cover-fit to a circle on the opening's centre, then cut to the opening's own shape
    const [hx, hy, hr] = o.hole;
    const mask = await loadImg(o.mask);
    const layer = document.createElement("canvas"); layer.width = W; layer.height = H;
    const lc = layer.getContext("2d");
    const rr = hr * W + 6, px = hx * W, py = hy * H;
    const sc = Math.max((rr*2)/img.width, (rr*2)/img.height);
    lc.drawImage(img, px - img.width*sc/2, py - img.height*sc/2, img.width*sc, img.height*sc);
    lc.globalCompositeOperation = "destination-in";
    lc.drawImage(mask, 0, 0, W, H);
    ctx.drawImage(layer, 0, 0);
  } else {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const scale = Math.max((r*2)/img.width, (r*2)/img.height);
    ctx.drawImage(img, cx - img.width*scale/2, cy - img.height*scale/2, img.width*scale, img.height*scale);
    ctx.restore();
  }

  if (ring) {
    ctx.drawImage(ring, 0, 0, W, H);
  } else {
    const trophyImg = await loadImg("/icons3d/trophy.webp");
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI*2);
    ctx.strokeStyle = "#c8a84b"; ctx.lineWidth = 14; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(200,168,75,0.3)"; ctx.lineWidth = 22; ctx.stroke();
    if (trophyImg) ctx.drawImage(trophyImg, cx - 42, cy - r - 80, 84, 84);
  }

  return canvas.toDataURL("image/png");
}

export default function PFPTool() {
  const fileRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [overlay, setOverlay] = useState("tier_seedling");
  const [access, setAccess] = useState({ best:0, spotlight:false, user:"", loaded:false });
  useEffect(() => {
    let u = ""; try { u = (localStorage.getItem("pog_username") || "").replace(/@/g, "").toLowerCase().trim(); } catch {}
    if (!u) { setAccess(a => ({ ...a, loaded:true })); return; }
    fetch(`/api/create/frames?username=${encodeURIComponent(u)}`).then(r => r.json()).then(d => {
      const best = d?.best || 0;
      setAccess({ best, spotlight:!!d?.spotlight, user:u, loaded:true });
      const top = [...RING_TIERS].reverse().find(t => best >= t.min);
      if (top) setOverlay(top.key);
    }).catch(() => setAccess(a => ({ ...a, loaded:true })));
  }, []);
  const unlocked = (f) => f.key === "spotlight" ? access.spotlight : access.best >= f.min;
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

          {/* Frame picker */}
          {imageSrc && (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:18 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:6 }}>
                Choose Frame
              </div>
              <p style={{ fontSize:11.5, color:T.dim, marginBottom:12, lineHeight:1.5 }}>
                {access.user
                  ? `Rings unlock at the highest streak tier you have ever reached. Your best is Day ${access.best}.`
                  : "Rings unlock at the highest streak tier you have ever reached. Sign in on the home page to unlock yours."}
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(112px,1fr))", gap:10 }}>
                {FRAMES.map(f => {
                  const ok = unlocked(f);
                  return (
                    <button key={f.key} className={`ov-btn ${overlay===f.key?"active":""}`} disabled={!ok}
                      onClick={() => { if (ok) { setOverlay(f.key); setPreview(null); } }}
                      style={{ textAlign:"center", padding:10, opacity: ok ? 1 : 0.55, cursor: ok ? "pointer" : "not-allowed" }}>
                      <div style={{ width:"100%", aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:6 }}>
                        {f.src
                          ? <img src={f.src} alt="" style={{ width:"100%", height:"100%", objectFit:"contain", filter: ok ? "none" : "grayscale(1) brightness(0.9)" }} />
                          : <img src="/icons3d/trophy.webp" alt="" style={{ width:"70%", height:"70%", objectFit:"contain", filter: ok ? "none" : "grayscale(1)" }} />}
                      </div>
                      <div style={{ fontSize:12, fontWeight:800, color: overlay===f.key ? T.white : T.muted }}>{f.name}</div>
                      <div style={{ fontSize:10.5, color:T.dim, marginTop:1 }}>
                        {ok ? (f.min != null ? `Day ${f.min}+` : "Spotlight") : (f.min != null ? `Reach Day ${f.min}` : "Win a Spotlight")}
                      </div>
                    </button>
                  );
                })}
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