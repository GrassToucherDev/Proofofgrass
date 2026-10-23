// "Yard record" for a profile: 1v1 record + rank, their Grove's record, event entries. Renders nothing if they have no Yard history.
import { useState, useEffect } from "react";
import Link from "next/link";
import { V2 } from "../../utils/v2Theme";

const rec = (r) => `${r.wins}-${r.losses}-${r.ties}`;
function Chip({ icon, label, value, sub }) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 0, background: "rgba(125,200,50,0.07)", borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: V2.dimGray }}><span aria-hidden="true">{icon} </span>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: V2.forestGreen, margin: "2px 0" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 600, color: V2.dimGray, overflowWrap: "anywhere" }}>{sub}</div>}
    </div>
  );
}

export default function YardRecordCard({ username, className = "pf-card" }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    if (!username) return;
    let off = false;
    fetch(`/api/yard/record?username=${encodeURIComponent(username)}`).then((r) => r.ok ? r.json() : null).then((x) => { if (!off) setD(x); }).catch(() => {});
    return () => { off = true; };
  }, [username]);
  if (!d?.hasAny) return null;
  const { onevone: o, grove: g, events: ev } = d;
  return (
    <section className={className} aria-label="Yard record">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: V2.midGray, margin: 0 }}>Yard Record</h2>
        <Link href="/yard" style={{ fontSize: 11, color: V2.grassGreen, textDecoration: "none", background: "rgba(125,200,50,0.1)", border: `1px solid ${V2.borderGreen}`, borderRadius: 20, padding: "3px 10px" }}>Open The Yard</Link>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Chip icon="⚔️" label="1v1 record" value={o.record.completed ? rec(o.record) : "None yet"} sub={[o.rank ? `Yard rank #${o.rank}` : null, o.active ? `${o.active} active` : null].filter(Boolean).join(" · ") || "Wins-losses-ties"} />
        {g && <Chip icon="🌳" label="Grove" value={g.record.completed ? rec(g.record) : "None yet"} sub={`${g.name}${g.active ? ` · ${g.active} active` : ""}`} />}
        {ev.entered > 0 && <Chip icon="🎪" label="Seasonal events" value={ev.entered} sub={ev.live ? `${ev.live} live now` : "entered"} />}
      </div>
    </section>
  );
}
