// pages/wago-drops/settings.js
import { useState, useEffect } from "react";
import WagoAvatar from "../../components/wago-drops/WagoAvatar";
import Head from "next/head";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";

import { T } from "../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../components/wago-drops/WagoDropsNav";
import WalletConnect from "../../components/wago-drops/WalletConnect";

export default function WagoDropsSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentWallet, setCurrentWallet] = useState(null);
  const [walletVerified, setWalletVerified] = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [loading,       setLoading]       = useState(true);

  // Wallet update form
  const [saveMsg,    setSaveMsg]    = useState(null); // { ok, text }

  // Redirect if not signed in
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/wago-drops");
  }, [status]);

  // Load current wallet info
  useEffect(() => {
    if (!session) return;
    fetch("/api/wago-drops/me")
      .then(r => r.json())
      .then(data => {
        setCurrentWallet(data.linked_wallet || null);
        setWalletVerified(!!data.wallet_verified);
        setLastUpdated(data.wallet_linked_at || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session]);

  // 24-hour cooldown check
  const cooldownRemaining = (() => {
    if (!lastUpdated) return null;
    const updated = new Date(lastUpdated).getTime();
    const elapsed = Date.now() - updated;
    const twentyFourH = 24 * 60 * 60 * 1000;
    if (elapsed >= twentyFourH) return null;
    const remaining = twentyFourH - elapsed;
    const hours   = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  })();

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTopColor: T.olive, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Settings — WAGO Drops</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>

        {/* Nav */}
        <WagoDropsNav session={session} />
        <WagoDropsBottomNav />

        {/* Content */}
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px clamp(14px,4vw,32px) 80px" }}>

          {/* Account section */}
          <Section title="Account">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <WagoAvatar src={session?.user?.image} size={48} border={`1px solid ${T.border}`} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.white }}>{session?.user?.name}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{session?.user?.email}</div>
              </div>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button
                onClick={() => signOut({ callbackUrl: "/wago-drops" })}
                style={{
                  fontSize: 13, color: T.red, background: "none",
                  border: `1px solid rgba(248,113,113,0.25)`, borderRadius: 7,
                  padding: "7px 16px", cursor: "pointer",
                }}
              >Sign out</button>
            </div>
          </Section>

          {/* Wallet section */}
          <Section title="Solana Wallet" style={{ marginTop: 28 }}>
            {/* Current wallet */}
            <div style={{ marginBottom: 24 }}>
              <Label>Current wallet</Label>
              {currentWallet ? (
                <div style={{
                  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: "10px 14px", fontFamily: "monospace", fontSize: 13,
                  color: T.white, wordBreak: "break-all",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, flexShrink: 0 }} />
                  {currentWallet}
                  <span style={{
                    marginLeft: "auto", flexShrink: 0, fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                    padding: "3px 9px", borderRadius: 999,
                    background: walletVerified ? "rgba(74,222,128,0.14)" : "rgba(251,191,36,0.14)",
                    color: walletVerified ? T.green : T.yellow,
                  }}>{walletVerified ? "✓ Verified" : "Unverified"}</span>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: T.muted }}>No wallet linked yet.</div>
              )}
              {lastUpdated && (
                <div style={{ fontSize: 11, color: T.dim, marginTop: 6 }}>
                  Last updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>

            {/* Cooldown warning */}
            {cooldownRemaining && (
              <div style={{
                background: "rgba(251,191,36,0.08)", border: `1px solid rgba(251,191,36,0.2)`,
                borderRadius: 8, padding: "10px 14px", marginBottom: 20,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>⏳</span>
                <div style={{ fontSize: 13, color: T.yellow, lineHeight: 1.5 }}>
                  Wallet can be updated once every 24 hours. Available again in <strong>{cooldownRemaining}</strong>.
                </div>
              </div>
            )}

            {currentWallet && !walletVerified && (
              <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8,
                padding: "10px 14px", marginBottom: 16, fontSize: 13, color: T.yellow, lineHeight: 1.5 }}>
                Your wallet isn&rsquo;t verified yet, so you can&rsquo;t claim drops. Connect the same wallet below and sign to verify it.
              </div>
            )}
            {/* Connect + verify */}
            <Label>{currentWallet ? "Change wallet" : "Link a wallet"}</Label>
            <WalletConnect
              googleId={session?.user?.google_id}
              disabled={!!cooldownRemaining}
              ctaLabel={currentWallet ? "Verify & switch wallet" : "Verify & link wallet"}
              onLinked={(addr, verified) => {
                setCurrentWallet(addr);
                setWalletVerified(!!verified);
                setLastUpdated(new Date().toISOString());
                setSaveMsg({ ok: true, text: verified ? "Wallet verified and linked." : "Wallet linked (unverified)." });
              }}
            />
            {saveMsg && (
              <div style={{
                fontSize: 13, color: saveMsg.ok ? T.green : T.red,
                padding: "8px 12px", borderRadius: 8, marginTop: 12,
                background: saveMsg.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
              }}>{saveMsg.text}</div>
            )}

            <p style={{ fontSize: 11, color: T.dim, marginTop: 14, lineHeight: 1.6 }}>
              Rewards are sent only to a verified wallet. Wallets can be changed once every 24 hours.
            </p>
          </Section>

        </div>
      </div>
    </>
  );
}

function Section({ title, children, style }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "24px",
      ...style,
    }}>
      <div style={{
        fontSize: 11, color: T.olive, letterSpacing: "0.1em",
        textTransform: "uppercase", fontWeight: 600, marginBottom: 18,
      }}>{title}</div>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 8 }}>
      {children}
    </div>
  );
}