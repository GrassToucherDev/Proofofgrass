// components/V2Nav.js
// V2 shared navigation — glass white, horizontal links, avatar pill
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { V2, V2Styles } from "../utils/v2Theme";

const NAV_LINKS = [
  { href: "/",            label: "Dashboard"    },
  { href: "#upload",      label: "Log Proof",  internal: true },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/grass-draw",  label: "Grass Draw"  },
  { href: "/marketplace", label: "Marketplace" },
  { href: "https://harvest.touchgrass.today", label: "Harvest", external: true },
];

const MENU_LINKS = [
  { href: "/",             label: "Dashboard",    icon: "🏠" },
  { href: "#upload",       label: "Log Proof",    icon: "🌿", internal: true },
  { href: "/leaderboard",  label: "Leaderboard",  icon: "🏆" },
  { href: "/grass-draw",   label: "Grass Draw",   icon: "🌱" },
  { href: "/marketplace",  label: "Marketplace",  icon: "🏪" },
  { href: "/map",          label: "World Map",    icon: "🗺️" },
  { href: "/field-guide",  label: "Field Guide",  icon: "📖" },
  { href: "https://harvest.touchgrass.today", label: "Harvest", icon: "🌾", external: true },
];

export default function V2Nav({ username, onUsernameChange, showUpload }) {
  const router   = useRouter();
  const [menu,   setMenu]   = useState(false);
  const [raw,    setRaw]    = useState(username || "");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setRaw(username || ""); }, [username]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleProfile = () => {
    const u = raw.trim().replace(/@/g, "").toLowerCase();
    if (u) { localStorage.setItem("pog_username", u); onUsernameChange?.(u); router.push(`/u/${u}`); }
  };

  const css = `
    .v2nav {
      position: sticky; top: 0; z-index: 200;
      height: 60px;
      display: flex; align-items: center;
      padding: 0 clamp(14px, 4vw, 40px);
      gap: 24px;
      background: rgba(255,255,255,${scrolled ? "0.92" : "0.85"});
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(200,220,190,0.5);
      box-shadow: ${scrolled ? "0 2px 20px rgba(26,74,10,0.10)" : "0 1px 8px rgba(26,74,10,0.06)"};
      transition: all 0.2s;
    }
    .v2nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
    .v2nav-logo-text { font-family: ${V2.fontSans}; font-size: 15px; font-weight: 700; color: ${V2.forestGreen}; }
    .v2nav-logo-sub  { font-size: 13px; font-weight: 400; color: ${V2.forestMid}; opacity: 0.7; }
    .v2nav-links { display: flex; align-items: center; gap: 4px; flex: 1; }
    .v2nav-link {
      font-size: 13px; font-weight: 500; color: ${V2.forestGreen};
      text-decoration: none; padding: 6px 12px; border-radius: 20px;
      transition: all 0.15s; white-space: nowrap;
    }
    .v2nav-link:hover { background: rgba(125,200,50,0.12); color: ${V2.grassGreen}; }
    .v2nav-link.active { background: rgba(125,200,50,0.15); color: ${V2.grassGreen}; font-weight: 600; }
    .v2nav-right { display: flex; align-items: center; gap: 10px; margin-left: auto; flex-shrink: 0; }
    .v2nav-input-wrap { display: flex; align-items: center; gap: 8px; }
    .v2nav-input {
      background: rgba(255,255,255,0.8);
      border: 1.5px solid rgba(200,220,190,0.6);
      border-radius: 20px; padding: 7px 14px;
      font-size: 13px; font-family: ${V2.fontSans};
      color: ${V2.forestGreen}; outline: none; width: 130px;
      transition: all 0.15s;
    }
    .v2nav-input:focus { border-color: ${V2.grassGreen}; width: 160px; box-shadow: 0 0 0 3px rgba(125,200,50,0.15); }
    .v2nav-input::placeholder { color: ${V2.midGray}; }
    .v2nav-profile-btn {
      background: ${V2.gradientGrassBtn};
      color: white; border: none; border-radius: 20px;
      padding: 7px 16px; font-size: 13px; font-weight: 600;
      cursor: pointer; white-space: nowrap;
      box-shadow: 0 2px 8px rgba(125,200,50,0.3);
      transition: all 0.15s;
    }
    .v2nav-profile-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(125,200,50,0.4); }
    .v2nav-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: ${V2.gradientGrassBtn};
      border: 2px solid rgba(125,200,50,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; cursor: pointer;
      box-shadow: 0 2px 8px rgba(125,200,50,0.2);
    }
    .v2nav-hamburger {
      width: 36px; height: 36px; border-radius: 10px;
      background: rgba(255,255,255,0.8); border: 1.5px solid rgba(200,220,190,0.5);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px; cursor: pointer; flex-shrink: 0;
    }
    .v2nav-hamburger span {
      display: block; width: 16px; height: 1.5px;
      background: ${V2.forestGreen}; border-radius: 2px;
      transition: all 0.2s;
    }
    /* Menu overlay */
    .v2menu-overlay {
      position: fixed; inset: 0; z-index: 199;
      background: rgba(0,0,0,0.2); backdrop-filter: blur(4px);
    }
    .v2menu-panel {
      position: fixed; top: 60px; right: 0; bottom: 0; z-index: 200;
      width: min(320px, 85vw);
      background: rgba(255,255,255,0.97);
      backdrop-filter: blur(20px);
      border-left: 1px solid rgba(200,220,190,0.5);
      box-shadow: -4px 0 40px rgba(26,74,10,0.12);
      overflow-y: auto; padding: 16px 0;
      animation: slideInRight 0.2s ease;
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .v2menu-item {
      display: flex; align-items: center; gap: 14px;
      padding: 13px 24px; text-decoration: none;
      font-size: 14px; font-weight: 500; color: ${V2.forestGreen};
      transition: background 0.12s; cursor: pointer;
    }
    .v2menu-item:hover { background: rgba(125,200,50,0.08); }
    .v2menu-item span.icon { font-size: 18px; width: 24px; text-align: center; }
    .v2menu-divider { height: 1px; background: rgba(200,220,190,0.4); margin: 8px 24px; }
    /* Responsive */
    @media (max-width: 768px) {
      .v2nav-links { display: none; }
      .v2nav-input { width: 110px; }
      .v2nav-input:focus { width: 130px; }
    }
    @media (max-width: 480px) {
      .v2nav-logo-sub { display: none; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <nav className="v2nav">
        {/* Logo */}
        <Link href="/" className="v2nav-logo">
          <img src="/touchgrass-transparent.png" alt="Touch Grass"
            style={{ width: 32, height: 32, objectFit: "contain" }} />
          <span className="v2nav-logo-text">
            Touch Grass
            <span className="v2nav-logo-sub"> · Proof of Grass</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="v2nav-links">
          {NAV_LINKS.map(link => {
            const active = !link.internal && !link.external && router.pathname === link.href;
            if (link.external) return (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                className={`v2nav-link${active ? " active" : ""}`}>
                {link.label}
              </a>
            );
            if (link.internal) return (
              <a key={link.label} href={link.href}
                className="v2nav-link"
                onClick={e => { e.preventDefault(); showUpload?.(); }}>
                {link.label}
              </a>
            );
            return (
              <Link key={link.label} href={link.href}
                className={`v2nav-link${active ? " active" : ""}`}>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="v2nav-right">
          {/* Username input */}
          <div className="v2nav-input-wrap">
            <input className="v2nav-input" type="text"
              placeholder="your username"
              value={raw}
              onChange={e => setRaw(e.target.value.replace(/@/g, "").toLowerCase())}
              onKeyDown={e => { if (e.key === "Enter") handleProfile(); }}
            />
            {raw && (
              <button className="v2nav-profile-btn" onClick={handleProfile}>
                My Profile →
              </button>
            )}
          </div>

          {/* Avatar if logged in */}
          {username && (
            <div className="v2nav-avatar" onClick={() => router.push(`/u/${username}`)}>
              🌿
            </div>
          )}

          {/* Hamburger */}
          <div className="v2nav-hamburger" onClick={() => setMenu(m => !m)}
            role="button" aria-label="Menu">
            <span />
            <span />
            <span />
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menu && (
        <>
          <div className="v2menu-overlay" onClick={() => setMenu(false)} />
          <div className="v2menu-panel">
            {MENU_LINKS.map((link, i) => {
              if (link.external) return (
                <a key={i} href={link.href} target="_blank" rel="noopener noreferrer"
                  className="v2menu-item" onClick={() => setMenu(false)}>
                  <span className="icon">{link.icon}</span>{link.label}
                </a>
              );
              if (link.internal) return (
                <a key={i} href={link.href} className="v2menu-item"
                  onClick={() => { setMenu(false); showUpload?.(); }}>
                  <span className="icon">{link.icon}</span>{link.label}
                </a>
              );
              return (
                <Link key={i} href={link.href} className="v2menu-item"
                  onClick={() => setMenu(false)}>
                  <span className="icon">{link.icon}</span>{link.label}
                </Link>
              );
            })}

          </div>
        </>
      )}
    </>
  );
}