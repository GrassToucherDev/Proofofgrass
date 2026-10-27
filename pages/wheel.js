// pages/wheel.js — the WAGO Wheel on its own page (it used to sit on top of the Marketplace).
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";
import V2Nav from "../components/V2Nav";
import BuyGate from "../components/BuyGate";
import WheelHero from "../components/wheel/WheelHero";

function getUsername() {
  try { return (localStorage.getItem("pog_username") || "").trim().toLowerCase(); } catch { return ""; }
}

export default function WheelPage() {
  const [username, setUsername] = useState("");
  const [gate, setGate] = useState(null);          // { item, status, after }
  const [handoff, setHandoff] = useState(null);    // opened from Phantom's in-app browser to finish paying
  const [note, setNote] = useState("");
  const [live, setLive] = useState(null);          // null = checking, true/false once known

  useEffect(() => {
    setUsername(getUsername());
    fetch("/api/wheel/state", { cache: "no-store" }).then(r => r.ok ? r.json() : null)
      .then(d => setLive(!!d?.wheel)).catch(() => setLive(false));
    try {
      const ref = new URLSearchParams(window.location.search).get("checkout");
      if (ref) {
        fetch(`/api/checkout/info?id=${encodeURIComponent(ref)}`).then(r => r.json()).then(d => {
          if (d.kind && d.kind !== "wheel") { window.location.replace(`/marketplace?checkout=${encodeURIComponent(ref)}`); return; }
          if (d.status === "pending") setHandoff({ checkoutId: ref, tokens: d.tokens, usd: d.usdPrice });
          else if (d.status === "completed") { setNote("Your spin is complete. Tap My Wins to see your prize."); try { window.history.replaceState(null, "", "/wheel"); } catch {} }
          else setNote("This checkout expired or wasn't found. Start the spin again from here.");
        }).catch(() => setNote("Couldn't load this checkout. Please try again."));
      }
    } catch {}
  }, []);

  // The same "secured username" gate as marketplace purchases, then run `cb`.
  const requireSecured = (item, cb) => {
    if (!username) { setGate({ item, status: null, after: cb }); return; }
    fetch(`/api/username/status?username=${encodeURIComponent(username)}`).then(r => r.json())
      .then(st => { if (st?.mine) cb(); else setGate({ item, status: st, after: cb }); })
      .catch(() => setGate({ item, status: {}, after: cb }));
  };

  return (
    <>
      <Head><title>WAGO Wheel | Proof of Grass</title></Head>
      <style dangerouslySetInnerHTML={{ __html: V2GlobalCSS }} />
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)" }}>
        <V2Nav username={username} onUsernameChange={setUsername} showUpload={() => { window.location.href = "/#upload"; }} />
        <WheelHero username={username} requireSecured={requireSecured} handoff={handoff} />
        {live === false && (
          <div style={{ maxWidth: 520, margin: "70px auto", padding: "0 20px", textAlign: "center" }}>
            <img src="/wheel/grass-tickets.png" alt="" width={96} height={96} style={{ objectFit: "contain" }} />
            <h1 style={{ fontFamily: V2.fontSans, fontSize: 26, fontWeight: 900, color: V2.forestGreen, margin: "12px 0 6px" }}>The wheel isn't open yet</h1>
            <p style={{ fontSize: 15, color: V2.midGray, lineHeight: 1.6, margin: "0 0 18px" }}>Check back soon. In the meantime, the Marketplace has packs and shields.</p>
            <Link href="/marketplace" style={{ ...V2Styles.btnPrimary, textDecoration: "none", padding: "10px 22px", display: "inline-block" }}>Go to the Marketplace</Link>
          </div>
        )}
      </div>
      {note && (
        <div role="alert" onClick={() => setNote("")} style={{ position: "fixed", left: 16, right: 16, bottom: 20, zIndex: 450, background: "#fff",
          border: `1px solid ${V2.borderGreen}`, color: V2.forestGreen, borderRadius: 14, padding: "12px 16px", fontSize: 14, fontWeight: 600,
          boxShadow: "0 8px 30px rgba(26,74,10,0.18)", textAlign: "center", cursor: "pointer" }}>{note}</div>
      )}
      {gate && (
        <BuyGate username={username} status={gate.status} item={gate.item}
          onClose={() => setGate(null)}
          onReady={() => { const after = gate.after; setGate(null); if (after) after(); }} />
      )}
    </>
  );
}
