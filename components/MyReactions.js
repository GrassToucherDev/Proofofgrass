// Home note: leaf / fire reactions your recent proofs received. Silent when there are none.
import { useState, useEffect } from "react";
import Link from "next/link";
import Ico from "./Ico";
import { V2 } from "../utils/v2Theme";

export default function MyReactions({ username }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    if (!username) { setD(null); return; }
    let off = false;
    fetch(`/api/gallery/mine?username=${encodeURIComponent(username)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (!off && j?.days) setD(j); }).catch(() => {});
    return () => { off = true; };
  }, [username]);
  const days = (d?.days || []).filter((x) => x.leaf + x.fire > 0);
  if (!days.length) return null;
  const label = (day) => { const diff = Math.round((Date.parse(d.today) - Date.parse(day)) / 86400_000); return diff <= 0 ? "Today's Proof" : diff === 1 ? "Yesterday's Proof" : "Proof From 2 Days Ago"; };
  return (
    <Link href="/gallery" style={{ display: "block", textDecoration: "none", margin: "6px clamp(14px,4vw,40px) 4px", padding: "10px 14px", borderRadius: 14, background: "#fff", border: `1.5px solid ${V2.borderSoft}`, color: V2.forestGreen }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: V2.grassGreen, marginBottom: 6 }}>Your Proofs Got Love</div>
      {days.map((x) => (
        <div key={x.day} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700, padding: "3px 0" }}>
          <span style={{ flex: 1, minWidth: 0 }}>{label(x.day)}</span>
          {x.leaf > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Ico n="leaf" size={20} />{x.leaf}</span>}
          {x.fire > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Ico n="flame" size={20} />{x.fire}</span>}
        </div>
      ))}
    </Link>
  );
}
