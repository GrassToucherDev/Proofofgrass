// /yard/challenges — pending, active, completed and history for the signed-in username.
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import V2Nav from "../../components/V2Nav";
import { V2, V2Styles, V2GlobalCSS } from "../../utils/v2Theme";
import { useYard, useYardGroves } from "../../hooks/useYard";
import { yardCSS, ChallengeCard, WagoEmpty } from "../../components/yard/YardUI";
import CreateChallengeSheet from "../../components/yard/CreateChallengeSheet";
import { GroveChallengeCard } from "../../components/yard/GroveYardUI";

const TABS = [["pending", "Pending"], ["active", "Active"], ["completed", "Completed"], ["history", "History"]];

export default function YardChallenges() {
  const { username, data, error, ready, reload } = useYard();
  const [tab, setTab] = useState("active");
  const [kindTab, setKindTab] = useState("1v1");
  const gv = useYardGroves(username);
  const grove = gv.data?.grove;
  const [creating, setCreating] = useState(false);
  const you = data?.you;
  useEffect(() => { if (you?.incoming?.length) setTab("pending"); }, [you?.incoming?.length]);
  useEffect(() => { if (kindTab === "grove" && grove?.incoming?.length) setTab("pending"); }, [kindTab, grove?.incoming?.length]);

  const past = you?.history || [];
  const completed = past.filter((c) => c.result);
  const rest = past.filter((c) => !c.result);
  const gp = grove ? [...grove.incoming, ...grove.outgoing] : [];
  const gPast = grove?.history || [];
  const gCompleted = gPast.filter((c) => c.result);
  const gRest = gPast.filter((c) => !c.result);
  const gcounts = { pending: gp.length, active: grove?.active?.length || 0, completed: gCompleted.length, history: gRest.length };
  const counts = { pending: (you?.incoming?.length || 0) + (you?.outgoing?.length || 0), active: you?.active?.length || 0, completed: completed.length, history: rest.length };
  const newBtn = <button type="button" onClick={() => setCreating(true)} style={{ ...V2Styles.btnPrimary, minHeight: 48 }}>Create a Challenge</button>;

  return (
    <>
      <Head><title>Your Challenges | The Yard</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{V2GlobalCSS + yardCSS}</style>
      <V2Nav />
      <main className="yd-wrap" style={{ paddingTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Link href="/yard" style={{ fontSize: 13, fontWeight: 700, color: V2.forestLight }}>← The Yard</Link>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: V2.forestGreen }}>Your Challenges</h1>
          </div>
          {newBtn}
        </div>
        {!username && ready && <WagoEmpty title="Enter your username" copy="Add your username on the dashboard to see your challenges." cta={<Link href="/" style={{ ...V2Styles.btnPrimary, textDecoration: "none", minHeight: 48 }}>Go to dashboard</Link>} />}
        {error && <div role="alert" className="yd-card" style={{ color: V2.danger, fontWeight: 600, marginTop: 14 }}>{error}</div>}
        {username && (
          <>
            <div className="yd-tabs" role="group" aria-label="Challenge type" style={{ marginTop: 16 }}>
              {[["1v1", "⚔️ 1v1"], ["grove", "🌳 Grove vs Grove"]].map(([k, l]) => <button key={k} aria-pressed={kindTab === k} className="yd-tab" style={kindTab === k ? { background: "#e6f5d8", color: "#2d6b1a", borderColor: "#7dc832" } : {}} onClick={() => setKindTab(k)}>{l}</button>)}
            </div>
            <div className="yd-tabs" role="tablist" aria-label="Challenge lists">
              {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className="yd-tab" onClick={() => setTab(k)}>{l} ({(kindTab === "grove" ? gcounts : counts)[k]})</button>)}
            </div>
            {kindTab === "grove" ? (!gv.ready ? <div className="yd-card">Loading…</div> : !grove ? (
              <WagoEmpty title="You're not in a Grove" copy="Join or create a Grove (3 to 6 members) to take on other Groves." cta={<Link href="/groves" style={{ ...V2Styles.btnPrimary, textDecoration: "none", minHeight: 48 }}>Go to Groves</Link>} />
            ) : (
              <div role="tabpanel">
                {tab === "pending" && (gcounts.pending ? (
                  <>
                    {!!grove.incoming.length && <><h2 className="yd-h2">Waiting for {grove.name}</h2><div className="yd-grid">{grove.incoming.map((c) => <GroveChallengeCard key={c.id} ch={c} grove={grove} kind="incoming" onChange={gv.reload} />)}</div></>}
                    {!!grove.outgoing.length && <><h2 className="yd-h2" style={{ marginTop: 24 }}>Sent by {grove.name}</h2><div className="yd-grid">{grove.outgoing.map((c) => <GroveChallengeCard key={c.id} ch={c} grove={grove} kind="outgoing" />)}</div></>}
                  </>
                ) : <WagoEmpty title="Nothing pending" copy="No Grove challenges waiting. Only the Grove owner can send them." cta={newBtn} />)}
                {tab === "active" && (gcounts.active ? <div className="yd-grid">{grove.active.map((c) => <GroveChallengeCard key={c.id} ch={c} grove={grove} kind="active" />)}</div> : <WagoEmpty title="No Active Grove Challenges" copy="Rally your Grove and call out another one." cta={newBtn} />)}
                {tab === "completed" && (gcounts.completed ? <div className="yd-grid">{gCompleted.map((c) => <GroveChallengeCard key={c.id} ch={c} grove={grove} kind="past" />)}</div> : <WagoEmpty title="No finished Grove challenges yet" copy="Results show up here as soon as a challenge ends." />)}
                {tab === "history" && (gcounts.history ? <div className="yd-grid">{gRest.map((c) => <GroveChallengeCard key={c.id} ch={c} grove={grove} kind="past" />)}</div> : <WagoEmpty title="Nothing here" copy="Declined and expired Grove challenges show up here." />)}
              </div>
            )) : !ready ? <div className="yd-card">Loading…</div> : (
              <div role="tabpanel">
                {tab === "pending" && (counts.pending ? (
                  <>
                    {!!you.incoming.length && <><h2 className="yd-h2">Waiting for your answer</h2><div className="yd-grid">{you.incoming.map((c) => <ChallengeCard key={c.id} ch={c} viewer={username} kind="incoming" onChange={reload} />)}</div></>}
                    {!!you.outgoing.length && <><h2 className="yd-h2" style={{ marginTop: 24 }}>Sent by you</h2><div className="yd-grid">{you.outgoing.map((c) => <ChallengeCard key={c.id} ch={c} viewer={username} kind="outgoing" />)}</div></>}
                  </>
                ) : <WagoEmpty title="Nothing pending" copy="Looks quiet in The Yard. Call someone out." cta={newBtn} />)}
                {tab === "active" && (counts.active ? <div className="yd-grid">{you.active.map((c) => <ChallengeCard key={c.id} ch={c} viewer={username} kind="active" />)}</div> : <WagoEmpty title="No Active Challenges" copy="Looks quiet in The Yard. Call someone out." cta={newBtn} />)}
                {tab === "completed" && (counts.completed ? <div className="yd-grid">{completed.map((c) => <ChallengeCard key={c.id} ch={c} viewer={username} kind="past" />)}</div> : <WagoEmpty title="No finished challenges yet" copy="Results show up here as soon as a challenge ends." />)}
                {tab === "history" && (counts.history ? <div className="yd-grid">{rest.map((c) => <ChallengeCard key={c.id} ch={c} viewer={username} kind="past" />)}</div> : <WagoEmpty title="Nothing here" copy="Declined, expired and older challenges show up here." />)}
              </div>
            )}
          </>
        )}
      </main>
      {creating && <CreateChallengeSheet viewer={username} presetMode={kindTab === "grove" ? "grove" : ""} onClose={() => setCreating(false)} onSent={() => { reload(); gv.reload(); }} />}
    </>
  );
}
