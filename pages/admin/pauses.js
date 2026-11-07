// /admin/pauses — pause accounts that post non-outdoor photos, look at their recent proofs, delete a photo, resume.
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";

const DEFAULT_MSG = "Your account is paused while we review recent posts. Proofs need to be real outdoor photos taken today. Message the Touch Grass team on X if you think this is a mistake.";
const box = { color: "#1f2d17", background: "#fff", border: `1px solid ${V2.borderSoft}`, borderRadius: 14, padding: 16, marginBottom: 14 };
const inp = { boxSizing: "border-box", border: `1px solid ${V2.borderSoft}`, borderRadius: 8, padding: "8px 10px", fontSize: 16, background: "#fff", color: "#1f2d17", width: "100%", fontFamily: "inherit" };
const btn = { border: `1px solid ${V2.borderSoft}`, background: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 13.5, cursor: "pointer", color: V2.forestGreen, fontWeight: 700 };
const lbl = { display: "block", fontSize: 12.5, fontWeight: 700, margin: "10px 0 4px" };

export default function AdminPauses() {
  const [secret, setSecret] = useState("");
  const [names, setNames] = useState("");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("");
  const [msg, setMsg] = useState(DEFAULT_MSG);
  const [list, setList] = useState(null);
  const [look, setLook] = useState("");
  const [seen, setSeen] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (url, opts) => {
    const r = await fetch(url, { ...opts, headers: { "x-admin-secret": secret, "Content-Type": "application/json" } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
    return j;
  };
  const load = async () => { setBusy(true); setNote(""); try { const j = await call("/api/admin/pauses"); setList(j.pauses || []); if (j.needsSql) setNote("The account_pauses SQL hasn't been run yet."); } catch (e) { setNote(e.message); } setBusy(false); };
  const pause = async () => {
    const usernames = names.split(/[\n,]/).map((s) => s.replace(/@/g, "").trim()).filter(Boolean);
    if (!usernames.length) return;
    if (!window.confirm(`Pause ${usernames.length} account(s)?\n\n${usernames.join(", ")}\n\n${days ? `For ${days} day(s).` : "Until you resume them."}`)) return;
    setBusy(true); setNote("");
    try { const j = await call("/api/admin/pauses", { method: "POST", body: JSON.stringify({ action: "pause", usernames, reason, message: msg, days }) }); setNote(`Paused: ${j.paused.join(", ")}`); setNames(""); await load(); }
    catch (e) { setNote(e.message); } setBusy(false);
  };
  const resume = async (u) => {
    if (!window.confirm(`Resume @${u}?`)) return;
    setBusy(true); try { await call("/api/admin/pauses", { method: "POST", body: JSON.stringify({ action: "resume", username: u }) }); await load(); } catch (e) { setNote(e.message); } setBusy(false);
  };
  const lookup = async (u = look) => {
    const name = u.replace(/@/g, "").trim(); if (!name) return;
    setBusy(true); setNote(""); setSeen(null);
    try { setSeen(await call("/api/admin/pauses?username=" + encodeURIComponent(name))); } catch (e) { setNote(e.message); } setBusy(false);
  };
  const del = async (day) => {
    if (!window.confirm(`Permanently delete @${seen.username}'s photo from ${day}? This can't be undone.`)) return;
    setBusy(true);
    try { await call("/api/admin/pauses", { method: "POST", body: JSON.stringify({ action: "delete_photo", username: seen.username, day }) }); await lookup(seen.username); setNote("Photo deleted."); } catch (e) { setNote(e.message); } setBusy(false);
  };
  const when = (t) => (t ? new Date(t).toLocaleString() : "");

  return (
    <div style={{ padding: "24px 16px", background: "#fafaf5", color: "#1f2d17", minHeight: "100vh", fontFamily: V2.fontSans }}>
      <Head><title>Pause accounts</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link href="/admin/wheel" style={{ fontSize: 13, color: V2.grassDark, textDecoration: "none" }}>← Admin</Link>
        <h1 style={{ fontSize: 26, margin: "8px 0 6px", color: V2.forestGreen }}>Pause accounts</h1>
        <p style={{ fontSize: 13.5, margin: "0 0 12px" }}>A paused account can't upload or log a proof, and its proofs disappear from the community gallery and Grove feeds. Their streak is not protected: missed days still break it.</p>
        <input type="password" placeholder="Admin secret" value={secret} onChange={(e) => setSecret(e.target.value)} style={{ ...inp, marginBottom: 12 }} />
        {note && <div style={{ ...box, fontSize: 13.5, background: "#fffbe6" }}>{note}</div>}

        <div style={box}>
          <b>Pause accounts</b>
          <label style={lbl}>Usernames (one per line or comma separated)</label>
          <textarea rows={4} value={names} onChange={(e) => setNames(e.target.value)} style={inp} placeholder={"lee\nprime tips"} />
          <label style={lbl}>Your private note (not shown to them)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} style={inp} placeholder="e.g. posting screenshots, not outdoor" />
          <label style={lbl}>For how many days? (leave empty = until you resume)</label>
          <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} inputMode="numeric" style={{ ...inp, maxWidth: 140 }} />
          <label style={lbl}>Message they see when they try to post</label>
          <textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} style={inp} />
          <button style={{ ...btn, background: V2.grassGreen, color: "#fff", marginTop: 12 }} disabled={busy || !secret || !names.trim()} onClick={pause}>Pause</button>
        </div>

        <div style={box}>
          <b>Look at an account</b>
          <p style={{ fontSize: 13, margin: "6px 0 10px" }}>Shows their last 14 days of proofs. You can delete a photo (for example one that shows private details).</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="username" value={look} onChange={(e) => setLook(e.target.value)} style={{ ...inp, flex: 1, minWidth: 0 }} />
            <button style={btn} disabled={busy || !secret || !look.trim()} onClick={() => lookup()}>Look up</button>
          </div>
          {seen && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13.5, marginBottom: 8 }}>
                <b>@{seen.username}</b>: {seen.pause?.active ? `paused since ${when(seen.pause.paused_at)}` : "not paused"}
                {seen.pause?.active && <button style={{ ...btn, marginLeft: 8, padding: "5px 10px" }} onClick={() => resume(seen.username)}>Resume</button>}
              </div>
              {seen.proofs.length === 0 && <div style={{ fontSize: 13 }}>No proofs in the last 14 days.</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {seen.proofs.map((p) => (
                  <div key={p.day} style={{ border: `1px solid ${V2.borderSoft}`, borderRadius: 10, overflow: "hidden", background: "#f4f4ee" }}>
                    <a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.day} loading="lazy" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} /></a>
                    <div style={{ padding: "6px 8px", fontSize: 12 }}>
                      {p.day}
                      <button style={{ ...btn, display: "block", width: "100%", marginTop: 6, padding: "6px 8px", fontSize: 12, color: "#a32020" }} disabled={busy} onClick={() => del(p.day)}>Delete photo</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b>Paused accounts</b>
            <button style={btn} disabled={busy || !secret} onClick={load}>{list ? "Refresh" : "Load"}</button>
          </div>
          {list && list.length === 0 && <div style={{ fontSize: 13, marginTop: 8 }}>No pauses yet.</div>}
          {(list || []).map((r) => (
            <div key={r.username} style={{ borderTop: `1px solid ${V2.borderSoft}`, marginTop: 10, paddingTop: 10, fontSize: 13.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <b style={{ wordBreak: "break-all" }}>@{r.username}</b>
                <span>
                  <button style={{ ...btn, padding: "5px 10px" }} onClick={() => { setLook(r.username); lookup(r.username); }}>Proofs</button>{" "}
                  {r.active && <button style={{ ...btn, padding: "5px 10px" }} disabled={busy} onClick={() => resume(r.username)}>Resume</button>}
                </span>
              </div>
              <div style={{ opacity: 0.8 }}>{r.active ? (r.paused_until ? `Paused until ${when(r.paused_until)}` : "Paused until resumed") : r.resumed_at ? `Resumed ${when(r.resumed_at)}` : "Pause ended"} · since {when(r.paused_at)}</div>
              {r.reason && <div style={{ opacity: 0.8 }}>Note: {r.reason}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
