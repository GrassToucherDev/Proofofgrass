// /yard/leaderboards — competitive board built only from server-settled challenge results.
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import V2Nav from "../../components/V2Nav";
import { V2, V2GlobalCSS } from "../../utils/v2Theme";
import { getYardUser } from "../../hooks/useYard";
import { yardCSS, Avatar, WagoEmpty } from "../../components/yard/YardUI";

const TABS = [["individual", "Individual"], ["groves", "Groves"], ["seasonal", "Seasonal"]];
const METRICS = [["wins", "Most wins"], ["rate", "Win rate"], ["completed", "Most played"]];

export default function YardLeaderboards() {
  const [tab, setTab] = useState("individual");
  const [metric, setMetric] = useState("wins");
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [me, setMe] = useState("");
  useEffect(() => setMe(getYardUser()), []);
  useEffect(() => {
    if (tab !== "individual") return;
    setRows(null); setErr("");
    fetch(`/api/yard/leaderboard?metric=${metric}`).then((r) => r.json()).then((d) => d.players ? setRows(d.players) : setErr(d.error || "Could not load the leaderboard.")).catch(() => setErr("Could not load the leaderboard."));
  }, [tab, metric]);

  return (
    <>
      <Head><title>Leaderboards | The Yard</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{V2GlobalCSS + yardCSS}</style>
      <V2Nav />
      <main className="yd-wrap" style={{ paddingTop: 22 }}>
        <Link href="/yard" style={{ fontSize: 13, fontWeight: 700, color: V2.forestLight }}>← The Yard</Link>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: V2.forestGreen }}>Yard Leaderboards</h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody, maxWidth: 560 }}>Competitive results only: finished 1v1 challenges. This is separate from the main Proof of Grass leaderboard.</p>
        <div className="yd-tabs" role="tablist" aria-label="Leaderboard type" style={{ marginTop: 14 }}>
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className="yd-tab" onClick={() => setTab(k)}>{l}</button>)}
        </div>
        {tab === "individual" && (
          <>
            <div className="yd-tabs" role="group" aria-label="Sort by">
              {METRICS.map(([k, l]) => <button key={k} aria-pressed={metric === k} className="yd-tab" style={metric === k ? { background: "#e6f5d8", color: "#2d6b1a", borderColor: "#7dc832" } : {}} onClick={() => setMetric(k)}>{l}</button>)}
            </div>
            {metric === "rate" && <p style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray, margin: "0 2px 8px" }}>Win rate counts players with 3 or more finished challenges.</p>}
            {err && <div role="alert" className="yd-card" style={{ color: V2.danger, fontWeight: 600 }}>{err}</div>}
            {rows === null && !err ? <div className="yd-card">Loading…</div> : rows && rows.length === 0 ? (
              <WagoEmpty title="No results yet" copy="The first finished challenge puts someone on the board." />
            ) : rows && (
              <div className="yd-card" style={{ padding: "6px 14px" }}>
                <div role="table" aria-label="Individual Yard leaderboard">
                  {rows.map((p) => (
                    <div role="row" className="yd-row" key={p.username} style={p.username === me ? { background: "#f1fbe6", borderRadius: 14 } : {}}>
                      <span role="cell" aria-label={`Rank ${p.rank}`} style={{ width: 34, fontWeight: 800, textAlign: "center" }}>{["🥇", "🥈", "🥉"][p.rank - 1] || `#${p.rank}`}</span>
                      <Avatar name={p.username} src={p.avatar_url} size={40} />
                      <span role="cell" style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/u/${p.username}`} style={{ fontWeight: 800, color: V2.forestGreen, textDecoration: "none", overflowWrap: "anywhere" }}>@{p.username}</Link>{p.username === me && <span style={{ fontSize: 11, fontWeight: 700, color: "#2d6b1a" }}> (you)</span>}
                        <div style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray }}>{p.wins}W · {p.losses}L · {p.ties}T</div>
                      </span>
                      <span role="cell" style={{ textAlign: "right", fontWeight: 800, color: V2.forestGreen }}>
                        {metric === "wins" ? `${p.wins} wins` : metric === "rate" ? `${p.winRate}%` : `${p.completed} played`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {tab === "groves" && <WagoEmpty title="Grove competition is coming" copy="Your Grove hasn't stepped into The Yard yet. Grove vs Grove arrives soon." />}
        {tab === "seasonal" && <WagoEmpty title="No Seasonal Event" copy="The Yard is between events. Check back soon." />}
      </main>
    </>
  );
}
