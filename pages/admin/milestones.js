import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.4)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

// Streak milestones to watch for
const STREAK_MILESTONES = [7, 14, 30, 50, 100, 180, 365, 500, 1000];

// Grass Score milestones
const SCORE_MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000];

// Field Guide collections
const FG_COLLECTIONS = [
  { slug:"skies",  name:"Skies",           icon:"🌤" },
  { slug:"plants", name:"Plants & Foliage", icon:"🌿" },
];

function getMondayAndSunday() {
  // Returns Monday 00:00 ET and Sunday 23:59:59 ET for the current week
  const now   = new Date();
  // Get current day in ET
  const etStr = now.toLocaleString("en-US", { timeZone:"America/New_York" });
  const et    = new Date(etStr);
  const day   = et.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(et);
  monday.setDate(et.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Convert back to UTC ISO for Supabase queries
  const toUTC = (localDate) => {
    const etOffset = getETOffset(localDate);
    return new Date(localDate.getTime() - etOffset).toISOString();
  };

  return {
    monday,
    sunday,
    mondayISO: toUTC(monday),
    sundayISO:  toUTC(sunday),
    label: `${monday.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${sunday.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`,
  };
}

function getETOffset(date) {
  // ET is UTC-5 (EST) or UTC-4 (EDT)
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  const stdOffset = Math.max(jan, jul);
  const isDST = date.getTimezoneOffset() < stdOffset;
  return isDST ? -4 * 60 * 60 * 1000 : -5 * 60 * 60 * 1000;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday:"short", month:"short", day:"numeric",
  });
}

