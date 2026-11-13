// /admin/team-tokens — team wallets, what each should hold, and the live on-chain balance. Admin secret only; talks to /api/admin/team-wallets.
import { useState, useCallback, useMemo, useRef } from "react";
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
const blank = { id: null, label: "", address: "", kind: "holder", locked: false, unlock_date: "", lock_url: "", purpose: "", notes: "", expectedText: "" };
const KIND = { team: "Team", holder: "Large holder", friends: "Friends & Family", other: "Other" };
const TG = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";

// "SYMBOL mint [amount]" per line; the mint SOL means native SOL.
const parseExpected = (t) => String(t || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
  const [symbol, mint, amount] = l.split(/[\s,]+/);
  return { symbol, mint, amount: amount === undefined ? "" : amount.replace(/_/g, "") };
});
const toText = (arr) => (arr || []).map((e) => [e.symbol || "", e.mint, e.amount ?? ""].join(" ").trim()).join("\n");

const KCOL = { team: "#5ba622", holder: "#e8a020", friends: "#4a9fd0", other: "#7a8aa0" };
const abbr = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n * 100) / 100));

// Stacked area of cumulative totals over time, split by wallet type. Hand-drawn SVG so it stays light and phone friendly.
function HistoryChart({ hist, metric, setMetric, days, setDays }) {
  const [hi, setHi] = useState(null);
  const pts = hist?.points || [];
  const kinds = Object.keys(KIND).filter((k) => pts.some((p) => (p[metric][k] || 0) > 0));
  const W = 600, H = 200, PX = 4, PY = 10;
  const val = (p) => p[metric].all || 0;
  const max = Math.max(1, ...pts.map(val));
  const t0 = pts.length ? new Date(pts[0].t).getTime() : 0, t1 = pts.length ? new Date(pts[pts.length - 1].t).getTime() : 1;
  const x = (p) => PX + ((new Date(p.t).getTime() - t0) / Math.max(1, t1 - t0)) * (W - PX * 2);
  const y = (v) => H - PY - (v / max) * (H - PY * 2);
  const layers = kinds.map((k, i) => {
    const below = (p) => kinds.slice(0, i).reduce((s, kk) => s + (p[metric][kk] || 0), 0);
    const top = pts.map((p) => `${x(p).toFixed(1)},${y(below(p) + (p[metric][k] || 0)).toFixed(1)}`);
    const bot = pts.slice().reverse().map((p) => `${x(p).toFixed(1)},${y(below(p)).toFixed(1)}`);
    return { k, d: `M${top.join("L")}L${bot.join("L")}Z` };
  });
  const show = hi != null && pts[hi] ? pts[hi] : pts[pts.length - 1];
  const first = pts[0], delta = first && show ? val(show) - val(first) : 0;
  const fmtV = (v) => (metric === "usd" ? usd(v) : fmt(v));
  const onMove = (e) => {
    if (pts.length < 2) return;
    const r = e.currentTarget.getBoundingClientRect(); const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const target = t0 + (Math.min(Math.max(cx / r.width, 0), 1)) * (t1 - t0);
    let best = 0; pts.forEach((p, i) => { if (Math.abs(new Date(p.t).getTime() - target) < Math.abs(new Date(pts[best].t).getTime() - target)) best = i; });
    setHi(best);
  };
  const chip = (on) => ({ ...btn, padding: "5px 10px", fontSize: 12, background: on ? V2.forestGreen : "#fff", color: on ? "#fff" : V2.forestGreen, fontWeight: 700 });
  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={chip(metric === "tg")} onClick={() => setMetric("tg")}>TOUCHGRASS</button>
          <button style={chip(metric === "usd")} onClick={() => setMetric("usd")}>USD value</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[[7, "7d"], [30, "30d"], [90, "90d"], [365, "1y"]].map(([n, l]) => <button key={n} style={chip(days === n)} onClick={() => setDays(n)}>{l}</button>)}
        </div>
      </div>
      {hist?.error ? <div style={{ color: V2.danger, fontSize: 13 }}>{hist.error}</div> : pts.length < 2 ? (
        <div style={{ fontSize: 13, color: V2.textMuted, padding: "18px 4px", lineHeight: 1.5 }}>
          The graph fills in as snapshots are saved: one each time you open this page (at most every 6 hours) and one every night. {pts.length === 1 ? "The first snapshot is in. Check back after the next one." : "Nothing saved yet."}
        </div>
      ) : (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <div><span style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen }}>{fmtV(val(show))}</span>
            <span style={{ fontSize: 12, color: delta >= 0 ? V2.success : V2.danger, fontWeight: 700, marginLeft: 8 }}>{delta >= 0 ? "+" : "-"}{fmtV(Math.abs(delta))} since start</span></div>
          <div style={{ fontSize: 12, color: V2.textMuted }}>{new Date(show.t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <div style={{ position: "relative", marginTop: 6 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }} onMouseMove={onMove} onTouchStart={onMove} onTouchMove={onMove} onMouseLeave={() => setHi(null)}>
            {[0, 0.5, 1].map((g) => <line key={g} x1={PX} x2={W - PX} y1={y(max * g)} y2={y(max * g)} stroke="#e3ead9" strokeWidth="1" />)}
            {layers.map((l) => <path key={l.k} d={l.d} fill={KCOL[l.k]} fillOpacity="0.55" stroke={KCOL[l.k]} strokeWidth="1.5" />)}
            {hi != null && <line x1={x(pts[hi])} x2={x(pts[hi])} y1={PY} y2={H - PY} stroke="#1f2d17" strokeWidth="1" strokeDasharray="3 3" />}
          </svg>
          <div style={{ position: "absolute", left: 4, top: 0, fontSize: 11, color: V2.textMuted }}>{metric === "usd" ? "$" + abbr(max) : abbr(max)}</div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6, fontSize: 12 }}>
          {kinds.map((k) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: KCOL[k], display: "inline-block" }} />{KIND[k]}: <b>{fmtV(show[metric][k] || 0)}</b></span>)}
        </div>
      </>)}
    </div>
  );
}

