// pages/groves.js — squads of 3–6 who share a streak and can gift shields.
// Requires a secured (Google-claimed) username to create or join.
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import V2Nav from "../components/V2Nav";
import SecureUsernameCard from "../components/SecureUsernameCard";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";

const ERRORS = {
  already_in_grove: "You're already in a grove. Leave it first to join another.",
  cooldown: "You recently left a grove. You can join or create another after the 48-hour cooldown.",
  invite_invalid: "That invite link is invalid or has expired.",
  grove_full: "That grove is full.",
  bad_name: "Grove names need 3–30 characters.",
  not_in_grove: "You're not in a grove.",
  no_shield: "You don't have a shield to gift.",
  daily_gift_limit: "You can gift 2 shields per day.",
  receiver_limit: "That grove-mate already received 2 shields this week.",
  not_grove_mates: "You can only gift to members of your grove.",
  self_gift: "You can't gift a shield to yourself.",
  unclaimed: "Secure your username first.",
  not_owner: "This username belongs to another account.",
  not_signed_in: "Sign in with Google to continue.",
};
const errText = (d) => ERRORS[d?.code] || ERRORS[d?.error] || d?.error || "Something went wrong.";

async function post(path, body) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok && d.ok !== false, data: d };
}
const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }); } catch { return ""; } };

