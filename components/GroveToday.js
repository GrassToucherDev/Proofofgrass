// "Today in your Grove": who has posted (with their proof) and who hasn't (with a Nudge button).
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Ico from "./Ico";
import { V2 } from "../utils/v2Theme";

export default function GroveToday({ username, refreshKey }) {
  const [feed, setFeed] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [bad, setBad] = useState({});
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/groves/feed?username=${encodeURIComponent(username)}`, { cache: "no-store" });
      if (r.ok) setFeed(await r.json());
    } catch {}
  }, [username]);
  useEffect(() => { if (username) load(); }, [username, refreshKey, load]);
  if (!feed?.members?.length) return null;
  const done = feed.members.filter((m) => m.locked).length;
  const nudge = async (to) => {
    setBusy(to); setErr("");
    try {
      const r = await fetch("/api/groves/nudge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: username, to }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d.error || "Could not send the nudge.");
      else setFeed((f) => ({ ...f, members: f.members.map((m) => (m.username === to ? { ...m, nudged: true } : m)) }));
    } catch { setErr("Could not send the nudge."); }
    setBusy("");
  };
  return (
    <div className="gv-card" id="gv-today">
      <style dangerouslySetInnerHTML={{ __html: `
        .gt-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
        .gt-count{font-size:13px;font-weight:800;color:${V2.forestGreen}}
        .gt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px}
        .gt-tile{position:relative;aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:#e9f2de;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;text-decoration:none}
        .gt-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .gt-shade{position:absolute;inset:auto 0 0 0;height:48%;background:linear-gradient(180deg,transparent,rgba(0,0,0,.68))}
        .gt-name{position:absolute;left:7px;right:7px;bottom:6px;color:#fff;font-size:12px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
        .gt-day{position:absolute;top:6px;left:6px;background:${V2.grassGreen};color:#fff;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:999px}
        .gt-wait{border:2px dashed ${V2.borderSoft};background:#f6f9f1;padding:8px;gap:6px}
        .gt-wait b{font-size:12px;color:${V2.forestGreen};max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gt-wait span{font-size:11.5px;color:${V2.textMuted}}
        .gt-nudge{margin-top:2px;padding:6px 12px;border-radius:999px;border:0;background:${V2.grassLime};color:${V2.forestGreen};font-weight:800;font-size:12px;cursor:pointer}
        .gt-nudge:disabled{opacity:.55;cursor:default}
      ` }} />
      <div className="gt-head">
        <div className="gv-h" style={{ fontSize: 18, margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Ico n="camera" size={22} /> Today in your Grove</div>
        <span className="gt-count">{done} of {feed.members.length} logged</span>
      </div>
      <div className="gt-grid">
        {feed.members.map((m) =>
          m.locked ? (
            <Link key={m.username} href={`/u/${m.username}`} className="gt-tile" aria-label={`@${m.username} posted today`}>
              {m.photo && !bad[m.username] ? <img src={m.photo} alt="" loading="lazy" onError={() => setBad((b) => ({ ...b, [m.username]: true }))} /> : <Ico n="leaf" size={40} />}
              <span className="gt-shade" />
              <span className="gt-day">Day {m.streak}</span>
              <span className="gt-name">@{m.username}{m.me ? " (you)" : ""}</span>
            </Link>
          ) : (
            <div key={m.username} className="gt-tile gt-wait">
              <Ico n="clock" size={26} />
              <b>@{m.username}{m.me ? " (you)" : ""}</b>
              <span>Not yet</span>
              {!m.me && <button className="gt-nudge" disabled={m.nudged || busy === m.username} onClick={() => nudge(m.username)}>{m.nudged ? "Nudged" : "Nudge"}</button>}
            </div>
          )
        )}
      </div>
      {err && <div style={{ marginTop: 10, fontSize: 13, color: "#a33" }}>{err}</div>}
    </div>
  );
}
