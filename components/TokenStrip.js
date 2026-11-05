// components/TokenStrip.js — live $TOUCHGRASS market numbers + Buy / DexScreener buttons (used on /token)
import { useState, useEffect } from "react";
import { V2, V2Styles } from "../utils/v2Theme";

export const TOUCHGRASS_MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const DEXSCREENER_URL = "https://dexscreener.com/solana/5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const BUY_URL         = "https://jup.ag/swap/SOL-5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";

function Skel({ w = "100%", h = 16, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "rgba(200,220,190,0.45)" }} />;
}

// ─── TokenStrip ──────────────────────────────────────────────────────────────
export default function TokenStrip() {
  const [price,    setPrice]    = useState(null);
  const [change24, setChange24] = useState(null);
  const [vol24,    setVol24]    = useState(null);
  const [mcap,     setMcap]     = useState(null);
  const [liq,      setLiq]      = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/touchgrass-price");
        const d = await r.json();
        if (d.price > 0) setPrice(d.price);
        // Fetch full pair data for vol/mcap/liq
        const r2 = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOUCHGRASS_MINT}`);
        const d2 = await r2.json();
        const pair = d2?.pairs?.[0];
        if (pair) {
          setChange24(parseFloat(pair.priceChange?.h24 || 0));
          setVol24(parseFloat(pair.volume?.h24 || 0));
          setMcap(parseFloat(pair.marketCap || 0));
          setLiq(parseFloat(pair.liquidity?.usd || 0));
        }
      } catch(e) {}
      setLoading(false);
    })();
  }, []);

  const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${n.toFixed(2)}`;
  const fmtPrice = (n) => {
    if (!n) return "—";
    if (n < 0.000001) return `$${n.toExponential(2)}`;
    if (n < 0.001) return `$${n.toFixed(8)}`;
    return `$${n.toFixed(6)}`;
  };
  const up = (change24 || 0) >= 0;

  return (
    <div style={{
      ...V2Styles.glassCard,
      borderRadius: 0,
      display: "flex", alignItems: "center", gap: 0,
      padding: "12px clamp(14px,4vw,40px)",
      flexWrap: "wrap",
      borderLeft: "none", borderRight: "none",
      gap: 24,
    }}>
      {/* Logo + price */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <img src="/touchgrass-transparent.png" alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: V2.forestGreen }}>$TOUCHGRASS</span>
        {loading ? <Skel w={80} h={16} /> : (
          <span style={{ fontFamily: V2.fontSerif, fontSize: 18, fontWeight: 700, color: V2.forestGreen }}>
            {fmtPrice(price)}
          </span>
        )}
        {change24 !== null && (
          <span style={{ fontSize: 12, fontWeight: 700, color: up ? V2.success : V2.danger }}>
            {up ? "▲" : "▼"} {Math.abs(change24).toFixed(2)}%
          </span>
        )}
      </div>

      {/* Stats */}
      {!loading && [
        { label: "24h Vol",    value: fmt(vol24 || 0) },
        { label: "Market Cap", value: fmt(mcap  || 0) },
        { label: "Liquidity",  value: fmt(liq   || 0) },
      ].map(s => (
        <div key={s.label} style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: V2.midGray, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: V2.forestGreen }}>{s.value}</div>
        </div>
      ))}

      {/* CTAs */}
      <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexShrink: 0, flexWrap: "wrap" }}>
        <a href={DEXSCREENER_URL} target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 12, fontWeight: 600, color: V2.forestGreen,
            textDecoration: "none", padding: "7px 14px",
            border: `1px solid ${V2.borderSoft}`, borderRadius: 20,
            background: V2.glassWhite,
          }}>
          📈 DexScreener
        </a>
        <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
          style={{
            ...V2Styles.btnPrimary,
            textDecoration: "none",
            fontSize: 12, padding: "7px 16px",
          }}>
          💰 Buy $TOUCHGRASS
        </a>
      </div>
    </div>
  );
}

