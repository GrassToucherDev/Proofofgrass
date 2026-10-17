// Admin Trail Builder — rendered as the "Trails" tab of /wago-drops/admin.
import { useEffect, useState, useCallback } from "react";
import { T } from "../../../utils/wagoTheme";
import { uploadCover } from "../../../utils/wagoCoverUpload";
import { TRAIL_MIN_STOPS, TRAIL_MAX_STOPS, formatDistance, formatMinutes } from "../../../utils/wagoTrails";

const MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
const BLANK = { name: "", description: "", city: "", cover_image_url: "", completion_mode: "ordered", starts_at: "", ends_at: "",
  reward_type: "none", reward_amount: "", reward_token_mint: MINT, reward_symbol: "$TOUCHGRASS", reward_logo_url: "", reward_tickets: "", reward_badge: "" };

const inp = { width: "100%", boxSizing: "border-box", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: T.white, outline: "none" };
const lab = { fontSize: 11, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 };
const btn = (primary) => ({ background: primary ? T.olive : "transparent", color: primary ? "#fff" : T.white, border: primary ? "none" : `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" });
const Field = ({ label, children, style }) => <label style={{ display: "block", marginBottom: 12, ...style }}><span style={lab}>{label}</span>{children}</label>;
const toLocal = v => (v ? new Date(v).toISOString().slice(0, 16) : "");
const fromLocal = v => (v ? new Date(v).toISOString() : "");

function PinPicker({ campaigns, adminSecret, value, onChange, locked }) {
  const [pins, setPins] = useState([]);
  useEffect(() => {
    if (!value.campaign_id) { setPins([]); return; }
    let alive = true;
    fetch(`/api/wago-drops/admin/locations-by-campaign?campaignId=${value.campaign_id}`, { headers: { "x-wago-admin-secret": adminSecret } })
      .then(r => r.json()).then(d => alive && setPins(d.locations || []));
    return () => { alive = false; };
  }, [value.campaign_id, adminSecret]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <select disabled={locked} style={inp} value={value.campaign_id || ""} onChange={e => onChange({ ...value, campaign_id: e.target.value, location_id: "" })}>
        <option value="">Campaign…</option>
        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}{c.status !== "active" ? ` (${c.status})` : ""}</option>)}
      </select>
      <select disabled={locked || !value.campaign_id} style={inp} value={value.location_id || ""} onChange={e => onChange({ ...value, location_id: e.target.value })}>
        <option value="">Pin…</option>
        {pins.map(p => <option key={p.id} value={p.id}>{(p.hint || "Pin").slice(0, 34)} · {p.lat.toFixed(4)}, {p.lng.toFixed(4)}{p.is_active ? "" : " (inactive)"}</option>)}
      </select>
    </div>
  );
}

function Editor({ initial, campaigns, adminSecret, onDone }) {
  const [form, setForm] = useState(initial ? { ...BLANK, ...initial, starts_at: toLocal(initial.starts_at), ends_at: toLocal(initial.ends_at) } : BLANK);
  const [stops, setStops] = useState((initial?.stops || []).filter(s => !s.replaced_at).map(s => ({ campaign_id: s.campaign_id, location_id: s.location_id, label: s.label || "", position: s.position })));
  const started = (initial?.counts?.started || 0) > 0;
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState(null);   // { position, campaign_id, location_id, label }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const H = { "x-wago-admin-secret": adminSecret, "Content-Type": "application/json" };

  async function post(body) {
    const r = await fetch("/api/wago-drops/admin/trails", { method: "POST", headers: H, body: JSON.stringify(body) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d;
  }
  async function upload(e, key, opts) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true); try { set(key, await uploadCover(f, opts)); } catch (er) { setMsg({ ok: false, text: er.message }); } setBusy(false);
  }
  async function save() {
    setBusy(true); setMsg(null);
    try {
      const trail = { ...form, id: initial?.id, starts_at: fromLocal(form.starts_at), ends_at: fromLocal(form.ends_at) };
      const d = await post({ action: "save", trail, stops: started ? undefined : stops.map(s => ({ campaign_id: s.campaign_id, location_id: s.location_id, label: s.label })) });
      setMsg({ ok: true, text: "Saved." }); onDone(d.id);
    } catch (er) { setMsg({ ok: false, text: er.message }); }
    setBusy(false);
  }
  async function doReplace() {
    setBusy(true); setMsg(null);
    try { await post({ action: "replace_stop", trail_id: initial.id, ...replacing }); setReplacing(null); setMsg({ ok: true, text: "Stop replaced. Completed progress was kept." }); onDone(initial.id, true); }
    catch (er) { setMsg({ ok: false, text: er.message }); }
    setBusy(false);
  }
  const move = (i, d) => setStops(s => { const a = [...s]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <h3 style={{ margin: "0 0 14px", color: T.white }}>{initial ? `Edit: ${initial.name}` : "New Trail"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "0 16px" }}>
        <Field label="Name"><input style={inp} value={form.name} onChange={e => set("name", e.target.value)} /></Field>
        <Field label="City"><input style={inp} value={form.city || ""} onChange={e => set("city", e.target.value)} /></Field>
        <Field label="Completion mode">
          <select style={inp} value={form.completion_mode} onChange={e => set("completion_mode", e.target.value)}>
            <option value="ordered">Ordered (guided 1 → N)</option><option value="any_order">Any order</option>
          </select>
        </Field>
        <Field label="Cover image">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {form.cover_image_url && <img src={form.cover_image_url} alt="" style={{ width: 52, height: 36, objectFit: "cover", borderRadius: 6 }} />}
            <input type="file" accept="image/*" onChange={e => upload(e, "cover_image_url")} style={{ fontSize: 12 }} />
          </div>
        </Field>
        <Field label="Starts (optional)"><input type="datetime-local" style={inp} value={form.starts_at} onChange={e => set("starts_at", e.target.value)} /></Field>
        <Field label="Ends (optional)"><input type="datetime-local" style={inp} value={form.ends_at} onChange={e => set("ends_at", e.target.value)} /></Field>
      </div>
      <Field label="Description"><textarea rows={3} style={{ ...inp, resize: "vertical" }} value={form.description || ""} onChange={e => set("description", e.target.value)} /></Field>

      <div style={{ ...lab, marginTop: 6 }}>Completion reward (separate from each stop's drop reward)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "0 12px" }}>
        <Field label="Type">
          <select style={inp} value={form.reward_type} onChange={e => set("reward_type", e.target.value)}>
            <option value="none">No token</option><option value="spl_token">SPL token</option><option value="sol">SOL</option>
          </select>
        </Field>
        {form.reward_type !== "none" && <Field label="Amount"><input type="number" step="any" style={inp} value={form.reward_amount ?? ""} onChange={e => set("reward_amount", e.target.value)} /></Field>}
        {form.reward_type === "spl_token" && <>
          <Field label="Mint"><input style={inp} value={form.reward_token_mint || ""} onChange={e => set("reward_token_mint", e.target.value)} /></Field>
          <Field label="Symbol"><input style={inp} value={form.reward_symbol || ""} onChange={e => set("reward_symbol", e.target.value)} /></Field>
          <Field label="Token logo"><input type="file" accept="image/*" onChange={e => upload(e, "reward_logo_url", { logo: true })} style={{ fontSize: 12 }} /></Field>
        </>}
        <Field label="Grass Tickets"><input type="number" min="0" style={inp} value={form.reward_tickets ?? ""} onChange={e => set("reward_tickets", e.target.value)} /></Field>
        <Field label="Badge name"><input style={inp} placeholder="e.g. Trailblazer" value={form.reward_badge || ""} onChange={e => set("reward_badge", e.target.value)} /></Field>
      </div>

      <div style={{ ...lab, marginTop: 6 }}>Stops ({TRAIL_MIN_STOPS}–{TRAIL_MAX_STOPS}) — existing Drop campaigns, one pin each</div>
      {started && <p style={{ fontSize: 12, color: T.muted, margin: "0 0 10px" }}>People have started this Trail, so stops are locked. Use Replace to swap one — anyone who already completed that position keeps their progress.</p>}
      {stops.map((s, i) => (
        <div key={i} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 10, marginBottom: 8, background: T.surface }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <b style={{ width: 22 }}>{i + 1}</b>
            <input disabled={started} style={{ ...inp, flex: 1 }} placeholder="Stop label (optional — defaults to campaign name)" value={s.label || ""} onChange={e => setStops(a => a.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
            {!started && <>
              <button type="button" style={btn()} onClick={() => move(i, -1)}>↑</button>
              <button type="button" style={btn()} onClick={() => move(i, 1)}>↓</button>
              <button type="button" style={btn()} onClick={() => setStops(a => a.filter((_, j) => j !== i))}>✕</button>
            </>}
            {started && <button type="button" style={btn()} onClick={() => setReplacing({ position: s.position, campaign_id: "", location_id: "", label: "" })}>Replace</button>}
          </div>
          <PinPicker campaigns={campaigns} adminSecret={adminSecret} value={s} locked={started} onChange={v => setStops(a => a.map((x, j) => j === i ? { ...x, ...v } : x))} />
          {replacing?.position === s.position && (
            <div style={{ marginTop: 10, padding: 10, border: `1px dashed ${T.olive}`, borderRadius: 8 }}>
              <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Replace stop {s.position} with:</div>
              <PinPicker campaigns={campaigns} adminSecret={adminSecret} value={replacing} onChange={v => setReplacing(r => ({ ...r, ...v }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button style={btn(true)} disabled={busy || !replacing.location_id} onClick={doReplace}>Confirm replace</button>
                <button style={btn()} onClick={() => setReplacing(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {!started && stops.length < TRAIL_MAX_STOPS && <button type="button" style={btn()} onClick={() => setStops(a => [...a, { campaign_id: "", location_id: "", label: "" }])}>+ Add stop</button>}

      {msg && <p style={{ fontSize: 13, color: msg.ok ? T.green : T.red }}>{msg.text}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={btn(true)} disabled={busy} onClick={save}>{busy ? "Working…" : "Save Trail"}</button>
        <button style={btn()} onClick={() => onDone(null, false, true)}>Close</button>
      </div>
    </div>
  );
}

export default function TrailBuilder({ campaigns, adminSecret }) {
  const [trails, setTrails] = useState(null);
  const [editing, setEditing] = useState(undefined);   // undefined = closed, null = new, object = edit
  const [err, setErr] = useState(null);
  const H = { "x-wago-admin-secret": adminSecret, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/wago-drops/admin/trails", { headers: H }); const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed"); setTrails(d.trails); setErr(null); return d.trails;
    } catch (e) { setErr(e.message); }
  }, [adminSecret]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    const r = await fetch("/api/wago-drops/admin/trails", { method: "POST", headers: H, body: JSON.stringify({ action: "set_status", id, status }) });
    const d = await r.json(); if (!r.ok) alert(d.error || "Failed"); load();
  }
  async function onDone(id, keepOpen, close) {
    const list = await load();
    if (close) return setEditing(undefined);
    if (keepOpen && id) setEditing((list || []).find(t => t.id === id));
    else if (id) setEditing(undefined);
  }

  if (err) return <p style={{ color: T.red, fontSize: 13 }}>{err}</p>;
  if (!trails) return <p style={{ color: T.dim, fontSize: 13 }}>Loading…</p>;
  const STATUS_COL = { draft: T.muted, published: T.green, paused: T.yellow, archived: T.dim };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: T.white }}>Trails</h3>
        {editing === undefined && <button style={btn(true)} onClick={() => setEditing(null)}>+ New Trail</button>}
      </div>
      {editing !== undefined && <Editor key={(editing?.id || "new") + (editing?.stops || []).map(s => s.id).join(",")} initial={editing} campaigns={campaigns} adminSecret={adminSecret} onDone={onDone} />}
      {trails.length === 0 && <p style={{ color: T.dim, fontSize: 13 }}>No Trails yet.</p>}
      {trails.map(t => (
        <div key={t.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {t.cover_image_url && <img src={t.cover_image_url} alt="" style={{ width: 72, height: 50, objectFit: "cover", borderRadius: 8 }} />}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, color: T.white }}>{t.name} <span style={{ fontSize: 11, color: STATUS_COL[t.status], textTransform: "uppercase", marginLeft: 6 }}>{t.status}</span></div>
            <div style={{ fontSize: 12, color: T.muted }}>
              {[t.city, `${t.stops.filter(s => !s.replaced_at).length} stops`, t.distance_m != null && formatDistance(t.distance_m), t.est_minutes != null && `~${formatMinutes(t.est_minutes)}`, t.completion_mode === "ordered" ? "ordered" : "any order"].filter(Boolean).join(" · ")}
            </div>
            <div style={{ fontSize: 12, color: T.dim }}>{t.counts.started} started · {t.counts.completed} completed · {t.counts.expired} expired{t.counts.rewards_pending ? ` · ${t.counts.rewards_pending} rewards outstanding` : ""}</div>
          </div>
          <button style={btn()} onClick={() => setEditing(t)}>Edit</button>
          {t.status !== "published" && <button style={btn(true)} onClick={() => setStatus(t.id, "published")}>Publish</button>}
          {t.status === "published" && <button style={btn()} onClick={() => setStatus(t.id, "paused")}>Pause</button>}
          {t.status !== "archived" && <button style={btn()} onClick={() => setStatus(t.id, "archived")}>Archive</button>}
        </div>
      ))}
    </div>
  );
}
