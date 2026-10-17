// /wago-drops/trails — browse curated Trails. No sign-in or wallet needed to look.
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { V2 } from "../../../utils/v2Theme";
import { T } from "../../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../../components/wago-drops/WagoDropsNav";
import Wago from "../../../components/wago-drops/Wago";
import TrailCard from "../../../components/wago-drops/trails/TrailCard";
import { Spinner, pageShell, btnGhost } from "../../../components/wago-drops/trails/trailBits";

export default function TrailsBrowse() {
  const { data: session } = useSession();
  const [trails, setTrails] = useState(null);
  const [city, setCity] = useState("all");

  useEffect(() => {
    let alive = true;
    fetch("/api/wago-drops/trails").then(r => r.json()).then(d => alive && setTrails(d.trails || [])).catch(() => alive && setTrails([]));
    return () => { alive = false; };
  }, [session?.user?.google_id]);

  const cities = useMemo(() => [...new Set((trails || []).map(t => t.city).filter(Boolean))].sort(), [trails]);
  const shown = (trails || []).filter(t => city === "all" || t.city === city);

  return (
    <>
      <Head><title>WAGO Trails</title></Head>
      <div style={pageShell}>
        <WagoDropsNav session={session} />
        <WagoDropsBottomNav />
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px clamp(14px,4vw,32px) 90px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 38, fontWeight: 700, color: T.white, lineHeight: 1 }}>WAGO Trails</div>
              <div style={{ fontSize: 14, color: T.muted, marginTop: 6, maxWidth: 420 }}>Walk a curated route, claim every stop in real life, and earn a bonus when you finish.</div>
            </div>
            <div className="v2-desktop-only"><Wago pose="point" size={110} /></div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
            {cities.length > 0 && (
              <select value={city} onChange={e => setCity(e.target.value)} style={{ ...btnGhost, padding: "9px 14px", fontSize: 13 }}>
                <option value="all">All cities</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {session && <Link href="/wago-drops/trails/mine" style={{ ...btnGhost, padding: "9px 16px", fontSize: 13 }}>My Trails</Link>}
          </div>

          {trails === null && <Spinner />}
          {trails && shown.length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <Wago pose="shrug" size={140} />
              <p style={{ color: T.muted, fontSize: 14 }}>No Trails here yet. Check back soon!</p>
            </div>
          )}
          <div style={{ display: "grid", gap: 18 }}>
            {shown.map(t => <TrailCard key={t.id} trail={t} stopCount={t.stop_count} status={t.my_status} />)}
          </div>
        </div>
      </div>
    </>
  );
}
