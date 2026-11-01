// /fright-bits — the WAGO: Fright Bits gallery.
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Silhouette from "../../components/frightbits/Silhouette";

const T = { bg: "#0d0818", card: "#1b0e2e", gold: "#f59e0b", text: "#fff", dim: "#c4b5fd" };
const BOX = { background: T.card, border: "1px solid #3a2560", borderRadius: 18, padding: 12, textAlign: "center", textDecoration: "none", color: T.text, display: "block" };

function Countdown({ endsAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = new Date(endsAt) - now; if (!(ms > 0)) return <span>Ended</span>;
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  return <span>{d}d {h}h {m}m {s}s left</span>;
}

export default function FrightBits() {
  const [d, setD] = useState(undefined);
  useEffect(() => { fetch("/api/fright-bits/state", { cache: "no-store" }).then(r => r.json()).then(setD).catch(() => setD(null)); }, []);
  const c = d?.collection;
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "system-ui, sans-serif", padding: "20px clamp(14px,4vw,48px) 60px" }}>
      <Head><title>WAGO: Fright Bits</title><meta name="description" content="Ten one-of-one Halloween monsters hiding in the WAGO Wheel." /></Head>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <Link href="/marketplace" style={{ color: T.dim, fontSize: 13, textDecoration: "none" }}>← Marketplace</Link>
        <h1 style={{ fontSize: "clamp(28px,6vw,44px)", margin: "10px 0 4px" }}>🎃 WAGO: Fright Bits</h1>
        {d === undefined && <p style={{ color: T.dim }}>Loading…</p>}
        {d === null && <p style={{ color: T.dim }}>Couldn’t load right now. Try again in a moment.</p>}
        {d && !c && <p style={{ color: T.dim }}>The monsters aren’t out yet. Check back soon.</p>}
        {c && (<>
          <p style={{ color: T.dim, margin: "0 0 6px" }}>{c.description}</p>
          <p style={{ color: T.gold, fontWeight: 700, margin: "0 0 14px" }}>
            {d.counts.claimed} of {d.counts.total} found · {c.status === "ended" ? "Ended" : c.status === "paused" ? "Paused" : <Countdown endsAt={c.ends_at} />}
          </p>
          <div style={{ background: "#1b0e2e", border: "1px solid #3a2560", borderRadius: 14, padding: "10px 14px", fontSize: 13, color: T.dim, lineHeight: 1.5, marginBottom: 18 }}>
            Each monster exists once. You find them by spinning the WAGO Wheel — {c.max_active} are hiding on the wheel at a time, and when one is found the next steps in. These are in-app collectibles for Proof of Grass: they are not NFTs, can’t be transferred, and have no cash value. Collection ends {new Date(c.ends_at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} ET.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 14 }}>
            {d.items.map(i => {
              const claimed = i.status === "claimed", hidden = i.silhouette, mine = d.mine?.includes(i.slug);
              const inner = (<>
                <div style={{ display: "flex", justifyContent: "center", opacity: claimed ? 0.9 : 1 }}>
                  {hidden ? <Silhouette size={150} /> : <img src={i.image_url} alt={i.name} width={150} height={150} loading="lazy" style={{ width: "100%", maxWidth: 150, height: "auto", aspectRatio: "1/1", objectFit: "contain" }} />}
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, marginTop: 8 }}>{hidden ? `Hidden #${i.number}` : i.name}</div>
                <div style={{ fontSize: 12, color: claimed ? T.gold : T.dim, marginTop: 2 }}>
                  {claimed ? `Found by @${i.owner}${mine ? " (you!)" : ""}` : i.status === "active" ? "On the wheel now" : hidden ? "In reserve" : "Coming up next"}
                </div>
              </>);
              return hidden ? <div key={i.number} style={BOX}>{inner}</div> : <Link key={i.number} href={`/fright-bits/${i.slug}`} style={BOX}>{inner}</Link>;
            })}
          </div>
          {c.status === "active" && c.purchasable && <div style={{ textAlign: "center", marginTop: 26 }}><Link href="/wheel" style={{ background: T.gold, color: "#1b0e2e", fontWeight: 800, padding: "14px 28px", borderRadius: 999, textDecoration: "none", display: "inline-block" }}>Spin the Wheel</Link></div>}
        </>)}
      </div>
    </div>
  );
}
