import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import UploadBox from "../components/UploadBox";
import ResultCard from "../components/ResultCard";
import { supabase } from "../utils/supabase";
import { getSpotlightBadge, getSpotlightFeedText, SPOTLIGHT_BADGES } from "../utils/spotlightBadges";
// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      "#0e0f0b",
  bg2:     "#141510",
  bg3:     "#1c1e17",
  border:  "rgba(255,255,255,0.07)",
  borderG: "rgba(147,168,90,0.2)",
  olive:   "#93a85a",
  gold:    "#c8a84b",
  white:   "#f0efea",
  muted:   "rgba(240,239,234,0.50)",
  dim:     "rgba(240,239,234,0.24)",
  red:     "#ef4444",
};
// ─── Pure helpers (no Supabase) ───────────────────────────────────────────────
function normalizeUsername(val) {
  return String(val ?? "").replace(/@/g, "").toLowerCase().trim();
}
function toLocalDateStr(date) {
  // Use local date string to avoid UTC midnight boundary issues
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function computePreviewStreak(row, shieldCount = 0) {
  // No submission date = brand new user, starts at day 1
  if (!row?.last_submission_date) return 1;

  const today     = toLocalDateStr(new Date());
  const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));
  const twoDaysAgo = toLocalDateStr(new Date(Date.now() - 2 * 86400000));

  // Slice directly — never pass date-only strings through new Date() (UTC shift bug)
  const lastDateStr = String(row.last_submission_date).slice(0, 10);

  // Already submitted today — show current streak as-is
  if (lastDateStr === today)      return row.current_streak;

  // Submitted yesterday — streak continues, show incremented value
  if (lastDateStr === yesterday)  return row.current_streak + 1;

  // Missed exactly one day — shield will auto-apply, show continued streak
  if (lastDateStr === twoDaysAgo && shieldCount > 0) return row.current_streak + 1;

  // Missed one day with no shield, or missed 2+ days — streak is broken
  // Show 1 so the card reflects what the backend will actually set
  return 1;
}
function getStreakTier(n) {
  if (n >= 1000) return "TRANSCENDENT";
  if (n >= 500)  return "ASCENDED";
  if (n >= 365)  return "ETERNAL";
  if (n >= 180)  return "MYTHIC";
  if (n >= 100)  return "IMMORTAL";
  if (n >= 50)   return "LEGENDARY";
  if (n >= 30)   return "ELITE";
  if (n >= 14)   return "LOCKED IN";
  if (n >= 7)    return "ROOTED";
  if (n >= 3)    return "GROWING";
  return "SEED";
}
function getTierColor(tier) {
  return {
    TRANSCENDENT:"#f0fdf4", ASCENDED:"#e0f2fe",
    ETERNAL:"#fff9c4", MYTHIC:"#fbbf24", IMMORTAL:"#f97316",
    LEGENDARY:T.gold, ELITE:"#c084fc", "LOCKED IN":"#4ade80",
    ROOTED:"#86efac", GROWING:"#6ee7b7", SEED:"#93a85a",
  }[tier] ?? T.olive;
}
function fmtBurned(n) {
  if (!n) return "—";
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n/1000).toFixed(0)}K`;
  return n.toLocaleString();
}
// ─── Small UI atoms ───────────────────────────────────────────────────────────
function Skeleton({ w="100%", h=12 }) {
  return <div style={{ width:w, height:h, background:T.bg3, borderRadius:4, flexShrink:0, opacity:0.6 }} />;
}
function StatCard({ icon, value, label, sub, accent, last }) {
  return (
    <div style={{ flex:"1 1 0", minWidth:0, display:"flex", flexDirection:"column", alignItems:"center",
      padding:"24px 12px", gap:4, borderRight: last ? "none" : `1px solid ${T.border}` }}>
      <span style={{ fontSize:15, opacity:0.4, marginBottom:2 }}>{icon}</span>
      <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
        fontSize:"clamp(22px,3vw,36px)", fontWeight:700,
        color: accent ? T.gold : T.white, lineHeight:1, letterSpacing:"-0.02em" }}>
        {value ?? "—"}
      </span>
      {sub && <span style={{ fontSize:10, color:T.olive, fontWeight:600 }}>{sub}</span>}
      <span style={{ fontSize:9, color:T.dim, letterSpacing:"0.14em", textTransform:"uppercase", textAlign:"center", marginTop:2 }}>
        {label}
      </span>
    </div>
  );
}
function LBRow({ rank, username, streak, tier }) {
  const col = getTierColor(tier);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12,
      padding:"11px 0", borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:10, color:T.dim, width:16, textAlign:"right", flexShrink:0 }}>{rank}</span>
      <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
        background:`linear-gradient(135deg,${T.bg3},${T.olive}30)`,
        border:`1px solid ${T.border}`, display:"flex", alignItems:"center",
        justifyContent:"center", fontFamily:"'Cormorant Garamond',Georgia,serif",
        fontWeight:700, fontSize:13, color:T.muted }}>
        {username?.[0]?.toUpperCase() ?? "?"}
      </div>
      <span style={{ flex:1, fontSize:13, color:T.white, fontWeight:500,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        @{username}
      </span>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontSize:18, fontWeight:700, color:T.white,
          fontFamily:"'Cormorant Garamond',Georgia,serif", lineHeight:1 }}>{streak}d</div>
        <div style={{ fontSize:8, color:col, letterSpacing:"0.1em", textTransform:"uppercase" }}>{tier}</div>
      </div>
    </div>
  );
}
function ProofRow({ username, streak, created_at }) {
  const tier = getStreakTier(streak);
  const col  = getTierColor(tier);
  const when = created_at
    ? new Date(created_at).toLocaleDateString("en-US",{ month:"short", day:"numeric" })
    : "";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12,
      padding:"11px 0", borderBottom:`1px solid ${T.border}` }}>
      <div style={{ width:44, height:44, borderRadius:8, flexShrink:0,
        background:"linear-gradient(135deg,#2a3d1a,#3d6a28)",
        border:`1px solid ${T.border}`, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:20 }}>🌿</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.white, marginBottom:2,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>@{username}</div>
        <div style={{ fontSize:10, color:T.dim }}>{when}</div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontSize:8, color:T.dim, letterSpacing:"0.1em", textTransform:"uppercase" }}>DAY</div>
        <div style={{ fontSize:20, fontWeight:700, lineHeight:1,
          fontFamily:"'Cormorant Garamond',Georgia,serif",
          color: streak >= 50 ? T.gold : T.white }}>{streak}</div>
        <div style={{ fontSize:7, color:col, letterSpacing:"0.08em", textTransform:"uppercase" }}>{tier}</div>
      </div>
    </div>
  );
}
const TIER_ICONS = {
  Rooted:"🌱", Elite:"💧", Legendary:"🌲", Immortal:"💯",
  Mythic:"⚡", Eternal:"👑", Ascended:"✨",
};
function TierBadge({ name, day, completed, active }) {
  const col  = completed ? T.olive : active ? T.gold : "rgba(255,255,255,0.12)";
  const icon = TIER_ICONS[name] ?? "○";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:"1 1 0", minWidth:0 }}>
      <div style={{
        width:44, height:44, borderRadius:12,
        border:`1.5px solid ${col}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: active
          ? `linear-gradient(135deg,${T.gold}22,${T.gold}08)`
          : completed
          ? `linear-gradient(135deg,${T.olive}20,${T.olive}08)`
          : "rgba(255,255,255,0.03)",
        boxShadow: active ? `0 0 18px ${T.gold}30,inset 0 0 8px ${T.gold}10` : "none",
        position:"relative", transition:"all 0.2s", flexShrink:0,
      }}>
        <span style={{ fontSize:18, filter: completed||active ? "none" : "grayscale(1) opacity(0.3)" }}>
          {icon}
        </span>
        {completed && (
          <div style={{
            position:"absolute", top:-4, right:-4,
            width:14, height:14, borderRadius:"50%",
            background:T.olive, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:8, color:"#0a0c08", fontWeight:900,
            boxShadow:`0 0 0 2px ${T.bg2}`,
          }}>✓</div>
        )}
      </div>
      <div style={{ textAlign:"center", minWidth:0, width:"100%" }}>
        <div style={{
          fontSize:8, fontWeight:700, color:col,
          letterSpacing:"0.06em", textTransform:"uppercase",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        }}>{name}</div>
        <div style={{ fontSize:8, color:T.dim }}>Day {day}</div>
      </div>
    </div>
  );
}
function ResultMini({ day }) {
  const isLeg = day >= 50;
  return (
    <div style={{ borderRadius:10, overflow:"hidden", aspectRatio:"16/9", position:"relative",
      background:"#0a1f0c", border:`1px solid ${T.borderG}`,
      boxShadow:"0 6px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ position:"absolute", inset:0,
        background:"linear-gradient(135deg,#2a3d1a,#3d5a2a,#1a2d12)",
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:40, opacity:0.35 }}>🌿</div>
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:"55%",
        background:"linear-gradient(90deg,transparent,rgba(8,10,6,0.97))" }} />
      <div style={{ position:"absolute", right:10, top:8, bottom:8, width:"44%",
        display:"flex", flexDirection:"column", justifyContent:"center" }}>
        <div style={{ fontSize:4.5, letterSpacing:"0.18em", color:"rgba(147,168,90,0.6)",
          textTransform:"uppercase", marginBottom:2 }}>✦ OFFICIAL CERTIFICATE ✦</div>
        <div style={{ fontSize:13, fontWeight:900, color:T.white,
          fontFamily:"'Cormorant Garamond',Georgia,serif", lineHeight:1 }}>VERIFIED</div>
        <div style={{ fontSize:8, fontWeight:700, color:T.olive, marginBottom:5 }}>GRASS TOUCHER</div>
        <div style={{ height:"0.5px",
          background:`linear-gradient(90deg,transparent,${T.olive}50,transparent)`, marginBottom:5 }} />
        <div style={{ fontSize:4, letterSpacing:"0.14em", color:"rgba(147,168,90,0.4)",
          textTransform:"uppercase", marginBottom:2 }}>CURRENT STREAK</div>
        <div style={{ fontSize:20, fontWeight:900, lineHeight:1,
          fontFamily:"'Cormorant Garamond',Georgia,serif",
          color: isLeg ? T.gold : T.white,
          textShadow: isLeg ? `0 0 12px ${T.gold}50` : "none" }}>DAY {day}</div>
        <div style={{ marginTop:"auto", fontSize:4, color:"rgba(255,255,255,0.18)",
          letterSpacing:"0.1em" }}>proofofgrass.vercel.app</div>
      </div>
    </div>
  );
}
// ─── Shield buy section ───────────────────────────────────────────────────────
const BURN_ADDR   = "GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K";
const SOL_DOMAIN  = "touchgrassburn.sol";
const TOUCHGRASS_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const SHIELD_AMOUNT = 50000;
function buildSolanaPayUrl() {
  const params = new URLSearchParams({
    amount: String(SHIELD_AMOUNT),
    "spl-token": TOUCHGRASS_MINT,
    label: "Touch Grass Shield",
    message: "50,000 $TOUCHGRASS — Streak Shield",
  });
  return `solana:${BURN_ADDR}?${params.toString()}`;
}
function buildQrCodeUrl(data, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&color=240-239-234&bgcolor=10-12-8&data=${encodeURIComponent(data)}`;
}
// ─── PromoBanner — reusable seasonal / consumable announcement ───────────────
// Props: image, title, description, buttonText, href,
//        secondaryText, secondaryHref, steps (array of strings)
function PromoBanner({ image, title, description, buttonText, href,
  secondaryText = "", secondaryHref = "/", steps = [] }) {
  const imgUrl = supabase.storage.from("promo-assets").getPublicUrl(image).data.publicUrl;
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ width:"100%", padding:"0 clamp(14px,4vw,32px)", boxSizing:"border-box" }}>

      {/* Image — no wrapping link so the floating buttons work independently */}
      <div style={{ position:"relative", borderRadius:24, overflow:"hidden",
        boxShadow: hovered
          ? "0 0 40px rgba(249,115,22,0.2), 0 12px 48px rgba(0,0,0,0.55)"
          : "0 6px 32px rgba(0,0,0,0.45)",
        transform: hovered ? "scale(1.005)" : "scale(1)",
        transition:"transform 0.25s ease, box-shadow 0.25s ease" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>

        {/* 3:2 aspect ratio container */}
        <div style={{ position:"relative", width:"100%", paddingBottom:"66.666%", background:"#0e1008" }}>
          <img src={imgUrl} alt={title} loading="lazy"
            style={{ position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover", objectPosition:"center", display:"block" }} />

          {/* Dark gradient at bottom for button legibility */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"40%",
            background:"linear-gradient(to top,rgba(0,0,0,0.72),transparent)",
            pointerEvents:"none" }} />

          {/* Floating buttons — bottom of image */}
          <div style={{ position:"absolute", bottom:20, left:0, right:0,
            display:"flex", gap:10, justifyContent:"center",
            padding:"0 20px", flexWrap:"wrap" }}>
            <a href={href} target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:7,
                background:"linear-gradient(135deg,#f97316,#c2410c)",
                color:"#fff", fontSize:13, fontWeight:700,
                letterSpacing:"0.05em", padding:"11px 22px",
                borderRadius:999, textDecoration:"none", whiteSpace:"nowrap",
                boxShadow:"0 4px 18px rgba(249,115,22,0.45)",
                transition:"transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 24px rgba(249,115,22,0.6)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 4px 18px rgba(249,115,22,0.45)";}}>
              {buttonText}
            </a>
            {secondaryText && (
              <Link href={secondaryHref}
                style={{ display:"inline-flex", alignItems:"center", gap:7,
                  background:"linear-gradient(135deg,#93a85a,#7a9148)",
                  color:"#fff", fontSize:13, fontWeight:700,
                  letterSpacing:"0.05em", padding:"11px 22px",
                  borderRadius:999, textDecoration:"none", whiteSpace:"nowrap",
                  boxShadow:"0 4px 18px rgba(147,168,90,0.4)",
                  transition:"transform 0.15s, box-shadow 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 24px rgba(147,168,90,0.55)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 4px 18px rgba(147,168,90,0.4)";}}>
                {secondaryText}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Info card */}
      <div style={{ marginTop:16, background:"linear-gradient(145deg,#141510,#1c1e17)",
        border:"1px solid rgba(249,115,22,0.25)", borderRadius:16,
        padding:"22px 24px", boxShadow:"0 4px 24px rgba(0,0,0,0.3)" }}>

        <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
          fontSize:"clamp(17px,2.2vw,22px)", fontWeight:700,
          color:"#f0efea", marginBottom:8 }}>
          {title}
        </div>

        <div style={{ fontSize:13, color:"rgba(240,239,234,0.55)",
          lineHeight:1.65, marginBottom: steps.length ? 18 : 0 }}>
          {description.split("\n\n").map((para, i) => (
            <p key={i} style={{ margin: i > 0 ? "8px 0 0" : 0 }}>{para}</p>
          ))}
        </div>

        {/* Steps */}
        {steps.length > 0 && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:4 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10,
                flex:"1 1 180px", background:"rgba(249,115,22,0.05)",
                border:"1px solid rgba(249,115,22,0.15)", borderRadius:10,
                padding:"10px 12px" }}>
                <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:22, fontWeight:700, color:"rgba(249,115,22,0.4)",
                  lineHeight:1, flexShrink:0 }}>
                  {String(i+1).padStart(2,"0")}
                </div>
                <div style={{ fontSize:12, color:"rgba(240,239,234,0.65)",
                  lineHeight:1.5, paddingTop:2 }}>{step}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Map preview card ─────────────────────────────────────────────────────────
function MapPreviewCard() {
  const [stats, setStats] = useState({ mapped:0, regions:0, countries:0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("Submissions")
        .select("location_label,location_country")
        .not("location_source", "eq", "none")
        .in("status", ["pending","approved"])
        .limit(5000);
      const rows = data ?? [];
      const uniqueLabels    = new Set(rows.map(r => r.location_label).filter(Boolean));
      const uniqueCountries = new Set(rows.map(r => r.location_country).filter(Boolean));
      setStats({ mapped: rows.length, regions: uniqueLabels.size, countries: uniqueCountries.size });
      setLoading(false);
    })();
  }, []);
  const T2 = {
    bg3:"#141710", border:"rgba(255,255,255,0.055)", borderGold:"rgba(200,168,75,0.35)",
    gold:"#c8a84b", olive:"#93a85a", white:"#f0efea", dim:"rgba(240,239,234,0.24)",
  };
  return (
    <a href="/map" style={{ textDecoration:"none", display:"block",
      background: "linear-gradient(145deg,#0e100b,#141710)",
      border:`1px solid ${T2.borderGold}`, borderRadius:14, padding:"22px 20px",
      boxShadow:"0 0 24px rgba(200,168,75,0.08)", transition:"transform 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = ""}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>🌎</span>
          <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:16,
            fontWeight:700, color:T2.white }}>Proof of Grass Map</span>
        </div>
        <span style={{ fontSize:10, color:T2.gold, fontWeight:600 }}>View Map →</span>
      </div>
      <div style={{ display:"flex", gap:20 }}>
        {[
          ["Mapped Proofs", stats.mapped],
          ["Regions", stats.regions],
          ["Countries", stats.countries],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:20,
              fontWeight:700, color:T2.olive }}>
              {loading ? "—" : value}
            </div>
            <div style={{ fontSize:9, color:T2.dim, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </a>
  );
}
// ─── Spotlight section ────────────────────────────────────────────────────────
const SPOT_CATS = Object.values(SPOTLIGHT_BADGES).map(b => ({
  key:   b.key,
  emoji: b.emoji,
  name:  b.title,
  label: b.title,
  color: b.color,
  image: b.image,
}));
function SpotlightSection() {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const d = new Date();
      const day = d.getUTCDay();
      d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
      const thisMonday = d.toISOString().slice(0, 10);
      const { data: spotlights } = await supabase
        .from("CommunitySpotlights")
        .select("*")
        .eq("status", "active")
        .eq("week_start", thisMonday);
      if (!spotlights?.length) { setLoading(false); return; }
      const usernames = [...new Set(spotlights.map(s => s.username))];
      const { data: profiles } = await supabase
        .from("Profiles").select("username, avatar_url").in("username", usernames);
      const avatarMap = Object.fromEntries((profiles ?? []).map(p => [p.username, p.avatar_url]));
      setWinners(spotlights.map(s => ({
        ...s,
        resolved_avatar: s.avatar_url || avatarMap[s.username] || null,
      })));
      setLoading(false);
    })();
  }, []);
  const winnerMap = Object.fromEntries(winners.map(w => [w.category, w]));
  const T2 = {
    bg2:"#0e100b", bg3:"#141710", border:"rgba(255,255,255,0.055)",
    borderGold:"rgba(200,168,75,0.35)", gold:"#c8a84b",
    white:"#f0efea", dim:"rgba(240,239,234,0.24)", muted:"rgba(240,239,234,0.52)",
  };
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.18em",
            textTransform:"uppercase", color:T2.gold, marginBottom:4 }}>Community</div>
          <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:18, fontWeight:700, color:T2.white }}>Community Spotlight</div>
          <div style={{ fontSize:11, color:T2.dim, marginTop:2 }}>This week's Touch Grass winners</div>
        </div>
        <a href="/spotlight" style={{ fontSize:11, color:T2.gold,
          textDecoration:"none", fontWeight:600, letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
          View Spotlight →
        </a>
      </div>
      <div className="spotlight-scroll" style={{ display:"flex", gap:12, overflowX:"auto",
        overflowY:"visible", paddingBottom:4, scrollbarWidth:"none" }}>
        {SPOT_CATS.map(cat => {
          const w = winnerMap[cat.key];
          return (
            <div key={cat.key} style={{
              flexShrink:0, width:160,
              background: w ? `linear-gradient(145deg,${T2.bg2},${T2.bg3})` : T2.bg2,
              border:`1px solid ${w ? T2.borderGold : T2.border}`,
              borderRadius:12, padding:"14px 14px",
              boxShadow: w ? "0 0 18px rgba(200,168,75,0.1)" : "none",
            }}>
              {cat.image ? (
                <img src={cat.image} alt={cat.name} loading="lazy"
                  style={{ width:36, height:36, objectFit:"contain", marginBottom:6,
                    filter:`drop-shadow(0 0 6px ${cat.color}60)`, opacity: w ? 1 : 0.25 }} />
              ) : (
                <div style={{ fontSize:20, marginBottom:6 }}>{cat.emoji}</div>
              )}
              <div style={{ fontSize:8, fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", color:cat.color, marginBottom:8 }}>{cat.name}</div>
              {loading ? (
                <div style={{ height:32, borderRadius:6, background:T2.bg3, opacity:0.5 }} />
              ) : w ? (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                    {w.resolved_avatar ? (
                      <img src={w.resolved_avatar} alt="" loading="lazy"
                        style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover",
                          border:`1px solid ${cat.color}`, flexShrink:0 }} />
                    ) : (
                      <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                        background:T2.bg3, border:`1px solid ${cat.color}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:12, fontWeight:700, color:cat.color }}>
                        {w.username[0].toUpperCase()}
                      </div>
                    )}
                    <a href={`/u/${w.username}`}
                      style={{ fontSize:12, fontWeight:700, color:T2.white, textDecoration:"none",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      @{w.display_name || w.username}
                    </a>
                  </div>
                  <div style={{ fontSize:9, color:cat.color, fontWeight:600, letterSpacing:"0.04em" }}>{cat.label}</div>
                </>
              ) : (
                <div style={{ textAlign:"center", padding:"8px 0" }}>
                  <div style={{ fontSize:20, opacity:0.3, marginBottom:4 }}>🏆</div>
                  <div style={{ fontSize:10, color:T2.dim }}>No Winner</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ─── Recent Milestones ────────────────────────────────────────────────────────
const MILESTONE_ICONS = {
  streak:"🔥", grass_score:"🌱", proof_count:"🌿",
  referral:"🤝", spotlight:"🏆", lucky_touch:"🍀",
};
function RecentMilestones() {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("MilestoneEvents")
        .select("username,milestone_type,milestone_label,created_at")
        .order("created_at", { ascending:false })
        .limit(8);
      setMilestones(data ?? []);
      setLoading(false);
    })();
  }, []);
  const T2 = {
    bg2:"#0e100b", bg3:"#141710", border:"rgba(255,255,255,0.055)",
    borderGold:"rgba(200,168,75,0.35)", gold:"#c8a84b",
    white:"#f0efea", dim:"rgba(240,239,234,0.24)", olive:"#93a85a",
  };
  if (!loading && milestones.length === 0) return null;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.18em",
            textTransform:"uppercase", color:T2.gold, marginBottom:3 }}>Platform</div>
          <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:18, fontWeight:700, color:T2.white }}>Recent Milestones</div>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} style={{ height:40, borderRadius:8, background:T2.bg3, opacity:0.5 }} />
          ))
        ) : milestones.map((m, i) => (
          <a key={i} href={`/u/${m.username}`}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
              borderRadius:9, textDecoration:"none", background:T2.bg3,
              border:`1px solid ${T2.border}`, transition:"border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T2.borderGold}
            onMouseLeave={e => e.currentTarget.style.borderColor = T2.border}>
            <span style={{ fontSize:16, flexShrink:0 }}>{MILESTONE_ICONS[m.milestone_type] ?? "⭐"}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ fontSize:12, fontWeight:600, color:T2.gold }}>@{m.username}</span>
              <span style={{ fontSize:12, color:T2.dim }}> {m.milestone_label}</span>
            </div>
            <span style={{ fontSize:9, color:T2.dim, flexShrink:0 }}>
              {m.created_at ? new Date(m.created_at).toLocaleDateString("en-US",{ month:"short", day:"numeric" }) : ""}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
function ActivityFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalLuckyCount, setGlobalLuckyCount] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const [
          { data: recentSubs },
          { data: recentChals },
          { data: topStreaks },
          { data: recentReferrals },
          { data: luckyTouchFeed },
          { count: globalLuckyCount },
          { data: recentSpotlights },
        ] = await Promise.all([
          supabase.from("Submissions").select("username, created_at").in("status", ["pending","approved"]).order("created_at", { ascending: false }).limit(8),
          supabase.from("Challenges").select("challenger, challenged, duration_days, status, created_at, slug").order("created_at", { ascending: false }).limit(5),
          supabase.from("Streaks").select("username, current_streak, best_streak").order("current_streak", { ascending: false }).limit(5),
          supabase.from("Referrals").select("referrer_username, referred_username, status, converted_at, created_at").order("created_at", { ascending: false }).limit(6),
          Promise.resolve({ data: [] }),
          Promise.resolve({ count: 0 }),
          supabase.from("CommunitySpotlights").select("username, category, display_name, week_start, created_at").eq("status", "active").order("created_at", { ascending: false }).limit(8),
        ]);
        const feed = [];
        (recentSubs ?? []).forEach(s => { feed.push({ type:"proof", username:s.username, text:"logged outdoor proof", emoji:"🌿", time:s.created_at }); });
        (recentChals ?? []).forEach(c => {
          if (c.status === "pending" || c.status === "active") feed.push({ type:"challenge", username:c.challenger, text:`challenged @${c.challenged} to a ${c.duration_days}-day streak`, emoji:"⚡", time:c.created_at, link:`/challenge/${c.slug}` });
          if (c.status === "completed") feed.push({ type:"challenge_complete", username:c.challenger, text:`completed a ${c.duration_days}-day challenge with @${c.challenged}`, emoji:"🏆", time:c.created_at, link:`/challenge/${c.slug}` });
        });
        (topStreaks ?? []).forEach(s => {
          const milestones = [7,14,30,50,100,180,200,250,365,500,750,1000];
          const hit = milestones.find(m => s.current_streak === m);
          if (hit) {
            const tierName = hit>=1000?"TRANSCENDENT":hit>=500?"ASCENDED":hit>=365?"ETERNAL":hit>=180?"MYTHIC":hit>=100?"IMMORTAL":hit>=50?"LEGENDARY":hit>=30?"ELITE":hit>=14?"LOCKED IN":"ROOTED";
            feed.push({ type:"milestone", username:s.username, text:`reached Day ${hit} — ${tierName} unlocked`, emoji:hit>=100?"👑":hit>=50?"🌟":hit>=30?"🌳":"🌱", time:null });
          }
        });
        (recentReferrals ?? []).forEach(r => {
          if (r.status === "converted") feed.push({ type:"referral_converted", username:r.referrer_username, text:`helped @${r.referred_username} reach Day 10`, emoji:"🤝", time:r.converted_at||r.created_at });
          else feed.push({ type:"referral_pending", username:r.referrer_username, text:"invited a new Toucher to the movement", emoji:"🌱", time:r.created_at });
        });
        // Lucky Touch feed removed — feature exists, not surfaced on dashboard
        (recentSpotlights ?? []).forEach(s => {
          feed.push({ type:"spotlight", username:s.display_name||s.username, text:getSpotlightFeedText(s.category), emoji:"🏆", badgeImg:getSpotlightBadge(s.category)?.image??null, time:s.created_at, link:"/spotlight" });
        });
        feed.sort((a, b) => { if (!a.time && !b.time) return 0; if (!a.time) return 1; if (!b.time) return -1; return new Date(b.time) - new Date(a.time); });
        setItems(feed.slice(0, 10));
        // globalLuckyCount removed from feed
      } catch(e) { console.warn("activity feed error", e); }
      setLoading(false);
    })();
  }, []);
  const T2 = { olive:"#93a85a", gold:"#c8a84b", white:"#f0efea", dim:"rgba(240,239,234,0.22)", bg3:"#181a12", border:"rgba(255,255,255,0.06)" };
  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {[1,2,3,4].map(i => <div key={i} style={{ height:44, borderRadius:8, background:T2.bg3 }} />)}
    </div>
  );
  if (items.length === 0) return <p style={{ fontSize:12, color:T2.dim, textAlign:"center", padding:"16px 0" }}>No recent activity yet.</p>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

      {items.map((item, i) => {
        const timeAgo = item.time ? (() => { const diff=Date.now()-new Date(item.time); const mins=Math.floor(diff/60000); const hrs=Math.floor(diff/3600000); const days=Math.floor(diff/86400000); return days>0?`${days}d ago`:hrs>0?`${hrs}h ago`:mins>0?`${mins}m ago`:"just now"; })() : "";
        const isSpotlight = item.type === "spotlight";
        const inner = (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10,
            background:isSpotlight?"linear-gradient(135deg,#1a1600,#0e1008)":T2.bg3,
            border:isSpotlight?"1px solid rgba(200,168,75,0.25)":`1px solid ${T2.border}` }}>
            {isSpotlight && item.badgeImg ? <img src={item.badgeImg} alt="" loading="lazy" style={{ width:28, height:28, objectFit:"contain", flexShrink:0 }} /> : <span style={{ fontSize:18, flexShrink:0 }}>{item.emoji}</span>}
            <div style={{ flex:1, minWidth:0 }}>
              <span className="feed-username" style={{ fontSize:12, fontWeight:600, color:isSpotlight?T2.gold:T2.white }}>@{item.username}</span>
              <span style={{ fontSize:12, color:isSpotlight?"rgba(200,168,75,0.6)":T2.dim }}> {item.text}</span>
            </div>
            {timeAgo && <span style={{ fontSize:10, color:T2.dim, flexShrink:0 }}>{timeAgo}</span>}
          </div>
        );
        return item.link ? <Link key={i} href={item.link} style={{ textDecoration:"none" }}>{inner}</Link> : <div key={i}>{inner}</div>;
      })}
    </div>
  );
}
// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [rawUsername, setRawUsername] = useState("");
  const username = normalizeUsername(rawUsername);
  const hasUser  = username.length > 0;

  const [currentStreak,        setCurrentStreak]        = useState(null);
  const [displayStreak,        setDisplayStreak]         = useState(null);
  const [streakStatus,         setStreakStatus]          = useState("");
  const [streakTone,           setStreakTone]            = useState("neutral");
  const [shieldEligible,       setShieldEligible]        = useState(false);
  const [missedOneDayNoShield, setMissedOneDayNoShield]  = useState(false);
  const [hasPostedToday,       setHasPostedToday]        = useState(null);
  const [userStats,            setUserStats]             = useState(null);
  const [latestPurchase,       setLatestPurchase]        = useState(null);
  const [loadingUser,          setLoadingUser]           = useState(false);

  // Shield purchase
  const [purchaseWallet,  setPurchaseWallet]  = useState("");
  const [purchaseStatus,  setPurchaseStatus]  = useState(null);
  const [purchaseError,   setPurchaseError]   = useState("");
  const [copiedDomain,    setCopiedDomain]    = useState(false);
  const [copiedAddr,      setCopiedAddr]      = useState(false);
  const [showPasteTip,    setShowPasteTip]    = useState(false);

  // Image / result card
  const [imageSrc,   setImageSrc]   = useState(null);
  const [proofFile,  setProofFile]  = useState(null);  // original File object for outdoor photo share
  const [showResult, setShowResult] = useState(false);

  // Community stats
  const [dailyCount,  setDailyCount]  = useState(null);
  const [totalBurned, setTotalBurned] = useState(null);
  const [topStreaker,  setTopStreaker] = useState(null);
  const [totalProofs,  setTotalProofs] = useState(null);

  // Leaderboard + feed
  const [leaders,      setLeaders]      = useState([]);
  const [recentProofs, setRecentProofs] = useState([]);
  const [previewDays,  setPreviewDays]  = useState([67, 23, 11]);

  // Misc
  const [mounted,       setMounted]       = useState(false);
  const [showShieldBuy, setShowShieldBuy] = useState(false);
  const [showMenu,      setShowMenu]      = useState(false);

  // Sunset Pass activation state
  const [sunsetActivating, setSunsetActivating] = useState(false);
  const [sunsetMsg,        setSunsetMsg]        = useState("");
  const [hasPremiumProofs, setHasPremiumProofs] = useState(false);

  // ── Pending challenges ────────────────────────────────────────────────────
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [challengeActioning, setChallengeActioning] = useState(null); // challenge id being actioned

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#shield-section") {
      setShowShieldBuy(true);
      setTimeout(() => {
        document.getElementById("shield-section")?.scrollIntoView({ behavior:"smooth", block:"center" });
      }, 150);
    }
  }, []);

  const uploadSectionRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("pog_username");
    if (saved) setRawUsername(normalizeUsername(saved));
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.length > 0) {
      const normalized = ref.toLowerCase().replace(/@/g,"").trim();
      if (!localStorage.getItem("pog_referrer")) {
        localStorage.setItem("pog_referrer", normalized);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && username)
      localStorage.setItem("pog_username", username);
  }, [username]);

  // ── Debounced user data load ──────────────────────────────────────────────
  useEffect(() => {
    if (!username) {
      setCurrentStreak(null); setDisplayStreak(null); setStreakStatus("");
      setStreakTone("neutral"); setShieldEligible(false);
      setMissedOneDayNoShield(false); setHasPostedToday(null);
      setUserStats(null); setLatestPurchase(null);
      setPurchaseStatus(null); setPurchaseError("");
      setHasPremiumProofs(false);
      setLoadingUser(false);
      return;
    }
    setLoadingUser(true);
    const timer = setTimeout(async () => {
      const todayStr     = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const twoDaysAgo   = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      try {
        const [{ data: streakRowExact }, { count: postCount }] = await Promise.all([
          supabase.from("Streaks")
            .select("current_streak, best_streak, last_submission_date, shield_count")
            .eq("username", username).maybeSingle(),
          supabase.from("Submissions")
            .select("id", { count:"exact", head:true })
            .eq("username", username),
        ]);

        // If exact match fails, try case-insensitive lookup — covers usernames
        // stored with different casing (e.g. "JohnDoe" vs "johndoe")
        let streakRow = streakRowExact;
        if (!streakRow) {
          const { data: ilike } = await supabase
            .from("Streaks")
            .select("current_streak, best_streak, last_submission_date, shield_count, username")
            .ilike("username", username)
            .maybeSingle();
          if (ilike) {
            streakRow = ilike;
            // Persist the correct casing so future exact lookups work
            console.info("[streak] found via ilike, stored as:", ilike.username, "typed as:", username);
          }
        }

        const { data: allStreaksForRank } = await supabase
          .from("Streaks").select("username,current_streak")
          .order("current_streak", { ascending: false });
        const rankIdx = (allStreaksForRank ?? []).findIndex(
          r => r.username?.toLowerCase().trim() === username
        );
        const rankCount = rankIdx >= 0 ? rankIdx : (allStreaksForRank?.length ?? 1) - 1;

        const lastDate = streakRow?.last_submission_date
          ? new Date(streakRow.last_submission_date).toISOString().slice(0, 10)
          : null;

        // ── CHANGE 1: Read shield count from UserConsumables ─────────────
        const { data: consumableRow } = await supabase
          .from("UserConsumables")
          .select("quantity")
          .eq("username", username)
          .eq("consumable_type", "shield")
          .maybeSingle();
        const shieldCount = consumableRow?.quantity ?? streakRow?.shield_count ?? 0;

        // ── CHANGE 2: Read sunset pass count from UserConsumables ─────────
        const { data: sunsetRow } = await supabase
          .from("UserConsumables")
          .select("quantity")
          .eq("username", username)
          .eq("consumable_type", "sunset_pass")
          .maybeSingle();
        const sunsetPassCount = sunsetRow?.quantity ?? 0;

        const actual    = streakRow?.current_streak ?? 0;
        const projected = actual + 1;
        const displayVal = computePreviewStreak(streakRow, shieldCount);
        const missedOne  = lastDate === twoDaysAgo;

        // Use direct string slice — never pass date-only strings through new Date()
        // as that parses as UTC midnight and shifts date back for negative UTC offsets.
        const todayLocal     = toLocalDateStr(new Date());
        const yesterdayLocal = toLocalDateStr(new Date(Date.now() - 86400000));
        const lastDateStr    = lastDate ? String(lastDate).slice(0, 10) : null;
        const postedToday    = lastDateStr === todayLocal;
        const postedYesterday = lastDateStr === yesterdayLocal;

        if (!lastDate)           setStreakStatus("start your streak today"),                    setStreakTone("neutral");
        else if (postedToday)    setStreakStatus("streak locked in for today ✓"),               setStreakTone("success");
        else if (postedYesterday)setStreakStatus(`submit today to reach day ${projected}`),      setStreakTone("warning");
        else if (missedOne && shieldCount > 0) setStreakStatus(`day ${actual} — shield available`), setStreakTone("reset");
        else                     setStreakStatus("streak lost — start again today"),             setStreakTone("reset");

        // Override hasPostedToday with local-date-aware check
        const postedTodayFinal = postedToday;

        setShieldEligible(missedOne && shieldCount > 0);
        setMissedOneDayNoShield(missedOne && shieldCount === 0);
        setHasPostedToday(postedTodayFinal);
        setCurrentStreak(actual);
        setDisplayStreak(displayVal);

        // ── CHANGE 3: Include sunsetPasses in userStats ───────────────────
        setUserStats({
          posts:        postCount ?? 0,
          bestStreak:   streakRow?.best_streak ?? actual,
          rank:         rankCount + 1,
          shields:      shieldCount,
          sunsetPasses: sunsetPassCount,
        });

        supabase.from("ShieldPurchases")
          .select("tx_signature, status, created_at")
          .eq("username", username)
          .order("created_at", { ascending:false }).limit(1).maybeSingle()
          .then(({ data }) => setLatestPurchase(data ?? null));

        // Check Premium+ unlock
        supabase.from("UserPremiumUnlocks")
          .select("premium_type").eq("username", username)
          .eq("premium_type", "premium_proofs").maybeSingle()
          .then(({ data }) => setHasPremiumProofs(!!data));

        // Fetch pending challenges where this user is the one being challenged
        supabase.from("Challenges")
          .select("id,slug,challenger,challenged,duration_days,message,created_at")
          .eq("challenged", username)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .then(({ data }) => setPendingChallenges(data ?? []));

      } catch (e) {
        console.error("preload failed", e);
        setStreakTone("neutral"); setStreakStatus("");
      } finally {
        setLoadingUser(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // ── Community stats ───────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const todayStart = new Date(); todayStart.setUTCHours(0,0,0,0);
    const [{ count:todayC }, { data:streakers }, { count:burnC }, { count:allC }] = await Promise.all([
      supabase.from("Submissions").select("id",{count:"exact",head:true}).in("status",["pending","approved"]).gte("created_at",todayStart.toISOString()),
      supabase.from("Streaks").select("username,current_streak").order("current_streak",{ascending:false}).limit(1),
      supabase.from("ShieldPurchases").select("id",{count:"exact",head:true}).eq("status","approved"),
      supabase.from("Submissions").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
    ]);
    setDailyCount(todayC ?? 0);
    setTotalBurned((burnC ?? 0) * 50000);
    setTotalProofs(allC ?? 0);
    if (streakers?.[0]) setTopStreaker({ username: normalizeUsername(streakers[0].username), streak: streakers[0].current_streak ?? 1 });
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase.from("Streaks").select("username,current_streak").order("current_streak",{ascending:false}).limit(8);
    if (data) {
      setLeaders(data.map(r => ({ username: normalizeUsername(r.username), streak: r.current_streak ?? 1, tier: getStreakTier(r.current_streak ?? 1) })));
      const days = data.slice(0,3).map(r => r.current_streak ?? 1);
      if (days.length) setPreviewDays(days);
    }
  }, []);

  const fetchRecentProofs = useCallback(async () => {
    const { data } = await supabase.from("Submissions").select("username,created_at").in("status",["pending","approved"]).order("created_at",{ascending:false}).limit(6);
    if (!data) return;
    const names = [...new Set(data.map(r => normalizeUsername(r.username)))];
    const { data: sRows } = await supabase.from("Streaks").select("username,current_streak").in("username",names);
    const sMap = {};
    (sRows ?? []).forEach(s => { sMap[normalizeUsername(s.username)] = s.current_streak ?? 1; });
    setRecentProofs(data.map(r => ({ username: normalizeUsername(r.username), streak: sMap[normalizeUsername(r.username)] ?? 1, created_at: r.created_at })));
  }, []);

  useEffect(() => { fetchStats(); fetchLeaderboard(); fetchRecentProofs(); }, []);

  // ── Challenge accept / decline ───────────────────────────────────────────
  const handleChallengeAction = useCallback(async (challenge, action) => {
    setChallengeActioning(challenge.id);
    try {
      if (action === "accept") {
        const now    = new Date().toISOString();
        const endsAt = new Date(Date.now() + challenge.duration_days * 86400000).toISOString();
        await supabase.from("Challenges").update({
          status: "active", started_at: now, ends_at: endsAt,
        }).eq("id", challenge.id);
        await supabase.from("ChallengeProgress").upsert([
          { challenge_id: challenge.id, username: challenge.challenger, days_complete: 0, status: "active" },
          { challenge_id: challenge.id, username: challenge.challenged, days_complete: 0, status: "active" },
        ], { onConflict: "challenge_id,username" });
        await supabase.from("ChallengeEvents").insert([
          { challenge_id: challenge.id, username, event_type: "accepted" },
        ]);
      } else {
        await supabase.from("Challenges").update({ status: "declined" }).eq("id", challenge.id);
        await supabase.from("ChallengeEvents").insert([
          { challenge_id: challenge.id, username, event_type: "declined" },
        ]);
      }
      // Remove from pending list
      setPendingChallenges(prev => prev.filter(c => c.id !== challenge.id));
    } catch(e) {
      console.error("challenge action failed", e);
    }
    setChallengeActioning(null);
  }, [username]);

  // ── Shield buy handler ────────────────────────────────────────────────────
  const handleBuyShield = useCallback(async () => {
    if (!username) return;
    const wallet = purchaseWallet.trim();
    if (!wallet) { setPurchaseError("Enter your wallet address."); return; }
    setPurchaseStatus("loading"); setPurchaseError("");
    const { error } = await supabase.from("ShieldPurchases").insert([{ username, wallet_address: wallet, token_amount: 50000, status: "pending" }]);
    if (error) { setPurchaseError(error.message || "Submission failed — try again."); setPurchaseStatus("error"); return; }
    setPurchaseStatus("success"); setPurchaseWallet("");
    supabase.from("ShieldPurchases").select("status,created_at").eq("username",username).order("created_at",{ascending:false}).limit(1).maybeSingle().then(({ data }) => setLatestPurchase(data ?? null));
  }, [username, purchaseWallet]);

  // ── Sunset Pass activation ────────────────────────────────────────────────
  const handleActivateSunsetPass = useCallback(async () => {
    if (!username || sunsetActivating) return;
    setSunsetActivating(true); setSunsetMsg("");
    try {
      const { data, error } = await supabase.rpc("activate_sunset_pass", { p_username: username });
      if (error) throw error;
      if (data?.status === "success") {
        setSunsetMsg(`✅ ${data.message}`);
        // Decrement local count immediately
        setUserStats(s => s ? { ...s, sunsetPasses: Math.max(0, (s.sunsetPasses ?? 1) - 1) } : s);
      } else {
        setSunsetMsg(`⚠️ ${data?.message || "Could not activate pass."}`);
      }
    } catch(e) {
      setSunsetMsg(`⚠️ ${e.message || "Activation failed."}`);
    }
    setSunsetActivating(false);
    setTimeout(() => setSunsetMsg(""), 6000);
  }, [username, sunsetActivating]);

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(async (file) => {
    if (!file || !(file instanceof Blob)) return;
    setProofFile(file);
    setImageSrc(URL.createObjectURL(file));
    setShowResult(false);
    setTimeout(() => setShowResult(true), 80);
    if (!hasUser) return;
    try {
      const today = new Date().toISOString().slice(0,10);
      const fileName = `${username}/${today}.png`;
      const { error: uploadErr } = await supabase
        .storage.from("proof-photos").upload(fileName, file, {
          contentType: file.type || "image/png", upsert: true,
        });
      if (uploadErr) console.error("[photo] upload failed:", uploadErr.message);
    } catch(e) { console.error("[photo] upload exception:", e?.message); }
  }, [username, hasUser]);

  // ── Derived display values ────────────────────────────────────────────────
  const toneColor = { success:"#4ade80", warning:T.gold, reset:T.red, neutral:T.dim }[streakTone] || T.dim;
  // resolvedStreak: the definitive value to show on the card.
  // displayStreak is authoritative — it already accounts for broken streaks
  // (returns 1 when missed 2+ days, or missed 1 day with no shield).
  // Never fall back to currentStreak (the raw DB value) because that would
  // show the old streak number even when the backend is about to reset to 1.
  const resolvedStreak = loadingUser
    ? null
    : displayStreak != null
      ? displayStreak
      : null;
  // heroDay must come AFTER resolvedStreak (TDZ — const can't be hoisted)
  const heroDay   = (hasUser && resolvedStreak != null ? resolvedStreak : null) ?? topStreaker?.streak ?? 67;
  const heroTier  = getStreakTier(heroDay);
  const heroColor = getTierColor(heroTier);
  const tier      = getStreakTier(resolvedStreak ?? currentStreak ?? 0);
  const tierColor = getTierColor(tier);

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    input,textarea{font-family:'DM Sans',sans-serif;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    .fade-1{animation:fadeUp 0.6s 0.05s ease both;}
    .fade-2{animation:fadeUp 0.6s 0.16s ease both;}
    .fade-3{animation:fadeUp 0.6s 0.26s ease both;}
    .nav-link{color:${T.dim};font-size:13px;font-weight:500;text-decoration:none;letter-spacing:0.05em;transition:color 0.2s;}
    .nav-link:hover{color:${T.white};}
    .nav-link.active{color:${T.olive};}
    .hbg-btn{background:none;border:1px solid ${T.border};border-radius:8px;padding:7px 10px;cursor:pointer;display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;transition:border-color 0.2s;flex-shrink:0;}
    .hbg-btn:hover{border-color:${T.olive};}
    .hbg-line{width:18px;height:1.5px;background:${T.white};border-radius:2px;transition:all 0.25s;}
    .menu-overlay{position:fixed;inset:0;z-index:298;background:rgba(0,0,0,0);}
    .menu-panel{position:fixed;top:56px;right:0;z-index:299;width:min(280px,90vw);
      background:${T.bg2};border-left:1px solid ${T.border};border-bottom:1px solid ${T.border};
      border-radius:0 0 0 16px;padding:8px 0 16px;
      box-shadow:-8px 8px 40px rgba(0,0,0,0.6);
      animation:menuSlide 0.18s ease both;}
    @keyframes menuSlide{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
    .menu-item{display:flex;align-items:center;gap:12px;padding:11px 22px;font-size:13px;font-weight:500;
      color:${T.muted};text-decoration:none;transition:all 0.15s;cursor:pointer;border:none;background:none;
      width:100%;text-align:left;font-family:'DM Sans',sans-serif;letter-spacing:0.02em;}
    .menu-item:hover{color:${T.white};background:rgba(255,255,255,0.04);}
    .menu-item.active{color:${T.olive};}
    .menu-divider{height:1px;background:${T.border};margin:8px 0;}
    .btn-olive{display:inline-flex;align-items:center;gap:8px;background:${T.olive};color:${T.bg};border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:13px 22px;border-radius:8px;cursor:pointer;text-decoration:none;transition:all 0.2s;}
    .btn-olive:hover{background:#a8be6a;transform:translateY(-1px);}
    .btn-ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;color:${T.white};border:1px solid ${T.border};font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:13px 22px;border-radius:8px;cursor:pointer;text-decoration:none;transition:all 0.2s;}
    .btn-ghost:hover{border-color:${T.olive};color:${T.olive};}
    .card{background:${T.bg2};border:1px solid ${T.border};padding:26px;}
    .card-title{font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${T.muted};margin-bottom:18px;}
    .card-title-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
    .view-all{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${T.dim};text-decoration:none;font-weight:500;transition:color 0.2s;}
    .view-all:hover{color:${T.olive};}
    .username-input{background:${T.bg3};border:1px solid ${T.borderG};border-radius:8px;padding:9px 13px;color:${T.white};font-size:13px;outline:none;transition:border-color 0.2s;width:160px;}
    .username-input:focus{border-color:${T.olive};}
    .username-input::placeholder{color:${T.dim};}
    input[type=text].field,textarea.field{width:100%;background:${T.bg3};border:1px solid ${T.border};border-radius:8px;padding:10px 13px;color:${T.white};font-size:13px;outline:none;transition:border-color 0.2s;resize:none;}
    input[type=text].field:focus,textarea.field:focus{border-color:${T.olive}50;}
    input[type=text].field::placeholder,textarea.field::placeholder{color:${T.dim};}
    @media(max-width:960px){.main-grid{grid-template-columns:1fr !important;}.prog-grid{grid-template-columns:1fr !important;}}
    @media(max-width:768px){
      .main-grid,.prog-grid{grid-template-columns:1fr !important;width:100% !important;max-width:100% !important;}
      .card{width:100% !important;max-width:100% !important;min-width:0 !important;border-right:none !important;}
      .stat-strip{flex-wrap:wrap !important;}
      .stat-strip>div{min-width:50% !important;}
      .hero-btns{flex-direction:column !important;align-items:stretch !important;}
      .hero-streak-hud{display:none !important;}
      .hero-left{max-width:100% !important;}
      /* nav-links replaced by hamburger menu */
      .username-input{width:120px !important;font-size:12px !important;}
      .feed-username{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;}
      .spotlight-scroll{overflow-x:auto;overflow-y:visible;scroll-snap-type:x mandatory;}
      .spotlight-scroll>*{scroll-snap-align:start;}
      .quests-banner{flex-direction:column !important;text-align:center !important;}
      .footer-cta{flex-direction:column !important;text-align:center !important;align-items:center !important;}
    }
    @media(max-width:400px){.username-input{width:100px !important;font-size:11px !important;}}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav style={{ position:"sticky", top:0, zIndex:200, display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"0 clamp(14px,4vw,48px)", height:56, gap:10,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}` }}>

          {/* Logo */}
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9,
            textDecoration:"none", flexShrink:0 }}>
            <img src="/touchgrass-transparent.png" alt=""
              style={{ width:26, height:26, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>

          {/* Username + profile + hamburger */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <input className="username-input" type="text" placeholder="your username"
              value={rawUsername} onChange={e => setRawUsername(e.target.value)}
              style={{ width:130 }} />
            {hasUser && (
              <Link href={`/u/${username}`} style={{
                fontSize:10, color:T.olive, textDecoration:"none",
                border:`1px solid ${T.borderG}`, borderRadius:6,
                padding:"5px 9px", whiteSpace:"nowrap", flexShrink:0,
              }}>My Profile →</Link>
            )}
            {/* Hamburger button */}
            <button className="hbg-btn" onClick={() => setShowMenu(v => !v)}
              aria-label="Menu" aria-expanded={showMenu}>
              <div className="hbg-line" style={{
                transform: showMenu ? "rotate(45deg) translate(4px,4px)" : "none" }} />
              <div className="hbg-line" style={{
                opacity: showMenu ? 0 : 1,
                transform: showMenu ? "scaleX(0)" : "none" }} />
              <div className="hbg-line" style={{
                transform: showMenu ? "rotate(-45deg) translate(4px,-4px)" : "none" }} />
            </button>
          </div>
        </nav>

        {/* ── MENU PANEL ───────────────────────────────────────────────────── */}
        {showMenu && (
          <>
            <div className="menu-overlay" onClick={() => setShowMenu(false)} />
            <div className="menu-panel">
              {/* Username display */}
              {hasUser && (
                <div style={{ padding:"12px 22px 10px",
                  borderBottom:`1px solid ${T.border}`, marginBottom:4 }}>
                  <div style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em",
                    textTransform:"uppercase", marginBottom:2 }}>Signed in as</div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.olive }}>@{username}</div>
                </div>
              )}

              {/* Nav items */}
              {[
                { href:"#upload",                    label:"Dashboard",    icon:"🏠", internal:true  },
                { href:"/leaderboard",               label:"Leaderboard",  icon:"🏆", internal:false },
                { href:"/spotlight",                 label:"Spotlight",    icon:"⭐", internal:false },
                { href:"/create",                    label:"Create",       icon:"✨", internal:false },
                { href:"/map",                       label:"Map",          icon:"🌍", internal:false },
                { href:"/burns",                     label:"Consumables",  icon:"🎒", internal:false },
                { href:"/quests",                    label:"Quests",       icon:"⚔️", internal:false },
                { href:"/fight",                     label:"Grass Jab",    icon:"🥊", internal:false },
                { href:"/field-guide",               label:"Field Guide",  icon:"📖", internal:false },
                { href:"/admin/milestones",           label:"Milestones",   icon:"🏆", internal:false },
              ].map(({ href, label, icon, internal }) =>
                internal ? (
                  <a key={label} href={href} className="menu-item active"
                    onClick={() => setShowMenu(false)}>
                    <span style={{ fontSize:16, width:22, textAlign:"center" }}>{icon}</span>
                    {label}
                  </a>
                ) : (
                  <Link key={label} href={href} className="menu-item"
                    onClick={() => setShowMenu(false)}>
                    <span style={{ fontSize:16, width:22, textAlign:"center" }}>{icon}</span>
                    {label}
                  </Link>
                )
              )}

              <div className="menu-divider" />

              {/* External */}
              <a href="https://touchgrass.today" target="_blank" rel="noopener noreferrer"
                className="menu-item" onClick={() => setShowMenu(false)}>
                <span style={{ fontSize:16, width:22, textAlign:"center" }}>🌐</span>
                Website
              </a>

              {/* Profile link if signed in */}
              {hasUser && (
                <>
                  <div className="menu-divider" />
                  <Link href={`/u/${username}`} className="menu-item"
                    onClick={() => setShowMenu(false)}
                    style={{ color:T.olive }}>
                    <span style={{ fontSize:16, width:22, textAlign:"center" }}>👤</span>
                    My Profile
                  </Link>
                </>
              )}

              {/* Pending challenge count badge */}
              {pendingChallenges.length > 0 && (
                <>
                  <div className="menu-divider" />
                  <div style={{ padding:"8px 22px", display:"flex",
                    alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:16 }}>⚡</span>
                    <span style={{ fontSize:12, color:T.gold, fontWeight:600 }}>
                      {pendingChallenges.length} pending challenge{pendingChallenges.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section style={{ position:"relative", minHeight:"clamp(460px,70vh,720px)", pointerEvents:"none" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"linear-gradient(155deg,#1a2d0e,#2d4a18 22%,#1e3410 52%,#0e1a08)" }}>
            <div style={{ position:"absolute", inset:0, opacity:0.2, pointerEvents:"none", backgroundImage:"radial-gradient(ellipse at 65% 35%,#4a7a28,transparent 55%),radial-gradient(ellipse at 30% 70%,#2d5a18,transparent 45%)" }} />
          </div>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"linear-gradient(90deg,rgba(14,15,11,0.92) 0%,rgba(14,15,11,0.16) 52%,rgba(14,15,11,0.80) 100%)" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"36%", pointerEvents:"none", background:"linear-gradient(180deg,transparent,rgba(14,15,11,0.97))" }} />
          <div className="hero-left" style={{ position:"absolute", left:"clamp(18px,5.5vw,76px)", top:"50%", transform:"translateY(-50%)", maxWidth:480, pointerEvents:"auto" }}>
            <div className="fade-1" style={{ fontSize:10, letterSpacing:"0.22em", color:T.olive, textTransform:"uppercase", marginBottom:12, fontWeight:600 }}>Verified Outdoors</div>
            <h1 className="fade-2" style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(44px,6.5vw,88px)", fontWeight:700, color:T.white, lineHeight:0.94, letterSpacing:"-0.02em", marginBottom:18 }}>
              Proof<br />of Grass
            </h1>
            <p className="fade-2" style={{ fontSize:15, lineHeight:1.72, marginBottom:28, maxWidth:340, fontWeight:300, color:T.muted }}>
              Log your time outside. Build your streak.<br />Earn rewards. Make a difference.
            </p>
            <div className="fade-3 hero-btns" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <a href="#upload" className="btn-olive">Log Your Proof ↑</a>
              <Link href="/leaderboard" className="btn-ghost">View Leaderboard</Link>
            </div>

            {/* ── CHANGE 4: Stats strip with Shields + Passes ──────────────── */}
            {hasUser && userStats && (
              <div className="fade-3" style={{ marginTop:24, display:"flex", gap:18, flexWrap:"wrap" }}>
                {[
                  ["Posts",   userStats.posts],
                  ["Best",    `${userStats.bestStreak}d`],
                  ["Rank",    `#${userStats.rank}`],
                  ["Shields", userStats.shields],
                  ["Passes",  userStats.sunsetPasses ?? 0],
                ].map(([label, val]) => (
                  <div key={label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:15, fontWeight:700, color:T.white, fontFamily:"'Cormorant Garamond',Georgia,serif" }}>{val}</div>
                    <div style={{ fontSize:8, color:T.dim, letterSpacing:"0.12em", textTransform:"uppercase" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasUser && resolvedStreak != null && (
            <div className="hero-streak-hud" style={{ position:"absolute", right:"clamp(18px,5.5vw,76px)", top:"50%", transform:"translateY(-50%)", textAlign:"right", pointerEvents:"auto" }}>
              {/* Show reset warning when streak is broken */}
              {resolvedStreak === 1 && currentStreak > 1 ? (
                <>
                  <div style={{ fontSize:9, letterSpacing:"0.2em", color:T.red, textTransform:"uppercase", marginBottom:8 }}>Streak Reset</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(56px,7.5vw,98px)", fontWeight:700, color:T.red, lineHeight:0.9, letterSpacing:"-0.03em" }}>
                    <span style={{ fontSize:"0.42em", color:T.red, opacity:0.6, verticalAlign:"top", lineHeight:2.4 }}>DAY </span>
                    1
                  </div>
                  <div style={{ fontSize:9, letterSpacing:"0.1em", color:"rgba(239,68,68,0.6)", marginTop:10 }}>
                    was day {currentStreak}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:9, letterSpacing:"0.2em", color:T.dim, textTransform:"uppercase", marginBottom:8 }}>Your Streak</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(56px,7.5vw,98px)", fontWeight:700, color:T.white, lineHeight:0.9, letterSpacing:"-0.03em" }}>
                    <span style={{ fontSize:"0.42em", color:T.muted, verticalAlign:"top", lineHeight:2.4 }}>DAY </span>
                    {resolvedStreak}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:7, marginTop:10 }}>
                    <div style={{ width:30, height:1, background:`linear-gradient(90deg,transparent,${tierColor})` }} />
                    <span style={{ fontSize:9, letterSpacing:"0.16em", color:tierColor, textTransform:"uppercase", fontWeight:600 }}>✦ {tier}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* ── PENDING CHALLENGE ALERTS ─────────────────────────────────────── */}
        {mounted && hasUser && pendingChallenges.length > 0 && (
          <div style={{ borderBottom:`1px solid rgba(200,168,75,0.3)`,
            background:"linear-gradient(180deg,rgba(200,168,75,0.06),rgba(200,168,75,0.02))" }}>
            {pendingChallenges.map((ch, i) => (
              <div key={ch.id} style={{
                padding:"16px clamp(14px,4vw,48px)",
                borderBottom: i < pendingChallenges.length - 1
                  ? `1px solid rgba(200,168,75,0.15)` : "none",
                display:"flex", alignItems:"center",
                gap:14, flexWrap:"wrap",
              }}>
                {/* Icon + text */}
                <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:220 }}>
                  <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
                    background:"rgba(200,168,75,0.12)",
                    border:"1px solid rgba(200,168,75,0.4)",
                    display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:20 }}>
                    ⚡
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.white, marginBottom:2 }}>
                      @{ch.challenger} challenged you!
                    </div>
                    <div style={{ fontSize:11, color:T.muted, lineHeight:1.5 }}>
                      {ch.duration_days}-day outdoor streak challenge
                      {ch.message ? ` · "${ch.message}"` : ""}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", gap:8, flexShrink:0, alignItems:"center" }}>
                  <button
                    onClick={() => handleChallengeAction(ch, "accept")}
                    disabled={challengeActioning === ch.id}
                    style={{ background:T.olive, color:"#0e1108",
                      border:"none", borderRadius:8,
                      padding:"9px 18px", fontSize:12, fontWeight:700,
                      cursor:"pointer", letterSpacing:"0.06em",
                      opacity: challengeActioning === ch.id ? 0.6 : 1,
                      transition:"all 0.2s" }}>
                    {challengeActioning === ch.id ? "…" : "✓ Accept"}
                  </button>
                  <button
                    onClick={() => handleChallengeAction(ch, "decline")}
                    disabled={challengeActioning === ch.id}
                    style={{ background:"transparent",
                      color:T.red,
                      border:`1px solid rgba(239,68,68,0.35)`,
                      borderRadius:8, padding:"9px 18px",
                      fontSize:12, fontWeight:600, cursor:"pointer",
                      opacity: challengeActioning === ch.id ? 0.6 : 1,
                      transition:"all 0.2s" }}>
                    Decline
                  </button>
                  <Link href={`/challenge/${ch.slug}`}
                    style={{ fontSize:11, color:T.gold,
                      textDecoration:"none", padding:"9px 12px",
                      borderRadius:8, border:`1px solid rgba(200,168,75,0.3)`,
                      whiteSpace:"nowrap" }}>
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PROMO BANNER — Screen Touchers ──────────────────────────────────── */}
        <div style={{ background:T.bg, paddingTop:28, paddingBottom:8 }}>
          <PromoBanner
            image="screen_touchers.png"
            title="🖥️ Screen Touchers — Mint Now"
            description="Grab your Screen Toucher. Proceeds go to support youth athletics."
            buttonText="🎨 Mint Now"
            href="https://gravemint.io/mint/nrdou0?x=none"
            secondaryText="🖼️ View Collection"
            secondaryHref="https://gravemarket.io/collection/screen-touchers"
            steps={[]}
          />
        </div>

        {/* ── ENTER USERNAME BANNER ─────────────────────────────────────────── */}
        {mounted && !hasUser && (
          <div style={{ background:`${T.olive}08`, borderBottom:`1px solid ${T.borderG}`,
            padding:"11px clamp(14px,4vw,48px)", display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:T.dim }}>Enter your username above to see your streak, log proof, and join the leaderboard.</span>
          </div>
        )}

        {/* ── STATS STRIP ──────────────────────────────────────────────────── */}
        <div className="stat-strip" style={{ display:"flex", background:T.bg2, borderBottom:`1px solid ${T.border}` }}>
          <StatCard icon="◎" value={dailyCount !== null ? dailyCount.toLocaleString() : "…"} label="Active Touchers Today" />
          <StatCard icon="◈" value={fmtBurned(totalBurned)} label="$TOUCHGRASS Burned" />
          <StatCard icon="↗" value={topStreaker ? `${topStreaker.streak}d` : "…"} sub={topStreaker ? `@${topStreaker.username}` : ""} label="Top Streak" accent />
          <StatCard icon="◉" value={totalProofs !== null ? totalProofs.toLocaleString() : "…"} label="Proofs Logged" last />
        </div>

        {/* ── COMMUNITY SPOTLIGHT ───────────────────────────────────────────── */}
        <div style={{ padding:"20px clamp(14px,4vw,32px)", background:T.bg2, borderBottom:`1px solid ${T.border}`, width:"100%", maxWidth:"100%" }}>
          <SpotlightSection />
        </div>

        {/* ── MAP PREVIEW ──────────────────────────────────────────────────── */}
        <div style={{ padding:"20px clamp(14px,4vw,32px)", background:T.bg, borderBottom:`1px solid ${T.border}`, width:"100%", maxWidth:"100%" }}>
          <MapPreviewCard />
        </div>

        {/* ── MAIN TWO-COLUMN GRID ─────────────────────────────────────────── */}
        <div className="main-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:0, background:T.border, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`,
          width:"100%", maxWidth:"100%" }}>

          {/* LOG YOUR PROOF */}
          <div id="upload" ref={uploadSectionRef} className="card" style={{ padding:26 }}>
            <div className="card-title">Log Your Proof</div>
            {!hasUser ? (
              <div style={{ border:`1.5px dashed ${T.borderG}`, borderRadius:12, padding:"32px 20px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:12, opacity:0.4 }}>🌿</div>
                <div style={{ fontSize:13, color:T.muted, marginBottom:6, fontWeight:500 }}>Enter your username to get started</div>
                <div style={{ fontSize:11, color:T.dim, marginBottom:18 }}>Type your username in the top right corner</div>
              </div>
            ) : hasPostedToday ? (
              <div style={{ border:`1px solid ${T.borderG}`, borderRadius:12, padding:"28px 18px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:10 }}>✓</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#4ade80", marginBottom:6 }}>Streak locked in for today</div>
                <div style={{ fontSize:11, color:T.dim }}>Come back tomorrow to keep your streak alive.</div>
              </div>
            ) : showResult && imageSrc && resolvedStreak !== null ? (
              <ResultCard
                imageSrc={imageSrc}
                proofFile={proofFile}
                username={username}
                initialStreak={resolvedStreak}
                onStreakUpdate={(n) => { setCurrentStreak(n); setHasPostedToday(true); }}
                hasPremiumProofs={hasPremiumProofs}
              />
            ) : showResult && imageSrc ? (
              <div style={{ padding:"32px 0", textAlign:"center" }}>
                <div style={{ fontSize:13, color:T.dim, letterSpacing:"0.08em",
                  fontFamily:"monospace" }}>⟳ loading streak…</div>
              </div>
            ) : (
              <>
                <UploadBox onUpload={handleImageUpload} />
                <div style={{ marginTop:12, padding:"10px 13px", borderRadius:8,
                  background:T.bg3, border:`1px solid ${T.border}`, fontSize:11, color:T.dim }}>
                  {resolvedStreak === 1 && currentStreak > 1
                    ? `Your streak has reset. Upload your photo to start again at Day 1.`
                    : `Upload your outdoor photo to generate your Day ${resolvedStreak} certificate.`}
                </div>
              </>
            )}

            {/* Shield alert */}
            {mounted && hasUser && missedOneDayNoShield && !hasPostedToday && (
              <div style={{ marginTop:14, padding:"12px 14px", borderRadius:10,
                border:`1px solid #7f1d1d`, background:"#100404" }}>
                <div style={{ fontSize:11, color:T.red, fontWeight:600, marginBottom:4 }}>⚠️ No shields available</div>
                <div style={{ fontSize:10, color:"rgba(239,68,68,0.6)", marginBottom:6 }}>Your streak resets if you miss today</div>
                <button onClick={() => setShowShieldBuy(true)}
                  style={{ background:"transparent", border:`1px solid ${T.red}`, color:T.red,
                    borderRadius:6, padding:"6px 12px", fontSize:10, cursor:"pointer",
                    fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                  🛡 Buy Shield
                </button>
              </div>
            )}

            {/* ── CHANGE 5: Sunset Pass reminder card ──────────────────────── */}
            {mounted && hasUser && !hasPostedToday && (userStats?.sunsetPasses ?? 0) > 0 && (
              <div style={{ marginTop:14, padding:"12px 14px", borderRadius:10,
                background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.3)" }}>
                <div style={{ fontSize:11, color:"#f97316", fontWeight:600, marginBottom:4 }}>🌅 Running late?</div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:10, lineHeight:1.5 }}>
                  Use a Sunset Pass to extend today's proof window by 2 hours.
                  You have <strong style={{ color:"#f97316" }}>{userStats.sunsetPasses}</strong> pass{userStats.sunsetPasses !== 1 ? "es" : ""}.
                </div>
                {sunsetMsg ? (
                  <div style={{ fontSize:11, color: sunsetMsg.startsWith("✅") ? "#4ade80" : "#f97316" }}>{sunsetMsg}</div>
                ) : (
                  <button onClick={handleActivateSunsetPass} disabled={sunsetActivating}
                    style={{ fontSize:11, fontWeight:700, color:"#0a0c08", background:"#f97316",
                      border:"none", borderRadius:7, padding:"8px 16px", cursor:"pointer",
                      opacity:sunsetActivating?0.7:1 }}>
                    {sunsetActivating ? "Activating…" : "🌅 Use Sunset Pass"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RECENT PROOFS */}
          <div className="card" style={{ padding:26, borderLeft:`1px solid ${T.border}` }}>
            <div className="card-title-row">
              <span className="card-title" style={{ margin:0 }}>Recent Proofs</span>
              <Link href="/leaderboard" className="view-all">View All</Link>
            </div>
            {recentProofs.length > 0
              ? recentProofs.map((p, i) => <ProofRow key={i} {...p} />)
              : [1,2,3,4,5].map(i => (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                  <Skeleton w={44} h={44} />
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}><Skeleton h={10} /><Skeleton w="55%" h={8} /></div>
                </div>
              ))
            }
          </div>

        </div>

        {/* ── PROGRESSION + CARDS ───────────────────────────────────────────── */}
        <div className="prog-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:0, background:T.border, borderBottom:`1px solid ${T.border}`,
          width:"100%", maxWidth:"100%" }}>

          {/* PROGRESSION */}
          <div className="card" style={{ padding:28, borderRight:`1px solid ${T.border}` }}>
            <div className="card-title">Your Progression</div>
            {hasUser && currentStreak > 0 ? (
              <>
                <div style={{ display:"flex", gap:6, marginBottom:20, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
                  <TierBadge name="Rooted"    day={14}  completed={currentStreak>=14}  active={currentStreak>=7   && currentStreak<14} />
                  <TierBadge name="Elite"     day={30}  completed={currentStreak>=30}  active={currentStreak>=14  && currentStreak<30} />
                  <TierBadge name="Legendary" day={50}  completed={currentStreak>=50}  active={currentStreak>=30  && currentStreak<50} />
                  <TierBadge name="Immortal"  day={100} completed={currentStreak>=100} active={currentStreak>=50  && currentStreak<100} />
                  <TierBadge name="Mythic"    day={180} completed={currentStreak>=180} active={currentStreak>=100 && currentStreak<180} />
                  <TierBadge name="Eternal"   day={365} completed={currentStreak>=365} active={currentStreak>=180 && currentStreak<365} />
                  <TierBadge name="Ascended"  day={500} completed={currentStreak>=500} active={currentStreak>=365 && currentStreak<500} />
                </div>
                {(() => {
                  const thr = [0,7,14,30,50,100];
                  const prev = [...thr].reverse().find(t => currentStreak >= t) ?? 0;
                  const next = thr.find(t => t > currentStreak);
                  const fill = next ? Math.round(((currentStreak - prev)/(next - prev))*100) : 100;
                  const left = next ? next - currentStreak : 0;
                  return (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:8 }}>
                        <div>
                          <div style={{ fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", color:T.dim, marginBottom:2 }}>Next Milestone</div>
                          {left > 0 && (
                            <div style={{ fontSize:13, color:T.olive, fontWeight:700 }}>
                              {left} day{left!==1?"s":""} to <span style={{ color:T.gold }}>{next ? getStreakTier(next) : "Immortal"}</span>
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize:11, color:T.dim, fontFamily:"monospace" }}>{currentStreak} / {next ?? "∞"}</span>
                      </div>
                      <div style={{ height:5, background:T.bg3, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${fill}%`, background:`linear-gradient(90deg,${T.olive},${T.gold})`, borderRadius:3, transition:"width 1.2s ease", boxShadow:`0 0 8px ${T.olive}40` }} />
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"28px 0" }}>
                <div style={{ fontSize:11, color:T.dim, marginBottom:16 }}>Enter your username to see your progression</div>
                <input className="username-input" type="text" placeholder="your username"
                  value={rawUsername} onChange={e => setRawUsername(e.target.value)} style={{ width:180 }} />
              </div>
            )}

            {/* Shield section */}
            <div id="shield-section" style={{ marginTop:20, padding:"14px 16px", borderRadius:10, background:T.bg3, border:`1px solid ${T.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: showShieldBuy ? 14 : 0 }}>
                <span style={{ fontSize:18 }}>🛡</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.white }}>Shield Protection</div>
                  <div style={{ fontSize:10, color:T.dim }}>50,000 $TOUCHGRASS · Protect your streak</div>
                </div>
                <button onClick={() => setShowShieldBuy(v => !v)}
                  style={{ background:"transparent", border:`1px solid ${T.borderG}`, color:T.olive,
                    borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>
                  {showShieldBuy ? "Close" : "Buy →"}
                </button>
              </div>
              {showShieldBuy && (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <a href={buildSolanaPayUrl()}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                      background:"linear-gradient(135deg,#93a85a,#7a9148)", color:"#0e1108",
                      borderRadius:8, padding:"11px 14px", fontSize:12, fontWeight:700,
                      textDecoration:"none", letterSpacing:"0.02em" }}>
                    ⚡ Open in Wallet — Pay 50,000 $TOUCHGRASS
                  </a>
                  <div style={{ fontSize:9.5, color:T.dim, textAlign:"center" }}>
                    Opens your wallet app with the payment pre-filled. You review and approve it there.
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                    padding:"14px 0", borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, margin:"4px 0" }}>
                    <img src={buildQrCodeUrl(buildSolanaPayUrl())} alt="Scan to pay with Solana wallet"
                      style={{ width:140, height:140, borderRadius:8, border:`1px solid ${T.border}` }} />
                    <div style={{ fontSize:9.5, color:T.dim }}>Scan with your wallet app</div>
                  </div>
                  <div style={{ fontSize:10, color:T.dim, marginBottom:2 }}>
                    Or send manually to <span style={{ color:T.olive }}>{SOL_DOMAIN}</span>
                    {" "}(<span style={{ fontSize:9 }}>{BURN_ADDR.slice(0,8)}…</span>), then submit below.
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => { navigator.clipboard.writeText(SOL_DOMAIN).catch(()=>{}); setCopiedDomain(true); setShowPasteTip(true); setTimeout(()=>setCopiedDomain(false),1500); }}
                      style={{ flex:1, background:"transparent", border:`1px solid ${T.borderG}`, color: copiedDomain ? "#4ade80" : T.olive, borderRadius:6, padding:"7px 10px", fontSize:10, cursor:"pointer", fontWeight:600 }}>
                      {copiedDomain ? "✓ copied" : "Copy Domain"}
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(BURN_ADDR).catch(()=>{}); setCopiedAddr(true); setShowPasteTip(true); setTimeout(()=>setCopiedAddr(false),1500); }}
                      style={{ flex:1, background:"transparent", border:`1px solid ${T.borderG}`, color: copiedAddr ? "#4ade80" : T.olive, borderRadius:6, padding:"7px 10px", fontSize:10, cursor:"pointer", fontWeight:600 }}>
                      {copiedAddr ? "✓ copied" : "Copy Address"}
                    </button>
                  </div>
                  {showPasteTip && <div style={{ fontSize:10, color:T.dim }}>Submit your wallet address below once sent — we'll verify on-chain.</div>}
                  <input type="text" className="field" placeholder="Your wallet address" value={purchaseWallet} onChange={e => setPurchaseWallet(e.target.value)} />
                  {purchaseError && <div style={{ fontSize:10, color:T.red }}>{purchaseError}</div>}
                  {latestPurchase && purchaseStatus !== "success" && (
                    <div style={{ fontSize:10, color: latestPurchase.status==="approved" ? "#4ade80" : latestPurchase.status==="rejected" ? T.red : T.gold }}>
                      {latestPurchase.status==="approved" ? "✅ Shield credited" : latestPurchase.status==="rejected" ? "❌ Rejected — wallet not verified" : "⏳ Pending review"}
                    </div>
                  )}
                  <button className="btn-olive" style={{ justifyContent:"center" }}
                    onClick={handleBuyShield} disabled={purchaseStatus==="loading"}>
                    {purchaseStatus==="loading" ? "Submitting…" : purchaseStatus==="success" ? "✓ Submitted!" : "🛡 Submit Shield Purchase"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RECENT MILESTONES */}
          <div className="card" style={{ padding:28 }}>
            <RecentMilestones />
          </div>

          {/* ACTIVITY FEED */}
          <div className="card" style={{ padding:28 }}>
            <ActivityFeed />
          </div>
        </div>

        {/* ── QUESTS BANNER ─────────────────────────────────────────────────── */}
        <div style={{ margin:"0", padding:"24px clamp(14px,4vw,48px)", background:T.bg2,
          borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:16, flexWrap:"wrap", width:"100%", maxWidth:"100%" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, minWidth:0 }}>
            <div style={{ width:48, height:48, borderRadius:12, flexShrink:0,
              background:`${T.olive}14`, border:`1px solid ${T.borderG}`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>⭐</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.white, marginBottom:2 }}>Community Quests</div>
              <div style={{ fontSize:11, color:T.dim }}>Complete quests, earn XP, unlock badges, vote on DexScreener.</div>
            </div>
          </div>
          <Link href="/quests" style={{ display:"inline-flex", alignItems:"center", gap:6,
            background:T.olive, color:"#0e1108", fontFamily:"'DM Sans',sans-serif",
            fontSize:12, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
            padding:"10px 20px", borderRadius:8, textDecoration:"none", flexShrink:0,
            transition:"background 0.2s", whiteSpace:"nowrap" }}>
            View Quests →
          </Link>
        </div>

        {/* ── FOOTER CTA ────────────────────────────────────────────────────── */}
        <section style={{ position:"relative", padding:"88px clamp(18px,5vw,72px)",
          textAlign:"center", overflow:"hidden", width:"100%", maxWidth:"100%",
          background:`linear-gradient(180deg,${T.bg} 0%,#111408 100%)` }}>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
            width:"min(500px,100vw)", height:"min(500px,100vw)", borderRadius:"50%",
            background:`radial-gradient(circle,${T.olive}0e 0%,transparent 70%)`, pointerEvents:"none" }} />
          <div style={{ position:"relative" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:60, height:60, objectFit:"contain", opacity:0.7, marginBottom:20 }} />
            <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(32px,5vw,68px)",
              fontWeight:700, color:T.white, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:12 }}>
              Go outside.<br /><span style={{ color:T.olive }}>Prove it.</span><br />Make a difference.
            </h2>
            <p style={{ fontSize:14, color:T.dim, marginBottom:36, fontWeight:300 }}>Every proof plants impact.</p>
            <a href="#upload" className="btn-olive" style={{ fontSize:14, padding:"14px 34px" }}>Start Your Streak ↑</a>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer style={{ borderTop:`1px solid ${T.border}`, padding:"20px clamp(14px,4vw,48px)",
          display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
          background:T.bg, width:"100%", maxWidth:"100%" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:16, height:16, opacity:0.45 }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:13, color:T.dim }}>touch grass © 2024</span>
          </div>
          <div style={{ display:"flex", gap:22, flexWrap:"wrap" }}>
            {[["Leaderboard","/leaderboard"],["Website","https://touchgrass.today"],["X (Twitter)","https://twitter.com/XTouchGrass"]].map(([label,href]) => (
              <Link key={label} href={href} style={{ fontSize:10, color:T.dim, textDecoration:"none", letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontSize:10, color:T.dim, letterSpacing:"0.1em" }}>BUILT ON ◎ SOLANA</div>
        </footer>

      </div>
    </>
  );
}