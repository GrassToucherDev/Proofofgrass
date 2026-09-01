// pages/grass-draw.js — V2 Grass Draw (Mockup Match)
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Head from "next/head";
import { supabase } from "../utils/supabase";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";

function normalizeUsername(v) {
  return String(v ?? "").replace(/@/g, "").toLowerCase().trim();
}

// ── Streak multiplier config (single source of truth) ────────────────────────
const MULTIPLIERS = [
  { day:14,  mult:1.15 },
  { day:30,  mult:1.30 },
  { day:50,  mult:1.50 },
  { day:100, mult:1.75 },
  { day:200, mult:2.00 },
];

function getMultiplier(streak) {
  const tier = [...MULTIPLIERS].reverse().find(m => streak >= m.day);
  return tier ? tier.mult : 1.00;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Skel({ w="100%", h=16, r=8 }) {
  return <div style={{ width:w, height:h, borderRadius:r,
    background:"linear-gradient(90deg,rgba(200,220,190,0.3) 0%,rgba(220,235,210,0.5) 50%,rgba(200,220,190,0.3) 100%)",
    backgroundSize:"200% 100%", animation:"v2Shimmer 1.4s ease-in-out infinite" }} />;
}

function StatCard({ icon, value, label, sub, accent, loading }) {
  return (
    <div style={{ flex:1, minWidth:0, textAlign:"center", padding:"16px 10px",
      background:"white", borderRadius:14, border:`1px solid ${V2.borderSoft}`,
      boxShadow:"0 1px 8px rgba(26,74,10,0.06)" }}>
      <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
      {loading ? <Skel h={28} r={4} w="60%" /> : (
        <div style={{ fontFamily:V2.fontSerif, fontSize:"clamp(22px,3vw,32px)",
          fontWeight:700, color:accent||V2.forestGreen, lineHeight:1, marginBottom:4 }}>
          {value}
        </div>
      )}
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em",
        textTransform:"uppercase", color:V2.midGray, marginBottom:sub?4:0 }}>{label}</div>
      {sub && <div style={{ fontSize:11, fontWeight:600, color:V2.grassGreen }}>{sub}</div>}
    </div>
  );
}

function RewardCard({ icon, name, desc, winners, accent, isNFT }) {
  return (
    <div style={{ background:"white", borderRadius:16, padding:"20px 16px",
      border:`1.5px solid ${accent||V2.borderSoft}`,
      boxShadow:"0 2px 16px rgba(26,74,10,0.08)",
      display:"flex", flexDirection:"column", alignItems:"center",
      textAlign:"center", gap:10, flex:1, minWidth:0 }}>
      <div style={{ fontSize:48, lineHeight:1 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:800, color:V2.forestGreen }}>{name}</div>
      <div style={{ fontSize:12, color:V2.textMuted, lineHeight:1.5 }}>{desc}</div>
      <div style={{ marginTop:"auto", fontSize:13, fontWeight:700,
        color:isNFT?V2.gold:V2.grassGreen,
        background:isNFT?"rgba(200,168,75,0.1)":"rgba(125,200,50,0.1)",
        border:`1px solid ${isNFT?V2.borderGold:V2.borderGreen}`,
        borderRadius:20, padding:"4px 14px" }}>
        {winners}
      </div>
    </div>
  );
}

