// One-time terms/prize consent shown after sign-in. Blocks until accepted or the user signs out.
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { V2 } from "../utils/v2Theme";

const SKIP = ["/prize-rules"];

export default function ConsentGate() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [need, setNeed] = useState(false);
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const gid = session?.user?.google_id;

  useEffect(() => {
    if (status !== "authenticated" || !gid) { setNeed(false); return; }
    let live = true;
    fetch("/api/consent").then(r => r.ok ? r.json() : null)
      .then(d => { if (live && d && d.accepted === false) setNeed(true); })
      .catch(() => {});
    return () => { live = false; };
  }, [status, gid]);

  if (!need || SKIP.includes(router.pathname)) return null;

  async function accept() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adult, terms }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save.");
      setNeed(false);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const box = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.4, marginBottom: 12, color: V2.forestGreen };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="consent-title" style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(13,42,5,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 18, maxWidth: 440, width: "100%", maxHeight: "92vh", overflowY: "auto", padding: "24px 22px", boxSizing: "border-box", fontFamily: "'Nunito',-apple-system,sans-serif" }}>
        <h2 id="consent-title" style={{ margin: "0 0 8px", fontSize: 20, color: V2.forestGreen }}>Before you continue</h2>
        <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.5, color: "rgba(13,42,5,0.7)" }}>
          Proof of Grass and WAGO Drops can include real-world prizes from sponsors, such as cards, merch, or cash. Prizes are provided by the sponsor, not by us. If you ever win something that has to be shipped, we will ask you first before any sponsor sees your name or address.
        </p>
        <label style={box}><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} style={{ marginTop: 3 }} />
          <span>I am 18 or older, or I have a parent or guardian's permission to take part.</span></label>
        <label style={box}><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} style={{ marginTop: 3 }} />
          <span>I agree to the <Link href="/prize-rules" target="_blank" style={{ color: V2.grassDark, fontWeight: 700 }}>Prize Rules</Link>, and I'll stay safe and respect private property when looking for drops.</span></label>
        {err && <div style={{ color: V2.danger, fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button onClick={accept} disabled={!adult || !terms || busy} style={{ width: "100%", border: "none", borderRadius: 999, padding: "13px", fontSize: 15, fontWeight: 700, color: "#fff", background: adult && terms ? V2.grassGreen : "rgba(13,42,5,0.25)", cursor: adult && terms ? "pointer" : "default" }}>
          {busy ? "Saving…" : "Agree and continue"}
        </button>
        <button onClick={() => signOut()} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "rgba(13,42,5,0.55)", fontSize: 13, cursor: "pointer" }}>Not now, sign me out</button>
      </div>
    </div>
  );
}
