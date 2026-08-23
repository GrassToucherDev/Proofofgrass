// pages/grass-draw/leaf-draw.js
import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { supabase } from "../../utils/supabase";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

const LEAF_COLORS = [
  "#4a7c3f","#5a8f4a","#6ba55a","#3d6b35","#7ab86a",
  "#8faa6a","#c8a84b","#93a85a","#2d5a27","#4e7a44",
];

const LEAF_SHAPES = [
  "M0,-20 C8,-18 14,-8 12,0 C14,8 8,18 0,20 C-8,18 -14,8 -12,0 C-14,-8 -8,-18 0,-20Z",
  "M0,-22 C6,-16 16,-10 14,0 C16,10 6,16 0,22 C-6,16 -16,10 -14,0 C-16,-10 -6,-16 0,-22Z",
  "M0,-18 C10,-14 16,-6 14,2 C12,10 6,18 0,20 C-6,18 -12,10 -14,2 C-16,-6 -10,-14 0,-18Z",
  "M2,-20 C10,-16 16,-6 14,2 C12,12 4,18 -2,20 C-10,16 -16,6 -14,-2 C-12,-12 -4,-18 2,-20Z",
];

function randomBetween(a, b) { return a + Math.random() * (b - a); }

function generateLeaves(participants, winnerUsername) {
  const leaves = [];
  const total = Math.min(participants.length, 60);
  const winnerIdx = participants.findIndex(p => p.username.toLowerCase() === winnerUsername.toLowerCase());

  for (let i = 0; i < total; i++) {
    const p = participants[i];
    const isWinner = p.username.toLowerCase() === winnerUsername.toLowerCase();
    leaves.push({
      id: i,
      username: p.username,
      entries: parseFloat(p.total_active_entries).toFixed(1),
      isWinner,
      shape: LEAF_SHAPES[Math.floor(Math.random() * LEAF_SHAPES.length)],
      color: isWinner ? "#c8a84b" : LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      x: randomBetween(5, 95),
      startY: randomBetween(-120, -20),
      endY: randomBetween(55, 85),
      rotation: randomBetween(-180, 180),
      finalRotation: randomBetween(-45, 45),
      scale: randomBetween(0.8, 1.4),
      delay: randomBetween(0, 2.5),
      duration: randomBetween(2.5, 4.5),
      swayAmount: randomBetween(3, 12),
      swayDir: Math.random() > 0.5 ? 1 : -1,
    });
  }
  return leaves;
}

