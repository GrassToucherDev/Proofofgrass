// Bottom sheets for the WAGO Wheel: confirm spin, prize pool, result reveal, My Wins.
import { useEffect, useState } from "react";
import { V2 } from "../../utils/v2Theme";
import Wago from "../wago-drops/Wago";
import { RARITY, rarityOf, typeMeta, prizeArt, fmt, fulfillmentText, statusLabel } from "./wheelBits";

const BTN = { border: "none", borderRadius: 999, fontFamily: V2.fontSans, fontWeight: 700, fontSize: 15, cursor: "pointer", padding: "14px 18px", width: "100%" };
const PRIMARY = { ...BTN, background: V2.gradientGrassBtn, color: "#fff", boxShadow: V2.shadowGlow };
const GHOST = { ...BTN, background: "#fff", color: V2.forestGreen, border: `1.5px solid ${V2.borderSoft}` };

export function Sheet({ title, onClose, children, tall }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(13,42,5,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
        style={{ background: "#fff", width: "100%", maxWidth: 520, borderRadius: "22px 22px 0 0", padding: "18px 18px calc(18px + env(safe-area-inset-bottom))",
          maxHeight: tall ? "92dvh" : "88dvh", overflowY: "auto", boxSizing: "border-box", fontFamily: V2.fontSans, color: V2.forestGreen }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "rgba(13,42,5,0.07)", width: 34, height: 34, borderRadius: "50%", fontSize: 18, cursor: "pointer", color: V2.forestGreen }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function RarityChip({ r }) {
  const m = rarityOf(r);
  return <span style={{ fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, borderRadius: 999, padding: "3px 9px" }}>{m.label}</span>;
}

export function SpinSheet({ quote, wheel, busy, error, onConfirm, onClose }) {
  const t = quote.tokens;
  return (
    <Sheet title="Spin the WAGO Wheel" onClose={onClose}>
      <div style={{ background: "#f4f9ee", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: V2.midGray, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Spin cost</div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(t)} $TOUCHGRASS</div>
        {quote.usd != null && <div style={{ fontSize: 13, color: V2.midGray }}>≈ ${Number(quote.usd).toFixed(2)} USD at today's price</div>}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 12 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: V2.midGray, fontWeight: 700 }}>{wheel.lock_pct}% to lock</div>
            <div style={{ fontWeight: 800 }}>{fmt(quote.lock_amount)}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: V2.midGray, fontWeight: 700 }}>{wheel.eco_pct}% ecosystem</div>
            <div style={{ fontWeight: 800 }}>{fmt(quote.eco_amount)}</div>
          </div>
        </div>
      </div>
      <ul style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.55, color: V2.textBody }}>
        <li>One spin gives one prize, picked by our server when your payment is confirmed.</li>
        <li>Your result is saved. Refreshing or losing connection won't change it.</li>
        <li>Spin tokens aren't refundable.</li>
      </ul>
      {error && <div style={{ color: V2.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <button style={{ ...PRIMARY, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={onConfirm}>{busy ? "Getting your spin ready…" : "Confirm Spin"}</button>
      <button style={{ ...GHOST, marginTop: 8 }} onClick={onClose}>Cancel</button>
    </Sheet>
  );
}

export function PrizesSheet({ prizes, onClose }) {
  const order = ["legendary", "epic", "rare", "uncommon", "common"];
  const sorted = [...prizes].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
  return (
    <Sheet title="Prize pool" onClose={onClose} tall>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: V2.midGray, lineHeight: 1.5 }}>What's on the wheel right now. Prizes that run out disappear from this list.</p>
      <div style={{ display: "grid", gap: 10 }}>
        {sorted.map(p => (
          <div key={p.id} style={{ display: "flex", gap: 12, alignItems: "center", border: `1px solid ${V2.borderSoft}`, borderRadius: 14, padding: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: rarityOf(p.rarity).bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, overflow: "hidden" }}>
              {prizeArt(p) ? <img src={prizeArt(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : typeMeta(p.reward_type).emoji}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, wordBreak: "break-word" }}>{p.name}</div>
              <div style={{ fontSize: 12, color: V2.midGray, margin: "2px 0 4px" }}>{typeMeta(p.reward_type).label}{p.remaining != null ? ` · ${p.remaining} left` : ""}</div>
              <RarityChip r={p.rarity} />
            </div>
          </div>
        ))}
        {!prizes.length && <div style={{ textAlign: "center", padding: 24, color: V2.midGray }}><Wago pose="shrug" size={100} /><div style={{ marginTop: 8 }}>The pool is being restocked.</div></div>}
      </div>
    </Sheet>
  );
}

export function ResultReveal({ spin, onSpinAgain, onWins, onClose }) {
  const r = rarityOf(spin.rarity);
  const big = ["epic", "legendary"].includes(spin.rarity);
  const head = spin.rarity === "legendary" ? "LEGENDARY FIND ✨" : spin.rarity === "epic" ? "EPIC PULL ✨" : "YOU WON 🌱";
  const share = () => {
    const text = `I just won ${spin.prize.name} (${r.label}) on the WAGO Wheel! 🌱 #TouchGrass`;
    const url = typeof window !== "undefined" ? `${window.location.origin}/marketplace` : "";
    if (navigator.share) navigator.share({ title: "WAGO Wheel", text, url }).catch(() => {});
    else window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
  };
  return (
    <Sheet title="" onClose={onClose}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><Wago pose="cheer" size={big ? 150 : 120} float /></div>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", color: r.color, margin: "8px 0 6px" }}>{head}</div>
        {prizeArt(spin.prize)
          ? <img src={prizeArt(spin.prize)} alt="" style={{ width: 96, height: 96, objectFit: "contain", margin: "4px auto" }} />
          : <div style={{ fontSize: 48 }}>{typeMeta(spin.prize.reward_type).emoji}</div>}
        <div style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 6px", wordBreak: "break-word" }}>{spin.prize.name}</div>
        <RarityChip r={spin.rarity} />
        {spin.meter_guaranteed && <div style={{ fontSize: 12.5, color: V2.grassDark, marginTop: 8, fontWeight: 700 }}>WAGO Meter bonus: guaranteed Rare or better!</div>}
        <p style={{ fontSize: 13.5, color: V2.textBody, margin: "12px 0 16px", lineHeight: 1.5 }}>{fulfillmentText(spin)}</p>
        <button style={PRIMARY} onClick={onSpinAgain}>Spin Again</button>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8, marginTop: 8 }}>
          <button style={GHOST} onClick={onWins}>View My Wins</button>
          <button style={GHOST} onClick={share}>Share</button>
        </div>
      </div>
    </Sheet>
  );
}

export function WinsSheet({ onClose, signedIn }) {
  const [tab, setTab] = useState("all");
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!signedIn) { setRows([]); return; }
    fetch("/api/wheel/history").then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Couldn't load your wins."); setRows(d.spins); })
      .catch(e => { setErr(e.message); setRows([]); });
  }, [signedIn]);
  const shown = (rows || []).filter(s => tab === "all" || typeMeta(s.prize.reward_type).group === tab);
  const tabs = [["all", "All"], ["collectibles", "Collectibles"], ["tokens", "Tokens"], ["utilities", "Utilities"]];
  return (
    <Sheet title="My Wins" onClose={onClose} tall>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12 }}>
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ border: `1.5px solid ${tab === k ? V2.grassGreen : V2.borderSoft}`, background: tab === k ? V2.grassGreen : "#fff", color: tab === k ? "#fff" : V2.forestGreen, borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{l}</button>)}
      </div>
      {rows === null && <div style={{ color: V2.midGray, fontSize: 13 }}>Loading…</div>}
      {err && <div style={{ color: V2.danger, fontSize: 13 }}>{err}</div>}
      {!signedIn && <div style={{ color: V2.midGray, fontSize: 13 }}>Sign in with Google to see your wins.</div>}
      {rows && signedIn && !shown.length && !err && <div style={{ textAlign: "center", padding: 20, color: V2.midGray }}><Wago pose="shrug" size={90} /><div style={{ marginTop: 6 }}>No wins here yet.</div></div>}
      <div style={{ display: "grid", gap: 8 }}>
        {shown.map(s => (
          <div key={s.id} style={{ border: `1px solid ${V2.borderSoft}`, borderRadius: 12, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 26, width: 40, textAlign: "center" }}>{typeMeta(s.prize.reward_type).emoji}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, wordBreak: "break-word" }}>{s.prize.name} <RarityChip r={s.rarity} /></div>
              <div style={{ fontSize: 12, color: V2.midGray }}>{new Date(s.created_at).toLocaleDateString()} · {statusLabel(s.fulfillment_status)}
                {s.fulfillment_tx && /^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(s.fulfillment_tx) && <> · <a href={`https://solscan.io/tx/${s.fulfillment_tx}`} target="_blank" rel="noopener noreferrer" style={{ color: V2.grassDark }}>View transaction</a></>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
