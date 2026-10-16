// pages/wago-drops/settings.js
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";

import { T } from "../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../components/wago-drops/WagoDropsNav";

export default function WagoDropsSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentWallet, setCurrentWallet] = useState(null);
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [loading,       setLoading]       = useState(true);

  // Wallet update form
  const [newAddress, setNewAddress] = useState("");
  const [saving,     setSaving]     = useState(false);
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

  async function handleSaveWallet(e) {
    e.preventDefault();
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/wago-drops/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update wallet");
      setCurrentWallet(trimmed);
      setLastUpdated(new Date().toISOString());
      setNewAddress("");
      setSaveMsg({ ok: true, text: "Wallet updated successfully." });
    } catch (err) {
      setSaveMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

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
      <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "system-ui,sans-serif" }}>

        {/* Nav */}
        <WagoDropsNav session={session} />
        <WagoDropsBottomNav />

        {/* Content */}
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px clamp(14px,4vw,32px) 80px" }}>

          {/* Account section */}
          <Section title="Account">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {session?.user?.image && (
                <img src={session.user.image} alt=""
                  style={{ width: 48, height: 48, borderRadius: "50%", border: `1px solid ${T.border}` }} />
              )}
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

            {/* Update form */}
            <form onSubmit={handleSaveWallet}>
              <Label>{currentWallet ? "Change wallet" : "Link a wallet"}</Label>
              <input
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                placeholder="New Solana wallet address (base58)"
                disabled={!!cooldownRemaining}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: cooldownRemaining ? "rgba(13,42,5,0.04)" : T.bg,
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: "11px 14px", fontSize: 13, color: T.white,
                  fontFamily: "monospace", outline: "none",
                  opacity: cooldownRemaining ? 0.5 : 1,
                  marginBottom: 10,
                }}
              />

              {saveMsg && (
                <div style={{
                  fontSize: 13, color: saveMsg.ok ? T.green : T.red,
                  padding: "8px 12px", borderRadius: 8, marginBottom: 10,
                  background: saveMsg.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                }}>
                  {saveMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !newAddress.trim() || !!cooldownRemaining}
                style={{
                  background: (saving || !newAddress.trim() || cooldownRemaining) ? T.oliveD : T.olive,
                  color: T.bg, border: "none", borderRadius: 8,
                  padding: "11px 22px", fontSize: 13, fontWeight: 700,
                  cursor: (saving || !newAddress.trim() || cooldownRemaining) ? "default" : "pointer",
                  opacity: (saving || !newAddress.trim() || cooldownRemaining) ? 0.6 : 1,
                }}
              >
                {saving ? "Saving…" : currentWallet ? "Update Wallet" : "Link Wallet"}
              </button>
            </form>

            <p style={{ fontSize: 11, color: T.dim, marginTop: 14, lineHeight: 1.6 }}>
              All $TOUCHGRASS rewards are sent to this address. Wallets can be changed once every 24 hours.
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