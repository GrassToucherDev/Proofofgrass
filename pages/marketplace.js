// pages/marketplace.js — V2 Marketplace (Mockup Match)
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
const WalletPurchaseModal = dynamic(() => import("../components/WalletPurchaseModal"), { ssr:false });
import Link from "next/link";
import Head from "next/head";
import { supabase } from "../utils/supabase";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";
import V2Nav from "../components/V2Nav";
import GroveBanner from "../components/GroveBanner";
import SecureUsernameCard from "../components/SecureUsernameCard";
import MarketplaceAccountBar from "../components/MarketplaceAccountBar";
import WheelHero from "../components/wheel/WheelHero";
import { signIn } from "next-auth/react";
import { BANNER_PURCHASE_NOTICE } from "../utils/groveBanners";
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
    id:"blockchain_trails_pack", name:"Blockchain Trails", category:"cosmetics",
    status:"live", featured:false, usdPrice:5.00,
    description:"Five covers inspired by the landscapes of the blockchain world — from Bitcoin Bay to Solana Springs.",
    covers:[
      { slug:"marketplace_bitcoin_bay",     name:"Bitcoin Bay",     emoji:"₿",  imageUrl:`${SUPABASE_URL}/covers/bitcoin_bay.png`,     fallback:"linear-gradient(135deg,#1a0a00,#3d1a00,#f7931a40)" },
      { slug:"marketplace_ethereum_lake",   name:"Ethereum Lake",   emoji:"◈",  imageUrl:`${SUPABASE_URL}/covers/ethereum_lake.png`,   fallback:"linear-gradient(135deg,#0a0a1a,#1a1a3d,#627eea40)" },
      { slug:"marketplace_bnb_dunes",       name:"BNB Dunes",       emoji:"🌅", imageUrl:`${SUPABASE_URL}/covers/bnb_dunes.png`,       fallback:"linear-gradient(135deg,#1a1200,#3d2e00,#f3ba2f40)" },
      { slug:"marketplace_robinhood_range", name:"Robinhood Range", emoji:"🏹", imageUrl:`${SUPABASE_URL}/covers/robinhood_range.png`, fallback:"linear-gradient(135deg,#00140a,#00281a,#00c80040)" },
      { slug:"marketplace_solana_springs",  name:"Solana Springs",  emoji:"◎",  imageUrl:`${SUPABASE_URL}/covers/solana_springs.png`,  fallback:"linear-gradient(135deg,#0a0014,#140028,#9945ff40)" },
    ],
    tags:["Bitcoin Bay","Ethereum Lake","BNB Dunes","Robinhood Range","Solana Springs"],
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
  { id:"groves",     label:"🌳 Groves",       icon:"🌳" },
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
function timeAgo(iso) {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)     return "just now";
  if (sec < 3600)   return Math.floor(sec/60) + "m ago";
  if (sec < 86400)  return Math.floor(sec/3600) + "h ago";
  if (sec < 604800) return Math.floor(sec/86400) + "d ago";
  return new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric" });
}
const ITEM_EMOJI = { streak_shield:"🛡️", sunset_pass:"🌅" };

