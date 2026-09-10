// pages/wago.js — WAGO Drops detail page
import { useState, useEffect } from "react";
import Link from "next/link";
import Head from "next/head";
import { supabase } from "../utils/supabase";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";

function norm(v) { return String(v ?? "").replace(/@/g, "").toLowerCase().trim(); }

const REWARD_ICONS = {
  touchgrass:    "🌿",
  grass_tickets: "🎟",
  shield:        "🛡️",
  nft:           "🖼️",
  sol:           "◎",
  btc:           "₿",
  partner_token: "🪙",
  manual:        "🎁",
};

function Skel({ w="100%", h=16, r=8 }) {
  return <div style={{ width:w, height:h, borderRadius:r,
    background:"rgba(200,220,190,0.3)", animation:"v2Shimmer 1.4s ease-in-out infinite" }} />;
}

export default function WagoPage() {
  const [username,    setUsername]    = useState(null);
  const [status,      setStatus]      = useState(null);
  const [history,     setHistory]     = useState([]);
  const [recentWins,  setRecentWins]  = useState([]);
  const [rewards,     setRewards]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [claimLoading,setClaimLoading]= useState(null);
  const [claimMsg,    setClaimMsg]    = useState({});

  useEffect(()=>{
    const saved = typeof window !== "undefined"
      ? localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim()
      : null;
    setUsername(saved||null);
  },[]);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        // Fetch status
        const r = await fetch(`/api/wago/status${username?`?username=${username}`:""}`);
        const d = await r.json();
        setStatus(d);

        if (d.season && username) {
          // Fetch user history
          const { data:hist } = await supabase
            .from("wago_rolls")
            .select("*, wago_rewards(name,reward_type,rarity,image_url,amount_per_win), wago_claims(status,fulfilled_at)")
            .eq("username", username)
            .eq("season_id", d.season.id)
            .order("rolled_at", { ascending:false })
            .limit(30);
          setHistory(hist||[]);

          // Fetch season rewards
          const { data:rw } = await supabase
            .from("wago_rewards")
            .select("name,description,reward_type,rarity,image_url,amount_per_win,total_inventory,reserved_inventory,fulfilled_inventory")
            .eq("season_id", d.season.id)
            .eq("active", true)
            .order("weight", { ascending:false });
          setRewards(rw||[]);

          // Fetch recent privacy-safe wins (anonymised)
          const { data:wins } = await supabase
            .from("wago_rolls")
            .select("username, rolled_at, wago_rewards(name,reward_type,rarity)")
            .eq("season_id", d.season.id)
            .eq("outcome", "won")
            .order("rolled_at", { ascending:false })
            .limit(10);
          // Anonymise usernames
          setRecentWins((wins||[]).map(w=>({
            ...w,
            username: w.username.slice(0,3) + "***",
          })));
        }
      } catch(e) { console.error("[wago page]", e); }
      setLoading(false);
    })();
  },[username]);

  const handleClaim = async (rollId) => {
    setClaimLoading(rollId);
    try {
      const res = await fetch("/api/wago/claim", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ roll_id:rollId, username }),
      });
      const data = await res.json();
      setClaimMsg(prev=>({...prev, [rollId]: data.message || (data.success?"Claim submitted!":"Failed.")}));
    } catch(e) {
      setClaimMsg(prev=>({...prev, [rollId]:"Something went wrong."}));
    }
    setClaimLoading(null);
  };

  const season = status?.season;
  const user   = status?.user;

  const css = V2GlobalCSS + `
    .wago-history-row { display:grid; grid-template-columns:auto 1fr auto; gap:12px;
      align-items:center; padding:12px 0; border-bottom:1px solid rgba(200,220,190,0.4); }
    .wago-rewards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:14px; }
    @media(max-width:480px) {
      .wago-rewards-grid { grid-template-columns:1fr 1fr !important; }
    }
  `;

  return (
    <>
      <Head>
        <title>WAGO Drops | Proof of Grass</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html:css }} />

      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)" }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:200, height:64,
          display:"flex", alignItems:"center", padding:"0 clamp(14px,4vw,40px)", gap:20,
          background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${V2.borderSoft}`,
          boxShadow:"0 2px 16px rgba(26,74,10,0.07)" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10,
            textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:36, height:36 }} />
            <span style={{ fontFamily:V2.fontSans, fontSize:16, fontWeight:800, color:V2.forestGreen }}>
              Touch Grass
            </span>
          </Link>
          <div style={{ marginLeft:"auto" }}>
            {username
              ? <Link href={`/u/${username}`} style={{ fontSize:13, fontWeight:600,
                  color:V2.forestGreen, textDecoration:"none",
                  background:"white", border:`1px solid ${V2.borderSoft}`,
                  borderRadius:20, padding:"6px 14px" }}>@{username}</Link>
              : <Link href="/" style={{ ...V2Styles.btnPrimary, fontSize:13,
                  padding:"8px 18px", textDecoration:"none" }}>Sign In</Link>
            }
          </div>
        </nav>

        {/* HERO */}
        <div style={{ background:"linear-gradient(160deg,#fef3c7 0%,#d8f0e8 60%,#e8f4fd 100%)",
          padding:"40px clamp(14px,4vw,48px) 48px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", right:"clamp(20px,6vw,80px)", bottom:0,
            fontSize:"clamp(80px,12vw,140px)", opacity:0.5, lineHeight:1 }}>🪨</div>
          <div style={{ position:"relative", maxWidth:560 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:16,
              background:"rgba(255,255,255,0.85)", borderRadius:20, padding:"6px 16px",
              border:"1px solid rgba(232,160,32,0.3)" }}>
              <span style={{ fontSize:14 }}>🍂</span>
              <span style={{ fontSize:12, fontWeight:700, letterSpacing:"0.1em",
                textTransform:"uppercase", color:"#c8a84b" }}>
                {season ? season.name : "WAGO Drops"}
              </span>
            </div>
            <h1 style={{ fontFamily:V2.fontSans, fontWeight:900,
              fontSize:"clamp(32px,6vw,56px)", color:V2.forestGreen,
              lineHeight:1.1, marginBottom:14 }}>
              We All Go Outside.
            </h1>
            <p style={{ fontSize:15, color:V2.textBody, lineHeight:1.6, maxWidth:440 }}>
              Build a 7-day streak, hold $TOUCHGRASS, and every approved proof gives you
              one chance to uncover a surprise reward.
            </p>
          </div>
        </div>

        <div style={{ maxWidth:760, margin:"0 auto", padding:"28px clamp(14px,4vw,24px) 80px" }}>

          {/* ── SEASON INFO ──────────────────────────────────────────────── */}
          {loading ? (
            <div style={{ background:"white", borderRadius:20, padding:"24px",
              border:`1px solid ${V2.borderSoft}`, marginBottom:20 }}>
              <Skel h={20} w="50%" r={4} />
            </div>
          ) : season ? (
            <div style={{ background:"white", borderRadius:20, padding:"24px",
              border:`1px solid ${V2.borderSoft}`, boxShadow:"0 2px 16px rgba(26,74,10,0.07)",
              marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:V2.grassGreen, marginBottom:16 }}>
                Current Season
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {[
                  { label:"Season",       value:season.name },
                  { label:"Ends",         value:new Date(season.end_at).toLocaleDateString("en-US",{month:"long",day:"numeric"}) },
                  { label:"Requirement",  value:`${Number(season.required_token_amount).toLocaleString()} $TOUCHGRASS` },
                  { label:"First Eligible", value:`Day ${season.first_eligible_streak_day}` },
                ].map(s=>(
                  <div key={s.label}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em",
                      textTransform:"uppercase", color:V2.midGray, marginBottom:3 }}>{s.label}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:V2.forestGreen }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:16, padding:"12px 14px", borderRadius:10,
                background:"rgba(125,200,50,0.06)", border:`1px solid ${V2.borderSoft}`,
                fontSize:12, color:V2.textMuted, lineHeight:1.5 }}>
                🌿 WAGO Drops are funded by the previous month's creator fees.
                The holding requirement is fixed for the season and won't change.
              </div>
            </div>
          ) : (
            <div style={{ background:"white", borderRadius:20, padding:"32px 24px",
              textAlign:"center", border:`1px solid ${V2.borderSoft}`, marginBottom:20 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🪨</div>
              <div style={{ fontSize:16, fontWeight:700, color:V2.forestGreen, marginBottom:6 }}>
                No Active Season
              </div>
              <div style={{ fontSize:13, color:V2.midGray }}>
                WAGO Drops run monthly. Check back soon for the next season.
              </div>
            </div>
          )}

          {/* ── USER ELIGIBILITY ─────────────────────────────────────────── */}
          {username && season && !loading && (
            <div style={{ background:"white", borderRadius:20, padding:"24px",
              border:`1px solid ${V2.borderSoft}`, boxShadow:"0 2px 16px rgba(26,74,10,0.07)",
              marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:V2.grassGreen, marginBottom:16 }}>
                Your Eligibility
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {/* Streak */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8,
                      background:user?.streak_ok?"rgba(125,200,50,0.1)":"rgba(200,200,200,0.1)",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                      🔥
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:V2.forestGreen }}>
                        {user?.current_streak ?? 0}-Day Streak
                      </div>
                      <div style={{ fontSize:11, color:V2.midGray }}>
                        Need Day {season.first_eligible_streak_day}+
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700,
                    color:user?.streak_ok?V2.grassGreen:"#c8a84b" }}>
                    {user?.streak_ok?"✓ Eligible":"✗ Need more days"}
                  </div>
                </div>
                {/* Wallet */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8,
                      background:user?.has_wallet?"rgba(125,200,50,0.1)":"rgba(200,200,200,0.1)",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                      🔗
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:V2.forestGreen }}>
                        {Number(season.required_token_amount).toLocaleString()} $TOUCHGRASS
                      </div>
                      <div style={{ fontSize:11, color:V2.midGray }}>Verified wallet required</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700,
                    color:user?.has_wallet?V2.grassGreen:"#c8a84b" }}>
                    {user?.has_wallet?"✓ Connected":"✗ Connect wallet"}
                  </div>
                </div>
                {/* Today */}
                {status?.today_roll && (
                  <div style={{ padding:"10px 14px", borderRadius:10,
                    background:"rgba(125,200,50,0.06)", border:`1px solid ${V2.borderSoft}`,
                    fontSize:12, color:V2.grassGreen, fontWeight:600 }}>
                    ✓ Today's WAGO search complete · Next chance after 00:00 UTC
                  </div>
                )}
                {status?.eligible && !status?.today_roll && (
                  <Link href="/#upload"
                    style={{ ...V2Styles.btnPrimary, justifyContent:"center",
                      fontSize:14, textDecoration:"none" }}>
                    🔍 Log Proof &amp; Search
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── REWARD POOL ───────────────────────────────────────────────── */}
          {rewards.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:V2.midGray, marginBottom:14 }}>
                Reward Pool
              </div>
              <div className="wago-rewards-grid">
                {rewards.map((r,i)=>(
                  <div key={i} style={{ background:"white", borderRadius:14, padding:"16px",
                    border:`1px solid ${V2.borderSoft}`,
                    boxShadow:"0 2px 12px rgba(26,74,10,0.06)",
                    display:"flex", flexDirection:"column", alignItems:"center",
                    textAlign:"center", gap:8 }}>
                    <div style={{ fontSize:36 }}>{REWARD_ICONS[r.reward_type]||"🎁"}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:V2.forestGreen }}>{r.name}</div>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em",
                      textTransform:"uppercase", color:
                        r.rarity==="legendary"?"#c8a84b":
                        r.rarity==="rare"?"#a78bfa":
                        r.rarity==="uncommon"?"#5ba622":V2.midGray }}>
                      {r.rarity}
                    </div>
                    {r.description && (
                      <div style={{ fontSize:11, color:V2.midGray, lineHeight:1.4 }}>{r.description}</div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, fontSize:11, color:V2.midGray, textAlign:"center" }}>
                Not every roll wins. Rewards subject to inventory availability.
              </div>
            </div>
          )}

          {/* ── USER HISTORY ──────────────────────────────────────────────── */}
          {username && history.length > 0 && (
            <div style={{ background:"white", borderRadius:20, padding:"24px",
              border:`1px solid ${V2.borderSoft}`, boxShadow:"0 2px 16px rgba(26,74,10,0.07)",
              marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:V2.grassGreen, marginBottom:16 }}>
                Your WAGO History
              </div>
              {history.map((roll,i)=>{
                const isWin  = roll.outcome === "won";
                const reward = roll.wago_rewards;
                const claim  = roll.wago_claims?.[0];
                if (!isWin && i > 4) return null; // collapse no-drops after 5
                return (
                  <div key={roll.id} className="wago-history-row">
                    <div style={{ fontSize:20 }}>
                      {isWin ? (REWARD_ICONS[reward?.reward_type]||"🎁") : "🪨"}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700,
                        color:isWin?V2.forestGreen:V2.midGray }}>
                        {isWin ? (reward?.name || "Win") : "Nothing under this rock"}
                      </div>
                      <div style={{ fontSize:11, color:V2.midGray }}>
                        Day {roll.authoritative_streak_day} ·{" "}
                        {new Date(roll.rolled_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      {isWin && claim && (
                        <div>
                          {claim.status === "fulfilled" ? (
                            <span style={{ fontSize:11, fontWeight:700, color:V2.grassGreen }}>
                              ✓ Claimed
                            </span>
                          ) : claim.status === "reserved" ? (
                            <div>
                              <button onClick={()=>handleClaim(roll.id)}
                                disabled={claimLoading===roll.id}
                                style={{ fontSize:11, fontWeight:700, color:"white",
                                  background:V2.gradientGrassBtn, border:"none",
                                  borderRadius:20, padding:"5px 14px", cursor:"pointer",
                                  fontFamily:V2.fontSans }}>
                                {claimLoading===roll.id?"…":"Claim"}
                              </button>
                              {claimMsg[roll.id] && (
                                <div style={{ fontSize:10, color:V2.midGray, marginTop:4 }}>
                                  {claimMsg[roll.id]}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize:11, color:V2.midGray }}>
                              {claim.status}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── RECENT WINNERS ────────────────────────────────────────────── */}
          {recentWins.length > 0 && (
            <div style={{ background:"white", borderRadius:20, padding:"24px",
              border:`1px solid ${V2.borderSoft}`, boxShadow:"0 2px 16px rgba(26,74,10,0.07)",
              marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:V2.midGray, marginBottom:16 }}>
                Recent Winners
              </div>
              {recentWins.map((w,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"8px 0", borderBottom:i<recentWins.length-1?`1px solid ${V2.borderSoft}`:"none" }}>
                  <div style={{ fontSize:18 }}>{REWARD_ICONS[w.wago_rewards?.reward_type]||"🎁"}</div>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:V2.forestGreen }}>
                      @{w.username}
                    </span>
                    <span style={{ fontSize:12, color:V2.midGray }}> found </span>
                    <span style={{ fontSize:12, fontWeight:600, color:V2.grassGreen }}>
                      {w.wago_rewards?.name}
                    </span>
                  </div>
                  <div style={{ fontSize:10, color:V2.midGray }}>
                    {new Date(w.rolled_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:20, padding:"24px",
            border:`1px solid ${V2.borderSoft}`, boxShadow:"0 2px 16px rgba(26,74,10,0.07)",
            marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
              textTransform:"uppercase", color:V2.midGray, marginBottom:16 }}>
              How WAGO Drops Work
            </div>
            {[
              { n:"1", icon:"🔥", title:"Build a 7-day streak",
                desc:"Complete 7 consecutive approved daily proofs. Day 7 completes qualification." },
              { n:"2", icon:"🌿", title:`Hold ${season?Number(season.required_token_amount).toLocaleString():"the required"} $TOUCHGRASS`,
                desc:"Maintain the fixed token requirement in your verified Solana wallet for the season." },
              { n:"3", icon:"📸", title:"Log your daily proof",
                desc:"Starting on Day 8, every approved proof gives you one chance to find a WAGO Drop." },
              { n:"4", icon:"🪨", title:"Search under the rock",
                desc:"After your proof is approved, we search for a drop. One chance per UTC day." },
            ].map(s=>(
              <div key={s.n} style={{ display:"flex", gap:14, marginBottom:16,
                alignItems:"flex-start" }}>
                <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                  background:V2.grassGreen, color:"white", fontSize:14, fontWeight:800,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>{s.n}</div>
                <div style={{ fontSize:22, flexShrink:0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:V2.forestGreen, marginBottom:3 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize:12, color:V2.textMuted, lineHeight:1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ padding:"12px 14px", borderRadius:10,
              background:"rgba(125,200,50,0.06)", border:`1px solid ${V2.borderSoft}`,
              fontSize:11, color:V2.midGray, lineHeight:1.6 }}>
              Not every roll wins. Holding more tokens or having a longer streak does not
              increase your odds. One roll per approved UTC day. WAGO Drops do not replace
              or affect your Grass Draw tickets.
            </div>
          </div>

          {/* Back to dashboard */}
          <div style={{ textAlign:"center" }}>
            <Link href="/" style={{ fontSize:13, color:V2.midGray, textDecoration:"none" }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}