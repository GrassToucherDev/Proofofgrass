import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

const T = {
  bg:"#0a0b08", bg2:"#111209", bg3:"#181a12",
  border:"rgba(255,255,255,0.06)", borderG:"rgba(147,168,90,0.18)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.48)", dim:"rgba(240,239,234,0.22)",
  red:"#ef4444", green:"#4ade80",
};

function norm(v) { return String(v??"").replace(/@/g,"").toLowerCase().trim(); }

function getTier(n) {
  if (n>=100) return { label:"IMMORTAL",  color:"#f97316" };
  if (n>=50)  return { label:"LEGENDARY", color:T.gold    };
  if (n>=30)  return { label:"ELITE",     color:"#c084fc" };
  if (n>=14)  return { label:"LOCKED IN", color:T.olive   };
  if (n>=7)   return { label:"ROOTED",    color:"#b8c87a" };
  return       { label:"GROWING",  color:"#a0b870" };
}

function StatusBadge({ status }) {
  const map = {
    active:    { label:"ACTIVE",    bg:"rgba(147,168,90,0.15)",  color:T.olive },
    completed: { label:"COMPLETED", bg:"rgba(200,168,75,0.15)",  color:T.gold  },
    failed:    { label:"FAILED",    bg:"rgba(239,68,68,0.12)",   color:T.red   },
    pending:   { label:"PENDING",   bg:"rgba(255,255,255,0.08)", color:T.dim   },
    declined:  { label:"DECLINED",  bg:"rgba(239,68,68,0.10)",   color:T.red   },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em",
      textTransform:"uppercase", color:s.color, background:s.bg,
      border:`1px solid ${s.color}40`, borderRadius:4, padding:"3px 8px" }}>
      {s.label}
    </span>
  );
}

