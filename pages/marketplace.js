import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Head from "next/head";
import { supabase } from "../utils/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────
const BURN_ADDR      = "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";
const SOL_DOMAIN     = "touchgrassburn.sol";
const TOUCHGRASS_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
  red:"#ef4444",
};

// ── Marketplace Catalogue ─────────────────────────────────────────────────────
// Add future items here — no UI changes needed
const CATALOGUE = [
  {
    id:          "retro_vibes_pack",
    name:        "Retro Vibes Pack",
    category:    "premium_proofs",
    status:      "live",
    featured:    true,
    usdPrice:    5.00,
    description: "A collectible 8-bit inspired proof pack featuring four premium outdoor themes. Applies to your profile card and flex card.",
    styles: [
      { id:"enchanted_forest", name:"Enchanted Forest", emoji:"🌲", accent:"rgba(16,185,129,1.0)", bgOverlay:"rgba(0,20,8,0.45)", border:"rgba(16,185,129,0.55)", bracket:"rgba(16,185,129,0.85)", muted:"rgba(16,185,129,0.75)" },
      { id:"tropical_beach",   name:"Tropical Beach",   emoji:"🏖", accent:"rgba(56,189,248,1.0)", bgOverlay:"rgba(0,15,30,0.40)", border:"rgba(56,189,248,0.55)", bracket:"rgba(56,189,248,0.85)", muted:"rgba(56,189,248,0.75)" },
      { id:"snowy_summit",     name:"Snowy Summit",     emoji:"🏔", accent:"rgba(226,232,240,1.0)", bgOverlay:"rgba(8,12,20,0.42)", border:"rgba(226,232,240,0.45)", bracket:"rgba(226,232,240,0.75)", muted:"rgba(226,232,240,0.65)" },
      { id:"camp_stars",       name:"Camp Under the Stars", emoji:"⛺", accent:"rgba(251,191,36,1.0)", bgOverlay:"rgba(8,6,0,0.48)", border:"rgba(251,191,36,0.50)", bracket:"rgba(251,191,36,0.80)", muted:"rgba(251,191,36,0.70)" },
    ],
    tags: ["Enchanted Forest","Tropical Beach","Snowy Summit","Camp Under the Stars"],
  },
];

const CATEGORIES = [
  { id:"featured",        label:"🏪 Featured",          comingSoon:false },
  { id:"premium_proofs",  label:"🖼 Premium Proofs",     comingSoon:false },
  { id:"consumables",     label:"🛡 Consumables",        comingSoon:false },
  { id:"cosmetics",       label:"🎨 Profile Cosmetics",  comingSoon:true  },
  { id:"limited",         label:"🎁 Limited Editions",   comingSoon:true  },
];

function getUsername() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim()||null; }
  catch { return null; }
}

function buildQrUrl(data,size=180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

function buildSolanaPayUrl(amount) {
  const params = new URLSearchParams({ amount:String(Math.round(amount)), "spl-token":TOUCHGRASS_MINT, label:"Proof of Grass Marketplace", memo:"marketplace" });
  return `solana:${BURN_ADDR}?${params.toString()}`;
}

// ── Price hook ────────────────────────────────────────────────────────────────
function useTouchgrassPrice() {
  const [price,   setPrice]   = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch("/api/touchgrass-price");
      const d = await r.json();
      if (d.price > 0) setPrice(d.price);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, 60000);
    return () => clearInterval(timerRef.current);
  }, [fetch_]);

  const tokensFor = (usd) => price > 0 ? Math.round(usd / price) : null;
  return { price, loading, tokensFor };
}

