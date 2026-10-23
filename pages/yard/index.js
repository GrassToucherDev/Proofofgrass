// /yard — the competitive home of Proof of Grass.
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import V2Nav from "../../components/V2Nav";
import { V2, V2Styles, V2GlobalCSS } from "../../utils/v2Theme";
import { useYard, useYardGroves, getYardUser } from "../../hooks/useYard";
import { yardCSS, StatCard, FeatureCard, ChallengeCard, WagoEmpty, Avatar } from "../../components/yard/YardUI";
import CreateChallengeSheet from "../../components/yard/CreateChallengeSheet";
import { GroveChallengeCard } from "../../components/yard/GroveYardUI";
import { EventCard } from "../../components/yard/EventUI";

export default function Yard() {
  const router = useRouter();
  const { username, data, error, ready, reload } = useYard();
  const [creating, setCreating] = useState(false);
  const [preset, setPreset] = useState("");
  const [mode, setMode] = useState("");
  const gv = useYardGroves(username);
  const [board, setBoard] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch("/api/yard/leaderboard?metric=wins").then((r) => r.json()).then((d) => setBoard(d.players || [])).catch(() => setBoard([]));
  }, []);
  useEffect(() => {
    const u = getYardUser();
    fetch(`/api/yard/events${u ? `?username=${encodeURIComponent(u)}` : ""}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setEvents(d.events || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.new) { setPreset(String(router.query.to || "").replace(/@/g, "")); setCreating(true); }
  }, [router.isReady, router.query.new, router.query.to]);

  const you = data?.you;
  const rec = you?.record;
  const stats = data?.stats;
  // Only show the two newer numbers when the server could compute them from real data.
  const realExtras = stats && stats.grovesCompeting != null && stats.proofsThisWeek != null;
  const open = () => { setPreset(""); setMode(""); setCreating(true); };
  const openGrove = () => { setPreset(""); setMode("grove"); setCreating(true); };
  const grove = gv.data?.grove;

  return (
    <>
      <Head>
        <title>The Yard | Proof of Grass</title>
        <meta name="description" content="Challenge other users, build your streak and see where you stand in The Yard." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{V2GlobalCSS + yardCSS}</style>
      <V2Nav />
      <main className="yd-wrap">
        <header className="yd-hero">
          <div className="yd-hero-art" role="img" aria-label="Illustration of The Yard, a sunny outdoor competition ground with WAGO the sunflower mascot" />
          <div className="yd-hero-copy">
            <span className="yd-eyebrow"><span aria-hidden="true">🌿</span>CHALLENGE · COMPETE · GROW</span>
            <h1 className="yd-h1">The Yard</h1>
            <p className="yd-lead">Challenge other users or take your Grove into friendly competition. Build your streak, earn rewards, and see where you stand.</p>
            <div className="yd-ctas">
              <button type="button" className="yd-btn" onClick={open} style={{ ...V2Styles.btnPrimary, minHeight: 48 }}>⚔️ Create a Challenge</button>
              <Link href="/yard/leaderboards" className="yd-btn" style={{ ...V2Styles.btnSecondary, minHeight: 48, textDecoration: "none", display: "inline-flex", alignItems: "center", background: "#fff" }}>👥 View Leaderboards</Link>
            </div>
          </div>
        </header>

        <section className="yd-stats" aria-label="Yard stats">
          <StatCard icon="⚔️" value={stats ? stats.activeChallenges.toLocaleString() : null} label="Active challenges" />
          {realExtras ? (
            <>
              <StatCard icon="🌳" value={stats.grovesCompeting.toLocaleString()} label="Groves competing" />
              <StatCard icon="🌿" value={stats.proofsThisWeek.toLocaleString()} label="Yard proofs this week" />
              <StatCard icon="📋" value={you ? (you.record.completed ? `${rec.wins}-${rec.losses}-${rec.ties}` : "None yet") : "Sign in"} label={you?.rank ? `Your record · #${you.rank}` : "Your record"} />
            </>
          ) : (
            <>
              <StatCard icon="🏆" value={stats ? stats.players.toLocaleString() : null} label="Players ranked" />
              <StatCard icon="📋" value={you ? (you.record.completed ? `${rec.wins}-${rec.losses}-${rec.ties}` : "None yet") : "Sign in"} label="Your record" />
              <StatCard icon="📊" value={you?.rank ? `#${you.rank}` : "–"} label="Your Yard rank" />
            </>
          )}
        </section>

        <div className="yd-features">
          <FeatureCard art="/yard/card1.webp" title="1v1 Challenges" copy="Go head to head with another user." cta="Start a Challenge" onClick={open} />
          <FeatureCard art="/yard/card2.webp" title="Grove vs Grove" copy="Bring your squad and compete together." cta="Challenge a Grove" onClick={openGrove} />
          <FeatureCard art="/yard/card3.webp" title="Seasonal Events" copy="Special challenges, bigger rewards." cta={events.some((e) => e.phase === "live") ? "Join the event" : "See events"} href="/yard/events" />
        </div>

        {error && <div role="alert" className="yd-card" style={{ marginTop: 22, color: V2.danger, fontWeight: 600 }}>{error}</div>}

        {!!you?.incoming?.length && (
          <section className="yd-section" aria-labelledby="yd-in">
            <h2 id="yd-in" className="yd-h2">Challenges waiting for you <span className="yd-pill" style={{ background: "#fef3d8", color: "#8a5a00" }}>⏳ {you.incoming.length}</span></h2>
            <div className="yd-grid">{you.incoming.slice(0, 6).map((c) => <ChallengeCard key={c.id} ch={c} viewer={username} kind="incoming" onChange={reload} />)}</div>
          </section>
        )}

        {events.filter((e) => e.phase === "live").slice(0, 1).map((e) => (
          <section className="yd-section" key={e.id} aria-label="Live seasonal event">
            <h2 className="yd-h2">Live seasonal event <Link href="/yard/events" style={{ fontSize: 14, fontWeight: 700, color: V2.forestLight }}>All events →</Link></h2>
            <div style={{ maxWidth: 520 }}><EventCard ev={e} /></div>
          </section>
        ))}

        {!!grove?.incoming?.length && (
          <section className="yd-section" aria-labelledby="yd-gin">
            <h2 id="yd-gin" className="yd-h2">Grove challenges waiting <span className="yd-pill" style={{ background: "#fef3d8", color: "#8a5a00" }}>⏳ {grove.incoming.length}</span></h2>
            <div className="yd-grid">{grove.incoming.slice(0, 4).map((c) => <GroveChallengeCard key={c.id} ch={c} grove={grove} kind="incoming" onChange={gv.reload} />)}</div>
          </section>
        )}
        {!!grove?.active?.length && (
          <section className="yd-section" aria-labelledby="yd-gact">
            <h2 id="yd-gact" className="yd-h2">{grove.name} in The Yard <Link href="/yard/challenges" style={{ fontSize: 14, fontWeight: 700, color: V2.forestLight }}>All challenges →</Link></h2>
            <div className="yd-grid">{grove.active.slice(0, 2).map((c) => <GroveChallengeCard key={c.id} ch={c} grove={grove} kind="active" onChange={gv.reload} />)}</div>
          </section>
        )}

        <section className="yd-section" aria-labelledby="yd-act">
          <h2 id="yd-act" className="yd-h2">Your active challenges <Link href="/yard/challenges" style={{ fontSize: 14, fontWeight: 700, color: V2.forestLight }}>All challenges →</Link></h2>
          {!ready ? <div className="yd-card">Loading…</div> : you?.active?.length ? (
            <div className="yd-grid">{you.active.slice(0, 4).map((c) => <ChallengeCard key={c.id} ch={c} viewer={username} kind="active" onChange={reload} />)}</div>
          ) : (
            <WagoEmpty title="No Active Challenges" copy="Looks quiet in The Yard. Call someone out." cta={<button type="button" onClick={open} style={{ ...V2Styles.btnPrimary, minHeight: 48 }}>Create a Challenge</button>} />
          )}
        </section>

        <section className="yd-section" aria-labelledby="yd-lb">
          <h2 id="yd-lb" className="yd-h2">Top of The Yard <Link href="/yard/leaderboards" style={{ fontSize: 14, fontWeight: 700, color: V2.forestLight }}>Full leaderboard →</Link></h2>
          <div className="yd-card" style={{ padding: "6px 14px" }}>
            {board === null ? <div style={{ padding: 14 }}>Loading…</div> : board.length === 0 ? (
              <div style={{ padding: 14, fontWeight: 500, color: V2.textBody }}>No results yet. The first finished challenge puts someone on the board.</div>
            ) : board.slice(0, 5).map((p) => (
              <div className="yd-row" key={p.username}>
                <span aria-label={`Rank ${p.rank}`} style={{ width: 30, fontWeight: 800, fontSize: 16, textAlign: "center" }}>{["🥇", "🥈", "🥉"][p.rank - 1] || `#${p.rank}`}</span>
                <Avatar name={p.username} src={p.avatar_url} size={38} />
                <Link href={`/u/${p.username}`} style={{ flex: 1, fontWeight: 800, color: V2.forestGreen, textDecoration: "none", overflowWrap: "anywhere" }}>@{p.username}</Link>
                <span style={{ fontSize: 13, fontWeight: 700, color: V2.dimGray }}>{p.wins}W · {p.winRate}%</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      {creating && <CreateChallengeSheet viewer={username} presetOpponent={preset} presetMode={mode} onClose={() => { setCreating(false); if (router.query.new) router.replace("/yard", undefined, { shallow: true }); }} onSent={() => { reload(); gv.reload(); }} />}
    </>
  );
}