export default function LeafDraw() {
  const [authed,      setAuthed]      = useState(false);
  const [pw,          setPw]          = useState("");
  const [cycle,       setCycle]       = useState(null);
  const [drawType,    setDrawType]    = useState("grass_score");
  const [phase,       setPhase]       = useState("idle"); // idle | drawing | falling | settled | revealed
  const [leaves,      setLeaves]      = useState([]);
  const [winner,      setWinner]      = useState(null);
  const [drawResult,  setDrawResult]  = useState(null);
  const [error,       setError]       = useState("");
  const [msg,         setMsg]         = useState("");
  const [confirmed,   setConfirmed]   = useState(false);
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const startTime = useRef(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("grass_draw_cycles")
        .select("*").eq("status","active")
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
        .single();
      setCycle(data || null);
    })();
  }, []);

  const DRAW_TYPES = [
    { value:"grass_score",  label:"Grass Score Boost",  note:"+250 Score · 10 winners" },
    { value:"shield",       label:"Streak Shield",       note:"5 winners" },
    { value:"profile_pack", label:"Profile Pack",        note:"5 winners" },
    { value:"nft",          label:"NFT",                 note:"Wallet required" },
  ];

  const runDraw = async () => {
    if (!cycle) return setError("No active cycle.");
    setError(""); setPhase("drawing"); setWinner(null); setDrawResult(null); setConfirmed(false);

    try {
      // Step 1: Run server-side draw (dry run to get winner)
      const r = await fetch("/api/grass-draw/execute-draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: cycle.id,
          draw_type: drawType,
          admin_username: "admin",
          dry_run: true,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Draw failed"); setPhase("idle"); return; }
      if (!d.winners?.length) { setError("No eligible participants."); setPhase("idle"); return; }

      setDrawResult(d);
      const winnerUser = d.winners[0];

      // Step 2: Load eligible pool for leaf display
      const { data: totals } = await supabase
        .from("grass_draw_user_totals")
        .select("username, total_active_entries")
        .eq("cycle_id", cycle.id)
        .eq("eligible", true)
        .eq("disqualified", false)
        .gt("total_active_entries", 0)
        .order("total_active_entries", { ascending: false })
        .limit(60);

      // Make sure winner is in the pool
      const pool = totals || [];
      if (!pool.find(p => p.username.toLowerCase() === winnerUser.username.toLowerCase())) {
        pool.unshift({ username: winnerUser.username, total_active_entries: winnerUser.entries });
      }

      const generatedLeaves = generateLeaves(pool, winnerUser.username);
      setLeaves(generatedLeaves);
      setWinner(winnerUser);

      // Step 3: Start falling animation
      setTimeout(() => setPhase("falling"), 300);

      // Step 4: After leaves settle, reveal winner
      setTimeout(() => setPhase("settled"), 5500);
      setTimeout(() => setPhase("revealed"), 7000);

    } catch(e) {
      setError(e.message || "Draw failed");
      setPhase("idle");
    }
  };

  const confirmWinner = async () => {
    if (!drawResult || confirmed) return;
    try {
      const r = await fetch("/api/grass-draw/execute-draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: cycle.id,
          draw_type: drawType,
          admin_username: "admin",
          dry_run: false,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Failed to save"); return; }
      setConfirmed(true);
      setMsg(`✓ Winner saved — seed: ${d.draw_seed?.slice(0,24)}…`);
    } catch(e) {
      setError(e.message);
    }
  };

  const reset = () => {
    setPhase("idle"); setLeaves([]); setWinner(null);
    setDrawResult(null); setError(""); setMsg(""); setConfirmed(false);
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:#080a06;color:#f0efea;font-family:'DM Sans',sans-serif;overflow:hidden;}
    @keyframes leafFall {
      0%   { transform: translate(var(--sx), var(--sy)) rotate(var(--r0)) scale(var(--sc)); opacity:0; }
      10%  { opacity:1; }
      100% { transform: translate(var(--ex), var(--ey)) rotate(var(--rf)) scale(var(--sc)); opacity:1; }
    }
    @keyframes leafSway {
      0%,100% { transform: translate(var(--ex), var(--ey)) rotate(var(--rf)) scale(var(--sc)) translateX(0); }
      50%     { transform: translate(var(--ex), var(--ey)) rotate(var(--rf)) scale(var(--sc)) translateX(calc(var(--sw) * 1px)); }
    }
    @keyframes winnerGlow {
      0%,100% { filter: drop-shadow(0 0 8px #c8a84b) drop-shadow(0 0 20px #c8a84b80); }
      50%     { filter: drop-shadow(0 0 20px #c8a84b) drop-shadow(0 0 40px #c8a84baa); }
    }
    @keyframes winnerRise {
      0%   { transform: translate(var(--ex), var(--ey)) rotate(var(--rf)) scale(var(--sc)); }
      100% { transform: translate(var(--ex), calc(var(--ey) - 120px)) rotate(0deg) scale(2.2); }
    }
    @keyframes revealBanner {
      0%   { opacity:0; transform:translateY(30px) scale(0.92); }
      100% { opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
    @keyframes shimmer { 0%,100%{opacity:0.6;} 50%{opacity:1;} }
    @keyframes particleFly {
      0%   { transform:translate(0,0) scale(1); opacity:1; }
      100% { transform:translate(var(--px),var(--py)) scale(0); opacity:0; }
    }
    .leaf { position:absolute; cursor:default; transition:all 0.3s; }
    .leaf.falling {
      animation: leafFall var(--dur) var(--del) ease-in both;
    }
    .leaf.settled {
      animation: leafSway 3s ease-in-out infinite;
    }
    .leaf.winner-rising {
      animation: winnerRise 1.2s ease-out forwards, winnerGlow 1.5s ease-in-out infinite;
      z-index: 100;
    }
    .leaf.other-settled {
      filter: brightness(0.4) saturate(0.3);
      transition: filter 1s;
    }
  `;

  if (!authed) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:"#080a06", display:"flex",
        alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:"#0e100b", border:"1px solid rgba(147,168,90,0.2)",
          borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:360, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🍃</div>
          <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:24, fontWeight:700, color:"#f0efea", marginBottom:24 }}>
            Leaf Draw
          </div>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter" && pw===ADMIN_PASSWORD) setAuthed(true); }}
            placeholder="Admin password"
            style={{ width:"100%", background:"#141710", border:"1px solid rgba(255,255,255,0.055)",
              borderRadius:8, padding:"10px 14px", color:"#f0efea", fontSize:13,
              outline:"none", marginBottom:12 }} />
          <button onClick={() => { if(pw===ADMIN_PASSWORD) setAuthed(true); }}
            style={{ width:"100%", background:"#93a85a", color:"#0a0c08", border:"none",
              borderRadius:8, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            Enter
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Head>
        <title>Grass Draw — Leaf Draw</title>
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Full screen forest background */}
      <div style={{ position:"fixed", inset:0, background:
        "radial-gradient(ellipse at 50% 100%, #1a2d0e 0%, #0e1a08 40%, #080a06 100%)",
        overflow:"hidden" }}>

        {/* Ambient grass at bottom */}
        <svg style={{ position:"absolute", bottom:0, left:0, width:"100%", height:120,
          opacity:0.4 }} viewBox="0 0 1440 120" preserveAspectRatio="none">
          {Array.from({length:40}).map((_,i) => (
            <path key={i}
              d={`M${i*36+randomBetween(0,20)},120 Q${i*36+randomBetween(-10,10)},${randomBetween(40,80)} ${i*36+randomBetween(-5,5)},${randomBetween(0,30)}`}
              stroke="#93a85a" strokeWidth={randomBetween(1,3)} fill="none" opacity={randomBetween(0.3,0.8)} />
          ))}
        </svg>

        {/* Falling leaves canvas */}
        <div style={{ position:"absolute", inset:0 }}>
          {phase !== "idle" && phase !== "drawing" && leaves.map(leaf => {
            const sx = `${leaf.x}vw`;
            const sy = `${leaf.startY}vh`;
            const ex = `${leaf.x}vw`;
            const ey = `${leaf.endY}vh`;
            const isWinnerRevealed = phase === "revealed" && leaf.isWinner;
            const isOtherSettled   = phase === "revealed" && !leaf.isWinner;

            return (
              <div key={leaf.id} className={`leaf ${
                phase === "falling" ? "falling" :
                phase === "settled" ? "settled" :
                isWinnerRevealed    ? "winner-rising" :
                isOtherSettled      ? "other-settled settled" : "settled"
              }`}
              style={{
                "--sx": sx, "--sy": sy, "--ex": ex, "--ey": ey,
                "--r0": `${leaf.rotation}deg`, "--rf": `${leaf.finalRotation}deg`,
                "--sc": leaf.scale, "--dur": `${leaf.duration}s`,
                "--del": `${leaf.delay}s`, "--sw": leaf.swayAmount * leaf.swayDir,
                left:0, top:0, width:"100%", height:"100%",
                pointerEvents:"none",
              }}>
                <svg viewBox="-25 -25 50 50" style={{
                  position:"absolute", left:0, top:0,
                  width:48*leaf.scale, height:48*leaf.scale,
                  overflow:"visible",
                }}>
                  <path d={leaf.shape} fill={leaf.color}
                    stroke={leaf.isWinner ? "#ffd700" : "rgba(0,0,0,0.2)"}
                    strokeWidth={leaf.isWinner ? 1.5 : 0.5} />
                  {/* Leaf vein */}
                  <line x1="0" y1="-16" x2="0" y2="16"
                    stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
                  {/* Username — only show on winner or on hover */}
                  {(leaf.isWinner || leaf.scale > 1.2) && (
                    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle"
                      fontSize="4" fill="rgba(0,0,0,0.6)" fontFamily="DM Sans"
                      style={{ userSelect:"none" }}>
                      {leaf.username.length > 8 ? leaf.username.slice(0,7)+"…" : leaf.username}
                    </text>
                  )}
                </svg>
              </div>
            );
          })}
        </div>

        {/* Winner banner */}
        {phase === "revealed" && winner && (
          <div style={{
            position:"absolute", inset:0, display:"flex",
            alignItems:"center", justifyContent:"center",
            animation:"revealBanner 0.8s ease-out forwards",
            pointerEvents:"none",
          }}>
            <div style={{
              background:"rgba(8,10,6,0.92)",
              border:"1px solid rgba(200,168,75,0.5)",
              borderRadius:20,
              padding:"40px 56px",
              textAlign:"center",
              backdropFilter:"blur(20px)",
              boxShadow:"0 0 60px rgba(200,168,75,0.2)",
              pointerEvents:"all",
            }}>
              <div style={{ fontSize:13, letterSpacing:"0.2em", textTransform:"uppercase",
                color:"rgba(200,168,75,0.7)", marginBottom:12 }}>
                {DRAW_TYPES.find(t=>t.value===drawType)?.label} Winner
              </div>
              <div style={{ fontSize:56, marginBottom:16 }}>🍃</div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(36px,6vw,64px)", fontWeight:700,
                color:"#c8a84b", lineHeight:1, marginBottom:8,
                animation:"shimmer 2s ease-in-out infinite" }}>
                @{winner.username}
              </div>
              <div style={{ fontSize:14, color:"rgba(240,239,234,0.5)", marginBottom:32 }}>
                {parseFloat(winner.entries).toFixed(2)} active entries
              </div>
              {msg && (
                <div style={{ fontSize:12, color:"#93a85a", marginBottom:16,
                  padding:"8px 16px", background:"rgba(147,168,90,0.1)",
                  border:"1px solid rgba(147,168,90,0.2)", borderRadius:8 }}>
                  {msg}
                </div>
              )}
              {error && (
                <div style={{ fontSize:12, color:"#f87171", marginBottom:16 }}>{error}</div>
              )}
              <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
                {!confirmed && (
                  <button onClick={confirmWinner}
                    style={{ background:"#c8a84b", color:"#0a0800", border:"none",
                      borderRadius:10, padding:"13px 28px", fontSize:14,
                      fontWeight:700, cursor:"pointer", letterSpacing:"0.04em" }}>
                    ✓ Confirm Winner
                  </button>
                )}
                <button onClick={reset}
                  style={{ background:"transparent", color:"rgba(240,239,234,0.5)",
                    border:"1px solid rgba(255,255,255,0.1)", borderRadius:10,
                    padding:"13px 28px", fontSize:14, cursor:"pointer" }}>
                  {confirmed ? "Draw Again" : "Re-draw"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controls overlay */}
        {(phase === "idle" || phase === "drawing") && (
          <div style={{ position:"absolute", inset:0, display:"flex",
            flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24 }}>

            {/* Title */}
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:64, marginBottom:12,
                animation: phase==="drawing" ? "shimmer 1s ease-in-out infinite" : "none" }}>
                🍃
              </div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(36px,5vw,56px)", fontWeight:700, color:"#f0efea",
                lineHeight:1, marginBottom:8 }}>
                The Grass Draw
              </div>
              {cycle ? (
                <div style={{ fontSize:13, color:"rgba(240,239,234,0.4)" }}>{cycle.name}</div>
              ) : (
                <div style={{ fontSize:13, color:"#f87171" }}>No active cycle</div>
              )}
            </div>

            {phase === "idle" && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
                {/* Draw type selector */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
                  {DRAW_TYPES.map(t => (
                    <button key={t.value} onClick={() => setDrawType(t.value)}
                      style={{
                        padding:"10px 18px", borderRadius:10, cursor:"pointer",
                        fontSize:12, fontWeight:600, letterSpacing:"0.04em",
                        background: drawType===t.value ? "rgba(147,168,90,0.15)" : "rgba(255,255,255,0.04)",
                        border: drawType===t.value ? "1px solid #93a85a" : "1px solid rgba(255,255,255,0.08)",
                        color: drawType===t.value ? "#93a85a" : "rgba(240,239,234,0.5)",
                        transition:"all 0.15s",
                      }}>
                      {t.label}
                      <div style={{ fontSize:10, color:"rgba(240,239,234,0.3)", marginTop:2 }}>{t.note}</div>
                    </button>
                  ))}
                </div>

                {error && <div style={{ fontSize:13, color:"#f87171" }}>{error}</div>}

                {/* Draw button */}
                <button onClick={runDraw} disabled={!cycle}
                  style={{
                    background:"linear-gradient(135deg,#93a85a,#7a9148)",
                    color:"#0a0c08", border:"none", borderRadius:14,
                    padding:"18px 48px", fontSize:16, fontWeight:700,
                    cursor: cycle ? "pointer" : "not-allowed",
                    opacity: cycle ? 1 : 0.4,
                    letterSpacing:"0.06em",
                    boxShadow:"0 4px 24px rgba(147,168,90,0.3)",
                    marginTop:8,
                  }}>
                  🍃 Release the Leaves
                </button>

                <a href="/admin/grass-draw"
                  style={{ fontSize:12, color:"rgba(240,239,234,0.3)", textDecoration:"none" }}>
                  ← Back to Admin
                </a>
              </div>
            )}

            {phase === "drawing" && (
              <div style={{ fontSize:14, color:"rgba(240,239,234,0.5)",
                animation:"shimmer 1s ease-in-out infinite" }}>
                Selecting winner…
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}