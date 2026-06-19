import { useState } from "react";
import Link from "next/link";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const FOOTER = "\n\n$TOUCHGRASS #TouchGrass #ProofOfGrass\nhttps://proofofgrass.app";

const OCCASIONS = {
  daily_proof: {
    label: "Daily Proof", emoji: "🌿",
    templates: [
      (s) => `Day ${s.streak || "N"} of touching grass. Still going.${FOOTER}`,
      (s) => `Proof submitted. Streak intact. ${s.streak ? `Day ${s.streak}.` : ""}${FOOTER}`,
      (s) => `Logged off, went outside, came back stronger. ${s.streak ? `Day ${s.streak}.` : ""}${FOOTER}`,
      (s) => `Another day, another proof. The streak doesn't care about excuses.${FOOTER}`,
    ],
  },
  streak_milestone: {
    label: "Streak Milestone", emoji: "🔥",
    templates: [
      (s) => `Day ${s.streak || "N"}. The streak speaks for itself.${FOOTER}`,
      (s) => `Hit ${s.streak || "a new"} days outside. Consistency compounds.${FOOTER}`,
      (s) => `${s.streak || "N"} days in a row. This isn't a phase anymore.${FOOTER}`,
      (s) => `Milestone unlocked: Day ${s.streak || "N"}. Onward.${FOOTER}`,
    ],
  },
  meme: {
    label: "Meme", emoji: "😂",
    templates: [
      () => `screen toucher vs grass toucher. choose wisely.${FOOTER}`,
      () => `me explaining to my phone why I'm going outside for 10 minutes${FOOTER}`,
      () => `day 1 vs day 100. the grass remembers.${FOOTER}`,
      () => `nobody: ... me at 11:58pm sprinting outside to save my streak${FOOTER}`,
    ],
  },
  spotlight_win: {
    label: "Spotlight Win", emoji: "🏆",
    templates: [
      (s) => `Won ${s.category || "Community Spotlight"} this week. Honored.${FOOTER}`,
      (s) => `Community Spotlight: ${s.category || "Winner"}. The grass community shows up.${FOOTER}`,
      (s) => `Officially a Spotlight Winner. ${s.category || ""}.${FOOTER}`,
    ],
  },
  badge_unlock: {
    label: "Badge Unlock", emoji: "🎖️",
    templates: [
      (s) => `New badge unlocked: ${s.badge || "another one"}. Collecting them all.${FOOTER}`,
      (s) => `Badge earned. ${s.badge || ""} Proof of consistency.${FOOTER}`,
    ],
  },
  lucky_touch: {
    label: "Lucky Touch", emoji: "🍀",
    templates: [
      () => `Just got Lucky Touched. The grass blessed me today.${FOOTER}`,
      () => `Random reward, real grass. Lucky Touch hit different.${FOOTER}`,
      () => `Sun's Blessing. Didn't see that coming.${FOOTER}`,
    ],
  },
  referral: {
    label: "Referral", emoji: "🤝",
    templates: [
      (s) => `Brought someone new into the grass-touching club. ${s.count ? `${s.count} referrals and counting.` : ""}${FOOTER}`,
      () => `Touching grass is better with friends. Bring someone outside today.${FOOTER}`,
    ],
  },
  prestige_cover: {
    label: "Prestige Cover", emoji: "🌄",
    templates: [
      (s) => `Unlocked the ${s.cover || "next"} cover. The streak keeps paying off.${FOOTER}`,
      (s) => `New profile cover unlocked: ${s.cover || ""}. Earned, not given.${FOOTER}`,
    ],
  },
};

