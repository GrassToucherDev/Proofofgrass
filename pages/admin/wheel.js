// /admin/wheel — manage WAGO Wheels, prizes, spins, fulfillment and lock batches. Talks to /api/wheel/admin/* with x-admin-secret.
import { useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";

const box = { background: "#fff", border: `1px solid ${V2.borderSoft}`, borderRadius: 14, padding: 16, marginBottom: 14 };
const inp = { width: "100%", boxSizing: "border-box", border: `1px solid ${V2.borderSoft}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: V2.forestGreen, background: "#fff" };
const btn = { border: `1px solid ${V2.borderSoft}`, background: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", color: V2.forestGreen };
const TYPES = ["cosmetic_pack", "shield", "sunset_pass", "grass_tickets", "spl_token", "touchgrass", "sol", "nft", "badge", "collectible", "partner_asset", "manual"];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];
const fmt = (n) => Number(n || 0).toLocaleString();

function F({ label, children }) {
  return <label style={{ display: "block", marginBottom: 8 }}><span style={{ fontSize: 11, color: V2.midGray, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>{children}</label>;
}

export default function AdminWheel() {
  const [secret, setSecret] = useState("");
  const [wheels, setWheels] = useState(null);
  const [spins, setSpins] = useState([]);
  const [msg, setMsg] = useState("");
  const [nw, setNw] = useState({ slug: "wago-wheel", name: "WAGO Wheel", price_mode: "usd", price_usd: 5, lock_pct: 75, lock_days: "", meter_spins: 10, meter_min_rarity: "rare" });
  const [np, setNp] = useState({ name: "", reward_type: "grass_tickets", rarity: "common", weight: 10, inventory_total: "", segment: 0, cfg: "" });
  const [lock, setLock] = useState({ tx: "", note: "" });
  const H = { "Content-Type": "application/json", "x-admin-secret": secret };

  const call = useCallback(async (url, method, body) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json", "x-admin-secret": secret }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(d.error || `Failed (${r.status})`); return null; }
    setMsg(""); return d;
  }, [secret]);

  const load = useCallback(async () => {
    const d = await call("/api/wheel/admin/wheels", "GET"); if (d) setWheels(d.wheels);
    const s = await call("/api/wheel/admin/spins?limit=100", "GET"); if (s) setSpins(s.spins);
  }, [call]);

  const patchWheel = async (id, body) => { if (await call("/api/wheel/admin/wheels", "PATCH", { id, ...body })) load(); };
  const patchPrize = async (id, body) => { if (await call("/api/wheel/admin/prizes", "PATCH", { id, ...body })) load(); };
  const cfgFor = (type, raw) => {
    if (type === "cosmetic_pack") return { item_id: raw };
    if (type === "shield" || type === "sunset_pass") return { quantity: raw || 1 };
    if (type === "grass_tickets") return { amount: raw || 1 };
    return raw ? { note: raw } : {};
  };
  const addPrize = async (wheelId) => {
    const d = await call("/api/wheel/admin/prizes", "POST", { wheel_id: wheelId, name: np.name, reward_type: np.reward_type, rarity: np.rarity, weight: np.weight,
      inventory_total: np.inventory_total, segment: np.segment, reward_config: cfgFor(np.reward_type, np.cfg) });
    if (d) { setNp({ ...np, name: "", cfg: "" }); load(); }
  };
  const spinAction = async (body) => { if (await call("/api/wheel/admin/spins", "POST", body)) load(); };

  const queued = spins.filter(s => s.lock_status === "queued");
  const queuedAmt = queued.reduce((n, s) => n + Number(s.amount_locked), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f9ee", padding: "20px 14px 80px", fontFamily: V2.fontSans }}>
      <Head><title>Wheel admin</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/marketplace" style={{ fontSize: 13, color: V2.grassDark, textDecoration: "none" }}>← Marketplace</Link>
        <h1 style={{ fontSize: 26, margin: "8px 0 14px", color: V2.forestGreen }}>WAGO Wheel admin</h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="password" placeholder="Admin secret" value={secret} onChange={e => setSecret(e.target.value)} style={inp} />
          <button style={{ ...btn, background: V2.grassGreen, color: "#fff" }} onClick={load}>Load</button>
        </div>
        {msg && <div style={{ color: V2.danger, fontSize: 13, marginBottom: 10 }}>{msg}</div>}

        {wheels && wheels.map(w => (
          <div key={w.id} style={box}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 17 }}>{w.name} <span style={{ fontWeight: 400, fontSize: 12, color: V2.midGray }}>/{w.slug}</span></b>
              <span style={{ fontSize: 12 }}>{w.status} · {w.visibility === "admin" ? "admin-only" : "public"}{w.featured ? " · featured" : ""}{w.playable ? "" : " · NOT playable"}</span>
            </div>
            <div style={{ fontSize: 12.5, color: V2.textBody, margin: "6px 0" }}>
              {w.price_mode === "usd" ? `$${w.price_usd}` : `${fmt(w.price_tokens)} $TOUCHGRASS`} · {w.lock_pct}% lock / {w.eco_pct}% ecosystem · meter {w.meter_enabled ? `${w.meter_spins} spins → ${w.meter_min_rarity}+` : "off"}<br />
              {fmt(w.stats?.total_spins)} spins · {fmt(w.stats?.prizes_claimed)} prizes claimed · locked {fmt(w.stats?.locked_amount)} · queued to lock {fmt(w.stats?.queued_amount)}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {w.status !== "active" && <button style={btn} onClick={() => patchWheel(w.id, { status: "active" })}>Activate</button>}
              {w.status === "active" && <button style={btn} onClick={() => patchWheel(w.id, { status: "ended" })}>End</button>}
              <button style={btn} onClick={() => patchWheel(w.id, { visibility: w.visibility === "admin" ? "public" : "admin" })}>Make {w.visibility === "admin" ? "public" : "admin-only"}</button>
              <button style={btn} onClick={() => patchWheel(w.id, { featured: !w.featured })}>{w.featured ? "Unfeature" : "Feature in Marketplace"}</button>
            </div>
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left", color: V2.midGray }}><th>Prize</th><th>Type</th><th>Rarity</th><th>Weight</th><th>Stock</th><th>Seg</th><th /></tr></thead>
              <tbody>{w.prizes.map(p => (
                <tr key={p.id} style={{ borderTop: `1px solid ${V2.borderSoft}`, opacity: p.active ? 1 : 0.5 }}>
                  <td>{p.name}</td><td>{p.reward_type}</td><td>{p.rarity}</td><td>{p.weight}</td>
                  <td>{p.inventory_total == null ? "∞" : `${p.inventory_remaining}/${p.inventory_total}`}</td><td>{p.segment}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button style={btn} onClick={() => patchPrize(p.id, { active: !p.active })}>{p.active ? "Deactivate" : "Activate"}</button>{" "}
                    <button style={btn} onClick={() => { const v = prompt("Wheel segment number (0, 1, 2…). Give each prize its own.", p.segment); if (v !== null && v !== "") patchPrize(p.id, { segment: v }); }}>Seg</button>{" "}
                    <button style={btn} onClick={() => { const v = prompt("Image URL (blank = use the default art for this type)", p.image_url || ""); if (v !== null) patchPrize(p.id, { image_url: v }); }}>Image</button>{" "}
                    {p.inventory_total != null && <button style={btn} onClick={() => { const n = prompt("Add how many to stock?"); if (n) patchPrize(p.id, { add_stock: n }); }}>+stock</button>}
                  </td>
                </tr>))}</tbody>
            </table>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${V2.borderSoft}` }}>
              <b style={{ fontSize: 13 }}>Add prize</b>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginTop: 6 }}>
                <F label="Name"><input style={inp} value={np.name} onChange={e => setNp({ ...np, name: e.target.value })} /></F>
                <F label="Type"><select style={inp} value={np.reward_type} onChange={e => setNp({ ...np, reward_type: e.target.value })}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></F>
                <F label="Rarity"><select style={inp} value={np.rarity} onChange={e => setNp({ ...np, rarity: e.target.value })}>{RARITIES.map(t => <option key={t}>{t}</option>)}</select></F>
                <F label="Weight"><input style={inp} type="number" value={np.weight} onChange={e => setNp({ ...np, weight: e.target.value })} /></F>
                <F label="Stock (blank = ∞)"><input style={inp} type="number" value={np.inventory_total} onChange={e => setNp({ ...np, inventory_total: e.target.value })} /></F>
                <F label="Segment"><input style={inp} type="number" value={np.segment} onChange={e => setNp({ ...np, segment: e.target.value })} /></F>
                <F label={np.reward_type === "cosmetic_pack" ? "Pack id (e.g. retro_covers_pack)" : np.reward_type === "grass_tickets" ? "Tickets" : ["shield", "sunset_pass"].includes(np.reward_type) ? "Quantity" : "Note (what to send)"}>
                  <input style={inp} value={np.cfg} onChange={e => setNp({ ...np, cfg: e.target.value })} /></F>
              </div>
              <button style={{ ...btn, background: V2.grassGreen, color: "#fff" }} onClick={() => addPrize(w.id)}>Add prize</button>
            </div>
          </div>
        ))}

        {wheels && (
          <div style={box}>
            <b>New wheel</b>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginTop: 6 }}>
              {[["slug", "Slug"], ["name", "Name"], ["price_usd", "Price USD"], ["lock_pct", "Lock %"], ["lock_days", "Lock days"], ["meter_spins", "Meter spins"]].map(([k, l]) =>
                <F key={k} label={l}><input style={inp} value={nw[k]} onChange={e => setNw({ ...nw, [k]: e.target.value })} /></F>)}
            </div>
            <button style={btn} onClick={async () => { if (await call("/api/wheel/admin/wheels", "POST", nw)) load(); }}>Create (draft)</button>
          </div>
        )}

        {wheels && (
          <div style={box}>
            <b>Lock batches</b>
            <p style={{ fontSize: 12.5, color: V2.textBody, margin: "6px 0" }}>{queued.length} spins queued · {fmt(queuedAmt)} $TOUCHGRASS to lock. After you lock tokens, enter the lock transaction and mark them. Spins only show as locked after this.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input style={{ ...inp, flex: 2, minWidth: 180 }} placeholder="Lock transaction signature" value={lock.tx} onChange={e => setLock({ ...lock, tx: e.target.value })} />
              <input style={{ ...inp, flex: 1, minWidth: 120 }} placeholder="Note" value={lock.note} onChange={e => setLock({ ...lock, note: e.target.value })} />
              <button style={btn} onClick={async () => { if (confirm(`Mark ${queued.length} queued spins as locked?`)) { if (await call("/api/wheel/admin/spins", "POST", { action: "lock-batch", tx: lock.tx, note: lock.note })) { setLock({ tx: "", note: "" }); load(); } } }}>Mark all queued as locked</button>
            </div>
          </div>
        )}

        {wheels && (
          <div style={box}>
            <b>Recent spins</b>
            {spins.map(s => (
              <div key={s.id} style={{ borderTop: `1px solid ${V2.borderSoft}`, padding: "8px 0", fontSize: 12.5 }}>
                @{s.username} · <b>{s.prize_snapshot?.name}</b> ({s.rarity}) · {fmt(s.spin_price)} · {new Date(s.created_at).toLocaleString()}<br />
                <span style={{ color: V2.midGray }}>{s.fulfillment_status} · lock {s.lock_status} · wallet {String(s.wallet).slice(0, 6)}… · tx {String(s.payment_tx).slice(0, 8)}…</span>
                {s.fulfillment_note && <div style={{ color: V2.danger }}>{s.fulfillment_note}</div>}
                {["pending", "failed"].includes(s.fulfillment_status) && <button style={{ ...btn, marginLeft: 6 }} onClick={() => spinAction({ action: "retry", spinId: s.id })}>Retry</button>}
                {["manual_required", "failed"].includes(s.fulfillment_status) && <button style={{ ...btn, marginLeft: 6 }} onClick={() => { const tx = prompt("Transaction signature or note for the prize you sent"); if (tx) spinAction({ action: "complete", spinId: s.id, tx, note: tx }); }}>Mark sent</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
