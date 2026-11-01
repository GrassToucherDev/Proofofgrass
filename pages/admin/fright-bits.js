// /admin/fright-bits — run WAGO: Fright Bits. Talks to /api/fright-bits/admin with x-admin-secret.
import { useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";

const box = { color: "#1f2d17", background: "#fff", border: `1px solid ${V2.borderSoft}`, borderRadius: 14, padding: 16, marginBottom: 14 };
const inp = { boxSizing: "border-box", border: `1px solid ${V2.borderSoft}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "#fff", color: V2.forestGreen };
const btn = { border: `1px solid ${V2.borderSoft}`, background: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, cursor: "pointer", color: V2.forestGreen };

export default function AdminFrightBits() {
  const [secret, setSecret] = useState("");
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ reserve: "", segments: "", weight: "", max: "" });

  const call = useCallback(async (method, body) => {
    const r = await fetch("/api/fright-bits/admin", { method, headers: { "Content-Type": "application/json", "x-admin-secret": secret }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.error || `Failed (${r.status})`); return null; }
    setMsg(""); return j;
  }, [secret]);
  const load = useCallback(async () => { const j = await call("GET"); if (j) setD(j); }, [call]);
  const act = async (body, confirmText) => { if (confirmText && !confirm(confirmText)) return; if (await call("POST", body)) load(); };
  const list = (s) => s.split(",").map(x => x.trim()).filter(Boolean);
  const c = d?.collection;
  const activeSegs = (d?.items || []).filter(i => i.status === "active").map(i => i.wheel_prizes?.segment);
  const dupe = new Set(activeSegs).size !== activeSegs.length;

  return (
    <div style={{ padding: "24px 16px", background: V2.cream || "#fafaf5", color: "#1f2d17", minHeight: "100vh", fontFamily: V2.fontSans }}>
      <Head><title>Fright Bits admin</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/admin/wheel" style={{ fontSize: 13, color: V2.grassDark, textDecoration: "none" }}>← Wheel admin</Link>
        <h1 style={{ fontSize: 26, margin: "8px 0 14px", color: V2.forestGreen }}>🎃 WAGO: Fright Bits admin</h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="password" placeholder="Admin secret" value={secret} onChange={e => setSecret(e.target.value)} style={{ ...inp, flex: 1 }} />
          <button style={{ ...btn, background: V2.grassGreen, color: "#fff" }} onClick={load}>Load</button>
        </div>
        {msg && <div style={{ color: V2.danger, fontSize: 13, marginBottom: 10 }}>{msg}</div>}
        {d && !c && <div style={box}>Collection not set up yet. Run fright_bits.sql, then fright_bits_seed.sql in the Supabase SQL editor.</div>}
        {c && (<>
          <div style={box}>
            <b style={{ fontSize: 17 }}>Status: {c.status}</b>
            <div style={{ fontSize: 13, margin: "6px 0 10px", lineHeight: 1.6 }}>
              Legal gate (paid eligibility): <b style={{ color: c.paid_eligibility_enabled ? V2.grassDark : V2.danger }}>{c.paid_eligibility_enabled ? "OPEN" : "CLOSED"}</b><br />
              Ends {new Date(c.ends_at).toLocaleString("en-US", { timeZone: "America/New_York" })} ET · {c.max_active} on the wheel at once · reserve shown as <b>{c.reveal_mode}</b> · reserved wheel slices: {c.segments?.join(", ") || "none set"}
            </div>
            {!c.segments?.length && <div style={{ color: V2.danger, fontSize: 12.5, marginBottom: 8 }}>Set the wheel slices below before starting, or promoted characters keep slice 0.</div>}
            {dupe && <div style={{ color: V2.danger, fontSize: 12.5, marginBottom: 8 }}>Two active characters share a wheel slice. Fix the slices below.</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!c.paid_eligibility_enabled
                ? <button style={btn} onClick={() => act({ action: "legal_gate", open: true }, "Open the legal gate? Only do this after the final rules and legal review.")}>Open legal gate</button>
                : <button style={btn} onClick={() => act({ action: "legal_gate", open: false }, "Close the gate? A live collection will pause immediately.")}>Close legal gate</button>}
              {["draft", "paused"].includes(c.status) && <button style={{ ...btn, background: V2.grassGreen, color: "#fff" }} onClick={() => act({ action: "start" }, "Put the monsters on the wheel?")}>{c.status === "paused" ? "Resume" : "Start"}</button>}
              {c.status === "active" && <button style={btn} onClick={() => act({ action: "pause" })}>Pause (emergency stop)</button>}
              {c.status !== "ended" && <button style={{ ...btn, color: V2.danger }} onClick={() => act({ action: "end" }, "End Fright Bits? Unfound monsters are retired for good. Owners keep theirs.")}>End collection</button>}
            </div>
          </div>
          <div style={box}>
            <b>Characters</b>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse", marginTop: 8, minWidth: 520 }}>
              <thead><tr style={{ textAlign: "left", color: V2.midGray }}>{["#", "Name", "Status", "Order", "Slice", "Weight", "Owner"].map(h => <th key={h} style={{ padding: "4px 10px 4px 0" }}>{h}</th>)}</tr></thead>
              <tbody>{d.items.map(i => (
                <tr key={i.id} style={{ borderTop: `1px solid ${V2.borderSoft}` }}>
                  {[i.number, i.name, i.status, i.reserve_order, i.wheel_prizes?.segment, i.wheel_prizes?.weight, i.owner ? `@${i.owner.username}` : "—"].map((v, n) => <td key={n} style={{ padding: "6px 10px 6px 0" }}>{v}</td>)}
                </tr>))}</tbody>
            </table></div>
          </div>
          <div style={box}>
            <b>Settings</b>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 13 }}>Reserve shown as:</span>
                {["silhouette", "artwork"].map(m => <button key={m} style={{ ...btn, background: c.reveal_mode === m ? V2.grassGreen : "#fff", color: c.reveal_mode === m ? "#fff" : V2.forestGreen }} onClick={() => act({ action: "configure", reveal_mode: m })}>{m}</button>)}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 13 }}>Odds:</span>
                {[["replace_packs", "Take over the cosmetic packs’ odds"], ["manual", "Manual weights"]].map(([m, l]) => <button key={m} disabled={c.status === "active"} style={{ ...btn, background: c.odds_mode === m ? V2.grassGreen : "#fff", color: c.odds_mode === m ? "#fff" : V2.forestGreen }} onClick={() => act({ action: "configure", odds_mode: m })}>{l}</button>)}
                {c.status === "active" && <span style={{ fontSize: 12, color: V2.midGray }}>Pause to change.</span>}
              </div>
              <div style={{ fontSize: 12, color: V2.midGray }}>{c.odds_mode === "replace_packs" ? "On Start the active cosmetic packs step off the wheel and the characters share their combined odds equally. Pause or End puts the packs back exactly as they were." : "Characters use the weight below; packs stay on the wheel."}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input style={{ ...inp, flex: 1, minWidth: 220 }} placeholder="Reserve order (slugs, comma-separated)" value={f.reserve} onChange={e => setF({ ...f, reserve: e.target.value })} />
                <button style={btn} onClick={() => act({ action: "configure", reserve_order: list(f.reserve) })}>Save order</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input style={{ ...inp, flex: 1, minWidth: 220 }} placeholder="Wheel slices for Fright Bits, e.g. 1,3,5,7,9" value={f.segments} onChange={e => setF({ ...f, segments: e.target.value })} />
                <button style={btn} onClick={() => act({ action: "configure", segments: list(f.segments) })}>Save slices</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input style={{ ...inp, width: 160 }} type="number" placeholder="Max on wheel" value={f.max} onChange={e => setF({ ...f, max: e.target.value })} />
                <button style={btn} onClick={() => act({ action: "configure", max_active: f.max })}>Save</button>
                <input style={{ ...inp, width: 200 }} type="number" placeholder="Odds weight per character" value={f.weight} onChange={e => setF({ ...f, weight: e.target.value })} />
                <button style={btn} onClick={() => act({ action: "weight", weight: f.weight })}>Save weight</button>
              </div>
              <div style={{ fontSize: 12, color: V2.midGray }}>Weight is relative to your other Wheel prizes: check the Wheel prize list for the resulting odds before going live.</div>
            </div>
          </div>
          <div style={box}>
            <b>Activity</b>
            <div style={{ fontSize: 12.5, marginTop: 6, display: "grid", gap: 4 }}>
              {d.events.map(e => <div key={e.id}>{new Date(e.created_at).toLocaleString()} · {e.kind}{e.detail?.name ? ` · ${e.detail.name}` : ""}{e.detail?.username ? ` · @${e.detail.username}` : ""}</div>)}
              {!d.events.length && <span style={{ color: V2.midGray }}>Nothing yet.</span>}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}
