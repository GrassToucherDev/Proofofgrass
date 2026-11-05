// Internal demo: animated result card → video. Not linked anywhere; noindex.
import Head from "next/head";
import { useState, useRef } from "react";
import { drawProofCard } from "../../utils/proofCardRender";
import { renderAnimatedCard, renderAnimatedFlex, pickRecorderMime } from "../../utils/animatedCard";
import { drawFlexCard } from "../../utils/flexCardRender";
import { getCoverBySlug } from "../../utils/coverDefinitions";
import { Y2K_VARIANTS, fxForVariant } from "../../utils/animatedThemes";

const ld = (src) => new Promise((res) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

export default function AnimatedCardDemo() {
  const [streak, setStreak] = useState(12);
  const [format, setFormat] = useState("9:16");
  const [kind, setKind] = useState("flex");
  const [cover, setCover] = useState("none");
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [url, setUrl] = useState("");
  const fileRef = useRef(null);

  const go = async () => {
    setBusy(true); setErr(""); setRes(null); setProg(0);
    try {
      if (!pickRecorderMime()) throw new Error("This browser can't record video from a canvas.");
      const f = fileRef.current?.files?.[0];
      const fmt = kind === "flex" && format === "4:5" ? "1:1" : format;
      const W = 1080, H = fmt === "9:16" ? 1920 : fmt === "4:5" ? 1350 : 1080;
      const variant = cover === "none" ? null : Y2K_VARIANTS[cover];
      const fx = fxForVariant(variant, W, H);
      const coverDef = cover === "none" ? null : getCoverBySlug(cover);
      let bgImg = coverDef?.imageUrl ? await ld(coverDef.imageUrl) : null;
      if (!bgImg) bgImg = await ld(f ? URL.createObjectURL(f) : "/card/bg-sunset.jpg");
      let r;
      if (kind === "flex") {
        const fg = document.createElement("canvas"); fg.width = 1080; fg.height = 1080; // transparent: cover art is animated behind it
        await drawFlexCard(fg.getContext("2d"), 1080, 1080, { username: "grasstoucherdev", streak: Number(streak) || 1, grassScore: 4280, rank: 12, best: Number(streak) || 1, tierTitle: "ROOTED", avatarUrl: null, theme: coverDef || {} }, ld);
        r = await renderAnimatedFlex(fg, { bgImage: bgImg, format: fmt, seconds: 4, fx, headline: `Day ${Number(streak) || 1} Streak`, onProgress: setProg });
      } else {
        const photo = f ? await ld(URL.createObjectURL(f)) : await ld("/card/bg-sunset.jpg");
        const c = document.createElement("canvas"); c.width = 1600; c.height = 1200;
        await drawProofCard(c.getContext("2d"), 1600, 1200, { photo, streak: Number(streak) || 1, dateStr: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), topPct: 10, location: "", username: "grasstoucherdev" });
        r = await renderAnimatedCard(c, { format: fmt, seconds: 4, headline: `Day ${Number(streak) || 1} Locked In`, bgImage: variant ? bgImg : undefined, fx, confetti: !variant, onProgress: setProg });
      }
      if (!r) throw new Error("Could not create the video.");
      if (url) URL.revokeObjectURL(url);
      setUrl(URL.createObjectURL(r.blob)); setRes(r);
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  };
  const share = async () => {
    const file = new File([res.blob], `proof-of-grass-card.${res.ext}`, { type: res.blob.type });
    try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: "Day streak on Proof of Grass" }); else throw 0; }
    catch { const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); }
  };
  const btn = { border: "none", borderRadius: 999, padding: "14px 20px", fontWeight: 800, fontSize: 15, cursor: "pointer", background: "linear-gradient(135deg,#7dc832,#5ba622)", color: "#fff", fontFamily: "inherit" };
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16, fontFamily: "Nunito,system-ui,sans-serif", color: "#12380a" }}>
      <Head><title>Animated card demo</title><meta name="robots" content="noindex" /></Head>
      <h1 style={{ fontFamily: "Fredoka,system-ui,sans-serif" }}>Animated card demo</h1>
      <p style={{ color: "#2d5a1a" }}>Builds a 4-second video of the result card right in your browser. Try it on your phone.</p>
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <label>Card <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ padding: 8, marginLeft: 8 }}><option value="flex">Flex card</option><option value="proof">Result card</option></select></label>
        <label>Theme <select value={cover} onChange={(e) => setCover(e.target.value)} style={{ padding: 8, marginLeft: 8 }}><option value="none">Default (free)</option>{Object.keys(Y2K_VARIANTS).map((s) => <option key={s} value={s}>Y2K · {s.replace("marketplace_", "").replace(/_/g, " ")}</option>)}</select></label>
        <label>Streak day <input type="number" min="1" value={streak} onChange={(e) => setStreak(e.target.value)} style={{ padding: 8, marginLeft: 8, width: 80 }} /></label>
        <label>Format <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ padding: 8, marginLeft: 8 }}><option value="9:16">9:16 (TikTok, Reels, Stories)</option><option value="4:5">4:5 / square (X, Instagram feed)</option></select></label>
        <label>Photo (optional) <input ref={fileRef} type="file" accept="image/*" /></label>
        <button style={{ ...btn, opacity: busy ? .6 : 1 }} disabled={busy} onClick={go}>{busy ? `Recording… ${Math.round(prog * 100)}%` : "Make animated card"}</button>
      </div>
      {err && <div role="alert" style={{ color: "#b3261e", fontWeight: 700 }}>{err}</div>}
      {res && (<div>
        <video src={url} controls playsInline loop autoPlay muted style={{ width: "100%", borderRadius: 16, background: "#000" }} />
        <p style={{ fontSize: 13 }}>{res.mime.split(";")[0]} · {res.width}×{res.height} · {(res.blob.size / 1048576).toFixed(2)} MB · {res.seconds}s</p>
        <button style={btn} onClick={share}>Share / Save video</button>
      </div>)}
    </div>
  );
}
