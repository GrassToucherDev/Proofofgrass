// Shared pieces for The Yard. Uses the V2 design tokens: no private theme.
import { useState } from "react";
import Link from "next/link";
import { V2, V2Styles } from "../../utils/v2Theme";
import { describe, fmtDate } from "../../utils/yardStatus";
import { yardError } from "../../utils/yardErrors";
import { yardPost } from "../../hooks/useYard";

export const yardCSS = `
  .yd-wrap { max-width: 1180px; margin: 0 auto; padding: 0 clamp(14px,4vw,32px) 80px; }
  .yd-hero { position: relative; border-radius: 28px; overflow: hidden; min-height: 330px; margin-top: 12px;
    background: ${V2.gradientSky}; box-shadow: ${V2.shadowMd}; }
  .yd-hero-art { position: absolute; inset: 0 0 0 38%; background: url(/yard/hero.webp) right center / cover no-repeat; }
  .yd-hero-art { -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.55) 22%, #000 52%); mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.55) 22%, #000 52%); }
  .yd-hero-copy { position: relative; z-index: 2; padding: 34px clamp(20px,4vw,44px) 96px; max-width: 580px; }
  .yd-eyebrow { display:inline-flex; align-items:center; gap:8px; background:#fff; border-radius:9999px; padding:8px 16px; font-size:11px; font-weight:700; letter-spacing:.16em; color:${V2.forestLight}; box-shadow:${V2.shadowSm}; }
  .yd-h1 { font-size: clamp(44px,7vw,72px); font-weight: 800; line-height: 1; margin: 16px 0 12px; color:${V2.forestGreen}; letter-spacing:-0.02em; }
  .yd-lead { font-size: clamp(15px,2vw,18px); font-weight: 500; line-height: 1.5; color:${V2.textBody}; max-width: 520px; }
  .yd-ctas { display:flex; gap:12px; flex-wrap:wrap; margin-top: 22px; }
  .yd-btn { min-height: 48px; }
  .yd-stats { position: relative; z-index: 3; display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: -64px 0 0; padding: 0 clamp(10px,2vw,24px); }
  .yd-stat { background:#fff; border-radius:20px; padding:16px 18px; display:flex; align-items:center; gap:14px; box-shadow:${V2.shadowMd}; min-height:84px; }
  .yd-stat-n { font-size: 26px; font-weight: 800; line-height: 1.05; color:${V2.forestGreen}; }
  .yd-stat-l { font-size: 11px; font-weight: 700; letter-spacing:.12em; text-transform:uppercase; color:${V2.dimGray}; margin-top:2px; }
  .yd-features { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:16px; margin-top: 22px; }
  .yd-feature { background:#fff; border-radius:22px; overflow:hidden; display:flex; box-shadow:${V2.shadowSm}; min-height:150px; }
  .yd-feature-art { width: 40%; flex: none; background-size: cover; background-position: center; -webkit-mask-image: linear-gradient(90deg,#000 70%,transparent); mask-image: linear-gradient(90deg,#000 70%,transparent); }
  .yd-feature-body { padding: 16px 16px 16px 6px; display:flex; flex-direction:column; gap:6px; justify-content:center; min-width:0; }
  .yd-section { margin-top: 34px; }
  .yd-h2 { font-size: 22px; font-weight: 800; color:${V2.forestGreen}; margin-bottom: 12px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  .yd-card { background:#fff; border-radius:20px; padding:16px 18px; box-shadow:${V2.shadowSm}; border:1px solid ${V2.borderSoft}; }
  .yd-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:14px; }
  .yd-pill { display:inline-flex; align-items:center; gap:6px; border-radius:9999px; padding:5px 12px; font-size:12px; font-weight:700; white-space:nowrap; }
  .yd-tabs { display:flex; gap:8px; overflow-x:auto; padding:4px 2px 10px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .yd-tabs::-webkit-scrollbar { display:none; }
  .yd-tab { min-height:44px; padding:0 18px; border-radius:9999px; border:1.5px solid ${V2.borderSoft}; background:rgba(255,255,255,.7); font-family:inherit; font-size:14px; font-weight:700; color:${V2.forestMid}; cursor:pointer; white-space:nowrap; }
  .yd-tab[aria-selected="true"] { background:${V2.gradientGrassBtn}; color:#fff; border-color:transparent; }
  .yd-btn-sm { min-height:44px; padding:0 18px; font-size:13px; }
  .yd-row { display:flex; align-items:center; gap:12px; padding:12px 6px; border-bottom:1px solid ${V2.softGray}; min-height:56px; }
  .yd-row:last-child { border-bottom:none; }
  .yd-sheet-bg { position:fixed; inset:0; z-index:500; background:rgba(13,42,5,.45); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px; }
  .yd-sheet { background:#fff; border-radius:26px; width:100%; max-width:480px; max-height:92vh; overflow-y:auto; padding:24px 22px 26px; box-shadow:0 24px 70px rgba(26,74,10,.28); }
  .yd-focus:focus-visible, .yd-tab:focus-visible, button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid ${V2.grassLime}; outline-offset: 2px; }
  @media (max-width: 960px) {
    .yd-features { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:12px; padding-bottom:6px; margin-right:calc(-1 * clamp(14px,4vw,32px)); padding-right:clamp(14px,4vw,32px); scrollbar-width:none; }
    .yd-features::-webkit-scrollbar { display:none; }
    .yd-feature { flex: 0 0 84%; scroll-snap-align:start; }
    .yd-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 640px) {
    .yd-hero { min-height: 0; }
    .yd-hero-art { position: relative; inset:auto; height: 190px; background-position: 82% center; }
    .yd-hero-art { -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent 100%); mask-image: linear-gradient(180deg, #000 55%, transparent 100%); }
    .yd-hero-copy { padding: 4px 20px 84px; }
    .yd-stats { margin-top: -62px; gap: 10px; padding: 0 10px; }
    .yd-stat { padding: 14px; gap: 10px; }
    .yd-stat-n { font-size: 22px; }
    .yd-sheet-bg { align-items:flex-end; padding:0; }
    .yd-sheet { max-width:none; border-radius:26px 26px 0 0; padding-bottom: calc(26px + env(safe-area-inset-bottom)); }
    .yd-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior:auto !important; transition:none !important; animation:none !important; } }
`;

