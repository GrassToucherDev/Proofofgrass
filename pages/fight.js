import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.4)", borderFire:"rgba(249,115,22,0.4)",
  olive:"#93a85a", gold:"#c8a84b", fire:"#f97316", amber:"#f59e0b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const TIERS = [
  { min:250, label:"Grass Jab — Legend",   slug:"grass-jab-legend",   emoji:"🥊", color:"#e879f9", glow:"rgba(232,121,249,0.3)" },
  { min:100, label:"Grass Jab — Platinum", slug:"grass-jab-platinum", emoji:"🥊", color:"#67e8f9", glow:"rgba(103,232,249,0.3)" },
  { min:50,  label:"Grass Jab — Gold",     slug:"grass-jab-gold",     emoji:"🥊", color:T.gold,    glow:"rgba(200,168,75,0.3)"  },
  { min:25,  label:"Grass Jab — Silver",   slug:"grass-jab-silver",   emoji:"🥊", color:"#cbd5e1", glow:"rgba(203,213,225,0.2)" },
  { min:10,  label:"Grass Jab — Bronze",   slug:"grass-jab-bronze",   emoji:"🥊", color:"#cd7f32", glow:"rgba(205,127,50,0.3)"  },
];

function getTier(punches) {
  return TIERS.find(t => punches >= t.min) || null;
}

function getPoints(punches) {
  return Math.floor(punches / 10) * 100;
}

function getUsername() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim() || "";
}

