// Slim account strip for the marketplace: sign in with Google (and secure the username) without leaving the page.
// Individual purchases need a username secured by the signed-in Google account, so this is the one step buyers need first.
import { useEffect, useState } from "react";
import { signInWithGoogle } from "../utils/googleSignIn";
import { useSession, signIn, signOut } from "next-auth/react";
import { V2, V2Styles } from "../utils/v2Theme";

export default function MarketplaceAccountBar({ username }) {
  const { status: auth } = useSession();
  const [st, setSt] = useState(null);      // { claimed, mine, signedIn } for this username
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    if (!username) { setSt(null); return; }
    fetch(`/api/username/status?username=${encodeURIComponent(username)}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => setSt(d && !d.error ? d : null)).catch(() => setSt(null));
  };
  useEffect(() => { if (auth !== "loading") load(); /* eslint-disable-next-line */ }, [username, auth]);

  if (auth === "loading") return null;
  const signedIn = auth === "authenticated";
  const google = () => signInWithGoogle();                                  // returns to this page
  const otherAccount = () => signIn("google", undefined, { prompt: "select_account" });
  const claim = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/username/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d.error || "Something went wrong."); else load();
    } catch { setErr("Network error. Try again."); }
    setBusy(false);
  };

  let msg, action, tone = "info";
  if (!signedIn) {
    msg = !username ? "Enter your username in the top bar, then sign in with Google to buy."
      : st?.claimed ? <>@{username} is secured by a Google account. Sign in to buy.</>
      : <>Sign in with Google to secure @{username} and buy.</>;
    action = <button type="button" onClick={google} style={{ ...V2Styles.btnPrimary, padding: "9px 18px", minHeight: 44, fontSize: 14 }}>Sign in with Google</button>;
  } else if (!username) {
    msg = "Signed in. Enter your username in the top bar to buy.";
  } else if (st?.mine) {
    tone = "ok"; msg = <>✓ Signed in. @{username} is secured to your Google account.</>;
    action = <button type="button" onClick={() => signOut()} style={{ background: "none", border: "none", cursor: "pointer", color: V2.forestLight, fontWeight: 700, fontSize: 13, minHeight: 44, padding: "0 6px", fontFamily: "inherit" }}>Sign out</button>;
  } else if (st?.claimed) {
    tone = "warn"; msg = <>@{username} belongs to a different Google account. Sign in with the one that secured it.</>;
    action = <button type="button" onClick={otherAccount} style={{ ...V2Styles.btnSecondary, padding: "9px 18px", minHeight: 44, fontSize: 14 }}>Use a different Google account</button>;
  } else if (st) {
    msg = <>One more step: secure @{username} to your Google account so only you can buy and use it.</>;
    action = <button type="button" disabled={busy} onClick={claim} style={{ ...V2Styles.btnPrimary, padding: "9px 18px", minHeight: 44, fontSize: 14, opacity: busy ? .7 : 1 }}>{busy ? "Securing…" : `Secure @${username}`}</button>;
  } else return null;

  const colors = { info: ["#f1fbe6", "#cfe8c0"], ok: ["#eef8e6", "#cfe8c0"], warn: ["#fef3d8", "#f0d9a0"] }[tone];
  return (
    <div role="region" aria-label="Account" style={{ background: colors[0], borderBottom: `1px solid ${colors[1]}`, padding: "10px clamp(14px,4vw,48px)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: V2.forestGreen, flex: "1 1 240px", lineHeight: 1.45 }}>{msg}</span>
        {action}
      </div>
      {err && <div role="alert" style={{ maxWidth: 960, margin: "4px auto 0", fontSize: 13, color: "#b3261e" }}>{err}</div>}
    </div>
  );
}
