// pages/groves.js — squads of 3–6 who share a streak and can gift shields.
// Requires a secured (Google-claimed) username to create or join.
import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import V2Nav from "../components/V2Nav";
import SecureUsernameCard from "../components/SecureUsernameCard";
import { V2, V2Styles, V2GlobalCSS } from "../utils/v2Theme";
import GroveBanner from "../components/GroveBanner";
import { supabase } from "../utils/supabase";
import { renderGroveCard } from "../utils/groveShareImage";
import { BANNER_PERMISSION_NOTE } from "../utils/groveBanners";

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
  owner_only: "Only the Grove owner can do that.",
  not_unlocked: "That banner isn't unlocked for this Grove yet.",
  transfer_required: "You're the owner. Choose a member to take over before you leave.",
  bad_new_owner: "Pick a current member as the new owner.",
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
  const [bn, setBn] = useState(null);            // grove_banners_get result
  const [avatars, setAvatars] = useState({});    // username -> avatar_url
  const [cardUrl, setCardUrl] = useState("");
  const [cardErr, setCardErr] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [badAv, setBadAv] = useState({});
  const cardFile = useRef(null);                 // pre-built File so share() can run synchronously (Safari)

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

  const loadBanners = useCallback(async () => {
    if (!username || !ident?.mine) return;
    const r = await fetch(`/api/groves/banners?username=${encodeURIComponent(username)}`);
    if (r.ok) setBn(await r.json());
  }, [username, ident?.mine]);
  useEffect(() => { loadBanners(); }, [loadBanners, data?.grove?.id, data?.grove?.active_banner]);

  // member avatars (public profile pictures)
  const memberKey = (data?.members || []).map(m => m.username).join(",");
  useEffect(() => {
    if (!memberKey) { setAvatars({}); return; }
    supabase.from("Profiles").select("username, avatar_url").in("username", memberKey.split(","))
      .then(({ data: rows }) => setAvatars(Object.fromEntries((rows || []).map(r => [r.username, r.avatar_url]))));
  }, [memberKey]);

  const activeBanner = bn?.banners?.find(b => b.id === (data?.grove?.active_banner || bn?.active)) || { id: "default", art_path: "/grove-banners/default.webp" };

  // The share card preview IS the exported image (same renderer), rebuilt from real data whenever it changes.
  const cardKey = JSON.stringify([data?.grove?.name, data?.streak, (data?.members || []).map(m => [m.username, m.locked_today, avatars[m.username]]), activeBanner.id, activeBanner.art_path]);
  useEffect(() => {
    if (!data?.grove) return;
    let dead = false;
    setCardErr("");
    renderGroveCard({ grove: data.grove, streak: data.streak, banner: activeBanner,
      members: data.members.map(m => ({ ...m, avatarUrl: avatars[m.username] || null })) })
      .then(async url => {
        if (dead) return;
        setCardUrl(url);
        try { const blob = await (await fetch(url)).blob(); cardFile.current = new File([blob], "grove-card.png", { type: "image/png" }); } catch { cardFile.current = null; }
      })
      .catch(e => { if (!dead) setCardErr("Couldn't build the share card."); });
    return () => { dead = true; };
  }, [cardKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadCard = () => { if (!cardUrl) return; const a = document.createElement("a"); a.href = cardUrl; a.download = "touchgrass-grove.png"; a.click(); };
  const shareGrove = () => {
    const f = cardFile.current;
    const text = `${data.grove.name} — ${data.streak?.streak ?? 0} day Grove streak on Proof of Grass 🌿`;
    if (f && navigator.canShare?.({ files: [f] })) navigator.share({ files: [f], text, url: "https://proofofgrass.app/groves" }).catch(() => {});
    else downloadCard();
  };
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

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
    .gv-primary{padding:12px 22px;border-radius:24px;border:0;background:${V2.grassLime};color:${V2.forestGreen};font-weight:800;font-size:15px;cursor:pointer;flex:1 1 150px}
    .gv-primary:disabled{opacity:.55;cursor:default}
    .gv-wide{flex:1 1 150px;padding:11px 18px;font-size:14px}
    .gv-link{background:none;border:0;color:${V2.forestGreen};font-weight:700;font-size:14px;text-decoration:underline;cursor:pointer;padding:8px 4px}
    .gv-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .gv-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .gv-stat{border:1px solid ${V2.borderSoft};border-radius:14px;padding:12px 14px}
    .gv-stat-n{font-size:26px;font-weight:900;color:${V2.forestGreen};line-height:1.1}
    .gv-stat-n span{font-size:15px;font-weight:700;color:${V2.textMuted}}
    .gv-stat-l{font-size:13px;color:${V2.textMuted};margin-top:2px}
    .gv-avrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    .gv-av{position:relative;width:46px;height:46px;border-radius:50%;background:#dcefc9;display:inline-flex;align-items:center;justify-content:center;border:2px solid #cfdcc4}
    .gv-av img{width:100%;height:100%;border-radius:50%;object-fit:cover}
    .gv-av b{color:#2d6b1a}
    .gv-av i{position:absolute;right:-4px;bottom:-4px;width:18px;height:18px;border-radius:50%;font-size:11px;font-style:normal;font-weight:800;color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
    .gv-av i.ok{background:#5ba622}.gv-av i.no{background:#9aa58f}
    .gv-stack{display:inline-flex}
    .gv-mini{width:30px;height:30px;border-radius:50%;background:#dcefc9;border:2px solid #fff;margin-left:-8px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;font-size:13px;color:#2d6b1a;box-shadow:0 0 0 1px #cfdcc4}
    .gv-mini:first-child{margin-left:0}
    .gv-mini img{width:100%;height:100%;object-fit:cover}
    .gv-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
    .gv-tile{border:2px solid ${V2.borderSoft};border-radius:14px;padding:8px}
    .gv-tile.on{border-color:${V2.grassGreen};box-shadow:0 0 0 2px rgba(91,166,34,.18)}
    .gv-check{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:${V2.grassGreen};color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
    .gv-lock{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:12px}
    @media(max-width:420px){.gv-primary,.gv-wide{flex-basis:100%}}
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
          <div style={{ maxWidth: 640, margin: "0 auto 22px", textAlign: "center" }}>
            <p style={{ color: V2.textBody, margin: "0 0 12px", lineHeight: 1.6 }}>
              Team up with friends to build a shared streak. A grove needs at least 3 members to count and holds up to 6.
            </p>
            <p style={{ color: V2.textBody, margin: "0 0 16px", lineHeight: 1.6 }}>
              Once you have 3 or more, the grove streak grows each day that at least two thirds of members post a proof. Gift shields to keep each other going, and unlock banners to make your grove your own.
            </p>
            <Link href="/marketplace?tab=groves" style={{ ...V2Styles.btnPrimary, display: "inline-flex", textDecoration: "none", padding: "11px 22px", fontSize: 14 }}>
              🌳 Browse grove banners
            </Link>
          </div>

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
          {ident?.mine && grove && (() => {
            const amOwner = grove.owner === username;
            const counted = streak?.today_needed != null;
            const lockedN = data.members.filter(m => m.locked_today).length;
            const others = data.members.filter(m => m.username !== username);
            const lastMember = data.members.length === 1;
            return (
            <>
              <div className="gv-card" style={{ padding: 0, overflow: "hidden" }}>
                <GroveBanner banner={activeBanner} height={220} scrim showTag radius={0} style={{ minHeight: 200 }}>
                  <div style={{ position: "absolute", left: 20, right: 20, bottom: 16, color: "#fff" }}>
                    <div style={{ fontFamily: V2.fontSans, fontWeight: 900, fontSize: "clamp(26px,6vw,40px)", lineHeight: 1.05, textShadow: "0 2px 8px rgba(0,0,0,.4)", overflowWrap: "anywhere" }}>{grove.name}</div>
                  </div>
                </GroveBanner>
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                    <span style={{ fontWeight: 800, color: V2.forestGreen, fontSize: 18 }}>Your Grove</span>
                    {amOwner && <span className="gv-pill" style={{ background: "#e3f5d6", color: "#2d6a10" }}>👑 Owner</span>}
                  </div>
                  <div className="gv-stats">
                    <div className="gv-stat"><div className="gv-stat-n">🔥 {counted ? (streak?.streak ?? 0) : 0}<span> days</span></div><div className="gv-stat-l">Grove streak</div></div>
                    <div className="gv-stat"><div className="gv-stat-n">{data.members.length}<span> / {grove.slots}</span></div><div className="gv-stat-l">Members</div></div>
                  </div>
                  <div className="gv-avrow" aria-label="Today's participation">
                    {data.members.map(m => (
                      <span key={m.username} className="gv-av" title={`@${m.username}: ${m.locked_today ? "locked in" : "not yet"}`}>
                        {avatars[m.username] && !badAv[m.username] ? <img src={avatars[m.username]} alt="" onError={() => setBadAv(x => ({ ...x, [m.username]: true }))} /> : <b>{m.username[0]?.toUpperCase()}</b>}
                        <i className={m.locked_today ? "ok" : "no"}>{m.locked_today ? "✓" : "…"}</i>
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 14, color: V2.textBody, margin: "16px 0 14px" }}>
                    {!counted
                      ? `${lockedN} of ${data.members.length} locked in today. Not counting yet: a grove needs at least 3 members. Invite ${Math.max(0, 3 - data.members.length)} more ${3 - data.members.length === 1 ? "friend" : "friends"} to start your grove streak.`
                      : streak.today_complete
                        ? <><b>{streak.today_locked} of {streak.today_members} locked in today</b> <span className="gv-pill" style={{ background: "#e3f5d6", color: "#2d6a10", marginLeft: 6 }}>✓ Daily goal reached</span></>
                        : `${streak.today_locked} of ${streak.today_members} locked in today · ${streak.today_needed} needed for the daily goal.`}
                  </div>
                  <div className="gv-actions">
                    <button className="gv-primary" onClick={shareGrove} disabled={!cardUrl}>Share Grove</button>
                    {data.members.length < grove.slots && inviteUrl && <button className="gv-btn2 gv-wide" onClick={copy}>{copied ? "Link copied!" : "Invite friends"}</button>}
                    {others.length > 0 && <button className="gv-link" onClick={() => scrollTo("gv-members")}>🛡️ Gift a shield</button>}
                  </div>
                </div>
              </div>

              <div className="gv-card" id="gv-appearance">
                <div className="gv-h" style={{ fontSize: 20 }}>🖼️ Grove appearance</div>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: V2.textMuted }}>Unlocked for {grove.name}</p>
                <div className="gv-tiles">
                  {(bn?.banners || []).map(b => {
                    const active = b.id === activeBanner.id;
                    return (
                      <div key={b.id} className={`gv-tile${active ? " on" : ""}`}>
                        <div style={{ position: "relative" }}>
                          <GroveBanner banner={b} height={96} radius={10} />
                          {active && <span className="gv-check" aria-label="Active banner">✓</span>}
                          {!b.unlocked && <span className="gv-lock" aria-hidden>🔒</span>}
                        </div>
                        <div style={{ fontWeight: 700, color: V2.forestGreen, fontSize: 14, margin: "8px 0 4px" }}>{b.name}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", minHeight: 28 }}>
                          {b.unlocked && <span className="gv-pill" style={{ background: "#e3f5d6", color: "#2d6a10" }}>{b.is_default ? "Free" : "Unlocked"}</span>}
                          {active && <span className="gv-pill" style={{ background: "#fff3cf", color: "#7a5a00" }}>Active</span>}
                          {b.unlocked && !active && amOwner && (
                            <button className="gv-btn2" disabled={busy === `eq-${b.id}`} onClick={() => act(`eq-${b.id}`, "/api/groves/banners/equip", { bannerId: b.id }, `${b.name} is now your Grove's banner.`)}>Set active banner</button>
                          )}
                          {!b.unlocked && (
                            <Link className="gv-link" href={`/marketplace?tab=groves`}>{b.purchasable ? "View in Marketplace" : "Coming soon"}</Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!bn && <div style={{ color: V2.textMuted, fontSize: 14 }}>Loading…</div>}
                </div>
                <p style={{ fontSize: 12, color: V2.textMuted, margin: "12px 0 0" }}>{BANNER_PERMISSION_NOTE}</p>
              </div>

              <div className="gv-card">
                <div className="gv-h" style={{ fontSize: 18 }}>Share card preview</div>
                {cardErr && <div style={{ color: "#b3261e", fontSize: 14 }}>{cardErr}</div>}
                {cardUrl ? <img src={cardUrl} alt="Grove share card" style={{ width: "100%", borderRadius: 12, display: "block", border: `1px solid ${V2.borderSoft}` }} /> : !cardErr && <div style={{ color: V2.textMuted, fontSize: 14 }}>Building…</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button className="gv-primary" onClick={shareGrove} disabled={!cardUrl}>Share Grove</button>
                  <button className="gv-btn2 gv-wide" onClick={downloadCard} disabled={!cardUrl}>Download image</button>
                </div>
              </div>

              <div className="gv-card" id="gv-members">
                <div className="gv-h" style={{ fontSize: 18 }}>Members</div>
                {data.members.map(m => {
                  const me = m.username === username;
                  return (
                    <div className="gv-row" key={m.username}>
                      <Link href={`/u/${m.username}`} style={{ fontWeight: 700, color: V2.forestGreen, textDecoration: "none", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        @{m.username}{me ? " (you)" : ""}{m.username === grove.owner ? " 👑" : ""}
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
                  <button className="gv-btn2" onClick={() => { setConfirmLeave(true); setNewOwner(""); }}>Leave grove</button>
                ) : (
                  <div className="gv-card" style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700, color: V2.forestGreen, marginBottom: 6 }}>Leave {grove.name}?</div>
                    <p style={{ margin: "0 0 12px", fontSize: 14, color: V2.textBody }}>You won't be able to join or create another grove for 48 hours. Banners unlocked for this Grove stay with the Grove, not with you.</p>
                    {amOwner && !lastMember && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: V2.forestGreen, marginBottom: 6 }}>You're the owner. Choose who takes over:</label>
                        <select className="gv-in" value={newOwner} onChange={e => setNewOwner(e.target.value)} aria-label="New owner">
                          <option value="">Select a member…</option>
                          {others.map(m => <option key={m.username} value={m.username}>@{m.username}</option>)}
                        </select>
                      </div>
                    )}
                    {lastMember && <p style={{ margin: "0 0 12px", fontSize: 14, color: "#b3261e" }}>You're the last member. Leaving disbands this Grove and ends access to its banners.</p>}
                    <button className="gv-btn2" disabled={busy === "leave" || (amOwner && !lastMember && !newOwner)} onClick={async () => { const ok = await act("leave", "/api/groves/leave", { newOwner: amOwner && !lastMember ? newOwner : undefined }, "You left the grove."); if (ok) setConfirmLeave(false); }}>{busy === "leave" ? "Leaving…" : lastMember ? "Yes, disband and leave" : "Yes, leave"}</button>{" "}
                    <button className="gv-btn2" onClick={() => setConfirmLeave(false)}>Cancel</button>
                  </div>
                )}
              </div>
            </>
            );
          })()}

          {/* Leaderboard */}
          <div className="gv-card">
            <div className="gv-h" style={{ fontSize: 20 }}>🏆 Top groves</div>
            {board.length === 0 ? (
              <p style={{ margin: 0, color: V2.textMuted, fontSize: 14 }}>No groves on the board yet. Groves with 3 or more members and a running streak appear here.</p>
            ) : board.map((g, i) => (
              <div className="gv-row" key={g.id}>
                <span style={{ width: 24, fontWeight: 800, color: V2.textMuted, alignSelf: "flex-start", paddingTop: 2 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: V2.forestGreen, overflowWrap: "anywhere" }}>{g.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {(g.member_list || []).length > 0 && (
                      <span className="gv-stack" aria-label={`Members: ${(g.member_list || []).map(m => "@" + m.username).join(", ")}`}>
                        {g.member_list.map(m => (
                          <span key={m.username} className="gv-mini" title={`@${m.username}`}>
                            {m.avatar_url && !badAv[m.username] ? <img src={m.avatar_url} alt="" onError={() => setBadAv(x => ({ ...x, [m.username]: true }))} /> : <b>{m.username[0]?.toUpperCase()}</b>}
                          </span>
                        ))}
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: V2.textMuted }}>{g.members} members</span>
                  </div>
                </div>
                <span className="gv-pill" style={{ background: "#e3f5d6", color: "#2d6a10", alignSelf: "flex-start" }}>{g.streak}d</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
