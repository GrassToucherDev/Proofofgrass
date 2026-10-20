// pages/spotlight.js — Community Spotlight (V2 design).
// Data + selection logic are unchanged: CommunitySpotlights (status "active") + Profiles avatars,
// "this week" = the current UTC Monday. Only the presentation is new.
import { useState, useEffect, useId } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabase";
import V2Nav from "../components/V2Nav";
import V2BottomNav from "../components/V2BottomNav";
import { V2, V2GlobalCSS } from "../utils/v2Theme";

// Category presentation. Keys match SPOTLIGHT_BADGES / the CommunitySpotlights.category column.
const CATEGORIES = [
  { key: "community_mvp",   emoji: "🔥", name: "Community MVP",   accent: "#c2410c", tint: "#ffe9df", desc: "The community member who showed up most for the community this week." },
  { key: "meme_lord",       emoji: "😂", name: "Meme Lord",       accent: "#92700c", tint: "#fdf0cf", desc: "Best meme, recap, or creative content related to Touch Grass." },
  { key: "biggest_shiller", emoji: "📣", name: "Biggest Shiller", accent: "#2d6b1a", tint: "#e3f3d4", desc: "Most active community builder, referrer, or promoter." },
  { key: "space_warrior",   emoji: "🎧", name: "Space Warrior",   accent: "#5b3fc4", tint: "#ece7fb", desc: "Most active participant in Touch Grass Twitter Spaces." },
];

