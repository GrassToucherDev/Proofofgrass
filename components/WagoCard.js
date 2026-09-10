// components/WagoCard.js — WAGO Drops dashboard card
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const REWARD_ICONS = {
  touchgrass:   { icon:"🌿", label:"$TOUCHGRASS" },
  grass_tickets:{ icon:"🎟", label:"Grass Tickets" },
  shield:       { icon:"🛡️", label:"Shield" },
  nft:          { icon:"🖼️", label:"NFT" },
  sol:          { icon:"◎",  label:"SOL" },
  btc:          { icon:"₿",  label:"BTC" },
  partner_token:{ icon:"🪙", label:"Partner Token" },
  manual:       { icon:"🎁", label:"Reward" },
};

function ProgressBar({ current, total, color="#7dc832" }) {
  const pct = Math.min(100, Math.round((current/total)*100));
  return (
    <div style={{ height:8, background:"rgba(200,220,190,0.3)", borderRadius:4, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${pct}%`, borderRadius:4,
        background:`linear-gradient(90deg,${color},${color}cc)`,
        transition:"width 0.6s ease" }} />
    </div>
  );
}

// ── Searching animation ───────────────────────────────────────────────────────
function SearchingState() {
  return (
    <div style={{ textAlign:"center", padding:"24px 16px" }}>
      <div style={{ fontSize:48, marginBottom:12,
        animation:"wagoBounce 1s ease-in-out infinite" }}>🪨</div>
      <div style={{ fontSize:14, fontWeight:700, color:"#1a4a0a", marginBottom:4 }}>
        Searching for a WAGO Drop…
      </div>
      <div style={{ fontSize:12, color:"#6b7d60" }}>Checking under the rock…</div>
      <style>{`@keyframes wagoBounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}`}</style>
    </div>
  );
}

// ── No Drop result ────────────────────────────────────────────────────────────
function NoDropState({ streakDay, seasonName, onDismiss }) {
  return (
    <div style={{ textAlign:"center", padding:"20px 16px" }}>
      <div style={{ fontSize:40, marginBottom:10 }}>🪨</div>
      <div style={{ fontSize:13, fontWeight:800, color:"#1a4a0a", letterSpacing:"0.06em",
        textTransform:"uppercase", marginBottom:6 }}>
        Nothing Under This Rock Today
      </div>
      <div style={{ fontSize:12, color:"#6b7d60", lineHeight:1.6, marginBottom:14 }}>
        Your streak is still growing. Come back tomorrow for another chance.
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap",
        fontSize:11, color:"#6b7d60", marginBottom:14 }}>
        <span>🔥 Day {streakDay} streak</span>
        <span>·</span>
        <span>Next chance after 00:00 UTC</span>
      </div>
      <button onClick={onDismiss}
        style={{ fontSize:12, color:"#5ba622", background:"none", border:"none",
          cursor:"pointer", textDecoration:"underline", fontFamily:"DM Sans,sans-serif" }}>
        Got it
      </button>
    </div>
  );
}

// ── Win result ────────────────────────────────────────────────────────────────
function WinState({ reward, streakDay, rollId, onDismiss }) {
  const icon = REWARD_ICONS[reward?.type]?.icon || "🎁";
  return (
    <div style={{ textAlign:"center", padding:"20px 16px" }}>
      <div style={{ fontSize:48, marginBottom:10,
        filter:"drop-shadow(0 0 12px rgba(125,200,50,0.6))" }}>
        {icon}
      </div>
      <div style={{ fontSize:13, fontWeight:800, color:"#5ba622", letterSpacing:"0.06em",
        textTransform:"uppercase", marginBottom:6 }}>
        🎉 You Found a WAGO Drop!
      </div>
      <div style={{ fontSize:18, fontWeight:700, color:"#1a4a0a", marginBottom:4 }}>
        {reward?.name}
      </div>
      {reward?.amount && (
        <div style={{ fontSize:13, color:"#6b7d60", marginBottom:8 }}>
          {reward.amount} {REWARD_ICONS[reward?.type]?.label || ""}
        </div>
      )}
      <div style={{ fontSize:11, color:"#6b7d60", marginBottom:16 }}>
        Day {streakDay} proof
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
        <Link href="/wago"
          style={{ background:"linear-gradient(135deg,#7dc832,#5ba622)", color:"white",
            border:"none", borderRadius:20, padding:"8px 20px", fontSize:12, fontWeight:700,
            cursor:"pointer", textDecoration:"none", fontFamily:"DM Sans,sans-serif" }}>
          View & Claim →
        </Link>
        <button onClick={onDismiss}
          style={{ fontSize:12, color:"#6b7d60", background:"none",
            border:"1px solid rgba(200,220,190,0.5)", borderRadius:20,
            padding:"8px 16px", cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>
          Later
        </button>
      </div>
    </div>
  );
}

// ── Main WAGO Card ────────────────────────────────────────────────────────────
export default function WagoCard({ username, onProofLogged }) {
  const [status,     setStatus]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [searching,  setSearching]  = useState(false);
  const [rollResult, setRollResult] = useState(null);
  const [dismissed,  setDismissed]  = useState(false);
  const [retrying,   setRetrying]   = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!username) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/wago/status?username=${encodeURIComponent(username)}`);
      const d = await r.json();
      setStatus(d);
    } catch(e) { console.error("[WagoCard] status fetch failed:", e); }
    setLoading(false);
  }, [username]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Called from parent after proof is locked in
  const doRoll = useCallback(async (streakDay, submissionId) => {
    if (!username || !streakDay) return;
    setSearching(true); setDismissed(false);
    // Brief animation delay
    await new Promise(r => setTimeout(r, 1800));
    try {
      const res = await fetch("/api/wago/roll", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ username, streak_day:streakDay, submission_id:submissionId }),
      });
      const data = await res.json();
      setRollResult(data);
      setSearching(false);
      await fetchStatus();
    } catch(e) {
      console.error("[WagoCard] roll failed:", e);
      setSearching(false);
    }
  }, [username, fetchStatus]);

  // Expose doRoll to parent via ref pattern
  useEffect(() => {
    if (onProofLogged) onProofLogged.current = doRoll;
  }, [doRoll, onProofLogged]);

  const retryBalanceCheck = async () => {
    setRetrying(true);
    await fetchStatus();
    setRetrying(false);
  };

  if (loading) return (
    <div style={{ background:"white", borderRadius:20, padding:"20px 24px",
      border:"1px solid rgba(200,220,190,0.5)", boxShadow:"0 2px 16px rgba(26,74,10,0.07)",
      marginBottom:16 }}>
      <div style={{ height:16, width:"60%", borderRadius:4,
        background:"rgba(200,220,190,0.3)", animation:"v2Shimmer 1.4s infinite" }} />
    </div>
  );

  // No active season — don't show card
  if (!status?.season) return null;

  const season    = status.season;
  const user      = status.user;
  const todayRoll = status.today_roll;
  const streakOk  = user?.streak_ok;
  const hasWallet = user?.has_wallet;
  const currentStreak = user?.current_streak ?? 0;
  const rewardTypes   = status.reward_types ?? [];
  const firstEligible = season.first_eligible_streak_day;

  // Show result states
  if (searching) return (
    <div style={{ background:"white", borderRadius:20, overflow:"hidden",
      border:"1.5px solid rgba(232,160,32,0.3)", boxShadow:"0 4px 20px rgba(232,160,32,0.12)",
      marginBottom:16 }}>
      <SearchingState />
    </div>
  );

  if (rollResult && !dismissed) {
    if (rollResult.outcome === "won") return (
      <div style={{ background:"linear-gradient(135deg,rgba(125,200,50,0.06),white)",
        borderRadius:20, overflow:"hidden",
        border:"1.5px solid rgba(125,200,50,0.4)", boxShadow:"0 4px 20px rgba(125,200,50,0.15)",
        marginBottom:16 }}>
        <WinState reward={rollResult.reward} streakDay={rollResult.streak_day}
          rollId={rollResult.roll_id} onDismiss={()=>setDismissed(true)} />
      </div>
    );
    if (rollResult.outcome === "no_drop") return (
      <div style={{ background:"white", borderRadius:20, overflow:"hidden",
        border:"1px solid rgba(200,220,190,0.5)", boxShadow:"0 2px 16px rgba(26,74,10,0.07)",
        marginBottom:16 }}>
        <NoDropState streakDay={rollResult.streak_day} seasonName={season.name}
          onDismiss={()=>setDismissed(true)} />
      </div>
    );
  }

  // Balance check failed
  if (rollResult?.outcome === "balance_check_failed") return (
    <div style={{ background:"white", borderRadius:20, padding:"20px 24px",
      border:"1.5px solid rgba(232,160,32,0.3)", marginBottom:16 }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#c8a84b", marginBottom:6 }}>
        ⚠️ Couldn't verify your balance
      </div>
      <div style={{ fontSize:12, color:"#6b7d60", marginBottom:14, lineHeight:1.5 }}>
        Your WAGO chance has not been used. Tap retry to try again.
      </div>
      <button onClick={retryBalanceCheck} disabled={retrying}
        style={{ background:"linear-gradient(135deg,#7dc832,#5ba622)", color:"white",
          border:"none", borderRadius:20, padding:"8px 20px", fontSize:12, fontWeight:700,
          cursor:"pointer", fontFamily:"DM Sans,sans-serif", opacity:retrying?0.6:1 }}>
        {retrying?"Retrying…":"↺ Retry"}
      </button>
    </div>
  );

  return (
    <div style={{ background:"white", borderRadius:20, overflow:"hidden",
      border:`1.5px solid ${streakOk && hasWallet ? "rgba(232,160,32,0.3)" : "rgba(200,220,190,0.5)"}`,
      boxShadow:`0 4px 20px ${streakOk && hasWallet ? "rgba(232,160,32,0.08)" : "rgba(26,74,10,0.07)"}`,
      marginBottom:16 }}>

      {/* Header */}
      <div style={{ padding:"16px 20px 0", display:"flex", alignItems:"flex-start",
        justifyContent:"space-between", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:28 }}>🍂</div>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:"#1a4a0a",
              letterSpacing:"0.04em" }}>WAGO DROPS</div>
            <div style={{ fontSize:10, color:"#6b7d60", fontWeight:600,
              letterSpacing:"0.1em", textTransform:"uppercase" }}>{season.name}</div>
          </div>
        </div>
        <Link href="/wago" style={{ fontSize:11, color:"#5ba622", fontWeight:600,
          textDecoration:"none", background:"rgba(125,200,50,0.08)",
          borderRadius:20, padding:"4px 12px", border:"1px solid rgba(125,200,50,0.2)",
          whiteSpace:"nowrap", flexShrink:0 }}>
          Learn More
        </Link>
      </div>

      <div style={{ padding:"12px 20px 16px" }}>

        {/* ── LOCKED: streak ────────────────────────────────────────────── */}
        {!streakOk && (
          <>
            <div style={{ fontSize:13, fontWeight:700, color:"#c8a84b", marginBottom:4 }}>
              🔒 WAGO DROPS LOCKED
            </div>
            <div style={{ fontSize:12, color:"#6b7d60", marginBottom:12, lineHeight:1.5 }}>
              Build a {season.minimum_qualifying_streak}-day streak to unlock WAGO Drops.
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
              fontSize:11, color:"#6b7d60", marginBottom:6 }}>
              <span>Day {currentStreak} of {firstEligible - 1}</span>
              <span>{Math.max(0, firstEligible - 1 - currentStreak)} more days needed</span>
            </div>
            <ProgressBar current={currentStreak} total={firstEligible - 1} color="#c8a84b" />
            {currentStreak === firstEligible - 1 && (
              <div style={{ marginTop:8, fontSize:11, color:"#5ba622", fontWeight:600 }}>
                🎉 Qualification complete! Return tomorrow for Day {firstEligible}.
              </div>
            )}
            {/* Wallet status */}
            <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:6,
              fontSize:11, color:hasWallet?"#5ba622":"#6b7d60" }}>
              {hasWallet ? "✓" : "○"}
              {hasWallet
                ? `Hold ${season.required_token_amount.toLocaleString()} $TOUCHGRASS — connected`
                : `Hold ${season.required_token_amount.toLocaleString()} $TOUCHGRASS`}
            </div>
          </>
        )}

        {/* ── LOCKED: wallet / holding ──────────────────────────────────── */}
        {streakOk && !hasWallet && (
          <>
            <div style={{ fontSize:13, fontWeight:700, color:"#c8a84b", marginBottom:4 }}>
              🔒 Wallet Required
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8,
              fontSize:11, color:"#5ba622" }}>
              ✓ {currentStreak}-day streak complete
            </div>
            <div style={{ fontSize:12, color:"#6b7d60", marginBottom:12, lineHeight:1.5 }}>
              Connect and verify your Solana wallet holding{" "}
              <strong>{season.required_token_amount.toLocaleString()} $TOUCHGRASS</strong>{" "}
              to unlock WAGO Drops.
            </div>
            <Link href={`/u/${username}`}
              style={{ display:"inline-block", fontSize:12, fontWeight:700,
                color:"white", background:"linear-gradient(135deg,#7dc832,#5ba622)",
                borderRadius:20, padding:"8px 18px", textDecoration:"none" }}>
              Connect Wallet →
            </Link>
          </>
        )}

        {/* ── ALREADY ROLLED TODAY ──────────────────────────────────────── */}
        {streakOk && hasWallet && todayRoll && (
          <>
            <div style={{ fontSize:12, color:"#6b7d60", marginBottom:8 }}>
              {todayRoll.outcome === "won"
                ? "🎉 Today's WAGO search: Winner!"
                : "✓ Today's WAGO search complete"}
            </div>
            <div style={{ fontSize:11, color:"#6b7d60" }}>
              Next chance after 00:00 UTC · {season.days_remaining} days left in season
            </div>
          </>
        )}

        {/* ── ELIGIBLE ─────────────────────────────────────────────────── */}
        {streakOk && hasWallet && !todayRoll && (
          <>
            <div style={{ fontSize:13, color:"#6b7d60", marginBottom:12, lineHeight:1.5 }}>
              Your next proof could uncover a reward.
            </div>

            {/* Status badges */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11,
                fontWeight:700, color:"#5ba622", background:"rgba(125,200,50,0.1)",
                borderRadius:20, padding:"4px 12px", border:"1px solid rgba(125,200,50,0.25)" }}>
                ✓ Day {currentStreak} streak
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11,
                fontWeight:700, color:"#5ba622", background:"rgba(125,200,50,0.1)",
                borderRadius:20, padding:"4px 12px", border:"1px solid rgba(125,200,50,0.25)" }}>
                ✓ Holding requirement met
              </div>
            </div>

            {/* Reward icons */}
            {rewardTypes.length > 0 && (
              <div style={{ display:"flex", gap:14, marginBottom:14, flexWrap:"wrap" }}>
                {rewardTypes.map(type=>(
                  <div key={type} style={{ display:"flex", flexDirection:"column",
                    alignItems:"center", gap:3 }}>
                    <div style={{ width:40, height:40, borderRadius:10,
                      background:"rgba(200,220,190,0.2)", border:"1px solid rgba(200,220,190,0.5)",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                      {REWARD_ICONS[type]?.icon || "🎁"}
                    </div>
                    <div style={{ fontSize:9, color:"#6b7d60", fontWeight:600 }}>
                      {REWARD_ICONS[type]?.label || type}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            <Link href="/#upload"
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                background:"linear-gradient(135deg,#7dc832,#5ba622)", color:"white",
                borderRadius:12, padding:"13px", width:"100%", textDecoration:"none",
                fontSize:14, fontWeight:800, letterSpacing:"0.04em",
                boxShadow:"0 4px 16px rgba(125,200,50,0.35)",
                fontFamily:"DM Sans,sans-serif", boxSizing:"border-box" }}>
              🔍 Log Proof &amp; Search
            </Link>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"10px 20px", borderTop:"1px solid rgba(200,220,190,0.4)",
        fontSize:10, color:"#6b7d60", textAlign:"center" }}>
        One chance per approved proof · Resets at 00:00 UTC
      </div>
    </div>
  );
}