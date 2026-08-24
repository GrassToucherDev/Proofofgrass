import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

// WalletPurchaseModal uses wallet adapter hooks — must be client-side only
const WalletPurchaseModal = dynamic(
  () => import("../components/WalletPurchaseModal"),
  { ssr: false }
);
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
const SUPABASE_URL = "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public";

const CATALOGUE = [
  {
    id:          "retro_covers_pack",
    name:        "Retro Covers Pack",
    category:    "cosmetics",
    status:      "live",
    featured:    true,
    usdPrice:    5.00,
    description: "Five exclusive retro-themed profile covers for your Proof of Grass profile. Purchasable only — not available through streak milestones.",
    covers: [
      { slug:"marketplace_retro_beach",     name:"Retro Beach",     emoji:"🏄", imageUrl:`${SUPABASE_URL}/covers/retro_beach.png`,     fallback:"linear-gradient(135deg,#001a2e,#003d5c,#56bef840)" },
      { slug:"marketplace_retro_mountain",  name:"Retro Mountain",  emoji:"⛰️",  imageUrl:`${SUPABASE_URL}/covers/retro_mountain.png`,  fallback:"linear-gradient(135deg,#0d0d14,#1a1a2e,#6a6aaa40)" },
      { slug:"marketplace_retro_sunflower", name:"Retro Sunflower", emoji:"🌻", imageUrl:`${SUPABASE_URL}/covers/retro_sunflower.png`, fallback:"linear-gradient(135deg,#1a1200,#3d2e00,#f5b94240)" },
      { slug:"marketplace_retro_waterfall", name:"Retro Waterfall", emoji:"💧", imageUrl:`${SUPABASE_URL}/covers/retro_waterfall.png`, fallback:"linear-gradient(135deg,#001a14,#00352a,#34d39940)" },
      { slug:"marketplace_retro_night",     name:"Retro Night",     emoji:"🌙", imageUrl:`${SUPABASE_URL}/covers/retro_night.png`,     fallback:"linear-gradient(135deg,#04040e,#0a0a1e,#a78bfa40)" },
    ],
    tags: ["Retro Beach","Retro Mountain","Retro Sunflower","Retro Waterfall","Retro Night"],
  },
  {
    id:          "anime_nature_pack",
    name:        "Anime Nature Pack",
    category:    "cosmetics",
    status:      "live",
    featured:    true,
    usdPrice:    5.00,
    description: "Five exclusive anime-inspired nature covers for your Proof of Grass profile. Each cover brings a unique Japanese aesthetic to your flex card and profile.",
    covers: [
      { slug:"marketplace_cherry_blossom", name:"Cherry Blossom", emoji:"🌸", imageUrl:`${SUPABASE_URL}/covers/cherry_blossom.png`, fallback:"linear-gradient(135deg,#1a0010,#3d0028,#ff9eb540)" },
      { slug:"marketplace_torii_forest",   name:"Torii Forest",   emoji:"⛩️",  imageUrl:`${SUPABASE_URL}/covers/torii_forest.png`,   fallback:"linear-gradient(135deg,#0d0a00,#2a1a00,#c8611b40)" },
      { slug:"marketplace_lake_sunrise",   name:"Lake Sunrise",   emoji:"🌅", imageUrl:`${SUPABASE_URL}/covers/lake_sunrise.png`,   fallback:"linear-gradient(135deg,#001018,#002030,#f4a26140)" },
      { slug:"marketplace_beach_coast",    name:"Beach Coast",    emoji:"🏖️",  imageUrl:`${SUPABASE_URL}/covers/beach_coast.png`,    fallback:"linear-gradient(135deg,#001824,#003040,#48cae440)" },
      { slug:"marketplace_city_view",      name:"City View",      emoji:"🌆", imageUrl:`${SUPABASE_URL}/covers/city_view.png`,      fallback:"linear-gradient(135deg,#06050e,#0e0c1e,#7b6ff040)" },
    ],
    tags: ["Cherry Blossom","Torii Forest","Lake Sunrise","Beach Coast","City View"],
  },
  {
    id:          "y2k_pack",
    name:        "Touch Grass Y2K",
    category:    "cosmetics",
    status:      "live",
    featured:    true,
    usdPrice:    5.00,
    description: "Five Y2K-inspired covers dripping in chrome, neon, and digital nostalgia. Take your profile back to the future.",
    covers: [
      { slug:"marketplace_chrome_meadow", name:"Chrome Meadow", emoji:"🪩", imageUrl:`${SUPABASE_URL}/covers/chrome_meadow.png`, fallback:"linear-gradient(135deg,#0a0a14,#1a1a2e,#c0c0ff40)" },
      { slug:"marketplace_aqua_coast",    name:"Aqua Coast",    emoji:"🌊", imageUrl:`${SUPABASE_URL}/covers/aqua_coast.png`,    fallback:"linear-gradient(135deg,#001a1a,#003030,#00ffff40)" },
      { slug:"marketplace_bubble_forest", name:"Bubble Forest", emoji:"🫧", imageUrl:`${SUPABASE_URL}/covers/bubble_forest.png`, fallback:"linear-gradient(135deg,#140020,#280040,#dd88ff40)" },
      { slug:"marketplace_dream_sky",     name:"Dream Sky",     emoji:"✨", imageUrl:`${SUPABASE_URL}/covers/dream_sky.png`,     fallback:"linear-gradient(135deg,#001428,#002050,#66aaff40)" },
      { slug:"marketplace_cyber_garden",  name:"Cyber Garden",  emoji:"🌿", imageUrl:`${SUPABASE_URL}/covers/cyber_garden.png`,  fallback:"linear-gradient(135deg,#001408,#002810,#00ff8840)" },
    ],
    tags: ["Chrome Meadow","Aqua Coast","Bubble Forest","Dream Sky","Cyber Garden"],
  },
  {
    id:          "trenches_pack",
    name:        "Touch Grass Trenches",
    category:    "cosmetics",
    status:      "live",
    featured:    true,
    usdPrice:    5.00,
    description: "Five covers for the battle-hardened crypto survivalist. From ATH highs to bear market lows — this pack tells the whole story.",
    covers: [
      { slug:"marketplace_ath_overlook",        name:"ATH Overlook",        emoji:"🚀", imageUrl:`${SUPABASE_URL}/covers/ath_overlook.png`,        fallback:"linear-gradient(135deg,#0a1400,#142800,#a8ff4440)" },
      { slug:"marketplace_rug_pull_ravine",     name:"Rug Pull Ravine",     emoji:"📉", imageUrl:`${SUPABASE_URL}/covers/rug_pull_ravine.png`,    fallback:"linear-gradient(135deg,#140000,#280000,#ff444440)" },
      { slug:"marketplace_bear_market_blizzard",name:"Bear Market Blizzard",emoji:"🐻", imageUrl:`${SUPABASE_URL}/covers/bear_market_blizzard.png`,fallback:"linear-gradient(135deg,#060810,#0c1020,#7799ff40)" },
      { slug:"marketplace_moonbag_camp",        name:"Moonbag Camp",        emoji:"🌕", imageUrl:`${SUPABASE_URL}/covers/moonbag_camp.png`,       fallback:"linear-gradient(135deg,#0a0800,#1e1400,#ffd70040)" },
      { slug:"marketplace_liquidity_lagoon",    name:"Liquidity Lagoon",    emoji:"💧", imageUrl:`${SUPABASE_URL}/covers/liquidity_lagoon.png`,   fallback:"linear-gradient(135deg,#001418,#002830,#00ddcc40)" },
    ],
    tags: ["ATH Overlook","Rug Pull Ravine","Bear Market Blizzard","Moonbag Camp","Liquidity Lagoon"],
  },
  {
    id:          "streak_shield",
    name:        "Streak Shield",
    category:    "utility",
    status:      "live",
    featured:    true,
    usdPrice:    5.00,
    description: "Miss a day without breaking your streak. A Shield automatically activates when you miss a submission, keeping your streak alive. Shields are stackable — stock up.",
    covers:      [],
    tags:        ["Shield","Streak Protection","Consumable"],
    emoji:       "🛡️",
    consumable:  true,
    consumable_type: "shield",
    quantity:    1,
  },
  {
    id:          "sunset_pass",
    name:        "Sunset Pass",
    category:    "utility",
    status:      "live",
    featured:    true,
    usdPrice:    2.50,
    description: "Extend your daily submission window by 2 hours. The day normally resets at midnight UTC — a Sunset Pass pushes your deadline to 2:00 AM UTC. Sunset Passes are stackable.",
    covers:      [],
    tags:        ["Sunset Pass","Extended Window","Consumable"],
    emoji:       "🌅",
    consumable:  true,
    consumable_type: "sunset_pass",
    quantity:    1,
  },
];

