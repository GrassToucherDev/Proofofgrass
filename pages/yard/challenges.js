// /yard/challenges — pending, active, completed and history for the signed-in username.
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import V2Nav from "../../components/V2Nav";
import { V2, V2Styles, V2GlobalCSS } from "../../utils/v2Theme";
import { useYard } from "../../hooks/useYard";
import { yardCSS, ChallengeCard, WagoEmpty } from "../../components/yard/YardUI";
import CreateChallengeSheet from "../../components/yard/CreateChallengeSheet";

const TABS = [["pending", "Pending"], ["active", "Active"], ["completed", "Completed"], ["history", "History"]];

export default function YardChallenges() {
  const { username, data, error, ready, reload } = useYard();
  const [tab, setTab] = useState("active");
  const [creating, setCreating] = useState(false);
  const you = data?.you;
  useEffect(() => { if (you?.incoming?.length) setTab("pending"); }, [you?.incoming?.length]);

  const past = you?.history || [];
  const completed = past.filter((c) => c.result);
  const rest = past.filter((c) => !c.result);
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
            <div className="yd-tabs" role="tablist" aria-label="Challenge lists" style={{ marginTop: 16 }}>
              {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className="yd-tab" onClick={() => setTab(k)}>{l} ({counts[k]})</button>)}
            </div>
            {!ready ? <div className="yd-card">Loading…</div> : (
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
      {creating && <CreateChallengeSheet viewer={username} onClose={() => setCreating(false)} onSent={reload} />}
    </>
  );
}
