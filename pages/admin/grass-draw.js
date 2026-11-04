// pages/admin/grass-draw.js
import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "../../utils/adminClient";
import Link from "next/link";
import { supabase } from "../../utils/supabase";
import { adminDb } from "../../utils/adminDb";


import { adminLoginOk } from "../../utils/adminLogin";
const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)",
  olive:"#93a85a", gold:"#c8a84b", red:"#ef4444",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
  green:"#4ade80",
};

const inputStyle = {
  width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid ${T.border}`,
  borderRadius:8, padding:"10px 12px", color:T.white, fontSize:13,
  outline:"none", boxSizing:"border-box", marginBottom:10,
};

const btnStyle = (color="#93a85a") => ({
  background:color==="olive"?"rgba(147,168,90,0.15)":color==="red"?"rgba(239,68,68,0.12)":"rgba(200,168,75,0.12)",
  border:`1px solid ${color==="olive"?T.olive:color==="red"?T.red:T.gold}`,
  color:color==="olive"?T.olive:color==="red"?T.red:T.gold,
  borderRadius:8, padding:"9px 18px", fontSize:12, fontWeight:700,
  cursor:"pointer", letterSpacing:"0.04em",
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ["Cycle","Bonuses","Moderation","Leaderboard","Draw"];

export default function AdminGrassDraw() {
  const [authed,  setAuthed]  = useState(false);
  const [pw,      setPw]      = useState("");
  const [tab,     setTab]     = useState("Cycle");
  const [msg,     setMsg]     = useState({ text:"", type:"ok" });
  const [cycle,   setCycle]   = useState(null);
  const [cycles,  setCycles]  = useState([]);
  const [rewards, setRewards] = useState([]);
  const [totals,  setTotals]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickId,  setPickId]  = useState("");   // "" = the active cycle (or newest); otherwise the cycle you picked

  const flash = (text, type="ok") => { setMsg({text,type}); setTimeout(()=>setMsg({text:"",type:"ok"}),4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: cycs } = await supabase.from("grass_draw_cycles")
      .select("id,name,starts_at,ends_at,status").order("starts_at",{ascending:false});
    setCycles(cycs||[]);
    const active = (cycs||[]).find(c=>c.id===pickId) || (cycs||[]).find(c=>c.status==="active") || (cycs||[])[0];
    setCycle(active||null);

    if (active) {
      const { data: rwds } = await supabase.from("grass_draw_rewards")
        .select("id,cycle_id,reward_type,quantity,reward_value,draw_order,description").eq("cycle_id",active.id).order("draw_order");
      setRewards(rwds||[]);

      const { data: tots } = await supabase.from("grass_draw_user_totals")
        .select("cycle_id,username,proof_entries,total_bonus_entries,active_bonus_entries,pending_bonus_entries,total_active_entries,proof_day_count,eligible,disqualified").eq("cycle_id",active.id)
        .order("total_active_entries",{ascending:false}).limit(100);
      setTotals(tots||[]);
    }
    setLoading(false);
  }, [pickId]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"32px 28px",width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>🌱</div>
        <div style={{fontSize:14,color:T.muted,marginBottom:20}}>Grass Draw Admin</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter") adminLoginOk(pw).then(ok=>{ if(ok) setAuthed(true); });}}
          placeholder="Password" style={{...inputStyle,marginBottom:12}}/>
        <button onClick={()=>{adminLoginOk(pw).then(ok=>{ if(ok) setAuthed(true); });}}
          style={{width:"100%",background:T.olive,color:"#0a0c08",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Enter
        </button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg}}>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{background:${T.bg};color:${T.white};font-family:'Nunito',sans-serif;}`}</style>
      <div style={{maxWidth:960,margin:"0 auto",padding:"28px 16px 80px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:T.gold,marginBottom:8}}>Admin</div>
            <h1 style={{fontFamily:"'Fredoka',system-ui,sans-serif",fontSize:32,fontWeight:700,color:T.white}}>Grass Draw</h1>
            {cycle && <div style={{fontSize:12,color:T.dim,marginTop:4}}>{cycle.name} · {cycle.status.toUpperCase()}</div>}
            {cycles.length > 1 && (
              <select value={cycle?.id||""} onChange={e=>setPickId(e.target.value)}
                style={{marginTop:10,padding:"8px 10px",borderRadius:8,background:T.bg2,color:T.white,border:`1px solid ${T.border}`,fontSize:13,maxWidth:"100%"}}>
                {cycles.map(c=><option key={c.id} value={c.id}>{c.name} — {c.status}</option>)}
              </select>
            )}
          </div>
          <Link href="/admin/marketplace" style={{fontSize:11,color:T.dim,textDecoration:"none"}}>← Admin</Link>
        </div>

        {msg.text && (
          <div style={{padding:"12px 16px",marginBottom:20,fontSize:13,borderRadius:10,
            background:msg.type==="ok"?"rgba(147,168,90,0.1)":"rgba(239,68,68,0.08)",
            border:`1px solid ${msg.type==="ok"?"rgba(147,168,90,0.3)":"rgba(239,68,68,0.3)"}`,
            color:msg.type==="ok"?T.olive:T.red}}>
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:24,background:T.bg2,borderRadius:10,padding:4,border:`1px solid ${T.border}`}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{flex:1,padding:"8px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
                background:tab===t?T.bg3:"transparent",color:tab===t?T.white:T.dim,transition:"all 0.15s"}}>
              {t}
            </button>
          ))}
        </div>

        {loading && <div style={{fontSize:13,color:T.dim,textAlign:"center",padding:40}}>Loading…</div>}

        {!loading && (
          <>
            {tab==="Cycle"     && <CycleTab     cycle={cycle} cycles={cycles} rewards={rewards} flash={flash} reload={load} />}
            {tab==="Bonuses"   && <BonusesTab   cycle={cycle} flash={flash} reload={load} />}
            {tab==="Moderation"&& <ModerationTab cycle={cycle} flash={flash} reload={load} />}
            {tab==="Leaderboard"&&<LeaderboardTab totals={totals} cycle={cycle} />}
            {tab==="Draw"      && <DrawTab       cycle={cycle} rewards={rewards} totals={totals} flash={flash} reload={load} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── CYCLE TAB ────────────────────────────────────────────────────────────────
function CycleTab({ cycle, cycles, rewards, flash, reload }) {
  const [newName,  setNewName]  = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd,   setNewEnd]   = useState("");
  const [saving,   setSaving]   = useState(false);

  const createCycle = async () => {
    if (!newName||!newStart||!newEnd) return flash("All fields required.","err");
    setSaving(true);
    const { error } = await adminDb.from("grass_draw_cycles").insert([{
      name:newName, starts_at:new Date(newStart).toISOString(),
      ends_at:new Date(newEnd+"T23:59:59Z").toISOString(), status:"upcoming",
    }]);
    setSaving(false);
    if (error) flash("Error: "+error.message,"err");
    else { flash("✓ Cycle created"); setNewName(""); setNewStart(""); setNewEnd(""); reload(); }
  };

  const updateStatus = async (id, status) => {
    await adminDb.from("grass_draw_cycles").update({status}).eq("id",id);
    flash(`✓ Cycle marked ${status}`); reload();
  };

  const updateReward = async (id, field, value) => {
    await adminDb.from("grass_draw_rewards").update({[field]:parseInt(value)||0}).eq("id",id);
    flash("✓ Reward updated"); reload();
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* Active cycle stats */}
      {cycle && (
        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:16}}>Active Cycle — {cycle.name}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16}}>
            {[
              {label:"Start",value:new Date(cycle.starts_at).toLocaleDateString()},
              {label:"End",  value:new Date(cycle.ends_at).toLocaleDateString()},
              {label:"Status",value:cycle.status.toUpperCase()},
              {label:"Days Left",value:Math.max(0,Math.ceil((new Date(cycle.ends_at)-new Date())/(1000*60*60*24)))+"d"},
            ].map(s=>(
              <div key={s.label} style={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px"}}>
                <div style={{fontSize:9,color:T.dim,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:16,fontWeight:700,color:T.white}}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {cycle.status==="upcoming" && <button style={btnStyle("olive")} onClick={()=>updateStatus(cycle.id,"active")}>Activate Cycle</button>}
            {cycle.status==="active"   && <button style={btnStyle("gold")}  onClick={()=>updateStatus(cycle.id,"closed")}>Close Cycle</button>}
            {cycle.status==="closed"   && <button style={btnStyle("olive")} onClick={()=>updateStatus(cycle.id,"drawn")}>Mark as Drawn</button>}
          </div>
        </div>
      )}

      {/* Reward configuration */}
      {rewards.length > 0 && (
        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:16}}>Reward Configuration</div>
          {rewards.map(r=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:T.white,fontWeight:600,textTransform:"capitalize"}}>{r.reward_type.replace("_"," ")}</div>
                <div style={{fontSize:11,color:T.dim}}>{r.description}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:T.dim}}>Qty:</span>
                <input type="number" defaultValue={r.quantity} style={{...inputStyle,width:70,marginBottom:0}}
                  onBlur={e=>updateReward(r.id,"quantity",e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create new cycle */}
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:14}}>Create New Cycle</div>
        <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Cycle Name</label>
        <input style={inputStyle} placeholder="October 2026 Grass Draw" value={newName} onChange={e=>setNewName(e.target.value)} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Start Date</label>
            <input type="date" style={inputStyle} value={newStart} onChange={e=>setNewStart(e.target.value)} />
          </div>
          <div>
            <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>End Date</label>
            <input type="date" style={inputStyle} value={newEnd} onChange={e=>setNewEnd(e.target.value)} />
          </div>
        </div>
        <button onClick={createCycle} disabled={saving}
          style={{background:T.olive,color:"#0a0c08",border:"none",borderRadius:8,padding:"11px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          {saving?"Creating…":"Create Cycle"}
        </button>
      </div>

      {/* Cycle history */}
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:14}}>Cycle History</div>
        {cycles.map(c=>(
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:T.white}}>{c.name}</div>
              <div style={{fontSize:11,color:T.dim}}>{new Date(c.starts_at).toLocaleDateString()} – {new Date(c.ends_at).toLocaleDateString()}</div>
            </div>
            <div style={{fontSize:11,fontWeight:700,
              color:c.status==="active"?T.green:c.status==="drawn"?T.olive:T.dim,
              background:c.status==="active"?"rgba(74,222,128,0.08)":"transparent",
              border:c.status==="active"?"1px solid rgba(74,222,128,0.3)":"none",
              borderRadius:20,padding:c.status==="active"?"3px 10px":"0",
              letterSpacing:"0.06em"}}>
              {c.status.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BONUSES TAB ───────────────────────────────────────────────────────────────
function BonusesTab({ cycle, flash, reload }) {
  const [uname,    setUname]    = useState("");
  const [bonusType,setBonusType]= useState("spotlight");
  const [notes,    setNotes]    = useState("");
  const [amount,   setAmount]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [recent,   setRecent]   = useState([]);

  useEffect(()=>{
    if(!cycle) return;
    (async()=>{
      const r = await adminFetch("/api/grass-draw/admin-entries?cycle_id="+cycle.id);
      const j = await r.json().catch(()=>({}));
      setRecent(j.entries||[]);
    })();
  },[cycle]);

  const awardBonus = async () => {
    if(!uname||!bonusType) return flash("Username and type required.","err");
    if(bonusType==="manual"&&(!amount||parseFloat(amount)<=0)) return flash("Amount required for manual.","err");
    setSaving(true);
    try {
      const body = {
        username:uname, entry_type:bonusType, notes,
        admin_username:"admin",
        ...(bonusType==="manual"?{amount:parseFloat(amount)}:{}),
      };
      const r = await adminFetch("/api/grass-draw/award-bonus",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body),
      });
      const d = await r.json();
      if(!r.ok) flash(d.error||"Error","err");
      else {
        flash(`✓ +${d.amount} ${bonusType} entries awarded to @${uname}`);
        setUname(""); setNotes(""); setAmount("");
        // Refresh recent
        const rr = await adminFetch("/api/grass-draw/admin-entries?cycle_id="+cycle.id);
        const jj = await rr.json().catch(()=>({}));
        setRecent(jj.entries||[]);
      }
    } catch(e) { flash("Error: "+e.message,"err"); }
    setSaving(false);
  };

  const ADMIN_BONUS_TYPES = [
    {value:"spotlight",    label:"Spotlight Winner (+5)"},
    {value:"x_engagement", label:"X Engagement (+5)"},
    {value:"manual",       label:"Manual Bonus (custom amount)"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {!cycle && <div style={{fontSize:13,color:T.dim}}>No active cycle.</div>}
      {cycle && (
        <>
          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:16}}>Award Bonus Entries</div>
            <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Username</label>
            <input style={inputStyle} placeholder="username" value={uname} onChange={e=>setUname(e.target.value.toLowerCase())} />
            <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Bonus Type</label>
            <select style={{...inputStyle}} value={bonusType} onChange={e=>setBonusType(e.target.value)}>
              {ADMIN_BONUS_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {bonusType==="manual" && (
              <>
                <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Amount</label>
                <input type="number" style={inputStyle} placeholder="e.g. 5" value={amount} onChange={e=>setAmount(e.target.value)} />
              </>
            )}
            <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Reason / Notes *</label>
            <input style={inputStyle} placeholder="e.g. Spotlight winner week of Aug 18" value={notes} onChange={e=>setNotes(e.target.value)} />
            <button onClick={awardBonus} disabled={saving||!cycle}
              style={{background:T.olive,color:"#0a0c08",border:"none",borderRadius:8,padding:"11px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {saving?"Awarding…":"Award Bonus Entries"}
            </button>
          </div>

          {/* Recent bonus awards */}
          {recent.length>0 && (
            <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:14}}>Recent Admin Bonus Awards</div>
              {recent.map(e=>(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:T.white}}>@{e.username} — {e.entry_type}</div>
                    {e.notes&&<div style={{fontSize:11,color:T.dim}}>{e.notes}</div>}
                    {e.admin_username&&<div style={{fontSize:10,color:T.dim}}>By: {e.admin_username}</div>}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:T.olive}}>+{e.weighted_amount}</div>
                  <div style={{fontSize:10,color:T.dim}}>{new Date(e.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── MODERATION TAB ────────────────────────────────────────────────────────────
function ModerationTab({ cycle, flash, reload }) {
  const [uname,     setUname]     = useState("");
  const [reason,    setReason]    = useState("");
  const [notes,     setNotes]     = useState("");
  const [permanent, setPermanent] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [disqs,     setDisqs]     = useState([]);

  useEffect(()=>{
    (async()=>{
      const {data} = await supabase.from("grass_draw_disqualifications")
        .select("*").eq("reversed",false).order("created_at",{ascending:false}).limit(50);
      setDisqs(data||[]);
    })();
  },[cycle]);

  const disqualify = async () => {
    if(!uname||!reason) return flash("Username and reason required.","err");
    setSaving(true);
    const {error} = await adminDb.from("grass_draw_disqualifications").insert([{
      username:uname.toLowerCase(), cycle_id:permanent?null:(cycle?.id||null),
      permanent, reason, notes, admin_username:"admin",
    }]);
    if(error) flash("Error: "+error.message,"err");
    else {
      // Zero out their totals if cycle disq
      if(cycle&&!permanent) {
        await adminDb.from("grass_draw_user_totals")
          .update({disqualified:true,eligible:false,total_active_entries:0,
            active_bonus_entries:0,pending_bonus_entries:0})
          .eq("cycle_id",cycle.id).ilike("username",uname);
      }
      flash(`✓ @${uname} disqualified${permanent?" permanently":""}`);
      setUname(""); setReason(""); setNotes(""); setPermanent(false);
      const {data} = await supabase.from("grass_draw_disqualifications")
        .select("*").eq("reversed",false).order("created_at",{ascending:false}).limit(50);
      setDisqs(data||[]);
    }
    setSaving(false);
  };

  const reverse = async (id,username) => {
    await adminDb.from("grass_draw_disqualifications")
      .update({reversed:true,reversed_at:new Date().toISOString(),reversed_by:"admin"}).eq("id",id);
    flash(`✓ Disqualification reversed for @${username}`);
    const {data} = await supabase.from("grass_draw_disqualifications")
      .select("*").eq("reversed",false).order("created_at",{ascending:false}).limit(50);
    setDisqs(data||[]);
    if(cycle) {
      await adminDb.rpc("recalculate_draw_totals",{p_cycle_id:cycle.id,p_username:username});
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:16}}>Disqualify User</div>
        <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Username</label>
        <input style={inputStyle} placeholder="username" value={uname} onChange={e=>setUname(e.target.value.toLowerCase())} />
        <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Reason *</label>
        <input style={inputStyle} placeholder="e.g. Duplicate account" value={reason} onChange={e=>setReason(e.target.value)} />
        <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Notes</label>
        <input style={inputStyle} placeholder="Additional context" value={notes} onChange={e=>setNotes(e.target.value)} />
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <input type="checkbox" id="perm" checked={permanent} onChange={e=>setPermanent(e.target.checked)} />
          <label htmlFor="perm" style={{fontSize:13,color:T.muted,cursor:"pointer"}}>Permanent (all future cycles)</label>
        </div>
        <button onClick={disqualify} disabled={saving}
          style={{background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.4)",
            color:T.red,borderRadius:8,padding:"11px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          {saving?"Disqualifying…":"Disqualify"}
        </button>
      </div>

      {disqs.length>0 && (
        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:14}}>Active Disqualifications</div>
          {disqs.map(d=>(
            <div key={d.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,color:T.white,fontWeight:600}}>@{d.username}</span>
                  {d.permanent&&<span style={{fontSize:9,color:T.red,border:"1px solid rgba(239,68,68,0.4)",
                    borderRadius:20,padding:"2px 8px",letterSpacing:"0.1em"}}>PERMANENT</span>}
                </div>
                <div style={{fontSize:12,color:T.muted,marginTop:2}}>{d.reason}</div>
                {d.notes&&<div style={{fontSize:11,color:T.dim}}>{d.notes}</div>}
                <div style={{fontSize:10,color:T.dim}}>{new Date(d.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={()=>reverse(d.id,d.username)} style={btnStyle("olive")}>Reverse</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LEADERBOARD TAB ───────────────────────────────────────────────────────────
function LeaderboardTab({ totals, cycle }) {
  const eligible = totals.filter(t=>t.eligible&&!t.disqualified);
  const total = eligible.reduce((s,t)=>s+parseFloat(t.total_active_entries),0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[
          {label:"Total Participants", value:totals.length},
          {label:"Eligible",           value:eligible.length},
          {label:"Total Entries",      value:total.toFixed(2)},
        ].map(s=>(
          <div key={s.label} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:9,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:700,color:T.white,fontFamily:"'Fredoka',system-ui,sans-serif"}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:14}}>
          Entry Leaderboard — {cycle?.name}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto auto",gap:"0 12px",
          fontSize:10,color:T.dim,textTransform:"uppercase",letterSpacing:"0.08em",
          padding:"0 0 8px",borderBottom:`1px solid ${T.border}`,marginBottom:8}}>
          <span>#</span><span>User</span><span>Proofs</span><span>Bonus</span><span>Total</span>
        </div>
        {totals.slice(0,50).map((t,i)=>(
          <div key={t.username} style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto auto",
            gap:"0 12px",padding:"8px 0",borderBottom:`1px solid ${T.border}`,
            opacity:t.disqualified?0.4:1}}>
            <span style={{fontSize:12,color:T.dim,width:24}}>{i+1}</span>
            <span style={{fontSize:13,color:T.white}}>
              @{t.username}
              {t.disqualified&&<span style={{fontSize:9,color:T.red,marginLeft:6}}>DQ</span>}
              {!t.eligible&&!t.disqualified&&<span style={{fontSize:9,color:T.dim,marginLeft:6}}>({t.proof_day_count}/7d)</span>}
            </span>
            <span style={{fontSize:12,color:T.muted,textAlign:"right"}}>{parseFloat(t.proof_entries).toFixed(1)}</span>
            <span style={{fontSize:12,color:T.gold,textAlign:"right"}}>{parseFloat(t.active_bonus_entries).toFixed(1)}</span>
            <span style={{fontSize:12,color:T.olive,fontWeight:700,textAlign:"right"}}>{parseFloat(t.total_active_entries).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DRAW TAB ──────────────────────────────────────────────────────────────────
function DrawTab({ cycle, rewards, totals, flash, reload }) {
  const [drawType,    setDrawType]    = useState("grass_score");
  const [results,     setResults]     = useState([]);
  const [confirming,  setConfirming]  = useState(false);
  const [drawing,     setDrawing]     = useState(false);
  const [winners,     setWinners]     = useState([]);
  const loadWinners = async () => {
    if(!cycle) return;
    try {
      const r = await adminFetch("/api/grass-draw/admin-winners?cycle_id="+cycle.id);
      const d = await r.json();
      setWinners(d.winners||[]);
    } catch { setWinners([]); }
  };

  useEffect(()=>{
    if(!cycle) return;
    (async()=>{
      await loadWinners();
    })();
  },[cycle]);

  const [drawSeed,    setDrawSeed]    = useState("");
  const [drawLog,     setDrawLog]     = useState([]);
  const [excluded,    setExcluded]    = useState([]);

  const executeDrawn = async (dryArg = true) => {
    const dry = dryArg !== false;   // a click event (or anything but an explicit false) means preview
    if(!cycle) return flash("No active cycle","err");
    setDrawing(true);
    try {
      const r = await adminFetch("/api/grass-draw/execute-draw", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          cycle_id: cycle.id,
          draw_type: drawType,
          admin_username: "admin",
          dry_run: dry,
        }),
      });
      const d = await r.json();
      if(!r.ok) { flash(d.error||"Draw error","err"); setDrawing(false); return; }

      setResults(d.winners||[]);
      setDrawSeed(d.draw_seed||"");
      setDrawLog(d.draw_log||[]);
      setExcluded(d.excluded||[]);
      if(dry) setConfirming(true);
      else {
        flash(`✓ ${d.winners_count} winners saved — seed: ${d.draw_seed?.slice(0,20)}…`);
        setConfirming(false); setResults([]);
        await loadWinners();
      }
    } catch(e){ flash("Draw error: "+e.message,"err"); }
    setDrawing(false);
  };

  const confirmDraw = async () => { await executeDrawn(false); };

  // Hand-picked NFT winners (logged like drawn winners, marked manual)
  const [mRows,   setMRows]   = useState([{u:"",c:"screen_touchers"},{u:"",c:"screen_touchers"},{u:"",c:"screen_touchers"},{u:"",c:"screen_touchers"},{u:"",c:"grass_touchers"}]);
  const [mNote,   setMNote]   = useState("");
  const [mChecks, setMChecks] = useState(null);
  const [mBusy,   setMBusy]   = useState(false);
  const recordManual = async (dry) => {
    if(!cycle) return flash("No active cycle","err");
    setMBusy(true);
    try {
      const r = await adminFetch("/api/grass-draw/record-manual", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ cycle_id: cycle.id, dry_run: dry, note: mNote,
          picks: mRows.filter(x=>x.u.trim()).map(x=>({username:x.u,collection:x.c})) }) });
      const d = await r.json();
      setMChecks(d.checks||null);
      if(!r.ok) flash(d.error||"Could not check","err");
      else if(!dry){
        flash(`✓ ${d.saved} hand-picked NFT winner${d.saved===1?"":"s"} recorded`);
        setMChecks(null); setMRows(rs=>rs.map(x=>({...x,u:""}))); setMNote("");
        await loadWinners();
      }
    } catch(e){ flash("Error: "+e.message,"err"); }
    setMBusy(false);
  };

  const deliverReward = async (winner) => {
    try {
      const r = await adminFetch("/api/grass-draw/deliver-reward", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ winner_id: winner.id, admin_username:"admin" }),
      });
      const d = await r.json();
      if(!r.ok) { flash(d.error||"Delivery error","err"); return; }
      if(d.status==="pending_transfer") {
        flash(`NFT pending — transfer to: ${d.wallet_address}`);
      } else {
        flash(`✓ ${d.reward_type} delivered to @${d.username}`);
      }
    } catch(e){ flash("Error: "+e.message,"err"); }
    await loadWinners();
  };

  const markDelivered = async (id) => {
    await adminDb.from("grass_draw_winners")
      .update({delivered:true,delivered_at:new Date().toISOString()}).eq("id",id);
    flash("✓ Marked as delivered");
    await loadWinners();
  };

  const voidWinner = async (id,username) => {
    if(!confirm(`Void reward for @${username}?`)) return;
    await adminDb.from("grass_draw_winners")
      .update({voided:true,void_reason:"Admin voided"}).eq("id",id);
    flash(`✓ Voided reward for @${username}`);
    await loadWinners();
  };

  const DRAW_TYPES = [
    {value:"grass_score",   label:"Grass Score Draw",  note:"10 winners, +250 Score each"},
    {value:"shield",        label:"Shield Draw",       note:"5 winners, major reward"},
    {value:"profile_pack",  label:"Profile Pack Draw", note:"5 winners, major reward"},
    {value:"nft",           label:"NFT Draw",          note:"Wallet required, qty from config"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {!cycle&&<div style={{fontSize:13,color:T.dim}}>No active cycle.</div>}
      {cycle&&(
        <>
          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:6}}>Execute Draw</div>
            <div style={{fontSize:11,color:T.dim,marginBottom:16}}>
              Draw order: Grass Score → Shields → Profile Packs → NFTs.<br/>
              Confirm cycle is closed before drawing.
            </div>
            <label style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em"}}>Draw Type</label>
            <select style={{...inputStyle}} value={drawType} onChange={e=>{setDrawType(e.target.value);setResults([]);setConfirming(false);}}>
              {DRAW_TYPES.map(t=><option key={t.value} value={t.value}>{t.label} — {t.note}</option>)}
            </select>

            {!confirming ? (
              <button onClick={() => executeDrawn(true)} disabled={drawing}
                style={{background:"linear-gradient(135deg,rgba(147,168,90,0.2),rgba(200,168,75,0.1))",
                  border:`1px solid ${T.olive}`,color:T.olive,borderRadius:8,
                  padding:"12px 28px",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>
                {drawing?"Drawing…":`Run ${DRAW_TYPES.find(t=>t.value===drawType)?.label}`}
              </button>
            ) : (
              <div>
                <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:10}}>
                  ⚠️ Review results before confirming:
                </div>
                {results.map((w,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                    <span style={{fontSize:13,color:T.white}}>@{w.username}</span>
                    <span style={{fontSize:11,color:T.dim}}>{parseFloat(w.entries ?? w.total_active_entries).toFixed(2)} entries</span>
                  </div>
                ))}
                {drawSeed && (
                  <div style={{fontSize:10,color:T.dim,padding:"8px 0",fontFamily:"monospace",wordBreak:"break-all"}}>
                    Seed: {drawSeed}
                  </div>
                )}
                {excluded.length>0 && (
                  <div style={{fontSize:11,color:T.dim,marginTop:6}}>
                    {excluded.length} users excluded (ineligible/no wallet/already won)
                  </div>
                )}
                <div style={{display:"flex",gap:10,marginTop:14}}>
                  <button onClick={confirmDraw} disabled={drawing}
                    style={{background:T.olive,color:"#0a0c08",border:"none",borderRadius:8,
                      padding:"11px 24px",fontSize:13,fontWeight:700,cursor:"pointer",flex:1}}>
                    {drawing?"Saving…":"✓ Confirm & Save Winners"}
                  </button>
                  <button onClick={()=>{setConfirming(false);setResults([]);setDrawSeed("");setDrawLog([]);}}
                    style={{background:"transparent",border:`1px solid ${T.border}`,color:T.muted,
                      borderRadius:8,padding:"11px 16px",fontSize:13,cursor:"pointer"}}>
                    Re-draw
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hand-picked NFT winners */}
          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:4}}>Record hand-picked NFT winners</div>
            <div style={{fontSize:11,color:T.dim,marginBottom:12,lineHeight:1.5}}>For prizes you choose yourself. Saved as NFT winners for {cycle?.name||"this cycle"} and marked "manual", so they show in the log, delivery tracking and the winner page. Nothing is randomised.</div>
            {mRows.map((row,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                <input style={{...inputStyle,marginBottom:0,flex:2}} placeholder="@username" value={row.u}
                  onChange={e=>{const v=e.target.value;setMRows(rs=>rs.map((x,j)=>j===i?{...x,u:v}:x));setMChecks(null);}} />
                <select style={{...inputStyle,marginBottom:0,flex:1.4}} value={row.c}
                  onChange={e=>{const v=e.target.value;setMRows(rs=>rs.map((x,j)=>j===i?{...x,c:v}:x));setMChecks(null);}}>
                  <option value="screen_touchers">Screen Toucher</option>
                  <option value="grass_touchers">Grass Toucher</option>
                </select>
              </div>
            ))}
            <button onClick={()=>setMRows(rs=>[...rs,{u:"",c:"screen_touchers"}])} style={{...btnStyle("gold"),marginBottom:10}}>+ Add row</button>
            <input style={inputStyle} placeholder="Note (optional), e.g. giveaway on X" value={mNote} onChange={e=>setMNote(e.target.value)} />
            {mChecks&&mChecks.map((c,i)=>(
              <div key={i} style={{fontSize:12,padding:"6px 0",borderBottom:`1px solid ${T.border}`}}>
                <span style={{color:T.white}}>@{c.username||"?"}</span>
                <span style={{color:T.dim,marginLeft:8}}>{c.collection==="grass_touchers"?"Grass Toucher":"Screen Toucher"}</span>
                {c.problems.map((p,j)=><div key={"p"+j} style={{color:T.red,fontSize:11}}>✗ {p}</div>)}
                {c.warnings.map((p,j)=><div key={"w"+j} style={{color:T.gold,fontSize:11}}>⚠ {p}</div>)}
                {!c.problems.length&&!c.warnings.length&&<div style={{color:T.green,fontSize:11}}>✓ Ready</div>}
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:12}}>
              <button onClick={()=>recordManual(true)} disabled={mBusy} style={{...btnStyle("olive"),flex:1}}>{mBusy?"Checking…":"Check winners"}</button>
              {mChecks&&!mChecks.some(c=>c.problems.length)&&(
                <button onClick={()=>recordManual(false)} disabled={mBusy} style={{background:T.olive,color:"#0a0c08",border:"none",borderRadius:8,padding:"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",flex:1}}>✓ Record winners</button>
              )}
            </div>
          </div>

          {/* Winners list */}
          {winners.length>0&&(
            <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"20px"}}>
              <div style={{fontSize:12,fontWeight:700,color:T.white,marginBottom:14}}>Winners — {cycle.name}</div>
              {["grass_score","shield","profile_pack","nft"].map(type=>{
                const tw = winners.filter(w=>w.reward_type===type);
                if(!tw.length) return null;
                return (
                  <div key={type} style={{marginBottom:16}}>
                    <div style={{fontSize:11,color:T.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>
                      {type.replace("_"," ")}
                    </div>
                    {tw.map(w=>(
                      <div key={w.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`,opacity:w.voided?0.4:1}}>
                        <div style={{flex:1}}>
                          <span style={{fontSize:13,color:T.white}}>@{w.username}</span>
                          {w.voided&&<span style={{fontSize:9,color:T.red,marginLeft:8}}>VOIDED</span>}
                          {w.delivered&&<span style={{fontSize:9,color:T.green,marginLeft:8}}>DELIVERED</span>}
                          {w.reward_type==="nft"&&w.metadata?.wallet_address&&(
                            <div style={{fontSize:10,color:T.dim,fontFamily:"monospace",marginTop:2,wordBreak:"break-all"}}>
                              {w.metadata.nft_status==="pending_transfer"?"⏳ Pending: ":"✓ "}{w.metadata.wallet_address}
                            </div>
                          )}
                          {w.reward_type==="profile_pack"&&w.reward_reference&&(
                            <div style={{fontSize:10,color:T.dim,marginTop:2}}>{w.reward_reference}</div>
                          )}
                        </div>
                        {!w.delivered&&!w.voided&&(
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {w.reward_type!=="grass_score"&&(
                              <button onClick={()=>deliverReward(w)} style={btnStyle("olive")}>Deliver</button>
                            )}
                            <button onClick={()=>markDelivered(w.id)} style={btnStyle("gold")}>Mark Delivered</button>
                            <button onClick={()=>voidWinner(w.id,w.username)} style={btnStyle("red")}>Void</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}