const TONES = {
  good:    { bg: "#e6f5d8", fg: "#2d6b1a" },
  bad:     { bg: "#fde8e4", fg: "#a8321f" },
  warn:    { bg: "#fef3d8", fg: "#8a5a00" },
  neutral: { bg: "#e8f0fa", fg: "#2a4f7a" },
  muted:   { bg: "#eef2ea", fg: "#566650" },
};
export function StatusPill({ ch, viewer }) {
  const d = describe(ch, viewer); const t = TONES[d.tone] || TONES.muted;
  return <span className="yd-pill" style={{ background: t.bg, color: t.fg }}><span aria-hidden="true">{d.icon}</span>{d.label}</span>;
}

export function Avatar({ name, src, size = 44 }) {
  const [bad, setBad] = useState(false);
  const initial = String(name || "?").replace("@", "").charAt(0).toUpperCase();
  return (src && !bad)
    ? <img src={src} alt="" width={size} height={size} onError={() => setBad(true)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flex: "none", border: `2px solid ${V2.softGray}` }} />
    : <span aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", flex: "none", background: V2.gradientGrassBtn, color: "#fff", fontWeight: 800, fontSize: size * 0.42, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{initial}</span>;
}

export function StatCard({ icon, value, label }) {
  return (
    <div className="yd-stat">
      <span aria-hidden="true" style={{ fontSize: 34, flex: "none" }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div className="yd-stat-n">{value ?? "–"}</div>
        <div className="yd-stat-l">{label}</div>
      </div>
    </div>
  );
}

export function FeatureCard({ art, title, copy, cta, onClick, href, soon }) {
  const btn = soon
    ? <span className="yd-pill" style={{ background: "#eef2ea", color: "#566650", alignSelf: "flex-start" }}>Coming soon</span>
    : href
      ? <Link href={href} className="yd-btn-sm" style={{ ...V2Styles.btnSecondary, display: "inline-flex", alignItems: "center", alignSelf: "flex-start", textDecoration: "none", padding: "0 18px" }}>{cta} →</Link>
      : <button type="button" onClick={onClick} className="yd-btn-sm" style={{ ...V2Styles.btnSecondary, alignSelf: "flex-start", padding: "0 18px" }}>{cta} →</button>;
  return (
    <section className="yd-feature" aria-label={title}>
      <div className="yd-feature-art" role="presentation" style={{ backgroundImage: `url(${art})` }} />
      <div className="yd-feature-body">
        <h3 style={{ fontSize: 19, fontWeight: 800, color: V2.forestGreen }}>{title}</h3>
        <p style={{ fontSize: 13, fontWeight: 500, color: V2.textBody, lineHeight: 1.45 }}>{copy}</p>
        {btn}
      </div>
    </section>
  );
}

export function WagoEmpty({ title, copy, cta, pose = "cheer" }) {
  return (
    <div className="yd-card" style={{ textAlign: "center", padding: "28px 18px" }}>
      <img src={pose === "trophy" ? "/images/wago/wago-trophy.webp" : "/images/wago/wago-cheer.png"} alt="" width={84} height={84} style={{ objectFit: "contain", margin: "0 auto 8px", display: "block" }} />
      <div style={{ fontSize: 17, fontWeight: 800, color: V2.forestGreen }}>{title}</div>
      <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody, margin: "6px 0 0" }}>{copy}</p>
      {cta && <div style={{ marginTop: 14 }}>{cta}</div>}
    </div>
  );
}

