// pages/gallery.js — Today's Proofs: a feed of the last 24 hours of proofs from the community.
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import V2Nav from "../components/V2Nav";
import Ico from "../components/Ico";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";
import { signInWithGoogle } from "../utils/googleSignIn";

function ago(iso) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

function Tile({ it, onOpen, onBroken }) {
  return (
    <button className="gal-tile" onClick={() => onOpen(it)} aria-label={`Open @${it.username}'s proof`}>
      <img src={it.photo} alt="" loading="lazy" onError={() => onBroken(it)} />
      <span className="gal-shade" />
      <span className="gal-streak" style={{ background: it.tier.color }}><Ico n="flame" size={14} inline /> Day {it.streak}</span>
      {(it.reactions.leaf + it.reactions.fire) > 0 && <span className="gal-react"><Ico n="leaf" size={13} inline /> {it.reactions.leaf + it.reactions.fire}</span>}
      <span className="gal-meta">
        <b>@{it.username}</b>
        <small>{ago(it.created_at)}{it.place ? ` · ${it.place}` : ""}</small>
      </span>
    </button>
  );
}

export default function Gallery() {
  const { status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";
  const [username, setUsername] = useState("");
  const [scope, setScope] = useState("all");
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [noGrove, setNoGrove] = useState(false);
  const [open, setOpen] = useState(null);
  const [hidden, setHidden] = useState(null); // null = unknown / not the owner
  const [reportState, setReportState] = useState("");
  const [reactErr, setReactErr] = useState("");

  useEffect(() => { try { const u = localStorage.getItem("pog_username"); if (u) setUsername(u.replace(/@/g, "").toLowerCase().trim()); } catch {} }, []);

  const load = useCallback(async (before) => {
    setLoading(true); setErr("");
    try {
      const qs = new URLSearchParams({ scope, limit: "24" });
      if (scope === "grove") qs.set("username", username);
      if (before) qs.set("before", before);
      const r = await fetch("/api/gallery?" + qs, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not load the gallery.");
      setNoGrove(!!j.noGrove);
      setItems((prev) => before ? [...prev, ...j.items.filter((n) => !prev.some((p) => p.username === n.username && p.day === n.day))] : j.items);
      setNext(j.next);
    } catch (e) { setErr(e.message || "Could not load the gallery."); }
    setLoading(false);
  }, [scope, username]);

  useEffect(() => { if (authStatus === "loading") return; if (scope === "grove" && !username) return; load(null); }, [load, authStatus, scope, username]);

  useEffect(() => { // does the viewer own a username? then show their feed switch
    if (!signedIn || !username) { setHidden(null); return; }
    fetch("/api/gallery/visibility?username=" + encodeURIComponent(username)).then((r) => r.ok ? r.json() : null).then((j) => setHidden(j && !j.unavailable ? !!j.hidden : null)).catch(() => setHidden(null));
  }, [signedIn, username]);

  const toggleHidden = async () => {
    const want = !hidden; setHidden(want);
    try { const r = await fetch("/api/gallery/visibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, hidden: want }) }); if (!r.ok) setHidden(!want); } catch { setHidden(!want); }
  };
  const report = async (it) => {
    setReportState("sending");
    try {
      const r = await fetch("/api/gallery/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: username, username: it.username, day: it.day, reason: "reported from gallery" }) });
      setReportState(r.ok ? "sent" : "error");
    } catch { setReportState("error"); }
  };
  const react = async (it, kind) => {
    const was = !!it.mine?.[kind], key = (x) => x.username === it.username && x.day === it.day;
    const apply = (on) => {
      const patch = (x) => key(x) ? { ...x, mine: { ...x.mine, [kind]: on }, reactions: { ...x.reactions, [kind]: Math.max(0, (x.reactions[kind] || 0) + (on ? 1 : -1)) } } : x;
      setItems((prev) => prev.map(patch)); setOpen((o) => (o && key(o) ? patch(o) : o));
    };
    apply(!was);
    try {
      const r = await fetch("/api/gallery/react", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: username, username: it.username, day: it.day, kind, on: !was }) });
      if (!r.ok) { apply(was); const j = await r.json().catch(() => ({})); setReactErr(j.error || "Couldn't save your reaction. Try again."); } else { setReactErr(""); const j = await r.json(); if (j.counts) { const sync = (x) => key(x) ? { ...x, reactions: j.counts } : x; setItems((p) => p.map(sync)); setOpen((o) => (o && key(o) ? sync(o) : o)); } }
    } catch { apply(was); setReactErr("Couldn't save your reaction. Check your connection."); }
  };
  const broken = (it) => setItems((prev) => prev.filter((p) => !(p.username === it.username && p.day === it.day)));
  const close = () => { setOpen(null); setReportState(""); setReactErr(""); };

  const css = V2GlobalCSS + `
    .gal-wrap{max-width:1040px;margin:0 auto;padding:22px clamp(14px,4vw,32px) 60px}
    .gal-head h1{font-family:${V2.fontSans};font-size:clamp(26px,5vw,38px);font-weight:800;color:${V2.forestGreen};margin:0 0 4px}
    .gal-head p{margin:0;color:#4b6240;font-size:15px}
    .gal-tabs{display:flex;gap:8px;margin:18px 0;flex-wrap:wrap}
    .gal-tab{border:1.5px solid ${V2.borderSoft};background:#fff;border-radius:999px;padding:8px 16px;font-weight:700;font-size:14px;color:${V2.forestGreen};cursor:pointer}
    .gal-tab.on{background:linear-gradient(180deg,#7dd321,#4fb21a);color:#fff;border-color:#4fb21a}
    .gal-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    @media(min-width:640px){.gal-grid{grid-template-columns:repeat(3,1fr);gap:14px}}
    @media(min-width:920px){.gal-grid{grid-template-columns:repeat(4,1fr)}}
    .gal-tile{position:relative;aspect-ratio:4/5;border:0;padding:0;border-radius:16px;overflow:hidden;cursor:pointer;background:#dfeccf;box-shadow:0 4px 14px rgba(26,74,10,.12)}
    .gal-tile img{width:100%;height:100%;object-fit:cover;display:block}
    .gal-shade{position:absolute;inset:auto 0 0 0;height:55%;background:linear-gradient(180deg,transparent,rgba(0,0,0,.62))}
    .gal-streak{position:absolute;top:8px;left:8px;color:#fff;font-weight:800;font-size:12px;padding:4px 9px;border-radius:999px;text-shadow:0 1px 2px rgba(0,0,0,.35);display:flex;align-items:center;gap:4px}
    .gal-react{position:absolute;top:8px;right:8px;background:rgba(255,255,255,.92);color:#2f6d12;font-weight:800;font-size:12px;padding:3px 8px;border-radius:999px;display:flex;align-items:center;gap:4px}
    .gal-rx{display:flex;gap:10px;padding:2px 16px 14px}
    .gal-rxb{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;border:1.5px solid ${V2.borderSoft};background:#fff;border-radius:999px;padding:10px 12px;font-weight:800;font-size:15px;color:${V2.forestGreen};cursor:pointer}
    .gal-rxb.on{background:linear-gradient(180deg,#e9f9d2,#cdeeA0);border-color:#4fb21a}
    .gal-meta{position:absolute;left:10px;right:10px;bottom:9px;color:#fff;text-align:left;display:flex;flex-direction:column;gap:1px}
    .gal-meta b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .gal-meta small{font-size:11.5px;opacity:.9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .gal-card{background:#fff;border:1.5px solid ${V2.borderSoft};border-radius:18px;padding:20px;text-align:center;margin-top:16px}
    .gal-card p{margin:0 0 12px;color:#4b6240}
    .gal-more{display:block;margin:22px auto 0}
    .gal-opt{display:flex;align-items:center;gap:10px;margin-top:28px;padding:14px 16px;background:#fff;border:1.5px solid ${V2.borderSoft};border-radius:14px;font-size:14px;color:#3b5230;cursor:pointer}
    .gal-opt input{width:20px;height:20px;accent-color:#4fb21a;flex-shrink:0}
    .gal-modal{position:fixed;inset:0;background:rgba(10,20,8,.78);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px}
    .gal-pane{background:#fff;border-radius:20px;max-width:440px;width:100%;max-height:92vh;overflow:auto}
    .gal-pane img{width:100%;display:block;max-height:62vh;object-fit:cover;border-radius:20px 20px 0 0}
    .gal-pane .row{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 16px;flex-wrap:wrap}
    .gal-link{color:${V2.forestGreen};font-weight:800;text-decoration:none}
    .gal-report{background:none;border:0;color:#8a4b3b;font-size:13px;cursor:pointer;text-decoration:underline;padding:4px}
  `;

  return (
    <>
      <Head>
        <title>Today's Proofs | Proof of Grass</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="description" content="Fresh proofs from the Touch Grass community, from the last 24 hours." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)" }}>
        <V2Nav username={username} onUsernameChange={setUsername} showUpload={() => { window.location.href = "/#upload"; }} />
        <div className="gal-wrap">
          <div className="gal-head">
            <h1>Today's Proofs</h1>
            <p>Fresh grass from the community, from the last 24 hours.</p>
          </div>

          <div className="gal-tabs">
            <button className={"gal-tab" + (scope === "all" ? " on" : "")} onClick={() => setScope("all")}>Everyone</button>
            {signedIn && <button className={"gal-tab" + (scope === "grove" ? " on" : "")} onClick={() => setScope("grove")}><Ico n="group" size={16} inline /> My Grove</button>}
          </div>

          {err && <div className="gal-card"><p>{err}</p><button style={V2Styles.btnPrimary} onClick={() => load(null)}>Try again</button></div>}
          {!err && noGrove && scope === "grove" && <div className="gal-card"><p>You're not in a Grove yet. Join or start one to see your Grove's proofs here.</p><Link href="/groves" style={{ ...V2Styles.btnPrimary, textDecoration: "none", display: "inline-block" }}>Go to Groves</Link></div>}
          {!err && !loading && !noGrove && items.length === 0 && <div className="gal-card"><p>No proofs in the last 24 hours yet. Be the first.</p><Link href="/#upload" style={{ ...V2Styles.btnPrimary, textDecoration: "none", display: "inline-block" }}>Log Proof</Link></div>}

          <div className="gal-grid">{items.map((it) => <Tile key={it.username + it.day} it={it} onOpen={setOpen} onBroken={broken} />)}</div>
          {loading && <p style={{ textAlign: "center", color: "#4b6240", marginTop: 18 }}>Loading…</p>}

          {!signedIn && authStatus !== "loading" && items.length > 0 && (
            <div className="gal-card"><p>Sign in with Google to see everyone's proofs.</p><button style={V2Styles.btnPrimary} onClick={() => signInWithGoogle()}>Continue with Google</button></div>
          )}
          {next && !loading && <button className="gal-tab gal-more" onClick={() => load(next)}>Show more</button>}

          {hidden !== null && (
            <label className="gal-opt"><input type="checkbox" checked={hidden} onChange={toggleHidden} />
              <span>Hide my proofs from this feed. Your photos stay on your profile either way.</span></label>
          )}
        </div>

        {open && (
          <div className="gal-modal" onClick={close}>
            <div className="gal-pane" onClick={(e) => e.stopPropagation()}>
              <img src={open.photo} alt={`Proof from @${open.username}`} />
              <div className="row">
                <div><Link href={`/u/${open.username}`} className="gal-link">@{open.username}</Link><div style={{ fontSize: 13, color: "#4b6240" }}>Day {open.streak} · {open.tier.name} · {ago(open.created_at)}</div></div>
                <button className="gal-tab" onClick={close}>Close</button>
              </div>
              {signedIn && username && open.username !== username && (
                <div className="gal-rx">
                  {[["leaf", "Grass"], ["fire", "Fire"]].map(([k, l]) => (
                    <button key={k} className={"gal-rxb" + (open.mine?.[k] ? " on" : "")} onClick={() => react(open, k)} aria-pressed={!!open.mine?.[k]}>
                      <Ico n={k === "leaf" ? "leaf" : "flame"} size={20} inline /> {open.reactions?.[k] || 0}<span style={{ fontWeight: 600, fontSize: 12.5 }}>{l}</span>
                    </button>
                  ))}
                </div>
              )}
              {reactErr && <div style={{ padding: "0 16px 10px", fontSize: 13, color: "#8a3b2b" }}>{reactErr}</div>}
              {signedIn && username && open.username !== username && (
                <div className="row" style={{ paddingTop: 0 }}>
                  {reportState === "sent" ? <span style={{ fontSize: 13, color: "#4b6240" }}>Thanks, we'll take a look.</span>
                    : <button className="gal-report" disabled={reportState === "sending"} onClick={() => report(open)}>{reportState === "error" ? "Couldn't send, try again" : "Report this photo"}</button>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