function MilestoneGroup({ title, icon, color, items, emptyMsg }) {
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
          fontSize:22, fontWeight:700, color:T.white, margin:0 }}>{title}</h2>
        <div style={{ marginLeft:"auto", fontSize:11, fontWeight:700,
          color, background:`${color}18`,
          border:`1px solid ${color}40`,
          borderRadius:20, padding:"2px 10px" }}>
          {items.length} {items.length === 1 ? "user" : "users"}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
          borderRadius:12, padding:"24px 20px",
          textAlign:"center", fontSize:12, color:T.dim }}>
          {emptyMsg}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {items.map((item, i) => (
            <div key={i} style={{ background:T.bg2,
              border:`1px solid ${T.border}`,
              borderRadius:12, padding:"13px 16px",
              display:"flex", alignItems:"center",
              gap:12, flexWrap:"wrap" }}>
              {/* Rank */}
              <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:18, fontWeight:700,
                color:T.dim, width:24, flexShrink:0 }}>{i + 1}</div>

              {/* Username */}
              <Link href={`/u/${item.username}`} target="_blank"
                style={{ fontSize:14, fontWeight:700, color:T.white,
                  textDecoration:"none", flex:1, minWidth:100 }}
                onMouseEnter={e=>e.currentTarget.style.color=T.olive}
                onMouseLeave={e=>e.currentTarget.style.color=T.white}>
                @{item.username}
              </Link>

              {/* Milestone badge */}
              <div style={{ display:"flex", alignItems:"center", gap:7,
                background:`${color}10`,
                border:`1px solid ${color}35`,
                borderRadius:8, padding:"5px 12px", flexShrink:0 }}>
                <span style={{ fontSize:15 }}>{item.icon}</span>
                <span style={{ fontSize:12, fontWeight:700,
                  color, letterSpacing:"0.04em" }}>
                  {item.milestone}
                </span>
              </div>

              {/* Date */}
              {item.date && (
                <div style={{ fontSize:10, color:T.dim,
                  flexShrink:0, minWidth:70, textAlign:"right" }}>
                  {fmtDate(item.date)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminMilestones() {
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState("");
  const [loading,  setLoading]  = useState(false);
  const [week,     setWeek]     = useState(null);

  // Milestone buckets
  const [streakHits,   setStreakHits]   = useState([]);
  const [scoreHits,    setScoreHits]    = useState([]);
  const [fgHits,       setFgHits]       = useState([]);
  const [newUsers,     setNewUsers]     = useState([]);

  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const w = getMondayAndSunday();
    setWeek(w);

    try {
      // ── Fetch all submissions this week ──────────────────────────────────
      const { data: subs } = await supabase
        .from("Submissions")
        .select("username, created_at")
        .gte("created_at", w.mondayISO)
        .lte("created_at", w.sundayISO)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: true });

      const weekUsernames = [...new Set((subs || []).map(s => s.username))];

      if (!weekUsernames.length) {
        setStreakHits([]); setScoreHits([]); setFgHits([]); setNewUsers([]);
        setLoading(false);
        return;
      }

      // ── Fetch streak rows for all active users this week ─────────────────
      const { data: streakRows } = await supabase
        .from("Streaks")
        .select("username, current_streak, last_submission_date")
        .in("username", weekUsernames);

      // ── Fetch Grass Score for all active users ────────────────────────────
      const { data: profileRows } = await supabase
        .from("Profiles")
        .select("username, grass_score")
        .in("username", weekUsernames);

      // ── Fetch Field Guide completions this week ───────────────────────────
      const { data: fgRows } = await supabase
        .from("FieldGuideProgress")
        .select("username, collection_slug, completed_at, slots_filled")
        .in("username", weekUsernames)
        .not("completed_at", "is", null)
        .gte("completed_at", w.mondayISO)
        .lte("completed_at", w.sundayISO);

      // ── New users this week — first ever submission ───────────────────────
      // Users whose EARLIEST submission is within this week
      const { data: allFirstSubs } = await supabase
        .from("Streaks")
        .select("username, current_streak")
        .in("username", weekUsernames);

      // Find users who have current_streak matching days since Monday
      // More reliable: find users whose Streaks row was created this week
      // Best approach: find users with their very first submission this week
      const firstSubByUser = {};
      (subs || []).forEach(s => {
        if (!firstSubByUser[s.username]) firstSubByUser[s.username] = s.created_at;
      });

      // Cross-reference: users where their streak row shows low streak
      // and their first sub this week appears to be their first ever
      const streakMap = {};
      (streakRows || []).forEach(r => { streakMap[r.username] = r; });

      // ── Process streak milestones ─────────────────────────────────────────
      // A user "hit" a milestone this week if their current_streak equals
      // a milestone value AND their last_submission_date is within this week.
      const streakResults = [];
      (streakRows || []).forEach(row => {
        const streak = row.current_streak;
        const lastSub = row.last_submission_date;
        if (!lastSub) return;

        const lastSubDate = new Date(lastSub + "T12:00:00"); // noon to avoid TZ edge
        const isThisWeek = lastSubDate >= new Date(w.mondayISO)
          && lastSubDate <= new Date(w.sundayISO);

        if (!isThisWeek) return;

        // Check if current streak is at or crossed a milestone this week
        // We look for the highest milestone they've reached
        const hit = STREAK_MILESTONES.slice().reverse().find(m => streak >= m);
        if (!hit) return;

        // Only show if they likely crossed it this week:
        // their streak == milestone (hit it exactly) OR streak is within 6 of milestone
        // (accounting for shield use) and they're close
        const crossedThisWeek = STREAK_MILESTONES.some(m =>
          streak >= m && streak <= m + 6
        );
        if (!crossedThisWeek) return;

        const milestone = STREAK_MILESTONES.slice().reverse().find(m =>
          streak >= m && streak <= m + 6
        );
        if (!milestone) return;

        const tierIcons = {
          7:"🌱", 14:"💧", 30:"🌲", 50:"🌅",
          100:"💯", 180:"⚡", 365:"👑", 500:"🌌", 1000:"✨"
        };

        streakResults.push({
          username: row.username,
          milestone: `Day ${milestone} Streak`,
          icon: tierIcons[milestone] || "🔥",
          date: row.last_submission_date,
          streak,
        });
      });

      // Sort by milestone value desc
      streakResults.sort((a, b) => b.streak - a.streak);
      setStreakHits(streakResults);

      // ── Process Grass Score milestones ────────────────────────────────────
      const scoreResults = [];
      const profileMap = {};
      (profileRows || []).forEach(p => { profileMap[p.username] = p; });

      weekUsernames.forEach(u => {
        const score = profileMap[u]?.grass_score || 0;
        const hit = SCORE_MILESTONES.slice().reverse().find(m =>
          score >= m && score <= m * 1.15 // within 15% above milestone = crossed it recently
        );
        if (!hit) return;
        const scoreIcons = {
          1000:"🔥", 5000:"🔋", 10000:"⚡",
          25000:"💎", 50000:"🏆", 100000:"👑"
        };
        scoreResults.push({
          username: u,
          milestone: `${hit.toLocaleString()} Grass Score`,
          icon: scoreIcons[hit] || "⚡",
          date: firstSubByUser[u],
          score,
        });
      });

      scoreResults.sort((a, b) => b.score - a.score);
      setScoreHits(scoreResults);

      // ── Process Field Guide completions ───────────────────────────────────
      const fgResults = [];
      (fgRows || []).forEach(row => {
        const col = FG_COLLECTIONS.find(c => c.slug === row.collection_slug);
        if (!col) return;
        fgResults.push({
          username: row.username,
          milestone: `${col.name} Complete`,
          icon: col.icon,
          date: row.completed_at,
        });
      });
      fgResults.sort((a, b) => new Date(b.date) - new Date(a.date));
      setFgHits(fgResults);

      // ── New users — streak of 1–7 with first sub this week ───────────────
      const newUserResults = [];
      weekUsernames.forEach(u => {
        const row = streakMap[u];
        if (!row) return;
        // New user = streak 1-7 AND appears to have started this week
        // We check: their current_streak <= 7 and their streak count ≈ days since they started
        if (row.current_streak <= 7) {
          newUserResults.push({
            username: u,
            milestone: row.current_streak === 1
              ? "First Day 🎉"
              : `Day ${row.current_streak}`,
            icon: "🌱",
            date: firstSubByUser[u],
            streak: row.current_streak,
          });
        }
      });
      newUserResults.sort((a, b) => new Date(a.date) - new Date(b.date));
      setNewUsers(newUserResults);

    } catch(e) {
      console.error(e);
      setError(e.message || "Failed to load milestones.");
    }
    setLoading(false);
  };

  useEffect(() => { if (authed) load(); }, [authed]);

  if (!authed) return (
    <div style={{ minHeight:"100vh", background:T.bg,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
        borderRadius:14, padding:"32px 28px",
        width:"100%", maxWidth:340, textAlign:"center" }}>
        <div style={{ fontSize:28, marginBottom:12 }}>🏆</div>
        <div style={{ fontFamily:"monospace", fontSize:14,
          color:T.muted, marginBottom:20 }}>Milestones Admin</div>
        <input type="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter" && pw===ADMIN_PASSWORD) setAuthed(true); }}
          placeholder="Password"
          style={{ width:"100%", background:"rgba(0,0,0,0.3)",
            border:`1px solid ${T.border}`, borderRadius:8,
            padding:"10px 12px", color:T.white, fontSize:13,
            outline:"none", marginBottom:12, boxSizing:"border-box" }} />
        <button onClick={() => { if(pw===ADMIN_PASSWORD) setAuthed(true); }}
          style={{ width:"100%", background:T.olive, color:"#0a0c08",
            border:"none", borderRadius:8, padding:"11px",
            fontSize:13, fontWeight:700, cursor:"pointer" }}>
          Enter
        </button>
        {error && <div style={{ fontSize:11, color:"#ef4444", marginTop:8 }}>{error}</div>}
      </div>
    </div>
  );

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html:css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>
        <div style={{ maxWidth:860, margin:"0 auto",
          padding:"32px 16px 80px" }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"flex-start",
            justifyContent:"space-between", marginBottom:32,
            flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:10, letterSpacing:"0.2em",
                textTransform:"uppercase", color:T.olive,
                fontWeight:600, marginBottom:8 }}>Admin</div>
              <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                fontSize:"clamp(28px,5vw,40px)", fontWeight:700,
                color:T.white, lineHeight:1, marginBottom:8 }}>
                Weekly Milestones
              </h1>
              {week && (
                <div style={{ fontSize:13, color:T.dim }}>
                  📅 {week.label}
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center",
              flexWrap:"wrap" }}>
              <button onClick={load} disabled={loading}
                style={{ background:"transparent",
                  border:`1px solid ${T.borderG}`,
                  color:T.olive, borderRadius:8,
                  padding:"9px 18px", fontSize:12,
                  cursor:"pointer", fontFamily:"monospace",
                  opacity:loading?0.5:1 }}>
                {loading ? "⟳ Loading…" : "↻ Refresh"}
              </button>
              <Link href="/admin/burns"
                style={{ fontSize:11, color:T.dim,
                  textDecoration:"none" }}>
                ← Burns Admin
              </Link>
            </div>
          </div>

          {error && (
            <div style={{ background:"rgba(239,68,68,0.08)",
              border:"1px solid rgba(239,68,68,0.3)", borderRadius:10,
              padding:"12px 16px", fontSize:12, color:"#ef4444",
              marginBottom:24 }}>{error}</div>
          )}

          {loading ? (
            <div style={{ textAlign:"center", padding:"60px 0",
              color:T.dim, fontSize:13, fontFamily:"monospace",
              letterSpacing:"0.08em" }}>
              ⟳ Scanning this week's activity…
            </div>
          ) : (
            <>
              {/* Streak milestones */}
              <MilestoneGroup
                title="Streak Milestones"
                icon="🔥"
                color={T.gold}
                items={streakHits}
                emptyMsg="No streak milestones hit this week yet."
              />

              {/* Grass Score milestones */}
              <MilestoneGroup
                title="Grass Score Milestones"
                icon="⚡"
                color={T.olive}
                items={scoreHits}
                emptyMsg="No Grass Score milestones hit this week yet."
              />

              {/* Field Guide completions */}
              <MilestoneGroup
                title="Field Guide Collections Completed"
                icon="📖"
                color="#67e8f9"
                items={fgHits}
                emptyMsg="No Field Guide collections completed this week yet."
              />

              {/* Divider */}
              <div style={{ height:1, background:T.border,
                margin:"8px 0 32px" }} />

              {/* New users — separate section */}
              <div style={{ background:"rgba(147,168,90,0.04)",
                border:`1px solid ${T.borderG}`,
                borderRadius:14, padding:"20px 20px 24px" }}>
                <div style={{ display:"flex", alignItems:"center",
                  gap:10, marginBottom:16 }}>
                  <span style={{ fontSize:20 }}>🌱</span>
                  <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:22, fontWeight:700, color:T.white, margin:0 }}>
                    New This Week
                  </h2>
                  <div style={{ marginLeft:"auto", fontSize:11,
                    fontWeight:700, color:T.olive,
                    background:"rgba(147,168,90,0.1)",
                    border:`1px solid ${T.borderG}`,
                    borderRadius:20, padding:"2px 10px" }}>
                    {newUsers.length} {newUsers.length===1?"user":"users"}
                  </div>
                </div>
                <div style={{ fontSize:11, color:T.dim,
                  marginBottom:14, lineHeight:1.6 }}>
                  Users with streaks of 1–7 who submitted this week.
                  These are your newest community members.
                </div>
                {newUsers.length === 0 ? (
                  <div style={{ fontSize:12, color:T.dim,
                    textAlign:"center", padding:"16px 0" }}>
                    No new users detected this week.
                  </div>
                ) : (
                  <div style={{ display:"grid",
                    gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
                    gap:8 }}>
                    {newUsers.map((u, i) => (
                      <Link key={i} href={`/u/${u.username}`} target="_blank"
                        style={{ display:"flex", alignItems:"center",
                          gap:9, padding:"10px 12px",
                          background:T.bg2,
                          border:`1px solid ${T.border}`,
                          borderRadius:10, textDecoration:"none",
                          transition:"border-color 0.15s" }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=T.olive}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                        <span style={{ fontSize:16 }}>🌱</span>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700,
                            color:T.white, overflow:"hidden",
                            textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            @{u.username}
                          </div>
                          <div style={{ fontSize:10, color:T.olive }}>
                            {u.milestone}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary footer */}
              <div style={{ marginTop:32, padding:"16px 20px",
                background:T.bg2, border:`1px solid ${T.border}`,
                borderRadius:12, display:"flex",
                gap:24, flexWrap:"wrap" }}>
                {[
                  ["🔥 Streak Hits",    streakHits.length],
                  ["⚡ Score Hits",      scoreHits.length],
                  ["📖 Field Guide",     fgHits.length],
                  ["🌱 New Users",       newUsers.length],
                  ["Total Milestones",   streakHits.length + scoreHits.length + fgHits.length],
                ].map(([label, val]) => (
                  <div key={label} style={{ textAlign:"center",
                    flex:"1 1 80px" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                      fontSize:26, fontWeight:700, color:T.white,
                      lineHeight:1 }}>{val}</div>
                    <div style={{ fontSize:9, color:T.dim,
                      textTransform:"uppercase", letterSpacing:"0.1em",
                      marginTop:4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}