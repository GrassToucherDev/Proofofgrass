// components/wago-drops/WalletConnect.js
// Connect a Solana wallet (Phantom / Solflare via the app-wide wallet adapter),
// sign a short message to prove ownership, and link it to the WAGO account.
// Only wallets proven this way can claim rewards (no paste-an-address path).

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { T } from "../../utils/wagoTheme";
import { buildLinkMessage } from "../../utils/wagoWalletLink";
import { startConnect, DEEPLINK_PROVIDERS } from "../../utils/wagoWalletDeeplink";

// Phone browser with no wallet extension/in-app wallet: use the wallet-app deep link flow.
function needsDeeplink() {
  if (typeof navigator === "undefined") return false;
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const injected = !!(window.phantom?.solana || window.solana || window.solflare);
  return mobile && !injected;
}

function toBase64(bytes) {
  let s = "";
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s);
}

const btn = (disabled, secondary) => ({
  width: "100%", border: secondary ? `1px solid ${T.border}` : "none",
  background: secondary ? "transparent" : (disabled ? T.oliveD : T.olive),
  color: secondary ? T.muted : "#fff", borderRadius: 999,
  padding: "13px 20px", fontSize: 14, fontWeight: 700,
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1,
});

export default function WalletConnect({ googleId, onLinked, disabled = false, ctaLabel = "Verify & link wallet" }) {
  const { publicKey, connected, connecting, signMessage, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const addr = publicKey?.toBase58();
  const [deeplink, setDeeplink] = useState(false);
  useEffect(() => { setDeeplink(needsDeeplink()); }, []);

  async function post(body) {
    const res = await fetch("/api/wago-drops/link-wallet", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Couldn't link wallet");
    return data;
  }

  async function verifyAndLink() {
    if (!addr) return;
    setBusy(true); setError(null);
    try {
      if (!signMessage) throw new Error(`${wallet?.adapter?.name || "This wallet"} can't sign messages. Try Phantom or Solflare.`);
      const issuedAt = new Date().toISOString();
      const message = buildLinkMessage({ googleId, wallet: addr, issuedAt });
      let sig;
      try { sig = await signMessage(new TextEncoder().encode(message)); }
      catch { throw new Error("Signature cancelled — nothing was linked."); }
      const data = await post({ wallet: addr, signature: toBase64(sig), issuedAt });
      onLinked?.(addr, data.verified !== false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {deeplink ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(DEEPLINK_PROVIDERS).map(([id, p]) => (
            <button key={id} disabled={disabled} onClick={() => startConnect(id, googleId)} style={btn(disabled)}>
              👛 Open {p.label}
            </button>
          ))}
          <p style={{ fontSize: 11, color: T.dim, margin: "4px 0 0", lineHeight: 1.6 }}>
            Your wallet app opens, then brings you back here. Two quick approvals: connect, then sign.
          </p>
        </div>
      ) : !connected ? (
        <button onClick={() => setVisible(true)} disabled={disabled || connecting} style={btn(disabled || connecting)}>
          {connecting ? "Connecting…" : "👛 Connect wallet"}
        </button>
      ) : (
        <div>
          <div style={{
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 14px",
            fontFamily: "monospace", fontSize: 13, color: T.white, wordBreak: "break-all", marginBottom: 10,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, flexShrink: 0 }} />
            {addr}
          </div>
          <button onClick={verifyAndLink} disabled={disabled || busy} style={btn(disabled || busy)}>
            {busy ? "Waiting for signature…" : ctaLabel}
          </button>
          <button onClick={() => disconnect().catch(() => {})} disabled={busy}
            style={{ ...btn(busy, true), marginTop: 8, padding: "10px 20px", fontSize: 13 }}>
            Use a different wallet
          </button>
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: T.red, margin: "10px 0 0", lineHeight: 1.5 }}>{error}</p>}

      <p style={{ fontSize: 11, color: T.dim, margin: "12px 0 0", lineHeight: 1.6, textAlign: "center" }}>
        You&rsquo;ll sign a free message to prove the wallet is yours. No transaction, no fees.
      </p>

    </div>
  );
}
