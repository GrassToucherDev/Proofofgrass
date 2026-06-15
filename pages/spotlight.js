import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";
import { SPOTLIGHT_BADGES, getSpotlightBadge } from "../utils/spotlightBadges";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710", bg4:"#1a1e13",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

// ─── Category config — uses SPOTLIGHT_BADGES as single source of truth ────────
const CATEGORIES = Object.values(SPOTLIGHT_BADGES).map(b => ({
  key:   b.key,
  emoji: b.emoji,
  name:  b.title,
  label: b.title,
  color: b.color,
  image: b.image,
}));

function getCat(key) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[0];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function fmtWeek(start, end) {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end   + "T00:00:00Z");
  const opts = { month:"short", day:"numeric", timeZone:"UTC" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year:"numeric" })}`;
}
function isThisWeek(week_start) {
  return getMondayOf(new Date().toISOString().slice(0,10)) === week_start;
}

// ─── Avatar component ─────────────────────────────────────────────────────────
function SpotlightAvatar({ winner, size = 64, color = T.gold }) {
  const url = winner?.avatar_url || winner?.profile_avatar_url;
  const initial = (winner?.username ?? "?")[0].toUpperCase();
  return url ? (
    <img src={url} alt="" loading="lazy"
      style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover",
        border:`2px solid ${color}`, flexShrink:0, background:T.bg3 }} />
  ) : (
    <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:T.bg3, border:`2px solid ${color}`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:size*0.38,
      fontWeight:700, color }}>
      {initial}
    </div>
  );
}

// ─── Winner card (large, for spotlight page) ──────────────────────────────────
function WinnerCard({ winner, current, viewer }) {
  const cat = getCat(winner?.category);
  const empty = !winner;
  return (
    <div style={{
      background: empty ? T.bg2 : `linear-gradient(145deg,${T.bg2},${T.bg3})`,
      border:`1px solid ${empty ? T.border : T.borderGold}`,
      borderRadius:16,
      padding:"24px 20px",
      display:"flex", flexDirection:"column", gap:14,
      boxShadow: empty ? "none" : `0 0 28px rgba(200,168,75,0.12)`,
      position:"relative", overflow:"hidden",
    }}>
      {!empty && (
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
          background:`linear-gradient(90deg,transparent,${cat.color},transparent)`,
          opacity:0.7 }} />
      )}

      {/* Badge image + category header */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {cat.image ? (
          <img src={cat.image} alt={cat.name}
            style={{ width:40, height:40, objectFit:"contain", flexShrink:0,
              filter:`drop-shadow(0 0 8px ${cat.color}60)`,
              opacity: empty ? 0.35 : 1 }} />
        ) : (
          <span style={{ fontSize:20 }}>{cat.emoji}</span>
        )}
        <div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em",
            textTransform:"uppercase", color:cat.color }}>{cat.name}</div>
          {current && (
            <div style={{ fontSize:8, color:T.dim, letterSpacing:"0.1em",
              textTransform:"uppercase" }}>This Week</div>
          )}
        </div>
        {!empty && (
          <span style={{ marginLeft:"auto", fontSize:9, fontWeight:700,
            letterSpacing:"0.1em", textTransform:"uppercase",
            padding:"2px 8px", borderRadius:4,
            background:"rgba(200,168,75,0.12)", color:T.gold,
            border:`1px solid ${T.borderGold}` }}>
            ✦ Winner
          </span>
        )}
      </div>

      {/* Winner info or placeholder */}
      {empty ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
          gap:8, padding:"16px 0", opacity:0.4 }}>
          <span style={{ fontSize:32 }}>🏆</span>
          <span style={{ fontSize:12, color:T.dim }}>No Winner Yet</span>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <SpotlightAvatar winner={winner} size={56} color={cat.color} />
            <div style={{ minWidth:0 }}>
              <Link href={`/u/${winner.username}`}
                style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:20, fontWeight:700, color:T.white, textDecoration:"none",
                  display:"block", overflow:"hidden", textOverflow:"ellipsis",
                  whiteSpace:"nowrap" }}
                onMouseEnter={e => e.currentTarget.style.color = T.gold}
                onMouseLeave={e => e.currentTarget.style.color = T.white}>
                @{winner.display_name || winner.username}
              </Link>
              <div style={{ fontSize:11, color:cat.color, fontWeight:600, marginTop:2 }}>
                {cat.label}
              </div>
            </div>
          </div>

          {winner.description && (
            <div style={{ fontSize:12, color:T.muted, lineHeight:1.6,
              borderLeft:`2px solid ${cat.color}40`, paddingLeft:12 }}>
              {winner.description}
            </div>
          )}

          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            {winner.x_link && (
              <a href={winner.x_link} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:10, color:T.dim, textDecoration:"none",
                  padding:"4px 10px", borderRadius:6, border:`1px solid ${T.border}`,
                  transition:"color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = T.white}
                onMouseLeave={e => e.currentTarget.style.color = T.dim}>
                𝕏 View Post
              </a>
            )}
            {winner.proof_link && (
              <a href={winner.proof_link} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:10, color:T.dim, textDecoration:"none",
                  padding:"4px 10px", borderRadius:6, border:`1px solid ${T.border}` }}>
                🔗 Proof
              </a>
            )}
            {/* Generate Spotlight Card — only shown to the winner themselves */}
            {viewer && viewer === winner.username && (
              <a href={`/spotlight-card/${winner.username}`}
                style={{ fontSize:10, fontWeight:700, color:T.gold,
                  textDecoration:"none", padding:"4px 10px", borderRadius:6,
                  background:"rgba(200,168,75,0.1)",
                  border:`1px solid rgba(200,168,75,0.35)`,
                  marginLeft:"auto" }}>
                🏆 Generate Spotlight Card
              </a>
            )}
            {(!viewer || viewer !== winner.username) && winner.week_start && (
              <span style={{ fontSize:10, color:T.dim, marginLeft:"auto" }}>
                {fmtWeek(winner.week_start, winner.week_end)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SpotlightPage() {
  const [currentWinners, setCurrentWinners] = useState([]);
  const [pastWinners,    setPastWinners]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [viewer,         setViewer]         = useState(null); // logged-in username

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pog_username");
      if (saved) setViewer(saved.replace(/@/g,"").toLowerCase().trim());
    }
  }, []);

  useEffect(() => {
    (async () => {
      const thisMonday = getMondayOf(new Date().toISOString().slice(0,10));

      // Fetch all spotlights + profile avatars in parallel
      const { data: spotlights } = await supabase
        .from("CommunitySpotlights")
        .select("*")
        .eq("status", "active")
        .order("week_start", { ascending: false });

      if (!spotlights?.length) { setLoading(false); return; }

      // Fetch profile avatars for all winners
      const usernames = [...new Set(spotlights.map(s => s.username))];
      const { data: profiles } = await supabase
        .from("Profiles")
        .select("username, avatar_url")
        .in("username", usernames);

      const avatarMap = Object.fromEntries((profiles ?? []).map(p => [p.username, p.avatar_url]));

      // Merge avatar: admin override > profile avatar > null
      const enriched = spotlights.map(s => ({
        ...s,
        profile_avatar_url: avatarMap[s.username] ?? null,
        // s.avatar_url = admin override, profile_avatar_url = from Profiles
      }));

      setCurrentWinners(enriched.filter(s => s.week_start === thisMonday));
      setPastWinners(enriched.filter(s => s.week_start !== thisMonday));
      setLoading(false);
    })();
  }, []);

  // Build a map of current winners by category for the 4-card grid
  const currentMap = Object.fromEntries(currentWinners.map(w => [w.category, w]));

  // Group past winners by week
  const pastByWeek = pastWinners.reduce((acc, w) => {
    const key = w.week_start;
    if (!acc[key]) acc[key] = { week_start: w.week_start, week_end: w.week_end, winners: [] };
    acc[key].winners.push(w);
    return acc;
  }, {});
  const pastWeeks = Object.values(pastByWeek).sort((a,b) => b.week_start.localeCompare(a.week_start));

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    .nav-links{display:flex;gap:24px;align-items:center;}
    @media(max-width:640px){
      .nav-links{display:none!important;}
      .winner-grid{grid-template-columns:1fr!important;}
      .past-grid{grid-template-columns:1fr 1fr!important;}
    }
    @media(max-width:400px){
      .past-grid{grid-template-columns:1fr!important;}
    }
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
          borderBottom:`1px solid ${T.border}`, gap:12 }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9,
            textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt=""
              style={{ width:26, height:26, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>
          <div className="nav-links">
            <Link href="/"           style={{ fontSize:13, color:T.dim, textDecoration:"none" }}>Dashboard</Link>
            <Link href="/leaderboard" style={{ fontSize:13, color:T.dim, textDecoration:"none" }}>Leaderboard</Link>
            <span style={{ fontSize:13, color:T.gold, fontWeight:600 }}>Spotlight</span>
          </div>
          <Link href="/" style={{ fontSize:11, color:T.olive, textDecoration:"none",
            letterSpacing:"0.06em", flexShrink:0, whiteSpace:"nowrap" }}>← Back</Link>
        </nav>

        {/* HERO */}
        <div style={{ padding:"48px clamp(14px,5vw,64px) 32px",
          borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.gold,
            textTransform:"uppercase", marginBottom:12, fontWeight:600 }}>Community</div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:"clamp(36px,6vw,72px)", fontWeight:700, color:T.white,
            lineHeight:1, letterSpacing:"-0.02em", marginBottom:12 }}>
            Community<br />Spotlight
          </h1>
          <p style={{ fontSize:14, color:T.dim, fontWeight:300,
            maxWidth:440, lineHeight:1.7 }}>
            Every week we celebrate the standout members of the Touch Grass community.
          </p>
        </div>

        <div style={{ padding:"36px clamp(14px,5vw,64px)" }}>

          {/* CURRENT WEEK */}
          <div style={{ marginBottom:48 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:24, fontWeight:700, color:T.white }}>
                This Week's Winners
              </h2>
              {currentWinners.length > 0 && (
                <span style={{ fontSize:10, color:T.dim }}>
                  {fmtWeek(currentWinners[0].week_start, currentWinners[0].week_end)}
                </span>
              )}
            </div>

            {loading ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",
                gap:16 }} className="winner-grid">
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ height:200, borderRadius:16, background:T.bg2,
                    border:`1px solid ${T.border}`, opacity:0.5 }} />
                ))}
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",
                gap:16 }} className="winner-grid">
                {CATEGORIES.map(cat => (
                  <WinnerCard key={cat.key}
                    winner={currentMap[cat.key] ?? null}
                    current={true}
                    viewer={viewer} />
                ))}
              </div>
            )}
          </div>

          {/* HOW WINNERS ARE CHOSEN */}
          <div style={{ background:T.bg2, border:`1px solid ${T.borderG}`, borderRadius:16,
            padding:"28px 24px", marginBottom:48 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:20,
              fontWeight:700, color:T.white, marginBottom:16 }}>How Winners Are Chosen</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
              gap:16 }}>
              {CATEGORIES.map(cat => (
                <div key={cat.key} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{cat.emoji}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:cat.color,
                      marginBottom:4 }}>{cat.name}</div>
                    <div style={{ fontSize:11, color:T.dim, lineHeight:1.5 }}>
                      {cat.key === "longest_streak" && "The community member with the highest active streak that week."}
                      {cat.key === "meme_lord"      && "Best meme, recap, or creative content related to Touch Grass."}
                      {cat.key === "biggest_shiller" && "Most active community builder, referrer, or promoter."}
                      {cat.key === "space_warrior"   && "Most active participant in Touch Grass Twitter Spaces."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PAST WINNERS */}
          {pastWeeks.length > 0 && (
            <div>
              <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:24,
                fontWeight:700, color:T.white, marginBottom:20 }}>Previous Winners</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
                {pastWeeks.map(week => (
                  <div key={week.week_start}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em",
                      textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
                      {fmtWeek(week.week_start, week.week_end)}
                    </div>
                    <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
                      gap:12 }} className="past-grid">
                      {week.winners.map(w => {
                        const cat = getCat(w.category);
                        const avatarUrl = w.avatar_url || w.profile_avatar_url;
                        const pastBadge = getSpotlightBadge(w.category);
                        return (
                          <Link key={w.id} href={`/u/${w.username}`}
                            style={{ textDecoration:"none",
                              background:T.bg2, border:`1px solid ${T.border}`,
                              borderRadius:12, padding:"14px 16px",
                              display:"flex", alignItems:"center", gap:10,
                              transition:"border-color 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = T.borderGold}
                            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                            {/* Badge image */}
                            {pastBadge?.image && (
                              <img src={pastBadge.image} alt={pastBadge.title} loading="lazy"
                                style={{ width:32, height:32, objectFit:"contain", flexShrink:0,
                                  filter:`drop-shadow(0 0 5px ${cat.color}50)` }} />
                            )}
                            {/* Avatar */}
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" loading="lazy"
                                style={{ width:30, height:30, borderRadius:"50%",
                                  objectFit:"cover", flexShrink:0, border:`1px solid ${cat.color}` }} />
                            ) : (
                              <div style={{ width:30, height:30, borderRadius:"50%",
                                flexShrink:0, background:T.bg3, border:`1px solid ${cat.color}`,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:12, fontWeight:700, color:cat.color }}>
                                {w.username[0].toUpperCase()}
                              </div>
                            )}
                            <div style={{ minWidth:0, flex:1 }}>
                              <div style={{ fontSize:8, color:cat.color,
                                letterSpacing:"0.08em", textTransform:"uppercase",
                                fontWeight:700 }}>{cat.name}</div>
                              <div style={{ fontSize:13, fontWeight:600, color:T.white,
                                overflow:"hidden", textOverflow:"ellipsis",
                                whiteSpace:"nowrap" }}>
                                @{w.display_name || w.username}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && pastWeeks.length === 0 && currentWinners.length === 0 && (
            <div style={{ textAlign:"center", padding:"48px 0" }}>
              <div style={{ fontSize:42, marginBottom:16 }}>🏆</div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:22, color:T.white, marginBottom:8 }}>
                Spotlight Coming Soon
              </div>
              <div style={{ fontSize:13, color:T.dim }}>
                Winners will be announced weekly.
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <footer style={{ borderTop:`1px solid ${T.border}`,
          padding:"20px clamp(14px,4vw,48px)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:12 }}>
          <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:13, color:T.dim }}>touch grass © 2024</span>
          <div style={{ display:"flex", gap:22 }}>
            {[["Dashboard","/"],["Leaderboard","/leaderboard"],
              ["X","https://twitter.com/XTouchGrass"]].map(([l,h]) => (
              <Link key={l} href={h}
                style={{ fontSize:10, color:T.dim, textDecoration:"none",
                  letterSpacing:"0.08em", textTransform:"uppercase" }}>{l}</Link>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}