// One challenge. kind = incoming | outgoing | active | past. onChange() reloads data after an accept/decline.
export function ChallengeCard({ ch, viewer, kind, onChange }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const mine = ch.you_challenged ? ch.challenger_days : ch.challenged_days;
  const theirs = ch.you_challenged ? ch.challenged_days : ch.challenger_days;
  const respond = async (action) => {
    setBusy(action); setErr("");
    const { ok, data } = await yardPost("/api/yard/challenge/respond", { username: viewer, slug: ch.slug, action });
    if (!ok) { setErr(yardError(data)); setBusy(""); return; }
    onChange?.();
  };
  const link = typeof window !== "undefined" ? `${window.location.origin}/challenge/${ch.slug}` : `/challenge/${ch.slug}`;
  const copy = () => { try { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };
  const showScore = (kind === "active" || ch.result) && mine != null;
  return (
    <article className="yd-card" aria-label={`Challenge with @${ch.opponent}`}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Avatar name={ch.opponent} src={ch.opponent_avatar} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link href={`/u/${ch.opponent}`} style={{ fontWeight: 800, color: V2.forestGreen, textDecoration: "none", fontSize: 16, overflowWrap: "anywhere" }}>@{ch.opponent}</Link>
          <div style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray, marginTop: 2 }}>
            {ch.duration_days}-day challenge
            {ch.started_at ? ` · ${fmtDate(ch.started_at)} → ${fmtDate(ch.ends_at)}` : ` · sent ${fmtDate(ch.created_at)}`}
          </div>
        </div>
        <StatusPill ch={ch} viewer={viewer} />
      </div>
      {ch.message && <p style={{ fontSize: 13, fontWeight: 500, color: V2.textBody, margin: "10px 0 0", fontStyle: "italic", overflowWrap: "anywhere" }}>“{ch.message}”</p>}
      {showScore && (
        <div role="group" aria-label="Proof days" style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {[["You", mine], [`@${ch.opponent}`, theirs]].map(([who, n]) => (
            <div key={who} style={{ flex: 1, background: V2.offWhite, borderRadius: 14, padding: "8px 12px", minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen }}>{n ?? 0}<span style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray }}> / {ch.duration_days} days</span></div>
              <div style={{ fontSize: 11, fontWeight: 700, color: V2.dimGray, overflow: "hidden", textOverflow: "ellipsis" }}>{who}</div>
            </div>
          ))}
        </div>
      )}
      {kind === "incoming" && (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="button" className="yd-btn-sm" disabled={!!busy} onClick={() => respond("accept")} style={{ ...V2Styles.btnPrimary, padding: "0 20px", flex: 1, justifyContent: "center" }}>{busy === "accept" ? "Accepting…" : "Accept"}</button>
          <button type="button" className="yd-btn-sm" disabled={!!busy} onClick={() => respond("decline")} style={{ ...V2Styles.btnSecondary, padding: "0 20px", flex: 1, justifyContent: "center" }}>{busy === "decline" ? "…" : "Decline"}</button>
        </div>
      )}
      {kind === "outgoing" && (
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: V2.dimGray, flex: 1 }}>Waiting for @{ch.opponent} to accept</span>
          <button type="button" className="yd-btn-sm" onClick={copy} style={{ ...V2Styles.btnSecondary, padding: "0 16px" }}>{copied ? "Copied ✓" : "Copy link"}</button>
        </div>
      )}
      {err && <div role="alert" style={{ fontSize: 12, color: V2.danger, marginTop: 8 }}>{err}</div>}
      {kind !== "incoming" && (
        <div style={{ marginTop: 12 }}><Link href={`/challenge/${ch.slug}`} style={{ fontSize: 13, fontWeight: 700, color: V2.forestLight }}>View challenge →</Link></div>
      )}
    </article>
  );
}
