// components/SiteMenu.js
// The one site menu used on every page.
//   <SiteLinks />       desktop bar:  Proof of Grass ▾ · Explore ▾ · Play ▾ · Leaderboard · Marketplace · Spotlight
//   <SiteMobileMenu />  hamburger + slide-in panel with the same groups (shown below 1100px)
// The bottom nav's "More" tab opens the panel through the "pog:open-menu" window event.
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/router";
import { V2 } from "../utils/v2Theme";

const HARVEST = "https://harvest.touchgrass.today";

export const MENU_GROUPS = [
  {
    id: "pog", label: "Proof of Grass", icon: "🌿", home: "/",
    items: [
      { href: "/",         label: "Dashboard", icon: "🏠" },
      { href: "/#upload",  label: "Log Proof", icon: "🌿", action: "log" },
      { href: "@profile",  label: "My Profile", icon: "👤", needsUser: true },
    ],
  },
  {
    id: "explore", label: "Explore", icon: "🧭",
    items: [
      { href: "/field-guide", label: "Field Guide", icon: "📖" },
      { href: "/map",         label: "World Map",   icon: "🗺️" },
    ],
  },
  {
    id: "play", label: "Play", icon: "🎮",
    items: [
      { href: "/grass-draw", label: "Grass Draw", icon: "🌱" },
      { href: "/groves",     label: "Groves",     icon: "🌳" },
      { href: "/yard",       label: "The Yard",   icon: "⚔️" },
      { href: HARVEST,       label: "Harvest",    icon: "🌾", external: true },
    ],
  },
];

export const SOLO_LINKS = [
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/marketplace", label: "Marketplace", icon: "🏪" },
  { href: "/spotlight",   label: "Spotlight",   icon: "🌟" },
];

function useUsername(prop) {
  const [u, setU] = useState(prop || "");
  useEffect(() => {
    if (prop) { setU(prop); return; }
    try { setU(localStorage.getItem("pog_username") || ""); } catch {}
  }, [prop]);
  return u;
}

const isActivePath = (pathname, href) =>
  href.startsWith("http") || href.startsWith("@") || href.includes("#") ? false
  : href === "/" ? pathname === "/"
  : pathname === href || pathname.startsWith(href + "/");

const resolve = (item, username) => (item.href === "@profile" ? `/u/${username}` : item.href);

const CSS = `
  .sm-desk { display:flex; align-items:center; gap:2px; flex:1; min-width:0; }
  .sm-trigger, .sm-solo {
    font-family:${V2.fontSans}; font-size:13px; font-weight:500; color:${V2.forestGreen};
    background:transparent; border:none; cursor:pointer; text-decoration:none; white-space:nowrap;
    padding:7px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:5px; transition:background .15s,color .15s;
  }
  .sm-trigger:hover, .sm-solo:hover, .sm-group.open .sm-trigger { background:rgba(125,200,50,0.12); color:${V2.grassGreen}; }
  .sm-trigger.active, .sm-solo.active { background:rgba(125,200,50,0.15); color:${V2.grassGreen}; font-weight:700; }
  .sm-caret { font-size:9px; opacity:.6; transition:transform .15s; }
  .sm-group.open .sm-caret { transform:rotate(180deg); }
  .sm-group { position:relative; }
  .sm-drop {
    position:absolute; top:calc(100% + 6px); left:0; min-width:210px; padding:8px; z-index:400;
    background:rgba(255,255,255,0.98); backdrop-filter:blur(20px);
    border:1px solid rgba(200,220,190,0.6); border-radius:16px; box-shadow:0 12px 40px rgba(26,74,10,0.16);
    opacity:0; visibility:hidden; transform:translateY(-4px); transition:all .14s ease;
  }
  .sm-group.open .sm-drop { opacity:1; visibility:visible; transform:translateY(0); }
  @media (hover:hover) { .sm-group:hover .sm-drop { opacity:1; visibility:visible; transform:translateY(0); } .sm-group:hover .sm-trigger { background:rgba(125,200,50,0.12); color:${V2.grassGreen}; } }
  .sm-drop::before { content:""; position:absolute; top:-8px; left:0; right:0; height:8px; }
  .sm-item {
    display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; text-decoration:none; cursor:pointer;
    font-family:${V2.fontSans}; font-size:13.5px; font-weight:500; color:${V2.forestGreen}; background:transparent; border:none; width:100%; text-align:left;
  }
  .sm-item:hover { background:rgba(125,200,50,0.10); }
  .sm-item.active { background:rgba(125,200,50,0.14); color:${V2.grassGreen}; font-weight:700; }
  .sm-item .ic { width:22px; text-align:center; font-size:17px; }
  .sm-item .ext { margin-left:auto; opacity:.45; font-size:11px; }
  .sm-burger {
    display:none; width:36px; height:36px; border-radius:10px; flex-shrink:0; cursor:pointer;
    background:rgba(255,255,255,0.8); border:1.5px solid rgba(200,220,190,0.5);
    flex-direction:column; align-items:center; justify-content:center; gap:4px;
  }
  .sm-burger span { display:block; width:16px; height:1.5px; background:${V2.forestGreen}; border-radius:2px; }
  .sm-overlay { position:fixed; inset:0; z-index:299; background:rgba(0,0,0,0.25); backdrop-filter:blur(4px); }
  .sm-panel {
    position:fixed; top:0; right:0; bottom:0; z-index:300; width:min(340px,88vw); overflow-y:auto;
    background:rgba(255,255,255,0.98); border-left:1px solid rgba(200,220,190,0.5);
    box-shadow:-4px 0 40px rgba(26,74,10,0.14); padding:8px 10px 28px; animation:smIn .2s ease;
  }
  @keyframes smIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
  .sm-panel-head { display:flex; align-items:center; justify-content:space-between; padding:12px 8px 6px; font-family:${V2.fontSans}; font-weight:800; color:${V2.forestGreen}; font-size:15px; }
  .sm-close { background:rgba(125,200,50,0.1); border:none; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:15px; color:${V2.forestGreen}; }
  .sm-sec { font-family:${V2.fontSans}; font-size:11px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:${V2.midGray}; padding:16px 12px 4px; }
  .sm-div { height:1px; background:rgba(200,220,190,0.5); margin:12px 12px 2px; }
  .sm-spacer { flex:1; }
  @media (min-width:1101px) { .sm-spacer { display:none; } }
  @media (max-width:1100px) { .sm-desk { display:none; } .sm-burger { display:flex; } }
`;

