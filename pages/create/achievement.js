import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const TYPE_META = {
  streak:      { emoji:"🔥", color:"#f97316" },
  grass_score: { emoji:"⚡", color:"#93a85a" },
  proof_count: { emoji:"🌿", color:"#4ade80" },
  referral:    { emoji:"🤝", color:"#c8a84b" },
  spotlight:   { emoji:"🏆", color:"#c8a84b" },
  lucky_touch: { emoji:"🍀", color:"#93a85a" },
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

async function generateAchievementCard({ milestone, username, avatarUrl }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const meta = TYPE_META[milestone.milestone_type] ?? { emoji:"⭐", color:"#93a85a" };

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0e100b");
  bg.addColorStop(1, "#050604");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W/2, H*0.4, 0, W/2, H*0.4, 480);
  glow.addColorStop(0, meta.color + "22");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(200,168,75,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, 24, 24, W-48, H-48, 20);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "600 18px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.45)";
  ctx.letterSpacing = "0.2em";
  ctx.fillText("PROOF OF GRASS", W/2, 110);

  ctx.font = "700 14px 'DM Sans',sans-serif";
  ctx.fillStyle = T.gold;
  ctx.letterSpacing = "0.24em";
  ctx.fillText("ACHIEVEMENT UNLOCKED", W/2, 138);

  // Big emoji
  ctx.font = "180px serif";
  ctx.letterSpacing = "0";
  ctx.fillText(meta.emoji, W/2, 410);

  // Avatar
  let hasAvatar = false;
  if (avatarUrl) {
    try {
      const img = await loadImage(avatarUrl);
      const r = 56, cy = 490;
      ctx.save();
      ctx.beginPath(); ctx.arc(W/2, cy, r, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(img, W/2 - r, cy - r, r*2, r*2);
      ctx.restore();
      ctx.beginPath(); ctx.arc(W/2, cy, r+2, 0, Math.PI*2);
      ctx.strokeStyle = meta.color; ctx.lineWidth = 2; ctx.stroke();
      hasAvatar = true;
    } catch { /* skip */ }
  }

  const labelY = hasAvatar ? 620 : 560;

  // Milestone label
  let fontSize = 64;
  ctx.font = `700 ${fontSize}px 'Cormorant Garamond',Georgia,serif`;
  while (ctx.measureText(milestone.milestone_label).width > 900 && fontSize > 36) {
    fontSize -= 4;
    ctx.font = `700 ${fontSize}px 'Cormorant Garamond',Georgia,serif`;
  }
  ctx.fillStyle = "#f0efea";
  ctx.letterSpacing = "-0.01em";
  ctx.fillText(milestone.milestone_label, W/2, labelY);

  ctx.font = "600 22px 'DM Sans',sans-serif";
  ctx.fillStyle = meta.color;
  ctx.letterSpacing = "0.04em";
  ctx.fillText(`@${username}`, W/2, labelY + 50);

  ctx.font = "500 18px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(240,239,234,0.28)";
  ctx.letterSpacing = "0.1em";
  ctx.fillText("ProofOfGrass.app", W/2, H - 60);

  return canvas.toDataURL("image/png");
}

export default function AchievementTool() {
  const [username, setUsername] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [selected, setSelected] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let u = null;
    try { u = localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim(); } catch {}
    if (!u) { setLoading(false); return; }
    setUsername(u);
    (async () => {
      const [{ data: ms }, { data: profile }] = await Promise.all([
        supabase.from("MilestoneEvents").select("*").eq("username", u).order("created_at", { ascending:false }),
        supabase.from("Profiles").select("avatar_url").eq("username", u).maybeSingle(),
      ]);
      setMilestones(ms ?? []);
      if (ms?.length) setSelected(ms[0]);
      setAvatarUrl(profile?.avatar_url ?? null);
      setLoading(false);
    })();
  }, []);

  const generate = useCallback(async () => {
    if (!selected || !username) return;
    setGenerating(true);
    try {
      const dataUrl = await generateAchievementCard({ milestone:selected, username, avatarUrl });
      setPreview(dataUrl);
    } catch(e) { console.error("achievement card error", e); }
    setGenerating(false);
  }, [selected, username, avatarUrl]);

  const download = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.download = `achievement-${selected.milestone_type}-${selected.milestone_value}.png`;
    a.href = preview;
    a.click();
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    .ms-btn{ background:${T.bg3}; border:1px solid ${T.border}; padding:12px 14px;
      border-radius:10px; cursor:pointer; text-align:left; transition:all 0.15s; width:100%;
      display:flex; align-items:center; gap:10px; }
    .ms-btn.active{ background:rgba(147,168,90,0.08); border-color:${T.borderG}; }
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

        <div style={{ maxWidth:560, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🏆</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(26px,5vw,38px)",
              fontWeight:700, color:T.white, marginBottom:6 }}>Achievement Card</h1>
            <p style={{ fontSize:12.5, color:T.dim }}>Only for milestones you've actually earned.</p>
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:T.dim }}>Loading…</div>
          ) : !username ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:"40px 20px", textAlign:"center" }}>
              <div style={{ fontSize:13, color:T.dim }}>Visit your profile first to link your account.</div>
            </div>
          ) : milestones.length === 0 ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:"40px 20px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>🌱</div>
              <div style={{ fontSize:13, color:T.dim }}>No milestones yet — keep touching grass.</div>
            </div>
          ) : (
            <>
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:18 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
                  Select Achievement
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:320, overflowY:"auto" }}>
                  {milestones.map(m => {
                    const meta = TYPE_META[m.milestone_type] ?? { emoji:"⭐", color:T.olive };
                    const isSel = selected?.id === m.id;
                    return (
                      <button key={m.id} className={`ms-btn ${isSel?"active":""}`}
                        onClick={() => { setSelected(m); setPreview(null); }}>
                        <span style={{ fontSize:18 }}>{meta.emoji}</span>
                        <span style={{ fontSize:13, fontWeight:600, color: isSel ? T.white : T.muted }}>
                          {m.milestone_label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button className="btn" onClick={generate} disabled={generating || !selected}
                style={{ width:"100%", background:T.olive, color:"#0e1108", marginBottom:20, opacity:generating?0.7:1 }}>
                {generating ? "Generating…" : "✦ Generate Card"}
              </button>

              {preview && (
                <div>
                  <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${T.borderGold}`,
                    boxShadow:"0 0 30px rgba(200,168,75,0.15)", marginBottom:16 }}>
                    <img src={preview} alt="Achievement card" style={{ width:"100%", display:"block" }} />
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