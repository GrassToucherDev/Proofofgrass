// /yard/events/[slug] — one seasonal event: details, how it's scored, join, and the live leaderboard.
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import V2Nav from "../../../components/V2Nav";
import { V2, V2Styles, V2GlobalCSS } from "../../../utils/v2Theme";
import { getYardUser, yardPost } from "../../../hooks/useYard";
import { yardError } from "../../../utils/yardErrors";
import { yardCSS, Avatar, WagoEmpty } from "../../../components/yard/YardUI";
import { PhasePill, typeLabel, timeLeft } from "../../../components/yard/EventUI";
import { GroveMembers } from "../../../components/yard/GroveYardUI";
import GroveBanner from "../../../components/GroveBanner";
import { fmtDate } from "../../../utils/yardStatus";

export default function YardEvent() {
  const { query, isReady } = useRouter();
  const [d, setD] = useState(undefined);
  const [me, setMe] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [needSignIn, setNeedSignIn] = useState(false);
  useEffect(() => setMe(getYardUser()), []);
  const load = useCallback((u) => {
    if (!query.slug) return;
    fetch(`/api/yard/events/${encodeURIComponent(query.slug)}${u ? `?username=${encodeURIComponent(u)}` : ""}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null).then((x) => setD(x || null)).catch(() => setD(null));
  }, [query.slug]);
  useEffect(() => { if (isReady) load(me); }, [isReady, me, load]);

  const join = async () => {
    setBusy(true); setErr(""); setNeedSignIn(false);
    const { ok, data } = await yardPost("/api/yard/events/join", { username: me, slug: query.slug });
    setBusy(false);
    if (!ok) { setErr(yardError(data)); setNeedSignIn(data?.code === "not_signed_in"); return; }
    load(me);
  };

  const ev = d?.event, you = d?.you, grove = you?.grove;
  const isGrove = ev?.event_type === "grove";
  let action = null;
  if (ev && (ev.phase === "live" || ev.phase === "upcoming")) {
    if (you?.entered) action = <div className="yd-pill" style={{ background: "#e6f5d8", color: "#2d6b1a", fontSize: 14, padding: "10px 16px" }}>✓ {isGrove ? "Your Grove is in" : "You're in"}{you.rank ? ` · currently #${you.rank}` : ""}</div>;
    else if (!me) action = <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody }}>Enter your username on your <Link href="/" style={{ color: V2.forestLight, fontWeight: 700 }}>dashboard</Link> to join.</p>;
    else if (isGrove && !grove) action = <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody }}>You're not in a Grove. <Link href="/groves" style={{ color: V2.forestLight, fontWeight: 700 }}>Join or create one</Link> (3 to 6 members) to compete.</p>;
    else if (isGrove && !grove.is_owner) action = <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody }}>Only your Grove owner can enter {grove.name}. Ask them to join this event.</p>;
    else if (isGrove && !grove.can_compete) action = <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody }}>{grove.name} needs at least 3 members to enter. <Link href="/groves" style={{ color: V2.forestLight, fontWeight: 700 }}>Invite friends</Link>.</p>;
    else action = <button type="button" disabled={busy} onClick={join} style={{ ...V2Styles.btnPrimary, minHeight: 52, padding: "0 28px", opacity: busy ? .7 : 1 }}>{busy ? "Entering…" : isGrove ? `Enter ${grove.name}` : "Join this event"}</button>;
  }

  return (
    <>
      <Head><title>{ev ? `${ev.title} | The Yard` : "Seasonal Event | The Yard"}</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{V2GlobalCSS + yardCSS}</style>
      <V2Nav />
      <main className="yd-wrap" style={{ paddingTop: 22, maxWidth: 860 }}>
        <Link href="/yard/events" style={{ fontSize: 13, fontWeight: 700, color: V2.forestLight }}>← Seasonal Events</Link>
        {d === undefined ? <div className="yd-card" style={{ marginTop: 14 }}>Loading…</div> : d === null ? (
          <div style={{ marginTop: 16 }}><WagoEmpty title="Event not found" copy="This link may be wrong, or the event isn't published." /></div>
        ) : (
          <>
            <div style={{ borderRadius: 24, overflow: "hidden", marginTop: 12, boxShadow: V2.shadowMd, background: V2.gradientSky }}>
              <div role="img" aria-label="" style={{ height: "clamp(140px,26vw,240px)", background: `url(${ev.image}) center / cover no-repeat, #d8ecc8` }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0 8px" }}>
              <PhasePill phase={ev.phase} />
              <span className="yd-pill" style={{ background: "#e8f0fa", color: "#2a4f7a" }}>{isGrove ? "🌳" : "🧑"} {typeLabel(ev.event_type)}</span>
            </div>
            <h1 style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 800, color: V2.forestGreen, overflowWrap: "anywhere" }}>{ev.title}</h1>
            <p style={{ fontSize: 13, fontWeight: 600, color: V2.dimGray, margin: "4px 0 12px" }}>{fmtDate(ev.starts_at)} → {fmtDate(ev.ends_at)} · {timeLeft(ev)} · {ev.entrants} {isGrove ? "Groves" : "players"} entered</p>
            {ev.description && <p style={{ fontSize: 15, fontWeight: 500, color: V2.textBody, lineHeight: 1.6, maxWidth: 640, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{ev.description}</p>}
            {ev.reward_text && <div className="yd-card" style={{ margin: "14px 0", background: "#fef9e8", borderColor: "#f0d9a0", fontWeight: 700, color: "#8a5a00" }}>🎁 Reward: {ev.reward_text}</div>}

            <section className="yd-card" style={{ margin: "14px 0" }} aria-label="How it works">
              <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".1em", color: V2.forestLight, marginBottom: 6 }}>HOW IT WORKS</h2>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, fontWeight: 500, color: V2.textBody, lineHeight: 1.65 }}>
                {isGrove ? (<>
                  <li>The Grove owner enters their Grove (3+ members). The roster is locked when you enter.</li>
                  <li>A day counts when at least 2/3 of the locked roster posts a proof.</li>
                  <li>Most counted days wins. A tie goes to the higher posts per member.</li>
                </>) : (<>
                  <li>Join the event, then post proofs as usual.</li>
                  <li>Each day you post a proof during the event counts as one day.</li>
                  <li>Most days wins. A tie goes to total proofs, then whoever joined first.</li>
                </>)}
                <li>{ev.eligibility_text || "Open to everyone with a secured username."} Days are counted in UTC.</li>
                <li>Standings are counted by the server from real proofs.</li>
              </ul>
            </section>

            {action && <div style={{ margin: "16px 0" }}>{action}</div>}
            {err && <div role="alert" style={{ fontSize: 13, fontWeight: 600, color: V2.danger, margin: "8px 0" }}>{err}{needSignIn && <> <button type="button" onClick={() => signIn("google")} style={{ ...V2Styles.btnPrimary, marginLeft: 8, minHeight: 44, padding: "0 16px" }}>Sign in with Google</button></>}</div>}

            <h2 className="yd-h2" style={{ marginTop: 28 }}>Leaderboard</h2>
            {ev.phase === "upcoming" ? <WagoEmpty title="Not started yet" copy="Standings appear when the event begins." />
              : d.standings.length === 0 ? <WagoEmpty pose="trophy" title="No entries yet" copy={ev.phase === "ended" ? "Nobody entered this event." : "Be the first to enter."} />
              : (
              <div className="yd-card" style={{ padding: "6px 14px" }}>
                <div role="table" aria-label="Event leaderboard">
                  {d.standings.map((r) => {
                    const mine = isGrove ? (grove && r.grove_id === grove.id) : r.username === me;
                    return (
                      <div role="row" className="yd-row" key={isGrove ? r.grove_id : r.username} style={{ flexWrap: "wrap", ...(mine ? { background: "#f1fbe6", borderRadius: 14 } : {}) }}>
                        <span role="cell" aria-label={`Rank ${r.rank}`} style={{ width: 34, fontWeight: 800, textAlign: "center" }}>{["🥇", "🥈", "🥉"][r.rank - 1] || `#${r.rank}`}</span>
                        {isGrove ? <GroveBanner banner={r.banner} height={40} radius={10} style={{ width: 64, flex: "none" }} /> : <Avatar name={r.username} src={r.avatar_url} size={40} />}
                        <span role="cell" style={{ flex: 1, minWidth: 0 }}>
                          {isGrove ? <span style={{ fontWeight: 800, color: V2.forestGreen, overflowWrap: "anywhere" }}>{r.name}</span>
                            : <Link href={`/u/${r.username}`} style={{ fontWeight: 800, color: V2.forestGreen, textDecoration: "none", overflowWrap: "anywhere" }}>@{r.username}</Link>}
                          {mine && <span style={{ fontSize: 11, fontWeight: 700, color: "#2d6b1a" }}> (you)</span>}
                          <div style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray }}>{r.posts} proofs{isGrove ? ` · ${r.size} members` : ""}</div>
                        </span>
                        <span role="cell" style={{ textAlign: "right", fontWeight: 800, color: V2.forestGreen }}>{r.days} days</span>
                        {isGrove && <div style={{ flexBasis: "100%", paddingLeft: 46 }}><GroveMembers groveId={r.grove_id} eventSlug={ev.slug} count={r.size} compact /></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {you?.entered && !d.standings.some((r) => (isGrove ? r.grove_id === grove?.id : r.username === me)) && (
              <p style={{ fontSize: 13, fontWeight: 600, color: V2.textBody, marginTop: 10 }}>You're currently #{you.rank} with {you.days} days.</p>
            )}
          </>
        )}
      </main>
    </>
  );
}
