import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  olive:"#93a85a", gold:"#c8a84b", fire:"#f97316", amber:"#f59e0b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const TIERS = [
  { min:250, label:"Grass Jab — Legend",   slug:"grass-jab-legend",   emoji:"🥊", color:"#e879f9" },
  { min:100, label:"Grass Jab — Platinum", slug:"grass-jab-platinum", emoji:"🥊", color:"#67e8f9" },
  { min:50,  label:"Grass Jab — Gold",     slug:"grass-jab-gold",     emoji:"🥊", color:T.gold    },
  { min:25,  label:"Grass Jab — Silver",   slug:"grass-jab-silver",   emoji:"🥊", color:"#cbd5e1" },
  { min:10,  label:"Grass Jab — Bronze",   slug:"grass-jab-bronze",   emoji:"🥊", color:"#cd7f32" },
];

function getTier(punches) {
  return TIERS.find(t => punches >= t.min) || null;
}

function getPoints(punches) {
  return Math.floor(punches / 10) * 100;
}

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US",
    { month:"short", day:"numeric", year:"numeric",
      hour:"2-digit", minute:"2-digit" });
}

export default function AdminFight() {
  const [authed,      setAuthed]      = useState(false);
  const [pw,          setPw]          = useState("");
  const [tab,         setTab]         = useState("pending");
  const [pending,     setPending]     = useState([]);
  const [reviewed,    setReviewed]    = useState([]);
  const [processing,  setProcessing]  = useState(null);
  const [success,     setSuccess]     = useState("");
  const [error,       setError]       = useState("");
  const [expanded,    setExpanded]    = useState(null);

  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setError(""); setTimeout(() => setSuccess(""), 4000); }
    else { setError(msg); setSuccess(""); setTimeout(() => setError(""), 6000); }
  };

  const load = async () => {
    const { data: p } = await supabase
      .from("FightClubSubmissions")
      .select("*")
      .eq("status","pending")
      .order("created_at", { ascending: true });
    setPending(p || []);

    const { data: r } = await supabase
      .from("FightClubSubmissions")
      .select("*")
      .in("status",["approved","rejected"])
      .order("reviewed_at", { ascending: false })
      .limit(50);
    setReviewed(r || []);
  };

  useEffect(() => { if (authed) load(); }, [authed]);

  const approve = async (sub) => {
    setProcessing(sub.id);
    setPending(prev => prev.filter(p => p.id !== sub.id));
    try {
      const pointsToGrant = getPoints(sub.punch_count);

      // 1. Mark submission approved
      await supabase.from("FightClubSubmissions").update({
        status:         "approved",
        points_granted: pointsToGrant,
        reviewed_at:    new Date().toISOString(),
      }).eq("id", sub.id);

      // 2. Upsert FightClubStats — add to running total
      const { data: existing } = await supabase
        .from("FightClubStats")
        .select("*")
        .eq("username", sub.username)
        .maybeSingle();

      const newPunches = (existing?.total_punches || 0) + sub.punch_count;
      const newPoints  = (existing?.total_points  || 0) + pointsToGrant;
      const newTier    = getTier(newPunches);

      await supabase.from("FightClubStats").upsert({
        username:      sub.username,
        total_punches: newPunches,
        total_points:  newPoints,
        current_tier:  newTier?.slug || null,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "username" });

      // 3. Update Profiles — punch_badge, total_punches, grass_score
      await supabase.from("Profiles").upsert({
        username:         sub.username,
        punch_badge:      newTier?.slug || null,
        punch_badge_tier: newTier?.label || null,
        total_punches:    newPunches,
        grass_score:      supabase.rpc ? undefined : undefined, // updated below
      }, { onConflict: "username" });

      // Update grass_score separately (increment)
      if (pointsToGrant > 0) {
        const { data: prof } = await supabase
          .from("Profiles")
          .select("grass_score")
          .eq("username", sub.username)
          .maybeSingle();
        await supabase.from("Profiles").update({
          grass_score:      (prof?.grass_score || 0) + pointsToGrant,
          punch_badge:      newTier?.slug  || null,
          punch_badge_tier: newTier?.label || null,
          total_punches:    newPunches,
        }).eq("username", sub.username);

        // Log to ScoreEvents
        try {
          await supabase.from("ScoreEvents").insert({
            username:   sub.username,
            event_type: "fight_club_punches",
            points:     pointsToGrant,
            metadata:   {
              punch_count:    sub.punch_count,
              submission_id:  sub.id,
              tier:           newTier?.slug,
            },
          });
        } catch {}
      }

      flash("success", `✓ Approved @${sub.username} — ${sub.punch_count} punches, +${pointsToGrant} pts, tier: ${newTier?.label || "none yet"}`);
      load();
    } catch(e) {
      setPending(prev => [...prev, sub]);
      flash("error", `Failed: ${e.message}`);
    }
    setProcessing(null);
  };

  const reject = async (sub) => {
    setProcessing(sub.id);
    setPending(prev => prev.filter(p => p.id !== sub.id));
    try {
      await supabase.from("FightClubSubmissions").update({
        status:      "rejected",
        reviewed_at: new Date().toISOString(),
      }).eq("id", sub.id);
      flash("success", `Rejected submission from @${sub.username}`);
      load();
    } catch(e) {
      setPending(prev => [...prev, sub]);
      flash("error", `Failed: ${e.message}`);
    }
    setProcessing(null);
  };

  if (!authed) return (
    <div style={{ minHeight:"100vh", background:T.bg,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
        borderRadius:14, padding:"32px 28px", width:"100%",
        maxWidth:340, textAlign:"center" }}>
        <div style={{ fontSize:28, marginBottom:12 }}>🥊</div>
        <div style={{ fontFamily:"monospace", fontSize:14,
          color:T.muted, marginBottom:20 }}>Fight Club Admin</div>
        <input type="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter" && pw===ADMIN_PASSWORD) setAuthed(true); }}
          placeholder="Password"
          style={{ width:"100%", background:"rgba(0,0,0,0.3)",
            border:`1px solid ${T.border}`, borderRadius:8,
            padding:"10px 12px", color:T.white, fontSize:13,
            outline:"none", marginBottom:12, boxSizing:"border-box" }} />
        <button onClick={() => { if(pw===ADMIN_PASSWORD) setAuthed(true); else flash("error","Wrong password."); }}
          style={{ width:"100%", background:T.fire, color:"#fff",
            border:"none", borderRadius:8, padding:"11px",
            fontSize:13, fontWeight:700, cursor:"pointer" }}>
          Enter
        </button>
        {error && <div style={{ fontSize:11, color:"#ef4444", marginTop:8 }}>{error}</div>}
      </div>
    </div>
  );

  const tabStyle = (t) => ({
    padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer",
    fontFamily:"monospace", fontSize:11, fontWeight:600, letterSpacing:"0.08em",
    background: tab===t ? T.fire : "transparent",
    color: tab===t ? "#fff" : T.muted,
  });

  const SubCard = ({ s, showActions }) => {
    const tier = getTier(s.punch_count);
    const pts  = getPoints(s.punch_count);
    const open = expanded === s.id;
    return (
      <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
        borderRadius:12, overflow:"hidden", marginBottom:10 }}>
        {/* Header row */}
        <div style={{ display:"flex", alignItems:"center", gap:12,
          padding:"14px 16px", flexWrap:"wrap" }}>
          <span style={{ fontSize:22, flexShrink:0 }}>🥊</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center",
              gap:8, flexWrap:"wrap", marginBottom:3 }}>
              <span style={{ fontSize:14, fontWeight:700, color:T.white }}>
                @{s.username}
              </span>
              <span style={{ fontSize:11, color:T.dim }}>
                X: @{s.x_username}
              </span>
              {s.status !== "pending" && (
                <span style={{ fontSize:10, fontFamily:"monospace",
                  padding:"1px 7px", borderRadius:20,
                  color: s.status==="approved"?T.olive:"#ef4444",
                  background: s.status==="approved"?"rgba(147,168,90,0.12)":"rgba(239,68,68,0.1)" }}>
                  {s.status==="approved"?"✓ Approved":"✕ Rejected"}
                </span>
              )}
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, color:T.fire, fontWeight:700 }}>
                {s.punch_count} punches
              </span>
              {tier && (
                <span style={{ fontSize:12, color:tier.color, fontWeight:600 }}>
                  → {tier.label}
                </span>
              )}
              <span style={{ fontSize:12, color:T.olive }}>
                +{pts} pts
              </span>
              <span style={{ fontSize:11, color:T.dim }}>
                {fmtDate(s.created_at)}
              </span>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0, alignItems:"center" }}>
            {s.screenshot_url && (
              <button onClick={() => setExpanded(open ? null : s.id)}
                style={{ background:T.bg3, border:`1px solid ${T.border}`,
                  color:T.dim, borderRadius:7, padding:"6px 12px",
                  fontSize:11, cursor:"pointer" }}>
                {open ? "Hide" : "Screenshot"}
              </button>
            )}
            {showActions && (
              <>
                <button onClick={() => approve(s)}
                  disabled={processing===s.id}
                  style={{ background:T.olive, color:T.bg, border:"none",
                    borderRadius:8, padding:"8px 16px", fontSize:12,
                    fontWeight:700, cursor:"pointer",
                    opacity:processing===s.id?0.6:1 }}>
                  ✓ Approve
                </button>
                <button onClick={() => reject(s)}
                  disabled={processing===s.id}
                  style={{ background:"transparent", color:"#ef4444",
                    border:"1px solid rgba(239,68,68,0.3)",
                    borderRadius:8, padding:"8px 16px", fontSize:12,
                    fontWeight:600, cursor:"pointer",
                    opacity:processing===s.id?0.6:1 }}>
                  ✕ Reject
                </button>
              </>
            )}
          </div>
        </div>
        {/* Screenshot */}
        {open && s.screenshot_url && (
          <div style={{ padding:"0 16px 16px" }}>
            <img src={s.screenshot_url} alt="screenshot"
              style={{ width:"100%", maxHeight:400,
                objectFit:"contain", borderRadius:8,
                border:`1px solid ${T.border}` }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg,
      color:T.white, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ maxWidth:900, margin:"0 auto",
        padding:"32px 16px 64px" }}>

        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontFamily:"monospace", fontSize:22,
            fontWeight:700, color:T.white, margin:0 }}>
            🥊 Grass Jab Admin
          </h1>
          <div style={{ fontSize:12, color:T.dim, marginTop:4 }}>
            Review punch submissions, approve badges and Grass Score.
          </div>
        </div>

        {success && (
          <div style={{ background:"rgba(147,168,90,0.1)",
            border:`1px solid ${T.borderG}`, borderRadius:10,
            padding:"12px 16px", fontSize:12, color:T.olive,
            marginBottom:16 }}>{success}</div>
        )}
        {error && (
          <div style={{ background:"rgba(239,68,68,0.08)",
            border:"1px solid rgba(239,68,68,0.3)", borderRadius:10,
            padding:"12px 16px", fontSize:12, color:"#ef4444",
            marginBottom:16 }}>{error}</div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:24,
          background:T.bg2, borderRadius:10, padding:4,
          width:"fit-content", border:`1px solid ${T.border}` }}>
          <button style={tabStyle("pending")} onClick={() => setTab("pending")}>
            ⏳ Pending ({pending.length})
          </button>
          <button style={tabStyle("reviewed")} onClick={() => setTab("reviewed")}>
            📋 Reviewed
          </button>
        </div>

        {tab === "pending" && (
          <div>
            {pending.length === 0 ? (
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
                borderRadius:12, padding:"40px 24px",
                textAlign:"center", color:T.dim, fontSize:13 }}>
                No pending submissions.
              </div>
            ) : (
              pending.map(s => (
                <SubCard key={s.id} s={s} showActions={true} />
              ))
            )}
            <button onClick={load}
              style={{ background:"transparent", border:`1px solid ${T.border}`,
                color:T.dim, borderRadius:8, padding:"9px 18px",
                fontSize:11, cursor:"pointer", marginTop:8 }}>
              ↻ Refresh
            </button>
          </div>
        )}

        {tab === "reviewed" && (
          <div>
            {reviewed.length === 0 ? (
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
                borderRadius:12, padding:"40px 24px",
                textAlign:"center", color:T.dim, fontSize:13 }}>
                No reviewed submissions yet.
              </div>
            ) : (
              reviewed.map(s => (
                <SubCard key={s.id} s={s} showActions={false} />
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}