function ItemLink({ item, username, pathname, onNavigate, onLogProof, className = "sm-item" }) {
  const href = resolve(item, username);
  const active = isActivePath(pathname, href);
  const inner = (
    <>
      <span className="ic">{item.icon}</span>{item.label}
      {item.external && <span className="ext">↗</span>}
    </>
  );
  if (item.external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onNavigate}>{inner}</a>;
  }
  if (item.action === "log" && onLogProof) {
    return <a href={href} className={className} onClick={(e) => { e.preventDefault(); onNavigate?.(); onLogProof(); }}>{inner}</a>;
  }
  return <Link href={href} className={`${className}${active ? " active" : ""}`} onClick={onNavigate}>{inner}</Link>;
}

export function SiteLinks({ username: usernameProp, onLogProof }) {
  const router = useRouter();
  const username = useUsername(usernameProp);
  const [open, setOpen] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    const esc = (e) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, []);
  useEffect(() => { setOpen(null); }, [router.asPath]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sm-desk" ref={ref}>
        {MENU_GROUPS.map((g) => {
          const items = g.items.filter((i) => !i.needsUser || username);
          const active = items.some((i) => isActivePath(router.pathname, resolve(i, username)));
          return (
            <div key={g.id} className={`sm-group${open === g.id ? " open" : ""}`}>
              <button type="button" className={`sm-trigger${active ? " active" : ""}`}
                aria-haspopup="menu" aria-expanded={open === g.id}
                onClick={() => setOpen(open === g.id ? null : g.id)}>
                {g.label}<span className="sm-caret">▼</span>
              </button>
              <div className="sm-drop" role="menu">
                {items.map((i) => (
                  <ItemLink key={i.label} item={i} username={username} pathname={router.pathname}
                    onNavigate={() => setOpen(null)} onLogProof={onLogProof} />
                ))}
              </div>
            </div>
          );
        })}
        {SOLO_LINKS.map((l) => (
          <Link key={l.href} href={l.href}
            className={`sm-solo${isActivePath(router.pathname, l.href) ? " active" : ""}`}>{l.label}</Link>
        ))}
      </div>
    </>
  );
}

export function SiteMobileMenu({ username: usernameProp, onLogProof }) {
  const router = useRouter();
  const username = useUsername(usernameProp);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("pog:open-menu", openIt);
    return () => window.removeEventListener("pog:open-menu", openIt);
  }, []);
  useEffect(() => { setOpen(false); }, [router.asPath]);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  const close = () => setOpen(false);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sm-burger" role="button" aria-label="Menu" tabIndex={0}
        onClick={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Enter") setOpen(true); }}>
        <span /><span /><span />
      </div>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="sm-overlay" onClick={close} />
          <div className="sm-panel" role="dialog" aria-label="Site menu">
            <div className="sm-panel-head">Touch Grass<button className="sm-close" onClick={close} aria-label="Close">✕</button></div>
            {MENU_GROUPS.map((g) => (
              <div key={g.id}>
                <div className="sm-sec">{g.label}</div>
                {g.items.filter((i) => !i.needsUser || username).map((i) => (
                  <ItemLink key={i.label} item={i} username={username} pathname={router.pathname}
                    onNavigate={close} onLogProof={onLogProof} />
                ))}
              </div>
            ))}
            <div className="sm-div" />
            {SOLO_LINKS.map((l) => (
              <ItemLink key={l.href} item={l} username={username} pathname={router.pathname} onNavigate={close} />
            ))}
          </div>
        </>
      , document.body)}
    </>
  );
}

export default SiteLinks;