// Real purchases from the MarketplacePurchases ledger (via /api/marketplace/recent-activity).
function ActivityTicker() {
  const [items, setItems] = useState(null);   // null = loading
  useEffect(()=>{
    let alive = true;
    const load = () => fetch("/api/marketplace/recent-activity")
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(alive && d) setItems((d.items||[]).map(i=>({
        avatar: i.emoji || ITEM_EMOJI[i.item_id] || "🎨", name: i.username, action: i.action || "bought", item: i.item, time: timeAgo(i.at),
      }))); })
      .catch(()=>{});
    load();
    const t = setInterval(load, 60000);
    return ()=>{ alive=false; clearInterval(t); };
  },[]);
  return (
    <div style={{ background:"white", borderBottom:`1px solid ${V2.borderSoft}`,
      padding:"10px clamp(14px,4vw,40px)", display:"flex", alignItems:"center", gap:16,
      overflowX:"auto", scrollbarWidth:"none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:V2.grassGreen,
          boxShadow:`0 0 8px ${V2.grassGreen}` }} />
        <span style={{ fontSize:11, fontWeight:700, color:V2.grassGreen, whiteSpace:"nowrap" }}>Live Activity</span>
      </div>
      {items && items.length === 0 && (
        <span style={{ fontSize:12, color:V2.midGray, whiteSpace:"nowrap" }}>No purchases yet — be the first to grab something.</span>
      )}
      {(items||[]).map((item,i)=>(
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
// ── Burn Total (inline hero pill) ─────────────────────────────────────────────
function BurnTotal() {
  const [total, setTotal] = useState(null);
  useEffect(()=>{
    fetch("/api/marketplace/burn-total").then(r=>r.ok?r.json():null).then(d=>{
      if(!d) return;
      const t = d.total || 0;
      setTotal(t >= 1000000 ? (t/1000000).toFixed(2)+"M" : t >= 1000 ? (t/1000).toFixed(1)+"K" : Math.round(t).toLocaleString());
    }).catch(()=>{});
  },[]);
  return <span>{total ?? "—"}</span>;
}

// ── Burn Stats ─────────────────────────────────────────────────────────────────
function BurnStats() {
  const [totalSpent,  setTotalSpent]  = useState(null);
  const [totalOrders, setTotalOrders] = useState(null);
  const [loading,     setLoading]     = useState(true);
  useEffect(()=>{
    fetch("/api/marketplace/burn-total").then(r=>r.ok?r.json():null).then(d=>{
      if(d){ setTotalSpent(d.total||0); setTotalOrders(d.orders||0); }
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
// ── Groves category: banners a Grove unlocks (owned by the Grove, bought by any member) ──────────
const GROVE_ERRORS = {
  not_in_grove: "Create or join a Grove before buying a banner.",
  purchase_in_progress: "A teammate is already unlocking this banner for your Grove. Try again in a few minutes.",
  already_unlocked: "Your Grove already has this banner.",
  price_not_set: "This banner isn't available to buy yet.",
  unavailable: "This banner isn't available to buy.",
  not_signed_in: "Sign in with Google to buy banners.",
  unclaimed: "Secure your username on the Groves page first.",
  not_owner: "This username belongs to another account.",
};
function GrovesPanel({ username, price, tokensFor, onBuy, reloadKey }) {
  const [bn, setBn] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(()=>{
    let dead=false;
    setErr("");
    fetch(`/api/groves/banners${username?`?username=${encodeURIComponent(username)}`:""}`)
      .then(async r=>{ const d=await r.json().catch(()=>({})); if(dead) return; if(r.ok) setBn(d); else { setBn({ banners:[], grove_id:null }); setErr(GROVE_ERRORS[d.code]||d.error||"Couldn't load banners."); } })
      .catch(()=>{ if(!dead){ setBn({ banners:[], grove_id:null }); setErr("Couldn't load banners."); } });
    return ()=>{ dead=true; };
  },[username, reloadKey]);
  const start = async (b)=>{
    setBusy(b.id); setErr("");
    try {
      const r = await fetch("/api/groves/banners/intent",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ username, bannerId:b.id }) });
      const d = await r.json().catch(()=>({}));
      if(!r.ok || d.ok===false){ setErr(GROVE_ERRORS[d.error]||GROVE_ERRORS[d.code]||d.error||"Couldn't start checkout."); return; }
      onBuy({ id:`grove_banner_${b.id}`, name:`${b.name} for ${d.grove_name}`, groveBanner:true, intentId:d.intent_id, checkoutRef:`b_${d.intent_id}`, usdPrice:Number(d.price_usd), groveName:d.grove_name });
    } finally { setBusy(""); }
  };
  const cancel = async (b)=>{
    setBusy(b.id); setErr("");
    try {
      const r = await fetch("/api/groves/banners/cancel",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ username, bannerId:b.id }) });
      const d = await r.json().catch(()=>({}));
      if(!r.ok || d.ok===false){ setErr(d.error||"Couldn't cancel the checkout."); return; }
      const fresh = await fetch(`/api/groves/banners?username=${encodeURIComponent(username)}`).then(x=>x.json()).catch(()=>null);
      if(fresh && fresh.banners) setBn(fresh);
    } finally { setBusy(""); }
  };
  if(!bn) return <div style={{ textAlign:"center", padding:"60px 0", color:V2.midGray }}>Loading…</div>;
  const paid = bn.banners.filter(b=>!b.is_default);
  const hasGrove = !!bn.grove_id;
  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:18, fontWeight:800, color:V2.forestGreen }}>Grove Banners</div>
        <div style={{ fontSize:13, color:V2.textBody, lineHeight:1.6, maxWidth:620 }}>
          Illustrated banners for your Grove's card and share image. {BANNER_PURCHASE_NOTICE} Cosmetic only: banners never change streaks, shields or rankings.
        </div>
      </div>
      {err && <div role="alert" style={{ background:"#fff", border:"1px solid #e5a29c", color:"#b3261e", borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:13 }}>{err}</div>}
      {!username && <div style={{ background:"white", borderRadius:14, padding:16, marginBottom:16, fontSize:14, color:V2.textBody }}>Enter your username in the top bar to buy a banner for your Grove.</div>}
      {username && !hasGrove && !err && (
        <div style={{ background:"white", borderRadius:14, padding:16, marginBottom:16, fontSize:14, color:V2.textBody }}>
          You're not in a Grove yet. <Link href="/groves" style={{ color:V2.forestGreen, fontWeight:700 }}>Create or join one</Link> to unlock banners.
        </div>
      )}
      <div className="mp-pack-grid">
        {paid.map(b=>{
          const tokens = b.purchasable ? tokensFor(Number(b.price_usd)) : null;
          const label = b.unlocked ? "Unlocked ✓" : b.pending_mine ? "Continue purchase" : b.pending ? "Checkout in progress" : !b.purchasable ? "Price coming soon" : !hasGrove ? "Join a Grove first" : `Unlock for ${bn.grove_name}`;
          const disabled = b.unlocked || (b.pending && !b.pending_mine) || !b.purchasable || !hasGrove || !username || busy===b.id || !tokens;
          return (
            <div key={b.id} style={{ background:"white", borderRadius:18, overflow:"hidden", border:`1px solid ${V2.borderSoft}`, boxShadow:"0 4px 18px rgba(26,74,10,0.08)" }}>
              <GroveBanner banner={b} height={150} scrim showTag radius={0}>
                <div style={{ position:"absolute", left:14, top:"40%", transform:"translateY(-50%)", right:14, color:"#fff", fontWeight:900, fontSize:20, textShadow:"0 2px 6px rgba(0,0,0,.45)", overflowWrap:"anywhere" }}>
                  {bn.grove_name || "Your Grove"}
                </div>
              </GroveBanner>
              <div style={{ padding:"14px 16px 16px" }}>
                <div style={{ fontWeight:800, color:V2.forestGreen, fontSize:16 }}>{b.name}</div>
                <div style={{ fontSize:12, color:V2.textMuted, margin:"2px 0 10px", minHeight:32 }}>{b.description} <span style={{ opacity:.8 }}>Preview applied to {bn.grove_name || "your Grove"}.</span></div>
                <div style={{ fontSize:13, fontWeight:700, color:V2.forestGreen, marginBottom:10 }}>
                  {b.purchasable ? (tokens ? `${tokens.toLocaleString()} $TOUCHGRASS` : "Loading price…") : "Price not set"}
                  {b.purchasable && <span style={{ fontWeight:500, color:V2.textMuted }}> · ${Number(b.price_usd).toFixed(2)}</span>}
                </div>
                <button disabled={disabled} onClick={()=>start(b)}
                  style={{ ...V2Styles.btnPrimary, width:"100%", justifyContent:"center", fontSize:13, opacity:disabled?0.55:1, cursor:disabled?"default":"pointer" }}>
                  {busy===b.id ? "Starting…" : label}
                </button>
                {b.pending_mine && !b.unlocked && (
                  <div style={{ fontSize:11, color:V2.textMuted, marginTop:8 }}>
                    You started this checkout. Finish it, or <button type="button" onClick={()=>cancel(b)} disabled={busy===b.id} style={{ background:"none", border:"none", padding:0, color:V2.forestGreen, fontWeight:700, textDecoration:"underline", cursor:"pointer", fontSize:11 }}>cancel it and start over</button>.
                  </div>
                )}
                {b.pending && !b.pending_mine && !b.unlocked && (
                  <div style={{ fontSize:11, color:V2.textMuted, marginTop:8 }}>
                    @{b.pending_by} is unlocking this for your Grove. If they don't finish, it frees up{b.pending_until ? ` around ${new Date(b.pending_until).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}` : " within 30 minutes"}.
                  </div>
                )}
                {b.unlocked && <div style={{ fontSize:11, color:V2.textMuted, marginTop:8 }}>Unlocked by @{b.unlocked_by}. <Link href="/groves" style={{ color:V2.forestGreen }}>Set it on the Groves page</Link> (owner only).</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// Individual purchases need a username secured by the signed-in Google account (the server enforces it too).
// This is checked BEFORE the wallet opens so nobody pays and then fails verification.
function BuyGate({ username, status, item, onClose, onReady }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div role="dialog" aria-label="Secure your username" style={{ background:"white", borderRadius:20, padding:"26px 22px", maxWidth:420, width:"100%", boxShadow:"0 20px 60px rgba(26,74,10,0.25)" }}>
        <div style={{ fontFamily:V2.fontSans, fontWeight:800, fontSize:20, color:V2.forestGreen, marginBottom:8 }}>Secure your username to buy</div>
        {!username ? (
          <p style={{ fontSize:14, color:V2.textBody, lineHeight:1.6 }}>Enter your username in the top bar first.</p>
        ) : status?.claimed && status?.signedIn && !status?.mine ? (
          <p style={{ fontSize:14, color:V2.textBody, lineHeight:1.6 }}>@{username} belongs to a different Google account. Sign in with the account that secured it.</p>
        ) : status?.claimed ? (
          <>
            <p style={{ fontSize:14, color:V2.textBody, lineHeight:1.6, margin:"0 0 14px" }}>@{username} is secured by a Google account. Sign in with it to buy {item?.name}. This makes sure purchases always land on the right account.</p>
            <button onClick={()=>signIn("google")} style={{ ...V2Styles.btnPrimary, padding:"10px 20px" }}>Continue with Google</button>
          </>
        ) : (
          <>
            <p style={{ fontSize:14, color:V2.textBody, lineHeight:1.6, margin:"0 0 14px" }}>Purchases are tied to a username secured with your Google account, so nobody else can claim your payment. It takes a few seconds.</p>
            <SecureUsernameCard username={username} onClaimed={onReady} />
          </>
        )}
        <button onClick={onClose} style={{ ...V2Styles.btnSecondary, marginTop:14, fontSize:13, padding:"8px 18px" }}>Cancel</button>
      </div>
    </div>
  );
}
// ── Main Marketplace ───────────────────────────────────────────────────────────
export default function Marketplace() {
  const [tab,          setTab]          = useState("featured");
  const [username,     setUsername]     = useState(null);
  const [inventory,    setInventory]    = useState([]);
  const [buyingItem,   setBuyingItemRaw] = useState(null);
  const [gate,         setGate]         = useState(null);   // { item, status } while a secured username is needed
  const [checkoutNote, setCheckoutNote] = useState("");
  // Individual items get a server-side checkout (needs the signed-in secured username) BEFORE the wallet opens,
  // so the wallet step can finish in another browser (Phantom's) without a Google session.
  const openItemCheckout = async (item)=>{
    try {
      const r = await fetch("/api/marketplace/checkout",{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ username, itemId:item.id }) });
      const d = await r.json().catch(()=>({}));
      if(!r.ok || !d.checkoutId){ setCheckoutNote(d.error||"Couldn't start checkout. Please try again."); return; }
      setCheckoutNote("");
      setBuyingItemRaw({ ...item, checkoutRef:d.checkoutId });
    } catch { setCheckoutNote("Couldn't start checkout. Please try again."); }
  };
  const setBuyingItem = (item)=>{
    if(!item || item.groveBanner){ setBuyingItemRaw(item); return; }   // banners already have a checkout (intent)
    if(!username){ setGate({ item, status:null }); return; }
    fetch(`/api/username/status?username=${encodeURIComponent(username)}`).then(r=>r.json())
      .then(st=>{ if(st?.mine) openItemCheckout(item); else setGate({ item, status:st }); })
      .catch(()=>setGate({ item, status:{} }));
  };
  // WAGO Wheel: the same "secured username" gate as item purchases, then run `cb`.
  const [wheelHandoff, setWheelHandoff] = useState(null);
  const requireSecured = (item, cb)=>{
    if(!username){ setGate({ item, status:null, after:cb }); return; }
    fetch(`/api/username/status?username=${encodeURIComponent(username)}`).then(r=>r.json())
      .then(st=>{ if(st?.mine) cb(); else setGate({ item, status:st, after:cb }); })
      .catch(()=>setGate({ item, status:{}, after:cb }));
  };
  const closeBuying = ()=>{
    setBuyingItemRaw(null);
    try { if(new URLSearchParams(window.location.search).get("checkout")) window.history.replaceState(null,"","/marketplace"); } catch {}
  };
  const [previewItem,  setPreviewItem]  = useState(null);
  const [purchased,    setPurchased]    = useState(false);
  const [walletSuccess,setWalletSuccess]= useState(null);
  const [groveReload, setGroveReload] = useState(0);
  const { price, loading:priceLoading, tokensFor } = useTouchgrassPrice();
  useEffect(()=>{
    try { if (new URLSearchParams(window.location.search).get("tab")==="groves") setTab("groves"); } catch {}
    try {
      const ref = new URLSearchParams(window.location.search).get("checkout");
      if(ref){
        fetch(`/api/checkout/info?id=${encodeURIComponent(ref)}`).then(r=>r.json()).then(d=>{
          if(d.status==="pending" && d.kind==="wheel"){
            setWheelHandoff({ checkoutId:ref, tokens:d.tokens, usd:d.usdPrice });
          } else if(d.status==="pending"){
            if(d.kind==="banner") setTab("groves");
            setBuyingItemRaw(d.kind==="banner"
              ? { id:"grove_banner", name:`${d.bannerName} for ${d.groveName}`, groveBanner:true, intentId:ref.slice(2), checkoutRef:ref, usdPrice:d.usdPrice, groveName:d.groveName }
              : { id:d.itemId, name:d.itemName, usdPrice:d.usdPrice, checkoutRef:ref });
          } else if(d.status==="completed") setCheckoutNote("This purchase is already complete. Nothing more to pay.");
          else setCheckoutNote("This checkout expired or wasn't found. Start the purchase again from the Marketplace.");
        }).catch(()=>setCheckoutNote("Couldn't load this checkout. Please try again."));
      }
    } catch {}
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
        {/* NAV — shared V2 nav (working menu) */}
        <V2Nav username={username||""} onUsernameChange={setUsername} showUpload={()=>{ window.location.href="/#upload"; }} />
        {/* Activity ticker */}
        <ActivityTicker />
        <WheelHero username={username} requireSecured={requireSecured} handoff={wheelHandoff} />
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
            {/* Price + spent pills */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:10,
                background:"rgba(255,255,255,0.85)", borderRadius:20,
                padding:"10px 18px", border:`1px solid ${V2.borderSoft}`,
                boxShadow:"0 2px 10px rgba(26,74,10,0.08)", backdropFilter:"blur(8px)" }}>
                <img src="/touchgrass-transparent.png" alt="" style={{ width:20, height:20, objectFit:"contain" }} />
                <span style={{ fontSize:13, fontWeight:700, color:V2.forestGreen }}>
                  {priceLoading?"Loading…":price?`1 $TOUCHGRASS = $${price.toFixed(8)}`:"Price unavailable"}
                </span>
                <button onClick={()=>{}} style={{ background:"none", border:"none", cursor:"pointer",
                  fontSize:14, color:V2.midGray }}>↻</button>
              </div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:10,
                background:"rgba(255,255,255,0.85)", borderRadius:20,
                padding:"10px 18px", border:`1px solid ${V2.borderSoft}`,
                boxShadow:"0 2px 10px rgba(26,74,10,0.08)", backdropFilter:"blur(8px)" }}>
                <span style={{ fontSize:16 }}>🔥</span>
                <span style={{ fontSize:13, fontWeight:700, color:V2.forestGreen }}>
                  <BurnTotal /> $TOUCHGRASS spent all-time
                </span>
              </div>
            </div>
          </div>
        </div>
        <MarketplaceAccountBar username={username} />
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
            </>
          )}
          {tab==="groves" && (
            <GrovesPanel username={username} price={price} tokensFor={tokensFor} onBuy={setBuyingItem} reloadKey={groveReload} />
          )}
          {tab!=="featured" && tab!=="groves" && (
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
      {checkoutNote && (
        <div role="alert" onClick={()=>setCheckoutNote("")} style={{ position:"fixed", left:16, right:16, bottom:20, zIndex:450, background:"#fff", border:"1px solid #e5a29c", color:"#b3261e", borderRadius:12, padding:"12px 16px", fontSize:13, boxShadow:"0 8px 30px rgba(0,0,0,.2)", maxWidth:520, margin:"0 auto" }}>{checkoutNote} <span style={{ opacity:.6 }}>(tap to dismiss)</span></div>
      )}
      {/* MODALS */}
      {gate && (
        <BuyGate username={username} status={gate.status} item={gate.item}
          onClose={()=>setGate(null)}
          onReady={()=>{ const it=gate.item, after=gate.after; setGate(null); if(after) after(); else openItemCheckout(it); }} />
      )}
      {buyingItem && (
        <WalletPurchaseModal
          item={buyingItem}
          tokens={tokensFor(buyingItem.usdPrice)}
          price={buyingItem.groveBanner?buyingItem.usdPrice:price}
          username={username}
          onClose={closeBuying}
          handoffUrl={buyingItem.checkoutRef ? `${typeof window!=="undefined"?window.location.origin:""}/marketplace?checkout=${buyingItem.checkoutRef}` : undefined}
          statusUrl={buyingItem.checkoutRef ? `/api/checkout/info?id=${buyingItem.checkoutRef}` : undefined}
          {...(!buyingItem.groveBanner ? {
            verifyBody:({signature,walletAddress})=>({ checkoutId:buyingItem.checkoutRef, signature, walletAddress }),
          } : {})}
          {...(buyingItem.groveBanner ? {
            verifyUrl:"/api/groves/banners/verify",
            verifyBody:({signature,walletAddress})=>({ intentId:buyingItem.intentId, signature, walletAddress }),
            notice:BANNER_PURCHASE_NOTICE,
            payLabel:`Unlock for ${buyingItem.groveName} →`,
            successText:`${buyingItem.name} is unlocked. The Grove owner can set it as the active banner on the Groves page.`,
          } : {})}
          onSuccess={(data)=>{
            if(buyingItem.groveBanner){ setGroveReload(n=>n+1); return; }   // keep the modal open on its success screen
            setPurchased(true); setWalletSuccess(data); setBuyingItemRaw(null);
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