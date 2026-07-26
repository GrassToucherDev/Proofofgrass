// components/WalletPurchaseModal.js
// On-chain $TOUCHGRASS payment — no admin approval needed

import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const MINT_ADDRESS  = new PublicKey("5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump");
const BURN_ADDRESS  = new PublicKey("GBxEuaVDSNqF6mAbryHbGjVNuQEvfJyCnyqesZVSy5K");
const TOKEN_DECIMALS = 6;

const T = {
  bg:"#080a06", bg2:"#0e100b", bg3:"#141710",
  border:"rgba(255,255,255,0.055)", borderG:"rgba(147,168,90,0.2)",
  borderGold:"rgba(200,168,75,0.35)",
  olive:"#93a85a", gold:"#c8a84b",
  white:"#f0efea", muted:"rgba(240,239,234,0.52)", dim:"rgba(240,239,234,0.24)",
  red:"#ef4444",
};

// Steps shown to user
const STEPS = {
  idle:       null,
  connecting: "Connecting wallet…",
  checking:   "Checking your balance…",
  building:   "Building transaction…",
  signing:    "Waiting for your approval in wallet…",
  confirming: "Confirming on-chain…",
  verifying:  "Verifying purchase…",
  success:    "Purchase complete!",
  error:      null,
};

export default function WalletPurchaseModal({
  item,
  tokens,       // integer — amount of $TOUCHGRASS to send
  price,        // float — USD price (for display)
  username,
  onClose,
  onSuccess,
}) {
  const { connection }                = useConnection();
  const { publicKey, sendTransaction, connected, connecting } = useWallet();

  const [step,    setStep]    = useState("idle");
  const [error,   setError]   = useState("");
  const [txSig,   setTxSig]   = useState("");
  const [balance, setBalance] = useState(null);

  // Fetch token balance when wallet connects
  useEffect(() => {
    if (!publicKey || !connection) return;
    (async () => {
      try {
        const ata = await getAssociatedTokenAddress(MINT_ADDRESS, publicKey);
        const info = await connection.getTokenAccountBalance(ata);
        setBalance(info.value.uiAmount ?? 0);
      } catch {
        setBalance(0);
      }
    })();
  }, [publicKey, connection]);

  const handlePurchase = useCallback(async () => {
    if (!publicKey || !tokens) return;
    setError("");
    setStep("checking");

    try {
      // ── Check balance ────────────────────────────────────────────────────
      const ata = await getAssociatedTokenAddress(MINT_ADDRESS, publicKey);
      let bal = 0;
      try {
        const info = await connection.getTokenAccountBalance(ata);
        bal = info.value.uiAmount ?? 0;
        setBalance(bal);
      } catch { bal = 0; }

      if (bal < tokens) {
        setError(`Insufficient balance. You have ${bal.toLocaleString()} $TOUCHGRASS — need ${tokens.toLocaleString()}.`);
        setStep("error");
        return;
      }

      // ── Build transaction ─────────────────────────────────────────────────
      setStep("building");

      // Get destination ATA (burn address token account)
      const destAta = await getAssociatedTokenAddress(MINT_ADDRESS, BURN_ADDRESS);

      // Check if dest ATA exists — if not, user's wallet will create it
      let destExists = false;
      try {
        await connection.getTokenAccountBalance(destAta);
        destExists = true;
      } catch { destExists = false; }

      const tx = new Transaction();

      // Create dest ATA if needed
      if (!destExists) {
        const { createAssociatedTokenAccountInstruction } = await import("@solana/spl-token");
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,    // payer
            destAta,      // ATA to create
            BURN_ADDRESS, // owner
            MINT_ADDRESS, // mint
          )
        );
      }

      // Transfer instruction
      const rawAmount = BigInt(Math.round(tokens * Math.pow(10, TOKEN_DECIMALS)));
      tx.add(
        createTransferCheckedInstruction(
          ata,             // source
          MINT_ADDRESS,    // mint
          destAta,         // destination
          publicKey,       // owner
          rawAmount,       // amount (raw)
          TOKEN_DECIMALS,  // decimals
          [],              // signers
          TOKEN_PROGRAM_ID,
        )
      );

      // Memo skipped — @solana/spl-memo not installed

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // ── Send to wallet for signing ────────────────────────────────────────
      setStep("signing");
      const signature = await sendTransaction(tx, connection);
      setTxSig(signature);

      // ── Wait for confirmation ─────────────────────────────────────────────
      setStep("confirming");
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      // ── Verify server-side ───────────────────────────────────────────────
      setStep("verifying");
      const res = await fetch("/api/marketplace/verify-purchase", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          signature,
          username,
          itemId:         item.id,
          itemName:       item.name,
          expectedAmount: tokens,
          walletAddress:  publicKey.toString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Verification failed");
      }

      setStep("success");
      onSuccess?.({ signature, unlockedCovers: data.coverSlugs });

    } catch(e) {
      console.error("[WalletPurchaseModal]", e);
      if (e?.name === "WalletSignTransactionError" || e?.message?.includes("rejected")) {
        setError("Transaction cancelled.");
      } else {
        setError(e?.message || "Transaction failed. Please try again.");
      }
      setStep("error");
    }
  }, [publicKey, connection, sendTransaction, tokens, item, username, onSuccess]);

  const stepLabel = STEPS[step];
  const isProcessing = !["idle","error","success"].includes(step);

  return (
    <>
      {/* Backdrop */}
      <div onClick={!isProcessing ? onClose : undefined}
        style={{position:"fixed",inset:0,zIndex:998,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)"}} />

      {/* Modal */}
      <div style={{
        position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        zIndex:999,width:"min(480px,94vw)",maxHeight:"90vh",overflowY:"auto",
        background:T.bg2,border:`1px solid ${T.borderGold}`,
        borderRadius:20,padding:"28px 24px",
        boxShadow:"0 24px 80px rgba(0,0,0,0.8)",
      }}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <div style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:T.gold,marginBottom:4}}>
              Marketplace Purchase
            </div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:700,color:T.white}}>
              {item.name}
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onClose}
              style={{background:"none",border:`1px solid ${T.border}`,color:T.dim,
                borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12,flexShrink:0}}>
              ✕
            </button>
          )}
        </div>

        {/* Price summary */}
        <div style={{background:T.bg3,borderRadius:12,padding:"16px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,color:T.muted}}>Item</span>
            <span style={{fontSize:13,color:T.white,fontWeight:600}}>{item.name}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,color:T.muted}}>Price</span>
            <span style={{fontSize:13,color:T.white,fontWeight:600}}>${price?.toFixed(2)} USD</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            paddingTop:8,borderTop:`1px solid ${T.border}`}}>
            <span style={{fontSize:12,color:T.muted}}>$TOUCHGRASS Amount</span>
            <span style={{fontSize:16,fontWeight:700,color:T.gold}}>
              {tokens?.toLocaleString()}
            </span>
          </div>
          {balance !== null && connected && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
              <span style={{fontSize:11,color:T.dim}}>Your Balance</span>
              <span style={{fontSize:12,color:balance >= tokens ? T.olive : T.red,fontWeight:600}}>
                {balance.toLocaleString()} $TOUCHGRASS
                {balance < tokens && " ⚠️ Insufficient"}
              </span>
            </div>
          )}
        </div>

        {/* Success state */}
        {step === "success" && (
          <div style={{textAlign:"center",padding:"16px 0"}}>
            <div style={{fontSize:44,marginBottom:14}}>🎉</div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:700,color:T.white,marginBottom:8}}>
              Purchase Complete!
            </div>
            <div style={{fontSize:12,color:T.muted,lineHeight:1.7,marginBottom:16}}>
              <strong style={{color:T.white}}>{item.name}</strong> has been unlocked for your account instantly.
            </div>
            {txSig && (
              <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer"
                style={{fontSize:10,color:T.olive,display:"block",marginBottom:20,wordBreak:"break-all"}}>
                View transaction on Solscan ↗
              </a>
            )}
            <button onClick={onClose}
              style={{padding:"12px 32px",borderRadius:9,cursor:"pointer",
                background:T.olive,border:"none",color:"#0a0c08",
                fontSize:13,fontWeight:800,letterSpacing:"0.04em"}}>
              Done
            </button>
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div style={{textAlign:"center",padding:"16px 0"}}>
            <div style={{fontSize:36,marginBottom:14,animation:"spin 1.5s linear infinite",display:"inline-block"}}>⟳</div>
            <div style={{fontSize:14,color:T.white,fontWeight:600,marginBottom:6}}>{stepLabel}</div>
            {step === "signing" && (
              <div style={{fontSize:11,color:T.dim,lineHeight:1.7}}>
                Check your wallet app to approve the transaction.
              </div>
            )}
            {step === "confirming" && (
              <div style={{fontSize:11,color:T.dim}}>
                Usually takes 1–2 seconds on Solana.
              </div>
            )}
          </div>
        )}

        {/* Idle / error state */}
        {(step === "idle" || step === "error") && (
          <>
            {/* Wallet connect */}
            {!connected ? (
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:12,color:T.muted,marginBottom:16,lineHeight:1.7}}>
                  Connect your Solana wallet to purchase with $TOUCHGRASS.
                  Supports Phantom, Backpack, Solflare, and more.
                </div>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <WalletMultiButton style={{
                    background:`linear-gradient(135deg,${T.gold},#a88c38)`,
                    color:"#0a0800",borderRadius:10,
                    fontSize:13,fontWeight:800,padding:"12px 24px",
                    border:"none",letterSpacing:"0.04em",
                  }} />
                </div>
              </div>
            ) : (
              <>
                {/* Connected wallet info */}
                <div style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  background:"rgba(147,168,90,0.06)",border:`1px solid rgba(147,168,90,0.2)`,
                  borderRadius:10,padding:"10px 14px",marginBottom:16,
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:T.olive,
                      boxShadow:`0 0 8px ${T.olive}`}} />
                    <span style={{fontSize:12,color:T.white,fontFamily:"monospace"}}>
                      {publicKey?.toString().slice(0,6)}…{publicKey?.toString().slice(-4)}
                    </span>
                  </div>
                  <WalletMultiButton style={{
                    background:"transparent",color:T.dim,border:"none",
                    fontSize:10,cursor:"pointer",padding:"2px 6px",
                  }} />
                </div>

                {/* Error */}
                {step === "error" && error && (
                  <div style={{
                    background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.25)",
                    borderRadius:10,padding:"12px 14px",marginBottom:16,
                    fontSize:12,color:T.red,lineHeight:1.6,
                  }}>
                    {error}
                  </div>
                )}

                {/* Purchase button */}
                <button
                  onClick={handlePurchase}
                  disabled={!connected || balance < tokens}
                  style={{
                    width:"100%",padding:"14px",borderRadius:10,cursor:"pointer",
                    background:`linear-gradient(135deg,${T.gold},#a88c38)`,
                    border:"none",color:"#0a0800",fontSize:14,fontWeight:900,
                    letterSpacing:"0.04em",
                    boxShadow:"0 4px 20px rgba(200,168,75,0.35)",
                    opacity: balance < tokens ? 0.4 : 1,
                    marginBottom:12,
                  }}>
                  Pay {tokens?.toLocaleString()} $TOUCHGRASS →
                </button>

                <div style={{fontSize:10,color:T.dim,textAlign:"center",lineHeight:1.6}}>
                  Transaction confirms in ~1–2 seconds · Unlocked instantly on approval
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}