// ── Style preview swatch ──────────────────────────────────────────────────────
function StyleSwatch({ style, selected, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        flex:"1 1 0", minWidth:0, border:`2px solid ${selected ? style.accent : "rgba(255,255,255,0.08)"}`,
        borderRadius:12, padding:"12px 8px", cursor:"pointer",
        background: selected ? `${style.bgOverlay}` : "rgba(255,255,255,0.02)",
        display:"flex", flexDirection:"column", alignItems:"center", gap:6,
        transition:"all 0.15s", outline:"none",
        boxShadow: selected ? `0 0 16px ${style.accent}30` : "none",
      }}>
      <div style={{
        width:44, height:44, borderRadius:10,
        background:`linear-gradient(135deg,${style.bgOverlay},${style.accent}22)`,
        border:`1px solid ${style.border}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
        boxShadow: selected ? `0 0 12px ${style.accent}40` : "none",
      }}>{style.emoji}</div>
      <div style={{fontSize:9, fontWeight:700, color: selected ? style.accent : T.muted,
        letterSpacing:"0.06em", textAlign:"center", lineHeight:1.3}}>
        {style.name}
      </div>
    </button>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, tokensFor, owned, onBuy, onPreview, username }) {
  const tokens  = tokensFor(item.usdPrice);
  const isLive  = item.status === "live";

  return (
    <div style={{
      background:T.bg2, border:`1px solid ${T.border}`,
      borderRadius:18, overflow:"hidden", display:"flex", flexDirection:"column",
      position:"relative",
    }}>
      {/* Featured / Owned badge */}
      <div style={{position:"absolute",top:14,left:14,display:"flex",gap:6,zIndex:2}}>
        {item.featured && !owned && (
          <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",
            color:T.gold, background:"rgba(200,168,75,0.15)", border:`1px solid ${T.borderGold}`,
            borderRadius:20, padding:"3px 10px"}}>Featured</div>
        )}
        {owned && (
          <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",
            color:T.olive, background:"rgba(147,168,90,0.15)", border:`1px solid rgba(147,168,90,0.3)`,
            borderRadius:20, padding:"3px 10px"}}>✓ Owned</div>
        )}
      </div>

      {/* Style swatches as artwork */}
      {item.styles && (
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:0, background:T.bg3, minHeight:160, position:"relative",
        }}>
          {item.styles.map(s => (
            <div key={s.id} style={{
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${s.bgOverlay},rgba(0,0,0,0.6))`,
              padding:20, fontSize:36,
              borderBottom:`1px solid ${T.border}`,
              borderRight:`1px solid ${T.border}`,
            }}>{s.emoji}</div>
          ))}
          <div style={{
            position:"absolute", inset:0,
            background:"linear-gradient(180deg,transparent 50%,rgba(8,10,6,0.9))",
            pointerEvents:"none",
          }} />
          <div style={{
            position:"absolute", bottom:12, left:0, right:0, textAlign:"center",
            fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:18, fontWeight:700, color:T.white, letterSpacing:"0.04em",
          }}>{item.name}</div>
        </div>
      )}

      {/* Info */}
      <div style={{padding:"18px 18px 16px", flex:1, display:"flex", flexDirection:"column", gap:10}}>
        <div style={{fontSize:12, color:T.muted, lineHeight:1.7}}>{item.description}</div>

        {/* Included styles */}
        {item.tags && (
          <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
            {item.tags.map(t => (
              <div key={t} style={{fontSize:9, color:T.dim, background:"rgba(255,255,255,0.04)",
                border:`1px solid ${T.border}`, borderRadius:20, padding:"2px 9px"}}>
                {t}
              </div>
            ))}
          </div>
        )}

        {/* Price */}
        <div style={{
          background:T.bg3, border:`1px solid ${T.border}`,
          borderRadius:10, padding:"12px 14px",
          display:"flex", justifyContent:"space-between", alignItems:"flex-end",
        }}>
          <div>
            <div style={{fontSize:9,color:T.dim,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3}}>Price</div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:28,fontWeight:700,color:T.white,lineHeight:1}}>
              ${item.usdPrice.toFixed(2)}
            </div>
            <div style={{fontSize:10,color:T.dim,marginTop:2}}>USD</div>
          </div>
          {tokens && (
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:9,color:T.dim,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3}}>Current Cost</div>
              <div style={{fontSize:14,fontWeight:700,color:T.gold}}>≈ {tokens.toLocaleString()}</div>
              <div style={{fontSize:9,color:T.dim}}>$TOUCHGRASS</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {isLive && !owned && username && (
          <div style={{display:"flex",gap:8}}>
            <button onClick={() => onPreview(item)}
              style={{flex:1,padding:"10px",borderRadius:9,cursor:"pointer",
                background:"transparent", border:`1px solid ${T.border}`,
                color:T.muted, fontSize:12, fontWeight:600}}>
              Preview
            </button>
            <button onClick={() => onBuy(item)}
              style={{flex:2,padding:"10px",borderRadius:9,cursor:"pointer",
                background:`linear-gradient(135deg,${T.gold},#a88c38)`,
                border:"none", color:"#0a0800", fontSize:13, fontWeight:800,
                letterSpacing:"0.04em",
                boxShadow:"0 4px 16px rgba(200,168,75,0.3)"}}>
              Buy Pack →
            </button>
          </div>
        )}
        {owned && (
          <div style={{padding:"10px",borderRadius:9,background:"rgba(147,168,90,0.08)",
            border:"1px solid rgba(147,168,90,0.2)",textAlign:"center",
            fontSize:12,color:T.olive,fontWeight:700}}>
            ✓ In Your Collection
          </div>
        )}
        {!username && isLive && (
          <Link href="/" style={{display:"block",padding:"10px",borderRadius:9,
            background:T.bg3,border:`1px solid ${T.border}`,textAlign:"center",
            fontSize:12,color:T.muted,textDecoration:"none"}}>
            Sign in to purchase
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Purchase modal ────────────────────────────────────────────────────────────
function PurchaseModal({ item, tokens, price, username, onClose, onSuccess }) {
  const [wallet,  setWallet]  = useState("");
  const [step,    setStep]    = useState("confirm"); // confirm | pay | success
  const [status,  setStatus]  = useState(null);
  const [error,   setError]   = useState("");
  const [copied,  setCopied]  = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const solPayUrl = buildSolanaPayUrl(tokens ?? 0);

  const handlePurchase = async () => {
    if (!wallet.trim()) { setError("Enter your wallet address."); return; }
    setStatus("loading"); setError("");
    const { error: dbErr } = await supabase.from("MarketplacePurchases").insert([{
      username,
      wallet: wallet.trim(),
      item_id: item.id,
      item_name: item.name,
      usd_price: item.usdPrice,
      touchgrass_paid: tokens,
      status: "pending",
    }]);
    if (dbErr) { setError(dbErr.message || "Submission failed — try again."); setStatus("error"); return; }
    setStatus("success");
    setStep("success");
    onSuccess?.();
  };

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text).catch(()=>{});
    setter(true);
    setTimeout(() => setter(false), 1500);
  };

  return (
    <>
      <div onClick={onClose}
        style={{position:"fixed",inset:0,zIndex:998,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(4px)"}} />
      <div style={{
        position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        zIndex:999,width:"min(500px,94vw)",maxHeight:"90vh",overflowY:"auto",
        background:T.bg2,border:`1px solid ${T.borderGold}`,
        borderRadius:20,padding:"28px 24px",
        boxShadow:"0 24px 80px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <div style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:T.gold,marginBottom:4}}>
              Marketplace
            </div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:700,color:T.white}}>
              {item.name}
            </div>
          </div>
          <button onClick={onClose}
            style={{background:"none",border:`1px solid ${T.border}`,color:T.dim,
              borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12,flexShrink:0}}>
            ✕
          </button>
        </div>

        {step === "confirm" && (
          <>
            {/* Style preview grid */}
            {item.styles && (
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                {item.styles.map(s => (
                  <div key={s.id} style={{
                    flex:1,aspectRatio:"1",borderRadius:10,
                    background:`linear-gradient(135deg,${s.bgOverlay},rgba(0,0,0,0.5))`,
                    border:`1px solid ${s.border}`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,
                  }}>{s.emoji}</div>
                ))}
              </div>
            )}

            {/* Price summary */}
            <div style={{background:T.bg3,borderRadius:12,padding:"16px",marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:12,color:T.muted}}>Price</span>
                <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:700,color:T.white}}>
                  ${item.usdPrice.toFixed(2)} USD
                </span>
              </div>
              {tokens && (
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  paddingTop:10,borderTop:`1px solid ${T.border}`}}>
                  <span style={{fontSize:12,color:T.muted}}>Current Cost</span>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,fontWeight:700,color:T.gold}}>≈ {tokens.toLocaleString()} $TOUCHGRASS</div>
                    {price && <div style={{fontSize:9,color:T.dim}}>1 $TOUCHGRASS = ${price.toFixed(8)}</div>}
                  </div>
                </div>
              )}
            </div>

            <div style={{fontSize:11,color:T.dim,lineHeight:1.7,marginBottom:20}}>
              This purchase permanently unlocks <strong style={{color:T.white}}>{item.name}</strong> for your account.
              Your purchase will be verified by our team and applied within 24 hours.
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={onClose}
                style={{flex:1,padding:"12px",borderRadius:9,cursor:"pointer",
                  background:"transparent",border:`1px solid ${T.border}`,
                  color:T.muted,fontSize:13,fontWeight:600}}>
                Cancel
              </button>
              <button onClick={() => setStep("pay")}
                style={{flex:2,padding:"12px",borderRadius:9,cursor:"pointer",
                  background:`linear-gradient(135deg,${T.gold},#a88c38)`,
                  border:"none",color:"#0a0800",fontSize:13,fontWeight:800,
                  letterSpacing:"0.04em",boxShadow:"0 4px 16px rgba(200,168,75,0.3)"}}>
                Purchase →
              </button>
            </div>
          </>
        )}

        {step === "pay" && (
          <>
            <div style={{fontSize:12,color:T.muted,lineHeight:1.7,marginBottom:18}}>
              Send exactly <strong style={{color:T.gold}}>{tokens?.toLocaleString()} $TOUCHGRASS</strong> to the address below,
              then submit your wallet address for verification.
            </div>

            {/* Solana Pay */}
            <a href={solPayUrl}
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                background:`linear-gradient(135deg,${T.olive},#7a9148)`,
                color:"#0a0c08",borderRadius:10,padding:"13px",fontSize:13,fontWeight:800,
                textDecoration:"none",letterSpacing:"0.04em",marginBottom:14,
                boxShadow:"0 4px 20px rgba(147,168,90,0.3)"}}>
              ⚡ Open Wallet — Pay {tokens?.toLocaleString()} $TOUCHGRASS
            </a>

            {/* Divider */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{flex:1,height:1,background:T.border}} />
              <span style={{fontSize:9,color:T.dim,letterSpacing:"0.1em"}}>OR SEND MANUALLY</span>
              <div style={{flex:1,height:1,background:T.border}} />
            </div>

            {/* Address card */}
            <div style={{background:T.bg3,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontSize:9,color:T.dim,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Burn Address</div>
              <div style={{fontFamily:"monospace",fontSize:11,color:T.olive,wordBreak:"break-all",marginBottom:10}}>
                {SOL_DOMAIN}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={() => copy(SOL_DOMAIN, setCopied)}
                  style={{flex:1,background:"transparent",border:`1px solid ${T.borderG}`,
                    color:copied?"#4ade80":T.olive,borderRadius:7,padding:"7px 0",fontSize:10,cursor:"pointer",fontWeight:600}}>
                  {copied ? "✓ Copied" : "Copy Domain"}
                </button>
                <button onClick={() => copy(BURN_ADDR, setCopiedAddr)}
                  style={{flex:1,background:"transparent",border:`1px solid ${T.borderG}`,
                    color:copiedAddr?"#4ade80":T.olive,borderRadius:7,padding:"7px 0",fontSize:10,cursor:"pointer",fontWeight:600}}>
                  {copiedAddr ? "✓ Copied" : "Copy Address"}
                </button>
              </div>
            </div>

            {/* QR */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,paddingBottom:14,marginBottom:14,borderBottom:`1px solid ${T.border}`}}>
              <img src={buildQrUrl(solPayUrl)} alt="Scan to pay" style={{width:120,height:120,borderRadius:10,border:`1px solid ${T.border}`}} />
              <div style={{fontSize:9,color:T.dim}}>Scan with your wallet app</div>
            </div>

            {/* Wallet input */}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,color:T.dim,marginBottom:6}}>
                After sending, enter your wallet address for verification:
              </div>
              <input type="text" placeholder="Your Solana wallet address"
                value={wallet} onChange={e => setWallet(e.target.value)}
                style={{width:"100%",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.border}`,
                  borderRadius:8,padding:"9px 12px",color:T.white,fontSize:12,
                  outline:"none",fontFamily:"monospace",boxSizing:"border-box"}} />
            </div>
            {error && <div style={{fontSize:10,color:T.red,marginBottom:8}}>{error}</div>}

            <button onClick={handlePurchase} disabled={status==="loading"}
              style={{width:"100%",padding:"12px",borderRadius:9,cursor:"pointer",
                background:`linear-gradient(135deg,${T.gold},#a88c38)`,
                border:"none",color:"#0a0800",fontSize:13,fontWeight:800,
                letterSpacing:"0.04em",opacity:status==="loading"?0.6:1}}>
              {status==="loading" ? "Submitting…" : "Submit Purchase Request"}
            </button>
          </>
        )}

        {step === "success" && (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:16}}>🎉</div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:700,color:T.white,marginBottom:10}}>
              Purchase Submitted!
            </div>
            <div style={{fontSize:12,color:T.muted,lineHeight:1.7,marginBottom:24}}>
              Your purchase request for <strong style={{color:T.white}}>{item.name}</strong> has been received.
              Our team will verify your transaction and unlock the pack within 24 hours.
            </div>
            <button onClick={onClose}
              style={{padding:"12px 32px",borderRadius:9,cursor:"pointer",
                background:T.olive,border:"none",color:"#0a0800",fontSize:13,fontWeight:800}}>
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ item, onClose, onBuy }) {
  const [idx, setIdx] = useState(0);
  const styles = item.styles ?? [];
  const s = styles[idx];

  return (
    <>
      <div onClick={onClose}
        style={{position:"fixed",inset:0,zIndex:998,background:"rgba(0,0,0,0.80)",backdropFilter:"blur(4px)"}} />
      <div style={{
        position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        zIndex:999,width:"min(480px,94vw)",
        background:T.bg2,border:`1px solid ${T.border}`,
        borderRadius:20,padding:"24px",
        boxShadow:"0 24px 80px rgba(0,0,0,0.8)",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:20,fontWeight:700,color:T.white}}>
            Preview Styles
          </div>
          <button onClick={onClose}
            style={{background:"none",border:`1px solid ${T.border}`,color:T.dim,
              borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>

        {/* Big preview area */}
        <div style={{
          width:"100%", aspectRatio:"16/9", borderRadius:14, marginBottom:16,
          background:`linear-gradient(135deg,${s?.bgOverlay ?? "rgba(0,0,0,0.5)"},rgba(0,0,0,0.7))`,
          border:`2px solid ${s?.border ?? T.border}`,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          gap:12, position:"relative", overflow:"hidden",
          boxShadow:`0 0 40px ${s?.accent ?? T.olive}20`,
        }}>
          <div style={{fontSize:64}}>{s?.emoji}</div>
          <div style={{
            fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:22, fontWeight:700, color:s?.accent ?? T.white,
            letterSpacing:"0.04em", textShadow:"0 2px 12px rgba(0,0,0,0.8)",
          }}>{s?.name}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Proof of Grass · Profile Style</div>
        </div>

        {/* Style selector */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {styles.map((st,i) => (
            <StyleSwatch key={st.id} style={st} selected={i===idx} onClick={() => setIdx(i)} />
          ))}
        </div>

        <div style={{fontSize:10,color:T.dim,textAlign:"center",marginBottom:16}}>
          Preview only · Purchase to apply to your profile
        </div>

        <button onClick={() => { onClose(); onBuy(item); }}
          style={{width:"100%",padding:"13px",borderRadius:9,cursor:"pointer",
            background:`linear-gradient(135deg,${T.gold},#a88c38)`,
            border:"none",color:"#0a0800",fontSize:13,fontWeight:800,
            letterSpacing:"0.04em",boxShadow:"0 4px 16px rgba(200,168,75,0.3)"}}>
          Buy {item.name} →
        </button>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Marketplace() {
  const [tab,          setTab]          = useState("featured");
  const [username,     setUsername]     = useState(null);
  const [inventory,    setInventory]    = useState([]);
  const [buyingItem,   setBuyingItem]   = useState(null);
  const [previewItem,  setPreviewItem]  = useState(null);
  const [purchased,    setPurchased]    = useState(false);
  const { price, loading: priceLoading, tokensFor } = useTouchgrassPrice();

  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    if (u) {
      supabase.from("UserInventory").select("item_id,owned").eq("username",u).eq("owned",true)
        .then(({ data }) => setInventory((data??[]).map(r=>r.item_id)));
    }
  }, []);

  const isOwned = (itemId) => inventory.includes(itemId);

  const filteredItems = tab === "featured"
    ? CATALOGUE.filter(i => i.featured && i.status === "live")
    : CATALOGUE.filter(i => i.category === tab && i.status === "live");

  const comingSoonItems = tab === "featured"
    ? []
    : CATALOGUE.filter(i => i.category === tab && i.status === "coming_soon");

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
    input::placeholder{color:rgba(240,239,234,0.3);}
  `;

  return (
    <>
      <Head><title>Marketplace | Proof of Grass</title></Head>
      <style dangerouslySetInnerHTML={{ __html:css }} />

      <div style={{minHeight:"100vh",background:T.bg}}>

        {/* Nav */}
        <nav style={{
          position:"sticky",top:0,zIndex:100,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)",height:56,
          background:`${T.bg}ec`,backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}`,
        }}>
          <Link href="/" style={{display:"flex",alignItems:"center",gap:9,textDecoration:"none"}}>
            <img src="/touchgrass-transparent.png" alt="" style={{width:24,height:24,objectFit:"contain"}} />
            <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:16,fontWeight:700,color:T.white}}>
              Touch Grass
            </span>
          </Link>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {username && (
              <div style={{fontSize:12,color:T.dim}}>@{username}</div>
            )}
            <Link href="/" style={{fontSize:12,color:T.dim,textDecoration:"none"}}>← Dashboard</Link>
          </div>
        </nav>

        {/* Hero */}
        <div style={{
          background:`linear-gradient(135deg,rgba(200,168,75,0.08),rgba(147,168,90,0.04),transparent)`,
          borderBottom:`1px solid ${T.border}`,
          padding:"36px clamp(14px,4vw,48px) 28px",
        }}>
          <div style={{maxWidth:900,margin:"0 auto"}}>
            <div style={{fontSize:9,letterSpacing:"0.22em",textTransform:"uppercase",color:T.gold,marginBottom:8,fontWeight:700}}>
              Proof of Grass
            </div>
            <h1 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:"clamp(28px,5vw,48px)",fontWeight:700,color:T.white,
              lineHeight:1,marginBottom:10}}>
              Marketplace
            </h1>
            <p style={{fontSize:13,color:T.muted,maxWidth:480,lineHeight:1.7}}>
              Purchase exclusive proof styles, profile cosmetics, consumables, and collectibles using $TOUCHGRASS.
            </p>
            {/* Live price ticker */}
            <div style={{marginTop:16,display:"inline-flex",alignItems:"center",gap:8,
              background:"rgba(200,168,75,0.08)",border:`1px solid ${T.borderGold}`,
              borderRadius:20,padding:"6px 14px"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:T.gold,
                boxShadow:`0 0 8px ${T.gold}`,animation:"pulse 2s infinite"}} />
              {priceLoading
                ? <span style={{fontSize:11,color:T.dim}}>Fetching price…</span>
                : price
                  ? <span style={{fontSize:11,color:T.gold}}>1 $TOUCHGRASS = ${price.toFixed(8)}</span>
                  : <span style={{fontSize:11,color:T.dim}}>Price unavailable</span>
              }
            </div>
          </div>
        </div>

        <div style={{maxWidth:900,margin:"0 auto",padding:"24px clamp(14px,4vw,48px) 80px"}}>

          {/* Category tabs */}
          <div style={{display:"flex",gap:6,marginBottom:28,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
            {CATEGORIES.map(cat => (
              <button key={cat.id}
                onClick={() => !cat.comingSoon && setTab(cat.id)}
                style={{
                  padding:"9px 16px",borderRadius:9,border:"none",cursor:cat.comingSoon?"default":"pointer",
                  fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
                  letterSpacing:"0.04em",whiteSpace:"nowrap",flexShrink:0,
                  background:tab===cat.id ? T.olive : "rgba(255,255,255,0.04)",
                  color:tab===cat.id ? "#0a0c08" : cat.comingSoon ? T.dim : T.muted,
                  opacity:cat.comingSoon?0.5:1,
                  transition:"all 0.15s",
                }}>
                {cat.label}{cat.comingSoon?" ·coming soon":""}
              </button>
            ))}
          </div>

          {/* Consumables tab — redirect to existing burns page */}
          {tab === "consumables" && (
            <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16,padding:"32px",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:12}}>🛡</div>
              <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:700,color:T.white,marginBottom:8}}>
                Consumables
              </div>
              <div style={{fontSize:13,color:T.muted,lineHeight:1.7,marginBottom:20,maxWidth:360,margin:"0 auto 20px"}}>
                Streak Shields, Sunset Passes, and other consumables are available on the Consumables page.
              </div>
              <Link href="/burns" style={{display:"inline-flex",alignItems:"center",gap:8,
                background:T.olive,color:"#0a0c08",borderRadius:10,
                padding:"12px 24px",fontSize:13,fontWeight:700,textDecoration:"none",
                letterSpacing:"0.04em"}}>
                Go to Consumables →
              </Link>
            </div>
          )}

          {/* Item grid */}
          {tab !== "consumables" && filteredItems.length > 0 && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20,marginBottom:24}}>
              {filteredItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  tokensFor={tokensFor}
                  owned={isOwned(item.id)}
                  username={username}
                  onBuy={setBuyingItem}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {tab !== "consumables" && filteredItems.length === 0 && (
            <div style={{textAlign:"center",padding:"60px 0",color:T.dim}}>
              <div style={{fontSize:32,marginBottom:12}}>🔮</div>
              <div style={{fontSize:14,color:T.muted,marginBottom:6}}>Nothing here yet</div>
              <div style={{fontSize:12,color:T.dim}}>New items are added regularly. Check back soon.</div>
            </div>
          )}

          {/* Coming soon footer note */}
          {(tab === "cosmetics" || tab === "limited") && (
            <div style={{marginTop:24,padding:"20px",background:"rgba(200,168,75,0.04)",
              border:`1px solid ${T.borderGold}`,borderRadius:12,textAlign:"center"}}>
              <div style={{fontSize:12,color:T.gold,fontWeight:600,marginBottom:4}}>Coming Soon</div>
              <div style={{fontSize:11,color:T.dim,lineHeight:1.6}}>
                Profile cosmetics and limited editions are in development. Stay tuned.
              </div>
            </div>
          )}

          {/* Recently added / Featured bottom strip */}
          {tab === "featured" && (
            <div style={{marginTop:32,padding:"20px",background:T.bg2,
              border:`1px solid ${T.border}`,borderRadius:14,
              display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:T.white,marginBottom:3}}>More coming to the Marketplace</div>
                <div style={{fontSize:11,color:T.dim}}>Profile frames, animated styles, seasonal packs, and limited editions.</div>
              </div>
              <div style={{fontSize:10,color:T.dim,border:`1px solid ${T.border}`,
                borderRadius:20,padding:"4px 12px"}}>
                Follow @XTouchGrass for drops
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {buyingItem && (
        <PurchaseModal
          item={buyingItem}
          tokens={tokensFor(buyingItem.usdPrice)}
          price={price}
          username={username}
          onClose={() => setBuyingItem(null)}
          onSuccess={() => { setPurchased(true); }}
        />
      )}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onBuy={(item) => { setPreviewItem(null); setBuyingItem(item); }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1} 50%{opacity:0.4}
        }
      `}</style>
    </>
  );
}