// /admin/team-tokens — team wallets, what each should hold, and the live on-chain balance. Admin secret only; talks to /api/admin/team-wallets.
import { useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";

const box = { color: "#1f2d17", background: "#fff", border: `1px solid ${V2.borderSoft}`, borderRadius: 14, padding: 16, marginBottom: 14 };
const inp = { boxSizing: "border-box", width: "100%", border: `1px solid ${V2.borderSoft}`, borderRadius: 8, padding: "9px 10px", fontSize: 14, background: "#fff", color: V2.forestGreen };
const btn = { border: `1px solid ${V2.borderSoft}`, background: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer", color: V2.forestGreen };
const primary = { ...btn, background: V2.grassGreen, color: "#fff", border: "none", fontWeight: 700 };
const short = (a) => (a && a.length > 12 ? `${a.slice(0, 5)}…${a.slice(-5)}` : a);
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : 4 });
const usd = (n) => (n == null ? "—" : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: n >= 100 ? 0 : 2 })}`);
const blank = { id: null, label: "", address: "", kind: "holder", purpose: "", notes: "", expectedText: "" };
const KIND = { team: "Team", holder: "Large holder", other: "Other" };
const TG = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";

// "SYMBOL mint [amount]" per line; the mint SOL means native SOL.
const parseExpected = (t) => String(t || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
  const [symbol, mint, amount] = l.split(/[\s,]+/);
  return { symbol, mint, amount: amount === undefined ? "" : amount.replace(/_/g, "") };
});
const toText = (arr) => (arr || []).map((e) => [e.symbol || "", e.mint, e.amount ?? ""].join(" ").trim()).join("\n");

function status(h) {
  if (h.expected == null) return null;
  const diff = h.amount - h.expected, tol = Math.max(h.expected * 0.005, 0.000001);
  if (Math.abs(diff) <= tol) return { t: "Matches", c: V2.success };
  return diff < 0 ? { t: `Short ${fmt(-diff)}`, c: V2.danger } : { t: `Over by ${fmt(diff)}`, c: V2.warning };
}

export default function AdminTeamTokens() {
  const [secret, setSecret] = useState("");
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("all");

  const call = useCallback(async (method, body) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/team-wallets", { method, headers: { "Content-Type": "application/json", "x-admin-secret": secret }, body: body ? JSON.stringify(body) : undefined });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j.error || `Failed (${r.status})`); return null; }
      setMsg(""); return j;
    } finally { setBusy(false); }
  }, [secret]);
  const load = useCallback(async () => { const j = await call("GET"); if (j) setD(j); }, [call]);
  const save = async () => {
    const body = { action: form.id ? "update" : "add", id: form.id, label: form.label, address: form.address, kind: form.kind, purpose: form.purpose, notes: form.notes, expected: parseExpected(form.expectedText) };
    if (await call("POST", body)) { setForm(null); load(); }
  };
  const remove = async (w) => { if (!confirm(`Stop tracking "${w.label}"? This only removes it from this list, not from the blockchain.`)) return; if (await call("POST", { action: "delete", id: w.id })) load(); };
  const copy = (t) => { try { navigator.clipboard.writeText(t); } catch {} };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ padding: "24px 16px", background: V2.cream || "#fafaf5", color: "#1f2d17", minHeight: "100vh", fontFamily: V2.fontSans }}>
      <Head><title>Team tokens admin</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/admin/wheel" style={{ fontSize: 13, color: V2.grassDark, textDecoration: "none" }}>← Admin</Link>
        <h1 style={{ fontSize: 26, margin: "8px 0 4px", color: V2.forestGreen }}>Team token tracker</h1>
        <p style={{ fontSize: 13, color: V2.textMuted, margin: "0 0 14px" }}>Balances are read live from Solana. Your list and notes are saved here.</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="password" placeholder="Admin secret" value={secret} onChange={(e) => setSecret(e.target.value)} style={{ ...inp, flex: 1 }} />
          <button style={primary} onClick={load} disabled={busy}>{busy ? "Loading…" : d ? "Refresh" : "Load"}</button>
        </div>
        {msg && <div style={{ color: V2.danger, fontSize: 13, marginBottom: 10 }}>{msg}</div>}

        {d && (
          <div style={{ ...box, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: V2.grassGreen }}>Total value (priced tokens)</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: V2.forestGreen }}>{usd(d.total_usd)}</div>
              <div style={{ fontSize: 12, color: V2.textMuted }}>{d.wallets.length} {d.wallets.length === 1 ? "wallet" : "wallets"} · as of {new Date(d.as_of).toLocaleTimeString()}</div>
            </div>
            <button style={primary} onClick={() => setForm({ ...blank })}>Add wallet</button>
          </div>
        )}

        {d && d.wallets.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {[["all", "All", d.wallets.length, d.total_usd], ...Object.keys(KIND).filter((k) => d.by_kind?.[k]).map((k) => [k, KIND[k], d.by_kind[k].count, d.by_kind[k].usd])].map(([k, lb, n, v]) => (
              <button key={k} onClick={() => setFilter(k)} style={{ ...btn, background: filter === k ? V2.grassGreen : "#fff", color: filter === k ? "#fff" : V2.forestGreen, fontWeight: 700 }}>{lb} · {n} · {usd(v)}</button>
            ))}
          </div>
        )}

        {form && (
          <div style={box}>
            <b style={{ fontSize: 16 }}>{form.id ? "Edit wallet" : "Add wallet"}</b>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <input style={inp} placeholder="Label (e.g. Treasury, Marketing, Dev)" value={form.label} onChange={set("label")} />
              <input style={inp} placeholder="Wallet address" value={form.address} onChange={set("address")} />
              <select style={inp} value={form.kind} onChange={set("kind")}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <input style={inp} placeholder="Purpose (optional)" value={form.purpose} onChange={set("purpose")} />
              <textarea style={{ ...inp, minHeight: 70 }} placeholder="Notes (vesting, lock dates, who controls it…)" value={form.notes} onChange={set("notes")} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>What it should hold (one per line: SYMBOL mint amount)</div>
                <textarea style={{ ...inp, minHeight: 90, fontFamily: "monospace", fontSize: 12.5 }} value={form.expectedText} onChange={set("expectedText")}
                  placeholder={"TOUCHGRASS 5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump 10000000\nSOL SOL 25"} />
                <div style={{ fontSize: 11.5, color: V2.textMuted, marginTop: 4 }}>Amount is optional. Use the word SOL as the mint for native SOL.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={primary} onClick={save} disabled={busy}>Save</button>
                <button style={btn} onClick={() => setForm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {d && d.wallets.length === 0 && !form && (
          <div style={box}>No wallets yet. <button style={{ ...btn, marginLeft: 8 }} onClick={() => setForm({ ...blank })}>Add the first one</button></div>
        )}

        {d && d.wallets.filter((w) => filter === "all" || (w.kind || "team") === filter).sort((a, b) => (b.usd || 0) - (a.usd || 0)).map((w) => (
          <div key={w.id} style={box}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: V2.forestGreen }}>{w.label} <span style={{ fontSize: 11, fontWeight: 700, color: V2.textMuted, border: `1px solid ${V2.borderSoft}`, borderRadius: 99, padding: "2px 8px", marginLeft: 4, verticalAlign: "middle" }}>{KIND[w.kind || "team"]}</span></div>
                {w.purpose && <div style={{ fontSize: 13, color: V2.textMuted }}>{w.purpose}</div>}
                <div style={{ fontSize: 12.5, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <code>{short(w.address)}</code>
                  <button style={{ ...btn, padding: "3px 8px", fontSize: 12 }} onClick={() => copy(w.address)}>Copy</button>
                  <a href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noopener noreferrer" style={{ color: V2.grassDark }}>Solscan</a>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen }}>{usd(w.usd)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                  <button style={btn} onClick={() => setForm({ id: w.id, label: w.label, address: w.address, kind: w.kind || "team", purpose: w.purpose || "", notes: w.notes || "", expectedText: toText(w.expected) })}>Edit</button>
                  <button style={btn} onClick={() => remove(w)}>Remove</button>
                </div>
              </div>
            </div>
            {w.error ? <div style={{ color: V2.danger, fontSize: 13, marginTop: 10 }}>Couldn't read this wallet: {w.error}</div> : (
              <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead><tr style={{ textAlign: "left", color: V2.textMuted, fontSize: 11.5 }}>
                    <th style={{ padding: "4px 6px" }}>Token</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Live</th>
                    <th style={{ padding: "4px 6px", textAlign: "right" }}>Expected</th><th style={{ padding: "4px 6px" }}>Check</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Value</th>
                  </tr></thead>
                  <tbody>{w.holdings.map((h) => { const s = status(h); return (
                    <tr key={h.mint} style={{ borderTop: `1px solid ${V2.borderSoft}` }}>
                      <td style={{ padding: "6px" }}><b>{h.symbol || short(h.mint)}</b></td>
                      <td style={{ padding: "6px", textAlign: "right" }}>{fmt(h.amount)}{h.mint === TG && d.tg_supply ? <div style={{ fontSize: 11, color: V2.textMuted }}>{((h.amount / d.tg_supply) * 100).toFixed(2)}% of supply</div> : null}</td>
                      <td style={{ padding: "6px", textAlign: "right", color: V2.textMuted }}>{h.expected == null ? "—" : fmt(h.expected)}</td>
                      <td style={{ padding: "6px", color: s?.c, fontWeight: 700, fontSize: 12 }}>{s ? s.t : ""}</td>
                      <td style={{ padding: "6px", textAlign: "right" }}>{usd(h.usd)}</td>
                    </tr>); })}</tbody>
                </table>
              </div>
            )}
            {w.notes && <div style={{ fontSize: 13, marginTop: 10, padding: "8px 10px", background: "#f6f9f1", borderRadius: 8, whiteSpace: "pre-wrap" }}>{w.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
