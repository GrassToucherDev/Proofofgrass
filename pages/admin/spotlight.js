import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710", bg4:"#1a1e13",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
  red:"#f87171",
};

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

const CATEGORIES = [
  { key:"longest_streak",  emoji:"🔥", name:"Longest Streak",  color:"#f97316" },
  { key:"meme_lord",       emoji:"😂", name:"Meme Lord",        color:T.gold    },
  { key:"biggest_shiller", emoji:"📣", name:"Biggest Shiller",  color:T.olive   },
  { key:"space_warrior",   emoji:"🎧", name:"Space Warrior",    color:"#a78bfa" },
];

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function getSundayOf(date) {
  const d = new Date(getMondayOf(date));
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US",
    { month:"short", day:"numeric", year:"numeric", timeZone:"UTC" });
}

const EMPTY_FORM = {
  category:"longest_streak", username:"", display_name:"", avatar_url:"",
  week_start:"", week_end:"", description:"", x_link:"", proof_link:"",
};

export default function AdminSpotlight() {
  const [authed,    setAuthed]    = useState(false);
  const [pw,        setPw]        = useState("");
  const [pwError,   setPwError]   = useState("");
  const [spotlights,setSpotlights]= useState([]);
  const [loading,   setLoading]   = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [editId,    setEditId]    = useState(null);

  const checkPw = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(""); }
    else setPwError("Incorrect password.");
  };

  const loadSpotlights = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("CommunitySpotlights")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(40);
    setSpotlights(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) loadSpotlights(); }, [authed, loadSpotlights]);

  // Auto-fill week dates when week_start changes
  const handleWeekStart = (val) => {
    const monday = getMondayOf(val || new Date().toISOString().slice(0,10));
    const sunday = getSundayOf(monday);
    setForm(f => ({ ...f, week_start: monday, week_end: sunday }));
  };

  // Prefill this week's dates on mount
  useEffect(() => {
    const monday = getMondayOf(new Date().toISOString().slice(0,10));
    const sunday = getSundayOf(monday);
    setForm(f => ({ ...f, week_start: monday, week_end: sunday }));
  }, []);

  const startEdit = (s) => {
    setEditId(s.id);
    setForm({
      category: s.category, username: s.username,
      display_name: s.display_name ?? "", avatar_url: s.avatar_url ?? "",
      week_start: s.week_start, week_end: s.week_end,
      description: s.description ?? "", x_link: s.x_link ?? "",
      proof_link: s.proof_link ?? "",
    });
    window.scrollTo({ top: 0, behavior:"smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(f => ({ ...EMPTY_FORM,
      week_start: f.week_start, week_end: f.week_end }));
    setError(""); setSuccess("");
  };

  const save = async () => {
    setError(""); setSuccess("");
    if (!form.username.trim()) { setError("Username is required."); return; }
    if (!form.week_start)      { setError("Week start is required."); return; }

    setSaving(true);
    const payload = {
      category:     form.category,
      username:     form.username.trim().replace(/@/g,"").toLowerCase(),
      display_name: form.display_name.trim() || null,
      avatar_url:   form.avatar_url.trim()   || null,
      week_start:   form.week_start,
      week_end:     form.week_end,
      description:  form.description.trim(),
      x_link:       form.x_link.trim(),
      proof_link:   form.proof_link.trim(),
      status:       "active",
    };

    let err;
    if (editId) {
      ({ error: err } = await supabase.from("CommunitySpotlights")
        .update(payload).eq("id", editId));
    } else {
      ({ error: err } = await supabase.from("CommunitySpotlights")
        .upsert(payload, { onConflict: "category,week_start" }));
    }

    if (err) {
      setError(err.message);
    } else {
      setSuccess(editId ? "Winner updated." : "Winner saved.");
      cancelEdit();
      loadSpotlights();
    }
    setSaving(false);
  };

  const archive = async (id) => {
    await supabase.from("CommunitySpotlights")
      .update({ status:"archived" }).eq("id", id);
    loadSpotlights();
  };

  const restore = async (id) => {
    await supabase.from("CommunitySpotlights")
      .update({ status:"active" }).eq("id", id);
    loadSpotlights();
  };

  const getCat = (key) => CATEGORIES.find(c => c.key === key) ?? CATEGORIES[0];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    input,select,textarea{font-family:'DM Sans',sans-serif;}
    .field{display:flex;flex-direction:column;gap:5px;}
    .label{font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${T.dim};}
    .inp{background:${T.bg3};border:1px solid ${T.border};color:${T.white};
      padding:10px 12px;border-radius:8px;font-size:13px;outline:none;width:100%;
      transition:border-color 0.15s;}
    .inp:focus{border-color:${T.olive};}
    .btn{border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;
      font-size:12px;letter-spacing:0.06em;border-radius:7px;padding:10px 20px;
      transition:opacity 0.15s;}
    .btn:hover{opacity:0.85;} .btn:disabled{opacity:0.4;cursor:default;}
    select.inp option{background:${T.bg3};}
    table{border-collapse:collapse;width:100%;}
    th{text-align:left;font-size:9px;font-weight:700;letter-spacing:0.14em;
      text-transform:uppercase;color:${T.dim};padding:10px 14px;
      border-bottom:1px solid ${T.border};}
    td{padding:11px 14px;border-bottom:1px solid ${T.border};font-size:12px;vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    tr:hover td{background:rgba(255,255,255,0.015);}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
  `;

  if (!authed) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
        alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ background:T.bg2, border:`1px solid ${T.borderG}`, borderRadius:16,
          padding:"40px 36px", width:"100%", maxWidth:360, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🏆</div>
          <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22,
            fontWeight:700, color:T.white, marginBottom:4 }}>Admin Access</div>
          <div style={{ fontSize:12, color:T.dim, marginBottom:28 }}>Community Spotlight</div>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key==="Enter" && checkPw()}
            placeholder="Admin password" className="inp"
            style={{ marginBottom:12 }} />
          {pwError && <div style={{ fontSize:11, color:T.red, marginBottom:10 }}>{pwError}</div>}
          <button onClick={checkPw} className="btn"
            style={{ width:"100%", background:T.olive, color:"#0e1108", fontSize:13 }}>
            Enter
          </button>
        </div>
      </div>
    </>
  );

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
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>🌿</span>
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:17, fontWeight:700, color:T.white }}>Proof of Grass</span>
            <span style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em",
              textTransform:"uppercase", marginLeft:4 }}>/ Admin</span>
          </div>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <a href="/admin/stats"      style={{ fontSize:12, color:T.dim, textDecoration:"none" }}>Stats</a>
            <a href="/admin/milestones" style={{ fontSize:12, color:T.dim, textDecoration:"none" }}>Milestones</a>
            <span style={{ fontSize:12, color:T.gold, fontWeight:600 }}>Spotlight</span>
          </div>
        </nav>

        <div style={{ padding:"32px clamp(14px,5vw,64px)", maxWidth:960, margin:"0 auto" }}>

          {/* HEADER */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.gold,
              textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>Admin</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:"clamp(28px,4vw,44px)", fontWeight:700, color:T.white, lineHeight:1 }}>
              Community Spotlight
            </h1>
          </div>

          {/* WINNER ENTRY FORM */}
          <div style={{ background:T.bg2, border:`1px solid ${editId ? T.borderGold : T.borderG}`,
            borderRadius:14, padding:"28px 24px", marginBottom:28 }}>
            <div style={{ fontSize:12, fontWeight:700, color: editId ? T.gold : T.olive,
              letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:20 }}>
              {editId ? "✏️ Edit Winner" : "➕ Add Winner"}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

              {/* Category */}
              <div className="field" style={{ gridColumn:"1/-1" }}>
                <label className="label">Category</label>
                <select className="inp" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category:e.target.value }))}>
                  {CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Username */}
              <div className="field">
                <label className="label">Username</label>
                <input className="inp" placeholder="@username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username:e.target.value }))} />
              </div>

              {/* Display name */}
              <div className="field">
                <label className="label">Display Name (optional)</label>
                <input className="inp" placeholder="Override display name"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name:e.target.value }))} />
              </div>

              {/* Week start */}
              <div className="field">
                <label className="label">Week Start (Monday)</label>
                <input type="date" className="inp" value={form.week_start}
                  onChange={e => handleWeekStart(e.target.value)} />
              </div>

              {/* Week end */}
              <div className="field">
                <label className="label">Week End (auto-filled)</label>
                <input type="date" className="inp" value={form.week_end}
                  onChange={e => setForm(f => ({ ...f, week_end:e.target.value }))} />
              </div>

              {/* Description */}
              <div className="field" style={{ gridColumn:"1/-1" }}>
                <label className="label">Description / Reason</label>
                <textarea className="inp" rows={3}
                  placeholder="Why they won this week..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description:e.target.value }))}
                  style={{ resize:"vertical" }} />
              </div>

              {/* X link */}
              <div className="field">
                <label className="label">X Post Link (optional)</label>
                <input className="inp" placeholder="https://x.com/..."
                  value={form.x_link}
                  onChange={e => setForm(f => ({ ...f, x_link:e.target.value }))} />
              </div>

              {/* Proof link */}
              <div className="field">
                <label className="label">Proof Link (optional)</label>
                <input className="inp" placeholder="https://..."
                  value={form.proof_link}
                  onChange={e => setForm(f => ({ ...f, proof_link:e.target.value }))} />
              </div>

              {/* Avatar override */}
              <div className="field" style={{ gridColumn:"1/-1" }}>
                <label className="label">Avatar URL Override (optional — uses profile avatar by default)</label>
                <input className="inp" placeholder="https://... leave blank to use profile avatar"
                  value={form.avatar_url}
                  onChange={e => setForm(f => ({ ...f, avatar_url:e.target.value }))} />
              </div>

            </div>

            {error   && <div style={{ fontSize:12, color:T.red,  marginTop:14 }}>{error}</div>}
            {success && <div style={{ fontSize:12, color:T.olive, marginTop:14 }}>{success}</div>}

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button className="btn" onClick={save} disabled={saving}
                style={{ background:T.gold, color:"#0e1108" }}>
                {saving ? "Saving…" : editId ? "Update Winner" : "Save Winner"}
              </button>
              {editId && (
                <button className="btn" onClick={cancelEdit}
                  style={{ background:T.bg3, color:T.dim, border:`1px solid ${T.border}` }}>
                  Cancel
                </button>
              )}
              <a href="/spotlight" target="_blank"
                style={{ marginLeft:"auto", fontSize:12, color:T.dim,
                  textDecoration:"none", display:"flex", alignItems:"center" }}>
                View Spotlight →
              </a>
            </div>
          </div>

          {/* EXISTING WINNERS TABLE */}
          <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
            borderRadius:14, overflow:"auto" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:T.muted }}>All Spotlights</span>
              <button className="btn" onClick={loadSpotlights}
                style={{ padding:"6px 14px", background:T.bg3,
                  color:T.olive, border:`1px solid ${T.borderG}` }}>
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ padding:32, textAlign:"center", color:T.dim, fontSize:12 }}>
                Loading…
              </div>
            ) : spotlights.length === 0 ? (
              <div style={{ padding:"48px 24px", textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🏆</div>
                <div style={{ fontSize:13, color:T.dim }}>No spotlights yet. Add your first winner above.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Category</th>
                    <th>Winner</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {spotlights.map(s => {
                    const cat = getCat(s.category);
                    return (
                      <tr key={s.id} style={{ opacity: s.status === "archived" ? 0.5 : 1 }}>
                        <td style={{ color:T.dim, whiteSpace:"nowrap" }}>
                          {fmtDate(s.week_start)}
                        </td>
                        <td>
                          <span style={{ fontSize:11, fontWeight:700, color:cat.color }}>
                            {cat.emoji} {cat.name}
                          </span>
                        </td>
                        <td>
                          <a href={`/u/${s.username}`} target="_blank"
                            rel="noopener noreferrer"
                            style={{ color:T.olive, textDecoration:"none", fontWeight:600 }}>
                            @{s.display_name || s.username}
                          </a>
                        </td>
                        <td style={{ color:T.dim, maxWidth:260,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {s.description || "—"}
                        </td>
                        <td>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.1em",
                            textTransform:"uppercase", padding:"2px 8px", borderRadius:4,
                            background: s.status==="active"
                              ? "rgba(147,168,90,0.12)" : "rgba(240,239,234,0.05)",
                            color: s.status==="active" ? T.olive : T.dim,
                            border: `1px solid ${s.status==="active" ? T.borderG : T.border}` }}>
                            {s.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:"flex", gap:6 }}>
                            <button className="btn"
                              onClick={() => startEdit(s)}
                              style={{ padding:"5px 12px", background:T.bg3,
                                color:T.white, border:`1px solid ${T.border}` }}>
                              Edit
                            </button>
                            {s.status === "active" ? (
                              <button className="btn"
                                onClick={() => archive(s.id)}
                                style={{ padding:"5px 12px", background:"rgba(240,239,234,0.05)",
                                  color:T.dim, border:`1px solid ${T.border}` }}>
                                Archive
                              </button>
                            ) : (
                              <button className="btn"
                                onClick={() => restore(s.id)}
                                style={{ padding:"5px 12px", background:"rgba(147,168,90,0.1)",
                                  color:T.olive, border:`1px solid ${T.borderG}` }}>
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}