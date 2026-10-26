import { useState, useEffect, useCallback } from "react";
import { buildProfileWalletMessage } from "../utils/profileWallet";


function getPhantom() {
  if (typeof window === "undefined") return null;
  if (window?.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window?.solana?.isPhantom)          return window.solana;
  return null;
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isPhantomBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Phantom/i.test(navigator.userAgent);
}

export default function WalletVerify({ username, currentWallet, currentVerified, onVerified }) {
  const [walletAddr, setWalletAddr] = useState(currentWallet ?? "");
  const [verified,   setVerified]   = useState(currentVerified ?? false);
  const [step,       setStep]       = useState("idle");
  const [error,      setError]      = useState("");
  const [showGuide,  setShowGuide]  = useState(false);

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

  const handleConnect = useCallback(async () => {
    setError("");
    setShowGuide(false);

    const phantom = getPhantom();

    // Mobile but NOT in Phantom browser — show guide
    if (isMobile() && !isPhantomBrowser() && !phantom) {
      setShowGuide(true);
      return;
    }

    // No Phantom available at all
    if (!phantom) {
      setError("Phantom not found. Install the Phantom browser extension at phantom.app");
      return;
    }

    try {
      setStep("connecting");
      const resp      = await phantom.connect();
      const publicKey = resp.publicKey.toString();

      setStep("signing");
      const issuedAt = new Date().toISOString();
      const message  = buildProfileWalletMessage({ username: String(username).toLowerCase(), wallet: publicKey, issuedAt });
      const signed   = await phantom.signMessage(new TextEncoder().encode(message), "utf8");
      if (!signed?.signature) throw new Error("Signature cancelled.");
      let bin = ""; for (const byte of signed.signature) bin += String.fromCharCode(byte);

      setStep("saving");
      const r = await fetch("/api/profile/wallet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, wallet: publicKey, signature: btoa(bin), issuedAt }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.code === "unclaimed" ? "Secure your username with Google first (Profile → Secure username), then verify your wallet."
          : j.code === "not_signed_in" ? "Sign in with Google to verify your wallet." : (j.error || "Could not verify the wallet."));
        setStep("error");
        return;
      }

      setWalletAddr(publicKey);
      setVerified(true);
      setStep("done");
      onVerified?.(publicKey);

    } catch (err) {
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        setError("Cancelled.");
      } else {
        setError(err?.message || "Something went wrong. Try again.");
      }
      setStep("error");
    }
  }, [username, onVerified]);

  const handleDisconnect = useCallback(async () => {
    await fetch("/api/profile/wallet", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
    setWalletAddr("");
    setVerified(false);
    setStep("idle");
    setShowGuide(false);
    onVerified?.(null);
  }, [username, onVerified]);

  const isLoading = ["connecting","signing","saving"].includes(step);
  const stepLabel = {
    connecting: "Connecting…",
    signing:    "Check Phantom…",
    saving:     "Saving…",
  }[step];

  // ── Already verified ──────────────────────────────────────────────────────
  if (verified && walletAddr) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{
          display:"flex",alignItems:"center",gap:12,
          padding:"14px 16px",background:T.bg3,
          border:`1px solid ${T.borderG}`,borderRadius:10,
        }}>
          <div style={{
            width:38,height:38,borderRadius:10,flexShrink:0,
            background:"rgba(147,168,90,0.1)",
            border:`1px solid rgba(147,168,90,0.25)`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
          }}>◎</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:T.olive,marginBottom:3}}>
              Wallet Verified ✓
            </div>
            <div style={{
              fontSize:11,color:T.dim,fontFamily:"monospace",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
            }}>
              {walletAddr.slice(0,6)}...{walletAddr.slice(-6)}
            </div>
          </div>
        </div>
        <button onClick={handleDisconnect} style={{
          background:"transparent",
          border:"1px solid rgba(248,113,113,0.25)",
          borderRadius:8,padding:"8px 16px",fontSize:11,
          color:"rgba(248,113,113,0.6)",cursor:"pointer",
          fontFamily:"'Nunito',sans-serif",fontWeight:600,
        }}>Disconnect Wallet</button>
      </div>
    );
  }

  // ── Mobile guide — how to connect via Phantom browser ─────────────────────
  if (showGuide) {
    const profileUrl = `https://proofofgrass.app/u/${username}`;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{
          padding:"16px",background:T.bg3,
          border:`1px solid ${T.borderG}`,borderRadius:10,
        }}>
          <div style={{
            fontSize:13,fontWeight:700,color:T.white,marginBottom:12,
          }}>
            Connect via Phantom Browser
          </div>
          {[
            { n:"1", text:"Open the Phantom app on your phone" },
            { n:"2", text:"Tap the browser tab at the bottom of Phantom" },
            { n:"3", text:`Navigate to:`},
            { n:"4", text:"Tap Connect Phantom on your profile page" },
          ].map((s,i) => (
            <div key={i} style={{
              display:"flex",gap:12,alignItems:"flex-start",
              marginBottom:i<3?12:4,
            }}>
              <div style={{
                width:24,height:24,borderRadius:"50%",flexShrink:0,
                background:"rgba(147,168,90,0.15)",
                border:`1px solid ${T.borderG}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:700,color:T.olive,
              }}>{s.n}</div>
              <div style={{fontSize:12,color:T.muted,lineHeight:1.6,paddingTop:3}}>
                {s.text}
              </div>
            </div>
          ))}
          {/* Copyable URL */}
          <div style={{
            display:"flex",gap:8,alignItems:"center",marginTop:4,
          }}>
            <div style={{
              flex:1,background:T.bg2,border:`1px solid ${T.border}`,
              borderRadius:7,padding:"8px 10px",
              fontSize:11,color:T.olive,fontFamily:"monospace",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
            }}>{profileUrl}</div>
            <button onClick={()=>{
              navigator.clipboard.writeText(profileUrl).catch(()=>{});
            }} style={{
              background:"transparent",border:`1px solid ${T.borderG}`,
              borderRadius:7,padding:"8px 12px",fontSize:11,
              fontWeight:600,color:T.olive,cursor:"pointer",flexShrink:0,
              fontFamily:"'Nunito',sans-serif",
            }}>Copy</button>
          </div>
        </div>
        <button onClick={()=>setShowGuide(false)} style={{
          background:"transparent",border:`1px solid ${T.border}`,
          borderRadius:8,padding:"10px",fontSize:12,
          color:T.dim,cursor:"pointer",fontFamily:"'Nunito',sans-serif",
        }}>← Back</button>
      </div>
    );
  }

  // ── Default connect UI ────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{
        fontSize:12,color:T.dim,lineHeight:1.7,
        padding:"12px 14px",background:T.bg3,
        border:`1px solid ${T.border}`,borderRadius:8,
      }}>
        Connect your Phantom wallet to verify ownership.{" "}
        <span style={{color:T.olive}}>No transactions — signature only.</span>
      </div>

      {error && (
        <div style={{
          fontSize:12,color:"#f87171",padding:"10px 12px",
          background:"rgba(248,113,113,0.06)",
          border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,
        }}>{error}</div>
      )}

      <button onClick={handleConnect} disabled={isLoading} style={{
        display:"flex",alignItems:"center",justifyContent:"center",gap:10,
        padding:"13px 20px",borderRadius:9,cursor:isLoading?"default":"pointer",
        background: isLoading ? T.bg3 : T.olive,
        border:`1px solid ${isLoading ? T.border : T.olive}`,
        color: isLoading ? T.dim : "#080a06",
        fontSize:13,fontWeight:700,fontFamily:"'Nunito',sans-serif",
        letterSpacing:"0.04em",opacity:isLoading?0.7:1,
        transition:"all 0.2s",
      }}>
        {isLoading
          ? stepLabel
          : <><span style={{fontSize:16}}>◎</span> Connect Phantom</>
        }
      </button>

      {/* Desktop install link */}
      {!isMobile() && !getPhantom() && (
        <div style={{fontSize:11,color:T.dim,textAlign:"center"}}>
          Don't have Phantom?{" "}
          <a href="https://phantom.app" target="_blank" rel="noopener noreferrer"
            style={{color:T.olive,textDecoration:"none"}}>
            Install it here →
          </a>
        </div>
      )}
    </div>
  );
}