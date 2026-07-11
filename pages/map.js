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

const US_STATES_COUNT  = 50;
const COUNTRIES_COUNT  = 195;

const LeafletMap = dynamic(() => import("../components/ProofMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div style={{ height:"clamp(420px,55vh,620px)", background:"#0a0c08", borderRadius:16,
      display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:28, opacity:0.3 }}>🌍</div>
      <span style={{ color:T.dim, fontSize:13, letterSpacing:"0.06em" }}>Loading map…</span>
    </div>
  ),
});

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MapPage() {
  const [loading,          setLoading]          = useState(true);
  const [regions,          setRegions]          = useState([]);
  const [stats,            setStats]            = useState({ totalProofs:0, regionCount:0, countryCount:0, activeTouchers:0 });
  const [drawerData,       setDrawerData]       = useState(null);
  const [statesTouched,    setStatesTouched]    = useState(0);
  const [countriesTouched, setCountriesTouched] = useState(0);
  const [countryNames,     setCountryNames]     = useState(new Set());
  const [topRegions,       setTopRegions]       = useState([]);

  useEffect(() => {
    (async () => {
      const { data: subs } = await supabase
        .from("Submissions")
        .select("username,location_label,location_city,location_region,location_country,location_lat_rounded,location_lng_rounded,location_source,created_at")
        .not("location_source", "eq", "none")
        .in("status", ["pending","approved"])
        .order("created_at", { ascending: false })
        .limit(5000);

      const rows = subs ?? [];

      // ── Aggregate by unique rounded coordinate pair ────────────────────
      // Key by lat+lng so every distinct location gets its own marker.
      // This fixes the bug where multiple regions shared the same rounded
      // coords and only one cluster appeared.
      const byCoord = {};
      rows.forEach(r => {
        if (r.location_lat_rounded == null || r.location_lng_rounded == null) return;
        const key = `${r.location_lat_rounded},${r.location_lng_rounded}`;
        if (!byCoord[key]) {
          byCoord[key] = {
            label:     r.location_label || r.location_city || "Nearby Region",
            lat:       r.location_lat_rounded,
            lng:       r.location_lng_rounded,
            country:   r.location_country,
            region:    r.location_region,
            count:     0,
            usernames: new Set(),
            mostRecent: r.created_at,
          };
        }
        byCoord[key].count += 1;
        byCoord[key].usernames.add(r.username);
        if (r.created_at > byCoord[key].mostRecent) byCoord[key].mostRecent = r.created_at;
      });

      const aggregated = Object.values(byCoord).map(r => ({
        ...r,
        usernames: [...r.usernames],
      }));

      setRegions(aggregated);

      // ── Stats ──────────────────────────────────────────────────────────
      const uniqueCountries = new Set(rows.map(r => r.location_country).filter(Boolean));
      const uniqueLabels    = new Set(rows.map(r => r.location_label).filter(Boolean));
      const uniqueUsers     = new Set(rows.map(r => r.username));
      const uniqueUSStates  = new Set(
        rows.filter(r => ["United States","USA","US"].includes(r.location_country))
          .map(r => r.location_region).filter(Boolean)
      );

      setStats({
        totalProofs:    rows.length,
        regionCount:    uniqueLabels.size,
        countryCount:   uniqueCountries.size,
        activeTouchers: uniqueUsers.size,
      });
      setStatesTouched(uniqueUSStates.size);
      setCountriesTouched(uniqueCountries.size);
      setCountryNames(uniqueCountries); // passed to map for green tint

      // ── Top regions for sidebar ────────────────────────────────────────
      const sorted = [...aggregated].sort((a, b) => b.count - a.count).slice(0, 8);
      setTopRegions(sorted);

      setLoading(false);
    })();
  }, []);

  const onRegionClick = useCallback(async (region) => {
    setDrawerData({ ...region, loading: true });
    if (region.usernames?.length) {
      const { data: streaks } = await supabase
        .from("Streaks")
        .select("username,current_streak,best_streak")
        .in("username", region.usernames.slice(0, 50));
      const sorted = (streaks ?? []).sort((a, b) => (b.best_streak ?? 0) - (a.best_streak ?? 0));
      setDrawerData({
        ...region,
        loading:       false,
        topToucher:    sorted[0]?.username ?? null,
        longestStreak: sorted[0]?.best_streak ?? null,
        recentUsers:   region.usernames.slice(0, 5),
      });
    } else {
      setDrawerData({ ...region, loading: false });
    }
  }, []);

  const closeDrawer = () => setDrawerData(null);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{overflow-x:hidden;}
    body{background:${T.bg};color:${T.white};font-family:'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:${T.bg};}
    ::-webkit-scrollbar-thumb{background:${T.olive}40;border-radius:2px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
    @keyframes greenPulse{0%,100%{opacity:0.7;}50%{opacity:1;}}
    .fade{animation:fadeUp 0.5s ease both;}
    .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
    @media(max-width:640px){.stat-grid{grid-template-columns:repeat(2,1fr);}}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);z-index:998;}
    .drawer{position:fixed;left:0;right:0;bottom:0;z-index:999;
      background:${T.bg2};border-top:1px solid ${T.borderGold};border-radius:20px 20px 0 0;
      padding:24px clamp(16px,5vw,32px) 40px;
      box-shadow:0 -20px 60px rgba(0,0,0,0.6);}
    @media(min-width:768px){
      .drawer{left:auto;right:24px;bottom:24px;border-radius:18px;width:380px;border:1px solid ${T.borderGold};}
    }
    .top-region-row{display:flex;align-items:center;gap:10px;padding:10px 0;
      border-bottom:1px solid ${T.border};cursor:pointer;transition:opacity 0.15s;}
    .top-region-row:hover{opacity:0.75;}
    .top-region-row:last-child{border-bottom:none;}
    .goals-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    @media(max-width:480px){.goals-grid{grid-template-columns:1fr;}}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* NAV */}
        <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex",
          alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(14px,4vw,48px)", height:56,
          background:`${T.bg}ec`, backdropFilter:"blur(18px)",
          borderBottom:`1px solid ${T.border}` }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
            <img src="/touchgrass-transparent.png" alt=""
              style={{ width:26, height:26, objectFit:"contain" }} />
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
              fontSize:17, fontWeight:700, color:T.white }}>touch grass</span>
          </Link>
          <Link href="/" style={{ fontSize:11, color:T.olive, textDecoration:"none" }}>← Dashboard</Link>
        </nav>

        {/* HERO */}
        <div style={{ padding:"40px clamp(14px,5vw,64px) 28px",
          background:"linear-gradient(180deg,#0a0f07 0%,#080a06 100%)",
          borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:10, letterSpacing:"0.22em", color:T.gold,
            textTransform:"uppercase", marginBottom:10, fontWeight:600 }}>
            🌍 Global Movement
          </div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
            fontSize:"clamp(32px,5.5vw,56px)", fontWeight:700, color:T.white,
            lineHeight:1, letterSpacing:"-0.02em", marginBottom:12 }}>
            Proof of Grass Map
          </h1>
          <p style={{ fontSize:13, color:T.dim, fontWeight:300, maxWidth:520, lineHeight:1.7, marginBottom:24 }}>
            Every marker is a real person who went outside. Watch the world turn green.
          </p>

          {/* Countries greened progress — hero stat */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:14,
            background:`${T.olive}0a`, border:`1px solid ${T.borderG}`,
            borderRadius:12, padding:"12px 20px" }}>
            <div style={{ fontSize:28, animation:"greenPulse 3s ease-in-out infinite" }}>🌿</div>
            <div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:4 }}>
                <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:28, fontWeight:700, color:T.olive }}>
                  {loading ? "—" : countriesTouched}
                </span>
                <span style={{ fontSize:13, color:T.dim }}>/ {COUNTRIES_COUNT} countries greened</span>
              </div>
              <div style={{ height:5, width:240, background:T.bg3, borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%",
                  width:`${loading ? 0 : Math.min(100,(countriesTouched/COUNTRIES_COUNT)*100)}%`,
                  background:`linear-gradient(90deg,${T.olive},${T.gold})`,
                  borderRadius:3, transition:"width 1.5s ease" }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:"24px clamp(14px,5vw,64px)" }}>

          {/* STATS STRIP */}
          <div className="stat-grid fade" style={{ marginBottom:20 }}>
            {[
              { label:"Proofs Logged",    value:stats.totalProofs,    icon:"🌿", accent:false },
              { label:"Unique Regions",   value:stats.regionCount,    icon:"📍", accent:false },
              { label:"Countries",        value:stats.countryCount,   icon:"🌍", accent:true  },
              { label:"Active Touchers",  value:stats.activeTouchers, icon:"🏃", accent:false },
            ].map(({ label, value, icon, accent }) => (
              <div key={label} style={{ background:T.bg2,
                border:`1px solid ${accent ? T.borderGold : T.border}`,
                borderRadius:12, padding:"16px 14px", textAlign:"center",
                boxShadow: accent ? "0 0 20px rgba(200,168,75,0.06)" : "none" }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                  fontSize:"clamp(22px,3vw,32px)", fontWeight:700,
                  color: accent ? T.gold : T.white }}>
                  {loading ? "—" : value.toLocaleString()}
                </div>
                <div style={{ fontSize:9, color:T.dim, textTransform:"uppercase",
                  letterSpacing:"0.1em", marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* MAP */}
          <div style={{ borderRadius:16, overflow:"hidden",
            border:`1px solid ${T.borderGold}`,
            boxShadow:"0 0 40px rgba(147,168,90,0.06), 0 0 80px rgba(0,0,0,0.4)",
            marginBottom:20 }}>
            <LeafletMap
              regions={regions}
              onRegionClick={onRegionClick}
              countryCodes={countryNames}
            />
          </div>

          {/* PRIVACY NOTE */}
          <div style={{ display:"flex", alignItems:"center", gap:8,
            fontSize:11, color:T.dim, marginBottom:24,
            padding:"10px 14px", background:T.bg2, borderRadius:10,
            border:`1px solid ${T.border}` }}>
            <span>🔒</span>
            Approximate locations only. Exact coordinates are never stored or displayed.
          </div>

          {/* COMMUNITY GOALS */}
          <div className="goals-grid" style={{ marginBottom:28 }}>
            {[
              { label:"🇺🇸 US States Greened",    val:statesTouched,    max:US_STATES_COUNT,  color:T.olive },
              { label:"🌍 Countries Greened",      val:countriesTouched, max:COUNTRIES_COUNT,  color:T.gold  },
            ].map(({ label, val, max, color }) => (
              <div key={label} style={{ background:T.bg2,
                border:`1px solid ${T.border}`, borderRadius:14, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:T.dim, textTransform:"uppercase",
                  letterSpacing:"0.1em", marginBottom:10 }}>{label}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:12 }}>
                  <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:30, fontWeight:700, color }}>
                    {loading ? "—" : val}
                  </span>
                  <span style={{ fontSize:14, color:T.dim }}>/ {max}</span>
                  <span style={{ fontSize:11, color, marginLeft:"auto",
                    fontWeight:600 }}>
                    {loading ? "" : `${((val/max)*100).toFixed(1)}%`}
                  </span>
                </div>
                <div style={{ height:6, background:T.bg3, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%",
                    width:`${loading ? 0 : Math.min(100,(val/max)*100)}%`,
                    background:`linear-gradient(90deg,${color}cc,${color})`,
                    borderRadius:3, transition:"width 1.5s ease 0.3s" }} />
                </div>
              </div>
            ))}
          </div>

          {/* TOP REGIONS */}
          {topRegions.length > 0 && (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`,
              borderRadius:14, padding:"20px", marginBottom:28 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                textTransform:"uppercase", color:T.dim, marginBottom:16 }}>
                🔥 Most Active Regions
              </div>
              {topRegions.map((r, i) => {
                const maxCount = topRegions[0]?.count ?? 1;
                const pct = Math.round((r.count / maxCount) * 100);
                return (
                  <div key={i} className="top-region-row"
                    onClick={() => onRegionClick(r)}>
                    <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                      fontSize:18, fontWeight:700, color:T.dim,
                      width:22, flexShrink:0 }}>{i + 1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.white,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {r.label}
                      </div>
                      {r.country && (
                        <div style={{ fontSize:10, color:T.dim }}>
                          {[r.region, r.country].filter(Boolean).join(", ")}
                        </div>
                      )}
                      <div style={{ height:3, background:T.bg3, borderRadius:2,
                        overflow:"hidden", marginTop:5 }}>
                        <div style={{ height:"100%", width:`${pct}%`,
                          background:`linear-gradient(90deg,${T.olive},${T.gold})`,
                          borderRadius:2 }} />
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:T.gold,
                        fontFamily:"'Cormorant Garamond',Georgia,serif" }}>{r.count}</div>
                      <div style={{ fontSize:9, color:T.dim }}>proofs</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* REGION DRAWER */}
        {drawerData && (
          <>
            <div className="drawer-overlay" onClick={closeDrawer} />
            <div className="drawer">
              <div style={{ width:36, height:4, background:"rgba(255,255,255,0.15)",
                borderRadius:2, margin:"0 auto 20px" }} />
              <div style={{ display:"flex", alignItems:"flex-start",
                justifyContent:"space-between", marginBottom:18, gap:12 }}>
                <div>
                  <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",
                    fontSize:22, fontWeight:700, color:T.white,
                    marginBottom:4 }}>{drawerData.label}</h2>
                  {drawerData.country && (
                    <div style={{ fontSize:11, color:T.dim }}>
                      {[drawerData.region, drawerData.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
                <button onClick={closeDrawer}
                  style={{ background:"none", border:"none", color:T.dim,
                    fontSize:20, cursor:"pointer", flexShrink:0, lineHeight:1 }}>✕</button>
              </div>

              {drawerData.loading ? (
                <div style={{ height:120, display:"flex", alignItems:"center",
                  justifyContent:"center", color:T.dim, fontSize:12 }}>
                  Loading…
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                  {[
                    ["Proofs Logged",    drawerData.count,                   T.gold],
                    ["Active Touchers",  drawerData.usernames?.length ?? 0,  T.olive],
                    ["Longest Streak",   drawerData.longestStreak != null ? `${drawerData.longestStreak}d` : null, "#f97316"],
                    ["Most Recent",      timeAgo(drawerData.mostRecent),      T.muted],
                  ].filter(([, val]) => val != null).map(([label, val, col], i, arr) => (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", padding:"12px 0",
                      borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <span style={{ fontSize:12, color:T.dim }}>{label}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:col }}>{val}</span>
                    </div>
                  ))}

                  {drawerData.topToucher && (
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", padding:"12px 0",
                      borderTop:`1px solid ${T.border}` }}>
                      <span style={{ fontSize:12, color:T.dim }}>Top Toucher</span>
                      <Link href={`/u/${drawerData.topToucher}`}
                        style={{ fontSize:13, fontWeight:700, color:T.olive,
                          textDecoration:"none" }}>
                        @{drawerData.topToucher}
                      </Link>
                    </div>
                  )}

                  {/* Recent users */}
                  {drawerData.recentUsers?.length > 0 && (
                    <div style={{ marginTop:16, padding:"14px",
                      background:T.bg3, borderRadius:10,
                      border:`1px solid ${T.border}` }}>
                      <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em",
                        textTransform:"uppercase", color:T.dim, marginBottom:10 }}>
                        Grass Touchers Here
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                        {drawerData.recentUsers.map(u => (
                          <Link key={u} href={`/u/${u}`} style={{
                            fontSize:11, fontWeight:600, color:T.olive,
                            textDecoration:"none", padding:"3px 9px",
                            background:`${T.olive}12`,
                            border:`1px solid ${T.borderG}`,
                            borderRadius:20 }}>
                            @{u}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </>
  );
}