// ─── Date helpers (UTC, same rule as before) ─────────────────────────────────
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtWeek(start, end) {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date((end || addDays(start, 6)) + "T00:00:00Z");
  const o = { month: "short", day: "numeric", timeZone: "UTC" };
  return `${s.toLocaleDateString("en-US", o)} – ${e.toLocaleDateString("en-US", { ...o, year: "numeric" })}`;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ winner, size, accent }) {
  const url = winner?.avatar_url || winner?.profile_avatar_url;
  const base = { width: size, height: size, borderRadius: "50%", flexShrink: 0, border: `2px solid ${accent || V2.borderSoft}` };
  if (!winner) {
    return (
      <div aria-hidden="true" style={{ ...base, border: `2px solid ${V2.borderSoft}`, background: "#eef1ea", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="#b9c1b2"><circle cx="12" cy="8.5" r="4.2" /><path d="M3.5 22c0-4.7 3.8-8 8.5-8s8.5 3.3 8.5 8z" /></svg>
      </div>
    );
  }
  return url ? (
    <img src={url} alt="" loading="lazy" style={{ ...base, objectFit: "cover", background: "#fff" }} />
  ) : (
    <div aria-hidden="true" style={{ ...base, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.4, color: accent }}>
      {(winner.username || "?")[0].toUpperCase()}
    </div>
  );
}

// ─── Winner card (this week) ─────────────────────────────────────────────────
function WinnerCard({ cat, winner, viewer }) {
  const empty = !winner;
  const shown = winner ? `@${winner.display_name || winner.username}` : "No winner yet";
  return (
    <article className="sp-winner" aria-label={`${cat.name}: ${empty ? "no winner yet" : shown}`}>
      <div className="sp-winner-top">
        <span className="sp-pill" style={{ background: cat.tint, color: cat.accent }}>
          <span aria-hidden="true">{cat.emoji}</span> {cat.name}
        </span>
        {!empty && <span className="sp-crown" role="img" aria-label="Winner" title="Winner">👑</span>}
      </div>
      <div className="sp-winner-body">
        <Avatar winner={winner} size={56} accent={cat.accent} />
        <div style={{ minWidth: 0, flex: 1 }}>
          {empty ? (
            <div className="sp-name sp-name-empty">No winner yet</div>
          ) : (
            <Link href={`/u/${winner.username}`} className="sp-name">{shown}</Link>
          )}
          <p className="sp-desc">{cat.desc}</p>
        </div>
      </div>
      {!empty && (winner.description || winner.x_link || winner.proof_link || (viewer && viewer === winner.username)) && (
        <div className="sp-extra">
          {winner.description && <p className="sp-note">{winner.description}</p>}
          <div className="sp-links">
            {winner.x_link && <a href={winner.x_link} target="_blank" rel="noopener noreferrer" className="sp-link">𝕏 View post</a>}
            {winner.proof_link && <a href={winner.proof_link} target="_blank" rel="noopener noreferrer" className="sp-link">🔗 Proof</a>}
            {viewer && viewer === winner.username && (
              <Link href={`/spotlight-card/${winner.username}`} className="sp-link sp-link-strong">🏆 Generate Spotlight Card</Link>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

// ─── Previous week accordion ─────────────────────────────────────────────────
function PastWeek({ week, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const byCat = Object.fromEntries(week.winners.map(w => [w.category, w]));
  return (
    <div className="sp-acc">
      <h3 style={{ margin: 0 }}>
        <button type="button" className="sp-acc-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
          <span>{fmtWeek(week.week_start, week.week_end)}</span>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </h3>
      {open && (
        <div id={id} role="region" className="sp-past-grid">
          {CATEGORIES.map(cat => {
            const w = byCat[cat.key];
            return (
              <div key={cat.key} className="sp-past-cell">
                <div className="sp-past-cat" style={{ color: cat.accent }}><span aria-hidden="true">{cat.emoji}</span> {cat.name}</div>
                <div className="sp-past-who">
                  <Avatar winner={w || null} size={34} accent={cat.accent} />
                  {w ? <Link href={`/u/${w.username}`} className="sp-past-name">@{w.display_name || w.username}</Link>
                     : <span className="sp-past-name sp-muted">No winner yet</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SpotlightPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [currentWinners, setCurrentWinners] = useState([]);
  const [pastWinners, setPastWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try { const u = localStorage.getItem("pog_username"); if (u) setUsername(u.replace(/@/g, "").toLowerCase().trim()); } catch {}
  }, []);

  const thisMonday = getMondayOf(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    (async () => {
      try {
        const { data: spotlights, error } = await supabase
          .from("CommunitySpotlights").select("*").eq("status", "active").order("week_start", { ascending: false });
        if (error) throw error;
        if (!spotlights?.length) { setLoading(false); return; }
        const names = [...new Set(spotlights.map(s => s.username))];
        const { data: profiles } = await supabase.from("Profiles").select("username, avatar_url").in("username", names);
        const avatarMap = Object.fromEntries((profiles ?? []).map(p => [p.username, p.avatar_url]));
        const enriched = spotlights.map(s => ({ ...s, profile_avatar_url: avatarMap[s.username] ?? null }));
        const monday = getMondayOf(new Date().toISOString().slice(0, 10));
        setCurrentWinners(enriched.filter(s => s.week_start === monday));
        setPastWinners(enriched.filter(s => s.week_start !== monday));
      } catch (e) { console.warn("spotlight load failed:", e); setFailed(true); }
      setLoading(false);
    })();
  }, []);

  const currentMap = Object.fromEntries(currentWinners.map(w => [w.category, w]));
  const pastByWeek = pastWinners.reduce((acc, w) => {
    (acc[w.week_start] ||= { week_start: w.week_start, week_end: w.week_end, winners: [] }).winners.push(w);
    return acc;
  }, {});
  const pastWeeks = Object.values(pastByWeek).sort((a, b) => b.week_start.localeCompare(a.week_start));

  const css = V2GlobalCSS + `
    .sp-bg { min-height:100vh; background:
      linear-gradient(180deg, rgba(197,227,247,.55) 0%, rgba(232,244,253,.35) 45%, rgba(240,248,238,.75) 100%),
      url('/hero-landscape.png') center bottom / cover no-repeat fixed, ${V2.skyBlue}; }
    .sp-wrap { max-width:920px; margin:0 auto; padding:28px 16px calc(110px + env(safe-area-inset-bottom)); }
    .sp-eyebrow { display:flex; align-items:center; gap:10px; font-size:12px; font-weight:700; letter-spacing:.3em; text-transform:uppercase; color:${V2.grassDark}; margin-bottom:6px; }
    .sp-eyebrow i { width:8px; height:8px; border-radius:50%; background:${V2.grassLime}; display:block; }
    .sp-h1 { font-family:${V2.fontSans}; font-weight:800; font-size:clamp(32px,8vw,56px); line-height:1.02; letter-spacing:-.02em; color:${V2.forestGreen}; margin:0 0 10px; }
    .sp-sub { font-size:clamp(15px,3.6vw,19px); color:${V2.forestLight}; font-weight:500; line-height:1.45; max-width:560px; margin:0 0 22px; }
    .sp-card { background:rgba(255,255,255,.94); border:1px solid ${V2.borderWhite}; border-radius:24px; padding:clamp(14px,3.5vw,24px); margin-bottom:16px; box-shadow:0 4px 22px rgba(26,74,10,.09); }
    .sp-card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
    .sp-h2 { display:flex; align-items:center; gap:10px; font-family:${V2.fontSans}; font-weight:800; font-size:clamp(20px,5vw,28px); color:${V2.forestGreen}; margin:0; letter-spacing:-.01em; }
    .sp-h2 span[aria-hidden] { font-size:1.15em; }
    .sp-range { font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:${V2.grassDark}; background:#e6f3d6; border-radius:999px; padding:8px 14px; white-space:nowrap; }
    .sp-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    @media (max-width:619px){ .sp-grid { grid-template-columns:1fr; } }
    .sp-winner { background:#fff; border:1px solid ${V2.borderSoft}; border-radius:18px; padding:12px; box-shadow:0 1px 6px rgba(26,74,10,.05); min-width:0; }
    .sp-winner-top { display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:10px; }
    .sp-pill { white-space:nowrap; display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; padding:7px 11px; border-radius:999px; min-width:0; }
    .sp-crown { font-size:22px; line-height:1; flex-shrink:0; }
    .sp-winner-body { display:flex; gap:10px; align-items:flex-start; }
    .sp-name { display:block; font-weight:800; font-size:clamp(15px,3.9vw,18px); color:${V2.forestGreen}; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:2px; }
    .sp-name-empty { color:${V2.textMuted}; }
    a.sp-name:hover { text-decoration:underline; }
    .sp-desc { font-size:12.5px; line-height:1.4; font-weight:500; color:${V2.forestLight}; opacity:.85; margin:0; }
    .sp-extra { border-top:1px solid ${V2.borderSoft}; margin-top:10px; padding-top:8px; }
    .sp-note { font-size:12px; font-weight:500; color:${V2.forestLight}; margin:0 0 6px; line-height:1.45; overflow-wrap:anywhere; }
    .sp-links { display:flex; flex-wrap:wrap; gap:6px; }
    .sp-link { font-size:12px; font-weight:700; color:${V2.forestMid}; text-decoration:none; padding:8px 12px; min-height:36px; display:inline-flex; align-items:center; border-radius:999px; border:1px solid ${V2.borderSoft}; background:#fff; }
    .sp-link-strong { background:#e6f3d6; border-color:#c9e4ad; }
    .sp-chosen-row { display:grid; grid-template-columns:auto minmax(110px,170px) 1fr; gap:6px 14px; align-items:center; padding:14px 0; border-top:1px solid ${V2.borderSoft}; }
    .sp-chosen-row:first-of-type { border-top:0; }
    .sp-chosen-ico { font-size:28px; width:36px; text-align:center; }
    .sp-chosen-name { font-weight:800; font-size:16px; }
    .sp-chosen-desc { font-size:14px; font-weight:500; color:${V2.forestLight}; line-height:1.45; }
    @media (max-width:520px){ .sp-chosen-row { grid-template-columns:auto 1fr; } .sp-chosen-desc { grid-column:2; } }
    .sp-acc { border:1px solid ${V2.borderSoft}; border-radius:16px; background:#fff; margin-bottom:10px; overflow:hidden; }
    .sp-acc-btn { width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:52px; padding:0 16px; background:#eef7e6; border:0; cursor:pointer; font-family:${V2.fontSans}; font-weight:800; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:${V2.forestMid}; text-align:left; }
    .sp-acc-btn[aria-expanded="false"] { background:#fff; }
    .sp-past-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px 14px; padding:14px 16px 16px; }
    @media (max-width:760px){ .sp-past-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media (max-width:420px){ .sp-past-grid { grid-template-columns:1fr; } }
    .sp-past-cat { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; margin-bottom:6px; }
    .sp-past-who { display:flex; align-items:center; gap:8px; min-width:0; }
    .sp-past-name { font-weight:700; font-size:14px; color:${V2.forestGreen}; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
    .sp-muted { color:${V2.textMuted}; font-weight:600; }
    .sp-skel { height:150px; border-radius:18px; background:#eef1ea; animation:sp-pulse 1.2s ease-in-out infinite; }
    @keyframes sp-pulse { 50% { opacity:.55; } }
    .sp-wrap a:focus-visible, .sp-wrap button:focus-visible { outline:3px solid ${V2.grassLime}; outline-offset:2px; border-radius:12px; }
    @media (prefers-reduced-motion: reduce){ .sp-skel{animation:none;} }
  `;

  const weekLabel = fmtWeek(thisMonday, addDays(thisMonday, 6));
  const nothingAtAll = !loading && !failed && !pastWeeks.length && !currentWinners.length;

  return (
    <>
      <Head><title>Community Spotlight | Proof of Grass</title></Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="sp-bg">
        <V2Nav username={username} onUsernameChange={setUsername} showUpload={() => { window.location.href = "/#upload"; }} />
        <main className="sp-wrap">
          <header>
            <div className="sp-eyebrow"><i aria-hidden="true" />Community</div>
            <h1 className="sp-h1">Community Spotlight</h1>
            <p className="sp-sub">Every week we celebrate the standout members of the Touch Grass community.</p>
          </header>

          <section className="sp-card" aria-labelledby="sp-this-week">
            <div className="sp-card-head">
              <h2 className="sp-h2" id="sp-this-week"><span aria-hidden="true">🏆</span> This Week's Winners</h2>
              <span className="sp-range">{weekLabel}</span>
            </div>
            {loading ? (
              <div className="sp-grid" aria-busy="true">{[1, 2, 3, 4].map(i => <div key={i} className="sp-skel" />)}</div>
            ) : (
              <div className="sp-grid">
                {CATEGORIES.map(cat => <WinnerCard key={cat.key} cat={cat} winner={currentMap[cat.key] ?? null} viewer={username} />)}
              </div>
            )}
            {failed && <p role="alert" style={{ margin: "12px 0 0", fontSize: 14, color: "#b3261e" }}>Couldn't load winners right now. Please try again shortly.</p>}
          </section>

          <section className="sp-card" aria-labelledby="sp-how">
            <h2 className="sp-h2" id="sp-how" style={{ marginBottom: 6 }}><span aria-hidden="true">🌿</span> How Winners Are Chosen</h2>
            <div>
              {CATEGORIES.map(cat => (
                <div key={cat.key} className="sp-chosen-row">
                  <span className="sp-chosen-ico" aria-hidden="true">{cat.emoji}</span>
                  <span className="sp-chosen-name" style={{ color: cat.accent }}>{cat.name}</span>
                  <span className="sp-chosen-desc">{cat.desc.replace("this week", "that week")}</span>
                </div>
              ))}
            </div>
          </section>

          {pastWeeks.length > 0 && (
            <section className="sp-card" aria-labelledby="sp-prev">
              <h2 className="sp-h2" id="sp-prev" style={{ marginBottom: 14 }}><span aria-hidden="true">🕘</span> Previous Winners</h2>
              {pastWeeks.map((w, i) => <PastWeek key={w.week_start} week={w} defaultOpen={i === 0} />)}
            </section>
          )}

          {nothingAtAll && (
            <p style={{ textAlign: "center", color: V2.forestLight, fontSize: 14, fontWeight: 500 }}>Winners will be announced weekly.</p>
          )}
        </main>
        <V2BottomNav username={username} onLogProof={() => router.push("/#upload")} onMore={() => {}} />
      </div>
    </>
  );
}
