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
  .ac-m { display:none; } .ac-d { display:inline-flex; }
  @media (max-width:1100px) { .ac-m { display:inline-flex; } .ac-d { display:none; } }
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

  useEffect(() => {
    if (usernameProp) { setUsername(usernameProp); return; }
    try { setUsername(localStorage.getItem("pog_username") || ""); } catch {}
  }, [usernameProp, open]);

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
        className={`ac-btn ${variant === "m" ? "ac-m" : "ac-d"} ${signedIn ? "in" : ""}`}
        aria-haspopup="dialog" aria-expanded={open}
        aria-label={signedIn ? "Account: signed in" : loading ? "Account" : "Account: not signed in. Tap to sign in"}
        style={{ opacity: loading ? 0.5 : 1 }}>
        {signedIn
          ? (image && imgOk
              ? <img src={image} alt="" referrerPolicy="no-referrer" onError={() => setImgOk(false)} />
              : <span aria-hidden="true">{initial}</span>)
          : <PersonIcon />}
        {signedIn && <span className="ac-badge" aria-hidden="true">✓</span>}
        {!signedIn && !loading && <span className="ac-dot" aria-hidden="true" />}
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
              {username && <Link href={`/u/${username}`} className="ac-link" onClick={() => setOpen(false)}>My profile (@{username})</Link>}
              <button type="button" className="ac-link" onClick={doSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 14, color: V2.forestGreen, marginBottom: 4 }}>You're not signed in</div>
              <div style={{ fontSize: 12.5, color: V2.textSecondary, lineHeight: 1.45, marginBottom: 10 }}>
                Sign in with Google to secure your username, keep your streak safe and buy in the Marketplace. Your email is never shown to others.
              </div>
              <InAppBrowserNote style={{ margin: "0 0 10px" }} />
              <button type="button" onClick={() => signInWithGoogle({ callbackUrl: typeof window !== "undefined" ? window.location.href : "/" })}
                style={{ ...V2Styles.btnPrimary, padding: "10px 20px", width: "100%" }}>
                Continue with Google
              </button>
            </>
          )}
        </div>, document.body)}
    </>
  );
}
