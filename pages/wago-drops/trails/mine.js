// /wago-drops/trails/mine — Active / Completed / Expired.
import Head from "next/head";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { T } from "../../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../../components/wago-drops/WagoDropsNav";
import Wago from "../../../components/wago-drops/Wago";
import TrailCard from "../../../components/wago-drops/trails/TrailCard";
import { Spinner, pageShell, btnPrimary, btnGhost } from "../../../components/wago-drops/trails/trailBits";

const TABS = [["active", "Active"], ["completed", "Completed"], ["expired", "Expired"]];

export default function MyTrails() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    if (!session) return;
    let alive = true;
    fetch("/api/wago-drops/trails/mine").then(r => r.json()).then(d => alive && setRows(d.trails || [])).catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [session?.user?.google_id]);

  const shown = (rows || []).filter(r => r.status === tab);
  return (
    <>
      <Head><title>My Trails · WAGO Drops</title></Head>
      <div style={pageShell}>
        <WagoDropsNav session={session} />
        <WagoDropsBottomNav />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "26px clamp(14px,4vw,32px) 90px" }}>
          <div style={{ fontFamily: "'Fredoka',serif", fontSize: 34, fontWeight: 700, color: T.white, marginBottom: 14 }}>My Trails</div>
          {status !== "loading" && !session && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Wago pose="wave" size={140} />
              <p style={{ color: T.muted }}>Sign in to see your Trails.</p>
              <button onClick={() => signIn("google")} style={btnPrimary}>Sign in with Google</button>
            </div>
          )}
          {session && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {TABS.map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)} style={{ ...btnGhost, padding: "8px 16px", fontSize: 13, ...(tab === k ? { background: "#e4f4d2", borderColor: "#7dc832" } : {}) }}>
                    {l}{rows ? ` (${rows.filter(r => r.status === k).length})` : ""}
                  </button>
                ))}
              </div>
              {rows === null && <Spinner />}
              {rows && shown.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Wago pose={tab === "expired" ? "sleep" : "shrug"} size={130} />
                  <p style={{ color: T.muted, fontSize: 14 }}>{tab === "active" ? "No Trails in progress." : tab === "completed" ? "No finished Trails yet." : "Nothing expired."}</p>
                  {tab === "active" && <Link href="/wago-drops/trails" style={btnPrimary}>Browse Trails</Link>}
                </div>
              )}
              <div style={{ display: "grid", gap: 18 }}>
                {shown.map(r => <TrailCard key={r.trail.id} trail={r.trail} stopCount={r.stops_total} status={r.status} done={r.stops_done} total={r.stops_total} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
