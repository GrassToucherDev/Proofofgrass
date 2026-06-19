import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

function getUsername() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("pog_username");
    return saved ? saved.replace(/@/g,"").toLowerCase().trim() : null;
  } catch { return null; }
}

// ─── Tool card config ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    key: "meme", icon: "😂", title: "Meme Tool",
    desc: "Create Touch Grass memes from editable templates.",
    href: "/create/meme", locked: false, badge: null,
  },
  {
    key: "pfp", icon: "🖼️", title: "PFP Tool",
    desc: "Upload your photo and add Touch Grass frames & overlays.",
    href: "/create/pfp", locked: false, badge: null,
  },
  {
    key: "flex", icon: "🔥", title: "Streak Flex Card",
    desc: "Generate a shareable card using your real streak data.",
    href: null, locked: false, badge: "Live Data", dynamic: "flex",
  },
  {
    key: "achievement", icon: "🏆", title: "Achievement Card",
    desc: "Generate a card for milestones and badges you've actually earned.",
    href: "/create/achievement", locked: false, badge: "Live Data",
  },
  {
    key: "spotlight", icon: "✦", title: "Spotlight Card",
    desc: "Only available to Community Spotlight winners.",
    href: null, locked: true, badge: "Spotlight Winners Only", dynamic: "spotlight",
  },
  {
    key: "cover", icon: "🌄", title: "Cover Showcase Card",
    desc: "Show off a Prestige Cover you've unlocked.",
    href: "/create/cover", locked: false, badge: "Live Data",
  },
  {
    key: "caption", icon: "✍️", title: "Caption Generator",
    desc: "Generate ready-to-post X captions for any occasion.",
    href: "/create/caption", locked: false, badge: null,
  },
  {
    key: "proof", icon: "🌿", title: "Proof ResultCard",
    desc: "Locked to daily proof submission. Can't be generated here.",
    href: "/", locked: true, badge: "Submit Proof", isProofLock: true,
  },
];

export default function CreateHub() {
  const [username, setUsername] = useState(null);
  const [hasSpotlight, setHasSpotlight] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    if (!u) { setLoading(false); return; }
    (async () => {
      const { count } = await supabase
        .from("CommunitySpotlights")
        .select("*", { count:"exact", head:true })
        .eq("username", u)
        .eq("status", "active");
      setHasSpotlight((count ?? 0) > 0);
      setLoading(false);
    })();
  }, []);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    .tool-card{
      background:${T.bg2}; border:1px solid ${T.border}; border-radius:16px;
      padding:24px; text-decoration:none; display:flex; flex-direction:column;
      gap:12px; transition:border-color 0.18s, transform 0.18s;
      position:relative; overflow:hidden;
    }
    .tool-card:hover:not(.locked){ border-color:${T.borderGold}; transform:translateY(-2px); }
    .tool-card.locked{ opacity:0.7; cursor:default; }
    .tools-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; }
    @media(max-width:640px){ .tools-grid{ grid-template-columns:1fr; } }
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
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:26,height:26,objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>
          <Link href="/" style={{ fontSize:11, color:T.olive, textDecoration:"none", letterSpacing:"0.06em" }}>← Dashboard</Link>
        </nav>

        {/* HERO */}
        <div style={{ padding:"48px clamp(14px,5vw,64px) 32px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.gold, textTransform:"uppercase", marginBottom:12, fontWeight:600 }}>
            Touch Grass
          </div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(36px,6vw,64px)",
            fontWeight:700, color:T.white, lineHeight:1, letterSpacing:"-0.02em", marginBottom:14 }}>
            Creator Hub
          </h1>
          <p style={{ fontSize:14, color:T.dim, fontWeight:300, maxWidth:520, lineHeight:1.7 }}>
            Memes, frames, flex cards, and captions for the Touch Grass community —
            built from your real Proof of Grass data, never faked.
          </p>
        </div>

        {/* TOOLS GRID */}
        <div style={{ padding:"36px clamp(14px,5vw,64px) 64px" }}>
          <div className="tools-grid">
            {TOOLS.map(tool => {
              const isSpotlightLocked = tool.key === "spotlight" && !hasSpotlight && !loading;
              const href = tool.dynamic === "flex" ? (username ? `/flex/${username}` : "/")
                : tool.dynamic === "spotlight" ? (hasSpotlight && username ? `/spotlight-card/${username}` : null)
                : tool.href;

              const cardLocked = tool.isProofLock || isSpotlightLocked || (tool.dynamic === "spotlight" && !href);

              const inner = (
                <>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:32 }}>{tool.icon}</span>
                    {tool.badge && (
                      <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.1em",
                        textTransform:"uppercase", padding:"3px 9px", borderRadius:5,
                        background: cardLocked ? "rgba(240,239,234,0.06)" : "rgba(200,168,75,0.12)",
                        color: cardLocked ? T.dim : T.gold,
                        border: `1px solid ${cardLocked ? T.border : T.borderGold}` }}>
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:21, fontWeight:700, color:T.white, marginBottom:6 }}>
                      {tool.title}
                    </div>
                    <div style={{ fontSize:12.5, color:T.dim, lineHeight:1.55 }}>
                      {tool.desc}
                    </div>
                  </div>
                  {cardLocked && tool.isProofLock && (
                    <div style={{ fontSize:11, color:T.olive, fontWeight:600, marginTop:4 }}>
                      Submit Proof →
                    </div>
                  )}
                  {isSpotlightLocked && (
                    <div style={{ fontSize:11, color:T.dim, fontWeight:600, marginTop:4 }}>
                      🔒 Win a spotlight to unlock
                    </div>
                  )}
                </>
              );

              if (cardLocked && !tool.isProofLock) {
                return <div key={tool.key} className="tool-card locked">{inner}</div>;
              }

              return (
                <Link key={tool.key} href={href ?? "#"} className="tool-card">
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}