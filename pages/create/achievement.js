import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import CreateShell from "../../components/CreateShell";
import { T, CARD_SHADOW } from "../../utils/createTheme";
import { supabase } from "../../utils/supabase";
import { BRAND, ensureFonts, drawScene, drawPanel, drawImage, loadImg, drawFooter, MASCOT } from "../../utils/createCards";
import Ico from "../../components/Ico";


const TYPE_META = {
  streak:      { icon:"flame",     color:"#e8742a" },
  grass_score: { icon:"bolt",      color:"#3d7a12" },
  proof_count: { icon:"leaf",      color:"#3d7a12" },
  referral:    { icon:"handshake", color:"#b8760a" },
  spotlight:   { icon:"spotlight", color:"#b8760a" },
  lucky_touch: { icon:"clover",    color:"#2f9e5b" },
};

async function generateAchievementCard({ milestone, username, avatarUrl }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  await ensureFonts();
  const meta = TYPE_META[milestone.milestone_type] ?? { icon:"sparkle", color:"#3d7a12" };
  drawScene(ctx, W, H, "day", 0.84);
  drawPanel(ctx, 80, 70, W - 160, 830, 44);
  ctx.textAlign = "center";

  ctx.font = "800 22px 'Nunito',sans-serif"; ctx.fillStyle = BRAND.dark; ctx.letterSpacing = "0.22em";
  ctx.fillText("PROOF OF GRASS", W/2, 135);
  ctx.font = "800 18px 'Nunito',sans-serif"; ctx.fillStyle = BRAND.gold; ctx.letterSpacing = "0.26em";
  ctx.fillText("ACHIEVEMENT UNLOCKED", W/2, 168); ctx.letterSpacing = "0px";

  await drawImage(ctx, `/icons3d/${meta.icon}.webp`, W/2, 440, 250);

  let hasAvatar = false;
  if (avatarUrl) {
    const img = await loadImg(avatarUrl);
    if (img) {
      const r = 54, cy = 520;
      ctx.save(); ctx.beginPath(); ctx.arc(W/2, cy, r, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(img, W/2 - r, cy - r, r*2, r*2); ctx.restore();
      ctx.beginPath(); ctx.arc(W/2, cy, r + 3, 0, Math.PI*2); ctx.strokeStyle = meta.color; ctx.lineWidth = 5; ctx.stroke();
      hasAvatar = true;
    }
  }
  const labelY = hasAvatar ? 650 : 590;
  let fontSize = 72;
  ctx.font = `700 ${fontSize}px 'Fredoka',system-ui,sans-serif`;
  while (ctx.measureText(milestone.milestone_label).width > 780 && fontSize > 36) { fontSize -= 4; ctx.font = `700 ${fontSize}px 'Fredoka',system-ui,sans-serif`; }
  ctx.fillStyle = BRAND.forest; ctx.fillText(milestone.milestone_label, W/2, labelY);
  ctx.font = "800 30px 'Nunito',sans-serif"; ctx.fillStyle = meta.color; ctx.fillText(`@${username}`, W/2, labelY + 56);

  await drawImage(ctx, MASCOT("celebrate"), W - 190, H - 120, 270);
  drawFooter(ctx, W, H, "rgba(255,255,255,0.95)", H - 36);
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
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'Nunito',sans-serif;}
    .ms-btn{ background:${T.bg3}; border:1px solid ${T.border}; padding:12px 14px;
      border-radius:10px; cursor:pointer; text-align:left; transition:all 0.15s; width:100%;
      display:flex; align-items:center; gap:10px; }
    .ms-btn.active{ background:rgba(125,200,50,0.16); border-color:${T.borderG}; }
    .btn{ border:none; cursor:pointer; font-family:'Nunito',sans-serif; font-weight:700;
      font-size:13px; border-radius:10px; padding:13px 24px; }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <CreateShell title="Achievement Card">

        <div style={{ maxWidth:560, margin:"0 auto", padding:"32px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <img src="/mascot/wago-celebrate.webp" alt="" width={88} height={88} style={{ width:88, height:88, objectFit:"contain", marginBottom:6 }} />
            <h1 style={{ fontFamily:"'Fredoka',system-ui,sans-serif", fontSize:"clamp(26px,5vw,38px)",
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
                style={{ width:"100%", background:T.olive, color:"#fff", marginBottom:20, opacity:generating?0.7:1 }}>
                {generating ? "Generating…" : "Generate Card"}
              </button>

              {preview && (
                <div>
                  <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${T.borderGold}`,
                    boxShadow:"0 0 30px rgba(200,168,75,0.15)", marginBottom:16 }}>
                    <img src={preview} alt="Achievement card" style={{ width:"100%", display:"block" }} />
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