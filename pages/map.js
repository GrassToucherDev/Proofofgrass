import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "../utils/supabase";

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)", borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
};

// US states for community goal denominator
const US_STATES_COUNT = 50;
const COUNTRIES_COUNT = 195;

// Dynamic import — Leaflet needs `window`, can't SSR
const LeafletMap = dynamic(() => import("../components/ProofMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div style={{ height:480, background:"#0a0c08", borderRadius:16,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ color:T.dim, fontSize:13 }}>Loading map…</span>
    </div>
  ),
});

export default function MapPage() {
  const [loading, setLoading]   = useState(true);
  const [regions, setRegions]   = useState([]); // [{label, lat, lng, count, country, region}]
  const [stats, setStats]       = useState({ totalProofs:0, regionCount:0, countryCount:0, activeTouchers:0 });
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [drawerData, setDrawerData] = useState(null);
  const [statesTouched, setStatesTouched] = useState(0);
  const [countriesTouched, setCountriesTouched] = useState(0);

  useEffect(() => {
    (async () => {
      // Fetch all submissions that have location data
      const { data: subs } = await supabase
        .from("Submissions")
        .select("username,location_label,location_city,location_region,location_country,location_lat_rounded,location_lng_rounded,location_source,created_at")
        .not("location_source", "eq", "none")
        .in("status", ["pending","approved"])
        .order("created_at", { ascending:false })
        .limit(5000);

      const rows = subs ?? [];

      // Aggregate by label (rounded coords for gps, city+region for manual)
      const byLabel = {};
      rows.forEach(r => {
        const key = r.location_label || `${r.location_lat_rounded},${r.location_lng_rounded}`;
        if (!key || key === "null,null") return;
        if (!byLabel[key]) {
          byLabel[key] = {
            label: r.location_label || "Nearby Region",
            lat: r.location_lat_rounded,
            lng: r.location_lng_rounded,
            country: r.location_country,
            region: r.location_region,
            count: 0,
            usernames: new Set(),
            mostRecent: r.created_at,
          };
        }
        byLabel[key].count += 1;
        byLabel[key].usernames.add(r.username);
        if (r.created_at > byLabel[key].mostRecent) byLabel[key].mostRecent = r.created_at;
      });

      const aggregated = Object.values(byLabel).map(r => ({ ...r, usernames: [...r.usernames] }));
      setRegions(aggregated.filter(r => r.lat != null && r.lng != null));

      const uniqueCountries = new Set(rows.map(r => r.location_country).filter(Boolean));
      const uniqueRegionsUS = new Set(rows.filter(r => r.location_country === "United States" || r.location_country === "USA" || r.location_country === "US").map(r => r.location_region).filter(Boolean));
      const uniqueLabels = new Set(rows.map(r => r.location_label).filter(Boolean));
      const uniqueUsers = new Set(rows.map(r => r.username));

      setStats({
        totalProofs: rows.length,
        regionCount: uniqueLabels.size,
        countryCount: uniqueCountries.size,
        activeTouchers: uniqueUsers.size,
      });
      setStatesTouched(uniqueRegionsUS.size);
      setCountriesTouched(uniqueCountries.size);
      setLoading(false);
    })();
  }, []);

  const onRegionClick = useCallback(async (region) => {
    setSelectedRegion(region);
    // Fetch top toucher + longest streak for this region's usernames
    if (region.usernames?.length) {
      const { data: streaks } = await supabase
        .from("Streaks")
        .select("username,current_streak,best_streak")
        .in("username", region.usernames);

      const sorted = (streaks ?? []).sort((a,b) => (b.best_streak??0) - (a.best_streak??0));
      const topToucher = sorted[0];

      setDrawerData({
        ...region,
        topToucher: topToucher?.username ?? null,
        longestStreak: topToucher?.best_streak ?? null,
      });
    } else {
      setDrawerData(region);
    }
  }, []);

  const closeDrawer = () => { setSelectedRegion(null); setDrawerData(null); };

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    .stat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media(max-width:640px){ .stat-grid{ grid-template-columns:repeat(2,1fr); } }
    .drawer-overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:998; }
    .drawer{ position:fixed; left:0; right:0; bottom:0; z-index:999;
      background:${T.bg2}; border-top:1px solid ${T.borderGold}; border-radius:20px 20px 0 0;
      padding:24px clamp(16px,5vw,32px) 32px; max-width:560px; margin:0 auto;
      box-shadow:0 -20px 60px rgba(0,0,0,0.5); }
    @media(min-width:768px){
      .drawer{ left:auto; right:24px; bottom:24px; border-radius:18px; width:380px; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width:26,height:26,objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>
          <Link href="/" style={{ fontSize:11, color:T.olive, textDecoration:"none" }}>← Dashboard</Link>
        </nav>

        {/* HERO */}
        <div style={{ padding:"40px clamp(14px,5vw,64px) 24px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.gold, textTransform:"uppercase", marginBottom:10, fontWeight:600 }}>
            Global Movement
          </div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(32px,5.5vw,56px)",
            fontWeight:700, color:T.white, lineHeight:1, letterSpacing:"-0.02em", marginBottom:10 }}>
            Proof of Grass Map
          </h1>
          <p style={{ fontSize:13, color:T.dim, fontWeight:300, maxWidth:480, lineHeight:1.6 }}>
            Outdoor proofs from around the community.
          </p>
        </div>

        <div style={{ padding:"28px clamp(14px,5vw,64px)" }}>

          {/* STATS */}
          <div className="stat-grid" style={{ marginBottom:24 }}>
            {[
              ["Proofs", stats.totalProofs],
              ["Regions", stats.regionCount],
              ["Countries", stats.countryCount],
              ["Active Touchers", stats.activeTouchers],
            ].map(([label, value]) => (
              <div key={label} style={{ background:T.bg2, border:`1px solid ${T.border}`,
                borderRadius:12, padding:"16px 14px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:28,
                  fontWeight:700, color:T.gold }}>
                  {loading ? "—" : value.toLocaleString()}
                </div>
                <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase",
                  letterSpacing:"0.08em", marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* MAP */}
          <div style={{ borderRadius:16, overflow:"hidden", border:`1px solid ${T.borderGold}`,
            boxShadow:"0 0 30px rgba(200,168,75,0.08)", marginBottom:24 }}>
            <LeafletMap regions={regions} onRegionClick={onRegionClick} />
          </div>

          {/* PRIVACY NOTE */}
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:11.5, color:T.dim,
            marginBottom:32, padding:"10px 14px", background:T.bg2, borderRadius:10,
            border:`1px solid ${T.border}` }}>
            <span>🔒</span>
            We only show approximate locations. Exact location is never displayed.
          </div>

          {/* COMMUNITY GOALS */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:32 }}>
            {[
              ["States Touched", statesTouched, US_STATES_COUNT],
              ["Countries Touched", countriesTouched, COUNTRIES_COUNT],
            ].map(([label, val, max]) => (
              <div key={label} style={{ background:T.bg2, border:`1px solid ${T.border}`,
                borderRadius:14, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase",
                  letterSpacing:"0.1em", marginBottom:8 }}>{label}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:24,
                  fontWeight:700, color:T.white, marginBottom:10 }}>
                  {val} <span style={{ fontSize:14, color:T.dim, fontWeight:400 }}>/ {max}</span>
                </div>
                <div style={{ height:6, background:T.bg3, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(100,(val/max)*100)}%`,
                    background:`linear-gradient(90deg,${T.olive},${T.gold})`, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* REGION DRAWER */}
        {drawerData && (
          <>
            <div className="drawer-overlay" onClick={closeDrawer} />
            <div className="drawer">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
                <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:24,
                  fontWeight:700, color:T.white }}>{drawerData.label}</h2>
                <button onClick={closeDrawer}
                  style={{ background:"none", border:"none", color:T.dim, fontSize:20, cursor:"pointer" }}>✕</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0",
                  borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:12, color:T.dim }}>Proofs Logged</span>
                  <span style={{ fontSize:14, fontWeight:700, color:T.gold }}>{drawerData.count}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0",
                  borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:12, color:T.dim }}>Active Touchers</span>
                  <span style={{ fontSize:14, fontWeight:700, color:T.white }}>{drawerData.usernames?.length ?? 0}</span>
                </div>
                {drawerData.topToucher && (
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0",
                    borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:12, color:T.dim }}>Top Toucher</span>
                    <Link href={`/u/${drawerData.topToucher}`}
                      style={{ fontSize:13, fontWeight:700, color:T.olive, textDecoration:"none" }}>
                      @{drawerData.topToucher}
                    </Link>
                  </div>
                )}
                {drawerData.longestStreak != null && (
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0",
                    borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:12, color:T.dim }}>Longest Streak</span>
                    <span style={{ fontSize:14, fontWeight:700, color:"#f97316" }}>{drawerData.longestStreak} Days</span>
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0" }}>
                  <span style={{ fontSize:12, color:T.dim }}>Most Recent Proof</span>
                  <span style={{ fontSize:12, color:T.muted }}>{timeAgo(drawerData.mostRecent)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}