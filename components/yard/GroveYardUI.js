// Grove vs Grove pieces for The Yard. V2 tokens, shared yard CSS.
import { useState } from "react";
import Link from "next/link";
import { V2, V2Styles } from "../../utils/v2Theme";
import GroveBanner from "../GroveBanner";
import { fmtDate } from "../../utils/yardStatus";
import { yardError } from "../../utils/yardErrors";
import { yardPost } from "../../hooks/useYard";
import { Avatar } from "./YardUI";


export function GroveBadge({ g, align = "left" }) {
  return (
    <div style={{ minWidth: 0, textAlign: align }}>
      <GroveBanner banner={g.banner} height={72} radius={14} />
      <div style={{ fontWeight: 800, fontSize: 15, color: V2.forestGreen, marginTop: 8, overflowWrap: "anywhere" }}>{g.name}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray }}>{g.size} members · {g.daily_target} must post</div>
    </div>
  );
}

function Score({ g, days, label, lead }) {
  return (
    <div style={{ flex: 1, background: lead ? "#f1fbe6" : V2.offWhite, border: lead ? `1.5px solid ${V2.grassLime}` : "1.5px solid transparent", borderRadius: 14, padding: "8px 12px", minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen }}>{days ?? 0}<span style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray }}> / {g._dur} days</span></div>
      <div style={{ fontSize: 11, fontWeight: 700, color: V2.dimGray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}{lead ? " · leading" : ""}</div>
    </div>
  );
}