function HowItWorksStep({ num, icon, title, desc, aside }) {
  return (
    <div style={{ display:"flex", gap:16, padding:"20px 0",
      borderBottom:`1px solid ${V2.borderSoft}`, alignItems:"flex-start" }}>
      <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
        background:V2.grassGreen, color:"white", fontSize:16, fontWeight:800,
        display:"flex", alignItems:"center", justifyContent:"center" }}>{num}</div>
      <div style={{ fontSize:28, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:700, color:V2.forestGreen, marginBottom:6 }}>{title}</div>
        <div style={{ fontSize:13, color:V2.textMuted, lineHeight:1.6 }}>{desc}</div>
      </div>
      {aside && (
        <div style={{ flexShrink:0, maxWidth:240 }}>{aside}</div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GrassDraw() {
  const [rawUsername, setRawUsername] = useState("");
  const [cycle,       setCycle]       = useState(null);
  const [totals,      setTotals]      = useState(null);
  const [streak,      setStreak]      = useState(0);
  const [entries,     setEntries]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [error,       setError]       = useState("");
  const [walletOk,    setWalletOk]    = useState(false);
  const [rewards,     setRewards]     = useState([]);

  const username = normalizeUsername(rawUsername);

  // Load active cycle on mount
  useEffect(() => {
    (async () => {
      const saved = typeof window !== "undefined" ? localStorage.getItem("pog_username") : null;
      if (saved) setRawUsername(normalizeUsername(saved));

      const { data: cycleData } = await supabase
        .from("grass_draw_cycles")
        .select("*")
        .eq("status", "active")
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
        .single();
      setCycle(cycleData || null);

      if (cycleData) {
        const { data: rewardData } = await supabase
          .from("grass_draw_rewards")
          .select("*")
          .eq("cycle_id", cycleData.id)
          .order("draw_order", { ascending: true });
        setRewards(rewardData || []);
      }
    })();
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!username || !cycle) return;
    setLoading(true); setError("");
    try {
      const [totalsRes, streakRes, entriesRes, profileRes] = await Promise.all([
        supabase.from("grass_draw_user_totals")
          .select("*").eq("cycle_id", cycle.id).ilike("username", username).maybeSingle(),
        supabase.from("Streaks")
          .select("current_streak").ilike("username", username).maybeSingle(),
        supabase.from("grass_draw_entries")
          .select("*").eq("cycle_id", cycle.id).ilike("username", username)
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("Profiles")
          .select("wallet_verified,wallet_address").ilike("username", username).maybeSingle(),
      ]);
      if (!totalsRes.data && !streakRes.data) {
        setError("Username not found. Check the spelling and try again.");
      } else {
        setTotals(totalsRes.data || null);
        setStreak(streakRes.data?.current_streak || 0);
        setEntries(entriesRes.data || []);
        setWalletOk(!!(profileRes.data?.wallet_verified && profileRes.data?.wallet_address));
      }
    } catch(e) { setError("Failed to load data. Try again."); }
    setLoading(false); setSearched(true);
  }, [username, cycle]);

  const daysRemaining = cycle
    ? Math.max(0, Math.ceil((new Date(cycle.ends_at) - new Date()) / 86400000))
    : 0;

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "";
  const multiplier = getMultiplier(streak);

  const css = V2GlobalCSS + `
    .gd-reward-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
    .gd-stats-row { display:flex; gap:10px; }
    @media(max-width:900px) { .gd-reward-grid { grid-template-columns:repeat(2,1fr) !important; } }
    @media(max-width:600px) {
      .gd-reward-grid { grid-template-columns:repeat(2,1fr) !important; }
      .gd-stats-row { flex-wrap:wrap; }
      .gd-stats-row > div { min-width:calc(50% - 5px); }
      .gd-how-aside { display:none !important; }
    }
  `;

  // Reward card definitions from DB or fallback
  const rewardCards = rewards.length > 0 ? rewards.map(r => ({
    icon: r.reward_type==="grass_score"?"⚡":r.reward_type==="shield"?"🛡️":r.reward_type==="profile_pack"?"🎨":"🖼️",
    name: r.reward_type==="grass_score"?"Grass Score Boost":r.reward_type==="shield"?"Streak Shield":r.reward_type==="profile_pack"?"Profile Pack":"NFT",
    desc: r.reward_type==="grass_score"?`+${r.reward_value?.amount||250} Grass Score`:r.reward_type==="shield"?"Protects your streak":r.reward_type==="profile_pack"?`${r.reward_value?.eligible_packs?.length||4} packs to choose from`:"Screen Touchers & more",
    winners: r.quantity>0?`${r.quantity} winners`:"Admin set",
    accent: r.reward_type==="nft"?V2.borderGold:V2.borderGreen,
    isNFT: r.reward_type==="nft",
  })) : [
    { icon:"⚡", name:"Grass Score Boost", desc:"+250 Grass Score",    winners:"10 winners", accent:V2.borderGreen,  isNFT:false },
    { icon:"🛡️", name:"Streak Shield",      desc:"Protects your streak", winners:"5 winners",  accent:V2.borderGreen,  isNFT:false },
    { icon:"🎨", name:"Profile Pack",       desc:"Exclusive cosmetics",  winners:"5 winners",  accent:V2.borderGreen,  isNFT:false },
    { icon:"🖼️", name:"NFT",               desc:"Screen Touchers & more",winners:"Admin set", accent:V2.borderGold,   isNFT:true  },
  ];

  return (
    <>
      <Head>
        <title>Grass Draw | Proof of Grass</title>
        <meta name="description" content="Earn Grass Tickets and win monthly rewards in the Proof of Grass Draw." />
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html:css }} />

      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)" }}>

        {/* ── NAV ────────────────────────────────────────────────────────── */}
        <nav style={{ position:"sticky", top:0, zIndex:200, height:64,
          display:"flex", alignItems:"center", padding:"0 clamp(14px,4vw,40px)", gap:20,
          background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${V2.borderSoft}`,
          boxShadow:"0 2px 16px rgba(26,74,10,0.07)" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:36, height:36, objectFit:"contain" }} />
            <span style={{ fontFamily:V2.fontSans, fontSize:16, fontWeight:800, color:V2.forestGreen }}>
              Touch Grass <span style={{ fontWeight:400, opacity:0.5 }}>| Proof of Grass</span>
            </span>
          </Link>
          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
            {username && (
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"white",
                border:`1px solid ${V2.borderSoft}`, borderRadius:20, padding:"6px 14px",
                boxShadow:"0 1px 6px rgba(26,74,10,0.06)" }}>
                <span style={{ fontSize:16 }}>🌿</span>
                <span style={{ fontSize:13, fontWeight:600, color:V2.forestGreen }}>@{username}</span>
              </div>
            )}
            <Link href="/" style={{ fontSize:12, color:V2.grassGreen, textDecoration:"none",
              padding:"8px 16px", borderRadius:20, border:`1px solid ${V2.borderGreen}`,
              background:"rgba(125,200,50,0.06)", fontWeight:600 }}>
              Dashboard
            </Link>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div style={{ position:"relative", overflow:"hidden", minHeight:280,
          background:"linear-gradient(160deg,#c5e3f7 0%,#d8f0e8 60%,#e8f4fd 100%)",
          padding:"40px clamp(14px,4vw,48px) 48px" }}>

          {/* Grass Draw banner image */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
            <img src="/raffle_draw.png" alt=""
              style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }} />
          </div>
          {/* Overlay so text stays readable */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none",
            background:"linear-gradient(90deg,rgba(197,227,247,0.95) 0%,rgba(197,227,247,0.80) 55%,rgba(197,227,247,0.15) 100%)" }} />

          {/* Left content */}
          <div style={{ position:"relative", maxWidth:520 }}>
            {/* Monthly Draw badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:16,
              background:"rgba(255,255,255,0.85)", border:`1px solid ${V2.borderGreen}`,
              borderRadius:20, padding:"6px 16px", backdropFilter:"blur(8px)" }}>
              <span style={{ fontSize:16 }}>🌿</span>
              <span style={{ fontSize:12, fontWeight:700, letterSpacing:"0.1em",
                textTransform:"uppercase", color:V2.grassGreen }}>Monthly Draw</span>
            </div>

            <h1 style={{ fontFamily:V2.fontSans, fontWeight:900,
              fontSize:"clamp(36px,6vw,64px)", color:V2.forestGreen,
              lineHeight:1, marginBottom:12 }}>The Grass Draw</h1>

            <p style={{ fontSize:15, color:V2.textBody, lineHeight:1.6, marginBottom:24, maxWidth:400 }}>
              Earn Grass Tickets through activity and win monthly rewards.
            </p>

            {/* Date pills */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8,
                background:"rgba(255,255,255,0.85)", borderRadius:20, padding:"8px 16px",
                border:`1px solid ${V2.borderSoft}`, fontSize:13, fontWeight:600,
                color:V2.forestGreen, backdropFilter:"blur(8px)" }}>
                📅 {cycle
                  ? `${fmtDate(cycle.starts_at)} – ${fmtDate(cycle.ends_at)}`
                  : "Loading cycle…"}
              </div>
              {cycle && (
                <div style={{ display:"inline-flex", alignItems:"center", gap:8,
                  background:"rgba(125,200,50,0.15)", borderRadius:20, padding:"8px 16px",
                  border:`1px solid ${V2.borderGreen}`, fontSize:13, fontWeight:700,
                  color:V2.grassGreen, backdropFilter:"blur(8px)" }}>
                  ⏱ {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth:960, margin:"0 auto", padding:"24px clamp(14px,4vw,24px) 80px" }}>

          {/* ── USERNAME LOOKUP ───────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:20, padding:"20px",
            boxShadow:"0 4px 24px rgba(26,74,10,0.10)", border:`1px solid ${V2.borderSoft}`,
            marginBottom:20 }}>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:10,
                background:"rgba(125,200,50,0.04)", border:`1.5px solid ${V2.borderSoft}`,
                borderRadius:12, padding:"12px 16px" }}>
                <span style={{ fontSize:18, color:V2.midGray }}>👤</span>
                <input
                  value={rawUsername}
                  onChange={e => setRawUsername(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchUserData()}
                  placeholder="Enter your username"
                  style={{ flex:1, border:"none", outline:"none", fontSize:15,
                    color:V2.forestGreen, background:"transparent", fontFamily:V2.fontSans }}
                />
              </div>
              <button onClick={fetchUserData} disabled={loading || !username || !cycle}
                style={{ ...V2Styles.btnPrimary, fontSize:15, padding:"12px 28px",
                  opacity:(!username||!cycle)?0.5:1,
                  cursor:(!username||!cycle)?"default":"pointer", flexShrink:0 }}>
                {loading ? "Loading…" : "Check My Entries 🌿"}
              </button>
            </div>
            {!cycle && (
              <div style={{ marginTop:12, fontSize:12, color:V2.midGray, textAlign:"center" }}>
                No active draw cycle found. Check back soon.
              </div>
            )}
          </div>

          {/* ── MY ENTRIES PANEL ──────────────────────────────────────────── */}
          {searched && !error && (
            <div style={{ background:"white", borderRadius:20, padding:"24px",
              boxShadow:"0 4px 24px rgba(26,74,10,0.10)", border:`1px solid ${V2.borderSoft}`,
              marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
                <span style={{ fontSize:20 }}>🌿</span>
                <span style={{ fontSize:16, fontWeight:800, color:V2.forestGreen }}>My Entries</span>
              </div>

              <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:20, alignItems:"flex-start" }}>
                {/* Total entries — large */}
                <div style={{ minWidth:140 }}>
                  {loading ? <Skel h={64} r={6} /> : (
                    <>
                      <div style={{ fontFamily:V2.fontSerif, fontSize:"clamp(48px,8vw,72px)",
                        fontWeight:700, color:V2.grassGreen, lineHeight:1 }}>
                        {totals ? parseFloat(totals.total_active_entries).toFixed(2) : "0.00"}
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                        textTransform:"uppercase", color:V2.midGray, marginTop:4 }}>
                        Total Entries
                      </div>
                      <div style={{ marginTop:8, fontSize:12, fontWeight:600,
                        color:V2.forestGreen, background:"rgba(125,200,50,0.1)",
                        borderRadius:20, padding:"3px 12px", display:"inline-block" }}>
                        Good luck! 🌿
                      </div>
                    </>
                  )}
                </div>

                {/* Stat cards */}
                <div className="gd-stats-row" style={{ flex:1, minWidth:0 }}>
                  <StatCard icon="🌱" label="From Proofs"
                    value={totals ? parseFloat(totals.proof_entries).toFixed(2) : "0.00"}
                    loading={loading} />
                  <StatCard icon="✨" label="Bonus Entries"
                    value={totals ? parseFloat(totals.active_bonus_entries).toFixed(2) : "0.00"}
                    sub={totals?.pending_bonus_entries > 0 ? `+${parseFloat(totals.pending_bonus_entries).toFixed(1)} pending` : null}
                    loading={loading} />
                  <StatCard icon="📈" label="Streak Weight"
                    value={`${multiplier.toFixed(2)}×`}
                    sub={streak >= 14 ? `Day ${streak}` : "Reach Day 14"}
                    accent={multiplier > 1 ? V2.grassGreen : V2.midGray}
                    loading={loading} />
                  <StatCard icon="🔗" label="Solana Wallet"
                    value={walletOk ? "✓" : "—"}
                    sub={walletOk ? "Connected" : "Not connected"}
                    accent={walletOk ? V2.grassGreen : V2.midGray}
                    loading={loading} />
                </div>
              </div>

              {/* Eligibility / NFT strip */}
              {!loading && totals && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  gap:20, padding:"12px", borderRadius:12,
                  background:"rgba(125,200,50,0.06)", border:`1px solid ${V2.borderSoft}`,
                  flexWrap:"wrap" }}>
                  {totals.eligible ? (
                    <div style={{ display:"flex", alignItems:"center", gap:6,
                      fontSize:13, fontWeight:700, color:V2.grassGreen }}>
                      <span>✅</span> NFT eligible
                    </div>
                  ) : (
                    <div style={{ fontSize:12, color:V2.midGray }}>
                      {totals.proof_day_count < 7
                        ? `⏳ ${totals.proof_day_count}/7 proof days needed for eligibility`
                        : "Not yet eligible"}
                    </div>
                  )}
                  {walletOk && (
                    <div style={{ display:"flex", alignItems:"center", gap:6,
                      fontSize:13, fontWeight:600, color:V2.midGray }}>
                      🖼 Screen Touchers &amp; more
                    </div>
                  )}
                </div>
              )}

              {/* Disqualified warning */}
              {!loading && totals?.disqualified && (
                <div style={{ marginTop:12, padding:"12px 16px", borderRadius:12,
                  background:"rgba(230,80,80,0.08)", border:"1px solid rgba(230,80,80,0.3)",
                  fontSize:13, color:"#e05050" }}>
                  ⚠️ Your entries have been removed for this draw cycle.
                </div>
              )}

              {/* No entries state */}
              {!loading && searched && !totals && !error && (
                <div style={{ textAlign:"center", padding:"24px 0", color:V2.midGray }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🌱</div>
                  <div style={{ fontSize:14, fontWeight:600, color:V2.forestGreen, marginBottom:4 }}>
                    No entries yet this cycle
                  </div>
                  <div style={{ fontSize:13 }}>Submit your first proof to start earning Grass Tickets!</div>
                  <Link href="/" style={{ ...V2Styles.btnPrimary, fontSize:13,
                    marginTop:16, display:"inline-flex", textDecoration:"none" }}>
                    Log Your Proof →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{ background:"white", borderRadius:16, padding:"24px",
              marginBottom:20, textAlign:"center",
              border:`1px solid rgba(230,80,80,0.3)` }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#e05050", marginBottom:4 }}>{error}</div>
              <div style={{ fontSize:12, color:V2.midGray }}>Check the spelling and try again.</div>
            </div>
          )}

          {/* ── MONTHLY REWARDS POOL ─────────────────────────────────────── */}
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <span style={{ fontSize:20 }}>🎁</span>
              <h2 style={{ fontFamily:V2.fontSans, fontSize:18, fontWeight:800, color:V2.forestGreen }}>
                Monthly Rewards Pool
              </h2>
            </div>

            <div className="gd-reward-grid">
              {rewardCards.map((r, i) => <RewardCard key={i} {...r} />)}
            </div>

            {/* Draw order info */}
            <div style={{ marginTop:14, padding:"12px 16px", borderRadius:12,
              background:"white", border:`1px solid ${V2.borderSoft}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14 }}>ℹ️</span>
                <span style={{ fontSize:12, color:V2.textMuted }}>
                  Draw order: Score Boosts → Shields → Packs → NFTs
                </span>
              </div>
              <span style={{ fontSize:12, color:V2.midGray }}>
                NFT eligibility requires a connected Solana wallet.
              </span>
            </div>
          </div>

          {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:20, padding:"28px 24px",
            boxShadow:"0 2px 16px rgba(26,74,10,0.07)", border:`1px solid ${V2.borderSoft}`,
            marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ fontSize:20 }}>🌿</span>
              <h2 style={{ fontFamily:V2.fontSans, fontSize:18, fontWeight:800, color:V2.forestGreen }}>
                How It Works
              </h2>
            </div>

            <HowItWorksStep num="1" icon="🌱" title="Submit Daily Proofs"
              desc="Every approved outdoor proof earns Grass Draw entries. The more proofs you log, the more entries you earn." />

            <HowItWorksStep num="2" icon="📈" title="Build Your Streak Weight"
              desc="Reach key streak milestones to increase your draw weight. Longer streaks = more impact per proof."
              aside={
                <div className="gd-how-aside" style={{ background:"rgba(125,200,50,0.06)",
                  borderRadius:12, padding:"14px", border:`1px solid ${V2.borderSoft}` }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em",
                    textTransform:"uppercase", color:V2.grassGreen, marginBottom:10,
                    textAlign:"center" }}>Streak Multipliers</div>
                  <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                    {MULTIPLIERS.map(m => (
                      <div key={m.day} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:10, color:V2.midGray, marginBottom:3 }}>Day {m.day}</div>
                        <div style={{ fontFamily:V2.fontSerif, fontSize:16, fontWeight:700,
                          color:V2.forestGreen }}>{m.mult.toFixed(2)}×</div>
                      </div>
                    ))}
                  </div>
                </div>
              } />

            <HowItWorksStep num="3" icon="✨" title="Earn Bonus Entries"
              desc="Win spotlights, post Flex Cards, log Field Guide entries, win challenges, and refer new members for bonus entries."
              aside={
                <div className="gd-how-aside" style={{ background:"rgba(125,200,50,0.06)",
                  borderRadius:12, padding:"14px", textAlign:"center",
                  border:`1px solid ${V2.borderGreen}` }}>
                  <div style={{ fontSize:13, color:V2.forestGreen, lineHeight:1.5 }}>
                    Bonus entries are capped at{" "}
                    <span style={{ fontWeight:800, color:V2.grassGreen }}>50%</span>{" "}
                    of your proof entries.
                  </div>
                </div>
              } />

            <HowItWorksStep num="4" icon="🎁" title="Monthly Draw"
              desc="At the end of each cycle, winners are drawn by weighted random selection. The more entries you have, the stronger your position."
              aside={
                <div className="gd-how-aside" style={{ background:"rgba(232,160,32,0.06)",
                  borderRadius:12, padding:"14px", textAlign:"center",
                  border:`1px solid ${V2.borderGold}` }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>🏆</div>
                  <div style={{ fontSize:13, color:V2.gold, fontWeight:600, lineHeight:1.5 }}>
                    Winners announced shortly after the cycle ends.
                  </div>
                </div>
              } />
          </div>

          {/* ── GOOD TO KNOW ──────────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:20, padding:"24px",
            boxShadow:"0 2px 16px rgba(26,74,10,0.07)", border:`1px solid ${V2.borderSoft}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <span style={{ fontSize:18 }}>❓</span>
              <h3 style={{ fontFamily:V2.fontSans, fontSize:16, fontWeight:800,
                color:V2.grassGreen }}>Good to Know</h3>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
              {[
                "Draw order: Score Boosts → Shields → Packs → NFTs.",
                "NFT eligibility requires a connected Solana wallet.",
                "Bonus entries are capped at 50% of proof entries.",
                "Every valid approved proof counts toward entries.",
                "Entry totals reset at the start of each draw cycle.",
                "You need 7 proof days in the cycle to be eligible.",
              ].map((tip, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10,
                  fontSize:12, color:V2.textBody, lineHeight:1.5 }}>
                  <span style={{ color:V2.grassGreen, fontWeight:700, flexShrink:0 }}>✓</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}