import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────
const SIGN_MESSAGE   = "Verify wallet ownership for Proof of Grass";
const DAPP_URL       = "https://proofofgrass.app";
const DAPP_NAME      = "Proof of Grass";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPhantomExtension() {
  if (typeof window === "undefined") return null;
  if (window?.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window?.solana?.isPhantom)          return window.solana;
  return null;
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function bs58Encode(buffer) {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = new Uint8Array(buffer);
  let result = "";
  let carry;
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) result += "1";
  for (let i = digits.length - 1; i >= 0; i--) result += ALPHABET[digits[i]];
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalletVerify({ username, currentWallet, currentVerified, onVerified }) {
  const [walletAddr, setWalletAddr] = useState(currentWallet ?? "");
  const [verified,   setVerified]   = useState(currentVerified ?? false);
  const [step,       setStep]       = useState("idle");
  // idle | connecting | signing | saving | done | error | mobile_pending
  const [error,      setError]      = useState("");

  const T = {
    bg2:"#0e100b", bg3:"#141710",
    border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
    olive:"#93a85a", gold:"#c8a84b",
    white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
  };

  useEffect(() => {
    setWalletAddr(currentWallet ?? "");
    setVerified(currentVerified ?? false);
  }, [currentWallet, currentVerified]);

  // ── Handle Phantom deep link return (mobile) ───────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const phantomPubkey    = params.get("phantom_encryption_public_key");
    const nonce            = params.get("nonce");
    const dataParam        = params.get("data");
    const errorCode        = params.get("errorCode");

    // Also handle the simpler connect callback
    const pubkeyDirect     = params.get("publicKey");
    const signedDirect     = params.get("signature");

    if (errorCode) {
      setError("Phantom connection was cancelled or failed.");
      setStep("error");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    // Simple deep link return with publicKey + signature directly
    if (pubkeyDirect && signedDirect) {
      const storedUsername = sessionStorage.getItem("pog_wallet_username") || username;
      handleSaveWallet(pubkeyDirect, storedUsername);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Save verified wallet to Supabase ──────────────────────────────────────
  const handleSaveWallet = useCallback(async (publicKey, targetUsername) => {
    if (!publicKey || !targetUsername) return;
    setStep("saving");
    try {
      // Check not already linked to another account
      const { data: existing } = await supabase
        .from("Profiles")
        .select("username")
        .eq("wallet_address", publicKey)
        .maybeSingle();

      if (existing && existing.username !== targetUsername) {
        setError(`This wallet is already linked to @${existing.username}.`);
        setStep("error");
        return;
      }

      const { error: saveErr } = await supabase
        .from("Profiles")
        .upsert({
          username:               targetUsername,
          wallet_address:         publicKey,
          wallet_verified:        true,
          wallet_verified_at:     new Date().toISOString(),
          holder_tier:            "none",
          wallet_last_checked_at: new Date().toISOString(),
        }, { onConflict: "username" });

      if (saveErr) throw new Error(saveErr.message);

      setWalletAddr(publicKey);
      setVerified(true);
      setStep("done");
      onVerified?.(publicKey);
    } catch (err) {
      setError(err?.message || "Failed to save wallet. Try again.");
      setStep("error");
    }
  }, [onVerified]);

  // ── Desktop: use Phantom browser extension ────────────────────────────────
  const handleDesktopConnect = useCallback(async () => {
    const phantom = getPhantomExtension();
    if (!phantom) {
      setError("Phantom extension not found. Install it at phantom.app");
      setStep("error");
      return;
    }
    try {
      setStep("connecting");
      const resp      = await phantom.connect();
      const publicKey = resp.publicKey.toString();

      setStep("signing");
      const encoded = new TextEncoder().encode(SIGN_MESSAGE);
      const signed  = await phantom.signMessage(encoded, "utf8");
      if (!signed?.signature) throw new Error("Signature was cancelled.");

      await handleSaveWallet(publicKey, username);
    } catch (err) {
      if (err?.message?.includes("User rejected") || err?.code === 4001) {
        setError("Cancelled.");
      } else {
        setError(err?.message || "Something went wrong.");
      }
      setStep("error");
    }
  }, [username, handleSaveWallet]);

  // ── Mobile: Phantom deep link ─────────────────────────────────────────────
  const handleMobileConnect = useCallback(() => {
    if (!username) {
      setError("Please set your username first.");
      return;
    }

    // Store username so we can retrieve it when Phantom redirects back
    sessionStorage.setItem("pog_wallet_username", username);

    // Build the redirect URL — Phantom will append publicKey + signature as params
    const redirectUrl = encodeURIComponent(
      `${DAPP_URL}/u/${username}?wallet_verify=1`
    );

    // Encode the message to sign as base58
    const messageBytes = new TextEncoder().encode(SIGN_MESSAGE);
    const messageB58   = bs58Encode(messageBytes);

    // Phantom universal link — connect + sign in one flow
    // Using the "signMessage" deep link which handles both connect and sign
    const phantomUrl =
      `https://phantom.app/ul/v1/signMessage` +
      `?app_url=${encodeURIComponent(DAPP_URL)}` +
      `&dapp_encryption_public_key=` + // optional, for encrypted flow
      `&redirect_link=${redirectUrl}` +
      `&payload=${encodeURIComponent(JSON.stringify({
        message: btoa(SIGN_MESSAGE),
      }))}`;

    // Simpler fallback: just use the connect deep link
    // Phantom will redirect back with publicKey in URL
    const simplePhantomUrl =
      `https://phantom.app/ul/v1/connect` +
      `?app_url=${encodeURIComponent(DAPP_URL)}` +
      `&dapp_encryption_public_key=placeholder` +
      `&redirect_link=${redirectUrl}&cluster=mainnet-beta`;

    setStep("mobile_pending");
    window.location.href = simplePhantomUrl;
  }, [username]);

  // ── Main connect handler ──────────────────────────────────────────────────
  const handleConnect = useCallback(() => {
    setError("");
    setStep("idle");
    if (isMobile()) {
      handleMobileConnect();
    } else {
      handleDesktopConnect();
    }
  }, [handleMobileConnect, handleDesktopConnect]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    const { error: err } = await supabase
      .from("Profiles")
      .update({
        wallet_address:      null,
        wallet_verified:     false,
        wallet_verified_at:  null,
        holder_tier:         "none",
      })
      .eq("username", username);

    if (!err) {
      setWalletAddr("");
      setVerified(false);
      setStep("idle");
      onVerified?.(null);
    }
  }, [username, onVerified]);

  const isLoading = ["connecting","signing","saving"].includes(step);
  const stepLabel = {
    connecting:     "Connecting…",
    signing:        "Sign in Phantom…",
    saving:         "Saving…",
    mobile_pending: "Opening Phantom…",
  }[step];

  // ── Render ────────────────────────────────────────────────────────────────

  // Already verified
  if (verified && walletAddr) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{
          display:"flex", alignItems:"center", gap:12,
          padding:"14px 16px", background:T.bg3,
          border:`1px solid ${T.borderG}`, borderRadius:10,
        }}>
          <div style={{
            width:38, height:38, borderRadius:10, flexShrink:0,
            background:"rgba(147,168,90,0.1)", border:`1px solid rgba(147,168,90,0.25)`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
          }}>◎</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.olive, marginBottom:3 }}>
              Wallet Verified ✓
            </div>
            <div style={{
              fontSize:11, color:T.dim, fontFamily:"monospace",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            }}>
              {walletAddr.slice(0,6)}...{walletAddr.slice(-6)}
            </div>
          </div>
        </div>
        <button onClick={handleDisconnect} style={{
          background:"transparent", border:`1px solid rgba(248,113,113,0.25)`,
          borderRadius:8, padding:"8px 16px", fontSize:11,
          color:"rgba(248,113,113,0.6)", cursor:"pointer", fontWeight:600,
          fontFamily:"'DM Sans',sans-serif",
        }}>Disconnect Wallet</button>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Info */}
      <div style={{
        fontSize:12, color:T.dim, lineHeight:1.7,
        padding:"12px 14px", background:T.bg3,
        border:`1px solid ${T.border}`, borderRadius:8,
      }}>
        Connect your Phantom wallet to verify ownership.{" "}
        <span style={{ color:T.olive }}>No transactions — signature only.</span>
      </div>

      {/* Mobile notice */}
      {isMobile() && (
        <div style={{
          fontSize:11, color:T.gold, lineHeight:1.6,
          padding:"10px 12px", background:"rgba(200,168,75,0.06)",
          border:`1px solid rgba(200,168,75,0.2)`, borderRadius:8,
        }}>
          📱 On mobile: tapping connect will open the Phantom app.
          After approving, you'll be returned here automatically.
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          fontSize:12, color:"#f87171", padding:"10px 12px",
          background:"rgba(248,113,113,0.06)",
          border:"1px solid rgba(248,113,113,0.2)", borderRadius:8,
        }}>{error}</div>
      )}

      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={isLoading || step === "mobile_pending"}
        style={{
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          padding:"13px 20px", borderRadius:9, cursor:"pointer",
          background: isLoading ? T.bg3 : T.olive,
          border:`1px solid ${isLoading ? T.border : T.olive}`,
          color: isLoading ? T.dim : "#080a06",
          fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif",
          letterSpacing:"0.04em", transition:"all 0.2s",
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading || step === "mobile_pending" ? (
          stepLabel
        ) : (
          <><span style={{ fontSize:16 }}>◎</span> Connect Phantom</>
        )}
      </button>

      {/* Install link if no extension on desktop */}
      {!isMobile() && !getPhantomExtension() && (
        <div style={{ fontSize:11, color:T.dim, textAlign:"center" }}>
          Don't have Phantom?{" "}
          <a href="https://phantom.app" target="_blank" rel="noopener noreferrer"
            style={{ color:T.olive, textDecoration:"none" }}>
            Install it here →
          </a>
        </div>
      )}
    </div>
  );
}