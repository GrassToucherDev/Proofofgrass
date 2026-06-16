import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
  red:"#f87171",
};

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

const TYPE_CONFIG = {
  streak:      { emoji:"🔥", label:"Streak",      color:"#f97316" },
  grass_score: { emoji:"🌱", label:"Grass Score",  color:"#93a85a" },
  proof_count: { emoji:"🌿", label:"Proofs",       color:"#4ade80" },
  referral:    { emoji:"🤝", label:"Referrals",    color:"#c8a84b" },
  spotlight:   { emoji:"🏆", label:"Spotlight",    color:"#c8a84b" },
  lucky_touch: { emoji:"🍀", label:"Lucky Touch",  color:"#93a85a" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US",
    { month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit",
      timeZone:"UTC" });
}
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day===0?-6:1-day));
  return d.toISOString().slice(0,10);
}
function getSundayOf(date) {
  const d = new Date(getMondayOf(date));
  d.setUTCDate(d.getUTCDate()+6);
  return d.toISOString().slice(0,10);
}

function exportCSV(rows) {
  const headers = ["username","milestone_type","milestone_label","date_achieved","notified","reward_reviewed","notes"];
  const lines = [headers.join(","),
    ...rows.map(r => [r.username,r.milestone_type,r.milestone_label,
      r.created_at?.slice(0,10)??'',r.notified,r.reward_reviewed,
      `"${(r.notes??'').replace(/"/g,'""')}"`].join(","))];
  const blob = new Blob([lines.join("\n")],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=`milestones-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminMilestones() {
  const [authed,      setAuthed]      = useState(false);
  const [pw,          setPw]          = useState("");
  const [pwError,     setPwError]     = useState("");
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [filter,      setFilter]      = useState("today");
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [statusFilter,setStatusFilter]= useState("all");
  const [saving,      setSaving]      = useState({});
  const [noteEditing, setNoteEditing] = useState({});

  const checkPw = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(""); }
    else setPwError("Incorrect password.");
  };

  const dateRange = useCallback(() => {
    const today = new Date().toISOString().slice(0,10);
    if (filter==="today")     return { from:today, to:today };
    if (filter==="this_week") return { from:getMondayOf(today), to:getSundayOf(today) };
    if (filter==="last_week") {
      const d = new Date(); d.setUTCDate(d.getUTCDate()-7);
      const lw = d.toISOString().slice(0,10);
      return { from:getMondayOf(lw), to:getSundayOf(lw) };
    }
    return { from:customFrom, to:customTo };
  }, [filter, customFrom, customTo]);

  const loadData = useCallback(async () => {
    const { from, to } = dateRange();
    if (!from || !to) return;
    setLoading(true);
    let q = supabase.from("MilestoneEvents").select("*")
      .gte("created_at", `${from}T00:00:00.000Z`)
      .lte("created_at", `${to}T23:59:59.999Z`)
      .order("created_at", { ascending:false })
      .limit(500);
    const { data } = await q;
    setRows(data ?? []);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { if (authed) loadData(); }, [authed, loadData]);

  const update = async (id, updates) => {
    setSaving(s => ({...s,[id]:true}));
    await supabase.from("MilestoneEvents")
      .update(updates).eq("id", id);
    setRows(prev => prev.map(r => r.id===id ? {...r,...updates} : r));
    setSaving(s => { const n={...s}; delete n[id]; return n; });
  };

  const saveNote = async (id) => {
    const note = noteEditing[id] ?? "";
    await update(id, { notes:note });
    setNoteEditing(s => { const n={...s}; delete n[id]; return n; });
  };

  const filteredRows = rows.filter(r => {
    if (typeFilter !== "all" && r.milestone_type !== typeFilter) return false;
    if (statusFilter === "pending" && r.reward_reviewed) return false;
    if (statusFilter === "notified" && !r.notified) return false;
    if (statusFilter === "reviewed" && !r.reward_reviewed) return false;
    return true;
  });

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    input,select,textarea{font-family:'DM Sans',sans-serif;}
    .btn{border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;
      font-size:11px;letter-spacing:0.06em;border-radius:6px;transition:opacity 0.15s;}
    .btn:hover{opacity:0.8;}.btn:disabled{opacity:0.4;cursor:default;}
    table{border-collapse:collapse;width:100%;}
    th{text-align:left;font-size:9px;font-weight:700;letter-spacing:0.16em;
      text-transform:uppercase;color:${T.dim};padding:10px 14px;
      border-bottom:1px solid ${T.border};white-space:nowrap;}
    td{padding:11px 14px;border-bottom:1px solid ${T.border};font-size:12px;vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    tr:hover td{background:rgba(255,255,255,0.015);}
    .fbtn{background:transparent;border:1px solid ${T.border};color:${T.dim};
      padding:7px 16px;border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;
      font-size:11px;font-weight:600;letter-spacing:0.08em;transition:all 0.15s;}
    .fbtn.active{background:${T.olive};color:#0e1108;border-color:${T.olive};}
    .fbtn:hover:not(.active){border-color:${T.olive};color:${T.olive};}
    select.sel{background:${T.bg3};border:1px solid ${T.border};color:${T.white};
      padding:7px 10px;border-radius:6px;font-size:11px;outline:none;cursor:pointer;}
    input[type=date]{background:${T.bg3};border:1px solid ${T.border};color:${T.white};
      padding:7px 10px;border-radius:6px;font-size:12px;outline:none;}
    input[type=date]:focus{border-color:${T.olive};}
    textarea.note-inp{background:${T.bg3};border:1px solid ${T.border};color:${T.white};
      padding:6px 8px;border-radius:6px;font-size:11px;resize:vertical;outline:none;
      width:100%;min-height:44px;}
    textarea.note-inp:focus{border-color:${T.olive};}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
  `;

  if (!authed) return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}} />
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",
        alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{background:T.bg2,border:`1px solid ${T.borderG}`,borderRadius:16,
          padding:"40px 36px",width:"100%",maxWidth:360,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>🌿</div>
          <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,
            fontWeight:700,color:T.white,marginBottom:4}}>Admin Access</div>
          <div style={{fontSize:12,color:T.dim,marginBottom:28}}>Milestone Event Logger</div>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&checkPw()} placeholder="Admin password"
            style={{width:"100%",background:T.bg3,border:`1px solid ${T.border}`,
              color:T.white,padding:"11px 14px",borderRadius:8,fontSize:13,
              outline:"none",marginBottom:12}} />
          {pwError && <div style={{fontSize:11,color:T.red,marginBottom:10}}>{pwError}</div>}
          <button onClick={checkPw} className="btn"
            style={{width:"100%",padding:"12px",background:T.olive,
              color:"#0e1108",fontSize:13}}>Enter</button>
        </div>
      </div>
    </>
  );

  const pendingCount = rows.filter(r => !r.reward_reviewed).length;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}} />
      <div style={{minHeight:"100vh",background:T.bg}}>

        {/* NAV */}
        <nav style={{position:"sticky",top:0,zIndex:100,display:"flex",alignItems:"center",
          justifyContent:"space-between",padding:"0 clamp(14px,4vw,48px)",height:56,
          background:`${T.bg}ec`,backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}`,gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>🌿</span>
            <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:17,fontWeight:700,color:T.white}}>Proof of Grass</span>
            <span style={{fontSize:10,color:T.dim,letterSpacing:"0.1em",
              textTransform:"uppercase",marginLeft:4}}>/ Admin</span>
          </div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <a href="/admin/stats"      style={{fontSize:12,color:T.dim,textDecoration:"none"}}>Stats</a>
            <span style={{fontSize:12,color:T.olive,fontWeight:600}}>Milestones</span>
            <a href="/admin/spotlight"  style={{fontSize:12,color:T.dim,textDecoration:"none"}}>Spotlight</a>
          </div>
        </nav>

        <div style={{padding:"32px clamp(14px,5vw,64px)",maxWidth:1300,margin:"0 auto"}}>

          {/* Header */}
          <div style={{marginBottom:28}}>
            <div style={{fontSize:10,letterSpacing:"0.22em",color:T.olive,
              textTransform:"uppercase",marginBottom:8,fontWeight:600}}>Admin</div>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
              gap:16,flexWrap:"wrap"}}>
              <div>
                <h1 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:"clamp(28px,4vw,44px)",fontWeight:700,color:T.white,
                  lineHeight:1,marginBottom:6}}>Milestone Event Logger</h1>
                <p style={{fontSize:12,color:T.dim}}>
                  {pendingCount > 0 && (
                    <span style={{color:T.gold,fontWeight:600,marginRight:12}}>
                      {pendingCount} unreviewed
                    </span>
                  )}
                  Tracking streak, score, proof, referral, spotlight, and lucky touch milestones.
                </p>
              </div>
              <button className="btn" onClick={() => exportCSV(filteredRows)}
                disabled={filteredRows.length===0}
                style={{padding:"10px 20px",background:T.bg3,
                  color:T.olive,border:`1px solid ${T.borderG}`}}>
                ↓ Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,
            padding:"20px 24px",marginBottom:24}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
              {[["today","Today"],["this_week","This Week"],
                ["last_week","Last Week"],["custom","Custom"]].map(([k,l]) => (
                <button key={k} className={`fbtn ${filter===k?"active":""}`}
                  onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
            {filter==="custom" && (
              <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:T.dim}}>From</span>
                  <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} />
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:T.dim}}>To</span>
                  <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} />
                </div>
                <button className="btn" onClick={loadData}
                  disabled={!customFrom||!customTo}
                  style={{padding:"8px 18px",background:T.olive,color:"#0e1108"}}>Apply</button>
              </div>
            )}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:T.dim}}>Type</span>
                <select className="sel" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  {Object.entries(TYPE_CONFIG).map(([k,v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:T.dim}}>Status</span>
                <select className="sel" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="pending">Unreviewed</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="notified">Notified</option>
                </select>
              </div>
              <button className="btn" onClick={loadData}
                style={{padding:"7px 16px",background:T.bg3,
                  color:T.olive,border:`1px solid ${T.borderG}`}}>
                ↻ Refresh
              </button>
              <span style={{fontSize:11,color:T.dim,marginLeft:"auto"}}>
                {filteredRows.length} events
                {filteredRows.length!==rows.length && ` (${rows.length} total)`}
              </span>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{height:56,borderRadius:8,background:T.bg2,opacity:0.5}} />
              ))}
            </div>
          ) : filteredRows.length===0 ? (
            <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,
              padding:"48px 24px",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:12}}>🎯</div>
              <div style={{fontSize:14,color:T.dim}}>No milestone events in this period.</div>
            </div>
          ) : (
            <div style={{background:T.bg2,border:`1px solid ${T.border}`,
              borderRadius:12,overflow:"auto"}}>
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Milestone</th>
                    <th>Type</th>
                    <th>Date Achieved</th>
                    <th>Notified</th>
                    <th>Reviewed</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(r => {
                    const tc = TYPE_CONFIG[r.milestone_type] ?? {emoji:"⭐",label:r.milestone_type,color:T.dim};
                    return (
                      <tr key={r.id}>
                        <td>
                          <a href={`/u/${r.username}`} target="_blank" rel="noopener noreferrer"
                            style={{color:T.olive,textDecoration:"none",fontWeight:600,fontSize:13}}>
                            @{r.username}
                          </a>
                        </td>
                        <td>
                          <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
                            fontSize:15,fontWeight:700,color:tc.color}}>
                            {tc.emoji} {r.milestone_label}
                          </span>
                        </td>
                        <td>
                          <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",
                            textTransform:"uppercase",padding:"2px 7px",borderRadius:4,
                            background:tc.color+"15",color:tc.color,
                            border:`1px solid ${tc.color}40`}}>
                            {tc.label}
                          </span>
                        </td>
                        <td style={{color:T.muted,whiteSpace:"nowrap"}}>{fmtDate(r.created_at)}</td>
                        <td>
                          <span style={{fontSize:11,color:r.notified?T.olive:T.dim}}>
                            {r.notified?"✓ Yes":"—"}
                          </span>
                        </td>
                        <td>
                          <span style={{fontSize:11,color:r.reward_reviewed?T.gold:T.dim}}>
                            {r.reward_reviewed?"✓ Yes":"—"}
                          </span>
                        </td>
                        <td style={{minWidth:160}}>
                          {noteEditing[r.id]!==undefined ? (
                            <div style={{display:"flex",flexDirection:"column",gap:5}}>
                              <textarea className="note-inp"
                                value={noteEditing[r.id]}
                                onChange={e=>setNoteEditing(s=>({...s,[r.id]:e.target.value}))}
                                placeholder="Add note..." />
                              <div style={{display:"flex",gap:5}}>
                                <button className="btn" onClick={()=>saveNote(r.id)}
                                  disabled={saving[r.id]}
                                  style={{padding:"5px 10px",background:T.olive,color:"#0e1108"}}>
                                  Save
                                </button>
                                <button className="btn"
                                  onClick={()=>setNoteEditing(s=>{const n={...s};delete n[r.id];return n;})}
                                  style={{padding:"5px 10px",background:T.bg3,
                                    color:T.dim,border:`1px solid ${T.border}`}}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                              <span style={{fontSize:11,color:T.dim,flex:1,
                                fontStyle:r.notes?"normal":"italic"}}>
                                {r.notes||"—"}
                              </span>
                              <button className="btn"
                                onClick={()=>setNoteEditing(s=>({...s,[r.id]:r.notes??""}))}
                                style={{padding:"3px 7px",background:T.bg3,
                                  color:T.dim,border:`1px solid ${T.border}`,
                                  fontSize:10,flexShrink:0}}>
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            {!r.reward_reviewed && (
                              <button className="btn" onClick={()=>update(r.id,{reward_reviewed:true})}
                                disabled={saving[r.id]}
                                style={{padding:"5px 10px",background:"rgba(200,168,75,0.1)",
                                  color:T.gold,border:`1px solid rgba(200,168,75,0.3)`}}>
                                ✓ Review
                              </button>
                            )}
                            {!r.notified && (
                              <button className="btn" onClick={()=>update(r.id,{notified:true})}
                                disabled={saving[r.id]}
                                style={{padding:"5px 10px",background:"rgba(147,168,90,0.1)",
                                  color:T.olive,border:`1px solid rgba(147,168,90,0.3)`}}>
                                Notify
                              </button>
                            )}
                            {(r.reward_reviewed||r.notified) && (
                              <button className="btn"
                                onClick={()=>update(r.id,{reward_reviewed:false,notified:false})}
                                disabled={saving[r.id]}
                                style={{padding:"5px 10px",background:T.bg3,
                                  color:T.dim,border:`1px solid ${T.border}`}}>
                                Reset
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}