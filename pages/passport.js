// pages/passport.js — WAGO Passport: connect the wallet you minted with, see your verified WAGO Origins and
// Screen Touchers, pick a cover, and download a 1600×900 Passport image. Ownership is verified server-side
// (/api/passport/collection). No Proof of Grass account is needed.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { cleanDisplayName, DEFAULT_NAME, NAME_MAX, pickCover, sortPieces } from "../utils/passport";
import { renderPassport, canvasToBlob, PP } from "../utils/passportCard";

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const artUrl = (id) => `/api/passport/image?mint=${encodeURIComponent(id)}`;

export default function PassportPage() {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const addr = connected && publicKey ? publicKey.toBase58() : null;

  const [state, setState] = useState({ status: "idle" });   // idle | loading | ok | not_configured | lookup_failed
  const [refreshing, setRefreshing] = useState(false);
  const [coverId, setCoverId] = useState(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [checkedOnce, setCheckedOnce] = useState(false);
  const reqId = useRef(0);

  // One lookup per wallet. A newer request (wallet switch, refresh) makes any older answer ignored.
  const load = useCallback(async (wallet, { quiet = false } = {}) => {
    const id = ++reqId.current;
    if (quiet) setRefreshing(true); else setState({ status: "loading" });
    try {
      const r = await fetch(`/api/passport/collection?wallet=${encodeURIComponent(wallet)}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (id !== reqId.current) return;
      if (r.ok && j.status === "ok") setState({ status: "ok", origins: j.origins || [], screenTouchers: j.screenTouchers || [], pog: j.pog || null });
      else if (j.status === "not_configured") setState({ status: "not_configured" });
      else setState((s) => (quiet && s.status === "ok" ? { ...s, refreshError: true } : { status: "lookup_failed" }));
    } catch {
      if (id !== reqId.current) return;
      setState((s) => (quiet && s.status === "ok" ? { ...s, refreshError: true } : { status: "lookup_failed" }));
    } finally { if (id === reqId.current) { setRefreshing(false); setCheckedOnce(true); } }
  }, []);

  // Wallet connected / switched / disconnected: drop the previous collector's art and name immediately.
  useEffect(() => {
    reqId.current++;
    setState({ status: "idle" }); setCoverId(null); setName(""); setEditing(false); setNote(""); setRefreshing(false); setCheckedOnce(false);
    if (!addr) return;
    setCoverId(store.get(`passport_cover:${addr}`));
    setName(cleanDisplayName(store.get(`passport_name:${addr}`)));
    load(addr);
  }, [addr, load]);

  const pieces = useMemo(() => (state.status === "ok" ? sortPieces([...(state.origins || []), ...(state.screenTouchers || [])]) : []), [state]);
  const cover = state.status === "ok" ? pickCover(pieces, coverId) : null;
  const displayName = name || state.pog?.username || DEFAULT_NAME;
  const originsN = state.origins?.length || 0, stN = state.screenTouchers?.length || 0;
  const stats = [{ value: originsN, label: originsN === 1 ? "Origin" : "Origins" }, { value: stN, label: stN === 1 ? "Screen Toucher" : "Screen Touchers" }];
  if (state.pog) { stats.push({ value: state.pog.proofs, label: "Outdoor Proofs" }, { value: state.pog.streak, label: "Day Streak" }); }

  const pickCoverId = (id) => { setCoverId(id); if (addr) store.set(`passport_cover:${addr}`, id); };
  const saveName = (v) => { const n = cleanDisplayName(v); setName(n); if (addr) store.set(`passport_name:${addr}`, n); setEditing(false); };

  async function download() {
    if (!cover || busy) return;
    setBusy(true); setNote("");
    try {
      const canvas = await renderPassport({
        piece: { name: cover.name, artUrl: artUrl(cover.id) }, displayName,
        edition: cover.collection === "origins" ? "Origins Edition" : "Screen Touchers", stats,
      });
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "wago-passport.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { setNote("Couldn't build the image. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  const ready = state.status === "ok";
  const empty = ready && pieces.length === 0;

  return (
    <div className="pp-root">
      <Head>
        <title>WAGO Passport | Touch Grass</title>
        <meta name="description" content="Connect your wallet to see your verified WAGO Origins and Screen Touchers and download your WAGO Passport." />
      </Head>
      <style>{CSS}</style>

      <header className="pp-top">
        <div className="pp-top-in">
          <Link href="/" className="pp-brand"><img src="/mascot/wago-wave.webp" alt="" width="34" height="34" /><span>TOUCH GRASS</span></Link>
          <div className="pp-top-r">
            {addr ? (
              <>
                <span className="pp-pill" data-testid="wallet-pill"><i className="pp-dot" /><span className="pp-w">Wallet&nbsp;</span>connected</span>
                <button className="pp-link" onClick={() => disconnect().catch(() => {})}>Disconnect</button>
              </>
            ) : (
              <button className="pp-btn pp-btn-sm" onClick={() => setVisible(true)} disabled={connecting}>{connecting ? "Connecting…" : "Connect wallet"}</button>
            )}
          </div>
        </div>
      </header>

      <main className="pp-main">
        <div className="pp-head">
          <div>
            <h1 className="pp-h1">WAGO Passport</h1>
            <p className="pp-sub">Your collection. Your time outside.</p>
          </div>
          {ready && !empty && (
            <div className="pp-head-btns">
              <button className="pp-btn pp-btn-ghost" onClick={() => setEditing((e) => !e)}>Edit name</button>
              <button className="pp-btn" onClick={download} disabled={busy} data-testid="download">{busy ? "Building…" : "Download Passport"}</button>
            </div>
          )}
        </div>

        {!addr && (
          <section className="pp-panel pp-welcome" data-testid="state-disconnected">
            <img src="/mascot/wago-camera.webp" alt="" className="pp-welcome-img" />
            <div>
              <h2 className="pp-h2">Connect the wallet you minted with</h2>
              <p className="pp-p">Mint a WAGO Origin on LaunchMyNFT, then come back and connect the same Solana wallet. Your art shows up right after the mint, with no reveal wait. No Proof of Grass account needed.</p>
              <button className="pp-btn" onClick={() => setVisible(true)}>Connect wallet</button>
              <p className="pp-fine">On a phone, open this page inside your wallet app&apos;s browser (Phantom or Solflare) if the connect button finds no wallet.</p>
            </div>
          </section>
        )}

        {addr && state.status === "loading" && (
          <section className="pp-panel pp-skel" data-testid="state-loading" aria-busy="true"><div className="pp-skel-art" /><div className="pp-skel-lines"><i /><i /><i /></div></section>
        )}

        {addr && state.status === "not_configured" && (
          <section className="pp-panel" data-testid="state-not-configured">
            <h2 className="pp-h2">Passport is almost ready</h2>
            <p className="pp-p">The collection connection isn&apos;t switched on yet. Check back soon.</p>
          </section>
        )}

        {addr && state.status === "lookup_failed" && (
          <section className="pp-panel" data-testid="state-error">
            <h2 className="pp-h2">Couldn&apos;t read your wallet</h2>
            <p className="pp-p">The collection lookup didn&apos;t go through. Your wallet is still connected.</p>
            <button className="pp-btn" onClick={() => load(addr)}>Try again</button>
          </section>
        )}

        {empty && (
          <section className="pp-panel" data-testid="state-empty">
            <h2 className="pp-h2">No WAGO Origins or Screen Touchers in this wallet yet</h2>
            <p className="pp-p">Just minted? A brand-new NFT can take a minute or two to show up in the collection index. Your mint is safe, we just can&apos;t see it yet. Tap Refresh collection and it will appear when it&apos;s indexed. You don&apos;t need to reconnect.</p>
            <button className="pp-btn" onClick={() => load(addr, { quiet: true })} disabled={refreshing} data-testid="refresh">{refreshing ? "Checking…" : "Refresh collection"}</button>
            {checkedOnce && !refreshing && <p className="pp-fine">Checked the connected wallet just now. If you minted with a different wallet, switch wallets in your wallet app.</p>}
            {state.refreshError && <p className="pp-fine pp-err">That refresh didn&apos;t go through. Try again in a moment.</p>}
          </section>
        )}

        {ready && !empty && cover && (
          <>
            <section className="pp-card" data-testid="passport-card">
              <div className="pp-art">
                <img key={cover.id} src={artUrl(cover.id)} alt={cover.name} data-testid="cover-art" />
                <div className="pp-plate">{cover.name}</div>
              </div>
              <div className="pp-info">
                <div className="pp-eyebrow"><i />{cover.collection === "origins" ? "Origins Edition" : "Screen Touchers"}<i /></div>
                {editing ? (
                  <form className="pp-edit" onSubmit={(e) => { e.preventDefault(); saveName(e.currentTarget.elements.n.value); }}>
                    <input name="n" defaultValue={name} maxLength={NAME_MAX} placeholder={DEFAULT_NAME} autoFocus aria-label="Display name" />
                    <button className="pp-btn pp-btn-sm" type="submit">Save</button>
                  </form>
                ) : <h2 className="pp-name" data-testid="display-name">{displayName}</h2>}
                <div className="pp-stats">
                  {stats.map((s) => (<div key={s.label} className="pp-stat"><b>{s.value}</b><span>{s.label}</span></div>))}
                </div>
                {!state.pog && <p className="pp-fine">Have a Proof of Grass account? Verify this wallet on your profile and your streak shows up here.</p>}
                {!editing && <button className="pp-link pp-edit-m" onClick={() => setEditing(true)}>Edit name</button>}
                {note && <p className="pp-fine pp-err" role="alert">{note}</p>}
              </div>
            </section>

            <section className="pp-coll" data-testid="collection">
              <div className="pp-coll-h">
                <h3>My Collection</h3>
                <button className="pp-link" onClick={() => load(addr, { quiet: true })} disabled={refreshing} data-testid="refresh-small">{refreshing ? "Checking…" : "Refresh collection"}</button>
              </div>
              {state.refreshError && <p className="pp-fine pp-err">That refresh didn&apos;t go through. Try again in a moment.</p>}
              <div className="pp-thumbs">
                {pieces.map((p) => (
                  <button key={p.id} className={"pp-thumb" + (p.id === cover.id ? " on" : "")} onClick={() => pickCoverId(p.id)} aria-pressed={p.id === cover.id} aria-label={`Use ${p.name} as cover`}>
                    <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    {p.id === cover.id && <em>Cover</em>}
                    <span>{p.name}</span>
                    <small>{p.collection === "origins" ? "WAGO Origins" : "Screen Toucher"}</small>
                  </button>
                ))}
              </div>
              <p className="pp-fine">Verified on-chain for the connected wallet. Tap a piece to make it your cover.</p>
            </section>
          </>
        )}
      </main>

      {ready && !empty && cover && (
        <div className="pp-dock"><button className="pp-btn pp-btn-wide" onClick={download} disabled={busy}>{busy ? "Building…" : "Download Passport"}</button></div>
      )}
    </div>
  );
}

const CSS = `
.pp-root{--cream:${PP.cream};--paper:${PP.paper};--forest:${PP.forest};--mid:${PP.forestMid};--orange:${PP.orange};--sun:${PP.sun};--gold:${PP.gold};--ink:${PP.ink};
  min-height:100vh;background:linear-gradient(180deg,#f8efd6 0%,#f1e3bd 70%,#e3d9a8 100%);color:var(--ink);font-family:Nunito,system-ui,sans-serif;position:relative;overflow-x:hidden}
.pp-root:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(900px 380px at 88% -4%,rgba(246,169,59,.35),transparent 70%),linear-gradient(180deg,transparent 70%,rgba(31,92,54,.14))}
.pp-top{background:var(--forest);color:#f7efd2;position:relative;z-index:2}
.pp-top-in{max-width:1180px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.pp-brand{display:flex;align-items:center;gap:10px;color:#fbf1cf;text-decoration:none;font:700 20px Fredoka,Nunito,sans-serif;letter-spacing:.02em}
.pp-top-r{display:flex;align-items:center;gap:12px}
.pp-pill{display:inline-flex;align-items:center;gap:8px;border:1.5px solid rgba(251,241,207,.7);border-radius:999px;padding:7px 14px;font-weight:700;font-size:13px}
.pp-dot{width:8px;height:8px;border-radius:50%;background:#7dd35a;display:inline-block}
.pp-link{background:none;border:0;color:inherit;font:700 13px Nunito,sans-serif;text-decoration:underline;cursor:pointer;padding:6px 2px}
.pp-top .pp-link{color:#f7efd2}.pp-coll .pp-link{color:var(--mid)}
.pp-main{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:26px 16px 120px}
.pp-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.pp-h1{margin:0;font:800 clamp(34px,6vw,58px)/1.05 Fraunces,Georgia,serif;color:var(--forest);padding-left:16px;border-left:6px solid #7a9a2b}
.pp-sub{margin:6px 0 0 22px;font:600 clamp(16px,2.4vw,22px) Fraunces,Georgia,serif;color:#5e7a2a;font-style:italic}
.pp-head-btns{display:flex;gap:10px;flex-wrap:wrap}
.pp-btn{border:0;border-radius:14px;background:linear-gradient(180deg,#1f6a3d,#12402a);color:#fff;font:800 16px Nunito,sans-serif;padding:14px 24px;cursor:pointer;box-shadow:0 3px 0 #0b2b1b,0 8px 16px rgba(18,64,42,.25);min-height:48px}
.pp-btn:disabled{opacity:.6;cursor:default}
.pp-btn-sm{padding:9px 16px;min-height:40px;font-size:14px}
.pp-btn-ghost{background:transparent;color:var(--forest);border:2px solid var(--forest);box-shadow:none}
.pp-btn-wide{width:100%}
.pp-panel{background:var(--paper);border:2px solid var(--gold);border-radius:26px;padding:28px 24px;box-shadow:0 12px 30px rgba(18,64,42,.14)}
.pp-h2{margin:0 0 10px;font:800 clamp(22px,3.6vw,30px)/1.15 Fraunces,Georgia,serif;color:var(--forest)}
.pp-p{margin:0 0 16px;font-size:16px;line-height:1.6;max-width:62ch}
.pp-fine{margin:12px 0 0;font-size:13px;line-height:1.5;color:#6b5a3a}.pp-err{color:#a3361b;font-weight:700}
.pp-welcome{display:flex;gap:24px;align-items:center;flex-wrap:wrap}.pp-welcome-img{width:190px;max-width:40%;height:auto}.pp-welcome>div{flex:1 1 280px;min-width:0}
.pp-card{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:0;background:var(--paper);border:3px solid var(--gold);border-radius:30px;padding:18px;box-shadow:0 18px 40px rgba(18,64,42,.2)}
.pp-art{position:relative;border-radius:22px;overflow:hidden;background:var(--forest);aspect-ratio:1/1;border:4px solid var(--forest)}
.pp-art img{width:100%;height:100%;object-fit:cover;display:block}
.pp-plate{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);max-width:88%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:var(--forest);color:#fbf1cf;border:2.5px solid var(--sun);border-radius:14px;padding:9px 22px;font:800 clamp(13px,2.2vw,22px) Fraunces,Georgia,serif;letter-spacing:.04em;text-transform:uppercase}
.pp-info{padding:12px 18px 10px 30px;display:flex;flex-direction:column;justify-content:center;gap:14px;min-width:0}
.pp-eyebrow{display:flex;align-items:center;gap:14px;font:800 13px Nunito,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:var(--orange)}
.pp-eyebrow i{flex:1;height:2px;background:rgba(18,64,42,.3)}
.pp-name{margin:0;font:800 clamp(34px,5.4vw,60px)/1.02 Fraunces,Georgia,serif;color:var(--forest);overflow-wrap:anywhere}
.pp-edit{display:flex;gap:10px;flex-wrap:wrap}.pp-edit input{flex:1 1 180px;min-width:0;border:2px solid var(--forest);border-radius:12px;padding:11px 14px;font:700 18px Nunito,sans-serif;background:#fff;color:var(--ink)}
.pp-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.pp-stat{border:1.5px solid rgba(18,64,42,.3);border-radius:16px;background:rgba(255,255,255,.55);text-align:center;padding:12px 8px}
.pp-stat b{display:block;font:800 clamp(28px,4vw,40px)/1.1 Fraunces,Georgia,serif;color:var(--forest)}.pp-stat span{font-weight:700;font-size:14px;color:var(--mid)}
.pp-edit-m{display:none;align-self:flex-start;color:var(--mid)}
.pp-coll{margin-top:22px;background:var(--paper);border:2px solid rgba(201,150,47,.7);border-radius:24px;padding:18px 18px 16px}
.pp-coll-h{display:flex;justify-content:space-between;align-items:center;gap:10px}.pp-coll-h h3{margin:0;font:800 24px Fraunces,Georgia,serif;color:var(--forest)}
.pp-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:12px;margin-top:12px}
.pp-thumb{position:relative;text-align:left;background:#fff;border:2px solid rgba(18,64,42,.2);border-radius:16px;padding:6px 6px 8px;cursor:pointer;font-family:inherit;color:inherit}
.pp-thumb.on{border-color:var(--orange);box-shadow:0 0 0 2px rgba(236,123,31,.3)}
.pp-thumb img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:11px;display:block;background:#e8dfbd}
.pp-thumb em{position:absolute;top:10px;left:10px;background:var(--orange);color:#fff;border-radius:999px;font:800 11px Nunito,sans-serif;font-style:normal;padding:3px 9px}
.pp-thumb span{display:block;margin-top:6px;font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pp-thumb small{color:#6b5a3a;font-weight:700;font-size:11px}
.pp-skel{display:flex;gap:24px;flex-wrap:wrap}.pp-skel-art{width:min(100%,360px);aspect-ratio:1/1;border-radius:22px;background:linear-gradient(90deg,#eadfba,#f6edcf,#eadfba);background-size:200% 100%;animation:pp-sh 1.4s infinite linear}
.pp-skel-lines{flex:1 1 220px;display:flex;flex-direction:column;gap:14px;justify-content:center}.pp-skel-lines i{height:26px;border-radius:10px;background:#eadfba}
@keyframes pp-sh{to{background-position:-200% 0}}
.pp-dock{display:none}
@media(max-width:760px){
  .pp-card{grid-template-columns:1fr;padding:12px;border-radius:24px}
  .pp-info{padding:16px 6px 6px}.pp-eyebrow{letter-spacing:.2em}
  .pp-head-btns{display:none}
  .pp-edit-m{display:block}
  .pp-dock{display:block;position:fixed;left:0;right:0;bottom:0;z-index:20;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:linear-gradient(180deg,rgba(248,239,214,0),rgba(248,239,214,.96) 35%)}
  .pp-brand span{font-size:16px;white-space:nowrap}.pp-pill{padding:6px 10px;font-size:12px;white-space:nowrap}.pp-w{display:none}.pp-top-in{gap:8px}
}
`;
