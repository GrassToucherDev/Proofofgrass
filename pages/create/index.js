import { useState, useEffect } from "react";
import Link from "next/link";
import CreateShell from "../../components/CreateShell";
import { T, CARD_SHADOW } from "../../utils/createTheme";
import { supabase } from "../../utils/supabase";
import Ico from "../../components/Ico";
import { currentTheme, COMMUNITY_LISTED } from "../../utils/createCommunity";


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
    key: "community", icon: "group", title: "Community Creations",
    desc: "See what players are making, like your favorites, and post your own.",
    href: "/create/community", locked: false, badge: "New",
  },
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
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'Nunito',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    .tool-card{
      background:${T.bg2}; border:1px solid ${T.border}; border-radius:16px;
      padding:24px; text-decoration:none; display:flex; flex-direction:column; box-shadow:${CARD_SHADOW};
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
      <CreateShell title="Creator Hub" back={false}>

        {/* HERO */}
        <div style={{ padding:"28px clamp(14px,5vw,64px) 28px", display:"flex", alignItems:"center", gap:16, justifyContent:"space-between" }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.gold, textTransform:"uppercase", marginBottom:10, fontWeight:800 }}>
              Touch Grass
            </div>
            <h1 style={{ fontFamily:"'Fredoka',system-ui,sans-serif", fontSize:"clamp(34px,6vw,60px)",
              fontWeight:700, color:T.white, lineHeight:1, letterSpacing:"-0.02em", marginBottom:12 }}>
              Creator Hub
            </h1>
            <p style={{ fontSize:14, color:T.muted, fontWeight:600, maxWidth:520, lineHeight:1.6 }}>
              Memes, frames, flex cards, and captions for the Touch Grass community, built from your real Proof of Grass data, never faked.
            </p>
          </div>
          <img src="/mascot/wago-celebrate.webp" alt="" width={120} height={120}
            style={{ width:"clamp(84px,22vw,140px)", height:"auto", objectFit:"contain", flexShrink:0 }} />
        </div>

        {/* WEEKLY THEME */}
        {COMMUNITY_LISTED && (() => { const th = currentTheme(); return (
          <div style={{ margin:"28px clamp(14px,5vw,64px) 0", padding:"16px 18px", borderRadius:14,
            background:"rgba(200,168,75,0.07)", border:`1px solid ${T.borderGold}`,
            display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>
            <Ico n="sparkle" size={30} style={{ margin:0 }} />
            <div style={{ flex:"1 1 220px", minWidth:0 }}>
              <div style={{ fontSize:10, letterSpacing:"0.16em", color:T.gold, textTransform:"uppercase", fontWeight:800 }}>This week's theme</div>
              <div style={{ fontFamily:"'Fredoka',system-ui,sans-serif", fontSize:21, fontWeight:700, color:T.white, margin:"2px 0" }}>{th.title}</div>
              <div style={{ fontSize:12.5, color:T.muted, lineHeight:1.5 }}>{th.hint}</div>
            </div>
            <Link href="/create/community" style={{ fontSize:13, fontWeight:700, color:T.olive, textDecoration:"none",
              border:`1px solid ${T.borderG}`, borderRadius:999, padding:"8px 14px" }}>See what's posted →</Link>
          </div>); })()}

        {/* TOOLS GRID */}
        <div style={{ padding:"36px clamp(14px,5vw,64px) 64px" }}>
          <div className="tools-grid">
            {TOOLS.map(tool => {
              if (tool.key === "community" && !COMMUNITY_LISTED) return null;
              const isSpotlightLocked = tool.key === "spotlight" && !hasSpotlight && !loading;
              const href = tool.dynamic === "flex" ? (username ? `/flex/${username}` : "/")
                : tool.dynamic === "spotlight" ? (hasSpotlight && username ? `/spotlight-card/${username}` : null)
                : tool.href;

              const cardLocked = tool.isProofLock || isSpotlightLocked || (tool.dynamic === "spotlight" && !href);

              const inner = (
                <>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <Ico n={tool.icon} size={36} style={{ margin:0 }} />
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
                    <div style={{ fontFamily:"'Fredoka',system-ui,sans-serif", fontSize:21, fontWeight:700, color:T.white, marginBottom:6 }}>
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
      </CreateShell>
    </>
  );
}