// Home card: turn on a daily streak reminder (phone / desktop push). Quiet when unsupported, denied or dismissed.
import { useState, useEffect } from "react";
import Ico from "./Ico";
import { V2 } from "../utils/v2Theme";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const b64ToBytes = (s) => { const p = "=".repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
const readDismiss = () => { try { return Number(localStorage.getItem("pog_push_dismissed") || 0); } catch { return 0; } };

export default function PushReminders({ username }) {
  const [mode, setMode] = useState("hidden"); // hidden | ask | ios | on
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!username || !PUBLIC_KEY || typeof window === "undefined") return;
    let off = false;
    (async () => {
      const ua = navigator.userAgent || "", ios = /iPhone|iPad|iPod/i.test(ua);
      const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
      const canPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!canPush) { if (!off && ios && !standalone && Date.now() - readDismiss() > 14 * 86400_000) setMode("ios"); return; }
      if (Notification.permission === "denied") return;
      try {
        const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (off) return;
        if (sub && Notification.permission === "granted") { setMode("on"); return; }
      } catch {}
      if (!off && Date.now() - readDismiss() > 14 * 86400_000) setMode("ask");
    })();
    return () => { off = true; };
  }, [username]);

  const post = (subscription, on) => fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: username, subscription, on }) });

  const enable = async () => {
    setBusy(true); setErr("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setMode("hidden"); setBusy(false); return; }
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(PUBLIC_KEY) });
      const r = await post(sub.toJSON(), true);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.code === "unclaimed" ? "Secure your username with Google first." : j.error || "Could not turn reminders on."); setBusy(false); return; }
      setMode("on");
      try { await reg.showNotification("Reminders are on", { body: "We'll nudge you before the day resets if your streak is at risk.", icon: "/icons/icon-192.png", tag: "pog-welcome" }); } catch {}
    } catch (e) { setErr("Could not turn reminders on on this device."); }
    setBusy(false);
  };
  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) { await post(sub.toJSON(), false); await sub.unsubscribe(); }
    } catch {}
    setMode("ask"); setBusy(false);
  };
  const dismiss = () => { try { localStorage.setItem("pog_push_dismissed", String(Date.now())); } catch {} setMode("hidden"); };

  if (mode === "hidden") return null;
  const box = { margin: "6px clamp(14px,4vw,40px) 4px", padding: "12px 14px", borderRadius: 14, background: "#fff", border: `1.5px solid ${V2.borderSoft}`, color: V2.forestGreen };
  if (mode === "on") return (
    <div style={{ ...box, display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}>
      <Ico n="clock" size={20} /><span style={{ flex: 1 }}>Streak reminders are on.</span>
      <button onClick={disable} disabled={busy} style={{ background: "none", border: 0, color: V2.textMuted, fontWeight: 700, fontSize: 13, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}>Turn off</button>
    </div>
  );
  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Ico n="clock" size={26} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{mode === "ios" ? "Get daily streak reminders" : "Never lose your streak"}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: V2.textMuted, marginTop: 2, lineHeight: 1.35 }}>
            {mode === "ios" ? "On iPhone: tap Share, then Add to Home Screen, then open Proof of Grass from your home screen to turn reminders on." : "One reminder a day, only when your streak is at risk."}
          </div>
        </div>
        {mode === "ask" && <button onClick={enable} disabled={busy} style={{ border: 0, borderRadius: 999, padding: "9px 14px", background: V2.grassLime, color: V2.forestGreen, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: busy ? 0.6 : 1 }}>Turn on</button>}
      </div>
      {err && <div style={{ marginTop: 8, fontSize: 12.5, color: "#8a3b2b" }}>{err}</div>}
      <div style={{ textAlign: "right", marginTop: 4 }}><button onClick={dismiss} style={{ background: "none", border: 0, color: V2.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Not now</button></div>
    </div>
  );
}
