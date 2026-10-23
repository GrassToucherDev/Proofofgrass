import { useEffect, useState } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { T } from "../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../components/wago-drops/WagoDropsNav";
import { PrizeCard } from "../../components/wago-drops/PrizeUI";

export default function Prizes() {
  const { data: session } = useSession();
  const [list, setList] = useState(null);
  useEffect(() => {
    fetch("/api/wago-drops/prizes").then(r => r.json()).then(d => setList(d.prizes || [])).catch(() => setList([]));
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
      <Head><title>Prizes — WAGO Drops</title></Head>
      <WagoDropsNav session={session} />
      <WagoDropsBottomNav />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px clamp(14px,4vw,32px) 90px" }}>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Prizes</h1>
        <p style={{ fontSize: 13.5, color: T.muted, margin: "0 0 18px", lineHeight: 1.5 }}>
          Real things from sponsors, hidden out in the world. Cards, merch, cash, and more. Get close to a prize to see where it is, then enter the code you find.
        </p>
        {list === null && <div style={{ color: T.dim, fontSize: 13 }}>Loading…</div>}
        {list && list.length === 0 && <div style={{ color: T.muted, fontSize: 14, padding: "30px 0", textAlign: "center" }}>No prizes out right now. Check back soon.</div>}
        <div style={{ display: "grid", gap: 12 }}>{list && list.map(p => <PrizeCard key={p.id} p={p} />)}</div>
        <p style={{ fontSize: 11.5, color: T.dim, marginTop: 22 }}>Prizes are provided by sponsors. <a href="/prize-rules" style={{ color: T.green }}>Prize Rules</a></p>
      </div>
    </div>
  );
}
