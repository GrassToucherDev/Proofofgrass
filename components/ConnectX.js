// "Connect X" row for a secured username. Read-only link: we only learn which X account they own.
import { useEffect, useState } from "react";
import { V2, V2Styles } from "../utils/v2Theme";

const MESSAGES = {
  ok: ["good", "X account connected."],
  denied: ["warn", "You cancelled the X connection. Nothing was saved."],
  expired: ["warn", "That X connection timed out. Please try again."],
  signin: ["warn", "Sign in with Google again, then reconnect X."],
  not_owner: ["warn", "Only the Google account that secured this username can connect X."],
  x_taken: ["bad", "That X account is already connected to another Proof of Grass username."],
  x_failed: ["bad", "X didn't answer. Please try again in a moment."],
  failed: ["bad", "Could not save the connection. Please try again."],
  slow_down: ["warn", "Too many attempts. Please wait a few minutes."],
  unavailable: ["warn", "Connecting X isn't available yet."],
};

export default function ConnectX({ username }) {
  const [st, setSt] = useState(null);
  const [note, setNote] = useState(() => {
    try { const c = typeof window === "undefined" ? null : new URL(window.location.href).searchParams.get("x_link"); return c && MESSAGES[c] ? MESSAGES[c] : null; } catch { return null; }
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    fetch(`/api/x/status?username=${encodeURIComponent(username)}`, { cache: "no-store" }).then(r => r.json()).then(d => { if (!off) setSt(d); }).catch(() => {});
    try { // tidy the address bar once the result has been read
      const u = new URL(window.location.href);
      if (u.searchParams.has("x_link")) { u.searchParams.delete("x_link"); window.history.replaceState({}, "", u.pathname + (u.search || "") + u.hash); }
    } catch {}
    return () => { off = true; };
  }, [username]);

  if (!st || !st.enabled || !st.mine) return note ? <Note n={note} /> : null;

  const unlink = async () => {
    if (!window.confirm("Disconnect your X account from this username?")) return;
    setBusy(true);
    try { await fetch("/api/x/unlink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) }); const d = await fetch(`/api/x/status?username=${encodeURIComponent(username)}`, { cache: "no-store" }).then(r => r.json()); setSt(d); } catch {}
    setBusy(false);
  };

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${V2.borderSoft}`, fontSize: 14, color: V2.textSecondary }}>
      {st.linked ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <span>X connected: <strong>@{st.handle}</strong></span>
          <a href={`/api/x/start?username=${encodeURIComponent(username)}`} style={{ fontSize: 13, color: V2.grassDark }}>Reconnect</a>
          <button onClick={unlink} disabled={busy} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13, color: V2.textSecondary, textDecoration: "underline" }}>Disconnect</button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 8 }}>Connect your X account so we can credit and tag the right person. This is read-only: we only see which account is yours, and can never post or follow for you.</div>
          <a href={`/api/x/start?username=${encodeURIComponent(username)}`} style={{ ...V2Styles.btnPrimary, display: "inline-block", padding: "9px 18px", textDecoration: "none" }}>Connect X</a>
        </div>
      )}
      {note && <Note n={note} />}
    </div>
  );
}

function Note({ n }) {
  const color = n[0] === "good" ? "#1f6b2f" : n[0] === "bad" ? "#b3261e" : "#7a5b00";
  return <div role="status" style={{ marginTop: 8, fontSize: 13, color }}>{n[1]}</div>;
}
