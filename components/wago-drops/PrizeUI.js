import Link from "next/link";
import { T } from "../../utils/wagoTheme";

export function SponsorLine({ p, size = 12 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: size, color: T.muted, minWidth: 0 }}>
      {p.sponsor_logo_url && <img src={p.sponsor_logo_url} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }} />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Sponsored by <b>{p.sponsor_name}</b></span>
    </div>
  );
}

export function PrizeCard({ p }) {
  const gone = p.remaining <= 0;
  return (
    <Link href={`/wago-drops/prize/${p.id}`} style={{ display: "flex", gap: 12, textDecoration: "none", color: T.white, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, opacity: gone ? 0.6 : 1 }}>
      <div style={{ width: 72, height: 72, borderRadius: 10, background: T.surface, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
        {p.image_url ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🎁"}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.25, wordBreak: "break-word" }}>{p.title}</div>
        {p.value_text && <div style={{ fontSize: 12.5, color: T.green, marginTop: 2 }}>{p.value_text}</div>}
        <div style={{ marginTop: 4 }}><SponsorLine p={p} /></div>
        <div style={{ fontSize: 11.5, color: T.dim, marginTop: 4 }}>{gone ? "All found" : `${p.remaining} of ${p.total} left to find`}</div>
      </div>
    </Link>
  );
}
