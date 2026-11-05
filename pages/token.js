// pages/token.js — everything about $TOUCHGRASS in one place: what it is used for here, the official contract, live market numbers.
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import TokenStrip, { TOUCHGRASS_MINT } from "../components/TokenStrip";
import { V2, V2Styles } from "../utils/v2Theme";

const H = { fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: V2.grassGreen, margin: "0 0 8px" };

export default function TokenPage() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { navigator.clipboard.writeText(TOUCHGRASS_MINT).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); } catch {}
  };
  const uses = [
    { t: "Marketplace", d: "Pay for profile backgrounds, flex card packs and other items.", href: "/marketplace", cta: "Open Marketplace" },
    { t: "Harvest", d: "Lock $TOUCHGRASS for 6 months. On Harvest Day, claim your principal plus rewards.", href: "https://harvest.touchgrass.today", cta: "Go to Harvest", external: true },
  ];
  return (
    <div style={{ minHeight: "100vh", background: V2.gradientSky, fontFamily: "'Nunito',-apple-system,sans-serif", color: V2.forestGreen }}>
      <Head>
        <title>$TOUCHGRASS — Proof of Grass</title>
        <meta name="description" content="The $TOUCHGRASS token: what it's used for in Proof of Grass, the official contract address, and live market numbers." />
      </Head>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px 96px" }}>
        <Link href="/" style={{ color: V2.grassDark, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>← Proof of Grass</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 6px" }}>
          <img src="/touchgrass-transparent.png" alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <h1 style={{ fontSize: 30, margin: 0, fontWeight: 800 }}>$TOUCHGRASS</h1>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.55, margin: "0 0 18px", color: V2.textBody }}>
          The token behind the Touch Grass community. You don't need it to log proofs and build a streak. Here is where it shows up in Proof of Grass.
        </p>

        <div style={{ ...V2Styles.glassCard, padding: "16px 16px", marginBottom: 16 }}>
          <div style={H}>Where it's used</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {uses.map(u => (
              <div key={u.t} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 14px", borderRadius: 14, background: "white", border: "1px solid rgba(200,220,190,0.8)" }}>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{u.t}</div>
                  <div style={{ fontSize: 13, color: V2.textMuted, lineHeight: 1.45, marginTop: 2 }}>{u.d}</div>
                </div>
                {u.external
                  ? <a href={u.href} target="_blank" rel="noopener noreferrer" style={{ ...V2Styles.btnSecondary, textDecoration: "none", fontSize: 12.5, padding: "8px 14px" }}>{u.cta}</a>
                  : <Link href={u.href} style={{ ...V2Styles.btnSecondary, textDecoration: "none", fontSize: 12.5, padding: "8px 14px" }}>{u.cta}</Link>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...V2Styles.glassCard, padding: "16px 16px", marginBottom: 16 }}>
          <div style={H}>Official contract address</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <code style={{ flex: "1 1 240px", minWidth: 0, wordBreak: "break-all", fontSize: 13, fontWeight: 700, padding: "10px 12px", borderRadius: 12, background: "white", border: "1px solid rgba(200,220,190,0.8)" }}>{TOUCHGRASS_MINT}</code>
            <button onClick={copy} style={{ ...V2Styles.btnSecondary, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>{copied ? "Copied ✓" : "Copy"}</button>
          </div>
          <p style={{ fontSize: 12.5, color: V2.textMuted, lineHeight: 1.45, margin: "10px 0 0" }}>Always check that the address matches this one before you buy. Anyone can create a token with a similar name.</p>
        </div>

        <div style={{ ...V2Styles.glassCard, padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ ...H, padding: "14px 16px 0" }}>Live market</div>
          <TokenStrip />
        </div>
        <p style={{ fontSize: 12, color: V2.textMuted, lineHeight: 1.5, margin: 0 }}>Market numbers come live from DexScreener and can change quickly. This page isn't financial advice.</p>
      </div>
    </div>
  );
}