function ParticipantCard({ username, progress, streakRow, duration }) {
  const pct   = duration > 0 ? Math.min(100, Math.round((progress.days_complete / duration) * 100)) : 0;
  const done  = progress.status === "completed";
  const failed= progress.status === "failed";
  const tier  = getTier(streakRow?.current_streak ?? 0);

  return (
    <div style={{ flex:"1 1 0", minWidth:0, background:T.bg3,
      border:`1px solid ${done ? T.gold : failed ? T.red : T.border}`,
      borderRadius:14, padding:20,
      boxShadow: done ? `0 0 24px ${T.gold}18` : "none" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <Link href={`/u/${username}`} style={{ textDecoration:"none",
          display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:"50%",
            background:`linear-gradient(135deg,${T.bg2},${T.olive}30)`,
            border:`1.5px solid ${tier.color}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, fontWeight:700, color:T.white,
            fontFamily:"'Cormorant Garamond',Georgia,serif" }}>
            {username[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:T.white }}>@{username}</div>
            <div style={{ fontSize:9, color:tier.color, letterSpacing:"0.1em",
              textTransform:"uppercase", fontWeight:700 }}>{tier.label}</div>
          </div>
        </Link>
        <div style={{ fontSize:28, lineHeight:1 }}>
          {done ? "✅" : failed ? "❌" : "🔥"}
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"baseline", marginBottom:6 }}>
          <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:32, fontWeight:700, color: done ? T.gold : failed ? T.red : T.white,
            lineHeight:1 }}>
            {progress.days_complete}
            <span style={{ fontSize:16, color:T.dim, fontWeight:400 }}>/{duration}</span>
          </span>
          <span style={{ fontSize:11, color:T.dim }}>days</span>
        </div>
        <div style={{ height:4, background:"rgba(255,255,255,0.08)",
          borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
            background: done
              ? `linear-gradient(90deg,${T.olive},${T.gold})`
              : failed
              ? T.red
              : `linear-gradient(90deg,${T.olive},${T.gold})`,
            transition:"width 1s ease" }} />
        </div>
      </div>

      {/* Streak */}
      <div style={{ fontSize:11, color:T.dim }}>
        Main streak: <span style={{ color:T.white, fontWeight:600 }}>
          {streakRow?.current_streak ?? 0}d
        </span>
      </div>
      {progress.shield_used && (
        <div style={{ fontSize:10, color:T.gold, marginTop:4 }}>🛡 Shield used</div>
      )}
    </div>
  );
}

export default function ChallengePage() {
  const router = useRouter();
  const { challengeId } = router.query;

  const [challenge, setChallenge]  = useState(null);
  const [progress,  setProgress]   = useState([]);
  const [streaks,   setStreaks]     = useState({});
  const [events,    setEvents]      = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [viewer,    setViewer]      = useState("");
  const [accepting, setAccepting]   = useState(false);
  const [declining, setDeclining]   = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("pog_username") : null;
    if (saved) setViewer(norm(saved));
  }, []);

  useEffect(() => {
    if (!challengeId) return;
    (async () => {
      setLoading(true);

      const { data: ch } = await supabase
        .from("Challenges").select("*").eq("slug", challengeId).maybeSingle();
      if (!ch) { setLoading(false); return; }
      setChallenge(ch);

      const [{ data: prog }, { data: evts }] = await Promise.all([
        supabase.from("ChallengeProgress").select("*").eq("challenge_id", ch.id),
        supabase.from("ChallengeEvents").select("*").eq("challenge_id", ch.id).order("created_at", { ascending: false }).limit(20),
      ]);

      // Fetch streak rows for both participants
      const users = [ch.challenger, ch.challenged];
      const [{ data: sRows }, { data: chalSubs1 }, { data: chalSubs2 }] = await Promise.all([
        supabase.from("Streaks").select("username,current_streak,best_streak").in("username", users),
        // Count actual submissions since challenge started for challenger
        ch.started_at ? supabase.from("Submissions")
          .select("created_at")
          .eq("username", ch.challenger)
          .in("status", ["pending","approved"])
          .gte("created_at", ch.started_at) : Promise.resolve({ data: [] }),
        // Count actual submissions since challenge started for challenged
        ch.started_at ? supabase.from("Submissions")
          .select("created_at")
          .eq("username", ch.challenged)
          .in("status", ["pending","approved"])
          .gte("created_at", ch.started_at) : Promise.resolve({ data: [] }),
      ]);

      // Count unique days submitted since challenge start
      const countUniqueDays = (subs) => {
        const days = new Set((subs ?? []).map(s => s.created_at.slice(0, 10)));
        return days.size;
      };

      const challDays = countUniqueDays(chalSubs1);
      const challedDays = countUniqueDays(chalSubs2);

      // Merge progress — use actual submission count if days_complete is lower
      const mergedProg = (prog ?? []).map(p => {
        const actualDays = norm(p.username) === norm(ch.challenger) ? challDays : challedDays;
        return {
          ...p,
          days_complete: Math.max(p.days_complete ?? 0, actualDays),
        };
      });

      // If no progress rows exist yet, create them from actual data
      if (mergedProg.length === 0 && ch.started_at) {
        mergedProg.push(
          { username: ch.challenger, days_complete: challDays,  status:"active", challenge_id: ch.id },
          { username: ch.challenged, days_complete: challedDays, status:"active", challenge_id: ch.id },
        );
      }

      setProgress(mergedProg);
      setEvents(evts ?? []);

      const sm = {};
      (sRows ?? []).forEach(r => { sm[norm(r.username)] = r; });
      setStreaks(sm);
      setLoading(false);
    })();
  }, [challengeId]);

  const handleAccept = async () => {
    if (!challenge) return;
    setAccepting(true);
    const now     = new Date().toISOString();
    const endsAt  = new Date(Date.now() + challenge.duration_days * 86400000).toISOString();

    await supabase.from("Challenges").update({
      status: "active", started_at: now, ends_at: endsAt,
    }).eq("id", challenge.id);

    await supabase.from("ChallengeProgress").upsert([
      { challenge_id: challenge.id, username: challenge.challenger, days_complete: 0, status: "active" },
      { challenge_id: challenge.id, username: challenge.challenged, days_complete: 0, status: "active" },
    ], { onConflict: "challenge_id,username" });

    await supabase.from("ChallengeEvents").insert([
      { challenge_id: challenge.id, username: viewer, event_type: "accepted" },
    ]);

    router.reload();
  };

  const handleDecline = async () => {
    if (!challenge) return;
    setDeclining(true);
    await supabase.from("Challenges").update({ status: "declined" }).eq("id", challenge.id);
    await supabase.from("ChallengeEvents").insert([
      { challenge_id: challenge.id, username: viewer, event_type: "declined" },
    ]);
    router.reload();
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontSize:13, color:T.dim, letterSpacing:"0.1em" }}>Loading challenge…</div>
    </div>
  );

  if (!challenge) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:13, color:T.dim }}>Challenge not found.</div>
      <Link href="/" style={{ fontSize:12, color:T.olive, textDecoration:"none" }}>← Back to App</Link>
    </div>
  );

  const chalProgress   = progress.find(p => norm(p.username) === norm(challenge.challenger));
  const challdProgress = progress.find(p => norm(p.username) === norm(challenge.challenged));
  const daysRemaining  = challenge.ends_at
    ? Math.max(0, Math.ceil((new Date(challenge.ends_at) - Date.now()) / 86400000))
    : challenge.duration_days;
  const daysElapsed = challenge.status === "active" && challenge.started_at
    ? Math.floor((Date.now() - new Date(challenge.started_at)) / 86400000)
    : 0;
  const isParticipant = viewer === norm(challenge.challenger) || viewer === norm(challenge.challenged);
  const isPending     = challenge.status === "pending";
  const isForViewer   = isPending && viewer === norm(challenge.challenged);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const copyLink = () => navigator.clipboard.writeText(shareUrl).catch(() => {});

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    .btn-olive{background:${T.olive};border:none;border-radius:8px;padding:12px 24px;color:#0e1108;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:6px;}
    .btn-olive:hover{background:#a8be6a;transform:translateY(-1px);}
    .btn-ghost{background:transparent;border:1px solid ${T.border};border-radius:8px;padding:12px 24px;color:${T.white};font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.08em;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:6px;}
    .btn-ghost:hover{border-color:${T.olive};color:${T.olive};}
    .btn-red{background:transparent;border:1px solid ${T.red}40;border-radius:8px;padding:12px 24px;color:${T.red};font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;}
    .btn-red:hover{border-color:${T.red};background:rgba(239,68,68,0.06);}
    .nav-lk{color:${T.dim};font-size:13px;font-weight:500;text-decoration:none;transition:color 0.2s;}
    .nav-lk:hover{color:${T.white};}
    @media(max-width:640px){
      .parts{flex-direction:column!important;}
      .nav-links{display:none!important;}
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:200, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:26, height:26, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>
          <div className="nav-links" style={{ display:"flex", gap:24 }}>
            <Link href="/" className="nav-lk">Dashboard</Link>
            <Link href="/leaderboard" className="nav-lk">Leaderboard</Link>
          </div>
          <button onClick={copyLink} style={{ fontSize:11, color:T.olive,
            background:"transparent", border:`1px solid ${T.borderG}`,
            borderRadius:6, padding:"6px 12px", cursor:"pointer", flexShrink:0 }}>
            ↗ Share
          </button>
        </nav>

        <div style={{ padding:"40px clamp(14px,5vw,64px)", maxWidth:860, margin:"0 auto" }}>

          {/* HEADER */}
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.olive,
              textTransform:"uppercase", marginBottom:10, fontWeight:600 }}>
              {challenge.duration_days}-Day Challenge
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16,
              flexWrap:"wrap", marginBottom:12 }}>
              <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(32px,5vw,56px)", fontWeight:700, color:T.white,
                lineHeight:1, letterSpacing:"-0.02em" }}>
                @{challenge.challenger} vs @{challenge.challenged}
              </h1>
              <StatusBadge status={challenge.status} />
            </div>
            {challenge.message && (
              <p style={{ fontSize:14, color:T.muted, fontStyle:"italic",
                borderLeft:`2px solid ${T.olive}`, paddingLeft:14, lineHeight:1.7 }}>
                "{challenge.message}"
              </p>
            )}
          </div>

          {/* ACCEPT / DECLINE — only for challenged user when pending */}
          {isForViewer && (
            <div style={{ background:T.bg2, border:`1px solid ${T.borderG}`,
              borderRadius:14, padding:24, marginBottom:24,
              display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ fontSize:13, color:T.muted }}>
                <strong style={{ color:T.white }}>@{challenge.challenger}</strong> challenged you to a {challenge.duration_days}-day outdoor streak. Do you accept?
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <button className="btn-olive" onClick={handleAccept} disabled={accepting}>
                  {accepting ? "Accepting…" : "✓ Accept Challenge"}
                </button>
                <button className="btn-red" onClick={handleDecline} disabled={declining}>
                  {declining ? "Declining…" : "Decline"}
                </button>
              </div>
            </div>
          )}

          {/* COUNTDOWN — active challenges */}
          {challenge.status === "active" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
              gap:12, marginBottom:24 }}>
              {[
                { label:"Day", value: daysElapsed + 1, sub:`of ${challenge.duration_days}` },
                { label:"Remaining", value: daysRemaining, sub:"days left" },
                { label:"Progress", value:`${Math.round((daysElapsed/challenge.duration_days)*100)}%`, sub:"complete" },
              ].map(s => (
                <div key={s.label} style={{ background:T.bg2, border:`1px solid ${T.border}`,
                  borderRadius:12, padding:"18px 14px", textAlign:"center" }}>
                  <div style={{ fontSize:9, letterSpacing:"0.14em", color:T.dim,
                    textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:36, fontWeight:700, color:T.white, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10, color:T.dim, marginTop:4 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* PARTICIPANTS */}
          {(challenge.status === "active" || challenge.status === "completed" || challenge.status === "failed") && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.muted, marginBottom:14 }}>
                Participants
              </div>
              <div className="parts" style={{ display:"flex", gap:14, marginBottom:24 }}>
                {chalProgress && (
                  <ParticipantCard
                    username={challenge.challenger}
                    progress={chalProgress}
                    streakRow={streaks[norm(challenge.challenger)]}
                    duration={challenge.duration_days}
                  />
                )}
                {challdProgress && (
                  <ParticipantCard
                    username={challenge.challenged}
                    progress={challdProgress}
                    streakRow={streaks[norm(challenge.challenged)]}
                    duration={challenge.duration_days}
                  />
                )}
              </div>
            </div>
          )}

          {/* COMPLETED */}
          {challenge.status === "completed" && (
            <div style={{ background:`${T.gold}0e`, border:`1px solid ${T.gold}40`,
              borderRadius:14, padding:24, textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🏆</div>
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:28, fontWeight:700, color:T.gold, marginBottom:6 }}>
                Challenge Complete
              </div>
              <div style={{ fontSize:13, color:T.muted }}>
                Both users stayed consistent for {challenge.duration_days} days.
              </div>
            </div>
          )}

          {/* FAILED */}
          {challenge.status === "failed" && (
            <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.25)",
              borderRadius:14, padding:24, textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:13, color:T.red, fontWeight:600, marginBottom:4 }}>
                Challenge Ended
              </div>
              <div style={{ fontSize:12, color:T.dim }}>A participant missed a day.</div>
            </div>
          )}

          {/* DECLINED */}
          {challenge.status === "declined" && (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
              borderRadius:14, padding:24, textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:13, color:T.dim }}>This challenge was declined.</div>
            </div>
          )}

          {/* PENDING (not the challenged user) */}
          {isPending && !isForViewer && (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
              borderRadius:14, padding:24, marginBottom:24 }}>
              <div style={{ fontSize:13, color:T.muted }}>
                Waiting for <strong style={{ color:T.white }}>@{challenge.challenged}</strong> to accept.
              </div>
            </div>
          )}

          {/* ACTIVITY LOG */}
          {events.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.muted, marginBottom:14 }}>
                Activity
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {events.map(e => (
                  <div key={e.id} style={{ display:"flex", alignItems:"center",
                    gap:10, padding:"10px 14px", background:T.bg2,
                    border:`1px solid ${T.border}`, borderRadius:10 }}>
                    <span style={{ fontSize:16 }}>
                      {{ sent:"📤", accepted:"✅", declined:"❌", day_logged:"🌿",
                         missed:"💨", shield_used:"🛡", completed:"🏆", failed:"❌"
                       }[e.event_type] ?? "◎"}
                    </span>
                    <div>
                      <span style={{ fontSize:12, color:T.white, fontWeight:500 }}>
                        {e.username ? `@${e.username}` : "System"}
                      </span>
                      <span style={{ fontSize:12, color:T.dim }}> · {e.event_type.replace(/_/g," ")}</span>
                    </div>
                    <span style={{ marginLeft:"auto", fontSize:10, color:T.dim }}>
                      {new Date(e.created_at).toLocaleDateString("en-US",{ month:"short", day:"numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer style={{ borderTop:`1px solid ${T.border}`, padding:"18px clamp(14px,4vw,48px)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:12, background:T.bg, marginTop:40 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:15, height:15, opacity:0.4 }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:12, color:T.dim }}>touch grass © 2024</span>
          </div>
          <div style={{ display:"flex", gap:20 }}>
            {[["Dashboard","/"],["Leaderboard","/leaderboard"]].map(([l,h])=>(
              <Link key={l} href={h} style={{ fontSize:10, color:T.dim, textDecoration:"none", letterSpacing:"0.08em", textTransform:"uppercase" }}>{l}</Link>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}