// kind: incoming | outgoing | active | past. `grove` is the viewer's Grove (id, is_owner) or null.
export function GroveChallengeCard({ ch, grove, kind, onChange, detail }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const a = ch.challenger, b = ch.challenged;
  const canAnswer = kind === "incoming" && grove?.is_owner && grove.id === b.id;
  const respond = async (action) => {
    setBusy(action); setErr("");
    const { ok, data } = await yardPost("/api/yard/groves/respond", { username: grove.owner, slug: ch.slug, action });
    if (!ok) { setErr(yardError(data)); setBusy(""); return; }
    onChange?.();
  };
  const link = typeof window !== "undefined" ? `${window.location.origin}/yard/grove/${ch.slug}` : `/yard/grove/${ch.slug}`;
  const copy = () => { try { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };
  const showScore = ch.status === "active" || ch.result;
  const lead = ch.result ? ch.winner_grove : ch.leader;
  const A = { ...a, _dur: ch.duration_days }, B = { ...b, _dur: ch.duration_days };
  const pill = (() => {
    const mine = grove?.id && (a.id === grove.id || b.id === grove.id);
    if (ch.result === "won") {
      const won = ch.winner_grove === grove?.id;
      const w = ch.winner_grove === a.id ? a : b;
      return mine ? (won ? { icon: "🏆", label: "Won", bg: "#e6f5d8", fg: "#2d6b1a" } : { icon: "🌧️", label: "Lost", bg: "#fde8e4", fg: "#a8321f" }) : { icon: "🏆", label: `${w.name} won`, bg: "#e6f5d8", fg: "#2d6b1a" };
    }
    if (ch.result === "tied") return { icon: "🤝", label: "Tied", bg: "#e8f0fa", fg: "#2a4f7a" };
    if (ch.result === "no_finish") return { icon: "💤", label: "No finish", bg: "#eef2ea", fg: "#566650" };
    return ({ active: { icon: "🌿", label: "Active", bg: "#e6f5d8", fg: "#2d6b1a" }, pending: { icon: "⏳", label: "Pending", bg: "#fef3d8", fg: "#8a5a00" },
      declined: { icon: "✋", label: "Declined", bg: "#eef2ea", fg: "#566650" }, expired: { icon: "⌛", label: "Expired", bg: "#eef2ea", fg: "#566650" } })[ch.status]
      || { icon: "•", label: ch.status, bg: "#eef2ea", fg: "#566650" };
  })();
  return (
    <article className="yd-card" aria-label={`${a.name} versus ${b.name}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray }}>
          {ch.duration_days}-day Grove challenge{ch.started_at ? ` · ${fmtDate(ch.started_at)} → ${fmtDate(ch.ends_at)}` : ` · sent ${fmtDate(ch.created_at)}`}
        </span>
        <span className="yd-pill" style={{ background: pill.bg, color: pill.fg }}><span aria-hidden="true">{pill.icon}</span>{pill.label}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "start" }}>
        <GroveBadge g={a} />
        <div aria-hidden="true" style={{ alignSelf: "center", fontWeight: 800, color: V2.forestLight, fontSize: 14 }}>VS</div>
        <GroveBadge g={b} />
      </div>
      <div style={{ marginTop: 6 }}>
        <GroveMembers groveId={a.id} slug={ch.slug} count={a.size} label={`${a.name} members`} />
        <GroveMembers groveId={b.id} slug={ch.slug} count={b.size} label={`${b.name} members`} />
      </div>
      {ch.message && <p style={{ fontSize: 13, fontWeight: 500, color: V2.textBody, margin: "12px 0 0", fontStyle: "italic", overflowWrap: "anywhere" }}>“{ch.message}” <span style={{ fontStyle: "normal", color: V2.dimGray }}>· from {a.name}</span></p>}
      {showScore && (
        <div role="group" aria-label="Days the daily target was hit" style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <Score g={A} days={a.days} label={a.name} lead={lead === a.id} />
          <Score g={B} days={b.days} label={b.name} lead={lead === b.id} />
        </div>
      )}
      {showScore && <p style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray, margin: "8px 0 0" }}>A day counts when at least 2/3 of a Grove's locked roster posts. Tie-break: posts per member.</p>}
      {canAnswer && (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="button" className="yd-btn-sm" disabled={!!busy} onClick={() => respond("accept")} style={{ ...V2Styles.btnPrimary, padding: "0 20px", flex: 1, justifyContent: "center" }}>{busy === "accept" ? "Accepting…" : "Accept"}</button>
          <button type="button" className="yd-btn-sm" disabled={!!busy} onClick={() => respond("decline")} style={{ ...V2Styles.btnSecondary, padding: "0 20px", flex: 1, justifyContent: "center" }}>{busy === "decline" ? "…" : "Decline"}</button>
        </div>
      )}
      {kind === "incoming" && !canAnswer && <p style={{ fontSize: 13, fontWeight: 600, color: V2.dimGray, margin: "12px 0 0" }}>Only your Grove owner (@{grove?.owner}) can answer this.</p>}
      {kind === "outgoing" && (
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: V2.dimGray, flex: 1 }}>Waiting for {b.name}'s owner to accept</span>
          <button type="button" className="yd-btn-sm" onClick={copy} style={{ ...V2Styles.btnSecondary, padding: "0 16px" }}>{copied ? "Copied ✓" : "Copy link"}</button>
        </div>
      )}
      {err && <div role="alert" style={{ fontSize: 12, color: V2.danger, marginTop: 8 }}>{err}</div>}
      {!detail && <div style={{ marginTop: 12 }}><Link href={`/yard/grove/${ch.slug}`} style={{ fontSize: 13, fontWeight: 700, color: V2.forestLight }}>View challenge →</Link></div>}
    </article>
  );
}

// Expandable "who is in this Grove" list. Loads lazily on first open. Initials stand in for missing pictures.
// Pass `slug` inside a challenge to see the roster that was locked when it started.
export function GroveMembers({ groveId, slug, eventSlug, count, label = "Members", compact }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ loading: false, members: null, locked: false, error: "" });
  const toggle = async () => {
    const next = !open; setOpen(next);
    if (!next || state.members || state.loading) return;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const r = await fetch(`/api/yard/groves/members?id=${encodeURIComponent(groveId)}${slug ? `&slug=${encodeURIComponent(slug)}` : ""}${eventSlug ? `&event=${encodeURIComponent(eventSlug)}` : ""}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load members.");
      setState({ loading: false, members: d.members, locked: d.locked, error: "" });
    } catch (e) { setState({ loading: false, members: null, locked: false, error: e.message || "Could not load members." }); }
  };
  const panel = `yd-mem-${groveId}${slug ? "-" + slug : ""}${eventSlug ? "-e-" + eventSlug : ""}`;
  return (
    <div style={{ marginTop: compact ? 4 : 8 }}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls={panel}
        style={{ minHeight: 44, padding: "0 4px", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: V2.forestLight, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden="true" style={{ display: "inline-block", transition: "transform .15s", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
        {open ? `Hide ${label}` : `${label}${count != null ? ` (${count})` : ""}`}
      </button>
      {open && (
        <div id={panel} role="region" aria-label={label} style={{ marginTop: 2 }}>
          {state.loading && <div style={{ fontSize: 13, color: V2.dimGray, padding: "4px 4px 8px" }}>Loading…</div>}
          {state.error && <div role="alert" style={{ fontSize: 13, color: V2.danger, padding: "4px 4px 8px" }}>{state.error}</div>}
          {state.members && (
            <>
              {state.locked && <p style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray, margin: "0 4px 6px" }}>Roster locked when {eventSlug ? "the Grove entered" : "the challenge started"}.</p>}
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {state.members.map((m) => (
                  <li key={m.username} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "2px 4px" }}>
                    <Avatar name={m.username} src={m.avatar_url} size={32} />
                    <Link href={`/u/${m.username}`} style={{ fontWeight: 700, fontSize: 14, color: V2.forestGreen, textDecoration: "none", overflowWrap: "break-word", wordBreak: "break-word", flex: 1, minWidth: 0 }}>@{m.username}</Link>
                    {m.is_owner && <span className="yd-pill" style={{ background: "#fef3d8", color: "#8a5a00", padding: "3px 10px" }}><span aria-hidden="true">👑</span>Owner</span>}
                    {m.left && <span className="yd-pill" style={{ background: "#eef2ea", color: "#566650", padding: "3px 10px" }}>Left</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