const pct = (n, sup) => (sup > 0 ? (n / sup) * 100 : 0);
const pctTxt = (p) => (p === 0 ? "0%" : p < 0.01 ? "<0.01%" : p < 1 ? p.toFixed(2) + "%" : p.toFixed(1) + "%");
function lockInfo(w) {
  if (!w.locked) return null;
  if (!w.unlock_date) return { t: "Locked", c: V2.grassDark };
  const days = Math.ceil((new Date(w.unlock_date + "T00:00:00").getTime() - Date.now()) / 86400000);
  const when = new Date(w.unlock_date + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  if (days < 0) return { t: `Unlock date passed (${when})`, c: V2.warning };
  if (days === 0) return { t: `Unlocks today (${when})`, c: V2.warning };
  return { t: `Locked until ${when} · ${days} ${days === 1 ? "day" : "days"}`, c: days <= 30 ? V2.warning : V2.grassDark };
}

// Who holds how much of the TOUCHGRASS supply, by wallet type, with the locked share called out.
function SupplyShare({ d }) {
  const sup = d.tg_supply; if (!sup) return null;
  const parts = Object.keys(KIND).filter((k) => d.by_kind?.[k]?.tg > 0).map((k) => ({ k, tg: d.by_kind[k].tg, locked: d.by_kind[k].locked_tg || 0 }));
  const tracked = parts.reduce((s, p) => s + p.tg, 0), locked = d.locked_tg || 0;
  return (
    <div style={box}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: V2.grassGreen }}>Share of $TOUCHGRASS supply</div>
      <div style={{ display: "flex", height: 16, borderRadius: 99, overflow: "hidden", background: "#eef2e6", margin: "10px 0" }}>
        {parts.map((p) => <div key={p.k} title={KIND[p.k]} style={{ width: `${Math.max(pct(p.tg, sup), 0.4)}%`, background: KCOL[p.k] }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        {parts.map((p) => (
          <div key={p.k}>
            <div style={{ fontSize: 12, color: V2.textMuted, display: "flex", alignItems: "center", gap: 5 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: KCOL[p.k], display: "inline-block" }} />{KIND[p.k]}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen }}>{pctTxt(pct(p.tg, sup))}</div>
            <div style={{ fontSize: 11.5, color: V2.textMuted }}>{abbr(p.tg)}{p.locked > 0 ? ` · ${pctTxt(pct(p.locked, sup))} locked` : ""}</div>
          </div>
        ))}
        <div>
          <div style={{ fontSize: 12, color: V2.textMuted }}>All tracked</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen }}>{pctTxt(pct(tracked, sup))}</div>
          <div style={{ fontSize: 11.5, color: V2.textMuted }}>{abbr(tracked)} of {abbr(sup)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: V2.textMuted }}>Locked</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen }}>{pctTxt(pct(locked, sup))}</div>
          <div style={{ fontSize: 11.5, color: V2.textMuted }}>{abbr(locked)} · unlocked tracked {pctTxt(pct(tracked - locked, sup))}</div>
        </div>
      </div>
    </div>
  );
}

