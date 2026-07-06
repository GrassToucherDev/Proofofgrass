import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        "#080a06",
  bg2:       "#0e100b",
  bg3:       "#141710",
  border:    "rgba(255,255,255,0.055)",
  borderG:   "rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.4)",
  olive:     "#93a85a",
  gold:      "#c8a84b",
  fire:      "#f97316",
  amber:     "#f59e0b",
  emerald:   "#1fae6e",
  white:     "#f0efea",
  muted:     "rgba(240,239,234,0.52)",
  dim:       "rgba(240,239,234,0.24)",
};

// ─── Burn wallet ──────────────────────────────────────────────────────────────
const BURN_ADDR       = process.env.NEXT_PUBLIC_BURN_ADDRESS || "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";
const SOL_DOMAIN      = "touchgrassburn.sol";
const TOUCHGRASS_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";

function buildSolanaPayUrl(amount) {
  const params = new URLSearchParams({
    amount:       String(amount),
    "spl-token":  TOUCHGRASS_MINT,
    label:        "Touch Grass Consumable",
    message:      `${amount.toLocaleString()} $TOUCHGRASS burn`,
  });
  return `solana:${BURN_ADDR}?${params.toString()}`;
}

function buildQrUrl(data, size = 180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&color=240-239-234&bgcolor=10-12-8&data=${encodeURIComponent(data)}`;
}

// ─── Consumables catalog ──────────────────────────────────────────────────────
const CONSUMABLES = [
  {
    type:        "shield",
    label:       "Streak Shield",
    icon:        "🛡",
    cost:        50000,
    costLabel:   "50,000 $TOUCHGRASS",
    color:       T.gold,
    accentBg:    "rgba(200,168,75,0.06)",
    borderColor: T.borderGold,
    glowColor:   "rgba(200,168,75,0.18)",
    description: "Protects your streak if you miss a day. Automatically consumed when needed.",
    details: [
      "Consumed automatically when a day is missed",
      "Stacks — hold multiple for longer protection",
      "Does not expire",
      "Does not prevent streak loss if no shield is held",
    ],
  },
  {
    type:        "sunset_pass",
    label:       "Sunset Pass",
    icon:        "🌅",
    cost:        25000,
    costLabel:   "25,000 $TOUCHGRASS",
    color:       T.fire,
    accentBg:    "rgba(249,115,22,0.06)",
    borderColor: "rgba(249,115,22,0.4)",
    glowColor:   "rgba(249,115,22,0.15)",
    description: "Extends today's proof submission window by 2 hours when you're running late.",
    details: [
      "Must be activated before the deadline expires",
      "Extends the window by exactly 2 hours",
      "Consumed immediately on activation",
      "Cannot stack — one active extension at a time",
    ],
  },
];

const HOW_IT_WORKS = [
  { n:"01", label:"Choose a consumable",            desc:"Select a Streak Shield or Sunset Pass." },
  { n:"02", label:"Burn $TOUCHGRASS",               desc:"Send the required amount to the burn address." },
  { n:"03", label:"Submit your transaction hash",   desc:"Paste the tx signature from your wallet." },
  { n:"04", label:"Admin confirms",                 desc:"We verify on-chain and credit your inventory." },
  { n:"05", label:"Use when needed",                desc:"Your consumable activates automatically or on demand." },
];

const FAQ = [
  { q:"What is a Streak Shield?",
    a:"A Shield protects your streak if you miss a day. It is consumed automatically to keep your chain alive." },
  { q:"How much does a Shield cost?",
    a:"50,000 $TOUCHGRASS burned to the official burn address." },
  { q:"What is a Sunset Pass?",
    a:"A Sunset Pass extends today's submission window by 2 hours, giving you extra time to lock in your proof." },
  { q:"How much does a Sunset Pass cost?",
    a:"25,000 $TOUCHGRASS burned to the official burn address." },
  { q:"Can I use a Sunset Pass after missing the deadline?",
    a:"No. It must be activated before the deadline expires. If you have already missed the window, use a Streak Shield instead." },
  { q:"Is the Double Burn Event still active?",
    a:"No. The Double Burn Event has ended and is now archived for historical reference below." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getUsername() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim() || null; }
  catch { return null; }
}

function fmtNum(n) {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US",{ month:"short", day:"numeric", year:"numeric" });
}

// ─── Purchase flow modal ──────────────────────────────────────────────────────
function PurchaseModal({ consumable, username, onClose }) {
  const [txInput,       setTxInput]       = useState("");
  const [status,        setStatus]        = useState(null); // null | loading | success | error
  const [errMsg,        setErrMsg]        = useState("");
  const [copiedAddr,    setCopiedAddr]    = useState(false);
  const [copiedDomain,  setCopiedDomain]  = useState(false);
  const payUrl = buildSolanaPayUrl(consumable.cost);

  const submit = async () => {
    if (!txInput.trim()) { setErrMsg("Paste your transaction signature."); return; }
    setStatus("loading"); setErrMsg("");
    try {
      const { error } = await supabase.from("ShieldPurchases").insert({
        username,
        tx_signature:    txInput.trim(),
        token_amount:    consumable.cost,
        status:          "pending",
        consumable_type: consumable.type,
      });
      if (error) throw error;
      setStatus("success");
    } catch(e) {
      setErrMsg(e.message || "Submission failed. Try again.");
      setStatus("error");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={status !== "loading" ? onClose : undefined}
        style={{ position:"fixed", inset:0, zIndex:998,
          background:"rgba(0,0,0,0.75)", backdropFilter:"blur(5px)" }} />

      {/* Modal */}
      <div style={{ position:"fixed", left:"50%", top:"50%",
        transform:"translate(-50%,-50%)", zIndex:999,
        width:"min(520px,95vw)", maxHeight:"90vh", overflowY:"auto",
        background:T.bg2, border:`1px solid ${consumable.borderColor}`,
        borderRadius:20, padding:"28px 24px",
        boxShadow:`0 0 60px ${consumable.glowColor}, 0 20px 60px rgba(0,0,0,0.7)` }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
          <span style={{ fontSize:36 }}>{consumable.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:22, fontWeight:700, color:T.white }}>{consumable.label}</div>
            <div style={{ fontSize:13, fontWeight:700, color:consumable.color }}>{consumable.costLabel}</div>
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:T.dim,
              cursor:"pointer", fontSize:22, lineHeight:1, padding:4 }}>×</button>
        </div>

        {status === "success" ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ fontSize:48, marginBottom:14 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:700, color:T.olive, marginBottom:8 }}>
              Purchase request submitted!
            </div>
            <div style={{ fontSize:13, color:T.muted, marginBottom:24, lineHeight:1.6 }}>
              An admin will verify your transaction on-chain and credit your inventory.
              This usually takes a few hours.
            </div>
            <button onClick={onClose}
              style={{ background:T.bg3, border:`1px solid ${T.border}`, color:T.dim,
                borderRadius:10, padding:"10px 24px", fontSize:13, cursor:"pointer" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Step instructions */}
            <div style={{ background:T.bg3, border:`1px solid ${T.border}`,
              borderRadius:12, padding:"14px 16px", marginBottom:18,
              fontSize:12, color:T.muted, lineHeight:1.8 }}>
              <div style={{ fontWeight:700, color:T.white, marginBottom:6 }}>How to purchase:</div>
              <ol style={{ margin:0, padding:"0 0 0 16px", display:"flex",
                flexDirection:"column", gap:3 }}>
                <li>Send exactly <strong style={{ color:consumable.color }}>{consumable.costLabel}</strong> to the burn address below.</li>
                <li>Copy the transaction signature from your wallet.</li>
                <li>Paste it in the field below and submit.</li>
                <li>Admin will verify and credit your account.</li>
              </ol>
            </div>

            {/* Burn address */}
            <div style={{ background:"rgba(0,0,0,0.35)", border:`1px solid ${T.border}`,
              borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
              <div style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase",
                color:T.dim, marginBottom:6 }}>Burn Address</div>
              <div style={{ fontFamily:"monospace", fontSize:11, color:T.olive,
                wordBreak:"break-all", marginBottom:10 }}>{BURN_ADDR}</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { navigator.clipboard.writeText(SOL_DOMAIN).catch(()=>{}); setCopiedDomain(true); setTimeout(()=>setCopiedDomain(false),1500); }}
                  style={{ flex:1, background:"transparent", border:`1px solid ${T.borderG}`,
                    color: copiedDomain ? "#4ade80" : T.olive, borderRadius:7,
                    padding:"7px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>
                  {copiedDomain ? "✓ Copied" : "Copy Domain"}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(BURN_ADDR).catch(()=>{}); setCopiedAddr(true); setTimeout(()=>setCopiedAddr(false),1500); }}
                  style={{ flex:1, background:"transparent", border:`1px solid ${T.borderG}`,
                    color: copiedAddr ? "#4ade80" : T.olive, borderRadius:7,
                    padding:"7px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>
                  {copiedAddr ? "✓ Copied" : "Copy Address"}
                </button>
              </div>
            </div>

            {/* Solana Pay + QR */}
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
              <a href={payUrl} style={{ display:"flex", alignItems:"center",
                justifyContent:"center", gap:8,
                background:`linear-gradient(135deg,${consumable.color}dd,${consumable.color}99)`,
                color:"#0a0c08", borderRadius:10, padding:"12px 16px",
                fontSize:13, fontWeight:700, textDecoration:"none", letterSpacing:"0.02em" }}>
                ⚡ Open in Wallet — Pay {consumable.costLabel}
              </a>
              <div style={{ fontSize:10, color:T.dim, textAlign:"center" }}>
                Opens your wallet app with the payment pre-filled.
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                padding:"14px 0", borderTop:`1px solid ${T.border}`,
                borderBottom:`1px solid ${T.border}` }}>
                <img src={buildQrUrl(payUrl)} alt="Scan to pay"
                  style={{ width:140, height:140, borderRadius:8,
                    border:`1px solid ${T.border}` }} />
                <div style={{ fontSize:10, color:T.dim }}>Scan with your Solana wallet</div>
              </div>
            </div>

            {/* TX input */}
            <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>
              Transaction Signature
            </div>
            <input value={txInput} onChange={e => setTxInput(e.target.value)}
              placeholder="Paste Solana tx hash…"
              style={{ width:"100%", background:"rgba(0,0,0,0.35)",
                border:`1px solid ${T.border}`, borderRadius:9,
                padding:"10px 12px", color:T.white, fontSize:12,
                outline:"none", fontFamily:"monospace",
                marginBottom:10, boxSizing:"border-box" }} />

            {errMsg && <div style={{ fontSize:11, color:"#ef4444", marginBottom:10 }}>{errMsg}</div>}

            <button onClick={submit} disabled={status==="loading"}
              style={{ width:"100%", background:consumable.color, color:"#0a0c08",
                border:"none", borderRadius:10, padding:"13px",
                fontSize:13, fontWeight:700, cursor:"pointer",
                opacity:status==="loading"?0.7:1 }}>
              {status==="loading" ? "Submitting…" : `Submit ${consumable.label} Purchase`}
            </button>

            {!username && (
              <div style={{ fontSize:11, color:"#f97316", marginTop:10, textAlign:"center" }}>
                ⚠ Enter your username on the dashboard before submitting.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Accordion FAQ item ───────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:`1px solid ${T.border}` }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width:"100%", display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:12,
          padding:"16px 0", background:"none", border:"none",
          cursor:"pointer", textAlign:"left" }}>
        <span style={{ fontSize:13, fontWeight:600, color:T.white }}>{q}</span>
        <span style={{ fontSize:18, color:T.olive, flexShrink:0, lineHeight:1 }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div style={{ fontSize:12.5, color:T.muted, lineHeight:1.7,
          paddingBottom:14 }}>{a}</div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BurnsPage() {
  const [username,       setUsername]       = useState(null);
  const [inventory,      setInventory]      = useState({});
  const [history,        setHistory]        = useState([]);
  const [burnHistory,    setBurnHistory]    = useState([]);
  const [purchasing,     setPurchasing]     = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [copiedAddr,     setCopiedAddr]     = useState(false);

  // Archived event stats
  const [archiveStats,   setArchiveStats]   = useState(null);

  const shieldRef    = useRef(null);
  const sunsetRef    = useRef(null);
  const purchaseRef  = useRef(null);

  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    Promise.all([
      u ? loadInventory(u)  : Promise.resolve(),
      u ? loadHistory(u)    : Promise.resolve(),
      loadArchiveStats(),
      loadBurnHistory(),
    ]).finally(() => setLoading(false));
  }, []);

  const loadInventory = async (u) => {
    const { data } = await supabase
      .from("UserConsumables")
      .select("consumable_type,quantity")
      .eq("username", u);
    const inv = {};
    (data || []).forEach(r => { inv[r.consumable_type] = r.quantity; });
    setInventory(inv);
  };

  const loadHistory = async (u) => {
    const { data } = await supabase
      .from("ConsumableEvents")
      .select("consumable_type,event_type,quantity,created_at,metadata")
      .eq("username", u)
      .order("created_at", { ascending:false })
      .limit(20);
    setHistory(data || []);
  };

  const loadArchiveStats = async () => {
    const { count: shieldCount } = await supabase
      .from("BurnEvents")
      .select("id", { count:"exact", head:true })
      .eq("burn_type", "shield_burn");
    const { data: topBurners } = await supabase
      .from("BurnEvents")
      .select("username,amount_burned")
      .eq("burn_type","shield_burn")
      .order("amount_burned", { ascending:false })
      .limit(10);
    setArchiveStats({
      totalShields: shieldCount ?? 0,
      totalBurned:  (shieldCount ?? 0) * 50000,
      topBurners:   topBurners ?? [],
    });
  };

  const loadBurnHistory = async () => {
    const { data } = await supabase
      .from("BurnEvents")
      .select("username,amount_burned,treasury_match_amount,created_at")
      .eq("burn_type","shield_burn")
      .order("created_at", { ascending:false })
      .limit(15);
    setBurnHistory(data || []);
  };

  const openPurchase = (type) => {
    setPurchasing(type);
    setTimeout(() => purchaseRef.current?.scrollIntoView({ behavior:"smooth", block:"center" }), 80);
  };

  const evLabel = (t) => ({ purchase_approved:"✓ Credited", purchase_rejected:"✕ Rejected",
    consumed:"⚡ Used", activated:"🌅 Activated", admin_adjusted:"⚙ Admin Grant",
    expired:"⏰ Expired", purchase_requested:"⏳ Pending" }[t] || t);
  const evColor = (t) => ({ purchase_approved:T.olive, purchase_rejected:"#ef4444",
    consumed:T.fire, activated:T.amber, admin_adjusted:"#a78bfa" }[t] || T.dim);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
    .fade{animation:fadeUp 0.5s ease both;}
    .consumable-card{transition:transform 0.2s, box-shadow 0.2s;}
    .consumable-card:hover{transform:translateY(-3px);}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* ── NAV ────────────────────────────────────────────────────────── */}
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
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            {username && (
              <Link href={`/u/${username}`}
                style={{ fontSize:12, color:T.olive, textDecoration:"none" }}>
                @{username}
              </Link>
            )}
            <Link href="/"
              style={{ fontSize:12, color:T.dim, textDecoration:"none" }}>
              ← Dashboard
            </Link>
          </div>
        </nav>

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section style={{ position:"relative", padding:"72px clamp(14px,5vw,64px) 64px",
          background:"linear-gradient(160deg,#0a1208,#0e1a0a 40%,#080a06)",
          borderBottom:`1px solid ${T.border}`, overflow:"hidden" }}>
          {/* Background glow */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none",
            backgroundImage:"radial-gradient(ellipse at 70% 50%,rgba(147,168,90,0.08),transparent 65%),radial-gradient(ellipse at 20% 80%,rgba(249,115,22,0.05),transparent 55%)" }} />

          <div style={{ position:"relative", maxWidth:680, margin:"0 auto",
            textAlign:"center" }} className="fade">
            <div style={{ fontSize:10, letterSpacing:"0.22em", textTransform:"uppercase",
              color:T.olive, fontWeight:600, marginBottom:14 }}>
              Proof of Grass
            </div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:"clamp(38px,6vw,72px)", fontWeight:700, color:T.white,
              lineHeight:1, letterSpacing:"-0.02em", marginBottom:18 }}>
              Shields &amp; Consumables
            </h1>
            <p style={{ fontSize:"clamp(13px,1.8vw,16px)", color:T.muted,
              lineHeight:1.7, maxWidth:520, margin:"0 auto 32px",
              fontWeight:300 }}>
              Burn $TOUCHGRASS to protect your streak, extend your submission window,
              and keep your Proof of Grass journey alive.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center",
              flexWrap:"wrap" }}>
              <button onClick={() => { shieldRef.current?.scrollIntoView({ behavior:"smooth", block:"center" }); }}
                style={{ display:"inline-flex", alignItems:"center", gap:8,
                  background:`linear-gradient(135deg,${T.gold},#a07820)`,
                  color:"#0a0c08", border:"none", borderRadius:10,
                  padding:"13px 26px", fontSize:13, fontWeight:700,
                  cursor:"pointer", letterSpacing:"0.04em" }}>
                🛡 Get Shield
              </button>
              <button onClick={() => { sunsetRef.current?.scrollIntoView({ behavior:"smooth", block:"center" }); }}
                style={{ display:"inline-flex", alignItems:"center", gap:8,
                  background:`linear-gradient(135deg,${T.fire},#c2410c)`,
                  color:"#fff", border:"none", borderRadius:10,
                  padding:"13px 26px", fontSize:13, fontWeight:700,
                  cursor:"pointer", letterSpacing:"0.04em" }}>
                🌅 Get Sunset Pass
              </button>
            </div>
          </div>
        </section>

        <div style={{ maxWidth:760, margin:"0 auto",
          padding:"48px clamp(14px,5vw,32px) 80px" }}>

          {/* ── YOUR INVENTORY ─────────────────────────────────────────────── */}
          {username && (
            <section style={{ marginBottom:48 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.dim, marginBottom:14 }}>
                🎒 Your Inventory
              </div>
              <div style={{ background:`linear-gradient(145deg,${T.bg2},${T.bg3})`,
                border:`1px solid ${T.borderGold}`, borderRadius:16,
                padding:"20px 24px",
                display:"flex", gap:32, flexWrap:"wrap" }}>
                {CONSUMABLES.map(c => (
                  <div key={c.type}
                    style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:30 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize:11, color:T.dim }}>{c.label}</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                        fontSize:28, fontWeight:700, color:c.color, lineHeight:1 }}>
                        {loading ? "—" : (inventory[c.type] ?? 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── AVAILABLE CONSUMABLES ──────────────────────────────────────── */}
          <section style={{ marginBottom:52 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
              textTransform:"uppercase", color:T.dim, marginBottom:20 }}>
              Available Consumables
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {CONSUMABLES.map((c, i) => (
                <div key={c.type}
                  ref={i===0 ? shieldRef : sunsetRef}
                  className="consumable-card"
                  style={{ background:c.accentBg, border:`1px solid ${c.borderColor}`,
                    borderRadius:18, padding:"24px 24px",
                    boxShadow:`0 0 32px ${c.glowColor}` }}>
                  <div style={{ display:"flex", alignItems:"flex-start",
                    gap:18, flexWrap:"wrap" }}>
                    <div style={{ fontSize:48, lineHeight:1, flexShrink:0 }}>{c.icon}</div>
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ display:"flex", alignItems:"center",
                        gap:12, flexWrap:"wrap", marginBottom:8 }}>
                        <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                          fontSize:24, fontWeight:700, color:T.white }}>{c.label}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:c.color,
                          fontFamily:"monospace" }}>{c.costLabel}</span>
                      </div>
                      <p style={{ fontSize:13, color:T.muted, marginBottom:12,
                        lineHeight:1.6 }}>{c.description}</p>
                      <ul style={{ margin:0, padding:"0 0 0 16px",
                        display:"flex", flexDirection:"column", gap:4 }}>
                        {c.details.map((d,j) => (
                          <li key={j} style={{ fontSize:12, color:T.dim,
                            lineHeight:1.5 }}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ flexShrink:0 }}>
                      {username ? (
                        <button onClick={() => openPurchase(c.type)}
                          style={{ background:c.color, color:"#0a0c08",
                            border:"none", borderRadius:10,
                            padding:"12px 24px", fontSize:13, fontWeight:700,
                            cursor:"pointer", whiteSpace:"nowrap",
                            boxShadow:`0 4px 16px ${c.glowColor}` }}>
                          {c.icon} Get {c.label.split(" ")[1] || c.label}
                        </button>
                      ) : (
                        <Link href="/" style={{ background:T.bg3,
                          color:T.dim, border:`1px solid ${T.border}`,
                          borderRadius:10, padding:"12px 24px", fontSize:13,
                          fontWeight:600, textDecoration:"none",
                          display:"inline-block" }}>
                          Sign in first
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
          <section style={{ marginBottom:52 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
              textTransform:"uppercase", color:T.dim, marginBottom:20 }}>
              How It Works
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i}
                  style={{ display:"flex", gap:18, alignItems:"flex-start",
                    padding:"18px 0",
                    borderBottom: i < HOW_IT_WORKS.length-1
                      ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:32, fontWeight:700, color:`${T.olive}40`,
                    lineHeight:1, flexShrink:0, width:40, textAlign:"right" }}>
                    {step.n}
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.white,
                      marginBottom:4 }}>{step.label}</div>
                    <div style={{ fontSize:12, color:T.muted,
                      lineHeight:1.6 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── PURCHASE HISTORY ───────────────────────────────────────────── */}
          {username && (
            <section style={{ marginBottom:52 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
                Purchase &amp; Usage History
              </div>
              {loading ? (
                <div style={{ fontSize:12, color:T.dim }}>Loading…</div>
              ) : history.length === 0 ? (
                <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
                  borderRadius:12, padding:"28px 20px",
                  textAlign:"center", fontSize:12, color:T.dim }}>
                  No consumable activity yet.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {history.map((ev, i) => {
                    const def = CONSUMABLES.find(c => c.type === ev.consumable_type);
                    return (
                      <div key={i}
                        style={{ background:T.bg2, border:`1px solid ${T.border}`,
                          borderRadius:10, padding:"12px 16px",
                          display:"flex", alignItems:"center", gap:12 }}>
                        <span style={{ fontSize:18, flexShrink:0 }}>
                          {def?.icon || "📦"}
                        </span>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center",
                            gap:8, flexWrap:"wrap" }}>
                            <span style={{ fontSize:13, color:T.white,
                              fontWeight:600 }}>{def?.label || ev.consumable_type}</span>
                            <span style={{ fontSize:10, fontFamily:"monospace",
                              color:evColor(ev.event_type),
                              background:`${evColor(ev.event_type)}18`,
                              padding:"1px 7px", borderRadius:20 }}>
                              {evLabel(ev.event_type)}
                            </span>
                            {ev.quantity > 0 && (
                              <span style={{ fontSize:11, color:T.dim }}>×{ev.quantity}</span>
                            )}
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
            </section>
          )}

          {/* ── FAQ ────────────────────────────────────────────────────────── */}
          <section style={{ marginBottom:52 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
              textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
              FAQ
            </div>
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
              borderRadius:14, padding:"0 20px" }}>
              {FAQ.map((item, i) => <FaqItem key={i} {...item} />)}
            </div>
          </section>

          {/* ── ARCHIVED: DOUBLE BURN EVENT ────────────────────────────────── */}
          <section>
            <details style={{ background:T.bg2, border:`1px solid ${T.border}`,
              borderRadius:14, padding:"18px 20px" }}>
              <summary style={{ cursor:"pointer", display:"flex",
                alignItems:"center", gap:10, listStyle:"none" }}>
                <span style={{ fontSize:18, opacity:0.5 }}>📁</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700,
                    color:"rgba(240,239,234,0.45)" }}>
                    Archived — Double Burn Event
                  </div>
                  <div style={{ fontSize:11, color:T.dim }}>
                    June 21 – July 1, 2026 · Event Ended
                  </div>
                </div>
                <span style={{ marginLeft:"auto", fontSize:11,
                  color:T.dim, flexShrink:0 }}>View →</span>
              </summary>

              <div style={{ marginTop:20, paddingTop:20,
                borderTop:`1px solid ${T.border}` }}>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.7,
                  marginBottom:20 }}>
                  The Double Burn Event has concluded. During the event, the treasury matched
                  every Shield burn 1:1 — burning 50,000 $TOUCHGRASS credited 100,000 total burned.
                  All participant records are preserved below.
                </div>

                {/* Final stats */}
                {archiveStats && (
                  <div style={{ display:"flex", gap:20, flexWrap:"wrap",
                    marginBottom:24 }}>
                    {[
                      ["Shields Burned",    archiveStats.totalShields],
                      ["$TOUCHGRASS Burned", fmtNum(archiveStats.totalBurned)],
                      ["Participants",       archiveStats.topBurners.length],
                    ].map(([label, val]) => (
                      <div key={label}
                        style={{ background:T.bg3, border:`1px solid ${T.border}`,
                          borderRadius:10, padding:"14px 18px", flex:"1 1 140px" }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                          fontSize:24, fontWeight:700,
                          color:"rgba(200,168,75,0.7)" }}>{val}</div>
                        <div style={{ fontSize:10, color:T.dim,
                          textTransform:"uppercase", letterSpacing:"0.08em" }}>
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Historical leaderboard */}
                {archiveStats?.topBurners?.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700,
                      letterSpacing:"0.14em", textTransform:"uppercase",
                      color:T.dim, marginBottom:10 }}>Historical Burn Leaderboard</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {archiveStats.topBurners.map((row, i) => (
                        <div key={i}
                          style={{ display:"flex", alignItems:"center", gap:12,
                            padding:"10px 14px", background:T.bg3,
                            border:`1px solid ${T.border}`, borderRadius:9 }}>
                          <span style={{ fontSize:11, color:i<3?T.gold:T.dim,
                            fontWeight:700, width:20, textAlign:"center" }}>
                            {i+1}
                          </span>
                          <Link href={`/u/${row.username}`}
                            style={{ flex:1, fontSize:13, color:T.white,
                              textDecoration:"none", fontWeight:600 }}>
                            @{row.username}
                          </Link>
                          <span style={{ fontSize:12, color:"rgba(200,168,75,0.7)",
                            fontWeight:700, fontFamily:"monospace" }}>
                            🔥 {fmtNum(row.amount_burned)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Burn history */}
                {burnHistory.length > 0 && (
                  <div style={{ marginTop:20 }}>
                    <div style={{ fontSize:10, fontWeight:700,
                      letterSpacing:"0.14em", textTransform:"uppercase",
                      color:T.dim, marginBottom:10 }}>Burn History</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {burnHistory.map((row, i) => (
                        <div key={i}
                          style={{ display:"flex", alignItems:"center", gap:12,
                            padding:"9px 14px", background:T.bg3,
                            border:`1px solid ${T.border}`, borderRadius:9 }}>
                          <Link href={`/u/${row.username}`}
                            style={{ flex:1, fontSize:12, color:T.white,
                              textDecoration:"none", fontWeight:600 }}>
                            @{row.username}
                          </Link>
                          <span style={{ fontSize:11,
                            color:"rgba(200,168,75,0.6)",
                            fontFamily:"monospace" }}>
                            {fmtNum(row.amount_burned)}
                          </span>
                          <span style={{ fontSize:10, color:T.dim }}>
                            {fmtDate(row.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop:20 }}>
                  <Link href="/burns/collection"
                    style={{ fontSize:12, fontWeight:600, color:T.gold,
                      textDecoration:"none", padding:"9px 18px",
                      borderRadius:9, border:`1px solid ${T.borderGold}`,
                      display:"inline-block" }}>
                    🔥 View My Double Burner Card
                  </Link>
                </div>
              </div>
            </details>
          </section>

        </div>{/* end content container */}

        {/* ── PURCHASE MODAL ─────────────────────────────────────────────── */}
        {purchasing && (
          <PurchaseModal
            consumable={CONSUMABLES.find(c => c.type === purchasing)}
            username={username}
            onClose={() => setPurchasing(null)}
          />
        )}

      </div>
    </>
  );
}