import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

const T = {
  bg:"#0a0b08", bg2:"#111209", bg3:"#181a12",
  border:"rgba(255,255,255,0.06)", borderG:"rgba(147,168,90,0.18)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.48)", dim:"rgba(240,239,234,0.22)",
  red:"#ef4444",
};

const SIGN_MESSAGE = "Verify wallet ownership for Proof of Grass";

function shorten(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function getPhantom() {
  if (typeof window === "undefined") return null;
  // Standard Phantom injection
  if (window?.solana?.isPhantom) return window.solana;
  // Phantom may also inject under window.phantom
  if (window?.phantom?.solana?.isPhantom) return window.phantom.solana;
  return null;
}

function isMobile() {
  return typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function WalletVerify({ username, currentWallet, currentVerified, onVerified }) {
  const [step,        setStep]        = useState("idle"); // idle | connecting | signing | saving | done | error
  const [walletAddr,  setWalletAddr]  = useState(currentWallet ?? "");
  const [verified,    setVerified]    = useState(currentVerified ?? false);
  const [error,       setError]       = useState("");
  const [copied,      setCopied]      = useState(false);

  useEffect(() => {
    setWalletAddr(currentWallet ?? "");
    setVerified(currentVerified ?? false);
  }, [currentWallet, currentVerified]);

  const handleConnect = useCallback(async () => {
    setError("");

    // ── Mobile: open Phantom deep link ────────────────────────────────────
    if (isMobile()) {
      const phantom = getPhantom();
      if (!phantom) {
        // Deep link into Phantom mobile app
        const url = encodeURIComponent(window.location.href);
        window.location.href = `https://phantom.app/ul/browse/${url}?ref=${url}`;
        return;
      }
    }

    const phantom = getPhantom();
    if (!phantom) {
      setError("Phantom wallet not found. Please install the Phantom browser extension.");
      return;
    }

    try {
      // ── Step 1: Connect ───────────────────────────────────────────────
      setStep("connecting");
      const resp = await phantom.connect();
      const publicKey = resp.publicKey.toString();

      // ── Step 2: Sign message ──────────────────────────────────────────
      setStep("signing");
      const encoded = new TextEncoder().encode(SIGN_MESSAGE);
      const signed  = await phantom.signMessage(encoded, "utf8");

      if (!signed?.signature) throw new Error("Signature failed or was cancelled.");

      // ── Step 3: Check wallet not already linked to another account ────
      setStep("saving");
      const { data: existing } = await supabase
        .from("Profiles")
        .select("username")
        .eq("wallet_address", publicKey)
        .maybeSingle();

      if (existing && existing.username !== username) {
        setError(`This wallet is already linked to @${existing.username}.`);
        setStep("error");
        return;
      }

      // ── Step 4: Save to Supabase ──────────────────────────────────────
      const { error: saveErr } = await supabase
        .from("Profiles")
        .upsert({
          username,
          wallet_address:     publicKey,
          wallet_verified:    true,
          wallet_verified_at: new Date().toISOString(),
          holder_tier:        "none",
          wallet_last_checked_at: new Date().toISOString(),
        }, { onConflict: "username" });

      if (saveErr) throw new Error(saveErr.message);

      setWalletAddr(publicKey);
      setVerified(true);
      setStep("done");
      onVerified?.(publicKey);

    } catch (err) {
      console.error("Wallet verify error:", err);
      if (err?.message?.includes("User rejected")) {
        setError("Connection cancelled.");
      } else if (err?.message?.includes("already linked")) {
        setError(err.message);
      } else {
        setError(err?.message || "Something went wrong. Try again.");
      }
      setStep("error");
    }
  }, [username, onVerified]);

  const handleDisconnect = useCallback(async () => {
    const { error: err } = await supabase
      .from("Profiles")
      .update({
        wallet_address:     null,
        wallet_verified:    false,
        wallet_verified_at: null,
      })
      .eq("username", username);

    if (!err) {
      setWalletAddr("");
      setVerified(false);
      setStep("idle");
      onVerified?.(null);
    }
  }, [username, onVerified]);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── Verified state ────────────────────────────────────────────────────────
  if (verified && walletAddr) {
    return (
      <div style={{ background:T.bg3, border:`1px solid ${T.borderG}`,
        borderRadius:12, padding:"16px 18px" }}>
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
              background:`${T.olive}14`, border:`1px solid ${T.borderG}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16 }}>◎</div>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                <span style={{ fontSize:12, fontWeight:700, color:T.olive }}>Wallet Verified</span>
                <span style={{ fontSize:9, background:`${T.olive}18`,
                  color:T.olive, border:`1px solid ${T.olive}40`,
                  borderRadius:4, padding:"1px 6px", letterSpacing:"0.1em",
                  textTransform:"uppercase", fontWeight:700 }}>✓</span>
              </div>
              <button onClick={copyAddress} style={{
                background:"transparent", border:"none", cursor:"pointer",
                fontSize:11, color:T.dim, padding:0, fontFamily:"monospace",
                letterSpacing:"0.05em",
              }}>
                {copied ? "Copied!" : shorten(walletAddr)}
              </button>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:T.dim, marginBottom:4 }}>Holder Tier</div>
            <div style={{ fontSize:11, fontWeight:600, color:T.muted }}>Not checked yet</div>
          </div>
        </div>
        <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:10, color:T.dim }}>
            Built on ◎ Solana
          </span>
          <button onClick={handleDisconnect} style={{
            background:"transparent", border:`1px solid ${T.border}`,
            borderRadius:6, padding:"4px 10px", color:T.dim,
            fontSize:10, cursor:"pointer", transition:"all 0.2s",
          }}>
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // ── Connect state ─────────────────────────────────────────────────────────
  const isLoading = ["connecting","signing","saving"].includes(step);
  const stepLabel = {
    connecting: "Connecting…",
    signing:    "Sign the message in Phantom…",
    saving:     "Saving…",
  }[step];

  return (
    <div style={{ background:T.bg3, border:`1px solid ${T.border}`,
      borderRadius:12, padding:"16px 18px" }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em",
        textTransform:"uppercase", color:T.muted, marginBottom:12 }}>
        Wallet Verification
      </div>

      <div style={{ fontSize:12, color:T.dim, lineHeight:1.65, marginBottom:16 }}>
        Connect your Phantom wallet to verify ownership. No transactions will be sent —
        only a message signature is required.
      </div>

      {error && (
        <div style={{ fontSize:11, color:T.red, padding:"8px 12px",
          background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
          borderRadius:7, marginBottom:12, lineHeight:1.5 }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ display:"flex", alignItems:"center", gap:10,
          padding:"10px 0", fontSize:12, color:T.olive }}>
          <div style={{ width:14, height:14, border:`2px solid ${T.olive}`,
            borderTopColor:"transparent", borderRadius:"50%",
            animation:"spin 0.8s linear infinite", flexShrink:0 }} />
          {stepLabel}
        </div>
      ) : (
        <button onClick={handleConnect} style={{
          display:"flex", alignItems:"center", gap:8, width:"100%",
          justifyContent:"center", background:T.olive, border:"none",
          borderRadius:9, padding:"12px 20px", cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700,
          color:"#0e1108", letterSpacing:"0.06em", transition:"all 0.2s",
        }}>
          ◎ Connect Phantom Wallet
        </button>
      )}

      {isMobile() && !getPhantom() && (
        <div style={{ fontSize:10, color:T.dim, marginTop:10, textAlign:"center" }}>
          Will open in the Phantom app
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}