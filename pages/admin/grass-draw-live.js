// pages/admin/grass-draw-live.js — run the live Grass Draw reveal.
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { adminFetch } from "../../utils/adminClient";

export default function AdminGrassDrawLive() {
  const [d, setD] = useState({ shows: [], cycles: [] });
  const [cycle, setCycle] = useState("");
  const [title, setTitle] = useState("Grass Draw");
  const [when, setWhen] = useState("");
  const [lead, setLead] = useState(15);
  const [step, setStep] = useState(6);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await adminFetch("/api/grass-draw/live-admin");
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setD(j); if (!cycle && j.cycles?.[0]) setCycle(String(j.cycles[0].id)); } else setMsg(j.error || "Couldn't load.");
  }, [cycle]);
  useEffect(() => { load(); }, [load]);

  async function act(body) {
    setMsg("Working…");
    const r = await adminFetch("/api/grass-draw/live-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Done." : (j.error || "Failed."));
    load();
  }
  const show = d.shows.find((s) => s.status !== "archived");
  const box = { background: "white", border: "1px solid #cfe3c0", borderRadius: 12, padding: 16, marginBottom: 14 };
  const btn = { padding: "9px 16px", borderRadius: 8, border: "none", background: "#3d7a12", color: "white", fontWeight: 700, cursor: "pointer", marginRight: 8 };
  const btn2 = { ...btn, background: "#eee", color: "#333" };

  return (
    <>
      <Head><title>Live Draw | Admin</title></Head>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif" }}>
        <h1>Live Grass Draw</h1>
        <p style={{ color: "#555" }}>Run the normal draw first (Grass Draw admin). This page only <b>reveals</b> the winners already drawn, live, to everyone on <Link href="/grass-draw/live">/grass-draw/live</Link>.</p>
        {msg && <div style={{ ...box, background: "#f6fbef" }}>{msg}</div>}

        <div style={box}>
          <h3 style={{ marginTop: 0 }}>1. Schedule a show</h3>
          <select value={cycle} onChange={(e) => setCycle(e.target.value)} style={{ padding: 8, marginRight: 8 }}>
            {d.cycles.map((c) => <option key={c.id} value={c.id}>{(c.name || String(c.id).slice(0, 8))} — {c.status} — {c.winners} winner(s)</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ padding: 8, marginRight: 8 }} />
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ padding: 8, marginRight: 8 }} />
          <div style={{ marginTop: 10 }}><button style={btn} onClick={() => act({ action: "create", cycle_id: cycle, title, scheduled_at: when ? new Date(when).toISOString() : null })}>Create / replace show</button></div>
        </div>

        {show && (
          <div style={box}>
            <h3 style={{ marginTop: 0 }}>2. Go live — “{show.title}”</h3>
            <div style={{ color: "#555", marginBottom: 8 }}>Status: <b>{show.status}</b>{show.started_at ? ` · started ${new Date(show.started_at).toLocaleString()}` : " · not started"}{show.reveal_order?.length ? ` · ${show.reveal_order.length} winners queued` : ""}</div>
            <label>Countdown (sec) <input type="number" value={lead} onChange={(e) => setLead(e.target.value)} style={{ width: 70, margin: "0 12px 0 6px" }} /></label>
            <label>Seconds per winner <input type="number" value={step} onChange={(e) => setStep(e.target.value)} style={{ width: 70, marginLeft: 6 }} /></label>
            <div style={{ marginTop: 12 }}>
              <button style={btn} onClick={() => { if (confirm("Start the live reveal now?")) act({ action: "start", show_id: show.id, lead_seconds: lead, step_seconds: step }); }}>▶ Start the reveal</button>
              <button style={btn2} onClick={() => act({ action: "reset", show_id: show.id })}>Reset</button>
              <button style={btn2} onClick={() => act({ action: "archive", show_id: show.id })}>Archive</button>
            </div>
            <p style={{ fontSize: 13, color: "#777" }}>Open <a href="/grass-draw/live" target="_blank" rel="noreferrer">the live page</a> in another tab to preview. Reset lets you rehearse again.</p>
          </div>)}
      </div>
    </>
  );
}
