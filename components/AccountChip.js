// components/AccountChip.js
// A small round account icon for the site nav.
//   signed in  -> your Google photo (or initial) with a green check; tap for who you are + sign out
//   signed out -> a plain person icon; tap to sign in with Google
// The popover is portalled to <body> so the nav's backdrop-filter can't clip or misplace it.
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { V2, V2Styles } from "../utils/v2Theme";
import { signInWithGoogle, forgetGoogleHint } from "../utils/googleSignIn";
import InAppBrowserNote from "./InAppBrowserNote";

const CSS = `
  .ac-btn { position:relative; width:34px; height:34px; border-radius:50%; flex-shrink:0; cursor:pointer; padding:0;
    display:inline-flex; align-items:center; justify-content:center; font-family:${V2.fontSans}; font-weight:800; font-size:14px;
    border:1.5px solid rgba(200,220,190,0.8); background:rgba(255,255,255,0.85); color:${V2.forestGreen}; overflow:visible; }
  .ac-btn.in { border-color:${V2.grassGreen}; background:linear-gradient(135deg,#7dc832,#5ba622); color:#fff; }
  .ac-btn img { width:100%; height:100%; border-radius:50%; object-fit:cover; display:block; }
  .ac-badge { position:absolute; right:-3px; bottom:-3px; width:15px; height:15px; border-radius:50%; background:#5ba622; color:#fff;
    border:2px solid #fff; font-size:8px; line-height:11px; text-align:center; font-weight:900; }
  .ac-dot { position:absolute; right:-2px; bottom:-2px; width:10px; height:10px; border-radius:50%; background:#c9c9c9; border:2px solid #fff; }
  .ac-pop { position:fixed; z-index:500; width:min(300px, calc(100vw - 24px)); background:rgba(255,255,255,0.99);
    border:1px solid rgba(200,220,190,0.7); border-radius:16px; box-shadow:0 12px 40px rgba(26,74,10,0.18); padding:14px; font-family:${V2.fontSans}; }
  .ac-link { display:block; width:100%; text-align:left; padding:10px 12px; border-radius:10px; border:none; background:transparent; cursor:pointer;
    font-family:${V2.fontSans}; font-size:13.5px; font-weight:600; color:${V2.forestGreen}; text-decoration:none; }
  .ac-link:hover { background:rgba(125,200,50,0.10); }
  .ac-btn.ac-cta { width:auto; height:34px; border-radius:20px; padding:0 14px; gap:6px; white-space:nowrap; font-size:13px;
    border:none; background:linear-gradient(135deg,#7dc832,#5ba622); color:#fff; box-shadow:0 2px 8px rgba(91,166,34,0.35); }
  .ac-cta .ac-long { display:inline; } .ac-cta .ac-short { display:none; }
  .ac-steps { margin:0 0 12px; padding:0; list-style:none; display:flex; flex-direction:column; gap:8px; }
  .ac-steps li { display:flex; gap:10px; align-items:flex-start; font-size:12.5px; line-height:1.4; color:${V2.textSecondary}; }
  .ac-steps b { color:${V2.forestGreen}; }
  .ac-num { flex-shrink:0; width:20px; height:20px; border-radius:50%; background:rgba(125,200,50,0.18); color:${V2.forestGreen}; font-weight:800; font-size:11.5px; display:inline-flex; align-items:center; justify-content:center; }
  .ac-m { display:none; } .ac-d { display:inline-flex; }
  @media (max-width:1100px) { .ac-m { display:inline-flex; } .ac-d { display:none; } }
  @media (max-width:480px) { .ac-cta .ac-long { display:none; } .ac-cta .ac-short { display:inline; } .ac-btn.ac-cta { padding:0 12px; } }
`;

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export default function AccountChip({ variant = "d", username: usernameProp }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 12 });
  const [imgOk, setImgOk] = useState(true);
  const [username, setUsername] = useState(usernameProp || "");
  const btn = useRef(null);
  const pop = useRef(null);
  const [draft, setDraft] = useState("");
  const [chk, setChk] = useState(null);     // status for draft (signed out) or saved username (signed in)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const clean = (v) => String(v || "").replace(/@/g, "").toLowerCase().trim().slice(0, 64);

  useEffect(() => {
    if (usernameProp) { setUsername(usernameProp); return; }
    try { setUsername(localStorage.getItem("pog_username") || ""); } catch {}
  }, [usernameProp, open]);

  // Returning user on a fresh device: pull the username their Google account secured.
  useEffect(() => {
    if (status !== "authenticated") return;
    let dead = false;
    (async () => {
      try {
        if (localStorage.getItem("pog_username")) return;
        const r = await fetch("/api/username/mine"); const j = await r.json();
        if (!dead && j?.username) { localStorage.setItem("pog_username", j.username); setUsername(j.username); }
      } catch {}
    })();
    return () => { dead = true; };
  }, [status]);

  // Live availability check: the typed name when signed out, the saved name when signed in.
  useEffect(() => {
    const u = clean(status === "authenticated" ? username : draft);
    if (!open || !u || status === "loading") { setChk(null); return; }
    let off = false;
    const t = setTimeout(() => {
      fetch(`/api/username/status?username=${encodeURIComponent(u)}`).then(r => r.json())
        .then(d => { if (!off) setChk({ ...d, u }); }).catch(() => {});
    }, 350);
    return () => { off = true; clearTimeout(t); };
  }, [draft, username, status, open]);

  const startGoogle = () => {
    const u = clean(draft);
    const taken = chk && chk.u === u && chk.claimed;
    if (u && !taken) { try { localStorage.setItem("pog_username", u); } catch {} }
    signInWithGoogle({ callbackUrl: typeof window !== "undefined" ? window.location.href : "/" });
  };
  const secure = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/username/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: clean(username) }) });
      const d = await r.json();
      if (!r.ok) setErr(d.error || "Something went wrong."); else setChk({ ...chk, claimed: true, mine: true });
    } catch { setErr("Network error. Try again."); }
    setBusy(false);
  };

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: Math.max(12, window.innerWidth - r.right) });
  }, [open]);

  useEffect(() => { setOpen(false); }, [router.asPath]);
  useEffect(() => {
    if (!open) return;
    const away = (e) => {
      if (pop.current?.contains(e.target) || btn.current?.contains(e.target)) return;
      setOpen(false);
    };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const signedIn = status === "authenticated";
  const loading = status === "loading";
  const name = session?.user?.name || "";
  const email = session?.user?.email || "";
  const image = session?.user?.image;
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  const doSignOut = async () => {
    setOpen(false);
    forgetGoogleHint();
    await signOut({ redirect: false });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <button ref={btn} type="button" onClick={() => setOpen((o) => !o)}
        className={`ac-btn ${variant === "m" ? "ac-m" : "ac-d"} ${signedIn ? "in" : ""} ${!signedIn && !loading ? "ac-cta" : ""}`}
        aria-haspopup="dialog" aria-expanded={open}
        aria-label={signedIn ? "Account: signed in" : loading ? "Account" : "Account: not signed in. Tap to sign in"}
        style={{ opacity: loading ? 0.5 : 1 }}>
        {signedIn
          ? (image && imgOk
              ? <img src={image} alt="" referrerPolicy="no-referrer" onError={() => setImgOk(false)} />
              : <span aria-hidden="true">{initial}</span>)
          : loading ? <PersonIcon />
          : <><PersonIcon /><span className="ac-long">Sign in / Sign up</span><span className="ac-short">Sign in</span></>}
        {signedIn && <span className="ac-badge" aria-hidden="true">✓</span>}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div ref={pop} className="ac-pop" role="dialog" aria-label="Account" style={{ top: pos.top, right: pos.right }}>
          {signedIn ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5ba622", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: V2.forestGreen }}>Signed in</div>
                  <div style={{ fontSize: 12, color: V2.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name || email}{name && email ? ` · ${email}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: V2.textSecondary, lineHeight: 1.45, marginBottom: 8 }}>
                Your Google account is linked on this device. Your email is never shown to others.
              </div>
              {username && chk && chk.u === clean(username) && (
                chk.mine ? <div style={{ fontSize: 12.5, color: "#3d8a12", fontWeight: 700, marginBottom: 8 }}>✓ @{username} is secured to your account</div>
                : chk.claimed ? <div style={{ fontSize: 12.5, color: "#b3261e", marginBottom: 8 }}>@{username} is secured by another account.</div>
                : chk.posted ? (
                  <button type="button" onClick={secure} disabled={busy} style={{ ...V2Styles.btnPrimary, padding: "9px 16px", width: "100%", marginBottom: 8 }}>
                    {busy ? "Securing…" : `Secure @${username}`}
                  </button>
                ) : <div style={{ fontSize: 12.5, color: V2.textSecondary, lineHeight: 1.45, marginBottom: 8 }}>Post your first proof as @{username}, then come back here to secure it.</div>
              )}
              {err && <div role="alert" style={{ fontSize: 12.5, color: "#b3261e", marginBottom: 8 }}>{err}</div>}
              {username && <Link href={`/u/${username}`} className="ac-link" onClick={() => setOpen(false)}>My profile (@{username})</Link>}
              <button type="button" className="ac-link" onClick={doSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 15, color: V2.forestGreen, marginBottom: 8 }}>🌱 Welcome to Proof of Grass</div>
              <ol className="ac-steps">
                <li><span className="ac-num">1</span><span><b>Pick your username</b> — it's how you show up on the leaderboard.</span></li>
                <li><span className="ac-num">2</span><span><b>Sign in with Google</b> so your name and streak are yours.</span></li>
                <li><span className="ac-num">3</span><span><b>Go touch grass</b> and post your first proof, then secure your name.</span></li>
              </ol>
              <input value={draft} onChange={(e) => setDraft(e.target.value.replace(/@/g, "").toLowerCase())} placeholder="your username (new here? pick one)"
                maxLength={64} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1.5px solid rgba(200,220,190,0.9)", fontFamily: V2.fontSans, fontSize: 14, marginBottom: 6 }} />
              <div style={{ minHeight: 18, fontSize: 12, marginBottom: 8, color: V2.textSecondary }}>
                {chk && chk.u === clean(draft) && (
                  chk.claimed ? <span style={{ color: "#b3261e" }}>@{chk.u} is already secured by someone. Try another name.</span>
                  : chk.posted ? <span>@{chk.u} is already on the board — if that's you, sign in to secure it.</span>
                  : <span style={{ color: "#3d8a12", fontWeight: 700 }}>✓ @{chk.u} is available</span>
                )}
              </div>
              <InAppBrowserNote style={{ margin: "0 0 10px" }} />
              <button type="button" onClick={startGoogle}
                style={{ ...V2Styles.btnPrimary, padding: "10px 20px", width: "100%" }}>
                Sign up / Sign in with Google
              </button>
              <div style={{ fontSize: 11.5, color: V2.textSecondary, textAlign: "center", marginTop: 8 }}>
                Returning? Leave the name blank and sign in. Your email is never shown to others.
              </div>
            </>
          )}
        </div>, document.body)}
    </>
  );
}
