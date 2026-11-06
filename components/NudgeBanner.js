// Home banner: shows when grove-mates nudged you today and you haven't posted yet. Silent otherwise.
import { useState, useEffect } from "react";
import Ico from "./Ico";
import { V2 } from "../utils/v2Theme";

export default function NudgeBanner({ username, hasPostedToday }) {
  const [from, setFrom] = useState([]);
  useEffect(() => {
    if (!username || hasPostedToday === true) { setFrom([]); return; }
    let off = false;
    fetch(`/api/groves/nudges?username=${encodeURIComponent(username)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (!off && j?.from) setFrom(j.from); }).catch(() => {});
    return () => { off = true; };
  }, [username, hasPostedToday]);
  if (!from.length) return null;
  const who = from.length === 1 ? `@${from[0]}` : `@${from[0]} and ${from.length - 1} more`;
  return (
    <div style={{ margin: "6px clamp(14px,4vw,40px) 4px", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: "#f1f9e4", border: `1.5px solid ${V2.borderSoft}`, color: V2.forestGreen, fontSize: 14, fontWeight: 700 }}>
      <Ico n="clock" size={24} />
      <span>{who} nudged you. Log today's proof to keep your Grove going.</span>
    </div>
  );
}
