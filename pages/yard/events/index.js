// /yard/events — seasonal events: live, upcoming and past.
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import V2Nav from "../../../components/V2Nav";
import { V2, V2GlobalCSS } from "../../../utils/v2Theme";
import { getYardUser } from "../../../hooks/useYard";
import { yardCSS, WagoEmpty } from "../../../components/yard/YardUI";
import { EventCard } from "../../../components/yard/EventUI";

export default function YardEvents() {
  const [events, setEvents] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const u = getYardUser();
    fetch(`/api/yard/events${u ? `?username=${encodeURIComponent(u)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => d.events ? setEvents(d.events) : setErr(d.error || "Could not load events."))
      .catch(() => setErr("Could not load events."));
  }, []);
  const by = (p) => (events || []).filter((e) => e.phase === p);
  const Section = ({ title, list }) => list.length ? (
    <section className="yd-section" aria-label={title}>
      <h2 className="yd-h2">{title}</h2>
      <div className="yd-grid">{list.map((e) => <EventCard key={e.id} ev={e} />)}</div>
    </section>
  ) : null;
  return (
    <>
      <Head><title>Seasonal Events | The Yard</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{V2GlobalCSS + yardCSS}</style>
      <V2Nav />
      <main className="yd-wrap" style={{ paddingTop: 22 }}>
        <Link href="/yard" style={{ fontSize: 13, fontWeight: 700, color: V2.forestLight }}>← The Yard</Link>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: V2.forestGreen }}>Seasonal Events</h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody, maxWidth: 560 }}>Special limited-time competitions with their own leaderboards. Enter, post your proofs, and climb.</p>
        {err && <div role="alert" className="yd-card" style={{ color: V2.danger, fontWeight: 600, marginTop: 14 }}>{err}</div>}
        {events === null && !err && <div className="yd-card" style={{ marginTop: 14 }}>Loading…</div>}
        {events && events.length === 0 && <div style={{ marginTop: 16 }}><WagoEmpty title="No Seasonal Event" copy="The Yard is between events. Check back soon." /></div>}
        {events && <><Section title="Live now" list={by("live")} /><Section title="Coming up" list={by("upcoming")} /><Section title="Past events" list={by("ended")} /></>}
      </main>
    </>
  );
}
