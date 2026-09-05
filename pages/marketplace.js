// pages/marketplace.js — V2 Marketplace (Mockup Match)
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
const WalletPurchaseModal = dynamic(() => import("../components/WalletPurchaseModal"), { ssr:false });
import Link from "next/link";
import Head from "next/head";
import { supabase } from "../utils/supabase";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";
const BURN_ADDR       = "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";
const TOUCHGRASS_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const SUPABASE_URL    = "https://fndhqtnsdqlyedpwecys.supabase.co/storage/v1/object/public";
// ── Catalogue ─────────────────────────────────────────────────────────────────
const CATALOGUE = [
  {
    id:"retro_covers_pack", name:"Retro Vibes Pack", category:"cosmetics",
    status:"live", featured:true, usdPrice:5.00,
    description:"Five exclusive retro-themed profile covers for your Proof of Grass profile. Purchasable only — not available through streak milestones.",
    covers:[
      { slug:"marketplace_retro_beach",     name:"Retro Beach",     emoji:"🏄", imageUrl:`${SUPABASE_URL}/covers/retro_beach.png`,     fallback:"linear-gradient(135deg,#001a2e,#003d5c,#56bef840)" },
      { slug:"marketplace_retro_mountain",  name:"Retro Mountain",  emoji:"⛰️",  imageUrl:`${SUPABASE_URL}/covers/retro_mountain.png`,  fallback:"linear-gradient(135deg,#0d0d14,#1a1a2e,#6a6aaa40)" },
      { slug:"marketplace_retro_sunflower", name:"Retro Sunflower", emoji:"🌻", imageUrl:`${SUPABASE_URL}/covers/retro_sunflower.png`, fallback:"linear-gradient(135deg,#1a1200,#3d2e00,#f5b94240)" },
      { slug:"marketplace_retro_waterfall", name:"Retro Waterfall", emoji:"💧", imageUrl:`${SUPABASE_URL}/covers/retro_waterfall.png`, fallback:"linear-gradient(135deg,#001a14,#00352a,#34d39940)" },
      { slug:"marketplace_retro_night",     name:"Retro Night",     emoji:"🌙", imageUrl:`${SUPABASE_URL}/covers/retro_night.png`,     fallback:"linear-gradient(135deg,#04040e,#0a0a1e,#a78bfa40)" },
    ],
    tags:["Retro Beach","Retro Mountain","Retro Sunflower","Retro Waterfall","Retro Night"],
  },
  {
    id:"anime_nature_pack", name:"Anime Outdoors", category:"cosmetics",
    status:"live", featured:false, usdPrice:5.00,
    description:"Five anime-inspired nature covers bringing Japanese aesthetics to your Proof of Grass profile.",
    covers:[
      { slug:"marketplace_cherry_blossom", name:"Cherry Blossom", emoji:"🌸", imageUrl:`${SUPABASE_URL}/covers/cherry_blossom.png`, fallback:"linear-gradient(135deg,#1a0010,#3d0028,#ff9eb540)" },
      { slug:"marketplace_torii_forest",   name:"Torii Forest",   emoji:"⛩️",  imageUrl:`${SUPABASE_URL}/covers/torii_forest.png`,   fallback:"linear-gradient(135deg,#0d0a00,#2a1a00,#c8611b40)" },
      { slug:"marketplace_lake_sunrise",   name:"Lake Sunrise",   emoji:"🌅", imageUrl:`${SUPABASE_URL}/covers/lake_sunrise.png`,   fallback:"linear-gradient(135deg,#001018,#002030,#f4a26140)" },
      { slug:"marketplace_beach_coast",    name:"Beach Coast",    emoji:"🏖️",  imageUrl:`${SUPABASE_URL}/covers/beach_coast.png`,    fallback:"linear-gradient(135deg,#001824,#003040,#48cae440)" },
      { slug:"marketplace_city_view",      name:"City View",      emoji:"🌆", imageUrl:`${SUPABASE_URL}/covers/city_view.png`,      fallback:"linear-gradient(135deg,#06050e,#0e0c1e,#7b6ff040)" },
    ],
    tags:["Cherry Blossom","Torii Forest","Lake Sunrise","Beach Coast","City View"],
  },
  {
    id:"y2k_pack", name:"Y2K Outdoors", category:"cosmetics",
    status:"live", featured:false, usdPrice:5.00,
    description:"Five Y2K-inspired covers dripping in chrome, neon, and digital nostalgia.",
    covers:[
      { slug:"marketplace_chrome_meadow", name:"Chrome Meadow", emoji:"🪩", imageUrl:`${SUPABASE_URL}/covers/chrome_meadow.png`, fallback:"linear-gradient(135deg,#0a0a14,#1a1a2e,#c0c0ff40)" },
      { slug:"marketplace_aqua_coast",    name:"Aqua Coast",    emoji:"🌊", imageUrl:`${SUPABASE_URL}/covers/aqua_coast.png`,    fallback:"linear-gradient(135deg,#001a1a,#003030,#00ffff40)" },
      { slug:"marketplace_bubble_forest", name:"Bubble Forest", emoji:"🫧", imageUrl:`${SUPABASE_URL}/covers/bubble_forest.png`, fallback:"linear-gradient(135deg,#140020,#280040,#dd88ff40)" },
      { slug:"marketplace_dream_sky",     name:"Dream Sky",     emoji:"✨", imageUrl:`${SUPABASE_URL}/covers/dream_sky.png`,     fallback:"linear-gradient(135deg,#001428,#002050,#66aaff40)" },
      { slug:"marketplace_cyber_garden",  name:"Cyber Garden",  emoji:"🌿", imageUrl:`${SUPABASE_URL}/covers/cyber_garden.png`,  fallback:"linear-gradient(135deg,#001408,#002810,#00ff8840)" },
    ],
    tags:["Chrome Meadow","Aqua Coast","Bubble Forest","Dream Sky","Cyber Garden"],
  },
  {
    id:"trenches_pack", name:"The Trenches", category:"cosmetics",
    status:"live", featured:false, usdPrice:5.00,
    description:"Five covers for the battle-hardened crypto survivalist. From ATH highs to bear market lows.",
    covers:[
      { slug:"marketplace_ath_overlook",         name:"ATH Overlook",         emoji:"🚀", imageUrl:`${SUPABASE_URL}/covers/ath_overlook.png`,         fallback:"linear-gradient(135deg,#0a1400,#142800,#a8ff4440)" },
      { slug:"marketplace_rug_pull_ravine",      name:"Rug Pull Ravine",      emoji:"📉", imageUrl:`${SUPABASE_URL}/covers/rug_pull_ravine.png`,      fallback:"linear-gradient(135deg,#140000,#280000,#ff444440)" },
      { slug:"marketplace_bear_market_blizzard", name:"Bear Market Blizzard", emoji:"🐻", imageUrl:`${SUPABASE_URL}/covers/bear_market_blizzard.png`, fallback:"linear-gradient(135deg,#060810,#0c1020,#7799ff40)" },
      { slug:"marketplace_moonbag_camp",         name:"Moonbag Camp",         emoji:"🌕", imageUrl:`${SUPABASE_URL}/covers/moonbag_camp.png`,         fallback:"linear-gradient(135deg,#0a0800,#1e1400,#ffd70040)" },
      { slug:"marketplace_liquidity_lagoon",     name:"Liquidity Lagoon",     emoji:"💧", imageUrl:`${SUPABASE_URL}/covers/liquidity_lagoon.png`,     fallback:"linear-gradient(135deg,#001418,#002830,#00ddcc40)" },
    ],
    tags:["ATH Overlook","Rug Pull Ravine","Bear Market Blizzard","Moonbag Camp","Liquidity Lagoon"],
  },
  {
    id:"streak_shield", name:"Streak Shield", category:"utility",
    status:"live", featured:false, usdPrice:5.00,
    description:"Miss a day without breaking your streak. Shields are stackable — stock up.",
    covers:[], tags:["Streak Protection","Stackable"],
    emoji:"🛡️", consumable:true, consumable_type:"shield", quantity:1,
  },
  {
    id:"sunset_pass", name:"Sunset Pass", category:"utility",
    status:"live", featured:false, usdPrice:2.50,
    description:"Extend your daily submission window by 2 hours — from midnight to 2:00 AM UTC.",
    covers:[], tags:["Extended Window","Stackable"],
    emoji:"🌅", consumable:true, consumable_type:"sunset_pass", quantity:1,
  },
];
const CATEGORIES = [
  { id:"featured",   label:"⭐ Featured",     icon:"⭐" },
  { id:"cosmetics",  label:"🎨 Cosmetics",    icon:"🎨" },
  { id:"utility",    label:"⚡ Utility",      icon:"⚡" },
  { id:"proofstyle", label:"🎭 Proof Styles", icon:"🎭", comingSoon:true },
  { id:"limited",    label:"💎 Collectibles", icon:"💎", comingSoon:true },
];
function getUsername() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem("pog_username")?.replace(/@/g,"").toLowerCase().trim()||null; }
  catch { return null; }
}
function buildSolanaPayUrl(amount) {
  const params = new URLSearchParams({ amount:String(Math.round(amount)), "spl-token":TOUCHGRASS_MINT, label:"Proof of Grass Marketplace", memo:"marketplace" });
  return `solana:${BURN_ADDR}?${params.toString()}`;
}
// ── Price hook ─────────────────────────────────────────────────────────────────
function useTouchgrassPrice() {
  const [price,   setPrice]   = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const fetch_ = useCallback(async()=>{
    try {
      const r = await fetch("/api/touchgrass-price");
      const d = await r.json();
      if(d.price>0) setPrice(d.price);
    } catch {}
    setLoading(false);
  },[]);
  useEffect(()=>{
    fetch_();
    timerRef.current = setInterval(fetch_,60000);
    return ()=>clearInterval(timerRef.current);
  },[fetch_]);
  const tokensFor = (usd)=>price>0?Math.round(usd/price):null;
  return { price, loading, tokensFor };
}
// ── Activity ticker ────────────────────────────────────────────────────────────
function ActivityTicker() {
  const items = [
    { avatar:"🌿", name:"MeadowMind",   action:"bought",  item:"Retro Vibes Pack", time:"2m ago"  },
    { avatar:"☀️",  name:"SunWalker",    action:"applied", item:"Retro Mountain",   time:"5m ago"  },
    { avatar:"🏔️", name:"TrailBlazer",  action:"bought",  item:"Anime Outdoors",   time:"8m ago"  },
    { avatar:"🌱", name:"GrassRunner",  action:"bought",  item:"Streak Shield",    time:"12m ago" },
    { avatar:"💧", name:"StreamSeeker", action:"applied", item:"Cherry Blossom",   time:"15m ago" },
  ];
  return (
    <div style={{ background:"white", borderBottom:`1px solid ${V2.borderSoft}`,
      padding:"10px clamp(14px,4vw,40px)", display:"flex", alignItems:"center", gap:16,
      overflowX:"auto", scrollbarWidth:"none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:V2.grassGreen,
          boxShadow:`0 0 8px ${V2.grassGreen}` }} />
        <span style={{ fontSize:11, fontWeight:700, color:V2.grassGreen, whiteSpace:"nowrap" }}>Live Activity</span>
      </div>
      {items.map((item,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0,
          padding:"6px 12px", background:"rgba(125,200,50,0.06)", borderRadius:20,
          border:`1px solid ${V2.borderSoft}` }}>
          <span style={{ fontSize:16 }}>{item.avatar}</span>
          <div>
            <span style={{ fontSize:11, fontWeight:700, color:V2.forestGreen }}>{item.name}</span>
            <span style={{ fontSize:11, color:V2.midGray }}> {item.action} </span>
            <span style={{ fontSize:11, fontWeight:600, color:V2.grassGreen }}>{item.item}</span>
          </div>
          <span style={{ fontSize:10, color:V2.midGray, marginLeft:4 }}>{item.time}</span>
        </div>
      ))}
    </div>
  );
}
// ── Featured pack card ─────────────────────────────────────────────────────────
function FeaturedPackCard({ item, tokensFor, owned, onBuy, onPreview }) {
  const tokens = tokensFor(item.usdPrice);
  return (
    <div style={{ background:"white", borderRadius:20, overflow:"hidden",
      boxShadow:"0 4px 24px rgba(26,74,10,0.10)", border:`1px solid ${V2.borderSoft}`,
      marginBottom:24, position:"relative" }}>
      <div style={{ position:"absolute", top:16, left:16, zIndex:10,
        background:V2.grassGreen, color:"white", fontSize:10, fontWeight:800,
        letterSpacing:"0.12em", textTransform:"uppercase",
        borderRadius:20, padding:"4px 12px", boxShadow:"0 2px 8px rgba(125,200,50,0.4)" }}>
        ✦ FEATURED
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${item.covers.length},1fr)`, height:220 }}>
        {item.covers.map((cover,i)=>(
          <div key={i} style={{ position:"relative", background:cover.fallback, overflow:"hidden" }}>
            <img src={cover.imageUrl} alt={cover.name} loading={i===0?"eager":"lazy"}
              style={{ width:"100%", height:"100%", objectFit:"cover" }}
              onError={e=>{e.currentTarget.style.display="none";}} />
          </div>
        ))}
      </div>
      <div style={{ padding:"20px 24px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          gap:16, flexWrap:"wrap", marginBottom:12 }}>
          <div>
            <h2 style={{ fontFamily:V2.fontSans, fontSize:22, fontWeight:800,
              color:V2.forestGreen, marginBottom:6 }}>{item.name} ✨</h2>
            <p style={{ fontSize:13, color:V2.textMuted, lineHeight:1.6, maxWidth:420 }}>{item.description}</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
          {item.tags.map(t=>(
            <span key={t} style={{ fontSize:11, color:V2.forestGreen,
              background:"rgba(200,220,190,0.3)", border:`1px solid ${V2.borderSoft}`,
              borderRadius:20, padding:"3px 12px" }}>{t}</span>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap",
          paddingTop:16, borderTop:`1px solid ${V2.borderSoft}` }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em",
              textTransform:"uppercase", color:V2.midGray, marginBottom:3 }}>Price</div>
            <div style={{ fontFamily:V2.fontSerif, fontSize:28, fontWeight:700,
              color:V2.forestGreen, lineHeight:1 }}>
              ${item.usdPrice.toFixed(2)} <span style={{ fontSize:14, fontWeight:400, color:V2.midGray }}>USD</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em",
              textTransform:"uppercase", color:V2.midGray, marginBottom:3 }}>You Pay</div>
            <div style={{ fontSize:18, fontWeight:700, color:V2.gold }}>
              {tokens?`≈ ${tokens.toLocaleString()} $TOUCHGRASS`:"Loading price…"}
            </div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
            <button onClick={()=>onPreview(item)}
              style={{ padding:"12px 20px", borderRadius:12, border:`1.5px solid ${V2.borderSoft}`,
                background:"transparent", color:V2.forestGreen, fontSize:13, fontWeight:600,
                cursor:"pointer", fontFamily:V2.fontSans }}>Preview</button>
            {owned ? (
              <div style={{ padding:"12px 24px", borderRadius:12,
                background:"rgba(125,200,50,0.1)", border:`1.5px solid ${V2.borderGreen}`,
                color:V2.grassGreen, fontSize:13, fontWeight:700,
                display:"flex", alignItems:"center", gap:6 }}>✓ Owned</div>
            ) : (
              <button onClick={()=>onBuy(item)}
                style={{ ...V2Styles.btnPrimary, fontSize:14, padding:"12px 28px", borderRadius:12 }}>
                🛍 Buy Pack
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// ── Pack grid card ─────────────────────────────────────────────────────────────
function PackCard({ item, tokensFor, owned, onBuy, onPreview, isNew }) {
  const tokens = tokensFor(item.usdPrice);
  const heroImg = item.covers?.[0];
  const isConsumable = !!item.consumable;
  return (
    <div style={{ background:"white", borderRadius:16, overflow:"hidden",
      boxShadow:"0 2px 16px rgba(26,74,10,0.08)", border:`1px solid ${V2.borderSoft}`,
      cursor:"pointer", transition:"all 0.2s", position:"relative" }}
      onClick={()=>!isConsumable&&onPreview(item)}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(26,74,10,0.14)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 16px rgba(26,74,10,0.08)";}}>
      {isNew && (
        <div style={{ position:"absolute", top:10, left:10, zIndex:10,
          background:V2.grassGreen, color:"white", fontSize:9, fontWeight:800,
          letterSpacing:"0.1em", borderRadius:20, padding:"3px 10px" }}>NEW</div>
      )}
      {isConsumable ? (
        <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center",
          background:`linear-gradient(135deg,${V2.skyBlue},${V2.cloudSoft})`, fontSize:64 }}>
          {item.emoji}
        </div>
      ) : (
        <div style={{ height:160, background:heroImg?.fallback||V2.gradientHero, overflow:"hidden" }}>
          {heroImg?.imageUrl && (
            <img src={heroImg.imageUrl} alt={item.name} loading="lazy"
              style={{ width:"100%", height:"100%", objectFit:"cover" }}
              onError={e=>{e.currentTarget.style.display="none";}} />
          )}
        </div>
      )}
      <div style={{ padding:"14px 16px", display:"flex", alignItems:"center",
        justifyContent:"space-between", gap:8 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:V2.forestGreen,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>
            {item.name} ✨
          </div>
          <div style={{ fontSize:11, color:V2.midGray }}>
            {isConsumable?"Consumable":`${item.covers?.length||0} Covers`}
          </div>
        </div>
        <div style={{ flexShrink:0 }}>
          {owned ? (
            <div style={{ fontSize:11, fontWeight:700, color:V2.grassGreen,
              background:"rgba(125,200,50,0.1)", borderRadius:20, padding:"4px 12px" }}>Owned ✓</div>
          ) : (
            <button onClick={e=>{e.stopPropagation();onBuy(item);}}
              style={{ fontSize:13, fontWeight:700, color:V2.grassGreen,
                background:"rgba(125,200,50,0.1)", border:`1.5px solid ${V2.borderGreen}`,
                borderRadius:20, padding:"6px 14px", cursor:"pointer", fontFamily:V2.fontSans,
                whiteSpace:"nowrap" }}>
              ${item.usdPrice.toFixed(2)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
// ── Your Flex panel ────────────────────────────────────────────────────────────
function YourFlexPanel({ username, inventory }) {
  if (!username || !inventory.length) return null;
  const ownedPacks = CATALOGUE.filter(c=>inventory.includes(c.id)&&!c.consumable);
  if (!ownedPacks.length) return null;
  return (
    <div style={{ background:"white", borderRadius:16, border:`1px solid ${V2.borderSoft}`,
      boxShadow:"0 2px 16px rgba(26,74,10,0.08)", padding:"20px 24px", marginTop:32 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:18 }}>🌿</span>
            <span style={{ fontSize:14, fontWeight:800, color:V2.forestGreen }}>Your Flex</span>
          </div>
          <div style={{ fontSize:12, color:V2.midGray }}>Your currently applied cosmetics &amp; proof style.</div>
        </div>
        <Link href={`/u/${username}`}
          style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600,
            color:V2.grassGreen, textDecoration:"none",
            padding:"8px 14px", borderRadius:20, border:`1px solid ${V2.borderGreen}`,
            background:"rgba(125,200,50,0.06)" }}>
          View Profile ›
        </Link>
      </div>
      <div style={{ display:"flex", gap:16, overflowX:"auto", paddingBottom:8, scrollbarWidth:"none" }}>
        {ownedPacks.flatMap(p=>p.covers).slice(0,6).map((cover,i)=>(
          <div key={i} style={{ flexShrink:0, textAlign:"center" }}>
            <div style={{ width:72, height:72, borderRadius:16, overflow:"hidden",
              background:cover.fallback, border:`2px solid ${V2.borderGreen}`,
              marginBottom:6, position:"relative" }}>
              <img src={cover.imageUrl} alt={cover.name} loading="lazy"
                style={{ width:"100%", height:"100%", objectFit:"cover" }}
                onError={e=>{e.currentTarget.style.display="none";}} />
              <div style={{ position:"absolute", top:4, right:4, width:16, height:16,
                borderRadius:"50%", background:V2.grassGreen,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:9, color:"white" }}>✓</div>
            </div>
            <div style={{ fontSize:9, fontWeight:600, color:V2.forestGreen, lineHeight:1.3 }}>
              {cover.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// ── Preview modal ──────────────────────────────────────────────────────────────
function PreviewModal({ item, onClose, onBuy, tokensFor, owned }) {
  const [idx, setIdx] = useState(0);
  const tokens = tokensFor(item.usdPrice);
  if (!item) return null;
  const covers = item.covers||[];
  const current = covers[idx];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300,
      background:"rgba(0,0,0,0.55)", backdropFilter:"blur(10px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div style={{ background:"white", borderRadius:24, overflow:"hidden",
        maxWidth:560, width:"100%", maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 20px 60px rgba(26,74,10,0.2)" }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ height:280, position:"relative", background:current?.fallback||V2.gradientHero }}>
          {current?.imageUrl && (
            <img src={current.imageUrl} alt={current?.name||item.name}
              style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          )}
          <button onClick={onClose}
            style={{ position:"absolute", top:12, right:12, width:36, height:36,
              borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.92)",
              cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
              justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>×</button>
          {current?.name && (
            <div style={{ position:"absolute", bottom:12, left:12,
              background:"rgba(255,255,255,0.9)", borderRadius:20, padding:"4px 12px",
              fontSize:11, fontWeight:700, color:V2.forestGreen }}>{current.name}</div>
          )}
        </div>
        {covers.length>1 && (
          <div style={{ display:"flex", gap:8, padding:"12px 16px",
            overflowX:"auto", borderBottom:`1px solid ${V2.borderSoft}`, scrollbarWidth:"none" }}>
            {covers.map((c,i)=>(
              <div key={i} onClick={()=>setIdx(i)}
                style={{ width:60, height:40, borderRadius:8, overflow:"hidden", flexShrink:0,
                  border:`2px solid ${i===idx?V2.grassGreen:V2.borderSoft}`,
                  cursor:"pointer", background:c.fallback, transition:"border-color 0.15s" }}>
                <img src={c.imageUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                  onError={e=>{e.currentTarget.style.display="none";}} />
              </div>
            ))}
          </div>
        )}
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:20, fontWeight:800, color:V2.forestGreen, marginBottom:6 }}>
            {item.name} ✨
          </div>
          <p style={{ fontSize:13, color:V2.textBody, lineHeight:1.6, marginBottom:16 }}>
            {item.description}
          </p>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"14px 0", borderTop:`1px solid ${V2.borderSoft}`, marginBottom:16 }}>
            <div>
              <div style={{ fontSize:9, color:V2.midGray, textTransform:"uppercase",
                letterSpacing:"0.1em", marginBottom:2 }}>Price</div>
              <div style={{ fontFamily:V2.fontSerif, fontSize:24, fontWeight:700, color:V2.forestGreen }}>
                ${item.usdPrice.toFixed(2)} <span style={{ fontSize:12, color:V2.midGray }}>USD</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize:9, color:V2.midGray, textTransform:"uppercase",
                letterSpacing:"0.1em", marginBottom:2 }}>You Pay</div>
              <div style={{ fontSize:16, fontWeight:700, color:V2.gold }}>
                {tokens?`≈ ${tokens.toLocaleString()} $TG`:"—"}
              </div>
            </div>
          </div>
          {owned ? (
            <div style={{ width:"100%", padding:"13px", borderRadius:12, textAlign:"center",
              background:"rgba(125,200,50,0.1)", border:`1.5px solid ${V2.borderGreen}`,
              color:V2.grassGreen, fontSize:13, fontWeight:700 }}>✓ Already in your collection</div>
          ) : (
            <button onClick={()=>{onClose();onBuy(item);}}
              style={{ ...V2Styles.btnPrimary, width:"100%", justifyContent:"center",
                fontSize:14, padding:"14px", borderRadius:12 }}>
              🛍 Buy Pack — ${item.usdPrice.toFixed(2)} USD →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
// ── Burn Stats ─────────────────────────────────────────────────────────────────
function BurnStats() {
  const [totalSpent,  setTotalSpent]  = useState(null);
  const [totalOrders, setTotalOrders] = useState(null);
  const [loading,     setLoading]     = useState(true);
  useEffect(()=>{
    supabase.from("UserInventory")
      .select("tokens_spent", { count:"exact" })
      .eq("owned", true)
      .then(({ data, count }) => {
        const total = (data||[]).reduce((s,r)=>s+(parseFloat(r.tokens_spent)||0), 0);
        setTotalSpent(total);
        setTotalOrders(count||0);
        setLoading(false);
      }).catch(()=>setLoading(false));
  },[]);
  const fmt = (n) => {
    if (n == null) return "—";
    if (n >= 1000000) return (n/1000000).toFixed(2)+"M";
    if (n >= 1000)    return (n/1000).toFixed(1)+"K";
    return Math.round(n).toLocaleString();
  };
  return (
    <div style={{ background:"rgba(125,200,50,0.06)", border:"1px solid rgba(125,200,50,0.2)",
      borderRadius:16, padding:"20px 24px", marginTop:32,
      display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <img src="/touchgrass-transparent.png" alt="" style={{ width:28, height:28, objectFit:"contain" }} />
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:V2.grassGreen }}>
            $TOUCHGRASS Used for Purchases
          </div>
          <div style={{ fontSize:11, color:V2.midGray }}>All-time marketplace activity</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:24, flexWrap:"wrap", marginLeft:"auto" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em",
            textTransform:"uppercase", color:V2.midGray, marginBottom:4 }}>
            Total $TOUCHGRASS Spent
          </div>
          <div style={{ fontFamily:V2.fontSerif, fontSize:24, fontWeight:700, color:V2.forestGreen }}>
            {loading ? "…" : fmt(totalSpent)}
          </div>
        </div>
        <div style={{ width:1, background:"rgba(200,220,190,0.4)", alignSelf:"stretch" }} />
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em",
            textTransform:"uppercase", color:V2.midGray, marginBottom:4 }}>
            Total Orders
          </div>
          <div style={{ fontFamily:V2.fontSerif, fontSize:24, fontWeight:700, color:V2.forestGreen }}>
            {loading ? "…" : totalOrders ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
// ── Main Marketplace ───────────────────────────────────────────────────────────
export default function Marketplace() {
  const [tab,          setTab]          = useState("featured");
  const [username,     setUsername]     = useState(null);
  const [inventory,    setInventory]    = useState([]);
  const [buyingItem,   setBuyingItem]   = useState(null);
  const [previewItem,  setPreviewItem]  = useState(null);
  const [purchased,    setPurchased]    = useState(false);
  const [walletSuccess,setWalletSuccess]= useState(null);
  const { price, loading:priceLoading, tokensFor } = useTouchgrassPrice();
  useEffect(()=>{
    const u = getUsername();
    setUsername(u);
    if(u){
      supabase.from("UserInventory").select("item_id,owned").eq("username",u).eq("owned",true)
        .then(({data})=>setInventory((data??[]).map(r=>r.item_id)));
    }
  },[]);
  const isOwned = (itemId)=>{
    const item = CATALOGUE.find(c=>c.id===itemId);
    if(item?.consumable) return false;
    return inventory.includes(itemId);
  };
  const featuredPack   = CATALOGUE.find(c=>c.featured&&c.status==="live"&&!c.consumable);
  const otherCosmetics = CATALOGUE.filter(c=>c.category==="cosmetics"&&c.status==="live"&&c.id!==featuredPack?.id);
  const utilityItems   = CATALOGUE.filter(c=>c.category==="utility"&&c.status==="live");
  const filteredItems  = tab==="featured"
    ? CATALOGUE.filter(c=>c.status==="live")
    : tab==="owned"
      ? CATALOGUE.filter(c=>isOwned(c.id))
      : CATALOGUE.filter(c=>c.category===tab&&c.status==="live");
  const css = V2GlobalCSS + `
    .mp-tab { padding:10px 18px; border-radius:20px; border:1.5px solid ${V2.borderSoft};
      font-family:${V2.fontSans}; font-size:13px; font-weight:600; cursor:pointer;
      transition:all 0.15s; white-space:nowrap; background:white; color:${V2.forestGreen}; }
    .mp-tab:hover { border-color:${V2.grassGreen}; color:${V2.grassGreen}; }
    .mp-tab.active { background:${V2.grassGreen}; color:white; border-color:${V2.grassGreen};
      box-shadow:0 2px 10px rgba(125,200,50,0.35); }
    .mp-tab.soon { opacity:0.4; cursor:default; }
    .mp-pack-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    @media(max-width:900px) { .mp-pack-grid { grid-template-columns:repeat(2,1fr) !important; } }
    @media(max-width:560px) { .mp-pack-grid { grid-template-columns:1fr !important; } }
  `;
  return (
    <>
      <Head><title>Marketplace | Proof of Grass</title></Head>
      <style dangerouslySetInnerHTML={{ __html:css }} />
      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)" }}>
        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:200, height:64,
          display:"flex", alignItems:"center", padding:"0 clamp(14px,4vw,40px)", gap:20,
          background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${V2.borderSoft}`,
          boxShadow:"0 2px 16px rgba(26,74,10,0.07)" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:36, height:36, objectFit:"contain" }} />
            <span style={{ fontFamily:V2.fontSans, fontSize:16, fontWeight:800, color:V2.forestGreen }}>
              Touch Grass
            </span>
            <div style={{ background:V2.grassGreen, color:"white", fontSize:9, fontWeight:800,
              borderRadius:20, padding:"2px 8px", letterSpacing:"0.06em" }}>V2</div>
          </Link>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
            {username && (
              <div style={{ display:"flex", alignItems:"center", gap:8,
                background:"white", border:`1px solid ${V2.borderSoft}`, borderRadius:20,
                padding:"6px 14px", boxShadow:"0 1px 6px rgba(26,74,10,0.06)" }}>
                <span style={{ fontSize:16 }}>🌿</span>
                <span style={{ fontSize:13, fontWeight:600, color:V2.forestGreen }}>@{username}</span>
                <span style={{ fontSize:12, color:V2.midGray }}>▾</span>
              </div>
            )}
            <div style={{ width:40, height:40, borderRadius:12, background:"white",
              border:`1px solid ${V2.borderSoft}`, display:"flex", alignItems:"center",
              justifyContent:"center", cursor:"pointer", fontSize:18 }}>☰</div>
          </div>
        </nav>
        {/* Activity ticker */}
        <ActivityTicker />
        {/* HERO */}
        <div style={{ position:"relative", overflow:"hidden", padding:"40px clamp(14px,4vw,48px) 48px",
          background:"linear-gradient(160deg,#c5e3f7 0%,#d8f0e8 50%,#e8f4fd 100%)" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
            <img src="/marketplace-banner.png" alt=""
              style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }} />
          </div>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none",
            background:"linear-gradient(90deg,rgba(197,227,247,0.95) 0%,rgba(197,227,247,0.80) 55%,rgba(197,227,247,0.15) 100%)" }} />
          <div style={{ position:"relative", maxWidth:560 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.2em",
              textTransform:"uppercase", color:V2.grassGreen, marginBottom:10 }}>
              Proof of Grass
            </div>
            <h1 style={{ fontFamily:V2.fontSans, fontWeight:900,
              fontSize:"clamp(36px,6vw,64px)", color:V2.forestGreen,
              lineHeight:1, marginBottom:14 }}>Marketplace</h1>
            <p style={{ fontSize:15, color:V2.textBody, lineHeight:1.6, marginBottom:24, maxWidth:420 }}>
              Get exclusive cosmetics, proof styles, utilities,<br/>and collectibles using $TOUCHGRASS.
            </p>
            {/* Price pill */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:10,
              background:"rgba(255,255,255,0.85)", borderRadius:20,
              padding:"10px 18px", border:`1px solid ${V2.borderSoft}`,
              boxShadow:"0 2px 10px rgba(26,74,10,0.08)", backdropFilter:"blur(8px)",
              marginBottom:10 }}>
              <img src="/touchgrass-transparent.png" alt="" style={{ width:20, height:20, objectFit:"contain" }} />
              <span style={{ fontSize:13, fontWeight:700, color:V2.forestGreen }}>
                {priceLoading?"Loading…":price?`1 $TOUCHGRASS = $${price.toFixed(8)}`:"Price unavailable"}
              </span>
              <button onClick={()=>{}} style={{ background:"none", border:"none", cursor:"pointer",
                fontSize:14, color:V2.midGray }}>↻</button>
            </div>
          </div>
        </div>
        {/* TABS */}
        <div style={{ background:"white", borderBottom:`1px solid ${V2.borderSoft}`,
          padding:"16px clamp(14px,4vw,48px)",
          display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none" }}>
          {CATEGORIES.map(cat=>(
            <button key={cat.id}
              onClick={()=>!cat.comingSoon&&setTab(cat.id)}
              className={`mp-tab ${tab===cat.id?"active":cat.comingSoon?"soon":""}`}>
              {cat.label}{cat.comingSoon?" · Soon":""}
            </button>
          ))}
        </div>
        {/* CONTENT */}
        <div style={{ maxWidth:960, margin:"0 auto", padding:"32px clamp(14px,4vw,48px) 80px" }}>
          {tab==="featured" && (
            <>
              {featuredPack && (
                <FeaturedPackCard item={featuredPack} tokensFor={tokensFor}
                  owned={isOwned(featuredPack.id)} onBuy={setBuyingItem} onPreview={setPreviewItem} />
              )}
              {otherCosmetics.length>0 && (
                <div className="mp-pack-grid" style={{ marginBottom:32 }}>
                  {otherCosmetics.map((item,i)=>(
                    <PackCard key={item.id} item={item} tokensFor={tokensFor}
                      owned={isOwned(item.id)} onBuy={setBuyingItem} onPreview={setPreviewItem} isNew={i<2} />
                  ))}
                </div>
              )}
              {utilityItems.length>0 && (
                <>
                  <div style={{ fontSize:14, fontWeight:700, color:V2.forestGreen,
                    marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                    <span>⚡</span> Utility Items
                  </div>
                  <div className="mp-pack-grid" style={{ marginBottom:32 }}>
                    {utilityItems.map(item=>(
                      <PackCard key={item.id} item={item} tokensFor={tokensFor}
                        owned={false} onBuy={setBuyingItem} onPreview={()=>{}} />
                    ))}
                  </div>
                </>
              )}
              <YourFlexPanel username={username} inventory={inventory} />
              <BurnStats />
            </>
          )}
          {tab!=="featured" && (
            <>
              {filteredItems.length>0 ? (
                <div className="mp-pack-grid">
                  {filteredItems.map((item,i)=>(
                    <PackCard key={item.id} item={item} tokensFor={tokensFor}
                      owned={isOwned(item.id)} onBuy={setBuyingItem} onPreview={setPreviewItem} isNew={i<2} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:"80px 0" }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>{tab==="owned"?"🎒":"🔮"}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:V2.forestGreen, marginBottom:8 }}>
                    {tab==="owned"?"No items owned yet":"Nothing here yet"}
                  </div>
                  <div style={{ fontSize:13, color:V2.midGray, marginBottom:20 }}>
                    {tab==="owned"?"Purchase packs to build your collection.":"New items coming soon."}
                  </div>
                  {tab==="owned"&&(
                    <button onClick={()=>setTab("featured")}
                      style={{ ...V2Styles.btnPrimary, fontSize:13 }}>Browse Packs →</button>
                  )}
                </div>
              )}
            </>
          )}
          {/* More coming */}
          <div style={{ marginTop:40, padding:"24px 28px", background:"white",
            borderRadius:16, border:`1px solid ${V2.borderSoft}`,
            boxShadow:"0 2px 12px rgba(26,74,10,0.06)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap:16, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:V2.forestGreen, marginBottom:4 }}>
                More coming to the Marketplace
              </div>
              <div style={{ fontSize:12, color:V2.midGray }}>
                Profile frames, animated styles, seasonal packs, and limited editions.
              </div>
            </div>
            <a href="https://twitter.com/XTouchGrass" target="_blank" rel="noopener noreferrer"
              style={{ ...V2Styles.btnSecondary, fontSize:12, padding:"8px 18px", textDecoration:"none" }}>
              Follow @XTouchGrass for drops
            </a>
          </div>
        </div>
      </div>
      {/* MODALS */}
      {buyingItem && (
        <WalletPurchaseModal
          item={buyingItem}
          tokens={tokensFor(buyingItem.usdPrice)}
          price={price}
          username={username}
          onClose={()=>setBuyingItem(null)}
          onSuccess={(data)=>{
            setPurchased(true); setWalletSuccess(data); setBuyingItem(null);
            if(username){
              supabase.from("UserInventory").select("item_id,owned").eq("username",username).eq("owned",true)
                .then(({data:inv})=>setInventory((inv??[]).map(r=>r.item_id)));
            }
          }}
        />
      )}
      {walletSuccess && (
        <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,0.5)",
          backdropFilter:"blur(10px)", display:"flex", alignItems:"center",
          justifyContent:"center", padding:20 }}>
          <div style={{ background:"white", borderRadius:24, padding:"40px 32px",
            maxWidth:400, width:"100%", textAlign:"center",
            boxShadow:"0 20px 60px rgba(26,74,10,0.2)" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
            <h2 style={{ fontFamily:V2.fontSans, fontSize:22, fontWeight:800,
              color:V2.forestGreen, marginBottom:8 }}>Pack Unlocked!</h2>
            <p style={{ fontSize:13, color:V2.textMuted, lineHeight:1.6, marginBottom:24 }}>
              Your new covers are now available on your profile. Go apply them!
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setWalletSuccess(null)}
                style={{ ...V2Styles.btnSecondary, flex:1, justifyContent:"center", fontSize:13 }}>
                Keep Shopping
              </button>
              {username && (
                <Link href={`/u/${username}`}
                  style={{ ...V2Styles.btnPrimary, flex:1, justifyContent:"center",
                    fontSize:13, textDecoration:"none" }}>
                  View Profile →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      {previewItem && (
        <PreviewModal item={previewItem} tokensFor={tokensFor}
          owned={isOwned(previewItem.id)}
          onClose={()=>setPreviewItem(null)}
          onBuy={(item)=>{ setPreviewItem(null); setBuyingItem(item); }} />
      )}
    </>
  );
}