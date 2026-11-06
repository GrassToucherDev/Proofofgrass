// Follow / Following toggle. Renders nothing for signed-out visitors or for your own profile.
import { useState, useEffect } from "react";
import { V2 } from "../utils/v2Theme";

export default function FollowButton({ viewer, username, className, style, onChange }) {
  const [on, setOn] = useState(null);   // null = unknown
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!viewer || !username || viewer === username) { setOn(null); return; }
    let off = false;
    fetch(`/api/follow?as=${encodeURIComponent(viewer)}&check=${encodeURIComponent(username)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (!off) setOn(j ? !!j.following : null); }).catch(() => {});
    return () => { off = true; };
  }, [viewer, username]);
  if (!viewer || !username || viewer === username || on === null) return null;
  const toggle = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: viewer, username, on: !on }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.code === "unclaimed" ? "Secure your username with Google to follow." : j.error || "Could not save that.");
      else { setOn(!!j.following); onChange?.(username, !!j.following); }
    } catch { setErr("Could not save that. Check your connection."); }
    setBusy(false);
  };
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <button onClick={toggle} disabled={busy} className={className} aria-pressed={on}
        style={style || { border: on ? `1.5px solid ${V2.borderSoft}` : "0", background: on ? "#fff" : V2.grassLime, color: V2.forestGreen, fontWeight: 800, fontSize: 13, borderRadius: 999, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}>
        {on ? "Following" : "Follow"}
      </button>
      {err && <span style={{ fontSize: 12, color: "#8a3b2b" }}>{err}</span>}
    </span>
  );
}
