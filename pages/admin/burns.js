import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

const EVENT_START = new Date("2026-06-21T00:00:00Z");
const EVENT_END   = new Date("2026-07-02T00:00:00Z");

const CONSUMABLES = [
  {
    type:        "shield",
    label:       "Streak Shield",
    icon:        "🛡",
    cost:        50000,
    costLabel:   "50,000 $TOUCHGRASS",
    description: "Protects a missed day.",
    color:       "#c8a84b",
  },
  {
    type:        "sunset_pass",
    label:       "Sunset Pass",
    icon:        "🌅",
    cost:        25000,
    costLabel:   "25,000 $TOUCHGRASS",
    description: "Extends today's proof window by 2 hours.",
    color:       "#f97316",
  },
];

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  olive:"#93a85a", gold:"#c8a84b", fire:"#f97316",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

function fmtAmount(n) {
  if (!n) return "—";
  return Number(n).toLocaleString();
}

export default function AdminBurns() {
  const [authed, setAuthed]             = useState(false);
  const [pw, setPw]                     = useState("");
  const [tab, setTab]                   = useState("pending");
  const [pending, setPending]           = useState([]);
  const [history, setHistory]           = useState([]);
  const [manualUsername, setManualUsername] = useState("");
  const [manualType, setManualType]     = useState("shield");
  const [manualTx, setManualTx]         = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualQty, setManualQty]       = useState(1);
  const [processingId, setProcessingId] = useState(null);
  const [success, setSuccess]           = useState("");
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  const flash = (type, msg) => {
    if (type === "success") { setSuccess(msg); setError(""); setTimeout(() => setSuccess(""), 4000); }
    else { setError(msg); setSuccess(""); setTimeout(() => setError(""), 6000); }
  };

  const loadPending = async () => {
    const { data } = await supabase
      .from("ShieldPurchases")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setPending(data ?? []);
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from("ConsumableEvents")
      .select("*")
      .in("event_type", ["purchase_approved","purchase_rejected","consumed","activated","admin_adjusted"])
      .order("created_at", { ascending: false })
      .limit(100);
    setHistory(data ?? []);
  };

  useEffect(() => {
    if (!authed) return;
    loadPending();
    loadHistory();
  }, [authed]);

  // ── Approve ───────────────────────────────────────────────
  const approve = async (purchase) => {
    setProcessingId(purchase.id);
    // Optimistic removal
    setPending(prev => prev.filter(p => p.id !== purchase.id));
    try {
      const consumableType = purchase.consumable_type || "shield";
      const qty            = purchase.quantity || 1;

      // 1. Mark purchase approved
      const { error: updateErr } = await supabase
        .from("ShieldPurchases")
        .update({ status:"approved" })
        .eq("id", purchase.id);
      if (updateErr) throw updateErr;

      // 2. Upsert UserConsumables
      const { data: existing } = await supabase
        .from("UserConsumables")
        .select("id,quantity")
        .eq("username", purchase.username)
        .eq("consumable_type", consumableType)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("UserConsumables")
          .update({ quantity: existing.quantity + qty, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("UserConsumables")
          .insert({ username: purchase.username, consumable_type: consumableType, quantity: qty });
      }

      // 3. Log ConsumableEvent
      await supabase.from("ConsumableEvents").insert({
        username:        purchase.username,
        consumable_type: consumableType,
        event_type:      "purchase_approved",
        quantity:        qty,
        metadata: {
          purchase_id:  purchase.id,
          tx_signature: purchase.tx_signature,
          amount_burned: purchase.token_amount,
        },
      });

      // 4. Legacy shield_count sync for backwards compatibility
      if (consumableType === "shield") {
        const { data: streakRow } = await supabase
          .from("Streaks").select("shield_count").eq("username", purchase.username).maybeSingle();
        await supabase.from("Streaks")
          .update({ shield_count: (streakRow?.shield_count ?? 0) + qty })
          .eq("username", purchase.username);

        // Shield burn event (legacy + leaderboard)
        const inEvent = new Date(purchase.created_at) >= EVENT_START && new Date(purchase.created_at) < EVENT_END;
        const amount  = Number(purchase.token_amount || 50000);
        await supabase.from("BurnEvents").insert({
          username:             purchase.username,
          burn_type:            "shield_burn",
          amount_burned:        amount,
          treasury_match_amount: inEvent ? amount : 0,
          shield_count:         qty,
          tx_signature:         purchase.tx_signature || null,
          metadata:             { source:"ShieldPurchases", shield_purchase_id: purchase.id },
        });

        // Try RPC for double burn progression (non-fatal)
        try { await supabase.rpc("recompute_double_burn_progression", { p_username: purchase.username }); } catch {}
      }

      flash("success", `✓ Approved ${qty}x ${consumableType.replace("_"," ")} for @${purchase.username}`);
      loadHistory();
    } catch(e) {
      // Rollback optimistic removal
      setPending(prev => [...prev, purchase]);
      flash("error", `Failed to approve: ${e.message}`);
    }
    setProcessingId(null);
  };

  // ── Reject ────────────────────────────────────────────────
  const reject = async (purchase) => {
    setProcessingId(purchase.id);
    setPending(prev => prev.filter(p => p.id !== purchase.id));
    try {
      await supabase.from("ShieldPurchases").update({ status:"rejected" }).eq("id", purchase.id);
      await supabase.from("ConsumableEvents").insert({
        username:        purchase.username,
        consumable_type: purchase.consumable_type || "shield",
        event_type:      "purchase_rejected",
        quantity:        0,
        metadata:        { purchase_id: purchase.id },
      });
      flash("success", `Rejected purchase for @${purchase.username}`);
      loadHistory();
    } catch(e) {
      setPending(prev => [...prev, purchase]);
      flash("error", `Failed to reject: ${e.message}`);
    }
    setProcessingId(null);
  };

  // ── Manual grant ──────────────────────────────────────────
  const manualGrant = async () => {
    if (!manualUsername.trim()) return flash("error", "Username required.");
    const qty = parseInt(manualQty, 10);
    if (!qty || qty < 1) return flash("error", "Quantity must be at least 1.");
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("UserConsumables")
        .select("id,quantity")
        .eq("username", manualUsername.trim())
        .eq("consumable_type", manualType)
        .maybeSingle();

      if (existing) {
        await supabase.from("UserConsumables")
          .update({ quantity: existing.quantity + qty, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("UserConsumables")
          .insert({ username: manualUsername.trim(), consumable_type: manualType, quantity: qty });
      }

      await supabase.from("ConsumableEvents").insert({
        username:        manualUsername.trim(),
        consumable_type: manualType,
        event_type:      "admin_adjusted",
        quantity:        qty,
        metadata:        { tx_signature: manualTx || null, notes: "manual admin grant", amount_burned: manualAmount || null },
      });

      if (manualType === "shield") {
        const { data: streakRow } = await supabase.from("Streaks").select("shield_count").eq("username", manualUsername.trim()).maybeSingle();
        if (streakRow) {
          await supabase.from("Streaks").update({ shield_count: (streakRow.shield_count ?? 0) + qty }).eq("username", manualUsername.trim());
        }
      }

      flash("success", `✓ Granted ${qty}x ${manualType.replace("_"," ")} to @${manualUsername.trim()}`);
      setManualUsername(""); setManualTx(""); setManualAmount(""); setManualQty(1);
      loadHistory();
    } catch(e) { flash("error", `Manual grant failed: ${e.message}`); }
    setLoading(false);
  };

  if (!authed) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"32px 28px",width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>🔐</div>
        <div style={{fontFamily:"monospace",fontSize:14,color:T.muted,marginBottom:20}}>Admin Access</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter" && pw===ADMIN_PASSWORD) setAuthed(true); }}
          placeholder="Password" style={{width:"100%",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",color:T.white,fontSize:13,outline:"none",marginBottom:12,boxSizing:"border-box"}} />
        <button onClick={()=>{ if(pw===ADMIN_PASSWORD) setAuthed(true); else flash("error","Wrong password."); }}
          style={{width:"100%",background:T.olive,color:T.bg,border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Enter
        </button>
      </div>
    </div>
  );

  const tabStyle = (t) => ({
    padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer",
    fontFamily:"monospace", fontSize:11, fontWeight:600, letterSpacing:"0.08em",
    background: tab===t ? T.olive : "transparent",
    color: tab===t ? T.bg : T.muted,
  });

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.white,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 16px 64px"}}>

        <div style={{marginBottom:28}}>
          <h1 style={{fontFamily:"monospace",fontSize:22,fontWeight:700,color:T.white,margin:0}}>
            🎒 Consumables Admin
          </h1>
          <div style={{fontSize:12,color:T.dim,marginTop:4}}>
            Approve purchases, grant consumables, view history.
          </div>
        </div>

        {success && <div style={{background:"rgba(147,168,90,0.1)",border:`1px solid ${T.borderG}`,borderRadius:10,padding:"12px 16px",fontSize:12,color:T.olive,marginBottom:16}}>{success}</div>}
        {error   && <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"12px 16px",fontSize:12,color:"#ef4444",marginBottom:16}}>{error}</div>}

        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginBottom:24,background:T.bg2,borderRadius:10,padding:4,width:"fit-content",border:`1px solid ${T.border}`}}>
          {[["pending","⏳ Pending"],["manual","✍️ Manual Grant"],["history","📋 History"]].map(([t,l])=>(
            <button key={t} style={tabStyle(t)} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>

        {/* ── Pending tab ─────────────────────────────────── */}
        {tab === "pending" && (
          <div>
            <div style={{fontSize:11,color:T.dim,marginBottom:14,fontFamily:"monospace",letterSpacing:"0.1em"}}>
              PENDING PURCHASE REQUESTS — {pending.length} item{pending.length!==1?"s":""}
            </div>
            {pending.length === 0 && (
              <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"40px 24px",textAlign:"center",color:T.dim,fontSize:13}}>
                No pending requests.
              </div>
            )}
            {pending.map(p => {
              const cType = p.consumable_type || "shield";
              const def   = CONSUMABLES.find(c => c.type === cType) || CONSUMABLES[0];
              return (
                <div key={p.id} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"18px 20px",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{fontSize:20}}>{def.icon}</span>
                        <span style={{fontWeight:700,color:T.white,fontSize:14}}>@{p.username}</span>
                        <span style={{fontSize:11,color:def.color,background:`${def.color}18`,padding:"2px 8px",borderRadius:20,fontFamily:"monospace"}}>
                          {def.label}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:T.muted,display:"flex",gap:16,flexWrap:"wrap"}}>
                        <span>💰 {fmtAmount(p.token_amount)} burned</span>
                        <span>🕐 {fmtDate(p.created_at)}</span>
                        {p.tx_signature && <span style={{fontFamily:"monospace",fontSize:10,color:T.dim}}>tx: {p.tx_signature.slice(0,16)}…</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,flexShrink:0}}>
                      <button onClick={()=>approve(p)} disabled={processingId===p.id}
                        style={{background:T.olive,color:T.bg,border:"none",borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer",opacity:processingId===p.id?0.6:1}}>
                        ✓ Approve
                      </button>
                      <button onClick={()=>reject(p)} disabled={processingId===p.id}
                        style={{background:"transparent",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:600,cursor:"pointer",opacity:processingId===p.id?0.6:1}}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={loadPending} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.dim,borderRadius:8,padding:"9px 18px",fontSize:11,cursor:"pointer",marginTop:8}}>
              ↻ Refresh
            </button>
          </div>
        )}

        {/* ── Manual Grant tab ────────────────────────────── */}
        {tab === "manual" && (
          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"24px 20px",maxWidth:480}}>
            <div style={{fontSize:11,color:T.dim,marginBottom:16,fontFamily:"monospace",letterSpacing:"0.1em"}}>MANUAL GRANT</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Username</div>
                <input value={manualUsername} onChange={e=>setManualUsername(e.target.value)} placeholder="grassxtouch"
                  style={{width:"100%",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",color:T.white,fontSize:13,outline:"none",boxSizing:"border-box"}} />
              </div>
              <div>
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Consumable Type</div>
                <select value={manualType} onChange={e=>setManualType(e.target.value)}
                  style={{width:"100%",background:T.bg3,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",color:T.white,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  {CONSUMABLES.map(c=><option key={c.type} value={c.type}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Quantity</div>
                <input type="number" min={1} value={manualQty} onChange={e=>setManualQty(e.target.value)}
                  style={{width:"100%",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",color:T.white,fontSize:13,outline:"none",boxSizing:"border-box"}} />
              </div>
              <div>
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>TX Signature (optional)</div>
                <input value={manualTx} onChange={e=>setManualTx(e.target.value)} placeholder="Solana tx hash"
                  style={{width:"100%",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",color:T.white,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}} />
              </div>
              <div>
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Amount Burned (optional)</div>
                <input value={manualAmount} onChange={e=>setManualAmount(e.target.value)} placeholder="50000"
                  style={{width:"100%",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",color:T.white,fontSize:13,outline:"none",boxSizing:"border-box"}} />
              </div>
              <button onClick={manualGrant} disabled={loading}
                style={{background:T.olive,color:T.bg,border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:4,opacity:loading?0.6:1}}>
                {loading?"Granting…":"✓ Grant Consumable"}
              </button>
            </div>
          </div>
        )}

        {/* ── History tab ──────────────────────────────────── */}
        {tab === "history" && (
          <div>
            <div style={{fontSize:11,color:T.dim,marginBottom:14,fontFamily:"monospace",letterSpacing:"0.1em"}}>
              CONSUMABLE EVENT HISTORY — last 100
            </div>
            {history.length === 0 && (
              <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"40px 24px",textAlign:"center",color:T.dim,fontSize:13}}>No events yet.</div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {history.map(ev => {
                const def = CONSUMABLES.find(c=>c.type===ev.consumable_type);
                const evColors = {
                  purchase_approved: T.olive, purchase_rejected:"#ef4444",
                  consumed:"#f97316", activated:"#f59e0b", admin_adjusted:"#a78bfa", expired:T.dim
                };
                return (
                  <div key={ev.id} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{def?.icon || "📦"}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:600,color:T.white,fontSize:13}}>@{ev.username}</span>
                        <span style={{fontSize:10,fontFamily:"monospace",color:evColors[ev.event_type]||T.muted,background:`${evColors[ev.event_type]||T.muted}18`,padding:"1px 7px",borderRadius:20}}>
                          {ev.event_type.replace(/_/g," ")}
                        </span>
                        <span style={{fontSize:11,color:T.dim}}>{def?.label || ev.consumable_type}</span>
                        {ev.quantity > 0 && <span style={{fontSize:11,color:T.muted}}>×{ev.quantity}</span>}
                      </div>
                      <div style={{fontSize:10,color:T.dim,marginTop:2}}>{fmtDate(ev.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={loadHistory} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.dim,borderRadius:8,padding:"9px 18px",fontSize:11,cursor:"pointer",marginTop:12}}>
              ↻ Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}