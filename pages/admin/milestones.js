import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabase";

// ─── Design tokens (match admin/stats.js exactly) ────────────────────────────
const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710", bg4:"#1a1e13",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  olive:"#93a85a", oliveDim:"rgba(147,168,90,0.45)",
  gold:"#c8a84b", goldDim:"rgba(200,168,75,0.4)",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
  red:"#f87171", purple:"#a78bfa",
};

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

// ─── Milestone config ─────────────────────────────────────────────────────────
const MILESTONES = [10, 20, 30, 50, 75, 100, 180, 365, 500];

// All known source_id prefixes for milestone events (legacy + v2)
// These are detected from ScoreEvents.source_id patterns:
//   milestone_day_N       (legacy, days 10/20/30/50/75/100)
//   milestone_v2_day_N    (v2, days 7/14/30/50/100/365)
// We match by extracting the trailing number and mapping to milestone days.
function extractMilestoneDay(sourceId) {
  if (!sourceId) return null;
  const m = sourceId.match(/(?:milestone_(?:v2_)?day_)(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}
function getSundayOf(date) {
  const monday = getMondayOf(date);
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}
function thisWeekRange() {
  const today = new Date().toISOString().slice(0, 10);
  return { from: getMondayOf(today), to: getSundayOf(today) };
}
function lastWeekRange() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  const lastWeek = d.toISOString().slice(0, 10);
  return { from: getMondayOf(lastWeek), to: getSundayOf(lastWeek) };
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC"
  });
}
function milestoneLabel(day) {
  const labels = {
    10:"Day 10", 20:"Day 20", 30:"Day 30", 50:"Day 50",
    75:"Day 75", 100:"Day 100", 180:"Day 180", 365:"Day 365", 500:"Day 500"
  };
  return labels[day] ?? `Day ${day}`;
}
function milestoneColor(day) {
  if (day >= 365) return T.purple;
  if (day >= 100) return T.gold;
  if (day >= 50)  return "#f97316";
  if (day >= 30)  return T.olive;
  return T.muted;
}

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportCSV(rows) {
  const headers = ["username","milestone","date_hit","current_streak","best_streak","grass_score","reward_status","notes"];
  const lines = [
    headers.join(","),
    ...rows.map(r => [
      r.username,
      `Day ${r.milestone}`,
      r.milestone_date,
      r.current_streak ?? "",
      r.best_streak ?? "",
      r.grass_score ?? "",
      r.status,
      `"${(r.notes ?? "").replace(/"/g, '""')}"`,
    ].join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type:"text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `milestone-report-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    pending: { bg:"rgba(200,168,75,0.12)", color:T.gold,   border:"rgba(200,168,75,0.3)",  label:"Pending" },
    paid:    { bg:"rgba(147,168,90,0.12)", color:T.olive,  border:"rgba(147,168,90,0.3)",  label:"Paid"    },
    skipped: { bg:"rgba(240,239,234,0.06)", color:T.dim,   border:"rgba(255,255,255,0.1)", label:"Skipped" },
  };
  const s = styles[status] ?? styles.pending;
  return (
    <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
      padding:"3px 8px", borderRadius:4, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminMilestones() {
  const [authed,      setAuthed]      = useState(false);
  const [pw,          setPw]          = useState("");
  const [pwError,     setPwError]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [rows,        setRows]        = useState([]);
  const [filter,      setFilter]      = useState("this_week"); // 'this_week'|'last_week'|'custom'
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");
  const [milFilter,   setMilFilter]   = useState("all"); // 'all' | '10' | '30' etc
  const [statusFilter,setStatusFilter]= useState("all"); // 'all'|'pending'|'paid'|'skipped'
  const [saving,      setSaving]      = useState({}); // {[id]: true} while saving
  const [noteEditing, setNoteEditing] = useState({}); // {[id]: draftText}

  const checkPw = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(""); }
    else setPwError("Incorrect password.");
  };

  const dateRange = useCallback(() => {
    if (filter === "this_week") return thisWeekRange();
    if (filter === "last_week") return lastWeekRange();
    return { from: customFrom, to: customTo };
  }, [filter, customFrom, customTo]);

  const loadData = useCallback(async () => {
    const { from, to } = dateRange();
    if (!from || !to) return;
    setLoading(true);

    try {
      // 1. Find users who hit a streak milestone this week.
      //
      //    Source of truth: Streaks table.
      //    A user "hit milestone M this week" if:
      //      - Their current_streak >= M (they've reached it)
      //      - The date they crossed M falls within the report range
      //      - Date crossed = last_submission_date - (current_streak - M) days
      //
      //    This correctly handles users mid-streak (e.g. current=79, milestone=50:
      //    they crossed Day 50 on last_submission_date - 29 days ago).
      //    If that date falls outside the report range, they're excluded.
      //
      //    Also catches users whose streak == milestone exactly today (just hit it).
      //    Does NOT use ScoreEvents timestamps (which may reflect backfill dates).
      //    Does NOT use submission counts (which ignore streak consecutiveness).

      const { data: allActiveStreaks } = await supabase
        .from("Streaks")
        .select("username, current_streak, best_streak, last_submission_date")
        .gte("current_streak", MILESTONES[0]); // only users with streak >= lowest milestone

      const milestoneEvents = [];
      const seen = new Set();

      for (const s of (allActiveStreaks ?? [])) {
        const lastDate = new Date(s.last_submission_date + "T00:00:00.000Z");
        const current  = s.current_streak;

        for (const milestone of MILESTONES) {
          if (current < milestone) continue; // hasn't reached this milestone

          // Calculate the date they crossed this milestone:
          // They were at (current) streak on last_submission_date,
          // so they were at (milestone) streak (current - milestone) days earlier.
          const daysAgo = current - milestone;
          const hitDate = new Date(lastDate);
          hitDate.setUTCDate(hitDate.getUTCDate() - daysAgo);
          const hitDateStr = hitDate.toISOString().slice(0, 10);

          // Check if hit date falls within the report range
          if (hitDateStr < from || hitDateStr > to) continue;

          const key = `${s.username}:${milestone}`;
          if (seen.has(key)) continue;
          seen.add(key);

          milestoneEvents.push({
            username:       s.username,
            milestone:      milestone,
            milestone_date: hitDateStr,
          });
        }
      }

      // 2. Fetch profile/streak data for all relevant users
      const usernames = [...new Set(milestoneEvents.map(e => e.username))];
      const [{ data: profiles }, { data: streaks }] = await Promise.all([
        supabase.from("Profiles").select("username,grass_score").in("username", usernames),
        supabase.from("Streaks").select("username,current_streak,best_streak").in("username", usernames),
      ]);

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.username, p]));
      const streakMap  = Object.fromEntries((streaks  ?? []).map(s => [s.username, s]));

      // 3. Fetch or create WeeklyRewardClaims rows for each milestone event
      const weekStart = getMondayOf(from);
      const weekEnd   = getSundayOf(to);

      // Upsert claims for newly detected milestones (insert if not exists)
      for (const e of milestoneEvents) {
        await supabase.from("WeeklyRewardClaims").upsert({
          username:          e.username,
          milestone:         e.milestone,
          milestone_date:    e.milestone_date,
          reward_week_start: weekStart,
          reward_week_end:   weekEnd,
          status:            "pending",
        }, { onConflict: "username,milestone,milestone_date", ignoreDuplicates: true });
      }

      // 4. Fetch all WeeklyRewardClaims for this period (includes previously-set statuses)
      const { data: claims } = await supabase
        .from("WeeklyRewardClaims")
        .select("*")
        .in("username", usernames)
        .gte("milestone_date", from)
        .lte("milestone_date", to)
        .order("milestone_date", { ascending: false });

      // 5. Merge everything into display rows
      const displayRows = (claims ?? [])
        .filter(c => MILESTONES.includes(c.milestone))
        .map(c => ({
          ...c,
          current_streak: streakMap[c.username]?.current_streak ?? null,
          best_streak:    streakMap[c.username]?.best_streak    ?? null,
          grass_score:    profileMap[c.username]?.grass_score   ?? null,
        }))
        .sort((a, b) => b.milestone - a.milestone || a.username.localeCompare(b.username));

      setRows(displayRows);
    } catch(e) {
      console.error("Milestone report error:", e);
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  const updateClaim = async (id, updates) => {
    setSaving(s => ({ ...s, [id]: true }));
    await supabase.from("WeeklyRewardClaims")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    setSaving(s => { const n = { ...s }; delete n[id]; return n; });
  };

  const setStatus = (id, status) => updateClaim(id, { status });
  const saveNote  = async (id) => {
    const note = noteEditing[id] ?? "";
    await updateClaim(id, { notes: note });
    setNoteEditing(s => { const n = { ...s }; delete n[id]; return n; });
  };

  // Apply client-side filters
  const filteredRows = rows.filter(r => {
    if (milFilter !== "all" && r.milestone !== parseInt(milFilter)) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    input,select,textarea{font-family:'DM Sans',sans-serif;}
    .btn{border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;
      font-size:11px;letter-spacing:0.06em;border-radius:6px;transition:opacity 0.15s;}
    .btn:hover{opacity:0.8;}
    .btn:disabled{opacity:0.4;cursor:default;}
    table{border-collapse:collapse;width:100%;}
    th{text-align:left;font-size:9px;font-weight:700;letter-spacing:0.16em;
      text-transform:uppercase;color:${T.dim};padding:10px 14px;
      border-bottom:1px solid ${T.border};white-space:nowrap;}
    td{padding:12px 14px;border-bottom:1px solid ${T.border};vertical-align:top;font-size:12px;}
    tr:last-child td{border-bottom:none;}
    tr:hover td{background:rgba(255,255,255,0.018);}
    .filter-btn{background:transparent;border:1px solid ${T.border};color:${T.dim};
      padding:7px 16px;border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;
      font-size:11px;font-weight:600;letter-spacing:0.08em;transition:all 0.15s;}
    .filter-btn.active{background:${T.olive};color:#0e1108;border-color:${T.olive};}
    .filter-btn:hover:not(.active){border-color:${T.olive};color:${T.olive};}
    input[type=date]{background:${T.bg3};border:1px solid ${T.border};color:${T.white};
      padding:7px 10px;border-radius:6px;font-size:12px;outline:none;}
    input[type=date]:focus{border-color:${T.olive};}
    select.sel{background:${T.bg3};border:1px solid ${T.border};color:${T.white};
      padding:7px 10px;border-radius:6px;font-size:11px;outline:none;cursor:pointer;}
    textarea.note-input{background:${T.bg3};border:1px solid ${T.border};color:${T.white};
      padding:6px 8px;border-radius:6px;font-size:11px;resize:vertical;outline:none;width:100%;
      min-height:48px;}
    textarea.note-input:focus{border-color:${T.olive};}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
  `;

  // ── Auth gate ─────────────────────────────────────────────────────────────────
  if (!authed) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
        alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ background:T.bg2, border:`1px solid ${T.borderG}`, borderRadius:16,
          padding:"40px 36px", width:"100%", maxWidth:360, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🌿</div>
          <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22,
            fontWeight:700, color:T.white, marginBottom:4 }}>Admin Access</div>
          <div style={{ fontSize:12, color:T.dim, marginBottom:28 }}>Weekly Milestone Report</div>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && checkPw()}
            placeholder="Admin password"
            style={{ width:"100%", background:T.bg3, border:`1px solid ${T.border}`,
              color:T.white, padding:"11px 14px", borderRadius:8, fontSize:13,
              outline:"none", marginBottom:12 }} />
          {pwError && <div style={{ fontSize:11, color:T.red, marginBottom:10 }}>{pwError}</div>}
          <button onClick={checkPw} className="btn"
            style={{ width:"100%", padding:"12px", background:T.olive, color:"#0e1108", fontSize:13 }}>
            Enter
          </button>
          <div style={{ fontSize:10, color:T.dim, marginTop:16 }}>
            Set NEXT_PUBLIC_ADMIN_PASSWORD in .env.local
          </div>
        </div>
      </div>
    </>
  );

  // ── Authed view ───────────────────────────────────────────────────────────────
  const { from, to } = dateRange();
  const pendingCount = rows.filter(r => r.status === "pending").length;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}`, gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>🌿</span>
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17,
              fontWeight:700, color:T.white }}>Proof of Grass</span>
            <span style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em",
              textTransform:"uppercase", marginLeft:4 }}>/ Admin</span>
          </div>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <a href="/admin/stats" style={{ fontSize:12, color:T.dim, textDecoration:"none" }}>Stats</a>
            <a href="/admin/milestones" style={{ fontSize:12, color:T.olive, fontWeight:600, textDecoration:"none" }}>Milestones</a>
          </div>
        </nav>

        <div style={{ padding:"32px clamp(14px,5vw,64px)", maxWidth:1200, margin:"0 auto" }}>

          {/* HEADER */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.olive,
              textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>Admin</div>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
              gap:16, flexWrap:"wrap" }}>
              <div>
                <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:"clamp(28px,4vw,44px)", fontWeight:700, color:T.white,
                  lineHeight:1, marginBottom:6 }}>Weekly Milestone Report</h1>
                <p style={{ fontSize:12, color:T.dim }}>
                  {from && to ? `${fmtDate(from)} — ${fmtDate(to)}` : "Select a date range"}
                  {pendingCount > 0 && (
                    <span style={{ marginLeft:12, color:T.gold, fontWeight:600 }}>
                      {pendingCount} pending reward{pendingCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
              <button className="btn"
                onClick={() => exportCSV(filteredRows)}
                disabled={filteredRows.length === 0}
                style={{ padding:"10px 20px", background:T.bg3,
                  color:T.olive, border:`1px solid ${T.borderG}` }}>
                ↓ Export CSV
              </button>
            </div>
          </div>

          {/* FILTERS */}
          <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:12,
            padding:"20px 24px", marginBottom:24 }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center",
              marginBottom:16 }}>
              {[["this_week","This Week"],["last_week","Last Week"],["custom","Custom Range"]].map(([k,l]) => (
                <button key={k} className={`filter-btn ${filter===k?"active":""}`}
                  onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>

            {filter === "custom" && (
              <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap",
                marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, color:T.dim }}>From</span>
                  <input type="date" value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, color:T.dim }}>To</span>
                  <input type="date" value={customTo}
                    onChange={e => setCustomTo(e.target.value)} />
                </div>
                <button className="btn"
                  onClick={loadData}
                  disabled={!customFrom || !customTo}
                  style={{ padding:"8px 18px", background:T.olive, color:"#0e1108" }}>
                  Apply
                </button>
              </div>
            )}

            <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:T.dim }}>Milestone</span>
                <select className="sel" value={milFilter}
                  onChange={e => setMilFilter(e.target.value)}>
                  <option value="all">All</option>
                  {MILESTONES.map(m => (
                    <option key={m} value={String(m)}>Day {m}</option>
                  ))}
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:T.dim }}>Status</span>
                <select className="sel" value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>
              <button className="btn"
                onClick={loadData}
                style={{ padding:"7px 16px", background:T.bg3,
                  color:T.olive, border:`1px solid ${T.borderG}` }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ height:64, borderRadius:8, background:T.bg2,
                  opacity:0.5+i*0.1 }} />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:12,
              padding:"48px 24px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🌱</div>
              <div style={{ fontSize:14, color:T.dim }}>
                No milestone events found for this period.
              </div>
            </div>
          ) : (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:12,
              overflow:"auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Milestone</th>
                    <th>Date Hit</th>
                    <th>Current Streak</th>
                    <th>Best Streak</th>
                    <th>Grass Score</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(r => (
                    <tr key={r.id}>
                      {/* Username */}
                      <td>
                        <a href={`/u/${r.username}`} target="_blank" rel="noopener noreferrer"
                          style={{ color:T.olive, textDecoration:"none", fontWeight:600,
                            fontSize:13 }}>
                          @{r.username}
                        </a>
                      </td>

                      {/* Milestone */}
                      <td>
                        <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                          fontSize:15, fontWeight:700, color:milestoneColor(r.milestone) }}>
                          {milestoneLabel(r.milestone)}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ color:T.muted }}>{fmtDate(r.milestone_date)}</td>

                      {/* Streaks */}
                      <td style={{ color:T.white, fontWeight:600 }}>
                        {r.current_streak ?? "—"}
                      </td>
                      <td style={{ color:T.muted }}>{r.best_streak ?? "—"}</td>

                      {/* Grass Score */}
                      <td style={{ color:T.olive, fontWeight:600 }}>
                        {r.grass_score != null
                          ? Number(r.grass_score).toLocaleString()
                          : "—"}
                      </td>

                      {/* Status */}
                      <td><StatusBadge status={r.status} /></td>

                      {/* Notes */}
                      <td style={{ minWidth:160 }}>
                        {noteEditing[r.id] !== undefined ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            <textarea className="note-input"
                              value={noteEditing[r.id]}
                              onChange={e => setNoteEditing(s => ({...s,[r.id]:e.target.value}))}
                              placeholder="Add note..." />
                            <div style={{ display:"flex", gap:6 }}>
                              <button className="btn"
                                onClick={() => saveNote(r.id)}
                                disabled={saving[r.id]}
                                style={{ padding:"5px 10px", background:T.olive, color:"#0e1108" }}>
                                Save
                              </button>
                              <button className="btn"
                                onClick={() => setNoteEditing(s => {const n={...s};delete n[r.id];return n;})}
                                style={{ padding:"5px 10px", background:T.bg3,
                                  color:T.dim, border:`1px solid ${T.border}` }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                            <span style={{ color:T.dim, fontSize:11, flex:1,
                              fontStyle: r.notes ? "normal" : "italic" }}>
                              {r.notes || "No note"}
                            </span>
                            <button className="btn"
                              onClick={() => setNoteEditing(s => ({...s,[r.id]:r.notes??""}))}
                              style={{ padding:"3px 8px", background:T.bg3,
                                color:T.dim, border:`1px solid ${T.border}`,
                                fontSize:10, flexShrink:0 }}>
                              Edit
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {r.status !== "paid" && (
                            <button className="btn"
                              onClick={() => setStatus(r.id, "paid")}
                              disabled={saving[r.id]}
                              style={{ padding:"6px 12px", background:"rgba(147,168,90,0.15)",
                                color:T.olive, border:`1px solid ${T.borderG}` }}>
                              ✓ Mark Paid
                            </button>
                          )}
                          {r.status !== "skipped" && (
                            <button className="btn"
                              onClick={() => setStatus(r.id, "skipped")}
                              disabled={saving[r.id]}
                              style={{ padding:"6px 12px", background:"rgba(240,239,234,0.05)",
                                color:T.dim, border:`1px solid ${T.border}` }}>
                              Skip
                            </button>
                          )}
                          {r.status !== "pending" && (
                            <button className="btn"
                              onClick={() => setStatus(r.id, "pending")}
                              disabled={saving[r.id]}
                              style={{ padding:"6px 12px", background:"rgba(200,168,75,0.1)",
                                color:T.gold, border:`1px solid rgba(200,168,75,0.3)` }}>
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table footer */}
              <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.border}`,
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:11, color:T.dim }}>
                  {filteredRows.length} milestone{filteredRows.length !== 1?"s":""} shown
                  {filteredRows.length !== rows.length && ` (${rows.length} total in period)`}
                </span>
                <div style={{ display:"flex", gap:16 }}>
                  {["pending","paid","skipped"].map(s => {
                    const count = rows.filter(r => r.status === s).length;
                    if (!count) return null;
                    return (
                      <span key={s} style={{ fontSize:11, color:T.dim }}>
                        <StatusBadge status={s} /> <span style={{marginLeft:4}}>{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}