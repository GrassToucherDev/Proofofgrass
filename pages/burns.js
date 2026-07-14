import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.4)", borderFire:"rgba(249,115,22,0.4)",
  olive:"#93a85a", gold:"#c8a84b", fire:"#f97316", amber:"#f59e0b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

const BURN_ADDR       = process.env.NEXT_PUBLIC_BURN_ADDRESS || "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";
const SOL_DOMAIN      = "touchgrassburn.sol";
const TOUCHGRASS_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";

function buildSolanaPayUrl(amount) {
  const params = new URLSearchParams({
    amount: String(amount), "spl-token": TOUCHGRASS_MINT,
    label: "Touch Grass", message: `${amount.toLocaleString()} $TOUCHGRASS`,
  });
  return `solana:${BURN_ADDR}?${params.toString()}`;
}
function buildQrUrl(data, size = 180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&color=240-239-234&bgcolor=10-12-8&data=${encodeURIComponent(data)}`;
}

// ── Consumables catalog ───────────────────────────────────────────────────────
const CONSUMABLES = [
  {
    type:"shield", label:"Streak Shield", icon:"🛡",
    cost:50000, costLabel:"50,000 $TOUCHGRASS",
    color:T.gold, borderColor:T.borderGold, glow:"rgba(200,168,75,0.12)",
    description:"Protects your streak if you miss a day. Automatically consumed when needed.",
    details:["Consumed automatically when a day is missed","Stacks — hold multiple for longer protection","Does not expire"],
  },
  {
    type:"sunset_pass", label:"Sunset Pass", icon:"🌅",
    cost:25000, costLabel:"25,000 $TOUCHGRASS",
    color:T.fire, borderColor:T.borderFire, glow:"rgba(249,115,22,0.1)",
    description:"Extends today's proof submission window by 2 hours.",
    details:["Must be activated before the deadline","Extends window by exactly 2 hours","Consumed on activation","Cannot stack"],
  },
];

// ── Premium+ catalog ──────────────────────────────────────────────────────────
const PREMIUM_ITEMS = [
  {
    type:"premium_proofs",
    label:"Premium Proofs",
    icon:"✨",
    cost:100000, costLabel:"100,000 $TOUCHGRASS",
    color:"#a78bfa", borderColor:"rgba(167,139,250,0.4)", glow:"rgba(167,139,250,0.1)",
    description:"Unlock six exclusive result card themes forever. Future premium themes automatically become available to owners.",
    themes:[
      { name:"Golden Hour",     palette:"Warm amber & gold"     },
      { name:"Emerald Forest",  palette:"Deep green & emerald"  },
      { name:"Midnight Meadow", palette:"Near-black & cool teal"},
      { name:"Summit",          palette:"Slate & alpine white"  },
      { name:"Aurora",          palette:"Deep teal & violet"    },
      { name:"Sunset Glow",     palette:"Coral & burnt orange"  },
    ],
    permanent:true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getUsername() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim() || null; }
  catch { return null; }
}
function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US",{ month:"short", day:"numeric", year:"numeric" });
}
function fmtNum(n) {
  if (n==null) return "0";
  if (n>=1_000_000) return `${(n/1_000_000).toFixed(2)}M`;
  if (n>=1_000) return `${(n/1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

// ── Purchase Modal ────────────────────────────────────────────────────────────
function PurchaseModal({ item, username, isPremium, onClose }) {
  const [txInput,      setTxInput]      = useState("");
  const [status,       setStatus]       = useState(null);
  const [errMsg,       setErrMsg]       = useState("");
  const [copiedAddr,   setCopiedAddr]   = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const payUrl = buildSolanaPayUrl(item.cost);

  const submit = async () => {
    if (!txInput.trim()) { setErrMsg("Paste your transaction signature."); return; }
    setStatus("loading"); setErrMsg("");
    try {
      let err;
      if (isPremium) {
        // Check not already pending/approved
        const { data: existing } = await supabase
          .from("PremiumPurchaseRequests")
          .select("id,status").eq("username", username)
          .eq("premium_type", item.type).maybeSingle();
        if (existing?.status === "approved") {
          setErrMsg("You already own this upgrade."); setStatus(null); return;
        }
        if (existing?.status === "pending") {
          setErrMsg("You already have a pending request for this upgrade."); setStatus(null); return;
        }
        ({ error: err } = await supabase.from("PremiumPurchaseRequests").insert({
          username, premium_type: item.type,
          tx_signature: txInput.trim(), token_amount: item.cost, status: "pending",
        }));
      } else {
        ({ error: err } = await supabase.from("ShieldPurchases").insert({
          username, consumable_type: item.type,
          tx_signature: txInput.trim(), token_amount: item.cost, status: "pending",
        }));
      }
      if (err) throw err;
      setStatus("success");
    } catch(e) {
      setErrMsg(e.message || "Submission failed."); setStatus(null);
    }
  };

  return (
    <>
      <div onClick={status !== "loading" ? onClose : undefined}
        style={{ position:"fixed", inset:0, zIndex:998,
          background:"rgba(0,0,0,0.78)", backdropFilter:"blur(5px)" }} />
      <div style={{ position:"fixed", left:"50%", top:"50%",
        transform:"translate(-50%,-50%)", zIndex:999,
        width:"min(520px,95vw)", maxHeight:"90vh", overflowY:"auto",
        background:T.bg2, border:`1px solid ${item.borderColor}`,
        borderRadius:20, padding:"26px 22px",
        boxShadow:`0 0 60px ${item.glow}, 0 20px 60px rgba(0,0,0,0.7)` }}>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <span style={{ fontSize:32 }}>{item.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:20, fontWeight:700, color:T.white }}>{item.label}</div>
            <div style={{ fontSize:12, fontWeight:700, color:item.color }}>{item.costLabel}</div>
          </div>
          {status !== "loading" && (
            <button onClick={onClose}
              style={{ background:"none", border:"none", color:T.dim,
                cursor:"pointer", fontSize:22, lineHeight:1 }}>×</button>
          )}
        </div>

        {status === "success" ? (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:700, color:T.olive, marginBottom:8 }}>
              Request submitted!
            </div>
            <div style={{ fontSize:13, color:T.muted, lineHeight:1.6, marginBottom:20 }}>
              An admin will verify your transaction and{" "}
              {isPremium ? "permanently unlock this upgrade" : "credit your inventory"}.
            </div>
            <button onClick={onClose}
              style={{ background:T.bg3, border:`1px solid ${T.border}`,
                color:T.dim, borderRadius:10, padding:"10px 24px",
                fontSize:13, cursor:"pointer" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ background:T.bg3, border:`1px solid ${T.border}`,
              borderRadius:12, padding:"13px 15px", marginBottom:16,
              fontSize:12, color:T.muted, lineHeight:1.75 }}>
              <div style={{ fontWeight:700, color:T.white, marginBottom:5 }}>How to purchase:</div>
              <ol style={{ margin:0, padding:"0 0 0 16px", display:"flex",
                flexDirection:"column", gap:3 }}>
                <li>Send exactly <strong style={{ color:item.color }}>{item.costLabel}</strong> to the burn address below.</li>
                <li>Copy the transaction signature from your wallet.</li>
                <li>Paste it below and submit. Admin will verify and unlock.</li>
              </ol>
            </div>

            {/* Burn address */}
            <div style={{ background:"rgba(0,0,0,0.3)", border:`1px solid ${T.border}`,
              borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
              <div style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase",
                color:T.dim, marginBottom:5 }}>Burn Address</div>
              <div style={{ fontFamily:"monospace", fontSize:11, color:T.olive,
                wordBreak:"break-all", marginBottom:9 }}>{BURN_ADDR}</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { navigator.clipboard.writeText(SOL_DOMAIN).catch(()=>{}); setCopiedDomain(true); setTimeout(()=>setCopiedDomain(false),1500); }}
                  style={{ flex:1, background:"transparent", border:`1px solid ${T.borderG}`,
                    color:copiedDomain?"#4ade80":T.olive, borderRadius:7,
                    padding:"7px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>
                  {copiedDomain ? "✓ Copied" : "Copy Domain"}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(BURN_ADDR).catch(()=>{}); setCopiedAddr(true); setTimeout(()=>setCopiedAddr(false),1500); }}
                  style={{ flex:1, background:"transparent", border:`1px solid ${T.borderG}`,
                    color:copiedAddr?"#4ade80":T.olive, borderRadius:7,
                    padding:"7px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>
                  {copiedAddr ? "✓ Copied" : "Copy Address"}
                </button>
              </div>
            </div>

            {/* Solana Pay + QR */}
            <a href={payUrl}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                background:`linear-gradient(135deg,${item.color}cc,${item.color}88)`,
                color:"#0a0c08", borderRadius:10, padding:"12px 16px",
                fontSize:13, fontWeight:700, textDecoration:"none",
                marginBottom:8 }}>
              ⚡ Open in Wallet — Pay {item.costLabel}
            </a>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5,
              padding:"12px 0", borderTop:`1px solid ${T.border}`,
              borderBottom:`1px solid ${T.border}`, margin:"8px 0 14px" }}>
              <img src={buildQrUrl(payUrl)} alt="Scan to pay"
                style={{ width:130, height:130, borderRadius:7,
                  border:`1px solid ${T.border}` }} />
              <div style={{ fontSize:10, color:T.dim }}>Scan with your Solana wallet</div>
            </div>

            <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>
              Transaction Signature
            </div>
            <input value={txInput} onChange={e => setTxInput(e.target.value)}
              placeholder="Paste Solana tx hash…"
              style={{ width:"100%", background:"rgba(0,0,0,0.3)",
                border:`1px solid ${T.border}`, borderRadius:9,
                padding:"10px 12px", color:T.white, fontSize:12,
                outline:"none", fontFamily:"monospace",
                marginBottom:10, boxSizing:"border-box" }} />
            {errMsg && <div style={{ fontSize:11, color:"#ef4444", marginBottom:10 }}>{errMsg}</div>}
            <button onClick={submit} disabled={status==="loading"}
              style={{ width:"100%", background:item.color, color:"#0a0c08",
                border:"none", borderRadius:10, padding:"13px",
                fontSize:13, fontWeight:700, cursor:"pointer",
                opacity:status==="loading"?0.7:1 }}>
              {status==="loading" ? "Submitting…" : `Submit Purchase Request`}
            </button>
          </>
        )}
      </div>
    </>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:`1px solid ${T.border}` }}>
      <button onClick={() => setOpen(v=>!v)}
        style={{ width:"100%", display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:12,
          padding:"15px 0", background:"none", border:"none",
          cursor:"pointer", textAlign:"left" }}>
        <span style={{ fontSize:13, fontWeight:600, color:T.white }}>{q}</span>
        <span style={{ fontSize:18, color:T.olive, flexShrink:0 }}>{open?"−":"+"}</span>
      </button>
      {open && (
        <div style={{ fontSize:12.5, color:T.muted, lineHeight:1.7, paddingBottom:14 }}>{a}</div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BurnsPage() {
  const [username,      setUsername]      = useState(null);
  const [pageTab,       setPageTab]       = useState("consumables"); // consumables | premium
  const [inventory,     setInventory]     = useState({});
  const [premiumUnlocks,setPremiumUnlocks]= useState(new Set());
  const [history,       setHistory]       = useState([]);
  const [archiveStats,  setArchiveStats]  = useState(null);
  const [burnHistory,   setBurnHistory]   = useState([]);
  const [purchasing,    setPurchasing]    = useState(null); // { item, isPremium }
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    Promise.all([
      u ? loadUserData(u) : Promise.resolve(),
      loadArchive(),
    ]).finally(() => setLoading(false));
  }, []);

  const loadUserData = async (u) => {
    const [{ data: consData }, { data: premData }, { data: histData }] = await Promise.all([
      supabase.from("UserConsumables").select("consumable_type,quantity").eq("username", u),
      supabase.from("UserPremiumUnlocks").select("premium_type").eq("username", u),
      supabase.from("ConsumableEvents")
        .select("consumable_type,event_type,quantity,created_at")
        .eq("username", u).order("created_at",{ ascending:false }).limit(20),
    ]);
    const inv = {};
    (consData||[]).forEach(r => { inv[r.consumable_type] = r.quantity; });
    setInventory(inv);
    setPremiumUnlocks(new Set((premData||[]).map(r => r.premium_type)));
    setHistory(histData||[]);
  };

  const loadArchive = async () => {
    const [{ count: shieldCount }, { data: topBurners }, { data: burnHist }] = await Promise.all([
      supabase.from("BurnEvents").select("id",{count:"exact",head:true}).eq("burn_type","shield_burn"),
      supabase.from("BurnEvents").select("username,amount_burned").eq("burn_type","shield_burn").order("amount_burned",{ascending:false}).limit(10),
      supabase.from("BurnEvents").select("username,amount_burned,created_at").eq("burn_type","shield_burn").order("created_at",{ascending:false}).limit(15),
    ]);
    setArchiveStats({ totalShields:shieldCount||0, totalBurned:(shieldCount||0)*50000, topBurners:topBurners||[] });
    setBurnHistory(burnHist||[]);
  };

  const evLabel = (t) => ({ purchase_approved:"✓ Credited", purchase_rejected:"✕ Rejected",
    consumed:"⚡ Used", activated:"🌅 Activated", admin_adjusted:"⚙ Admin", expired:"⏰ Expired" }[t]||t);
  const evColor = (t) => ({ purchase_approved:T.olive, purchase_rejected:"#ef4444",
    consumed:T.fire, activated:T.amber, admin_adjusted:"#a78bfa" }[t]||T.dim);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
    .fade{animation:fadeUp 0.45s ease both;}
    .item-card{transition:transform 0.18s;}
    .item-card:hover{transform:translateY(-2px);}
    .page-tab{padding:10px 24px;border-radius:10px;border:none;cursor:pointer;
      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
      letter-spacing:0.04em;transition:all 0.2s;}
  `;

  const activeTabStyle = (t) => ({
    background: pageTab===t
      ? t==="premium" ? "linear-gradient(135deg,#a78bfa,#7c3aed)" : T.olive
      : "transparent",
    color: pageTab===t ? (t==="premium" ? "#fff" : T.bg) : T.muted,
    border: pageTab===t ? "none" : `1px solid ${T.border}`,
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html:css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:100,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center",
            gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt=""
              style={{ width:24, height:24, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:16, fontWeight:700, color:T.white }}>Touch Grass</span>
          </Link>
          <Link href="/" style={{ fontSize:12, color:T.dim, textDecoration:"none" }}>
            ← Dashboard
          </Link>
        </nav>

        {/* HERO */}
        <section style={{ padding:"56px clamp(14px,5vw,64px) 40px",
          background:"linear-gradient(160deg,#0a0c06,#0e1a0a 45%,#080a06)",
          borderBottom:`1px solid ${T.border}`, overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none",
            backgroundImage:"radial-gradient(ellipse at 60% 50%,rgba(167,139,250,0.07),transparent 60%),radial-gradient(ellipse at 20% 70%,rgba(147,168,90,0.06),transparent 50%)" }} />
          <div style={{ position:"relative", maxWidth:620, margin:"0 auto",
            textAlign:"center" }} className="fade">
            <div style={{ fontSize:10, letterSpacing:"0.22em", textTransform:"uppercase",
              color:T.olive, fontWeight:600, marginBottom:14 }}>Proof of Grass</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:"clamp(36px,6vw,64px)", fontWeight:700, color:T.white,
              lineHeight:1, letterSpacing:"-0.02em", marginBottom:14 }}>
              Shields & Premium+
            </h1>
            <p style={{ fontSize:"clamp(12px,1.8vw,15px)", color:T.muted,
              lineHeight:1.7, maxWidth:480, margin:"0 auto" }}>
              Burn $TOUCHGRASS for consumables that protect your streak,
              or unlock permanent Premium+ upgrades that last forever.
            </p>
          </div>
        </section>

        <div style={{ maxWidth:720, margin:"0 auto",
          padding:"32px clamp(14px,5vw,32px) 80px" }}>

          {/* PAGE TABS */}
          <div style={{ display:"flex", gap:8, marginBottom:32,
            background:T.bg2, borderRadius:12, padding:5,
            border:`1px solid ${T.border}`, width:"fit-content" }}>
            <button className="page-tab" style={activeTabStyle("consumables")}
              onClick={() => setPageTab("consumables")}>
              🎒 Consumables
            </button>
            <button className="page-tab" style={activeTabStyle("premium")}
              onClick={() => setPageTab("premium")}>
              ✨ Premium+
            </button>
          </div>

          {/* ── YOUR ACCOUNT ─────────────────────────────────────────────── */}
          {username && (
            <div style={{ background:`linear-gradient(145deg,${T.bg2},${T.bg3})`,
              border:`1px solid ${T.borderGold}`, borderRadius:16,
              padding:"20px 22px", marginBottom:28 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em",
                textTransform:"uppercase", color:T.gold, marginBottom:16 }}>
                🎒 Your Account — @{username}
              </div>

              {/* Consumable inventory */}
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em",
                textTransform:"uppercase", color:T.dim, marginBottom:10 }}>
                Consumables
              </div>
              <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:20 }}>
                {CONSUMABLES.map(c => (
                  <div key={c.type} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:22 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize:10, color:T.dim }}>{c.label}</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                        fontSize:24, fontWeight:700, color:c.color, lineHeight:1 }}>
                        {loading ? "—" : (inventory[c.type] ?? 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Premium unlocks */}
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em",
                textTransform:"uppercase", color:T.dim, marginBottom:10 }}>
                Premium+
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {PREMIUM_ITEMS.map(p => {
                  const owned = premiumUnlocks.has(p.type);
                  return (
                    <div key={p.type} style={{ display:"flex", alignItems:"center",
                      gap:8, padding:"8px 14px",
                      background: owned ? "rgba(167,139,250,0.1)" : T.bg3,
                      border:`1px solid ${owned ? "rgba(167,139,250,0.4)" : T.border}`,
                      borderRadius:10 }}>
                      <span style={{ fontSize:16 }}>{p.icon}</span>
                      <div>
                        <div style={{ fontSize:11, fontWeight:600,
                          color: owned ? "#a78bfa" : T.dim }}>{p.label}</div>
                        <div style={{ fontSize:9, color: owned ? "rgba(167,139,250,0.6)" : T.dim }}>
                          {owned ? "✓ Unlocked forever" : "Not unlocked"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CONSUMABLES TAB ──────────────────────────────────────────── */}
          {pageTab === "consumables" && (
            <div className="fade">
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
                Available Consumables
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:36 }}>
                {CONSUMABLES.map(c => (
                  <div key={c.type} className="item-card"
                    style={{ background:`rgba(0,0,0,0.2)`,
                      border:`1px solid ${c.borderColor}`,
                      borderRadius:16, padding:"22px 22px",
                      boxShadow:`0 0 28px ${c.glow}` }}>
                    <div style={{ display:"flex", alignItems:"flex-start",
                      gap:16, flexWrap:"wrap" }}>
                      <div style={{ fontSize:44, lineHeight:1, flexShrink:0 }}>{c.icon}</div>
                      <div style={{ flex:1, minWidth:180 }}>
                        <div style={{ display:"flex", alignItems:"center",
                          gap:10, flexWrap:"wrap", marginBottom:6 }}>
                          <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                            fontSize:22, fontWeight:700, color:T.white }}>{c.label}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:c.color,
                            fontFamily:"monospace" }}>{c.costLabel}</span>
                          <span style={{ fontSize:9, color:T.dim,
                            border:`1px solid ${T.border}`, borderRadius:20,
                            padding:"1px 8px", letterSpacing:"0.08em" }}>
                            SINGLE USE
                          </span>
                        </div>
                        <p style={{ fontSize:13, color:T.muted, marginBottom:10,
                          lineHeight:1.6 }}>{c.description}</p>
                        <ul style={{ margin:0, padding:"0 0 0 16px",
                          display:"flex", flexDirection:"column", gap:3 }}>
                          {c.details.map((d,i) => (
                            <li key={i} style={{ fontSize:11, color:T.dim, lineHeight:1.5 }}>{d}</li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ flexShrink:0 }}>
                        {username ? (
                          <button onClick={() => setPurchasing({ item:c, isPremium:false })}
                            style={{ background:c.color, color:"#0a0c08",
                              border:"none", borderRadius:10, padding:"11px 22px",
                              fontSize:13, fontWeight:700, cursor:"pointer",
                              whiteSpace:"nowrap" }}>
                            Get {c.label.split(" ")[1] || c.label}
                          </button>
                        ) : (
                          <Link href="/" style={{ background:T.bg3, color:T.dim,
                            border:`1px solid ${T.border}`, borderRadius:10,
                            padding:"11px 22px", fontSize:13, fontWeight:600,
                            textDecoration:"none", display:"inline-block" }}>
                            Sign in first
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Consumable history */}
              {username && (
                <div style={{ marginBottom:36 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                    textTransform:"uppercase", color:T.dim, marginBottom:14 }}>
                    Consumable History
                  </div>
                  {history.length === 0 ? (
                    <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
                      borderRadius:12, padding:"28px 20px",
                      textAlign:"center", fontSize:12, color:T.dim }}>
                      No consumable activity yet.
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                      {history.map((ev,i) => {
                        const def = CONSUMABLES.find(c=>c.type===ev.consumable_type);
                        return (
                          <div key={i} style={{ background:T.bg2,
                            border:`1px solid ${T.border}`, borderRadius:10,
                            padding:"11px 16px", display:"flex",
                            alignItems:"center", gap:12 }}>
                            <span style={{ fontSize:16, flexShrink:0 }}>
                              {def?.icon||"📦"}
                            </span>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", alignItems:"center",
                                gap:7, flexWrap:"wrap" }}>
                                <span style={{ fontSize:13, color:T.white,
                                  fontWeight:600 }}>{def?.label||ev.consumable_type}</span>
                                <span style={{ fontSize:10, fontFamily:"monospace",
                                  color:evColor(ev.event_type),
                                  background:`${evColor(ev.event_type)}18`,
                                  padding:"1px 7px", borderRadius:20 }}>
                                  {evLabel(ev.event_type)}
                                </span>
                              </div>
                              <div style={{ fontSize:10, color:T.dim, marginTop:2 }}>
                                {fmtDate(ev.created_at)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* FAQ */}
              <div style={{ marginBottom:36 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                  textTransform:"uppercase", color:T.dim, marginBottom:14 }}>
                  FAQ
                </div>
                <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
                  borderRadius:14, padding:"0 20px" }}>
                  {[
                    { q:"What is a Streak Shield?", a:"A Shield protects your streak if you miss a day. It is consumed automatically to keep your chain alive." },
                    { q:"How much does a Shield cost?", a:"50,000 $TOUCHGRASS burned to the official burn address." },
                    { q:"What is a Sunset Pass?", a:"A Sunset Pass extends today's submission window by 2 hours, giving you extra time to lock in your proof." },
                    { q:"How much does a Sunset Pass cost?", a:"25,000 $TOUCHGRASS burned to the official burn address." },
                    { q:"Can I use a Sunset Pass after missing the deadline?", a:"No. It must be activated before the deadline expires. If you've already missed the window, use a Streak Shield instead." },
                    { q:"Is the Double Burn Event still active?", a:"No. The Double Burn Event has ended and is archived below for historical reference." },
                  ].map((item,i) => <FaqItem key={i} {...item} />)}
                </div>
              </div>

              {/* Archived Double Burn */}
              <details style={{ background:T.bg2, border:`1px solid ${T.border}`,
                borderRadius:14, padding:"16px 20px" }}>
                <summary style={{ cursor:"pointer", display:"flex",
                  alignItems:"center", gap:10, listStyle:"none" }}>
                  <span style={{ fontSize:16, opacity:0.4 }}>📁</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700,
                      color:"rgba(240,239,234,0.4)" }}>
                      Archived — Double Burn Event
                    </div>
                    <div style={{ fontSize:11, color:T.dim }}>
                      June 21 – July 1, 2026 · Event Ended
                    </div>
                  </div>
                  <span style={{ marginLeft:"auto", fontSize:11, color:T.dim }}>View →</span>
                </summary>
                <div style={{ marginTop:18, paddingTop:18, borderTop:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:12, color:T.muted, lineHeight:1.7, marginBottom:18 }}>
                    The Double Burn Event has concluded. During the event the treasury matched every Shield burn 1:1 — burning 50,000 $TOUCHGRASS credited 100,000 total burned.
                  </div>
                  {archiveStats && (
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:18 }}>
                      {[["Shields Burned", archiveStats.totalShields],
                        ["$TOUCHGRASS Burned", fmtNum(archiveStats.totalBurned)],
                        ["Participants", archiveStats.topBurners.length]
                      ].map(([label, val]) => (
                        <div key={label} style={{ background:T.bg3,
                          border:`1px solid ${T.border}`, borderRadius:10,
                          padding:"12px 16px", flex:"1 1 120px" }}>
                          <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                            fontSize:22, fontWeight:700,
                            color:"rgba(200,168,75,0.65)" }}>{val}</div>
                          <div style={{ fontSize:9, color:T.dim,
                            textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {archiveStats?.topBurners?.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {archiveStats.topBurners.map((row,i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center",
                          gap:12, padding:"9px 12px", background:T.bg3,
                          border:`1px solid ${T.border}`, borderRadius:8 }}>
                          <span style={{ fontSize:11, color:i<3?T.gold:T.dim,
                            fontWeight:700, width:20, textAlign:"center" }}>{i+1}</span>
                          <Link href={`/u/${row.username}`}
                            style={{ flex:1, fontSize:13, color:T.white,
                              textDecoration:"none", fontWeight:600 }}>
                            @{row.username}
                          </Link>
                          <span style={{ fontSize:11, color:"rgba(200,168,75,0.65)",
                            fontWeight:700, fontFamily:"monospace" }}>
                            🔥 {fmtNum(row.amount_burned)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop:16 }}>
                    <Link href="/burns/collection"
                      style={{ fontSize:12, fontWeight:600, color:T.gold,
                        textDecoration:"none", padding:"8px 16px",
                        borderRadius:8, border:`1px solid ${T.borderGold}`,
                        display:"inline-block" }}>
                      🔥 View My Double Burner Card
                    </Link>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* ── PREMIUM+ TAB ─────────────────────────────────────────────── */}
          {pageTab === "premium" && (
            <div className="fade">
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
                Premium+ Upgrades
              </div>

              {PREMIUM_ITEMS.map(p => {
                const owned = premiumUnlocks.has(p.type);
                return (
                  <div key={p.type} className="item-card"
                    style={{ background:"linear-gradient(145deg,#0a0c08,#0e100b)",
                      border:`1px solid ${owned ? "rgba(167,139,250,0.5)" : p.borderColor}`,
                      borderRadius:18, padding:"28px 26px", marginBottom:20,
                      boxShadow: owned
                        ? "0 0 40px rgba(167,139,250,0.12)"
                        : `0 0 28px ${p.glow}` }}>

                    {/* Header */}
                    <div style={{ display:"flex", alignItems:"flex-start",
                      justifyContent:"space-between", gap:16,
                      marginBottom:20, flexWrap:"wrap" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ fontSize:40, lineHeight:1 }}>{p.icon}</div>
                        <div>
                          <div style={{ display:"flex", alignItems:"center",
                            gap:10, flexWrap:"wrap", marginBottom:4 }}>
                            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                              fontSize:24, fontWeight:700, color:T.white }}>{p.label}</span>
                            <span style={{ fontSize:9, fontWeight:700,
                              letterSpacing:"0.12em", textTransform:"uppercase",
                              color:"#a78bfa", border:"1px solid rgba(167,139,250,0.4)",
                              borderRadius:20, padding:"2px 9px" }}>
                              PERMANENT
                            </span>
                          </div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#a78bfa" }}>
                            {p.costLabel}
                          </div>
                        </div>
                      </div>
                      {owned ? (
                        <div style={{ display:"flex", alignItems:"center", gap:8,
                          background:"rgba(167,139,250,0.1)",
                          border:"1px solid rgba(167,139,250,0.4)",
                          borderRadius:10, padding:"10px 16px", flexShrink:0 }}>
                          <span style={{ fontSize:16 }}>✓</span>
                          <span style={{ fontSize:12, fontWeight:700,
                            color:"#a78bfa" }}>Unlocked Forever</span>
                        </div>
                      ) : (
                        username ? (
                          <button onClick={() => setPurchasing({ item:p, isPremium:true })}
                            style={{ background:"linear-gradient(135deg,#a78bfa,#7c3aed)",
                              color:"#fff", border:"none", borderRadius:10,
                              padding:"12px 24px", fontSize:13, fontWeight:700,
                              cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                            Unlock {p.label}
                          </button>
                        ) : (
                          <Link href="/" style={{ background:T.bg3, color:T.dim,
                            border:`1px solid ${T.border}`, borderRadius:10,
                            padding:"12px 24px", fontSize:13, fontWeight:600,
                            textDecoration:"none", display:"inline-block" }}>
                            Sign in first
                          </Link>
                        )
                      )}
                    </div>

                    <p style={{ fontSize:13, color:T.muted, lineHeight:1.7, marginBottom:20 }}>
                      {p.description}
                    </p>

                    {/* Theme grid */}
                    {p.themes && (
                      <div>
                        <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em",
                          textTransform:"uppercase", color:T.dim, marginBottom:12 }}>
                          Included Themes
                        </div>
                        <div style={{ display:"grid",
                          gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",
                          gap:8 }}>
                          {p.themes.map(theme => {
                            const themeGradients = {
                              "Golden Hour":     "linear-gradient(135deg,#2a1a00,#4a3000)",
                              "Emerald Forest":  "linear-gradient(135deg,#001a08,#003518)",
                              "Midnight Meadow": "linear-gradient(135deg,#040810,#081420)",
                              "Summit":          "linear-gradient(135deg,#141820,#1e2430)",
                              "Aurora":          "linear-gradient(135deg,#040a1a,#0a1428)",
                              "Sunset Glow":     "linear-gradient(135deg,#1a0800,#2a1000)",
                            };
                            const themeAccents = {
                              "Golden Hour":     "#f59e0b",
                              "Emerald Forest":  "#10b981",
                              "Midnight Meadow": "#67e8f9",
                              "Summit":          "#94a3b8",
                              "Aurora":          "#a78bfa",
                              "Sunset Glow":     "#f97316",
                            };
                            const accent = themeAccents[theme.name] || T.olive;
                            const bg     = themeGradients[theme.name] || T.bg3;
                            return (
                              <div key={theme.name} style={{ background:bg,
                                border:`1px solid ${accent}30`,
                                borderRadius:10, padding:"12px 12px",
                                opacity: owned ? 1 : 0.5 }}>
                                <div style={{ width:20, height:20, borderRadius:"50%",
                                  background:accent, marginBottom:7,
                                  boxShadow:`0 0 8px ${accent}60` }} />
                                <div style={{ fontSize:11, fontWeight:700,
                                  color:owned ? T.white : T.dim,
                                  marginBottom:2 }}>{theme.name}</div>
                                <div style={{ fontSize:9, color:`${accent}80` }}>
                                  {theme.palette}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Premium FAQ */}
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                  textTransform:"uppercase", color:T.dim, marginBottom:14 }}>
                  FAQ
                </div>
                <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
                  borderRadius:14, padding:"0 20px" }}>
                  {[
                    { q:"What is Premium+?", a:"Premium+ is a collection of permanent account upgrades purchased with $TOUCHGRASS. Unlike consumables, Premium+ upgrades are never used up — they unlock features forever." },
                    { q:"What does Premium Proofs unlock?", a:"Six exclusive result card themes: Golden Hour, Emerald Forest, Midnight Meadow, Summit, Aurora, and Sunset Glow. Future themes automatically become available to owners at no extra cost." },
                    { q:"How does the purchase work?", a:"Burn 100,000 $TOUCHGRASS to the official burn address, submit your transaction hash, and an admin will verify and permanently unlock the upgrade on your account." },
                    { q:"Can I buy Premium Proofs more than once?", a:"No. It is a one-time purchase. Once unlocked it is yours permanently." },
                    { q:"Where do I select my theme?", a:"When you generate your daily proof card, a theme selector appears at the bottom if Premium Proofs is unlocked. Classic is always available to everyone." },
                  ].map((item,i) => <FaqItem key={i} {...item} />)}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* PURCHASE MODAL */}
      {purchasing && (
        <PurchaseModal
          item={purchasing.item}
          isPremium={purchasing.isPremium}
          username={username}
          onClose={() => setPurchasing(null)}
        />
      )}
    </>
  );
}