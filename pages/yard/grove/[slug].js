// /yard/grove/[slug] — one Grove vs Grove challenge (the link the owner shares).
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import V2Nav from "../../../components/V2Nav";
import { V2, V2GlobalCSS } from "../../../utils/v2Theme";
import { getYardUser, useYardGroves } from "../../../hooks/useYard";
import { yardCSS, WagoEmpty } from "../../../components/yard/YardUI";
import { GroveChallengeCard } from "../../../components/yard/GroveYardUI";

export default function GroveChallengePage() {
  const { query, isReady } = useRouter();
  const [ch, setCh] = useState(undefined);
  const [me, setMe] = useState("");
  useEffect(() => setMe(getYardUser()), []);
  const gv = useYardGroves(me);
  const load = useCallback(() => {
    if (!query.slug) return;
    fetch(`/api/yard/groves/challenge?slug=${encodeURIComponent(query.slug)}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => setCh(d.challenge || null)).catch(() => setCh(null));
  }, [query.slug]);
  useEffect(() => { if (isReady) load(); }, [isReady, load]);
  const grove = gv.data?.grove || null;
  const kind = ch && ch.status === "pending" && grove ? (ch.challenged.id === grove.id ? "incoming" : ch.challenger.id === grove.id ? "outgoing" : "view") : ch?.status === "active" ? "active" : "past";
  return (
    <>
      <Head><title>{ch ? `${ch.challenger.name} vs ${ch.challenged.name}` : "Grove challenge"} | The Yard</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{V2GlobalCSS + yardCSS}</style>
      <V2Nav />
      <main className="yd-wrap" style={{ paddingTop: 22, maxWidth: 720 }}>
        <Link href="/yard" style={{ fontSize: 13, fontWeight: 700, color: V2.forestLight }}>← The Yard</Link>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: V2.forestGreen, margin: "4px 0 16px" }}>Grove Challenge</h1>
        {ch === undefined ? <div className="yd-card">Loading…</div> : ch === null ? (
          <WagoEmpty title="Challenge not found" copy="This link may be wrong, or the challenge was removed." />
        ) : (
          <GroveChallengeCard ch={ch} grove={grove} kind={kind} detail onChange={() => { load(); gv.reload(); }} />
        )}
      </main>
    </>
  );
}