function aggregateClient(wallets) {
  const by_kind = {}; let locked_tg = 0, total_usd = 0;
  for (const w of wallets) { const k = w.kind || "team"; by_kind[k] = by_kind[k] || { usd: 0, count: 0, tg: 0, locked_tg: 0 };
    const tg = (w.holdings || []).find((h) => h.mint === TG)?.amount || 0;
    by_kind[k].usd += w.usd || 0; by_kind[k].count += 1; by_kind[k].tg += tg; total_usd += w.usd || 0;
    if (w.locked) { by_kind[k].locked_tg += tg; locked_tg += tg; } }
  return { by_kind, locked_tg, total_usd };
}

function status(h) {
  if (h.expected == null) return null;
  const diff = h.amount - h.expected, tol = Math.max(h.expected * 0.005, 0.000001);
  if (Math.abs(diff) <= tol) return { t: "Matches", c: V2.success };
  return diff < 0 ? { t: `Short ${fmt(-diff)}`, c: V2.danger } : { t: `Over by ${fmt(diff)}`, c: V2.warning };
}

export default function AdminTeamTokens() {
  const [secret, setSecret] = useState("");
  const [wallets, setWallets] = useState(null);
  const [supply, setSupply] = useState(null);
  const [asOf, setAsOf] = useState(null);
  const [prog, setProg] = useState(null);
  const run = useRef(0);
  const d = useMemo(() => (wallets ? { wallets, ...aggregateClient(wallets), tg_supply: supply, as_of: asOf } : null), [wallets, supply, asOf]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("all");
  const [hist, setHist] = useState(null);
  const [metric, setMetric] = useState("tg");
  const [days, setDays] = useState(30);

  const call = useCallback(async (method, body) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/team-wallets", { method, headers: { "Content-Type": "application/json", "x-admin-secret": secret }, body: body ? JSON.stringify(body) : undefined });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j.error || `Failed (${r.status})`); return null; }
      setMsg(""); return j;
    } finally { setBusy(false); }
  }, [secret]);
  const loadHist = useCallback(async (n) => {
    try { const r = await fetch(`/api/admin/team-wallets?history=1&days=${n}`, { headers: { "x-admin-secret": secret } }); const j = await r.json().catch(() => ({})); if (r.ok) setHist(j); } catch {}
  }, [secret]);
  const get = useCallback(async (qs) => {
    const r = await fetch(`/api/admin/team-wallets?${qs}`, { headers: { "x-admin-secret": secret } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || (r.status === 401 ? "Wrong admin secret." : `Failed (${r.status})`));
    return j;
  }, [secret]);
  // The list loads instantly (no Solana calls). Balances then load one wallet at a time, so nothing can time out and rows fill in as they arrive.
  const load = useCallback(async () => {
    const me = ++run.current; setBusy(true); setMsg("");
    try {
      const { wallets: rows } = await get("list=1");
      if (me !== run.current) return;
      setWallets(rows.map((w) => ({ ...w, loading: true, holdings: [], usd: null }))); setAsOf(null); setProg({ done: 0, total: rows.length });
      get("supply=1").then((j) => me === run.current && setSupply(j.tg_supply)).catch(() => {});
      const got = new Array(rows.length); let next = 0, done = 0;
      const worker = async () => {
        while (next < rows.length && me === run.current) {
          const i = next++; let v;
          try { v = await get(`id=${rows[i].id}`); } catch (e) { v = { error: e.message }; }
          if (me !== run.current) return;
          got[i] = v; done++;
          setWallets((cur) => cur && cur.map((w) => (w.id === rows[i].id ? { ...w, loading: false, ...(v.error ? { error: v.error, holdings: [], usd: null } : { error: null, holdings: v.holdings, usd: v.usd }) } : w)));
          setProg({ done, total: rows.length });
        }
      };
      await Promise.all([worker(), worker()]);
      if (me !== run.current) return;
      setAsOf(new Date().toISOString()); setProg(null);
      if (rows.length && got.every((v) => v && !v.error)) {          // save a history point only when every wallet read cleanly
        const snap = rows.map((w, i) => ({ address: w.address, tg_amount: got[i].holdings.find((h) => h.mint === TG)?.amount || 0, sol_amount: got[i].holdings.find((h) => h.mint === "SOL")?.amount || 0, usd: got[i].usd || 0 }));
        await call("POST", { action: "snapshot", rows: snap });
      }
      loadHist(days);
    } catch (e) { if (me === run.current) { setMsg(e.message); setProg(null); } }
    finally { if (me === run.current) setBusy(false); }
  }, [get, call, loadHist, days]);
  const pickDays = (n) => { setDays(n); if (wallets) loadHist(n); };
  const save = async () => {
    const body = { action: form.id ? "update" : "add", id: form.id, label: form.label, address: form.address, kind: form.kind, locked: !!form.locked, unlock_date: form.locked ? form.unlock_date : "", lock_url: form.locked ? form.lock_url : "", purpose: form.purpose, notes: form.notes, expected: parseExpected(form.expectedText) };
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
              <div style={{ fontSize: 12, color: V2.textMuted }}>{d.wallets.length} {d.wallets.length === 1 ? "wallet" : "wallets"} · {prog ? `loading balances ${prog.done}/${prog.total}…` : d.as_of ? `as of ${new Date(d.as_of).toLocaleTimeString()}` : ""}</div>
            </div>
            <button style={primary} onClick={() => setForm({ ...blank })}>Add wallet</button>
          </div>
        )}

        {d && d.wallets.length > 0 && <SupplyShare d={d} />}

        {d && d.wallets.length > 0 && <HistoryChart hist={hist} metric={metric} setMetric={setMetric} days={days} setDays={pickDays} />}

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
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
                <input type="checkbox" checked={!!form.locked} onChange={(e) => setForm((f) => ({ ...f, locked: e.target.checked }))} style={{ width: 18, height: 18 }} /> Tokens in this wallet are locked
              </label>
              {form.locked && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>Unlock date</div>
                  <input type="date" style={inp} value={form.unlock_date} onChange={set("unlock_date")} />
                  <div style={{ fontSize: 12, fontWeight: 700, margin: "10px 0 4px" }}>Link to the lock (optional)</div>
                  <input style={inp} placeholder="https://… (Streamflow, Jupiter Lock, explorer page)" value={form.lock_url} onChange={set("lock_url")} inputMode="url" autoCapitalize="none" />
                </div>
              )}
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
                {lockInfo(w) && <div style={{ display: "inline-block", marginTop: 6, fontSize: 12, fontWeight: 800, color: lockInfo(w).c, border: `1.5px solid ${lockInfo(w).c}`, borderRadius: 99, padding: "2px 10px" }}>{lockInfo(w).t}</div>}
                {w.locked && /^https?:\/\//i.test(w.lock_url || "") && <a href={w.lock_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 6, marginLeft: 8, fontSize: 12.5, fontWeight: 700, color: V2.grassDark }}>View lock ↗</a>}
                <div style={{ fontSize: 12.5, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <code>{short(w.address)}</code>
                  <button style={{ ...btn, padding: "3px 8px", fontSize: 12 }} onClick={() => copy(w.address)}>Copy</button>
                  <a href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noopener noreferrer" style={{ color: V2.grassDark }}>Solscan</a>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen }}>{usd(w.usd)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                  <button style={btn} onClick={() => setForm({ id: w.id, label: w.label, address: w.address, kind: w.kind || "team", locked: !!w.locked, unlock_date: w.unlock_date || "", lock_url: w.lock_url || "", purpose: w.purpose || "", notes: w.notes || "", expectedText: toText(w.expected) })}>Edit</button>
                  <button style={btn} onClick={() => remove(w)}>Remove</button>
                </div>
              </div>
            </div>
            {w.loading ? <div style={{ color: V2.textMuted, fontSize: 13, marginTop: 10 }}>Loading balances…</div> : w.error ? <div style={{ color: V2.danger, fontSize: 13, marginTop: 10 }}>Couldn't read this wallet: {w.error} <button style={{ ...btn, padding: "3px 8px", fontSize: 12, marginLeft: 6 }} onClick={load}>Retry all</button></div> : (
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
