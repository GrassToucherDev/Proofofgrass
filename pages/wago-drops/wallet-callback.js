// pages/wago-drops/wallet-callback.js
// Landing page for the wallet app's redirect (see utils/wagoWalletDeeplink.js).
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { T } from "../../utils/wagoTheme";
import Wago from "../../components/wago-drops/Wago";
import { handleCallback, startSign, clearDeeplinkState } from "../../utils/wagoWalletDeeplink";

export default function WalletCallback() {
  const { status } = useSession();
  const router = useRouter();
  const ran = useRef(false);
  const [phase, setPhase] = useState("working");   // working | sign | done | error
  const [msg, setMsg] = useState("Reading the wallet's reply…");

  useEffect(() => {
    if (!router.isReady || status === "loading" || ran.current) return;
    if (status === "unauthenticated") { setPhase("error"); setMsg("Please sign in with Google in this browser, then start the wallet link again from Settings."); return; }
    ran.current = true;
    (async () => {
      try {
        const r = handleCallback(router.query);
        if (r.step === "connected") {
          setPhase("sign"); setMsg("Wallet found. One more step: approve the free signature to prove it's yours.");
          setTimeout(() => { try { startSign(); } catch (e) { setPhase("error"); setMsg(e.message); } }, 600);
          return;
        }
        setMsg("Verifying…");
        const res = await fetch("/api/wago-drops/link-wallet", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: r.wallet, signature: r.signature, issuedAt: r.issuedAt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't link wallet");
        clearDeeplinkState();
        setPhase("done"); setMsg("Wallet verified and linked.");
      } catch (e) { setPhase("error"); setMsg(e.message); }
    })();
  }, [router.isReady, router.query, status]);

  return (
    <>
      <Head><title>Wallet — WAGO Drops</title></Head>
      <div style={{ minHeight: "100vh", background: T.surface, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Wago pose={phase === "done" ? "cheer" : phase === "error" ? "shrug" : "ticket"} size={130} float={phase !== "error"} />
          </div>
          <h2 style={{ fontFamily: "'Fredoka',system-ui,sans-serif", fontSize: 26, margin: "10px 0 8px" }}>
            {phase === "done" ? "You're all set!" : phase === "error" ? "Hmm, that didn't work" : "Linking your wallet…"}
          </h2>
          <p style={{ fontSize: 14, color: phase === "error" ? T.red : T.muted, lineHeight: 1.6 }}>{msg}</p>
          {phase === "sign" && (
            <button onClick={() => { try { startSign(); } catch (e) { setPhase("error"); setMsg(e.message); } }}
              style={{ marginTop: 14, background: T.olive, color: "#fff", border: "none", borderRadius: 999, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Open wallet to sign
            </button>
          )}
          {(phase === "done" || phase === "error") && (
            <Link href={phase === "done" ? "/wago-drops" : "/wago-drops/settings"}
              style={{ display: "inline-block", marginTop: 14, background: T.olive, color: "#fff", borderRadius: 999, padding: "12px 24px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              {phase === "done" ? "Start hunting" : "Back to Settings"}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
