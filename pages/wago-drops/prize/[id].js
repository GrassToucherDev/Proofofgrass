import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import { T } from "../../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../../components/wago-drops/WagoDropsNav";
import { SponsorLine } from "../../../components/wago-drops/PrizeUI";

function dist(a, b, c, d) {
  const r = Math.PI / 180, R = 6371000;
  const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function PrizePage() {
  const { id } = useRouter().query;
  const { data: session } = useSession();
  const [p, setP] = useState(null);
  const [missing, setMissing] = useState(false);
  const [pos, setPos] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(q => setPos({ lat: q.coords.latitude, lng: q.coords.longitude }), () => {});
  }, []);

  function load() {
    if (!id) return;
    const q = pos ? `?userLat=${pos.lat}&userLng=${pos.lng}` : "";
    fetch(`/api/wago-drops/prizes/${id}${q}`).then(r => { if (!r.ok) throw 0; return r.json(); }).then(setP).catch(() => setMissing(true));
  }
  useEffect(load, [id, pos]);

  async function claim() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/wago-drops/prizes/claim", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizeId: id, code, userLat: pos.lat, userLng: pos.lng }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not claim.");
      setMsg({ ok: true, text: "You found it! 🎉" }); setCode(""); load();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  }

  const d = p && pos ? Math.round(dist(pos.lat, pos.lng, p.lat, p.lng)) : null;
  const inRange = d !== null && p && d <= p.claim_radius_m;
  const open = p && !p.ended && p.remaining > 0;
  const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 14 };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
      <Head><title>{p ? `${p.title} — WAGO Prize` : "WAGO Prize"}</title></Head>
      <WagoDropsNav session={session} />
      <WagoDropsBottomNav />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px clamp(14px,4vw,32px) 90px" }}>
        <Link href="/wago-drops/prizes" style={{ fontSize: 13, color: T.green, textDecoration: "none", fontWeight: 700 }}>← All prizes</Link>
        {missing && <div style={{ padding: "60px 0", textAlign: "center", color: T.muted }}>Prize not found.</div>}
        {p && (
          <div style={{ marginTop: 12 }}>
            <div style={card}>
              {p.image_url && <img src={p.image_url} alt={p.title} style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />}
              <h1 style={{ fontSize: 24, margin: "0 0 4px", lineHeight: 1.2, wordBreak: "break-word" }}>{p.title}</h1>
              {p.value_text && <div style={{ fontSize: 15, color: T.green, fontWeight: 700, marginBottom: 6 }}>{p.value_text}</div>}
              {p.description && <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.5, margin: "0 0 10px" }}>{p.description}</p>}
              {p.sponsor_url
                ? <a href={p.sponsor_url} target="_blank" rel="noopener noreferrer nofollow" style={{ textDecoration: "none", color: "inherit" }}><SponsorLine p={p} size={13} /></a>
                : <SponsorLine p={p} size={13} />}
              <div style={{ fontSize: 12.5, color: T.dim, marginTop: 10 }}>
                {p.remaining} of {p.total} left to find{p.ends_at ? ` · ends ${new Date(p.ends_at).toLocaleDateString()}` : ""}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: T.dim, marginBottom: 6 }}>Where</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{p.hint || `Get within ${p.reveal_radius_m}m to reveal the hint`}</div>
              <div style={{ fontSize: 13, color: inRange ? T.green : T.muted, marginTop: 6 }}>
                {d === null ? "Turn on location to see how far you are." : inRange ? "You're in range ✓" : `${d < 1000 ? d + "m" : (d / 1000).toFixed(1) + "km"} away. Get within ${p.claim_radius_m}m.`}
              </div>
              <Link href={`/wago-drops?flyTo=${p.lat},${p.lng}`} style={{ display: "inline-block", marginTop: 8, fontSize: 13, color: T.green, fontWeight: 700, textDecoration: "none" }}>🗺️ View on map</Link>
            </div>

            {p.you_found && <div style={{ ...card, borderColor: "rgba(74,222,128,0.4)", color: T.green, fontWeight: 700 }}>🎉 You found this prize! The sponsor's details are on this page. If it needs shipping, we'll ask you first.</div>}

            {!p.you_found && open && (
              <div style={card}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: T.dim, marginBottom: 6 }}>Enter the code</div>
                {!session ? (
                  <button onClick={() => signIn("google")} style={{ width: "100%", background: T.olive, color: "#fff", border: "none", borderRadius: 999, padding: 13, fontSize: 15, fontWeight: 700 }}>Sign in to claim</button>
                ) : (
                  <>
                    <input value={code} onChange={e => setCode(e.target.value)} placeholder="XXXX-XXXX" autoCapitalize="characters" autoComplete="off"
                      style={{ width: "100%", boxSizing: "border-box", fontSize: 18, letterSpacing: "0.12em", textAlign: "center", padding: 12, borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.white, marginBottom: 10 }} />
                    <button onClick={claim} disabled={!inRange || code.replace(/[^a-z0-9]/gi, "").length < 6 || busy}
                      style={{ width: "100%", border: "none", borderRadius: 999, padding: 13, fontSize: 15, fontWeight: 700, color: "#fff", background: inRange && code.length >= 6 ? T.olive : T.border, cursor: "pointer" }}>
                      {busy ? "Checking…" : !pos ? "Enable location to claim" : !inRange ? "Get closer to claim" : "Claim prize"}
                    </button>
                  </>
                )}
                {msg && <div style={{ marginTop: 10, fontSize: 13.5, color: msg.ok ? T.green : T.red }}>{msg.text}</div>}
              </div>
            )}
            {!open && !p.you_found && <div style={{ ...card, color: T.muted }}>{p.ended ? "This prize has ended." : "All of these have been found."}</div>}

            {p.finders.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: T.dim, marginBottom: 8 }}>Found by</div>
                {p.finders.map((f, i) => (
                  <div key={i} style={{ fontSize: 14, padding: "3px 0" }}>🌿 <b>{f.name}</b> <span style={{ color: T.dim, fontSize: 12 }}>· {new Date(f.at).toLocaleDateString()}</span></div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11.5, color: T.dim }}>Prizes are provided by the sponsor. <a href="/prize-rules" style={{ color: T.green }}>Prize Rules</a></p>
          </div>
        )}
      </div>
    </div>
  );
}
