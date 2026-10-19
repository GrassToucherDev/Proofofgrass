// "Secure your username" prompt. Shows only when a username is set and not yet secured by this Google account.
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { V2, V2Styles } from "../utils/v2Theme";

export default function SecureUsernameCard({ username }) {
  const { status } = useSession();
  const [state, setState] = useState(null); // { claimed, mine }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!username || status === "loading") return;
    let off = false;
    fetch(`/api/username/status?username=${encodeURIComponent(username)}`)
      .then(r => r.json()).then(d => { if (!off) setState(d); }).catch(() => {});
    return () => { off = true; };
  }, [username, status]);

  if (!username || !state) return null;
  if (state.mine) {
    return (
      <div style={{ ...V2Styles.card, padding: "12px 16px", margin: "0 0 16px", fontSize: 14, color: V2.textSecondary }}>
        ✓ <strong>@{username}</strong> is secured to your Google account.
      </div>
    );
  }
  if (state.claimed) return null; // someone else's; nothing to offer here

  const claim = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/username/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
      const d = await r.json();
      if (!r.ok) setErr(d.error || "Something went wrong.");
      else setState({ ...state, claimed: true, mine: true });
    } catch { setErr("Network error. Try again."); }
    setBusy(false);
  };

  return (
    <div style={{ ...V2Styles.card, padding: "16px 18px", margin: "0 0 16px" }}>
      <div style={{ fontWeight: 700, color: V2.textPrimary, marginBottom: 4 }}>Secure @{username}</div>
      <div style={{ fontSize: 14, color: V2.textSecondary, marginBottom: 12 }}>
        Link your Google account so only you can use this username for rewards and gifts, and so you can recover it on a new device. Your email is never shown.
      </div>
      {state.signedIn || status === "authenticated" ? (
        <button onClick={claim} disabled={busy} style={{ ...V2Styles.btnPrimary, padding: "10px 20px" }}>{busy ? "Securing…" : `Secure @${username}`}</button>
      ) : (
        <button onClick={() => signIn("google")} style={{ ...V2Styles.btnPrimary, padding: "10px 20px" }}>Continue with Google</button>
      )}
      {err && <div role="alert" style={{ marginTop: 8, fontSize: 13, color: "#b3261e" }}>{err}</div>}
    </div>
  );
}