export default function FightPage() {
  const [username,     setUsername]     = useState("");
  const [xUsername,    setXUsername]    = useState("");
  const [punchCount,   setPunchCount]   = useState("");
  const [screenshot,   setScreenshot]   = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [status,       setStatus]       = useState(null); // null | loading | success | error
  const [errMsg,       setErrMsg]       = useState("");
  const [submissions,  setSubmissions]  = useState([]);
  const [stats,        setStats]        = useState(null);
  const [dragging,     setDragging]     = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    if (u) { loadStats(u); loadSubmissions(u); }
  }, []);

  const loadStats = async (u) => {
    const { data } = await supabase
      .from("FightClubStats")
      .select("*")
      .eq("username", u)
      .maybeSingle();
    setStats(data);
  };

  const loadSubmissions = async (u) => {
    const { data } = await supabase
      .from("FightClubSubmissions")
      .select("id,punch_count,status,points_granted,created_at,reviewed_at")
      .eq("username", u)
      .order("created_at", { ascending: false });
    setSubmissions(data || []);
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setScreenshot(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!username) { setErrMsg("Enter your username on the dashboard first."); setStatus("error"); return; }
    if (!xUsername.trim()) { setErrMsg("Enter your X username."); setStatus("error"); return; }
    const punches = parseInt(punchCount, 10);
    if (!punches || punches < 1) { setErrMsg("Enter a valid punch count."); setStatus("error"); return; }
    if (!screenshot) { setErrMsg("Upload a screenshot showing your punch count."); setStatus("error"); return; }

    setStatus("loading"); setErrMsg("");

    try {
      // Upload screenshot to Supabase Storage
      const ext  = screenshot.name.split(".").pop();
      const path = `${username}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("fight-club-screenshots")
        .upload(path, screenshot, { contentType: screenshot.type, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("fight-club-screenshots")
        .getPublicUrl(path);

      // Insert submission
      const { error: insertErr } = await supabase
        .from("FightClubSubmissions")
        .insert({
          username:       username,
          x_username:     xUsername.trim().replace(/@/g,""),
          punch_count:    punches,
          screenshot_url: urlData.publicUrl,
          status:         "pending",
        });
      if (insertErr) throw insertErr;

      setStatus("success");
      setXUsername(""); setPunchCount(""); setScreenshot(null); setPreviewUrl(null);
      loadSubmissions(username);
    } catch(e) {
      setErrMsg(e.message || "Submission failed. Try again.");
      setStatus("error");
    }
  };

  const tier     = stats ? getTier(stats.total_punches) : null;
  const points   = parseInt(punchCount, 10) || 0;
  const previewTier   = getTier(points);
  const previewPoints = getPoints(points);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
    .fade{animation:fadeUp 0.5s ease both;}
    input,textarea{font-family:'DM Sans',sans-serif;}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center",
            gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt=""
              style={{ width:24, height:24, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:16, fontWeight:700, color:T.white }}>Touch Grass</span>
          </Link>
          <Link href="/" style={{ fontSize:12, color:T.dim, textDecoration:"none" }}>
            ← Dashboard
          </Link>
        </nav>

        {/* HERO */}
        <section style={{ position:"relative", padding:"64px clamp(14px,5vw,64px) 56px",
          background:"linear-gradient(160deg,#0a0a06,#120e06 40%,#080a06)",
          borderBottom:`1px solid ${T.border}`, overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none",
            backgroundImage:"radial-gradient(ellipse at 60% 50%,rgba(249,115,22,0.08),transparent 60%),radial-gradient(ellipse at 20% 80%,rgba(147,168,90,0.06),transparent 55%)" }} />
          <div style={{ position:"relative", maxWidth:640, margin:"0 auto", textAlign:"center" }}
            className="fade">
            <div style={{ fontSize:10, letterSpacing:"0.22em", textTransform:"uppercase",
              color:T.fire, fontWeight:600, marginBottom:14 }}>Crypto Fight Club × Touch Grass</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:"clamp(36px,6vw,68px)", fontWeight:700, color:T.white,
              lineHeight:1, letterSpacing:"-0.02em", marginBottom:16 }}>
              🥊 Grass Jab
            </h1>
            <p style={{ fontSize:"clamp(13px,1.8vw,15px)", color:T.muted,
              lineHeight:1.7, maxWidth:480, margin:"0 auto 28px", fontWeight:300 }}>
              Threw punches for Touch Grass on Crypto Fight Club?
              Submit your screenshot, get your badge, and earn Grass Score for every punch.
            </p>
            <a href="https://fight.cryptofightclub.wtf" target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:8,
                background:`linear-gradient(135deg,${T.fire},#c2410c)`,
                color:"#fff", border:"none", borderRadius:10,
                padding:"13px 26px", fontSize:13, fontWeight:700,
                textDecoration:"none", letterSpacing:"0.04em" }}>
              🥊 Throw Punches First →
            </a>
          </div>
        </section>

        <div style={{ maxWidth:680, margin:"0 auto",
          padding:"48px clamp(14px,5vw,32px) 80px" }}>

          {/* TIER LADDER */}
          <section style={{ marginBottom:48 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
              textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
              Badge Tiers
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {TIERS.slice().reverse().map(t => (
                <div key={t.slug} style={{ display:"flex", alignItems:"center",
                  gap:14, padding:"12px 16px",
                  background: tier?.slug === t.slug ? `${t.color}12` : T.bg2,
                  border:`1px solid ${tier?.slug===t.slug ? t.color+"60" : T.border}`,
                  borderRadius:10 }}>
                  <span style={{ fontSize:22 }}>{t.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:t.color }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize:11, color:T.dim }}>
                      {t.min}+ punches · {getPoints(t.min)}+ Grass Score
                    </div>
                  </div>
                  {tier?.slug === t.slug && (
                    <span style={{ fontSize:10, fontWeight:700,
                      color:t.color, letterSpacing:"0.08em" }}>YOUR TIER</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* YOUR STATS */}
          {stats && (
            <section style={{ marginBottom:48 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.dim, marginBottom:14 }}>
                Your Stats
              </div>
              <div style={{ background:`linear-gradient(145deg,${T.bg2},${T.bg3})`,
                border:`1px solid ${tier ? tier.color+"50" : T.borderGold}`,
                borderRadius:16, padding:"20px 24px",
                boxShadow: tier ? `0 0 30px ${tier.glow}` : "none",
                display:"flex", gap:28, flexWrap:"wrap" }}>
                {[
                  ["Total Punches", stats.total_punches, T.fire],
                  ["Grass Score Earned", stats.total_points, T.olive],
                  ["Current Tier", tier ? tier.label : "None yet", tier?.color || T.dim],
                ].map(([label, val, col]) => (
                  <div key={label}>
                    <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                      fontSize:26, fontWeight:700, color:col, lineHeight:1 }}>{val}</div>
                    <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase",
                      letterSpacing:"0.08em", marginTop:4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SUBMISSION FORM */}
          <section style={{ marginBottom:48 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
              textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
              Submit Your Punches
            </div>

            {status === "success" ? (
              <div style={{ background:"rgba(147,168,90,0.06)",
                border:`1px solid ${T.borderG}`, borderRadius:14,
                padding:"32px 24px", textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.olive, marginBottom:8 }}>
                  Submission received!
                </div>
                <div style={{ fontSize:13, color:T.muted, lineHeight:1.6, marginBottom:20 }}>
                  An admin will review your screenshot and approve your badge and Grass Score.
                  Check back here to see your updated stats.
                </div>
                <button onClick={() => setStatus(null)}
                  style={{ background:T.bg3, border:`1px solid ${T.border}`,
                    color:T.dim, borderRadius:9, padding:"10px 24px",
                    fontSize:13, cursor:"pointer" }}>
                  Submit Another
                </button>
              </div>
            ) : (
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
                borderRadius:14, padding:"24px 20px",
                display:"flex", flexDirection:"column", gap:14 }}>

                {/* Username (read-only) */}
                <div>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:5 }}>
                    Your Touch Grass Username
                  </div>
                  <input value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="your username"
                    style={{ width:"100%", background:"rgba(0,0,0,0.3)",
                      border:`1px solid ${T.border}`, borderRadius:8,
                      padding:"10px 12px", color:T.white, fontSize:13,
                      outline:"none", boxSizing:"border-box" }} />
                </div>

                {/* X Username */}
                <div>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:5 }}>
                    Your X (Twitter) Username
                  </div>
                  <input value={xUsername}
                    onChange={e => setXUsername(e.target.value)}
                    placeholder="@yourhandle"
                    style={{ width:"100%", background:"rgba(0,0,0,0.3)",
                      border:`1px solid ${T.border}`, borderRadius:8,
                      padding:"10px 12px", color:T.white, fontSize:13,
                      outline:"none", boxSizing:"border-box" }} />
                </div>

                {/* Punch Count */}
                <div>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:5 }}>
                    Number of Punches Thrown
                  </div>
                  <input type="number" min="1" value={punchCount}
                    onChange={e => setPunchCount(e.target.value)}
                    placeholder="e.g. 47"
                    style={{ width:"100%", background:"rgba(0,0,0,0.3)",
                      border:`1px solid ${T.border}`, borderRadius:8,
                      padding:"10px 12px", color:T.white, fontSize:13,
                      outline:"none", boxSizing:"border-box" }} />

                  {/* Live preview */}
                  {points >= 10 && (
                    <div style={{ marginTop:8, padding:"10px 12px",
                      background: previewTier ? `${previewTier.color}10` : T.bg3,
                      border:`1px solid ${previewTier ? previewTier.color+"40" : T.border}`,
                      borderRadius:8, display:"flex", alignItems:"center",
                      gap:10, flexWrap:"wrap" }}>
                      <span style={{ fontSize:16 }}>🥊</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700,
                          color: previewTier?.color || T.dim }}>
                          {previewTier ? previewTier.label : "Keep going — 10 punches minimum"}
                        </div>
                        <div style={{ fontSize:11, color:T.dim }}>
                          +{previewPoints} Grass Score if approved
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Screenshot upload */}
                <div>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:5 }}>
                    Screenshot showing your punch count
                  </div>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{ border:`1.5px dashed ${dragging ? T.fire : T.border}`,
                      borderRadius:10, padding:"28px 20px", textAlign:"center",
                      cursor:"pointer", background: dragging ? "rgba(249,115,22,0.04)" : T.bg3,
                      transition:"all 0.2s" }}>
                    {previewUrl ? (
                      <img src={previewUrl} alt="preview"
                        style={{ maxWidth:"100%", maxHeight:220,
                          borderRadius:8, objectFit:"contain" }} />
                    ) : (
                      <>
                        <div style={{ fontSize:28, marginBottom:8, opacity:0.4 }}>📸</div>
                        <div style={{ fontSize:12, color:T.muted }}>
                          Drag & drop or tap to upload
                        </div>
                        <div style={{ fontSize:10, color:T.dim, marginTop:4 }}>
                          PNG, JPG, WEBP
                        </div>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*"
                    style={{ display:"none" }}
                    onChange={e => handleFile(e.target.files[0])} />
                  {previewUrl && (
                    <button onClick={() => { setScreenshot(null); setPreviewUrl(null); }}
                      style={{ marginTop:6, fontSize:10, color:T.dim,
                        background:"none", border:"none", cursor:"pointer",
                        textDecoration:"underline" }}>
                      Remove image
                    </button>
                  )}
                </div>

                {errMsg && (
                  <div style={{ fontSize:11, color:"#ef4444" }}>{errMsg}</div>
                )}

                <button onClick={handleSubmit} disabled={status==="loading"}
                  style={{ background:`linear-gradient(135deg,${T.fire},#c2410c)`,
                    color:"#fff", border:"none", borderRadius:10,
                    padding:"13px", fontSize:13, fontWeight:700,
                    cursor:"pointer", opacity:status==="loading"?0.7:1 }}>
                  {status==="loading" ? "Submitting…" : "🥊 Submit for Review"}
                </button>

                <div style={{ fontSize:10, color:T.dim, textAlign:"center",
                  lineHeight:1.5 }}>
                  Screenshots are reviewed by an admin before badges and points are issued.
                </div>
              </div>
            )}
          </section>

          {/* SUBMISSION HISTORY */}
          {submissions.length > 0 && (
            <section>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.dim, marginBottom:14 }}>
                Your Submissions
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {submissions.map((s,i) => (
                  <div key={i} style={{ background:T.bg2,
                    border:`1px solid ${T.border}`, borderRadius:10,
                    padding:"12px 16px", display:"flex",
                    alignItems:"center", gap:12, flexWrap:"wrap" }}>
                    <span style={{ fontSize:20 }}>🥊</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center",
                        gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontSize:13, fontWeight:600,
                          color:T.white }}>{s.punch_count} punches</span>
                        <span style={{ fontSize:10, fontFamily:"monospace",
                          padding:"1px 7px", borderRadius:20,
                          color: s.status==="approved"?T.olive:s.status==="rejected"?"#ef4444":T.amber,
                          background: s.status==="approved"?"rgba(147,168,90,0.12)":s.status==="rejected"?"rgba(239,68,68,0.1)":"rgba(245,158,11,0.1)" }}>
                          {s.status==="approved"?"✓ Approved":s.status==="rejected"?"✕ Rejected":"⏳ Pending"}
                        </span>
                        {s.points_granted > 0 && (
                          <span style={{ fontSize:11, color:T.olive }}>
                            +{s.points_granted} pts
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:10, color:T.dim, marginTop:2 }}>
                        {new Date(s.created_at).toLocaleDateString("en-US",
                          { month:"short", day:"numeric", year:"numeric" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
}