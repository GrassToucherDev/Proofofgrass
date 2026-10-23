import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { T } from "../../utils/wagoTheme";
import { uploadCover } from "../../utils/wagoCoverUpload";

const BLANK = { title: "", value_text: "", description: "", image_url: "", sponsor_name: "", sponsor_url: "", sponsor_logo_url: "", lat: "", lng: "", hint: "", quantity: 1, claim_radius_m: 25, reveal_radius_m: 100, ends_at: "", status: "draft" };
const inp = { width: "100%", boxSizing: "border-box", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: T.white };

function F({ label, children }) {
  return <label style={{ display: "block", marginBottom: 12 }}><span style={{ fontSize: 11, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>{label}</span>{children}</label>;
}

export default function AdminPrizes() {
  const [secret, setSecret] = useState("");
  const [list, setList] = useState(null);
  const [f, setF] = useState(BLANK);
  const [codes, setCodes] = useState(null);
  const [err, setErr] = useState("");
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const [up, setUp] = useState("");
  async function pick(key, logo, e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUp(key); setErr("");
    try { const url = await uploadCover(file, { logo }); setF(x => ({ ...x, [key]: url })); }
    catch (ex) { setErr(ex.message); }
    setUp("");
  }
  const H = { "Content-Type": "application/json", "x-wago-admin-secret": secret };

  async function load() {
    setErr("");
    const r = await fetch("/api/wago-drops/admin/prizes", { headers: H });
    const d = await r.json();
    if (!r.ok) return setErr(d.error || "Failed");
    setList(d.prizes);
  }
  async function create() {
    setErr("");
    const r = await fetch("/api/wago-drops/admin/prizes", { method: "POST", headers: H, body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) return setErr(d.error || "Failed");
    setCodes({ title: d.prize.title, codes: d.codes }); setF(BLANK); load();
  }
  async function patch(body) {
    const r = await fetch("/api/wago-drops/admin/prizes", { method: "PATCH", headers: H, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) return setErr(d.error || "Failed");
    if (d.codes?.length) setCodes({ title: "New codes", codes: d.codes });
    load();
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "'DM Sans',sans-serif", padding: "24px 16px 80px" }}>
      <Head><title>Prizes admin</title><meta name="robots" content="noindex" /></Head>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href="/wago-drops/admin" style={{ fontSize: 13, color: T.green, textDecoration: "none" }}>← WAGO admin</Link>
        <h1 style={{ fontSize: 24, margin: "10px 0 14px" }}>Prizes admin</h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input type="password" placeholder="Admin secret" value={secret} onChange={e => setSecret(e.target.value)} style={inp} />
          <button onClick={load} style={{ background: T.olive, color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontWeight: 700 }}>Load</button>
        </div>
        {err && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}

        {codes && (
          <div style={{ background: "#fffbe6", border: "1px solid #e6d27a", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <b>{codes.title}: copy these codes now. They can't be shown again.</b>
            <pre style={{ margin: "8px 0 0", fontSize: 15, whiteSpace: "pre-wrap", userSelect: "all" }}>{codes.codes.join("\n") || "(none)"}</pre>
            <button onClick={() => setCodes(null)} style={{ marginTop: 8, fontSize: 12 }}>I've saved them</button>
          </div>
        )}

        {list && (
          <div style={{ marginBottom: 24 }}>
            {list.map(p => (
              <div key={p.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{p.title} <span style={{ fontWeight: 400, color: T.dim, fontSize: 12 }}>· {p.sponsor_name} · {p.status}</span></div>
                <div style={{ fontSize: 12.5, color: T.muted, margin: "4px 0 8px" }}>{p.remaining} of {p.total} left · <a href={`/wago-drops/prize/${p.id}`} style={{ color: T.green }}>open</a></div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["draft", "active", "ended"].filter(s => s !== p.status).map(s => <button key={s} onClick={() => patch({ id: p.id, status: s })}>Set {s}</button>)}
                  <button onClick={() => patch({ id: p.id, addCodes: 5 })}>+5 codes</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: 18 }}>New prize</h2>
        <p style={{ fontSize: 12.5, color: T.muted, marginTop: 0 }}>Any kind of prize: cards, merch, cash, vouchers. Quantity = how many are hidden (one single-use code each).</p>
        <F label="Title"><input style={inp} value={f.title} onChange={set("title")} placeholder="Holo Charizard card" /></F>
        <F label="Value / what it is (shown to everyone)"><input style={inp} value={f.value_text} onChange={set("value_text")} placeholder="Pokémon card, $20 cash, T-shirt…" /></F>
        <F label="Description"><textarea style={inp} rows={3} value={f.description} onChange={set("description")} /></F>
        <F label="Prize photo (what the prize looks like)">
          {f.image_url && <img src={f.image_url} alt="" style={{ width: 120, height: 120, objectFit: "contain", background: T.surface, borderRadius: 10, display: "block", marginBottom: 8 }} />}
          <input type="file" accept="image/*" onChange={e => pick("image_url", false, e)} />
          {up === "image_url" && <span style={{ fontSize: 12, color: T.dim }}> Uploading…</span>}
        </F>
        <F label="Sponsor name"><input style={inp} value={f.sponsor_name} onChange={set("sponsor_name")} /></F>
        <F label="Sponsor website"><input style={inp} value={f.sponsor_url} onChange={set("sponsor_url")} /></F>
        <F label="Sponsor logo (optional)">
          {f.sponsor_logo_url && <img src={f.sponsor_logo_url} alt="" style={{ width: 48, height: 48, objectFit: "contain", display: "block", marginBottom: 8 }} />}
          <input type="file" accept="image/*" onChange={e => pick("sponsor_logo_url", true, e)} />
          {up === "sponsor_logo_url" && <span style={{ fontSize: 12, color: T.dim }}> Uploading…</span>}
        </F>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
          <F label="Latitude"><input style={inp} value={f.lat} onChange={set("lat")} inputMode="decimal" /></F>
          <F label="Longitude"><input style={inp} value={f.lng} onChange={set("lng")} inputMode="decimal" /></F>
        </div>
        <F label="Hint (shown only when close)"><input style={inp} value={f.hint} onChange={set("hint")} placeholder="Under the bench by the fountain" /></F>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
          <F label="Quantity"><input style={inp} type="number" min="1" value={f.quantity} onChange={set("quantity")} /></F>
          <F label="Claim radius m"><input style={inp} type="number" value={f.claim_radius_m} onChange={set("claim_radius_m")} /></F>
          <F label="Reveal radius m"><input style={inp} type="number" value={f.reveal_radius_m} onChange={set("reveal_radius_m")} /></F>
        </div>
        <F label="Ends (optional)"><input style={inp} type="datetime-local" value={f.ends_at} onChange={set("ends_at")} /></F>
        <F label="Status"><select style={inp} value={f.status} onChange={set("status")}><option value="draft">Draft (hidden)</option><option value="active">Active (live)</option></select></F>
        <button onClick={create} disabled={!!up} style={{ background: T.olive, color: "#fff", border: "none", borderRadius: 999, padding: "12px 24px", fontWeight: 700, fontSize: 15 }}>Create prize and codes</button>
      </div>
    </div>
  );
}
