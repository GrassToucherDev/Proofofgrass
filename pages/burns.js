import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.4)",
  olive:"#93a85a", gold:"#c8a84b", fire:"#f97316",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const EVENT_START = new Date("2026-06-21T00:00:00Z");
const EVENT_END   = new Date("2026-07-02T00:00:00Z"); // exclusive — covers all of July 1

function getUsername() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("pog_username");
    return saved ? saved.replace(/@/g,"").toLowerCase().trim() : null;
  } catch { return null; }
}

function fmtBurned(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs/24)}d ago`;
}

const FAQ = [
  { q:"What is a Streak Shield?", a:"A Shield protects your streak if you miss a day." },
  { q:"How much does a Shield cost?", a:"50,000 $TOUCHGRASS burned." },
  { q:"What is the Double Burn Event?", a:"Every Shield burn is matched 100% by the treasury through July 1st." },
  { q:"How much is burned per Shield during the event?", a:"100,000 $TOUCHGRASS total." },
  { q:"Do all participants get something?", a:"Yes, all participants earn the permanent Double Burner badge." },
  { q:"Do top burners get rewards?", a:"Yes, top burners compete on the event leaderboard." },
];

const HOW_IT_WORKS = [
  { emoji:"🔥", title:"Burn $TOUCHGRASS", desc:"Burn 50,000 $TOUCHGRASS to create a Streak Shield." },
  { emoji:"🛡", title:"Protect Your Streak", desc:"A Shield can save your streak if you miss a day." },
  { emoji:"⚖️", title:"Treasury Match", desc:"During the Double Burn Event, the treasury matches every Shield burn 100%." },
  { emoji:"📉", title:"Reduce Supply", desc:"Every burn helps reduce $TOUCHGRASS supply." },
];

export default function BurnsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEventBurns:0, totalShieldBurns:0, totalTreasuryMatch:0,
    totalBurned:0, totalShieldsCreated:0, totalParticipants:0, topBurner:null,
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [username, setUsername] = useState(null);
  const [userStats, setUserStats] = useState({ shields:0, eventBurns:0, totalImpact:0, hasBadge:false });
  const [faqOpen, setFaqOpen] = useState(null);

  useEffect(() => {
    const u = getUsername();
    setUsername(u);

    (async () => {
      const { data: eventBurns } = await supabase
        .from("BurnEvents")
        .select("*")
        .gte("created_at", EVENT_START.toISOString())
        .lt("created_at", EVENT_END.toISOString())
        .order("created_at", { ascending:false });

      const rows = eventBurns ?? [];

      // Stats
      const shieldBurns = rows.filter(r => r.burn_type === "shield_burn");
      const treasuryMatches = rows.filter(r => r.burn_type === "treasury_match");
      const totalAmount = rows.reduce((s,r) => s + Number(r.amount_burned||0) + Number(r.treasury_match_amount||0), 0);
      const totalShields = rows.reduce((s,r) => s + (r.shield_count||0), 0);
      const uniqueParticipants = new Set(rows.map(r => r.username).filter(Boolean));

      // Leaderboard — group by username, sum impact
      const byUser = {};
      rows.forEach(r => {
        if (!r.username) return;
        if (!byUser[r.username]) byUser[r.username] = { username:r.username, shields:0, totalBurned:0 };
        byUser[r.username].shields += (r.shield_count || 0);
        byUser[r.username].totalBurned += Number(r.amount_burned||0) + Number(r.treasury_match_amount||0);
      });
      const board = Object.values(byUser).sort((a,b) => b.totalBurned - a.totalBurned);

      setStats({
        totalEventBurns: rows.length,
        totalShieldBurns: shieldBurns.length,
        totalTreasuryMatch: treasuryMatches.reduce((s,r)=>s+Number(r.treasury_match_amount||0),0) +
          shieldBurns.reduce((s,r)=>s+Number(r.treasury_match_amount||0),0),
        totalBurned: totalAmount,
        totalShieldsCreated: totalShields,
        totalParticipants: uniqueParticipants.size,
        topBurner: board[0]?.username ?? null,
      });
      setLeaderboard(board.slice(0,20));
      setHistory(rows.slice(0,50));

      if (u) {
        const userRows = rows.filter(r => r.username === u);
        const userShields = userRows.reduce((s,r)=>s+(r.shield_count||0),0);
        const userImpact = userRows.reduce((s,r)=>s+Number(r.amount_burned||0)+Number(r.treasury_match_amount||0),0);
        setUserStats({
          shields: userShields,
          eventBurns: userRows.length,
          totalImpact: userImpact,
          hasBadge: userRows.some(r => r.burn_type === "shield_burn"),
        });
      }

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

    @keyframes burnGlowPulse2 { 0%,100%{opacity:0.15;} 50%{opacity:0.4;} }
    .hero-glow { background: radial-gradient(ellipse at 30% 20%, rgba(249,115,22,0.5), transparent 60%);
      animation: burnGlowPulse2 4s ease-in-out infinite; }
    @media(prefers-reduced-motion: reduce){ .hero-glow{ animation:none !important; } }

    .stat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media(max-width:768px){ .stat-grid{ grid-template-columns:repeat(2,1fr); } }

    .math-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
    @media(max-width:640px){ .math-grid{ grid-template-columns:1fr; } }

    .how-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
    @media(max-width:768px){ .how-grid{ grid-template-columns:1fr 1fr; } }
    @media(max-width:480px){ .how-grid{ grid-template-columns:1fr; } }

    table{ border-collapse:collapse; width:100%; }
    th{ text-align:left; font-size:9px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase;
      color:${T.dim}; padding:10px 14px; border-bottom:1px solid ${T.border}; }
    td{ padding:11px 14px; border-bottom:1px solid ${T.border}; font-size:12.5px; }
    tr:last-child td{ border-bottom:none; }
    .history-cards{ display:none; }
    @media(max-width:768px){
      table{ display:none; }
      .history-cards{ display:flex; flex-direction:column; gap:10px; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:26,height:26,objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>
          <Link href="/" style={{ fontSize:11, color:T.olive, textDecoration:"none" }}>← Dashboard</Link>
        </nav>

        {/* ── EVENT HERO ────────────────────────────────────────────────────── */}
        <div style={{ position:"relative", overflow:"hidden",
          backgroundImage:`url('/banners/double_burn_event.png')`,
          backgroundSize:"cover", backgroundPosition:"center",
          padding:"56px clamp(16px,5vw,64px) 40px" }}>
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(180deg,rgba(8,10,6,0.5) 0%,rgba(8,10,6,0.92) 100%)" }} />
          <div className="hero-glow" style={{ position:"absolute", inset:0, pointerEvents:"none" }} />

          <div style={{ position:"relative", zIndex:2, maxWidth:760 }}>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(34px,6vw,58px)",
              fontWeight:700, color:T.white, lineHeight:1.05, marginBottom:12,
              textShadow:"0 2px 16px rgba(0,0,0,0.6)" }}>
              🔥 Double Burn Event
            </h1>
            <p style={{ fontSize:14, color:"rgba(240,239,234,0.8)", lineHeight:1.6, marginBottom:24,
              maxWidth:520, textShadow:"0 1px 8px rgba(0,0,0,0.5)" }}>
              Every Streak Shield burn is matched 100% by the Touch Grass treasury through July 1st.
            </p>

            {/* Burn math cards */}
            <div className="math-grid" style={{ marginBottom:24 }}>
              {[
                ["Shield Burn", "50,000", T.olive],
                ["Treasury Match", "50,000", T.gold],
                ["Total Burn / Shield", "100,000", T.fire],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background:"rgba(14,16,11,0.75)", border:`1px solid ${T.borderGold}`,
                  borderRadius:12, padding:"16px 18px", backdropFilter:"blur(8px)" }}>
                  <div style={{ fontSize:9.5, color:T.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:24, fontWeight:700, color }}>
                    {val} <span style={{ fontSize:12, fontWeight:400, color:T.dim }}>$TOUCHGRASS</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button style={{ fontSize:13, fontWeight:700, padding:"13px 26px", borderRadius:10,
                background:T.olive, color:"#0e1108", border:"none", cursor:"pointer" }}>
                🛡 Get Shield
              </button>
              <a href="#history" style={{ fontSize:13, fontWeight:700, padding:"13px 26px", borderRadius:10,
                background:"rgba(200,168,75,0.15)", border:`1px solid ${T.borderGold}`, color:T.gold,
                textDecoration:"none", display:"inline-block" }}>
                View Burn History
              </a>
            </div>
          </div>
        </div>

        <div style={{ padding:"36px clamp(14px,5vw,64px)" }}>

          {/* ── EVENT STATS ──────────────────────────────────────────────────── */}
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22, fontWeight:700,
              color:T.white, marginBottom:16 }}>Event Stats</h2>
            <div className="stat-grid">
              {[
                ["Total Event Burns", stats.totalEventBurns],
                ["Shield Burns", stats.totalShieldBurns],
                ["Treasury Match Burns", fmtBurned(stats.totalTreasuryMatch)],
                ["Total $TOUCHGRASS Burned", fmtBurned(stats.totalBurned)],
                ["Shields Created", stats.totalShieldsCreated],
                ["Participants", stats.totalParticipants],
                ["Top Burner", stats.topBurner ? `@${stats.topBurner}` : "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ background:T.bg2, border:`1px solid ${T.border}`,
                  borderRadius:12, padding:"16px 14px", textAlign:"center" }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22,
                    fontWeight:700, color:T.gold }}>
                    {loading ? "—" : value}
                  </div>
                  <div style={{ fontSize:9.5, color:T.dim, textTransform:"uppercase",
                    letterSpacing:"0.06em", marginTop:4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── HOW SHIELDS WORK ─────────────────────────────────────────────── */}
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22, fontWeight:700,
              color:T.white, marginBottom:16 }}>How Shields Work</h2>
            <div className="how-grid">
              {HOW_IT_WORKS.map(item => (
                <div key={item.title} style={{ background:T.bg2, border:`1px solid ${T.border}`,
                  borderRadius:14, padding:"20px 16px" }}>
                  <div style={{ fontSize:26, marginBottom:10 }}>{item.emoji}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.white, marginBottom:6 }}>{item.title}</div>
                  <div style={{ fontSize:11.5, color:T.dim, lineHeight:1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── USER SHIELD AREA ─────────────────────────────────────────────── */}
          {username && (
            <div style={{ marginBottom:40, background:"linear-gradient(145deg,#0e100b,#141710)",
              border:`1px solid ${T.borderGold}`, borderRadius:16, padding:"24px 22px",
              boxShadow:"0 0 24px rgba(200,168,75,0.08)" }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase",
                color:T.gold, marginBottom:16 }}>Your Burns</div>
              <div className="stat-grid" style={{ marginBottom:18 }}>
                {[
                  ["Your Shields", userStats.shields],
                  ["Your Event Burns", userStats.eventBurns],
                  ["Your Total Burn Impact", fmtBurned(userStats.totalImpact)],
                  ["Double Burner Badge", userStats.hasBadge ? "✓ Earned" : "Locked"],
                ].map(([label, value]) => (
                  <div key={label} style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:20,
                      fontWeight:700, color: label==="Double Burner Badge" ? (userStats.hasBadge ? T.olive : T.dim) : T.white }}>
                      {value}
                    </div>
                    <div style={{ fontSize:9, color:T.dim, textTransform:"uppercase",
                      letterSpacing:"0.06em", marginTop:4 }}>{label}</div>
                  </div>
                ))}
              </div>
              <button style={{ fontSize:12, fontWeight:700, padding:"11px 22px", borderRadius:9,
                background:T.olive, color:"#0e1108", border:"none", cursor:"pointer" }}>
                🛡 Get Shield
              </button>
            </div>
          )}

          {/* ── BURN LEADERBOARD ─────────────────────────────────────────────── */}
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22, fontWeight:700,
              color:T.white, marginBottom:16 }}>Burn Leaderboard</h2>
            {loading ? (
              <div style={{ color:T.dim, fontSize:12, padding:20 }}>Loading…</div>
            ) : leaderboard.length === 0 ? (
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:12,
                padding:"32px 20px", textAlign:"center", color:T.dim, fontSize:13 }}>
                No burns recorded yet. Be the first.
              </div>
            ) : (
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
                {leaderboard.map((row, i) => (
                  <div key={row.username} style={{ display:"flex", alignItems:"center", gap:14,
                    padding:"14px 18px", borderBottom: i < leaderboard.length-1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:18,
                      fontWeight:700, color: i===0?T.gold:i===1?"#c0c0c0":i===2?"#cd7f32":T.dim, width:28 }}>
                      {i+1}
                    </div>
                    <Link href={`/u/${row.username}`} style={{ flex:1, fontSize:13, fontWeight:600,
                      color:T.olive, textDecoration:"none" }}>
                      @{row.username}
                    </Link>
                    <div style={{ fontSize:11.5, color:T.dim }}>{row.shields} shield{row.shields!==1?"s":""}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.gold, minWidth:90, textAlign:"right" }}>
                      {fmtBurned(row.totalBurned)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── BURN HISTORY ─────────────────────────────────────────────────── */}
          <div id="history" style={{ marginBottom:40 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22, fontWeight:700,
              color:T.white, marginBottom:16 }}>Burn History</h2>
            {loading ? (
              <div style={{ color:T.dim, fontSize:12, padding:20 }}>Loading…</div>
            ) : history.length === 0 ? (
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:12,
                padding:"32px 20px", textAlign:"center", color:T.dim, fontSize:13 }}>
                No burn history yet.
              </div>
            ) : (
              <>
                <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:12, overflow:"auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th><th>Username</th><th>Type</th>
                        <th>Shield Burn</th><th>Treasury Match</th><th>Total</th><th>Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(h => (
                        <tr key={h.id}>
                          <td style={{ color:T.dim, whiteSpace:"nowrap" }}>{timeAgo(h.created_at)}</td>
                          <td>{h.username ? <Link href={`/u/${h.username}`} style={{ color:T.olive, textDecoration:"none" }}>@{h.username}</Link> : "—"}</td>
                          <td style={{ color:T.muted }}>{h.burn_type.replace(/_/g," ")}</td>
                          <td>{fmtBurned(h.amount_burned)}</td>
                          <td>{fmtBurned(h.treasury_match_amount)}</td>
                          <td style={{ fontWeight:700, color:T.gold }}>{fmtBurned(Number(h.amount_burned||0)+Number(h.treasury_match_amount||0))}</td>
                          <td>
                            {h.tx_signature ? (
                              <a href={`https://solscan.io/tx/${h.tx_signature}`} target="_blank" rel="noopener noreferrer"
                                style={{ color:T.olive, fontSize:11 }}>View →</a>
                            ) : <span style={{ color:T.dim }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="history-cards">
                  {history.map(h => (
                    <div key={h.id} style={{ background:T.bg2, border:`1px solid ${T.border}`,
                      borderRadius:12, padding:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        {h.username ? (
                          <Link href={`/u/${h.username}`} style={{ fontSize:13, fontWeight:700, color:T.olive, textDecoration:"none" }}>
                            @{h.username}
                          </Link>
                        ) : <span style={{ fontSize:13, color:T.dim }}>—</span>}
                        <span style={{ fontSize:10, color:T.dim }}>{timeAgo(h.created_at)}</span>
                      </div>
                      <div style={{ fontSize:11, color:T.muted, marginBottom:8, textTransform:"capitalize" }}>
                        {h.burn_type.replace(/_/g," ")}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:T.dim, marginBottom:4 }}>
                        <span>Shield Burn</span><span>{fmtBurned(h.amount_burned)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:T.dim, marginBottom:8 }}>
                        <span>Treasury Match</span><span>{fmtBurned(h.treasury_match_amount)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, color:T.gold }}>
                        <span>Total</span><span>{fmtBurned(Number(h.amount_burned||0)+Number(h.treasury_match_amount||0))}</span>
                      </div>
                      {h.tx_signature && (
                        <a href={`https://solscan.io/tx/${h.tx_signature}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize:10.5, color:T.olive, marginTop:8, display:"inline-block" }}>View Transaction →</a>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── FAQ ───────────────────────────────────────────────────────────── */}
          <div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22, fontWeight:700,
              color:T.white, marginBottom:16 }}>FAQ</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {FAQ.map((item, i) => (
                <div key={i} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
                  <button onClick={() => setFaqOpen(faqOpen===i?null:i)}
                    style={{ width:"100%", textAlign:"left", padding:"14px 16px", background:"none",
                      border:"none", cursor:"pointer", display:"flex", justifyContent:"space-between",
                      alignItems:"center", color:T.white, fontSize:13, fontWeight:600 }}>
                    {item.q}
                    <span style={{ color:T.dim, fontSize:14 }}>{faqOpen===i?"−":"+"}</span>
                  </button>
                  {faqOpen===i && (
                    <div style={{ padding:"0 16px 14px", fontSize:12.5, color:T.dim, lineHeight:1.6 }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}