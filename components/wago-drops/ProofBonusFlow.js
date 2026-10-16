// components/wago-drops/ProofBonusFlow.js
// Post-claim Proof bonus flow:
//   photo → server validation (100m, 24h, one per claim) → WAGO share card →
//   Post to X → paste X link → Grass Tickets in the current monthly draw.
//
// Server rules live in /api/wago-drops/proof and /proof-confirm; this component
// only drives the UI. Photos go to the existing `proof-photos` bucket.

import { useEffect, useMemo, useRef, useState } from "react";
import { V2, V2Styles } from "../../utils/v2Theme";
import { supabase } from "../../utils/supabase";
import { isValidXPostUrl } from "../../utils/wagoProofBonus";
import WagoShareCard from "./WagoShareCard";
import Wago from "./Wago";

function useCountdown(deadlineIso) {
  const [left, setLeft] = useState(() => new Date(deadlineIso).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(deadlineIso).getTime() - Date.now()), 30000);
    return () => clearInterval(t);
  }, [deadlineIso]);
  if (left <= 0) return { expired: true, label: "expired" };
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  return { expired: false, label: h > 0 ? `${h}h ${m}m left` : `${m}m left` };
}

// Downscale + re-encode as JPEG (storage path is always .jpg).
function toJpegBlob(file, maxSide = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(b) : reject(new Error("Couldn't read that photo"))), "image/jpeg", 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that photo")); };
    img.src = url;
  });
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location isn't available on this device."));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error("Allow location access so we can confirm you're at the drop.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

const card = { ...V2Styles.glassCard, padding: 18, marginTop: 14 };
const label = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: V2.grassDark };

