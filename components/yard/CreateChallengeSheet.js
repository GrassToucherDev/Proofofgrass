// The 5-step challenge flow: type → opponent → length → rules → sent. Bottom sheet on phones, centred card on desktop.
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { V2, V2Styles } from "../../utils/v2Theme";
import { supabase } from "../../utils/supabase";
import { yardError } from "../../utils/yardErrors";
import { yardPost } from "../../hooks/useYard";
import { Avatar } from "./YardUI";
import GroveBanner from "../GroveBanner";

const DURATIONS = [{ d: 7, note: "A quick sprint" }, { d: 14, note: "Two solid weeks" }, { d: 30, note: "The full month" }];
const clean = (v) => String(v || "").replace(/@/g, "").trim();

export default function CreateChallengeSheet({ viewer, presetOpponent = "", presetMode = "", onClose, onSent }) {
  const [mode, setMode] = useState(presetMode === "grove" ? "grove" : "1v1");
  const [step, setStep] = useState(presetOpponent ? 3 : presetMode === "grove" ? 2 : 1);
  const [myGrove, setMyGrove] = useState(undefined);   // undefined = loading, null = not in a Grove
  const [gPicked, setGPicked] = useState(null);
  const [gResults, setGResults] = useState([]);
  const [q, setQ] = useState(presetOpponent);
  const [picked, setPicked] = useState(presetOpponent ? { username: presetOpponent, avatar_url: null } : null);
  const [results, setResults] = useState([]);
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (mode !== "grove" || !viewer || myGrove !== undefined) return;
    fetch(`/api/yard/groves/overview?username=${encodeURIComponent(viewer)}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => setMyGrove(d.grove || null)).catch(() => setMyGrove(null));
  }, [mode, viewer, myGrove]);

  // Grove lookup: name prefix, debounced.
  useEffect(() => {
    const term = clean(q);
    if (mode !== "grove" || step !== 2 || term.length < 2 || (gPicked && gPicked.name.toLowerCase() === term.toLowerCase())) { setGResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/yard/groves/search?q=${encodeURIComponent(term)}`, { cache: "no-store" });
        const d = await r.json();
        setGResults((d.groves || []).filter((g) => g.id !== myGrove?.id));
      } catch { setGResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, step, mode, gPicked, myGrove]);

  // Username lookup: prefix match, debounced. Reads public profile names/pictures only.
  useEffect(() => {
    const term = clean(q);
    if (mode !== "1v1" || step !== 2 || term.length < 2 || (picked && picked.username.toLowerCase() === term.toLowerCase())) { setResults([]); return; }
    const t = setTimeout(async () => {
      const safe = term.replace(/[%_\\]/g, (c) => "\\" + c);
      const { data } = await supabase.from("Profiles").select("username, avatar_url").ilike("username", `${safe}%`).limit(6);
      setResults((data || []).filter((p) => String(p.username).toLowerCase() !== viewer));
    }, 250);
    return () => clearTimeout(t);
  }, [q, step, picked, viewer]);

  const send = async () => {
    setBusy(true); setErr("");
    const { ok, data } = mode === "grove"
      ? await yardPost("/api/yard/groves/create", { username: viewer, target: gPicked.id, days, message: message.trim() })
      : await yardPost("/api/yard/challenge/create", { username: viewer, target: picked.username, days, message: message.trim() });
    setBusy(false);
    if (!ok || !data.slug) { setErr(yardError(data, "Couldn't send. Please try again.")); return; }
    setSent(data.slug); setStep(5); onSent?.();
  };
  const link = sent ? `${window.location.origin}${mode === "grove" ? "/yard/grove/" : "/challenge/"}${sent}` : "";
  const theirName = mode === "grove" ? gPicked?.name : picked ? "@" + picked.username : "";
  const dots = [1, 2, 3, 4];

  return (
    <div className="yd-sheet-bg" onClick={onClose}>
      <div className="yd-sheet" role="dialog" aria-modal="true" aria-label="Create a challenge" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", color: V2.forestLight }}>{step < 5 ? (mode === "grove" ? "GROVE VS GROVE" : "1V1 CHALLENGE") : "CHALLENGE SENT"}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ minWidth: 44, minHeight: 44, border: "none", background: "none", fontSize: 22, color: V2.dimGray, cursor: "pointer" }}>✕</button>
        </div>

        {step < 5 && (
          <div role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={dots.indexOf(step) + 1} aria-label={`Step ${dots.indexOf(step) + 1} of 4`} style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {dots.map((s) => <span key={s} style={{ flex: 1, height: 5, borderRadius: 3, background: s <= step ? V2.grassLime : V2.softGray }} />)}
          </div>
        )}

        {!viewer && <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody }}>Enter your username on your <Link href="/" style={{ color: V2.forestLight, fontWeight: 700 }}>dashboard</Link> first, then come back.</p>}

        {viewer && step === 1 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen, marginBottom: 14 }}>What kind of challenge?</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <button type="button" onClick={() => { setMode("1v1"); setQ(""); setStep(2); }} style={{ minHeight: 72, borderRadius: 18, border: `2px solid ${V2.grassLime}`, background: "#f1fbe6", padding: "10px 16px", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: V2.forestGreen }}>⚔️ 1v1</span><br /><span style={{ fontSize: 13, fontWeight: 600, color: V2.dimGray }}>Go head to head with another user.</span>
              </button>
              <button type="button" onClick={() => { setMode("grove"); setQ(""); setStep(2); }} style={{ minHeight: 72, borderRadius: 18, border: `2px solid ${V2.grassLime}`, background: "#f1fbe6", padding: "10px 16px", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: V2.forestGreen }}>🌳 Grove vs Grove</span><br /><span style={{ fontSize: 13, fontWeight: 600, color: V2.dimGray }}>Bring your squad and compete together. Grove owners only.</span>
              </button>
            </div>
          </>
        )}

        {viewer && step === 2 && mode === "1v1" && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen, marginBottom: 4 }}>Who are you challenging?</h2>
            <p style={{ fontSize: 13, fontWeight: 500, color: V2.textMuted, marginBottom: 14 }}>Search for a Proof of Grass username.</p>
            <label htmlFor="yd-opp" style={{ position: "absolute", left: -9999 }}>Opponent username</label>
            <input id="yd-opp" ref={inputRef} autoFocus autoComplete="off" autoCapitalize="none" value={q}
              onChange={(e) => { setQ(e.target.value); setPicked(null); setErr(""); }} placeholder="@username"
              style={{ width: "100%", minHeight: 50, borderRadius: 14, border: `1.5px solid ${V2.borderSoft}`, padding: "0 16px", fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: V2.forestGreen, background: V2.offWhite }} />
            <ul role="listbox" aria-label="Matching users" style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
              {results.map((p) => (
                <li key={p.username}>
                  <button type="button" role="option" aria-selected="false" onClick={() => { setPicked(p); setQ(p.username); setResults([]); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "6px 8px", border: "none", background: "none", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                    <Avatar name={p.username} src={p.avatar_url} size={38} />
                    <span style={{ fontWeight: 700, color: V2.forestGreen }}>@{p.username}</span>
                  </button>
                </li>
              ))}
            </ul>
            {picked && <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 0", padding: "10px 12px", background: "#e6f5d8", borderRadius: 14, color: "#2d6b1a", fontWeight: 700, fontSize: 14 }}><Avatar name={picked.username} src={picked.avatar_url} size={32} />Challenging @{picked.username}</div>}
            <button type="button" disabled={!picked} onClick={() => setStep(3)} style={{ ...V2Styles.btnPrimary, width: "100%", justifyContent: "center", minHeight: 52, marginTop: 18, opacity: picked ? 1 : .5 }}>Continue</button>
          </>
        )}

        {viewer && step === 2 && mode === "grove" && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen, marginBottom: 4 }}>Which Grove?</h2>
            {myGrove === undefined && <p style={{ fontSize: 14, color: V2.textMuted }}>Checking your Grove…</p>}
            {myGrove === null && <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody }}>You're not in a Grove yet. <Link href="/groves" style={{ color: V2.forestLight, fontWeight: 700 }}>Join or create one</Link> (3 to 6 members) to compete.</p>}
            {myGrove && !myGrove.is_owner && <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody }}>Only the Grove owner (@{myGrove.owner}) can send Grove challenges. Ask them to send one for {myGrove.name}.</p>}
            {myGrove && myGrove.is_owner && !myGrove.can_compete && <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody }}>{myGrove.name} needs at least 3 members to compete. <Link href="/groves" style={{ color: V2.forestLight, fontWeight: 700 }}>Invite friends</Link>.</p>}
            {myGrove && myGrove.is_owner && myGrove.can_compete && (
              <>
                <p style={{ fontSize: 13, fontWeight: 500, color: V2.textMuted, marginBottom: 14 }}>Search for a Grove by name. Both Groves need 3+ members.</p>
                <label htmlFor="yd-grove" style={{ position: "absolute", left: -9999 }}>Opponent Grove name</label>
                <input id="yd-grove" autoFocus autoComplete="off" value={q} onChange={(e) => { setQ(e.target.value); setGPicked(null); setErr(""); }} placeholder="Grove name"
                  style={{ width: "100%", minHeight: 50, borderRadius: 14, border: `1.5px solid ${V2.borderSoft}`, padding: "0 16px", fontSize: 16, fontFamily: "inherit", fontWeight: 600, color: V2.forestGreen, background: V2.offWhite }} />
                <ul role="listbox" aria-label="Matching Groves" style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 8 }}>
                  {gResults.map((g) => (
                    <li key={g.id}>
                      <button type="button" role="option" aria-selected="false" onClick={() => { setGPicked(g); setQ(g.name); setGResults([]); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: 6, border: `1.5px solid ${V2.borderSoft}`, background: "#fff", borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                        <GroveBanner banner={g.banner} height={44} radius={10} style={{ width: 64, flex: "none" }} />
                        <span style={{ minWidth: 0 }}><span style={{ fontWeight: 800, color: V2.forestGreen, display: "block", overflowWrap: "anywhere" }}>{g.name}</span><span style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray }}>{g.size} members</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
                {gPicked && <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 0", padding: "10px 12px", background: "#e6f5d8", borderRadius: 14, color: "#2d6b1a", fontWeight: 700, fontSize: 14 }}>🌳 Challenging {gPicked.name}</div>}
                <button type="button" disabled={!gPicked} onClick={() => setStep(3)} style={{ ...V2Styles.btnPrimary, width: "100%", justifyContent: "center", minHeight: 52, marginTop: 18, opacity: gPicked ? 1 : .5 }}>Continue</button>
              </>
            )}
          </>
        )}

        {viewer && step === 3 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen, marginBottom: 14 }}>How long?</h2>
            <div role="radiogroup" aria-label="Challenge length" style={{ display: "grid", gap: 10 }}>
              {DURATIONS.map(({ d, note }) => (
                <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => setDays(d)}
                  style={{ minHeight: 60, borderRadius: 16, border: `2px solid ${days === d ? V2.grassLime : V2.borderSoft}`, background: days === d ? "#f1fbe6" : "#fff", padding: "10px 16px", textAlign: "left", cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span><span style={{ fontSize: 18, fontWeight: 800, color: V2.forestGreen }}>{d} days</span><br /><span style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray }}>{note}</span></span>
                  <span aria-hidden="true" style={{ fontSize: 20 }}>{days === d ? "✅" : ""}</span>
                </button>
              ))}
            </div>
            <label htmlFor="yd-msg" style={{ display: "block", fontSize: 12, fontWeight: 700, color: V2.dimGray, margin: "16px 0 6px" }}>Add a message (optional)</label>
            <textarea id="yd-msg" rows={2} maxLength={140} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Think you can keep up?"
              style={{ width: "100%", borderRadius: 14, border: `1.5px solid ${V2.borderSoft}`, padding: "10px 14px", fontSize: 15, fontFamily: "inherit", fontWeight: 500, background: V2.offWhite, resize: "none" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {!presetOpponent && <button type="button" onClick={() => setStep(2)} style={{ ...V2Styles.btnSecondary, minHeight: 52, padding: "0 20px" }}>Back</button>}
              <button type="button" onClick={() => setStep(4)} style={{ ...V2Styles.btnPrimary, flex: 1, justifyContent: "center", minHeight: 52 }}>Review</button>
            </div>
          </>
        )}

        {viewer && step === 4 && (mode === "grove" ? gPicked : picked) && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen, marginBottom: 12 }}>Ready to send?</h2>
            {mode === "grove" ? (
              <div style={{ padding: "12px 14px", background: V2.offWhite, borderRadius: 16 }}>
                <div style={{ fontWeight: 800, color: V2.forestGreen }}>{myGrove?.name} vs {gPicked.name}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: V2.dimGray }}>{days}-day Grove challenge</div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: V2.offWhite, borderRadius: 16 }}>
                <Avatar name={picked.username} src={picked.avatar_url} />
                <div><div style={{ fontWeight: 800, color: V2.forestGreen }}>@{picked.username}</div><div style={{ fontSize: 13, fontWeight: 600, color: V2.dimGray }}>{days}-day challenge</div></div>
              </div>
            )}
            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".1em", color: V2.forestLight, margin: "16px 0 6px" }}>HOW IT WORKS</h3>
            {mode === "grove" ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, fontWeight: 500, color: V2.textBody, lineHeight: 1.6 }}>
                <li>It starts when {gPicked.name}'s owner accepts, and runs {days} days.</li>
                <li>Rosters are locked when it starts, so later joins and leaves don't change the targets.</li>
                <li>A day counts when at least 2/3 of a Grove's roster posts a proof.</li>
                <li>Most counted days wins. A tie goes to the higher posts per member.</li>
                <li>Results are counted by the server from real proofs.</li>
                <li>Unanswered invites expire after 7 days.</li>
              </ul>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, fontWeight: 500, color: V2.textBody, lineHeight: 1.6 }}>
                <li>It starts when @{picked.username} accepts, and runs {days} days.</li>
                <li>Every day you each post a proof counts as one day.</li>
                <li>The most proof days wins. Equal days is a tie.</li>
                <li>Results are counted by the server from real proofs.</li>
                <li>Unanswered invites expire after 7 days.</li>
              </ul>
            )}
            {err && <div role="alert" style={{ fontSize: 13, fontWeight: 600, color: V2.danger, marginTop: 12 }}>{err}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setStep(3)} style={{ ...V2Styles.btnSecondary, minHeight: 52, padding: "0 20px" }}>Back</button>
              <button type="button" disabled={busy} onClick={send} style={{ ...V2Styles.btnPrimary, flex: 1, justifyContent: "center", minHeight: 52, opacity: busy ? .7 : 1 }}>{busy ? "Sending…" : "Send Challenge"}</button>
            </div>
          </>
        )}

        {step === 5 && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <img src="/images/wago/wago-cheer.png" alt="" width={96} height={96} style={{ objectFit: "contain", margin: "0 auto" }} />
            <h2 style={{ fontSize: 24, fontWeight: 800, color: V2.forestGreen, margin: "8px 0 4px" }}>Challenge Sent</h2>
            <p style={{ fontSize: 14, fontWeight: 500, color: V2.textBody }}>Pending until {mode === "grove" ? `${theirName}'s owner` : theirName} accepts. Share the link so they see it.</p>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => { try { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} }} style={{ ...V2Styles.btnPrimary, justifyContent: "center", minHeight: 52 }}>{copied ? "Link copied ✓" : "Copy challenge link"}</button>
              <Link href={`${mode === "grove" ? "/yard/grove/" : "/challenge/"}${sent}`} style={{ ...V2Styles.btnSecondary, justifyContent: "center", minHeight: 52, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>View challenge</Link>
              <button type="button" onClick={onClose} style={{ minHeight: 44, border: "none", background: "none", fontFamily: "inherit", fontWeight: 700, color: V2.dimGray, cursor: "pointer" }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
