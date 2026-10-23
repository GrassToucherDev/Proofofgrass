// /admin/yard-events — create, edit, publish and cancel Seasonal Events. Needs the admin secret (sent as x-admin-secret).
import { useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";

const EMPTY = { id: "", slug: "", title: "", event_type: "individual", starts_at: "", ends_at: "", reward_text: "", eligibility_text: "", image_path: "", description: "", status: "draft" };
// <input type=datetime-local> works in local time; the server stores UTC.
const toLocalInput = (iso) => { if (!iso) return ""; const d = new Date(iso); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const field = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #cfd9c6", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" };
const btn = (primary) => ({ padding: "10px 18px", borderRadius: 10, border: primary ? "none" : "1.5px solid #9bbf7d", background: primary ? "#3f8f1f" : "#fff", color: primary ? "#fff" : "#1a4a0a", fontWeight: 700, cursor: "pointer", fontSize: 14, minHeight: 44 });

export default function AdminYardEvents() {
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (method, body) => {
    const r = await fetch("/api/yard/events/admin", { method, headers: { "Content-Type": "application/json", "x-admin-secret": secret }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, d };
  }, [secret]);
  const load = useCallback(async () => {
    const { ok, d } = await api("GET");
    if (!ok) { setMsg(d.error || "Could not load."); setEvents(null); return; }
    setEvents(d.events); setMsg("");
  }, [api]);

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const body = { ...f, starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : "", ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : "" };
    if (!body.id) delete body.id;
    const { ok, d } = await api("POST", body);
    setBusy(false);
    if (!ok) { setMsg(d.error || "Could not save."); return; }
    setMsg(f.id ? "Saved." : "Created as a draft. Publish it when you're ready."); setF(EMPTY); load();
  };
  const setStatus = async (ev, status) => {
    const { ok, d } = await api("POST", { id: ev.id, status });
    setMsg(ok ? `"${ev.title}" is now ${status}.` : d.error || "Could not update."); load();
  };
  const edit = (ev) => setF({ id: ev.id, slug: ev.slug, title: ev.title, event_type: ev.event_type, starts_at: toLocalInput(ev.starts_at), ends_at: toLocalInput(ev.ends_at),
    reward_text: ev.reward_text || "", eligibility_text: ev.eligibility_text || "", image_path: ev.image_path || "", description: ev.description || "", status: ev.status, entrants: ev.entrants });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const lockedFields = !!(f.id && f.entrants);

  return (
    <>
      <Head><title>Yard events | Admin</title><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /></Head>
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 80px", fontFamily: "system-ui, sans-serif", color: "#1a2a14" }}>
        <Link href="/yard/events" style={{ fontSize: 13, color: "#3f8f1f", fontWeight: 700 }}>← Seasonal Events</Link>
        <h1 style={{ fontSize: 28, margin: "6px 0 16px" }}>Yard events (admin)</h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="password" aria-label="Admin secret" placeholder="Admin secret" value={secret} onChange={(e) => setSecret(e.target.value)} style={field} autoComplete="off" />
          <button type="button" onClick={load} style={btn(true)}>Load</button>
        </div>
        {msg && <div role="status" style={{ padding: "10px 14px", background: "#f1fbe6", borderRadius: 10, marginBottom: 14, fontWeight: 600 }}>{msg}</div>}

        {events && (
          <>
            <form onSubmit={save} style={{ display: "grid", gap: 10, background: "#fff", border: "1.5px solid #dfe8d6", borderRadius: 16, padding: 16, marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{f.id ? `Edit "${f.title}"` : "New event"}</h2>
              {lockedFields && <div style={{ fontSize: 13, color: "#8a5a00" }}>{f.entrants} entered, so type and start date are locked.</div>}
              <label>Title<input style={field} value={f.title} onChange={set("title")} maxLength={80} required /></label>
              <label>Slug (the link: /yard/events/…)<input style={field} value={f.slug} onChange={set("slug")} placeholder="fall-streak-2026" pattern="[a-z0-9\-]{3,60}" required /></label>
              <label>Type
                <select style={field} value={f.event_type} onChange={set("event_type")} disabled={lockedFields}>
                  <option value="individual">Individual (ranked by proof days)</option>
                  <option value="grove">Grove (ranked by days the Grove hit its daily target)</option>
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <label>Starts (your local time)<input type="datetime-local" style={field} value={f.starts_at} onChange={set("starts_at")} disabled={lockedFields} required /></label>
                <label>Ends (your local time)<input type="datetime-local" style={field} value={f.ends_at} onChange={set("ends_at")} required /></label>
              </div>
              <label>Reward (shown to players)<input style={field} value={f.reward_text} onChange={set("reward_text")} maxLength={200} placeholder="Top 3 win a Sunset Shores banner" /></label>
              <label>Eligibility note (optional)<input style={field} value={f.eligibility_text} onChange={set("eligibility_text")} maxLength={200} placeholder="Open to everyone with a secured username." /></label>
              <label>Image path (optional, leave empty for the default)<input style={field} value={f.image_path} onChange={set("image_path")} placeholder="/yard/events/fall.webp" /></label>
              <label>Description<textarea style={{ ...field, minHeight: 90 }} value={f.description} onChange={set("description")} maxLength={1000} /></label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" disabled={busy} style={btn(true)}>{busy ? "Saving…" : f.id ? "Save changes" : "Create draft"}</button>
                {f.id && <button type="button" onClick={() => setF(EMPTY)} style={btn(false)}>Cancel edit</button>}
              </div>
            </form>

            <h2 style={{ fontSize: 18 }}>All events</h2>
            {events.length === 0 && <p>No events yet.</p>}
            <div style={{ display: "grid", gap: 10 }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ background: "#fff", border: "1.5px solid #dfe8d6", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 800 }}>{ev.title} <span style={{ fontWeight: 600, color: "#6a7a60", fontSize: 13 }}>· {ev.event_type} · {ev.status} · {ev.phase}</span></div>
                  <div style={{ fontSize: 13, color: "#566650", margin: "4px 0 10px" }}>{new Date(ev.starts_at).toLocaleString()} → {new Date(ev.ends_at).toLocaleString()} · {ev.entrants} entered · /yard/events/{ev.slug}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => edit(ev)} style={btn(false)}>Edit</button>
                    {ev.status !== "published" && <button type="button" onClick={() => setStatus(ev, "published")} style={btn(true)}>Publish</button>}
                    {ev.status === "published" && <button type="button" onClick={() => setStatus(ev, "draft")} style={btn(false)}>Unpublish</button>}
                    {ev.status !== "cancelled" && <button type="button" onClick={() => { if (confirm(`Cancel "${ev.title}"? It disappears from the public list and nobody can enter.`)) setStatus(ev, "cancelled"); }} style={btn(false)}>Cancel event</button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