export default function ProofBonusFlow({ claim, onDone }) {
  // claim: { claim_id, proof_tickets, proof_deadline, rarity, drop }
  const [stage, setStage]     = useState("intro");   // intro | uploading | approved | done
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError]     = useState(null);
  const [tickets, setTickets] = useState(claim.proof_tickets);
  const [pogUser, setPogUser] = useState(null);
  const [needUser, setNeedUser] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [xUrl, setXUrl]       = useState("");
  const [posted, setPosted]   = useState(false);
  const [busy, setBusy]       = useState(false);
  const [awarded, setAwarded] = useState(null);
  const { expired, label: timeLabel } = useCountdown(claim.proof_deadline);
  const fileRef = useRef(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const shareText = useMemo(() => {
    // Campaign name only: the exact hint would give the spot away.
    const name = claim.drop?.campaign_name || "a drop";
    return `Just found a WAGO drop — ${name} 🌿\n\nProof I was there 📸\n\n#WAGO #TouchGrass #ProofOfGrass`;
  }, [claim.drop]);

  const rewardText = useMemo(() => {
    const amt = Number(claim.reward_amount || 0);
    const ticker = (claim.reward_type || "").toLowerCase() === "sol" ? "SOL" : "$TOUCHGRASS";
    return amt > 0 ? `+${amt.toLocaleString()} ${ticker}` : ticker;
  }, [claim.reward_amount, claim.reward_type]);

  function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function submitPhoto() {
    if (!file) return;
    setStage("uploading");
    setError(null);
    try {
      const pos  = await getPosition();
      const blob = await toJpegBlob(file);
      const path = `wago-drops/${claim.claim_id}.jpg`;
      const up = await supabase.storage.from("proof-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (up.error) throw new Error("Photo upload failed. Please try again.");
      const res = await fetch("/api/wago-drops/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim.claim_id, photoPath: path, lat: pos.lat, lng: pos.lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Proof rejected");
      setTickets(data.tickets ?? tickets);
      setPogUser(data.pog_username || null);
      setStage("approved");
    } catch (e) {
      setError(e.message);
      setStage("intro");
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wago-drops/proof-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim.claim_id, xPostUrl: xUrl.trim(), pogUsername: userInput.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.need_username) setNeedUser(true);
        throw new Error(data.error || "Couldn't confirm your post");
      }
      setAwarded(data);
      setStage("done");
      onDone?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const urlOk = isValidXPostUrl(xUrl);

  // ── Done ───────────────────────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <div style={{ ...card, textAlign: "center" }}>
        <Wago pose="salute" size={110} float />
        <div style={{ fontSize: 20, fontWeight: 800, color: V2.forestGreen, marginTop: 6 }}>
          +{awarded.tickets} Grass Ticket{awarded.tickets === 1 ? "" : "s"}!
        </div>
        <div style={{ fontSize: 13, color: V2.forestLight, marginTop: 4 }}>
          Added to this month&rsquo;s Grass Draw for @{awarded.username}. Tickets don&rsquo;t roll over.
        </div>
      </div>
    );
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (expired) {
    return (
      <div style={card}>
        <div style={label}>Proof bonus</div>
        <div style={{ fontSize: 14, color: V2.forestLight, marginTop: 6 }}>
          The 24-hour window for this claim has closed.
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={label}>Proof bonus · +{tickets} Grass Tickets</div>
        <div style={{ ...V2Styles.pill, fontSize: 11 }}>{timeLabel}</div>
      </div>

      {stage !== "approved" && (
        <>
          <div style={{ fontSize: 14, color: V2.forestLight, margin: "8px 0 12px", lineHeight: 1.5 }}>
            Snap a photo of the spot (within 100m of the drop), share it on X, then paste your post link to earn
            tickets in this month&rsquo;s Grass Draw.
          </div>

          {preview && (
            <img src={preview} alt="Your proof" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: V2.radiusMd, marginBottom: 12 }} />
          )}

          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={pick} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => fileRef.current?.click()} disabled={stage === "uploading"}
              style={{ ...V2Styles.btnSecondary, padding: "12px 20px", cursor: "pointer" }}>
              {file ? "Retake photo" : "📷 Take photo"}
            </button>
            {file && (
              <button onClick={submitPhoto} disabled={stage === "uploading"}
                style={{ ...V2Styles.btnPrimary, padding: "12px 24px", opacity: stage === "uploading" ? 0.6 : 1 }}>
                {stage === "uploading" ? "Checking location…" : "Submit proof"}
              </button>
            )}
          </div>
        </>
      )}

      {stage === "approved" && (
        <>
          <div style={{ fontSize: 14, color: V2.forestLight, margin: "8px 0 4px", lineHeight: 1.5 }}>
            ✅ Proof approved. Post your card to X, then paste the link to your post below.
          </div>
          <WagoShareCard
            photoUrl={preview}
            campaignName={claim.drop?.campaign_name}
            rewardText={rewardText}
            rarity={claim.rarity || "common"}
            tickets={tickets}
            shareText={shareText}
            onShared={() => setPosted(true)}
          />

          <div style={{ ...label, marginTop: 6 }}>Step 2 · paste your X post link</div>
          <input
            value={xUrl}
            onChange={e => { setXUrl(e.target.value); setError(null); }}
            placeholder="https://x.com/you/status/123…"
            inputMode="url"
            style={{ ...V2Styles.input, marginTop: 8 }}
          />
          {xUrl && !urlOk && (
            <div style={{ fontSize: 12, color: V2.danger, marginTop: 6 }}>That doesn&rsquo;t look like an X post link.</div>
          )}
          {(needUser || !pogUser) && (
            <>
              <div style={{ fontSize: 12, color: V2.forestLight, margin: "10px 0 6px" }}>
                We couldn&rsquo;t match your wallet to a Proof of Grass account. Enter your username so tickets land in the right place.
              </div>
              <input value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Proof of Grass username"
                style={V2Styles.input} />
            </>
          )}
          <button onClick={confirm} disabled={!urlOk || busy || (!pogUser && !userInput.trim())}
            style={{ ...V2Styles.btnPrimary, width: "100%", justifyContent: "center", marginTop: 12,
              opacity: (!urlOk || busy || (!pogUser && !userInput.trim())) ? 0.5 : 1 }}>
            {busy ? "Confirming…" : `Claim ${tickets} Grass Tickets`}
          </button>
          {!posted && (
            <div style={{ fontSize: 11, color: V2.textMuted, marginTop: 8, textAlign: "center" }}>
              Tap &ldquo;Share to X&rdquo; on the card first.
            </div>
          )}
        </>
      )}

      {error && <div style={{ fontSize: 13, color: V2.danger, marginTop: 10 }}>{error}</div>}
    </div>
  );
}