export default function GrovesPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const [username, setUsername] = useState("");
  const [ident, setIdent] = useState(null);      // { claimed, mine, signedIn }
  const [data, setData] = useState(null);        // grove_get result
  const [board, setBoard] = useState([]);
  const [invite, setInvite] = useState(null);    // preview of ?join=
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);

  const joinCode = typeof router.query.join === "string" ? router.query.join.toLowerCase() : "";

  useEffect(() => {
    try { const u = localStorage.getItem("pog_username"); if (u) setUsername(u.replace(/@/g, "").toLowerCase().trim()); } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/groves/leaderboard").then(r => r.json()).then(d => setBoard(d.groves || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!joinCode) { setInvite(null); return; }
    fetch(`/api/groves/invite?code=${encodeURIComponent(joinCode)}`).then(r => r.json()).then(setInvite).catch(() => {});
  }, [joinCode]);

  useEffect(() => {
    if (!username || authStatus === "loading") { return; }
    setIdent(null);
    fetch(`/api/username/status?username=${encodeURIComponent(username)}`).then(r => r.json()).then(setIdent).catch(() => setIdent({}));
  }, [username, authStatus]);

  const load = useCallback(async () => {
    if (!username || !ident?.mine) return;
    const r = await fetch(`/api/groves/me?username=${encodeURIComponent(username)}`);
    const d = await r.json().catch(() => ({}));
    if (r.ok) setData(d); else setMsg({ type: "err", text: errText(d) });
  }, [username, ident?.mine]);
  useEffect(() => { load(); }, [load]);

  const act = async (key, path, body, okText) => {
    setBusy(key); setMsg({ type: "", text: "" });
    const { ok, data: d } = await post(path, { username, ...body });
    setBusy("");
    if (!ok) { setMsg({ type: "err", text: errText(d) }); return false; }
    if (okText) setMsg({ type: "ok", text: okText });
    if (key === "join" || key === "create") router.replace("/groves", undefined, { shallow: true });
    await load();
    return true;
  };

  const grove = data?.grove;
  const streak = data?.streak;
  const inviteUrl = grove?.invite_code && typeof window !== "undefined" ? `${window.location.origin}/groves?join=${grove.invite_code}` : "";
  const copy = async () => { try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };

  const css = V2GlobalCSS + `
    .gv-wrap{max-width:860px;margin:0 auto;padding:28px 16px 90px}
    .gv-card{background:#fff;border:1px solid ${V2.borderSoft};border-radius:18px;padding:20px;margin-bottom:16px;box-shadow:0 2px 10px rgba(26,74,10,.06)}
    .gv-h{font-family:${V2.fontSans};font-weight:800;color:${V2.forestGreen};margin:0 0 6px}
    .gv-in{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1.5px solid ${V2.borderSoft};font-size:16px;font-family:${V2.fontSans}}
    .gv-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid ${V2.borderSoft}}
    .gv-row:first-of-type{border-top:0}
    .gv-pill{font-size:12px;font-weight:700;border-radius:20px;padding:4px 10px}
    .gv-btn2{padding:7px 14px;border-radius:20px;border:1.5px solid ${V2.borderSoft};background:#fff;color:${V2.forestGreen};font-weight:700;font-size:13px;cursor:pointer}
    .gv-btn2:disabled{opacity:.5;cursor:default}
  `;

  const needsSecure = username && ident && !ident.mine;
  return (
    <>
      <Head><title>Groves | Proof of Grass</title></Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#d4ecf7 0%,#e8f4fd 30%,#f0f8ee 100%)" }}>
        <V2Nav username={username} onUsernameChange={setUsername} showUpload={() => { window.location.href = "/#upload"; }} />
        <main className="gv-wrap">
          <h1 style={{ margin: 0 }}>
            <img src="/groves-logo.webp" alt="Groves" width={700} height={233}
              style={{ display: "block", width: "100%", maxWidth: 700, height: "auto", margin: "0 auto 8px" }} />
          </h1>
          <p style={{ color: V2.textBody, marginTop: 0, marginBottom: 20, textAlign: "center" }}>
            Team up with friends to build a shared streak. A grove needs at least 3 members to count, and holds up to 6. Once you have 3 or more, the grove streak grows each day that at least two thirds of members post a proof. Gift shields to keep each other going.
          </p>

          {msg.text && (
            <div role={msg.type === "err" ? "alert" : "status"} className="gv-card"
              style={{ borderColor: msg.type === "err" ? "#e5a29c" : V2.borderGreen, color: msg.type === "err" ? "#b3261e" : V2.textSecondary, padding: "12px 16px" }}>{msg.text}</div>
          )}

          {/* Invite preview */}
          {invite?.valid && !grove && (
            <div className="gv-card" style={{ borderColor: V2.borderGreen }}>
              <div style={{ fontWeight: 800, color: V2.forestGreen }}>You're invited to “{invite.name}”</div>
              <div style={{ fontSize: 14, color: V2.textSecondary }}>{invite.members} of {invite.slots} spots filled{invite.full ? " — this grove is full." : ""}</div>
            </div>
          )}
          {joinCode && invite && !invite.valid && <div className="gv-card" style={{ color: "#b3261e" }}>That invite link is invalid or has expired.</div>}

          {/* Gate: username + claim */}
          {!username && <div className="gv-card">Enter your username in the top bar to get started.</div>}
          {username && !ident && <div className="gv-card">Loading…</div>}
          {needsSecure && (
            <div className="gv-card">
              <div className="gv-h" style={{ fontSize: 18 }}>Secure your username to use Groves</div>
              {ident.claimed ? (
                <>
                  <p style={{ color: V2.textBody, margin: "4px 0 12px" }}>@{username} is secured by a Google account. {ident.signedIn ? "You're signed in with a different account." : "Sign in with the Google account that secured it."}</p>
                  {!ident.signedIn && <button onClick={() => signIn("google")} style={{ ...V2Styles.btnPrimary, padding: "10px 20px" }}>Continue with Google</button>}
                </>
              ) : (
                <>
                  <p style={{ color: V2.textBody, margin: "4px 0 12px" }}>Groves move shields between players, so we need to know @{username} is really you.</p>
                  <SecureUsernameCard username={username} onClaimed={() => setIdent(i => ({ ...(i || {}), claimed: true, mine: true, signedIn: true }))} />
                </>
              )}
            </div>
          )}

          {/* Claimed, no grove: create / join */}
          {ident?.mine && data && !grove && (
            <>
              {data.cooldown_until && (
                <div className="gv-card" style={{ color: V2.textSecondary }}>You recently left a grove. You can start or join another after {fmtWhen(data.cooldown_until)}.</div>
              )}
              <div className="gv-card">
                <div className="gv-h" style={{ fontSize: 20 }}>Start a grove</div>
                <p style={{ margin: "0 0 12px", color: V2.textBody, fontSize: 14 }}>Pick a name, then share your invite link. A grove needs at least 3 members (you plus 2 friends, up to 6) before its streak starts counting.</p>
                <input className="gv-in" aria-label="Grove name" placeholder="Grove name (3–30 characters)" maxLength={30} value={name} onChange={e => setName(e.target.value)} />
                <button disabled={busy === "create" || name.trim().length < 3} onClick={() => act("create", "/api/groves/create", { name }, "Grove created! Share the invite link with your friends.")}
                  style={{ ...V2Styles.btnPrimary, padding: "12px 22px", marginTop: 12, opacity: name.trim().length < 3 ? 0.6 : 1 }}>
                  {busy === "create" ? "Creating…" : "Create grove"}
                </button>
              </div>
              {invite?.valid && !invite.full && (
                <div className="gv-card">
                  <div className="gv-h" style={{ fontSize: 20 }}>Join “{invite.name}”</div>
                  <button disabled={busy === "join"} onClick={() => act("join", "/api/groves/join", { code: joinCode }, `Welcome to ${invite.name}!`)} style={{ ...V2Styles.btnPrimary, padding: "12px 22px" }}>
                    {busy === "join" ? "Joining…" : "Join grove"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* In a grove */}
          {ident?.mine && grove && (
            <>
              <div className="gv-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div>
                    <div className="gv-h" style={{ fontSize: 24 }}>{grove.name}</div>
                    <div style={{ fontSize: 14, color: V2.textSecondary }}>{data.members.length} of {grove.slots} members · needs 3+ to count</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: V2.forestGreen, lineHeight: 1 }}>{streak?.streak ?? 0}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: V2.textMuted }}>DAY GROVE STREAK</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, fontSize: 14, color: V2.textBody }}>
                  {streak?.today_needed == null
                    ? `Not counting yet: a grove needs at least 3 members. Invite ${Math.max(0, 3 - data.members.length)} more ${3 - data.members.length === 1 ? "friend" : "friends"} to start your grove streak.`
                    : streak.today_complete
                      ? `✓ Today counts! ${streak.today_locked} of ${streak.today_members} posted.`
                      : `${streak.today_locked} of ${streak.today_needed} needed have posted today.`}
                </div>
              </div>

              <div className="gv-card">
                <div className="gv-h" style={{ fontSize: 18 }}>Members</div>
                {data.members.map(m => {
                  const me = m.username === username;
                  return (
                    <div className="gv-row" key={m.username}>
                      <Link href={`/u/${m.username}`} style={{ fontWeight: 700, color: V2.forestGreen, textDecoration: "none", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        @{m.username}{me ? " (you)" : ""}
                      </Link>
                      <span className="gv-pill" style={{ background: m.locked_today ? "#e3f5d6" : "#f1f1ec", color: m.locked_today ? "#2d6a10" : "#6b6b5e" }}>
                        {m.locked_today ? "Posted today" : "Not yet"}
                      </span>
                      {!me && (
                        <button className="gv-btn2" disabled={busy === `gift-${m.username}`}
                          onClick={() => act(`gift-${m.username}`, "/api/groves/gift", { to: m.username }, `Sent a shield to @${m.username} 🛡️`)}>
                          🛡️ Gift
                        </button>
                      )}
                    </div>
                  );
                })}
                <p style={{ fontSize: 12, color: V2.textMuted, margin: "10px 0 0" }}>Gifting uses one of your shields. Limits: 2 per day to give, 2 per week to receive.</p>
              </div>

              {data.members.length < grove.slots && inviteUrl && (
                <div className="gv-card">
                  <div className="gv-h" style={{ fontSize: 18 }}>Invite friends</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input className="gv-in" readOnly aria-label="Invite link" value={inviteUrl} onFocus={e => e.target.select()} style={{ flex: 1, minWidth: 200 }} />
                    <button onClick={copy} style={{ ...V2Styles.btnPrimary, padding: "10px 20px" }}>{copied ? "Copied!" : "Copy link"}</button>
                  </div>
                  <p style={{ fontSize: 12, color: V2.textMuted, margin: "8px 0 0" }}>Anyone with the link needs a secured username to join. Links expire after 7 days.</p>
                </div>
              )}

              <div style={{ textAlign: "center", marginBottom: 20 }}>
                {!confirmLeave ? (
                  <button className="gv-btn2" onClick={() => setConfirmLeave(true)}>Leave grove</button>
                ) : (
                  <div className="gv-card" style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700, color: V2.forestGreen, marginBottom: 6 }}>Leave {grove.name}?</div>
                    <p style={{ margin: "0 0 12px", fontSize: 14, color: V2.textBody }}>You won't be able to join or create another grove for 48 hours.</p>
                    <button className="gv-btn2" disabled={busy === "leave"} onClick={async () => { const ok = await act("leave", "/api/groves/leave", {}, "You left the grove."); if (ok) setConfirmLeave(false); }}>{busy === "leave" ? "Leaving…" : "Yes, leave"}</button>{" "}
                    <button className="gv-btn2" onClick={() => setConfirmLeave(false)}>Cancel</button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Leaderboard */}
          <div className="gv-card">
            <div className="gv-h" style={{ fontSize: 20 }}>🏆 Top groves</div>
            {board.length === 0 ? (
              <p style={{ margin: 0, color: V2.textMuted, fontSize: 14 }}>No groves on the board yet. Groves with 3 or more members and a running streak appear here.</p>
            ) : board.map((g, i) => (
              <div className="gv-row" key={g.id}>
                <span style={{ width: 24, fontWeight: 800, color: V2.textMuted }}>{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 700, color: V2.forestGreen, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</span>
                <span style={{ fontSize: 13, color: V2.textMuted }}>{g.members} members</span>
                <span className="gv-pill" style={{ background: "#e3f5d6", color: "#2d6a10" }}>{g.streak}d</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
