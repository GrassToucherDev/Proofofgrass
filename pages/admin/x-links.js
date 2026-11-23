// /admin/x-links — which verified X account belongs to each Proof of Grass username. Paste usernames to get their @handles.
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";

const box = { color: "#1f2d17", background: "#fff", border: `1px solid ${V2.borderSoft}`, borderRadius: 14, padding: 16, marginBottom: 14 };
const inp = { boxSizing: "border-box", border: `1px solid ${V2.borderSoft}`, borderRadius: 8, padding: "8px 10px", fontSize: 16, background: "#fff", color: "#1f2d17", width: "100%", fontFamily: "inherit" };
const btn = { border: `1px solid ${V2.borderSoft}`, background: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 13.5, cursor: "pointer", color: V2.forestGreen, fontWeight: 700 };

export default function AdminXLinks() {
  const [secret, setSecret] = useState("");
  const [links, setLinks] = useState(null);
  const [names, setNames] = useState("");
  const [find, setFind] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true); setNote("");
    try {
      const r = await fetch("/api/admin/x-links", { headers: { "x-admin-secret": secret } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
      setLinks(j.links || []); if (j.needsSql) setNote("The x_links SQL hasn't been run yet.");
    } catch (e) { setNote(e.message); }
    setBusy(false);
  };

  const byUser = Object.fromEntries((links || []).map((l) => [l.username, l]));
  const wanted = names.split(/[\n,\s]+/).map((s) => s.replace(/@/g, "").trim().toLowerCase()).filter(Boolean);
  const mapped = wanted.map((u) => ({ u, x: byUser[u]?.x_username || null }));
  const copy = (t) => { try { navigator.clipboard.writeText(t); setNote("Copied."); } catch { setNote("Copy failed. Select the text instead."); } };
  const shown = (links || []).filter((l) => !find.trim() || l.username.includes(find.trim().toLowerCase()) || l.x_username.toLowerCase().includes(find.trim().toLowerCase().replace(/@/g, "")));

  return (
    <div style={{ padding: "24px 16px", background: "#fafaf5", color: "#1f2d17", minHeight: "100vh", fontFamily: V2.fontSans }}>
      <Head><title>X links</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link href="/admin/wheel" style={{ fontSize: 13, color: V2.grassDark, textDecoration: "none" }}>&larr; Admin</Link>
        <h1 style={{ fontSize: 26, margin: "8px 0 6px", color: V2.forestGreen }}>Connected X accounts</h1>
        <p style={{ fontSize: 13.5, margin: "0 0 12px" }}>Each handle here was proven by the person signing in with X, so it is the real account. Handles can go stale if someone renames their X account.</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="password" placeholder="Admin secret" value={secret} onChange={(e) => setSecret(e.target.value)} style={inp} />
          <button onClick={load} disabled={busy} style={btn}>{busy ? "Loading" : "Load"}</button>
        </div>
        {note && <div style={{ ...box, fontSize: 13.5, background: "#fffbe6" }}>{note}</div>}
        {links && (
          <>
            <div style={box}>
              <b>Turn usernames into X handles</b>
              <p style={{ fontSize: 12.5, margin: "6px 0" }}>Paste Proof of Grass usernames (one per line or comma separated).</p>
              <textarea rows={5} value={names} onChange={(e) => setNames(e.target.value)} style={inp} placeholder={"realking_dave\ntimi"} />
              {mapped.length > 0 && (
                <>
                  <div style={{ margin: "10px 0", fontSize: 14, lineHeight: 1.7 }}>
                    {mapped.map((m) => <div key={m.u}>{m.u} {"->"} {m.x ? <a href={`https://x.com/${m.x}`} target="_blank" rel="noopener noreferrer">@{m.x}</a> : <span style={{ opacity: 0.6 }}>not connected</span>}</div>)}
                  </div>
                  <button style={btn} onClick={() => copy(mapped.filter((m) => m.x).map((m) => "@" + m.x).join(" "))}>Copy connected @handles</button>
                </>
              )}
            </div>
            <div style={box}>
              <b>{links.length} connected</b>
              <input placeholder="Search username or handle" value={find} onChange={(e) => setFind(e.target.value)} style={{ ...inp, margin: "8px 0" }} />
              {shown.map((l) => (
                <div key={l.username} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderTop: `1px solid ${V2.borderSoft}`, fontSize: 14 }}>
                  <span>{l.username}</span>
                  <a href={`https://x.com/${l.x_username}`} target="_blank" rel="noopener noreferrer">@{l.x_username}</a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
