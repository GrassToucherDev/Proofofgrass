// /admin/creations — review Community Creations: hide, unhide or delete a post.
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";

const box = { color: "#1f2d17", background: "#fff", border: `1px solid ${V2.borderSoft}`, borderRadius: 14, padding: 12, marginBottom: 12 };
const inp = { boxSizing: "border-box", border: `1px solid ${V2.borderSoft}`, borderRadius: 8, padding: "8px 10px", fontSize: 16, background: "#fff", color: "#1f2d17", width: "100%", fontFamily: "inherit" };
const btn = { border: `1px solid ${V2.borderSoft}`, background: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer", color: V2.forestGreen, fontWeight: 700 };

export default function AdminCreations() {
  const [secret, setSecret] = useState("");
  const [items, setItems] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (opts) => {
    const r = await fetch("/api/admin/creations", { ...opts, headers: { "x-admin-secret": secret, "Content-Type": "application/json" } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
    return j;
  };
  const load = async () => {
    setBusy(true); setNote("");
    try { const j = await call({}); setItems(j.items || []); if (j.needsSql) setNote("The community_creations SQL hasn't been run yet."); } catch (e) { setNote(e.message); }
    setBusy(false);
  };
  const act = async (id, action) => {
    if (action === "delete" && !window.confirm("Delete this creation and its image?")) return;
    setBusy(true); setNote("");
    try { await call({ method: "POST", body: JSON.stringify({ id, action }) }); await load(); } catch (e) { setNote(e.message); }
    setBusy(false);
  };

  return (
    <>
      <Head><title>Community Creations admin</title></Head>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "system-ui,sans-serif", color: "#1f2d17" }}>
        <Link href="/admin/pauses" style={{ fontSize: 13, color: V2.forestGreen }}>Pauses</Link>
        <h1 style={{ fontSize: 24, margin: "8px 0 14px" }}>Community Creations</h1>
        <div style={box}>
          <input style={inp} type="password" placeholder="Admin secret" value={secret} onChange={(e) => setSecret(e.target.value)} />
          <button style={{ ...btn, marginTop: 10 }} onClick={load} disabled={busy || !secret}>{busy ? "Loading…" : "Load latest 60"}</button>
          {note && <div style={{ marginTop: 8, fontSize: 13 }}>{note}</div>}
        </div>
        {items && items.length === 0 && <div style={{ fontSize: 14 }}>Nothing posted yet.</div>}
        {(items || []).map((it) => (
          <div key={it.id} style={{ ...box, display: "flex", gap: 12, alignItems: "flex-start", opacity: it.hidden ? 0.55 : 1 }}>
            <img src={it.url} alt="" style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 8, flexShrink: 0, background: "#000" }} />
            <div style={{ minWidth: 0, flex: 1, fontSize: 13, lineHeight: 1.5 }}>
              <div><b>@{it.username}</b> · {it.kind} · {new Date(it.created_at).toLocaleString()}</div>
              {it.caption && <div style={{ overflowWrap: "anywhere" }}>{it.caption}</div>}
              <div>{it.likes} likes · {it.reports} reports{it.hidden ? " · HIDDEN" : ""}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button style={btn} onClick={() => act(it.id, it.hidden ? "unhide" : "hide")}>{it.hidden ? "Unhide" : "Hide"}</button>
                <button style={{ ...btn, color: "#b3261e" }} onClick={() => act(it.id, "delete")}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