const CATEGORIES = [
  { id:"featured",        label:"🏪 Featured",          comingSoon:false },
  { id:"cosmetics",       label:"🎨 Cosmetics",          comingSoon:false },
  { id:"utility",         label:"🛡️ Utility",             comingSoon:false },
  { id:"premium_proofs",  label:"🖼 Premium Proofs",     comingSoon:true  },
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
  const isLive      = item.status === "live";
  const isConsumable = !!item.consumable;

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

      {/* Artwork — consumables show icon, covers show images, styles show swatches */}
      {item.consumable ? (
        <div style={{
          minHeight:160, background:`linear-gradient(135deg,${T.bg3},${T.bg2})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          flexDirection:"column", gap:12, position:"relative",
          border:`1px solid ${T.border}`, borderRadius:"0",
        }}>
          <div style={{
            fontSize:64,
            filter:"drop-shadow(0 0 20px rgba(200,168,75,0.3))",
          }}>{item.emoji}</div>
          <div style={{
            fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase",
            color:T.gold, fontWeight:700,
          }}>Consumable</div>
          <div style={{
            position:"absolute", bottom:12, left:0, right:0, textAlign:"center",
            fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:18, fontWeight:700, color:T.white,
          }}>{item.name}</div>
        </div>
      ) : item.covers ? (
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:2, background:T.bg3, minHeight:160, position:"relative",
          overflow:"hidden", borderRadius:"0",
        }}>
          {item.covers.slice(0,4).map((c,i) => (
            <div key={c.slug} style={{
              position:"relative", overflow:"hidden",
              minHeight:80,
              background:c.fallback,
            }}>
              <img src={c.imageUrl} alt={c.name}
                style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}
                onError={e => { e.target.style.display="none"; }} />
            </div>
          ))}
          <div style={{
            position:"absolute", inset:0,
            background:"linear-gradient(180deg,transparent 40%,rgba(8,10,6,0.92))",
            pointerEvents:"none",
          }} />
          <div style={{
            position:"absolute", bottom:12, left:0, right:0, textAlign:"center",
            fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:18, fontWeight:700, color:T.white, letterSpacing:"0.04em",
          }}>{item.name}</div>
          {item.covers.length > 4 && (
            <div style={{
              position:"absolute", bottom:12, right:14,
              fontSize:10, color:T.muted,
            }}>+{item.covers.length - 4} more</div>
          )}
        </div>
      ) : item.covers && item.covers.length === 0 ? null
      : item.styles && (
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


// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ item, onClose, onBuy }) {
  const [idx, setIdx] = useState(0);
  const isCovers = !!item.covers;
  const items    = isCovers ? item.covers : (item.styles ?? []);
  const current  = items[idx];

  return (
    <>
      <div onClick={onClose}
        style={{position:"fixed",inset:0,zIndex:998,background:"rgba(0,0,0,0.80)",backdropFilter:"blur(4px)"}} />
      <div style={{
        position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        zIndex:999,width:"min(480px,94vw)",maxHeight:"90vh",overflowY:"auto",
        background:T.bg2,border:`1px solid ${T.border}`,
        borderRadius:20,padding:"24px",
        boxShadow:"0 24px 80px rgba(0,0,0,0.8)",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:20,fontWeight:700,color:T.white}}>
            {isCovers ? "Preview Covers" : "Preview Styles"}
          </div>
          <button onClick={onClose}
            style={{background:"none",border:`1px solid ${T.border}`,color:T.dim,
              borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>

        {/* Big preview area */}
        {isCovers ? (
          <div style={{
            width:"100%",aspectRatio:"16/9",borderRadius:14,marginBottom:16,
            position:"relative",overflow:"hidden",
            background:current?.fallback ?? T.bg3,
            border:`1px solid ${T.borderGold}`,
            boxShadow:"0 0 32px rgba(200,168,75,0.15)",
          }}>
            <img src={current?.imageUrl} alt={current?.name}
              style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}
              onError={e => { e.target.style.display="none"; }} />
            <div style={{
              position:"absolute",inset:0,
              background:"linear-gradient(180deg,transparent 50%,rgba(8,10,6,0.85))",
            }} />
            <div style={{
              position:"absolute",bottom:14,left:0,right:0,textAlign:"center",
              fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:20,fontWeight:700,color:T.white,letterSpacing:"0.04em",
              textShadow:"0 2px 12px rgba(0,0,0,0.9)",
            }}>{current?.name}</div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,textAlign:"center",
              fontSize:10,color:"rgba(255,255,255,0.4)",paddingBottom:6}}>
              Profile Cover Preview
            </div>
          </div>
        ) : (
          <div style={{
            width:"100%", aspectRatio:"16/9", borderRadius:14, marginBottom:16,
            background:`linear-gradient(135deg,${current?.bgOverlay ?? "rgba(0,0,0,0.5)"},rgba(0,0,0,0.7))`,
            border:`2px solid ${current?.border ?? T.border}`,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:12, position:"relative", overflow:"hidden",
            boxShadow:`0 0 40px ${current?.accent ?? T.olive}20`,
          }}>
            <div style={{fontSize:64}}>{current?.emoji}</div>
            <div style={{
              fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:22, fontWeight:700, color:current?.accent ?? T.white,
              letterSpacing:"0.04em", textShadow:"0 2px 12px rgba(0,0,0,0.8)",
            }}>{current?.name}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Proof of Grass · Profile Style</div>
          </div>
        )}

        {/* Thumbnail selector */}
        <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",scrollbarWidth:"none"}}>
          {items.map((it,i) => (
            isCovers ? (
              <button key={it.slug ?? it.id} onClick={() => setIdx(i)}
                style={{
                  flexShrink:0,width:72,height:48,borderRadius:8,cursor:"pointer",
                  border:`2px solid ${i===idx ? T.gold : "rgba(255,255,255,0.1)"}`,
                  background:it.fallback,overflow:"hidden",position:"relative",padding:0,
                  boxShadow:i===idx?`0 0 12px rgba(200,168,75,0.4)`:"none",
                  transition:"all 0.15s",
                }}>
                <img src={it.imageUrl} alt={it.name}
                  style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}
                  onError={e => { e.target.style.display="none"; }} />
              </button>
            ) : (
              <StyleSwatch key={it.id} style={it} selected={i===idx} onClick={() => setIdx(i)} />
            )
          ))}
        </div>

        <div style={{fontSize:10,color:T.dim,textAlign:"center",marginBottom:16}}>
          Preview only · Purchase to unlock for your profile
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
  const [walletSuccess, setWalletSuccess] = useState(null); // { signature, unlockedCovers }
  const { price, loading: priceLoading, tokensFor } = useTouchgrassPrice();

  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    if (u) {
      supabase.from("UserInventory").select("item_id,owned").eq("username",u).eq("owned",true)
        .then(({ data }) => setInventory((data??[]).map(r=>r.item_id)));
    }
  }, []);

  const isOwned = (itemId) => {
    const item = CATALOGUE.find(c => c.id === itemId);
    if (item?.consumable) return false; // consumables can always be repurchased
    return inventory.includes(itemId);
  };

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
          {tab === "utility" && (
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
          {tab !== "utility" && filteredItems.length > 0 && (
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
          {tab !== "utility" && filteredItems.length === 0 && (
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
        <WalletPurchaseModal
          item={buyingItem}
          tokens={tokensFor(buyingItem.usdPrice)}
          price={price}
          username={username}
          onClose={() => setBuyingItem(null)}
          onSuccess={(data) => {
            setPurchased(true);
            setWalletSuccess(data);
            setBuyingItem(null);
            // Refresh inventory so "Owned" badge shows immediately
            if (username) {
              supabase.from("UserInventory").select("item_id,owned").eq("username",username).eq("owned",true)
                .then(({ data: inv }) => setInventory((inv??[]).map(r=>r.item_id)));
            }
          }}
        />
      )}

      {/* Success toast */}
      {walletSuccess && (
        <div style={{
          position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",
          zIndex:9999,background:"#0e100b",border:"1px solid rgba(147,168,90,0.4)",
          borderRadius:14,padding:"14px 20px",
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
          display:"flex",alignItems:"center",gap:12,
          maxWidth:"min(420px,90vw)",
          animation:"slideUp 0.3s ease",
        }}>
          <span style={{fontSize:22}}>🎉</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#f0efea",marginBottom:2}}>
              Purchase complete — instantly unlocked!
            </div>
            <div style={{fontSize:11,color:"rgba(240,239,234,0.5)"}}>
              Visit your profile to equip your new items.
            </div>
          </div>
          <button onClick={() => setWalletSuccess(null)}
            style={{background:"none",border:"none",color:"rgba(240,239,234,0.3)",
              cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>
        </div>
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