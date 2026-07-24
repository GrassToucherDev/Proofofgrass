// pages/admin/marketplace.js
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "touchgrass_admin";
const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  olive:"#93a85a", gold:"#c8a84b", red:"#ef4444",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

export default function AdminMarketplace() {
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState("");
  const [pending,  setPending]  = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState("");

  const loadData = async () => {
    setLoading(true);
    const [{ data: pend }, { data: appr }] = await Promise.all([
      supabase.from("MarketplacePurchases").select("*").eq("status","pending").order("created_at",{ascending:false}),
      supabase.from("MarketplacePurchases").select("*").in("status",["approved","rejected"]).order("created_at",{ascending:false}).limit(20),
    ]);
    setPending(pend ?? []);
    setApproved(appr ?? []);
    setLoading(false);
  };

  useEffect(() => { if (authed) loadData(); }, [authed]);

  const approve = async (row) => {
    // 1. Update purchase status
    await supabase.from("MarketplacePurchases").update({ status:"approved" }).eq("id",row.id);
    // 2. Add to UserInventory
    await supabase.from("UserInventory").upsert([{
      username: row.username,
      item_id:  row.item_id,
      owned:    true,
      equipped: false,
      purchased_at: new Date().toISOString(),
    }], { onConflict:"username,item_id" });
    setMsg(`✓ Approved ${row.username} — ${row.item_name}`);
    setTimeout(() => setMsg(""), 3000);
    loadData();
  };

  const reject = async (row) => {
    await supabase.from("MarketplacePurchases").update({ status:"rejected" }).eq("id",row.id);
    setMsg(`Rejected ${row.username} — ${row.item_name}`);
    setTimeout(() => setMsg(""), 3000);
    loadData();
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  const css = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}`;

  if (!authed) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style dangerouslySetInnerHTML={{__html:css}}/>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"32px 28px",width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>🏪</div>
        <div style={{fontFamily:"monospace",fontSize:14,color:T.muted,marginBottom:20}}>Marketplace Admin</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&pw===ADMIN_PASSWORD)setAuthed(true);}}
          placeholder="Password"
          style={{width:"100%",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",color:T.white,fontSize:13,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
        <button onClick={()=>{if(pw===ADMIN_PASSWORD)setAuthed(true);}}
          style={{width:"100%",background:T.olive,color:"#0a0c08",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Enter
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}}/>
      <div style={{minHeight:"100vh",background:T.bg}}>
        <div style={{maxWidth:860,margin:"0 auto",padding:"32px 16px 80px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:T.gold,marginBottom:8}}>Admin</div>
              <h1 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:32,fontWeight:700,color:T.white}}>Marketplace Purchases</h1>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={loadData} style={{background:"transparent",border:`1px solid ${T.borderG}`,color:T.olive,borderRadius:8,padding:"9px 18px",fontSize:12,cursor:"pointer"}}>
                {loading ? "⟳ Loading…" : "↻ Refresh"}
              </button>
              <Link href="/admin/burns" style={{fontSize:11,color:T.dim,textDecoration:"none",alignSelf:"center"}}>← Burns Admin</Link>
            </div>
          </div>

          {msg && (
            <div style={{background:"rgba(147,168,90,0.1)",border:`1px solid rgba(147,168,90,0.3)`,borderRadius:10,padding:"12px 16px",fontSize:13,color:T.olive,marginBottom:20}}>
              {msg}
            </div>
          )}

          {/* Pending */}
          <div style={{marginBottom:32}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <h2 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:700,color:T.white}}>Pending</h2>
              <div style={{fontSize:11,fontWeight:700,color:T.gold,background:"rgba(200,168,75,0.1)",border:`1px solid rgba(200,168,75,0.3)`,borderRadius:20,padding:"2px 10px"}}>
                {pending.length}
              </div>
            </div>
            {pending.length === 0 ? (
              <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"24px",textAlign:"center",fontSize:12,color:T.dim}}>
                No pending purchases.
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {pending.map(row => (
                  <div key={row.id} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:13,fontWeight:700,color:T.white}}>@{row.username}</span>
                          <span style={{fontSize:10,color:T.gold,background:"rgba(200,168,75,0.1)",border:`1px solid rgba(200,168,75,0.2)`,borderRadius:20,padding:"1px 8px"}}>{row.item_name}</span>
                        </div>
                        <div style={{fontSize:11,color:T.dim,marginBottom:4}}>
                          ${row.usd_price} USD · {row.touchgrass_paid?.toLocaleString()} $TOUCHGRASS
                        </div>
                        <div style={{fontFamily:"monospace",fontSize:10,color:T.muted,wordBreak:"break-all",marginBottom:4}}>
                          Wallet: {row.wallet}
                        </div>
                        <div style={{fontSize:9,color:T.dim}}>{fmtDate(row.created_at)}</div>
                      </div>
                      <div style={{display:"flex",gap:8,flexShrink:0}}>
                        <button onClick={() => approve(row)}
                          style={{background:T.olive,color:"#0a0c08",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                          Approve ✓
                        </button>
                        <button onClick={() => reject(row)}
                          style={{background:"transparent",border:`1px solid ${T.red}`,color:T.red,borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer"}}>
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent approved/rejected */}
          <div>
            <h2 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:700,color:T.white,marginBottom:14}}>Recent</h2>
            {approved.length === 0 ? (
              <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"24px",textAlign:"center",fontSize:12,color:T.dim}}>
                No completed purchases yet.
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {approved.map(row => (
                  <div key={row.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:12,fontWeight:600,color:T.white}}>@{row.username}</span>
                      <span style={{fontSize:11,color:T.dim}}> · {row.item_name}</span>
                    </div>
                    <div style={{fontSize:9,fontWeight:700,
                      color:row.status==="approved"?T.olive:T.red,
                      background:row.status==="approved"?"rgba(147,168,90,0.1)":"rgba(239,68,68,0.08)",
                      border:`1px solid ${row.status==="approved"?"rgba(147,168,90,0.3)":"rgba(239,68,68,0.2)"}`,
                      borderRadius:20,padding:"2px 9px",flexShrink:0}}>
                      {row.status}
                    </div>
                    <div style={{fontSize:9,color:T.dim,flexShrink:0}}>{fmtDate(row.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}