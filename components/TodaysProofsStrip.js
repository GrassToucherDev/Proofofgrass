// A compact, sideways-scrolling row of today's community proofs for the home page. Shows nothing until there are some.
import { useState, useEffect } from "react";
import Link from "next/link";
import Ico from "./Ico";
import { V2 } from "../utils/v2Theme";

export default function TodaysProofsStrip() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let off = false;
    fetch("/api/gallery?limit=10", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (!off && j?.items) setItems(j.items); }).catch(() => {});
    return () => { off = true; };
  }, []);
  if (!items.length) return null;
  return (
    <div className="tps">
      <style dangerouslySetInnerHTML={{ __html: `
        .tps{padding:6px clamp(14px,4vw,40px) 4px}
        .tps-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 2px 8px}
        .tps-title{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${V2.grassGreen}}
        .tps-all{font-size:13px;font-weight:800;color:${V2.forestGreen};text-decoration:none;white-space:nowrap}
        .tps-row{display:flex;gap:10px;overflow-x:auto;margin:0 calc(-1 * clamp(14px,4vw,40px));padding:2px clamp(14px,4vw,40px) 8px;scroll-padding-left:clamp(14px,4vw,40px);scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .tps-row::-webkit-scrollbar{display:none}
        .tps-tile{position:relative;flex:0 0 auto;width:92px;height:116px;border-radius:14px;overflow:hidden;background:#dfeccf;box-shadow:0 3px 10px rgba(26,74,10,.14);scroll-snap-align:start;display:block}
        .tps-tile img{width:100%;height:100%;object-fit:cover;display:block}
        .tps-shade{position:absolute;inset:auto 0 0 0;height:50%;background:linear-gradient(180deg,transparent,rgba(0,0,0,.65))}
        .tps-day{position:absolute;top:6px;left:6px;color:#fff;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:999px;text-shadow:0 1px 2px rgba(0,0,0,.35)}
        .tps-name{position:absolute;left:7px;right:7px;bottom:6px;color:#fff;font-size:11.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .tps-more{flex:0 0 auto;width:92px;height:116px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-decoration:none;color:${V2.forestGreen};font-weight:800;font-size:12.5px;background:rgba(255,255,255,.7);border:1.5px dashed ${V2.borderSoft}}
      ` }} />
      <div className="tps-head">
        <span className="tps-title"><Ico n="camera" size={22} /> Today's Proofs</span>
        <Link href="/gallery" className="tps-all">See all →</Link>
      </div>
      <div className="tps-row">
        {items.map((it) => (
          <Link key={it.username + it.day} href="/gallery" className="tps-tile" aria-label={`@${it.username}, day ${it.streak}`}>
            <img src={it.photo} alt="" loading="lazy" onError={() => setItems((p) => p.filter((x) => x !== it))} />
            <span className="tps-shade" />
            <span className="tps-day" style={{ background: it.tier.color }}>Day {it.streak}</span>
            <span className="tps-name">@{it.username}</span>
          </Link>
        ))}
        <Link href="/gallery" className="tps-more"><Ico n="group" size={26} />See all</Link>
      </div>
    </div>
  );
}
