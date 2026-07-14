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

const PREMIUM_CATALOG = {
  premium_proofs: {
    label:  "Premium Proofs",
    icon:   "✨",
    cost:   100000,
    desc:   "Unlocks all premium Result Card themes forever.",
  },
};

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US",{
    month:"short", day:"numeric", year:"numeric",
    hour:"2-digit", minute:"2-digit",
  });
}

export default function AdminPremium() {
  const [authed,     setAuthed]     = useState(false);
  const [pw,         setPw]         = useState("");
  const [tab,        setTab]        = useState("pending");
  const [pending,    setPending]    = useState([]);
  const [reviewed,   setReviewed]   = useState([]);
  const [processing, setProcessing] = useState(null);
  const [success,    setSuccess]    = useState("");
  const [error,      setError]      = useState("");

  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setError(""); setTimeout(() => setSuccess(""), 5000); }
    else { setError(msg); setSuccess(""); setTimeout(() => setError(""), 7000); }
  };

  const loadPending = async () => {
    const { data } = await supabase
      .from("PremiumPurchaseRequests")
      .select("*").eq("status", "pending")
      .order("created_at", { ascending: true });
    setPending(data || []);
  };

  const loadReviewed = async () => {
    const { data } = await supabase
      .from("PremiumPurchaseRequests")
      .select("*").in("status", ["approved","rejected"])
      .order("reviewed_at", { ascending: false }).limit(50);
    setReviewed(data || []);
  };

  const load = () => { loadPending(); loadReviewed(); };

  useEffect(() => { if (authed) load(); }, [authed]);

  const approve = async (req) => {
    setProcessing(req.id);
    setPending(prev => prev.filter(p => p.id !== req.id));
    try {
      // 1. Mark request approved
      const { error: updErr } = await supabase
        .from("PremiumPurchaseRequests")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", req.id);
      if (updErr) throw updErr;

      // 2. Check not already unlocked
      const { data: existing } = await supabase
        .from("UserPremiumUnlocks")
        .select("id").eq("username", req.username)
        .eq("premium_type", req.premium_type).maybeSingle();

      if (!existing) {
        const { error: unlockErr } = await supabase
          .from("UserPremiumUnlocks")
          .insert({
            username:     req.username,
            premium_type: req.premium_type,
            tx_hash:      req.tx_signature,
            request_id:   req.id,
          });
        if (unlockErr) throw unlockErr;
      }

      flash("success", `✓ Approved ${PREMIUM_CATALOG[req.premium_type]?.label || req.premium_type} for @${req.username}`);
      setTimeout(() => loadReviewed(), 600);
    } catch(e) {
      setPending(prev => [...prev, req]);
      flash("error", `Failed: ${e.message}`);
    }
    setProcessing(null);
  };

  const reject = async (req) => {
    setProcessing(req.id);
    setPending(prev => prev.filter(p => p.id !== req.id));
    try {
      const { error: rejErr } = await supabase
        .from("PremiumPurchaseRequests")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", req.id);
      if (rejErr) throw rejErr;
      flash("success", `Rejected request from @${req.username}`);
      setTimeout(() => loadReviewed(), 600);
    } catch(e) {
      setPending(prev => [...prev, req]);
      flash("error", `Failed: ${e.message}`);
    }
    setProcessing(null);
  };

  if (!authed) return (
    <div style={{ minHeight:"100vh", background:T.bg,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
        borderRadius:14, padding:"32px 28px", width:"100%", maxWidth:340, textAlign:"center" }}>
        <div style={{ fontSize:28, marginBottom:12 }}>✨</div>
        <div style={{ fontFamily:"monospace", fontSize:14,
          color:T.muted, marginBottom:20 }}>Premium+ Admin</div>
        <input type="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter" && pw===ADMIN_PASSWORD) setAuthed(true); }}
          placeholder="Password"
          style={{ width:"100%", background:"rgba(0,0,0,0.3)",
            border:`1px solid ${T.border}`, borderRadius:8,
            padding:"10px 12px", color:T.white, fontSize:13,
            outline:"none", marginBottom:12, boxSizing:"border-box" }} />
        <button onClick={() => { if(pw===ADMIN_PASSWORD) setAuthed(true); else flash("error","Wrong password."); }}
          style={{ width:"100%", background:T.gold, color:"#0a0c08",
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
    background: tab===t ? T.gold : "transparent",
    color: tab===t ? "#0a0c08" : T.muted,
  });

  const ReqCard = ({ req, showActions }) => {
    const def = PREMIUM_CATALOG[req.premium_type];
    return (
      <div style={{ background:T.bg2, border:`1px solid ${T.borderGold}`,
        borderRadius:12, padding:"16px 18px", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:20 }}>{def?.icon || "✨"}</span>
              <span style={{ fontWeight:700, color:T.white, fontSize:14 }}>
                @{req.username}
              </span>
              <span style={{ fontSize:11, color:T.gold,
                background:"rgba(200,168,75,0.1)",
                border:`1px solid rgba(200,168,75,0.3)`,
                padding:"2px 8px", borderRadius:20, fontFamily:"monospace" }}>
                {def?.label || req.premium_type}
              </span>
              {req.status !== "pending" && (
                <span style={{ fontSize:10, fontFamily:"monospace",
                  color: req.status==="approved" ? T.olive : "#ef4444",
                  background: req.status==="approved"
                    ? "rgba(147,168,90,0.12)" : "rgba(239,68,68,0.1)",
                  padding:"1px 7px", borderRadius:20 }}>
                  {req.status==="approved" ? "✓ Approved" : "✕ Rejected"}
                </span>
              )}
            </div>
            <div style={{ fontSize:11, color:T.muted, display:"flex",
              gap:16, flexWrap:"wrap" }}>
              <span>💰 {(req.token_amount||0).toLocaleString()} $TOUCHGRASS</span>
              <span>🕐 {fmtDate(req.created_at)}</span>
              {req.tx_signature && (
                <span style={{ fontFamily:"monospace", fontSize:10, color:T.dim }}>
                  tx: {req.tx_signature.slice(0,18)}…
                </span>
              )}
            </div>
          </div>
          {showActions && (
            <div style={{ display:"flex", gap:8, flexShrink:0 }}>
              <button onClick={() => approve(req)}
                disabled={processing===req.id}
                style={{ background:T.olive, color:T.bg, border:"none",
                  borderRadius:8, padding:"8px 16px", fontSize:12,
                  fontWeight:700, cursor:"pointer",
                  opacity:processing===req.id?0.6:1 }}>
                ✓ Approve
              </button>
              <button onClick={() => reject(req)}
                disabled={processing===req.id}
                style={{ background:"transparent", color:"#ef4444",
                  border:"1px solid rgba(239,68,68,0.3)",
                  borderRadius:8, padding:"8px 16px", fontSize:12,
                  fontWeight:600, cursor:"pointer",
                  opacity:processing===req.id?0.6:1 }}>
                ✕ Reject
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg,
      color:T.white, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ maxWidth:860, margin:"0 auto", padding:"32px 16px 64px" }}>

        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"monospace", fontSize:22,
              fontWeight:700, color:T.white, margin:0 }}>
              ✨ Premium+ Admin
            </h1>
            <div style={{ fontSize:12, color:T.dim, marginTop:4 }}>
              Approve permanent Premium+ unlocks.
            </div>
          </div>
          <Link href="/admin/burns" style={{ fontSize:12, color:T.dim,
            textDecoration:"none" }}>← Burns Admin</Link>
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
                No pending Premium+ requests.
              </div>
            ) : pending.map(r => <ReqCard key={r.id} req={r} showActions={true} />)}
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
                No reviewed requests yet.
              </div>
            ) : reviewed.map(r => <ReqCard key={r.id} req={r} showActions={false} />)}
          </div>
        )}

      </div>
    </div>
  );
}