// /admin/push — preview who would get tonight's streak reminder, and send a real test reminder to one username.
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";

const box = { color: "#1f2d17", background: "#fff", border: `1px solid ${V2.borderSoft}`, borderRadius: 14, padding: 16, marginBottom: 14 };
const inp = { boxSizing: "border-box", border: `1px solid ${V2.borderSoft}`, borderRadius: 8, padding: "8px 10px", fontSize: 16, background: "#fff", color: "#1f2d17" };
const btn = { border: `1px solid ${V2.borderSoft}`, background: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 13.5, cursor: "pointer", color: V2.forestGreen, fontWeight: 700 };

export default function AdminPush() {
  const [secret, setSecret] = useState("");
  const [user, setUser] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (qs, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setOut("");
    try {
      const r = await fetch("/api/push/remind?" + qs, { headers: { "x-admin-secret": secret } });
      const j = await r.json().catch(() => ({}));
      setOut(r.ok ? JSON.stringify(j, null, 2) : `Failed (${r.status}): ${j.error || ""}`);
    } catch { setOut("Network error."); }
    setBusy(false);
  };
  return (
    <div style={{ padding: "24px 16px", background: "#fafaf5", color: "#1f2d17", minHeight: "100vh", fontFamily: V2.fontSans }}>
      <Head><title>Push admin</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href="/admin/wheel" style={{ fontSize: 13, color: V2.grassDark, textDecoration: "none" }}>← Admin</Link>
        <h1 style={{ fontSize: 26, margin: "8px 0 14px", color: V2.forestGreen }}>Streak reminders</h1>
        <input type="password" placeholder="Admin secret" value={secret} onChange={(e) => setSecret(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 12 }} />
        <div style={box}>
          <b>Preview</b>
          <p style={{ fontSize: 13, margin: "6px 0 10px" }}>How many people would get the reminder if it ran right now. Sends nothing.</p>
          <button style={btn} disabled={busy || !secret} onClick={() => run("preview=1")}>Preview</button>
        </div>
        <div style={box}>
          <b>Send a test</b>
          <p style={{ fontSize: 13, margin: "6px 0 10px" }}>Sends the real reminder to every device that username has turned reminders on for.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="username" value={user} onChange={(e) => setUser(e.target.value)} style={{ ...inp, flex: 1, minWidth: 0 }} />
            <button style={{ ...btn, background: V2.grassGreen, color: "#fff" }} disabled={busy || !secret || !user.trim()} onClick={() => run("test=" + encodeURIComponent(user.trim()), `Send a test reminder to @${user.trim()}?`)}>Send test</button>
          </div>
        </div>
        {out && <pre style={{ ...box, fontSize: 13, whiteSpace: "pre-wrap" }}>{out}</pre>}
      </div>
    </div>
  );
}
