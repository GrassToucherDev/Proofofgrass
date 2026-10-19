// pages/map.js — Proof of Grass community map (V2 design)
// Shows where people chose to share an approximate location with their daily proof.
import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { V2, V2GlobalCSS } from "../utils/v2Theme";
import V2Nav from "../components/V2Nav";
import V2BottomNav from "../components/V2BottomNav";

const CommunityMap = dynamic(() => import("../components/CommunityMap"), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "#dcecf6" }} />,
});

const RANGES = [
  { id: "all",   label: "All time"  },
  { id: "week",  label: "This week" },
  { id: "today", label: "Today"     },
];
const RANGE_NOTE = {
  all:   "Showing all-time proofs",
  week:  "Showing the last 7 days (UTC)",
  today: "Showing today, UTC",
};

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function Avatar({ p, size = 40 }) {
  const [bad, setBad] = useState(false);
  const base = { width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#d8f0c0,#b8e08a)", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(26,74,10,0.15)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: size * 0.5 };
  if (p.avatarUrl && !bad) return <img src={p.avatarUrl} alt="" loading="lazy" width={size} height={size} onError={() => setBad(true)} style={{ ...base, objectFit: "cover" }} />;
  return <div aria-hidden="true" style={base}>{p.avatarEmoji || "🌿"}</div>;
}

function StatCard({ icon, value, label, loading }) {
  return (
    <div className="pm-stat">
      <div className="pm-stat-icon" aria-hidden="true">{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="pm-stat-val">{loading ? <span className="pm-skel" style={{ width: 44, height: 22, display: "inline-block" }} /> : Number(value || 0).toLocaleString()}</div>
        <div className="pm-stat-lbl">{label}</div>
      </div>
    </div>
  );
}

function Progress({ icon, label, count, total }) {
  const pct = total ? Math.min(100, (count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: V2.forestGreen }}><span aria-hidden="true">{icon} </span>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: V2.forestGreen, whiteSpace: "nowrap" }}>{count} <span style={{ fontWeight: 600, color: V2.dimGray }}>/ {total}</span></span>
      </div>
      <div role="progressbar" aria-label={`${label} represented`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}
        style={{ height: 10, borderRadius: 10, background: "rgba(200,220,190,0.45)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, minWidth: count > 0 ? 6 : 0, height: "100%", borderRadius: 10, background: V2.gradientGrassBtn, transition: "width .5s" }} />
      </div>
      <div style={{ fontSize: 11, color: V2.dimGray, marginTop: 4, fontWeight: 600 }}>{pct < 10 && count > 0 ? pct.toFixed(1) : Math.round(pct)}% of {total}</div>
    </div>
  );
}

export default function CommunityMapPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [range, setRange] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [sel, setSel] = useState(null);       // { ids, count, label }
  const [preview, setPreview] = useState(null); // { loading, proofs }
  const reqRef = useRef(0);

  useEffect(() => {
    try { setUsername(localStorage.getItem("pog_username") || ""); } catch {}
  }, []);

  // range ⇄ URL
  useEffect(() => {
    if (!router.isReady) return;
    const q = String(router.query.range || "");
    if (RANGES.some(r => r.id === q)) setRange(q);
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (r) => {
    const my = ++reqRef.current;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/map/data?range=${r}`);
      if (!res.ok) throw new Error();
      const j = await res.json();
      if (my !== reqRef.current) return;
      setData(j);
    } catch {
      if (my === reqRef.current) setError("Couldn't load community proofs. Please try again.");
    }
    if (my === reqRef.current) setLoading(false);
  }, []);
  useEffect(() => { if (router.isReady) load(range); }, [range, router.isReady, load]);

  const pickRange = (id) => {
    setRange(id); setSel(null); setPreview(null);
    router.replace({ pathname: "/map", query: id === "all" ? {} : { range: id } }, undefined, { shallow: true });
  };

  // marker preview
  useEffect(() => {
    if (!sel) { setPreview(null); return; }
    let live = true;
    setPreview({ loading: true, proofs: [] });
    fetch(`/api/map/proofs?ids=${encodeURIComponent(sel.ids.join(","))}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => live && setPreview({ loading: false, proofs: j.proofs || [] }))
      .catch(() => live && setPreview({ loading: false, proofs: [], failed: true }));
    return () => { live = false; };
  }, [sel]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { if (sel) setSel(null); else if (fullscreen) setFullscreen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, fullscreen]);
  useEffect(() => {
    document.body.style.overflow = fullscreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [fullscreen]);

  const stats = data?.stats;
  const fp = data?.footprint;
  const recent = data?.recent || [];

  const css = V2GlobalCSS + `
    .pm-wrap { max-width: 1180px; margin: 0 auto; padding: 22px clamp(14px,4vw,40px) 40px; }
    .pm-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:${V2.grassDark}; text-decoration:none; padding:6px 0; }
    .pm-back:hover { color:${V2.forestGreen}; }
    .pm-title { font-family:${V2.fontSans}; font-weight:900; font-size:clamp(28px,5vw,44px); line-height:1.1; color:${V2.forestGreen}; margin:6px 0 8px; letter-spacing:-0.01em; }
    .pm-sub { font-size:clamp(14px,2vw,17px); color:${V2.forestLight}; font-weight:600; }
    .pm-head { display:flex; flex-wrap:wrap; gap:14px 24px; align-items:flex-end; justify-content:space-between; margin-bottom:18px; }
    .pm-filters { display:flex; gap:8px; flex-wrap:wrap; }
    .pm-filter { padding:9px 18px; border-radius:22px; cursor:pointer; border:1.5px solid ${V2.borderSoft}; background:#fff; color:${V2.forestGreen}; font-size:13px; font-weight:700; transition:all .15s; min-height:40px; white-space:nowrap; }
    .pm-filter:hover { border-color:${V2.grassLime}; }
    .pm-filter[aria-pressed="true"] { background:${V2.gradientGrassBtn}; color:#fff; border-color:${V2.grassGreen}; box-shadow:0 2px 12px rgba(125,200,50,0.35); }
    .pm-filter:focus-visible, .pm-icon-btn:focus-visible, .pm-row:focus-visible, .pm-link:focus-visible, .pm-back:focus-visible { outline:3px solid ${V2.forestMid}; outline-offset:2px; }
    .pm-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:6px; }
    .pm-stat { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid ${V2.borderSoft}; border-radius:18px; padding:14px 16px; box-shadow:${V2.shadowCard}; min-width:0; }
    .pm-stat-icon { width:40px; height:40px; border-radius:12px; background:${V2.glassGreen}; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
    .pm-stat-val { font-size:clamp(20px,3.4vw,28px); font-weight:900; color:${V2.forestGreen}; line-height:1.1; }
    .pm-stat-lbl { font-size:12px; font-weight:700; color:${V2.dimGray}; margin-top:2px; }
    .pm-range-note { font-size:12px; font-weight:700; color:${V2.dimGray}; margin:6px 2px 14px; }
    .pm-grid { display:grid; grid-template-columns:minmax(0,1.9fr) minmax(0,1fr); gap:18px; align-items:start; }
    .pm-card { background:#fff; border:1px solid ${V2.borderSoft}; border-radius:22px; box-shadow:${V2.shadowCard}; overflow:hidden; }
    .pm-mapbox { position:relative; height:clamp(340px,56vh,560px); }
    .pm-mapbox.fs { position:fixed; inset:0; z-index:500; height:auto; background:#fff; }
    .pm-note { padding:12px 18px; font-size:12.5px; font-weight:600; color:${V2.forestLight}; border-top:1px solid ${V2.borderSoft}; display:flex; gap:8px; align-items:flex-start; }
    .pm-side { display:flex; flex-direction:column; gap:18px; min-width:0; }
    .pm-side-card { padding:18px 18px 8px; }
    .pm-h2 { font-size:17px; font-weight:800; color:${V2.forestGreen}; margin:0 0 4px; font-family:${V2.fontSans}; }
    .pm-h2-sub { font-size:12px; color:${V2.dimGray}; font-weight:700; margin-bottom:14px; }
    .pm-row { display:flex; align-items:center; gap:12px; padding:10px 8px; margin:0 -8px; border-radius:14px; text-decoration:none; color:inherit; transition:background .15s; }
    .pm-row:hover { background:${V2.glassGreen}; }
    .pm-row-name { font-weight:800; font-size:14px; color:${V2.forestGreen}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pm-row-loc { font-size:12px; font-weight:600; color:${V2.dimGray}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pm-row-time { font-size:11.5px; font-weight:700; color:${V2.dimGray}; white-space:nowrap; margin-left:auto; padding-left:8px; }
    .pm-skel { background:linear-gradient(90deg,rgba(200,220,190,.3),rgba(200,220,190,.6),rgba(200,220,190,.3)); background-size:200% 100%; animation:pmShim 1.2s infinite; border-radius:8px; }
    @keyframes pmShim { to { background-position:-200% 0; } }
    .pm-icon-btn { width:32px; height:32px; border-radius:50%; border:1px solid ${V2.borderSoft}; background:#fff; cursor:pointer; color:${V2.forestGreen}; font-size:16px; line-height:1; }
    .pm-link { font-size:12.5px; font-weight:800; color:${V2.grassDark}; text-decoration:none; }
    .pm-sheet { position:absolute; left:12px; right:12px; bottom:28px; z-index:6; max-width:380px; background:#fff; border-radius:18px; box-shadow:0 8px 30px rgba(26,74,10,0.28); padding:14px; max-height:60%; overflow:auto; }
    @media (max-width:900px) {
      .pm-grid { grid-template-columns:minmax(0,1fr); }
    }
    @media (max-width:520px) {
      .pm-stat { flex-direction:column; align-items:flex-start; gap:8px; padding:12px; }
      .pm-stat-icon { width:34px; height:34px; font-size:17px; }
      .pm-filter { flex:1 1 0; padding:9px 6px; font-size:12.5px; white-space:nowrap; }
      .pm-sheet { max-width:none; }
    }
    @media (prefers-reduced-motion: reduce) { .pm-skel { animation:none; } * { scroll-behavior:auto !important; } }
  `;

  return (
    <>
      <Head>
        <title>Proof of Grass Map | Touch Grass</title>
        <meta name="description" content="See where our community is getting outside." />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <V2Nav username={username} onUsernameChange={setUsername} showUpload={() => router.push("/#upload")} />

      <main className="v2-page-wrap" style={{ background: V2.gradientSky, minHeight: "100vh" }}>
        <div className="pm-wrap">
          <Link href="/" className="pm-back">← Back to dashboard</Link>

          <div className="pm-head">
            <div>
              <h1 className="pm-title">Proof of Grass Map</h1>
              <p className="pm-sub">See where our community is getting outside.</p>
            </div>
            <div className="pm-filters" role="group" aria-label="Time range">
              {RANGES.map(r => (
                <button key={r.id} type="button" className="pm-filter" aria-pressed={range === r.id} onClick={() => pickRange(r.id)}>{r.label}</button>
              ))}
            </div>
          </div>

          <div className="pm-stats" aria-live="polite">
            <StatCard icon="📍" value={stats?.mappedProofs} label="Mapped proofs" loading={!stats} />
            <StatCard icon="🌍" value={stats?.countries} label="Countries" loading={!stats} />
            <StatCard icon="🧑‍🌾" value={stats?.participants} label="Participants" loading={!stats} />
          </div>
          <div className="pm-range-note">{RANGE_NOTE[range]}</div>

          {error && (
            <div role="alert" style={{ background: "#fff", border: `1px solid ${V2.danger}55`, borderRadius: 16, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: V2.forestGreen }}>{error}</span>
              <button type="button" className="pm-filter" onClick={() => load(range)}>Retry</button>
            </div>
          )}

          <div className="pm-grid">
            <section className="pm-card" aria-label="Map of community proofs">
              <div className={`pm-mapbox${fullscreen ? " fs" : ""}`}>
                <CommunityMap
                  points={data?.points}
                  loading={loading}
                  resetKey={range}
                  fullscreen={fullscreen}
                  onToggleFullscreen={() => setFullscreen(f => !f)}
                  onSelect={setSel}
                />

                {sel && (
                  <div className="pm-sheet" role="dialog" aria-label="Proof preview">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: V2.dimGray }}>
                        📍 {sel.label}{sel.count > 1 ? ` · ${sel.count} proofs` : ""}
                      </div>
                      <button type="button" className="pm-icon-btn" aria-label="Close preview" onClick={() => setSel(null)}>×</button>
                    </div>
                    {preview?.loading && <div className="pm-skel" style={{ height: 52 }} />}
                    {preview?.failed && <div style={{ fontSize: 13, fontWeight: 700, color: V2.danger }}>Couldn't load this proof.</div>}
                    {preview && !preview.loading && !preview.failed && preview.proofs.length === 0 && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: V2.dimGray }}>This proof is no longer available.</div>
                    )}
                    {preview?.proofs.map(p => (
                      <Link key={p.id} href={`/u/${p.username}`} className="pm-row">
                        <Avatar p={p} size={44} />
                        <div style={{ minWidth: 0 }}>
                          <div className="pm-row-name">@{p.username}</div>
                          <div className="pm-row-loc">{p.label} · {fmtDate(p.createdAt)}</div>
                        </div>
                        <span className="pm-link" style={{ marginLeft: "auto", paddingLeft: 8, whiteSpace: "nowrap" }}>Profile →</span>
                      </Link>
                    ))}
                    {sel.count > (preview?.proofs.length || 0) && !preview?.loading && (
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: V2.dimGray, marginTop: 4 }}>Showing the latest {preview?.proofs.length} of {sel.count} here.</div>
                    )}
                  </div>
                )}
              </div>
              <div className="pm-note">
                <span aria-hidden="true">🔒</span>
                <span>Only locations shared with a proof appear. Locations are approximate.</span>
              </div>
            </section>

            <div className="pm-side">
              <section className="pm-card pm-side-card" aria-labelledby="pm-fp">
                <h2 className="pm-h2" id="pm-fp">Growing our footprint</h2>
                <div className="pm-h2-sub">{fp?.label || "All-time footprint"}</div>
                {!fp ? (
                  <>
                    <div className="pm-skel" style={{ height: 38, marginBottom: 14 }} />
                    <div className="pm-skel" style={{ height: 38, marginBottom: 14 }} />
                  </>
                ) : (
                  <>
                    <Progress icon="🌍" label="Countries" count={fp.countries.count} total={fp.countries.total} />
                    <Progress icon="🇺🇸" label="US states" count={fp.usStates.count} total={fp.usStates.total} />
                    {fp.usOther.length > 0 && (
                      <div style={{ fontSize: 11.5, color: V2.dimGray, fontWeight: 700, marginBottom: 10 }}>
                        Also represented (not counted in 50): {fp.usOther.join(", ")}
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="pm-card pm-side-card" aria-labelledby="pm-recent">
                <h2 className="pm-h2" id="pm-recent">Recent proofs</h2>
                <div className="pm-h2-sub">{RANGE_NOTE[range].replace("Showing ", "")}</div>
                {!data ? (
                  [0, 1, 2, 3].map(i => <div key={i} className="pm-skel" style={{ height: 48, marginBottom: 10 }} />)
                ) : recent.length === 0 ? (
                  <div style={{ fontSize: 13, fontWeight: 600, color: V2.dimGray, padding: "6px 0 14px" }}>No mapped proofs in this period yet.</div>
                ) : (
                  <div style={{ paddingBottom: 8 }}>
                    {recent.map(p => (
                      <Link key={p.id} href={`/u/${p.username}`} className="pm-row">
                        <Avatar p={p} size={40} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="pm-row-name">@{p.username}</div>
                          <div className="pm-row-loc">{p.label}</div>
                        </div>
                        <time className="pm-row-time" dateTime={p.createdAt}>{timeAgo(p.createdAt)}</time>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>

      <V2BottomNav username={username} onLogProof={() => router.push("/#upload")} onMore={() => {}} />
    </>
  );
}
