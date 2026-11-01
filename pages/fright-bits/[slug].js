// /fright-bits/[slug] — one collectible: art, description, owner status, share.
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { shareFrightBits } from "../../utils/frightBitsCard";

export default function FrightBitsDetail() {
  const { query } = useRouter();
  const [d, setD] = useState(undefined);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/fright-bits/state", { cache: "no-store" }).then(r => r.json()).then(setD).catch(() => setD(null)); }, []);
  const i = d?.items?.find(x => x.slug === query.slug && !x.silhouette);
  const mine = i && d.mine?.includes(i.slug);
  return (
    <div style={{ minHeight: "100vh", background: "#0d0818", color: "#fff", fontFamily: "system-ui, sans-serif", padding: "20px clamp(14px,4vw,48px) 60px" }}>
      <Head><title>{i ? i.name : "WAGO: Fright Bits"}</title></Head>
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <Link href="/fright-bits" style={{ color: "#c4b5fd", fontSize: 13, textDecoration: "none", display: "block", textAlign: "left" }}>← All monsters</Link>
        {d === undefined && <p style={{ color: "#c4b5fd" }}>Loading…</p>}
        {d !== undefined && !i && <p style={{ color: "#c4b5fd", marginTop: 40 }}>This monster is still hiding.</p>}
        {i && (<>
          <div style={{ background: "radial-gradient(circle,#3a1a5c,#12081f)", borderRadius: 24, padding: 20, margin: "16px 0" }}>
            <img src={i.image_url} alt={i.name} style={{ width: "100%", maxWidth: 380, aspectRatio: "1/1", objectFit: "contain" }} />
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 30 }}>{i.name}</h1>
          <div style={{ color: "#c4b5fd", fontWeight: 700 }}>{i.character} · Rare · 1 of 1 · No. {i.number} of {d.counts.total}</div>
          <p style={{ color: "#e6dcff", fontStyle: "italic", margin: "14px 0" }}>{i.description}</p>
          <div style={{ color: "#f59e0b", fontWeight: 800, marginBottom: 16 }}>
            {i.status === "claimed" ? `Found by @${i.owner}${mine ? " — that’s you!" : ""}` : i.status === "active" ? "Hiding on the WAGO Wheel right now" : "Waiting in reserve"}
          </div>
          {i.status === "claimed" && <button disabled={busy} onClick={async () => { setBusy(true); try { await shareFrightBits(i, i.owner); } finally { setBusy(false); } }}
            style={{ background: "#f59e0b", color: "#1b0e2e", border: 0, fontWeight: 800, padding: "13px 26px", borderRadius: 999, cursor: "pointer", fontSize: 15 }}>{busy ? "Making card…" : "Share card"}</button>}
          <p style={{ fontSize: 12, color: "#9d8bc4", marginTop: 20 }}>In-app collectible for Proof of Grass. Not an NFT, not transferable, no cash value.</p>
        </>)}
      </div>
    </div>
  );
}
