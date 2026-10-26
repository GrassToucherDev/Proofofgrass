// The WAGO Wheel hero on the Marketplace. Renders nothing when no wheel is live for this viewer.
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { V2 } from "../../utils/v2Theme";
import Wago from "../wago-drops/Wago";
import WheelBoard from "./WheelBoard";
import { SpinSheet, PrizesSheet, ResultReveal, WinsSheet } from "./WheelSheets";
import { compact, fmt, rarityOf } from "./wheelBits";

const WalletPurchaseModal = dynamic(() => import("../WalletPurchaseModal"), { ssr: false });

export default function WheelHero({ username, requireSecured, handoff, onSettled }) {
  const [st, setSt] = useState(null);                 // /api/wheel/state
  const [sheet, setSheet] = useState(null);           // 'confirm' | 'prizes' | 'wins' | 'reveal'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pay, setPay] = useState(null);               // { checkoutId, tokens, usd }
  const [spin, setSpin] = useState(null);             // settled spin (server result)
  const [spinKey, setSpinKey] = useState(null);
  const [help, setHelp] = useState(false);
  const handled = useRef(false);

  const load = useCallback(() =>
    fetch("/api/wheel/state", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(d => setSt(d || { wheel: null })).catch(() => setSt({ wheel: null })), []);
  useEffect(() => { load(); }, [load, username]);

  // Opened from another browser (Phantom's in-app browser): jump straight to paying for that spin.
  useEffect(() => {
    if (handoff && !handled.current) { handled.current = true; setPay(handoff); }
  }, [handoff]);

  const showResult = (s) => { setSpin(s); setSpinKey(Date.now()); };

  async function startSpin() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/wheel/intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.checkoutId) throw new Error(d.error || "Couldn't start the spin.");
      setSheet(null); setPay({ checkoutId: d.checkoutId, tokens: d.tokens, usd: d.usdPrice });
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  const openConfirm = () => {
    setErr("");
    const go = () => setSheet("confirm");
    if (requireSecured) requireSecured({ id: "wago_wheel", name: "WAGO Wheel spin", wheel: true }, go); else go();
  };

  async function paidDone(data) {
    setPay(null);
    let s = data?.spin;
    if (!s && data?.fromHandoff && pay) {
      const r = await fetch(`/api/wheel/result?checkoutId=${encodeURIComponent(pay.checkoutId)}`).then(x => x.json()).catch(() => null);
      s = r?.spin;
    }
    onSettled?.();
    if (s) showResult(s); else load();
  }

  if (!st || !st.wheel) return null;
  const { wheel, prizes, quote, stats, meter, playable } = st;
  const canSpin = playable && quote?.tokens;
  const minR = rarityOf(wheel.meter_min_rarity).label;
  const pill = { background: "rgba(255,255,255,0.92)", borderRadius: 16, border: `1px solid ${V2.borderSoft}`, boxShadow: "0 2px 10px rgba(26,74,10,0.08)" };

  return (
    <section aria-label={wheel.name} style={{ position: "relative", overflow: "hidden", padding: "18px clamp(14px,4vw,48px) 44px",
      background: "linear-gradient(170deg,#bfe3f7 0%,#d9f0e3 55%,#eaf6e2 100%)" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(${wheel.hero_image || "/marketplace-banner.png"})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.35, pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 96, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(197,227,247,0) 0%, #c5e3f7 100%)" }} />
      <div style={{ position: "relative", maxWidth: 980, margin: "0 auto", display: "grid", gap: 18, gridTemplateColumns: "minmax(0,1fr)", alignItems: "center" }} className="wheel-grid">
        <div>
          <span style={{ display: "inline-block", background: V2.grassGreen, color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", borderRadius: 999, padding: "4px 12px" }}>⭐ NEW</span>
          <h2 style={{ fontFamily: V2.fontSans, fontWeight: 900, fontSize: "clamp(34px,8vw,56px)", lineHeight: 1, color: V2.forestGreen, margin: "10px 0 8px" }}>{wheel.name}</h2>
          <p style={{ margin: "0 0 4px", fontSize: 15, lineHeight: 1.5, color: V2.forestGreen, fontWeight: 600, maxWidth: 360 }}>
            {wheel.description || "Spin with $TOUCHGRASS to win collectibles, NFTs, tokens, and more."}
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: V2.textBody }}>Every spin strengthens the ecosystem.</p>
          <div style={{ ...pill, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, maxWidth: 420 }}>
            <span style={{ fontSize: 22 }}>🔒</span>
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{wheel.lock_pct}% of $TOUCHGRASS used to spin goes to lock</span>
            <button onClick={() => setHelp(h => !h)} aria-label="How does the lock work?" aria-expanded={help} style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${V2.borderSoft}`, background: "#fff", cursor: "pointer", color: V2.forestGreen, fontWeight: 700 }}>?</button>
          </div>
          {help && <div style={{ ...pill, padding: "10px 14px", marginTop: 8, maxWidth: 420, fontSize: 12.5, lineHeight: 1.5, color: V2.textBody }}>
            {wheel.lock_pct}% of every spin is set aside to be locked and {wheel.eco_pct}% supports the ecosystem. The "locked" total below counts tokens after the team has locked them on-chain, so it updates in batches.</div>}
        </div>

        <div style={{ position: "relative" }}>
          <WheelBoard prizes={prizes} target={spin?.segment} spinKey={spinKey} size={270} onDone={() => setSheet("reveal")} />
          <div style={{ position: "absolute", left: -14, bottom: -44, pointerEvents: "none" }}>
            <Wago pose={spinKey ? "cheer" : "wave"} size={92} float />
          </div>
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: 560, margin: "22px auto 0" }}>
        <div style={{ ...pill, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", padding: "10px 6px", textAlign: "center" }}>
          {[[compact(stats.locked_amount), "$TOUCHGRASS locked", "🔥"], [fmt(stats.total_spins), "Total spins", "👥"], [fmt(stats.prizes_claimed), "Prizes claimed", "🎁"]].map(([v, l, e], i) => (
            <div key={l} style={{ padding: "2px 4px", borderLeft: i ? `1px solid ${V2.borderSoft}` : "none" }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{e} {v}</div>
              <div style={{ fontSize: 10.5, color: V2.midGray, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>

        <button onClick={openConfirm} disabled={!canSpin} style={{ marginTop: 14, width: "100%", border: "none", borderRadius: 999, padding: "16px 18px", fontFamily: V2.fontSans, fontWeight: 800, fontSize: 17,
          color: "#fff", background: canSpin ? V2.gradientGrassBtn : "rgba(13,42,5,0.3)", boxShadow: canSpin ? V2.shadowGlow : "none", cursor: canSpin ? "pointer" : "default" }}>
          {!playable ? "Restocking prizes…" : quote?.tokens ? `Spin for ${fmt(quote.tokens)} $TOUCHGRASS` : "Price unavailable"}
        </button>
        {canSpin && <div style={{ textAlign: "center", fontSize: 12, color: V2.textBody, marginTop: 6 }}>
          {quote.usd != null && <>≈ ${Number(quote.usd).toFixed(2)} USD · </>}{wheel.lock_pct}% ({fmt(quote.lock_amount)}) to lock · {wheel.eco_pct}% ({fmt(quote.eco_amount)}) to ecosystem</div>}

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", marginTop: 14 }}>
          <div style={{ ...pill, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🌱</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>WAGO METER</div>
              {meter ? <>
                <div style={{ display: "flex", gap: 3, margin: "4px 0" }} aria-label={`${meter.count} of ${meter.required} spins`}>
                  {Array.from({ length: meter.required }, (_, i) => <span key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i < meter.count ? V2.grassGreen : "rgba(13,42,5,0.12)" }} />)}
                </div>
                <div style={{ fontSize: 11, color: V2.midGray }}>{meter.count} / {meter.required} · every {meter.required}th spin is a guaranteed {minR}+</div>
              </> : <div style={{ fontSize: 11, color: V2.midGray }}>{wheel.meter_enabled ? `Sign in to track your meter. Every ${wheel.meter_spins}th spin is a guaranteed ${minR}+.` : "Meter is off for this wheel."}</div>}
            </div>
          </div>
          <button onClick={() => setSheet("prizes")} style={{ ...pill, cursor: "pointer", fontFamily: V2.fontSans, fontWeight: 700, fontSize: 14, color: V2.forestGreen, padding: "10px 8px" }}>🎁 View Prizes ›</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button onClick={() => setSheet("wins")} style={{ border: "none", background: "none", color: V2.grassDark, fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>My Wins</button>
        </div>
      </div>

      <style>{`@media (min-width: 760px){ .wheel-grid{ grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important; } }`}</style>

      {sheet === "confirm" && <SpinSheet quote={quote} wheel={wheel} busy={busy} error={err} onConfirm={startSpin} onClose={() => setSheet(null)} />}
      {sheet === "prizes" && <PrizesSheet prizes={prizes} onClose={() => setSheet(null)} />}
      {sheet === "wins" && <WinsSheet signedIn={!!st.viewer?.signedIn} onClose={() => setSheet(null)} />}
      {sheet === "reveal" && spin && <ResultReveal spin={spin} onClose={() => { setSheet(null); load(); }} onWins={() => setSheet("wins")}
        onSpinAgain={() => { setSheet(null); setSpin(null); setSpinKey(null); load().then(openConfirm); }} />}

      {pay && (
        <WalletPurchaseModal
          item={{ id: "wago_wheel", name: "WAGO Wheel spin", intentId: pay.checkoutId.replace(/^w_/, "") }}
          tokens={pay.tokens} price={pay.usd} username={username}
          onClose={() => { setPay(null); try { if (new URLSearchParams(window.location.search).get("checkout")) window.history.replaceState(null, "", "/marketplace"); } catch {} }}
          memoId={pay.checkoutId.replace(/^w_/, "")}
          verifyUrl="/api/wheel/settle"
          verifyBody={({ signature, walletAddress }) => ({ checkoutId: pay.checkoutId, signature, walletAddress })}
          handoffUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/marketplace?checkout=${pay.checkoutId}`}
          statusUrl={`/api/checkout/info?id=${pay.checkoutId}`}
          notice="Your prize is picked by our server once the payment is confirmed. If anything interrupts, you can retry verification and you will not be charged twice."
          payLabel={`Pay ${fmt(pay.tokens)} $TOUCHGRASS →`}
          onSuccess={paidDone}
        />
      )}
    </section>
  );
}
