// components/V2BottomNav.js
// V2 mobile bottom navigation — 5 tabs
import Link from "next/link";
import { useRouter } from "next/router";
import { V2 } from "../utils/v2Theme";

const TABS = [
  { href: "/",            label: "Home",       icon: "🏠" },
  { href: "#upload",      label: "Log Proof",  icon: "🌿", action: true },
  { href: "/u/",          label: "Profile",    icon: "👤", profile: true },
  { href: "/leaderboard", label: "Leaderboard",icon: "🏆" },
  { href: "#more",        label: "More",       icon: "···", more: true },
];

export default function V2BottomNav({ username, onLogProof, onMore }) {
  const router = useRouter();

  const css = `
    .v2-bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
      height: 64px;
      display: flex; align-items: stretch;
      background: rgba(255,255,255,0.96);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(200,220,190,0.5);
      box-shadow: 0 -2px 20px rgba(26,74,10,0.08);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .v2-bottom-nav-tab {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 3px;
      text-decoration: none; cursor: pointer; border: none;
      background: transparent; padding: 6px 4px;
      color: ${V2.midGray}; transition: all 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .v2-bottom-nav-tab.active { color: ${V2.grassGreen}; }
    .v2-bottom-nav-tab:active { transform: scale(0.92); }
    .v2-bottom-nav-icon { font-size: 20px; line-height: 1; }
    .v2-bottom-nav-label { font-size: 10px; font-weight: 500; font-family: ${V2.fontSans}; letter-spacing: 0.02em; }
    .v2-bottom-nav-action {
      background: ${V2.gradientGrassBtn};
      border-radius: 16px; padding: 8px 14px; margin: 6px 8px;
      box-shadow: 0 2px 10px rgba(125,200,50,0.4);
    }
    .v2-bottom-nav-action .v2-bottom-nav-icon { color: white; }
    .v2-bottom-nav-action .v2-bottom-nav-label { color: rgba(255,255,255,0.9); }
    .v2-bottom-nav-dot {
      width: 4px; height: 4px; border-radius: 50%;
      background: ${V2.grassGreen};
      position: absolute; top: 6px;
    }
    @media (min-width: 768px) {
      .v2-bottom-nav { display: none; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <nav className="v2-bottom-nav">
        {TABS.map((tab, i) => {
          const isActive = !tab.action && !tab.more &&
            (tab.profile ? router.pathname.startsWith("/u/") : router.pathname === tab.href);

          if (tab.action) return (
            <button key={i} className="v2-bottom-nav-tab"
              onClick={onLogProof} style={{ position: "relative" }}>
              <div className="v2-bottom-nav-action">
                <div className="v2-bottom-nav-icon">{tab.icon}</div>
                <div className="v2-bottom-nav-label">{tab.label}</div>
              </div>
            </button>
          );

          if (tab.more) return (
            <button key={i} className="v2-bottom-nav-tab"
              onClick={onMore}>
              <div className="v2-bottom-nav-icon" style={{ fontSize: 16, letterSpacing: 2 }}>
                •••
              </div>
              <div className="v2-bottom-nav-label">{tab.label}</div>
            </button>
          );

          if (tab.profile) return (
            <Link key={i}
              href={username ? `/u/${username}` : "/"}
              className={`v2-bottom-nav-tab${isActive ? " active" : ""}`}>
              <div className="v2-bottom-nav-icon">{tab.icon}</div>
              <div className="v2-bottom-nav-label">{tab.label}</div>
            </Link>
          );

          return (
            <Link key={i} href={tab.href}
              className={`v2-bottom-nav-tab${isActive ? " active" : ""}`}>
              <div className="v2-bottom-nav-icon">{tab.icon}</div>
              <div className="v2-bottom-nav-label">{tab.label}</div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}