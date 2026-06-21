import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b", red:"#f87171",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";

const EMPTY_FORM = {
  username:"", burn_type:"shield_burn", amount_burned:"50000",
  treasury_match_amount:"50000", shield_count:"1", tx_signature:"",
};

export default function AdminBurns() {
  const [authed,    setAuthed]    = useState(false);
  const [pw,        setPw]        = useState("");
  const [pwError,   setPwError]   = useState("");
  const [burns,     setBurns]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  // ── Pending Shield Purchases (the missing approval step) ────────────────────
  const [pendingShields, setPendingShields] = useState([]);
  const [shieldsLoading, setShieldsLoading]  = useState(false);
  const [processingId,   setProcessingId]    = useState(null);

  const checkPw = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(""); }
    else setPwError("Incorrect password.");
  };

  const loadBurns = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("BurnEvents").select("*")
      .order("created_at", { ascending:false }).limit(60);
    setBurns(data ?? []);
    setLoading(false);
  }, []);

  const loadPendingShields = useCallback(async () => {
    setShieldsLoading(true);
    const { data } = await supabase.from("ShieldPurchases").select("*")
      .eq("status", "pending").order("created_at", { ascending:false });
    setPendingShields(data ?? []);
    setShieldsLoading(false);
  }, []);

  useEffect(() => { if (authed) { loadBurns(); loadPendingShields(); } }, [authed, loadBurns, loadPendingShields]);

  const EVENT_START = new Date("2026-06-21T00:00:00Z");
  const EVENT_END   = new Date("2026-07-02T00:00:00Z");

  // Approve a shield purchase: mark approved, credit the shield, AND record
  // it in BurnEvents so it shows up on /burns immediately. This is the link
  // that was previously missing — ShieldPurchases and BurnEvents were two
  // disconnected tables.
  const approveShield = async (purchase) => {
    setProcessingId(purchase.id);
    try {
      // 1. Mark the purchase approved
      const { error: updateErr } = await supabase
        .from("ShieldPurchases")
        .update({ status: "approved" })
        .eq("id", purchase.id);
      if (updateErr) throw updateErr;

      // 2. Credit the shield to the user's Streaks row
      const { data: streakRow } = await supabase
        .from("Streaks").select("shield_count").eq("username", purchase.username).maybeSingle();
      await supabase.from("Streaks")
        .update({ shield_count: (streakRow?.shield_count ?? 0) + 1 })
        .eq("username", purchase.username);

      // 3. Record in BurnEvents — apply Double Burn Event match if the
      //    purchase falls within the event window
      const purchaseDate = new Date(purchase.created_at);
      const inEventWindow = purchaseDate >= EVENT_START && purchaseDate < EVENT_END;
      const amount = Number(purchase.token_amount || 50000);

      await supabase.from("BurnEvents").insert({
        username: purchase.username,
        burn_type: "shield_burn",
        amount_burned: amount,
        treasury_match_amount: inEventWindow ? amount : 0,
        shield_count: 1,
        tx_signature: purchase.tx_signature || null,
        metadata: { source: "ShieldPurchases", shield_purchase_id: purchase.id },
      });

      setSuccess(`Approved @${purchase.username}'s shield and recorded the burn.`);
      loadPendingShields();
      loadBurns();
    } catch(e) {
      setError(`Failed to approve: ${e.message}`);
    }
    setProcessingId(null);
  };

  const rejectShield = async (purchase) => {
    setProcessingId(purchase.id);
    await supabase.from("ShieldPurchases").update({ status:"rejected" }).eq("id", purchase.id);
    loadPendingShields();
    setProcessingId(null);
  };

  // Auto-fill treasury match = amount burned for shield_burn type
  const handleAmountChange = (val) => {
    setForm(f => ({ ...f, amount_burned: val,
      treasury_match_amount: f.burn_type === "shield_burn" ? val : f.treasury_match_amount }));
  };

  const save = async () => {
    setError(""); setSuccess("");
    if (!form.amount_burned || isNaN(Number(form.amount_burned))) {
      setError("Amount burned is required and must be a number."); return;
    }
    setSaving(true);
    const payload = {
      username: form.username.trim().replace(/@/g,"").toLowerCase() || null,
      burn_type: form.burn_type,
      amount_burned: Number(form.amount_burned),
      treasury_match_amount: Number(form.treasury_match_amount || 0),
      shield_count: Number(form.shield_count || 0),
      tx_signature: form.tx_signature.trim() || null,
    };
    const { error: err } = await supabase.from("BurnEvents").insert(payload);
    if (err) {
      setError(err.message);
    } else {
      setSuccess("Burn recorded.");
      setForm(EMPTY_FORM);
      loadBurns();
    }
    setSaving(false);
  };

  const deleteBurn = async (id) => {
    await supabase.from("BurnEvents").delete().eq("id", id);
    loadBurns();
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    input,select{font-family:'DM Sans',sans-serif;}
    .field{display:flex;flex-direction:column;gap:5px;}
    .label{font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${T.dim};}
    .inp{background:${T.bg3};border:1px solid ${T.border};color:${T.white};
      padding:10px 12px;border-radius:8px;font-size:13px;outline:none;width:100%;}
    .inp:focus{border-color:${T.olive};}
    .btn{border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;
      font-size:12px;letter-spacing:0.06em;border-radius:7px;padding:10px 20px;}
    table{border-collapse:collapse;width:100%;}
    th{text-align:left;font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;
      color:${T.dim};padding:10px 14px;border-bottom:1px solid ${T.border};}
    td{padding:11px 14px;border-bottom:1px solid ${T.border};font-size:12px;}
    tr:last-child td{border-bottom:none;}
  `;

  if (!authed) return (
    <>
      <style dangerouslySetInnerHTML={{ __html:css }} />
      <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
        alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ background:T.bg2, border:`1px solid ${T.borderG}`, borderRadius:16,
          padding:"40px 36px", width:"100%", maxWidth:360, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🔥</div>
          <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:22,
            fontWeight:700, color:T.white, marginBottom:4 }}>Admin Access</div>
          <div style={{ fontSize:12, color:T.dim, marginBottom:28 }}>Burn Event Entry</div>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key==="Enter" && checkPw()} placeholder="Admin password" className="inp"
            style={{ marginBottom:12 }} />
          {pwError && <div style={{ fontSize:11, color:T.red, marginBottom:10 }}>{pwError}</div>}
          <button onClick={checkPw} className="btn"
            style={{ width:"100%", background:T.olive, color:"#0e1108", fontSize:13 }}>Enter</button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html:css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>
        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>🌿</span>
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, fontWeight:700, color:T.white }}>Proof of Grass</span>
            <span style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em", textTransform:"uppercase", marginLeft:4 }}>/ Admin</span>
          </div>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <a href="/admin/stats" style={{ fontSize:12, color:T.dim, textDecoration:"none" }}>Stats</a>
            <a href="/admin/milestones" style={{ fontSize:12, color:T.dim, textDecoration:"none" }}>Milestones</a>
            <a href="/admin/spotlight" style={{ fontSize:12, color:T.dim, textDecoration:"none" }}>Spotlight</a>
            <span style={{ fontSize:12, color:T.gold, fontWeight:600 }}>Burns</span>
          </div>
        </nav>

        <div style={{ padding:"32px clamp(14px,5vw,64px)", maxWidth:960, margin:"0 auto" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.gold, textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>Admin</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(28px,4vw,44px)",
              fontWeight:700, color:T.white, lineHeight:1 }}>Burn Event Entry</h1>
          </div>

          {/* Pending Shield Purchases — approve credits shield + records BurnEvent */}
          <div style={{ background:T.bg2, border:`1px solid ${pendingShields.length ? T.borderGold : T.border}`,
            borderRadius:14, padding:"24px 22px", marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.gold, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                🛡 Pending Shield Purchases {pendingShields.length > 0 && `(${pendingShields.length})`}
              </div>
              <button className="btn" onClick={loadPendingShields}
                style={{ padding:"6px 14px", background:T.bg3, color:T.olive, border:`1px solid ${T.borderG}` }}>
                ↻ Refresh
              </button>
            </div>

            {shieldsLoading ? (
              <div style={{ color:T.dim, fontSize:12, padding:16 }}>Loading…</div>
            ) : pendingShields.length === 0 ? (
              <div style={{ color:T.dim, fontSize:12.5, padding:"12px 0" }}>No pending shield purchases.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {pendingShields.map(p => (
                  <div key={p.id} style={{ background:T.bg3, border:`1px solid ${T.border}`, borderRadius:10,
                    padding:"14px 16px", display:"flex", flexWrap:"wrap", alignItems:"center", gap:12 }}>
                    <div style={{ flex:"1 1 200px" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:T.white, marginBottom:4 }}>
                        @{p.username}
                      </div>
                      <div style={{ fontSize:10.5, color:T.dim, wordBreak:"break-all" }}>
                        Wallet: {p.wallet_address}
                      </div>
                      <div style={{ fontSize:10.5, color:T.dim, wordBreak:"break-all" }}>
                        Tx: {p.tx_signature}
                      </div>
                      <a href={`https://solscan.io/tx/${p.tx_signature}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:10.5, color:T.olive }}>
                        View on Solscan →
                      </a>
                    </div>
                    <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                      <button className="btn" onClick={() => approveShield(p)}
                        disabled={processingId === p.id}
                        style={{ background:T.olive, color:"#0e1108", padding:"8px 16px" }}>
                        {processingId === p.id ? "…" : "✓ Approve"}
                      </button>
                      <button className="btn" onClick={() => rejectShield(p)}
                        disabled={processingId === p.id}
                        style={{ background:"transparent", color:T.red, border:`1px solid ${T.red}`, padding:"8px 16px" }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error   && <div style={{ fontSize:12, color:T.red,   marginTop:14 }}>{error}</div>}
            {success && <div style={{ fontSize:12, color:T.olive, marginTop:14 }}>{success}</div>}
          </div>

          {/* Entry form */}
          <div style={{ background:T.bg2, border:`1px solid ${T.borderG}`, borderRadius:14,
            padding:"28px 24px", marginBottom:28 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.olive, letterSpacing:"0.1em",
              textTransform:"uppercase", marginBottom:20 }}>➕ Record Burn</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div className="field">
                <label className="label">Username (optional)</label>
                <input className="inp" placeholder="@username" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username:e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Burn Type</label>
                <select className="inp" value={form.burn_type}
                  onChange={e => setForm(f => ({ ...f, burn_type:e.target.value }))}>
                  <option value="shield_burn">Shield Burn</option>
                  <option value="treasury_match">Treasury Match</option>
                  <option value="manual_event_burn">Manual Event Burn</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Amount Burned</label>
                <input className="inp" type="number" value={form.amount_burned}
                  onChange={e => handleAmountChange(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Treasury Match Amount</label>
                <input className="inp" type="number" value={form.treasury_match_amount}
                  onChange={e => setForm(f => ({ ...f, treasury_match_amount:e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Shield Count</label>
                <input className="inp" type="number" value={form.shield_count}
                  onChange={e => setForm(f => ({ ...f, shield_count:e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Tx Signature (optional)</label>
                <input className="inp" placeholder="Solana tx hash" value={form.tx_signature}
                  onChange={e => setForm(f => ({ ...f, tx_signature:e.target.value }))} />
              </div>
            </div>

            {error   && <div style={{ fontSize:12, color:T.red,  marginTop:14 }}>{error}</div>}
            {success && <div style={{ fontSize:12, color:T.olive, marginTop:14 }}>{success}</div>}

            <button className="btn" onClick={save} disabled={saving}
              style={{ background:T.gold, color:"#0e1108", marginTop:18 }}>
              {saving ? "Saving…" : "Record Burn"}
            </button>
          </div>

          {/* Recent burns */}
          <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, overflow:"auto" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted }}>Recent Burns</span>
              <button className="btn" onClick={loadBurns}
                style={{ padding:"6px 14px", background:T.bg3, color:T.olive, border:`1px solid ${T.borderG}` }}>↻ Refresh</button>
            </div>
            {loading ? (
              <div style={{ padding:32, textAlign:"center", color:T.dim, fontSize:12 }}>Loading…</div>
            ) : burns.length === 0 ? (
              <div style={{ padding:"40px 20px", textAlign:"center", color:T.dim, fontSize:13 }}>No burns recorded yet.</div>
            ) : (
              <table>
                <thead>
                  <tr><th>Date</th><th>Username</th><th>Type</th><th>Burned</th><th>Match</th><th>Shields</th><th></th></tr>
                </thead>
                <tbody>
                  {burns.map(b => (
                    <tr key={b.id}>
                      <td style={{ color:T.dim, whiteSpace:"nowrap" }}>{new Date(b.created_at).toLocaleDateString()}</td>
                      <td>{b.username ? `@${b.username}` : "—"}</td>
                      <td style={{ textTransform:"capitalize" }}>{b.burn_type.replace(/_/g," ")}</td>
                      <td>{Number(b.amount_burned).toLocaleString()}</td>
                      <td>{Number(b.treasury_match_amount).toLocaleString()}</td>
                      <td>{b.shield_count}</td>
                      <td>
                        <button onClick={() => deleteBurn(b.id)}
                          style={{ background:"none", border:"none", color:T.red, fontSize:11, cursor:"pointer" }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}