export default function CaptionGenerator() {
  const [occasion, setOccasion] = useState("daily_proof");
  const [streak, setStreak] = useState("");
  const [category, setCategory] = useState("");
  const [badge, setBadge] = useState("");
  const [cover, setCover] = useState("");
  const [count, setCount] = useState("");
  const [results, setResults] = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const generate = () => {
    const o = OCCASIONS[occasion];
    const ctx = { streak, category, badge, cover, count };
    setResults(o.templates.map(t => t(ctx)));
    setCopiedIdx(null);
  };

  const copy = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    input,select{font-family:'DM Sans',sans-serif;}
    .occ-btn{ background:${T.bg3}; border:1px solid ${T.border}; color:${T.dim};
      padding:10px 14px; border-radius:10px; cursor:pointer; font-size:12px; font-weight:600;
      display:flex; align-items:center; gap:7px; transition:all 0.15s; }
    .occ-btn.active{ background:rgba(147,168,90,0.12); border-color:${T.borderG}; color:${T.olive}; }
    .inp{ width:100%; background:${T.bg3}; border:1px solid ${T.border}; color:${T.white};
      padding:10px 12px; border-radius:8px; font-size:13px; outline:none; }
    .inp:focus{ border-color:${T.olive}; }
    .btn{ border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:700;
      font-size:13px; border-radius:10px; padding:13px 24px; }
    .occasions-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; }
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

        <div style={{ maxWidth:640, margin:"0 auto", padding:"36px clamp(14px,5vw,32px) 64px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>✍️</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(26px,5vw,38px)",
              fontWeight:700, color:T.white, marginBottom:6 }}>Caption Generator</h1>
            <p style={{ fontSize:12.5, color:T.dim }}>Ready-to-post captions for any Touch Grass moment.</p>
          </div>

          {/* Occasion selector */}
          <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
              Occasion
            </div>
            <div className="occasions-grid">
              {Object.entries(OCCASIONS).map(([key, o]) => (
                <button key={key} className={`occ-btn ${occasion===key?"active":""}`}
                  onClick={() => { setOccasion(key); setResults([]); }}>
                  <span>{o.emoji}</span> {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context inputs */}
          <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
              Details (optional — fills in the blanks)
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {occasion === "daily_proof" || occasion === "streak_milestone" ? (
                <input className="inp" placeholder="Streak day number (e.g. 42)" value={streak}
                  onChange={e => setStreak(e.target.value)} />
              ) : null}
              {occasion === "spotlight_win" && (
                <input className="inp" placeholder="Category (e.g. Longest Streak)" value={category}
                  onChange={e => setCategory(e.target.value)} />
              )}
              {occasion === "badge_unlock" && (
                <input className="inp" placeholder="Badge name" value={badge}
                  onChange={e => setBadge(e.target.value)} />
              )}
              {occasion === "prestige_cover" && (
                <input className="inp" placeholder="Cover name (e.g. Golden Hour)" value={cover}
                  onChange={e => setCover(e.target.value)} />
              )}
              {occasion === "referral" && (
                <input className="inp" placeholder="Referral count (optional)" value={count}
                  onChange={e => setCount(e.target.value)} />
              )}
              {!["daily_proof","streak_milestone","spotlight_win","badge_unlock","prestige_cover","referral"].includes(occasion) && (
                <div style={{ fontSize:12, color:T.dim, fontStyle:"italic" }}>No extra details needed for this occasion.</div>
              )}
            </div>
          </div>

          <button className="btn" onClick={generate}
            style={{ width:"100%", background:T.olive, color:"#0e1108", marginBottom:20 }}>
            ✦ Generate Captions
          </button>

          {/* Results */}
          {results.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {results.map((text, i) => (
                <div key={i} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:12.5, color:T.white, whiteSpace:"pre-wrap", lineHeight:1.6, marginBottom:12 }}>
                    {text}
                  </div>
                  <button className="btn" onClick={() => copy(text, i)}
                    style={{ background: copiedIdx===i ? "rgba(147,168,90,0.15)" : T.bg3,
                      color: copiedIdx===i ? T.olive : T.dim,
                      border:`1px solid ${copiedIdx===i ? T.borderG : T.border}`,
                      fontSize:11, padding:"7px 14px" }}>
                    {copiedIdx===i ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}