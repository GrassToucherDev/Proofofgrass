// components/wago-drops/WagoDropsNav.js
// Shared WAGO Drops navigation — Proof of Grass V2 design system.
// Desktop: glass top bar with inline links. Mobile: logo bar + fixed bottom
// tabs (Explore / Saved / My Drops / Settings), V2BottomNav pattern.

import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { signIn, signOut, useSession } from "next-auth/react";
import { V2 } from "../../utils/v2Theme";

const TABS = [
  {
    href: "/wago-drops", label: "Explore",
    icon: (c) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    href: "/wago-drops/saved", label: "Saved",
    icon: (c) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/wago-drops/my-drops", label: "My Drops",
    icon: (c) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
      </svg>
    ),
  },
  {
    href: "/wago-drops/settings", label: "Settings",
    icon: (c) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function isActive(router, href) {
  if (href === "/wago-drops") return router.pathname === "/wago-drops";
  return router.pathname.startsWith(href);
}

// ── Top bar ───────────────────────────────────────────────────────────────────
export function WagoDropsNav({ session }) {
  const router = useRouter();
  return (
    <>
      <Head><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet" /></Head>
      <style>{`
        .wd-nav {
          position: sticky; top: 0; z-index: 200;
          height: 58px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(14px, 4vw, 40px);
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid ${V2.borderSoft};
          box-shadow: 0 2px 16px rgba(26,74,10,0.08);
        }
        .wd-nav-links { display: flex; align-items: center; gap: 2px; }
        .wd-nav-link {
          font-family: ${V2.fontSans};
          font-size: 13px; font-weight: 600; color: ${V2.forestGreen};
          text-decoration: none; padding: 7px 14px; border-radius: 20px;
          transition: all 0.15s; white-space: nowrap;
        }
        .wd-nav-link:hover { background: rgba(125,200,50,0.12); color: ${V2.grassGreen}; }
        .wd-nav-link.active { background: rgba(125,200,50,0.16); color: ${V2.grassGreen}; }
        @media (max-width: 680px) {
          .wd-nav-links { display: none; }
        }
      `}</style>
      <nav className="wd-nav">
        <Link href="/wago-drops" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <img src="/images/wago/wago-drops-logo-sm.png" alt="WAGO Drops" style={{ height: 46, width: "auto", display: "block" }} />
        </Link>

        {session && (
          <div className="wd-nav-links">
            {TABS.map(t => (
              <Link key={t.href} href={t.href}
                className={`wd-nav-link${isActive(router, t.href) ? " active" : ""}`}>
                {t.label}
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {session ? (
            <>
              {session.user?.image && (
                <img src={session.user.image} alt=""
                  style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${V2.borderSoft}` }} />
              )}
              <span className="v2-desktop-only" style={{ fontSize: 13, fontWeight: 600, color: V2.forestMid }}>
                {session.user?.name?.split(" ")[0]}
              </span>
              <button onClick={() => signOut({ callbackUrl: "/wago-drops" })} className="v2-desktop-only" style={{
                fontSize: 12, fontWeight: 600, color: V2.dimGray, background: "none",
                border: `1.5px solid ${V2.borderSoft}`, borderRadius: 20, padding: "5px 12px", cursor: "pointer",
              }}>Sign out</button>
            </>
          ) : (
            <button onClick={() => signIn("google")} style={{
              background: V2.gradientGrassBtn, color: V2.white, border: "none",
              borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 2px 10px rgba(125,200,50,0.35)",
            }}>Sign in with Google</button>
          )}
        </div>
      </nav>
    </>
  );
}

// ── Mobile bottom tabs ────────────────────────────────────────────────────────
export function WagoDropsBottomNav() {
  const router = useRouter();
  const { data: session } = useSession();
  if (!session) return null;   // tabs are for signed-in users
  return (
    <>
      <style>{`
        .wd-bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 210;
          height: 62px;
          display: none;
          align-items: stretch;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid ${V2.borderSoft};
          box-shadow: 0 -2px 20px rgba(26,74,10,0.08);
          padding-bottom: env(safe-area-inset-bottom);
        }
        @media (max-width: 680px) {
          .wd-bottom-nav { display: flex; }
          body { padding-bottom: calc(62px + env(safe-area-inset-bottom)); }
        }
        .wd-bottom-tab {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 3px;
          text-decoration: none; -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s;
        }
        .wd-bottom-tab:active { transform: scale(0.92); }
        .wd-bottom-label {
          font-family: ${V2.fontSans}; font-size: 10px; font-weight: 600; letter-spacing: 0.02em;
        }
      `}</style>
      <nav className="wd-bottom-nav">
        {TABS.map(t => {
          const active = isActive(router, t.href);
          const color = active ? V2.grassGreen : V2.midGray;
          return (
            <Link key={t.href} href={t.href} className="wd-bottom-tab">
              {t.icon(color)}
              <span className="wd-bottom-label" style={{ color }}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// Spacer so fixed bottom tabs never cover page content on mobile.
export function WagoDropsBottomNavSpacer() {
  return (
    <>
      <style>{`
        .wd-bottom-spacer { display: none; }
        @media (max-width: 680px) {
          .wd-bottom-spacer { display: block; height: calc(62px + env(safe-area-inset-bottom)); }
        }
      `}</style>
      <div className="wd-bottom-spacer" />
    </>
  );
}
