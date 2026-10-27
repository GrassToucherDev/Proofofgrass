// pages/grass-draw/live.js — the public Grass Draw live reveal.
// The server controls what is visible and when (see /api/grass-draw/live); this page only plays it back.
import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { V2, V2Styles, V2GlobalCSS } from "../../utils/v2Theme";
import { SiteLinks, SiteMobileMenu } from "../../components/SiteMenu";

const ICON = { grass_score: "⚡", shield: "🛡️", profile_pack: "🎨", nft: "🖼️" };
const fmtClock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
};

export default function GrassDrawLive() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [offset, setOffset] = useState(0);          // server time minus this device's time
  const [tick, setTick] = useState(0);
  const [fresh, setFresh] = useState(0);            // reveal number that just arrived (for the pop-in)
  const seen = useRef(0);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const t0 = Date.now();
      const r = await fetch("/api/grass-draw/live", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error();
      const t1 = Date.now();
      setOffset(j.server_now - (t0 + t1) / 2);
      setData(j); setErr(false);
      const n = j.winners?.length || 0;
      if (n > seen.current) { setFresh(n); seen.current = n; }
      // Look again right when the next reveal is due; otherwise on a relaxed beat.
      clearTimeout(timer.current);
      const wait = j.next_reveal_in_ms != null ? Math.min(Math.max(j.next_reveal_in_ms + 250, 600), 4000)
        : j.phase === "countdown" ? Math.min(Math.max(j.countdown_ms + 300, 800), 3000)
        : j.phase === "done" ? 15000 : j.phase === "none" ? 20000 : 5000;
      timer.current = setTimeout(load, wait);
    } catch { setErr(true); clearTimeout(timer.current); timer.current = setTimeout(load, 6000); }
  }, []);

  useEffect(() => { load(); return () => clearTimeout(timer.current); }, [load]);
  useEffect(() => { const i = setInterval(() => setTick((n) => n + 1), 250); return () => clearInterval(i); }, []);

  const phase = data?.phase || "none";
  const nowServer = Date.now() + offset;
  const untilStart = data?.scheduled_at ? new Date(data.scheduled_at).getTime() - nowServer : null;
  const untilGo = data?.started_at ? new Date(data.started_at).getTime() - nowServer : null;
  const winners = data?.winners || [];
  const pool = data?.pool || [];
  const last = winners[winners.length - 1];
  void tick;

  const css = V2GlobalCSS + `
    .gdl-wrap { max-width: 880px; margin: 0 auto; padding: 28px 16px 64px; }
    .gdl-stage { position: relative; overflow: hidden; border-radius: 20px; padding: 34px 18px; text-align: center;
      background: radial-gradient(circle at 50% 0%, #1f5c10 0%, #0d2a05 70%); color: #f3ffe6; min-height: 280px;
      box-shadow: 0 10px 40px rgba(13,42,5,0.35); }
    .gdl-big { font-family: ${V2.fontSerif}; font-weight: 700; font-size: clamp(44px, 12vw, 96px); line-height: 1; letter-spacing: 0.02em; }
    .gdl-sub { opacity: .8; font-size: 14px; margin-top: 10px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
    .gdl-chips { position: absolute; inset: 0; pointer-events: none; }
    .gdl-chip { position: absolute; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 99px;
      background: rgba(125,200,50,.16); color: #cfeeb0; border: 1px solid rgba(125,200,50,.35); white-space: nowrap;
      animation: gdlFloat var(--d, 9s) ease-in-out infinite; animation-delay: var(--dl, 0s); opacity: .85; }
    .gdl-swirl { animation: gdlSwirl var(--d, 2.4s) linear infinite; }
    @keyframes gdlFloat { 0%,100% { transform: translateY(0) rotate(-3deg);} 50% { transform: translateY(-18px) rotate(3deg);} }
    @keyframes gdlSwirl { from { transform: rotate(0deg) translateX(var(--r, 90px)) rotate(0deg);} to { transform: rotate(360deg) translateX(var(--r, 90px)) rotate(-360deg);} }
    @keyframes gdlPop { 0% { transform: scale(.6) translateY(24px); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    @keyframes gdlGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(232,160,32,.0);} 50% { box-shadow: 0 0 34px 6px rgba(232,160,32,.55);} }
    .gdl-card { display: flex; align-items: center; gap: 14px; background: white; border-radius: 16px; padding: 14px 16px;
      border: 1px solid ${V2.borderSoft}; box-shadow: 0 1px 8px rgba(26,74,10,.07); }
    .gdl-card.fresh { animation: gdlPop .7s cubic-bezier(.2,1.2,.3,1) both, gdlGlow 2.4s ease-in-out 2; border-color: ${V2.borderGold}; }
    .gdl-av { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; background: #e6f2dc; flex: none;
      display: flex; align-items: center; justify-content: center; font-size: 24px; }
    @media (prefers-reduced-motion: reduce) { .gdl-chip, .gdl-swirl, .gdl-card.fresh { animation: none !important; } }
  `;

  const Stage = () => {
    if (!data && !err) return <div className="gdl-stage"><div className="gdl-sub">Loading…</div></div>;
    if (err && !data) return <div className="gdl-stage"><div className="gdl-sub">Couldn't reach the draw. Retrying…</div></div>;
    if (phase === "none") return (
      <div className="gdl-stage"><div style={{ fontSize: 54 }}>🍃</div>
        <div className="gdl-big" style={{ fontSize: "clamp(28px,7vw,48px)", marginTop: 10 }}>No live draw right now</div>
        <div className="gdl-sub">We'll announce the next one. Keep earning tickets.</div></div>);
    const chips = (pool.length ? pool : []).slice(0, 36);
    return (
      <div className="gdl-stage">
        {phase !== "revealing" && phase !== "done" && (
          <div className="gdl-chips" aria-hidden="true">
            {chips.map((u, i) => (
              <span key={u} className="gdl-chip" style={{ left: `${(i * 37) % 92}%`, top: `${(i * 53) % 86}%`, "--d": `${7 + (i % 5)}s`, "--dl": `${-(i % 7)}s` }}>@{u}</span>
            ))}
          </div>)}
        <div style={{ position: "relative" }}>
          <div className="gdl-sub" style={{ marginBottom: 14 }}>{data.title}</div>
          {phase === "scheduled" && (<>
            <div className="gdl-big">{untilStart != null ? fmtClock(untilStart) : "Soon"}</div>
            <div className="gdl-sub">{untilStart != null && untilStart > 0 ? "until the draw goes live" : "Starting any moment"}</div></>)}
          {phase === "countdown" && (<>
            <div className="gdl-big">{Math.max(1, Math.ceil((untilGo ?? 0) / 1000))}</div>
            <div className="gdl-sub">Get ready</div></>)}
          {phase === "intro" && (<>
            <div style={{ fontSize: 72 }} className="gdl-swirl">🍃</div>
            <div className="gdl-big" style={{ fontSize: "clamp(30px,8vw,56px)", marginTop: 8 }}>Drawing…</div>
            <div className="gdl-sub">{data.total} winner{data.total === 1 ? "" : "s"} to be revealed</div></>)}
          {phase === "revealing" && last && (<>
            <div className="gdl-sub">Reveal {last.n} of {data.total}</div>
            <div className="gdl-big" style={{ fontSize: "clamp(30px,8vw,64px)", marginTop: 10, wordBreak: "break-word" }}>@{last.username}</div>
            <div style={{ fontSize: 22, marginTop: 10 }}>{ICON[last.prize_type] || "🎁"} {last.prize}</div>
            {last.chance_pct != null && <div className="gdl-sub">Held {last.entries} entries · {last.chance_pct}% of the pool</div>}</>)}
          {phase === "done" && (<>
            <div style={{ fontSize: 54 }}>🎉</div>
            <div className="gdl-big" style={{ fontSize: "clamp(32px,8vw,60px)", marginTop: 8 }}>Congratulations!</div>
            <div className="gdl-sub">{data.total} winners · see the full list below</div></>)}
        </div>
      </div>);
  };

  return (
    <>
      <Head>
        <title>Grass Draw Live | Proof of Grass</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="description" content="Watch the Proof of Grass Grass Draw winners revealed live." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)", fontFamily: V2.fontSans }}>
        <nav style={{ position: "sticky", top: 0, zIndex: 200, height: 64, display: "flex", alignItems: "center",
          padding: "0 clamp(14px,4vw,40px)", gap: 20, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${V2.borderSoft}`, boxShadow: "0 2px 16px rgba(26,74,10,0.07)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <img src="/touchgrass-transparent.png" alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
            <span style={{ fontFamily: V2.fontSans, fontSize: 16, fontWeight: 800, color: V2.forestGreen }}>
              Touch Grass <span style={{ fontWeight: 400, opacity: 0.5 }}>| Proof of Grass</span>
            </span>
          </Link>
          <SiteLinks />
          <div className="sm-spacer" />
          <SiteMobileMenu />
        </nav>
        <div className="gdl-wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: V2.fontSerif, color: V2.forestGreen, fontSize: "clamp(26px,5vw,38px)", margin: 0 }}>Grass Draw Live</h1>
            <Link href="/grass-draw" style={{ ...V2Styles.btnSecondary, fontSize: 13, padding: "8px 16px", textDecoration: "none" }}>← My entries</Link>
          </div>
          <Stage />
          {winners.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: V2.midGray, marginBottom: 10 }}>
                Winners so far ({winners.length}/{data.total})
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {[...winners].reverse().map((w) => (
                  <div key={w.n} className={`gdl-card${w.n === fresh && phase === "revealing" ? " fresh" : ""}`}>
                    {w.avatar_url ? <img className="gdl-av" src={w.avatar_url} alt="" /> : <div className="gdl-av">{ICON[w.prize_type] || "🎁"}</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/u/${w.username}`} style={{ fontWeight: 700, color: V2.forestGreen, textDecoration: "none", wordBreak: "break-word" }}>@{w.username}</Link>
                      <div style={{ fontSize: 13, color: V2.forestLight }}>{ICON[w.prize_type] || "🎁"} {w.prize}</div>
                    </div>
                    {w.chance_pct != null && <div style={{ textAlign: "right", fontSize: 12, color: V2.midGray, fontWeight: 700 }}>{w.chance_pct}%<br />of pool</div>}
                  </div>))}
              </div>
            </div>)}
          <p style={{ marginTop: 26, fontSize: 12, color: V2.midGray, textAlign: "center", lineHeight: 1.6 }}>
            Winners are drawn by weighted random selection from the entries each person earned this cycle. The result is fixed before the show starts; this page reveals it live.
          </p>
        </div>
      </div>
    </>
  );
}
