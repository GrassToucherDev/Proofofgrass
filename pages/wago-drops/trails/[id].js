// /wago-drops/trails/[id] — Trail detail, active map state, and completion screen.
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { V2 } from "../../../utils/v2Theme";
import { T } from "../../../utils/wagoTheme";
import { WagoDropsNav, WagoDropsBottomNav } from "../../../components/wago-drops/WagoDropsNav";
import Wago from "../../../components/wago-drops/Wago";
import CoverImage from "../../../components/wago-drops/CoverImage";
import TrailComplete from "../../../components/wago-drops/trails/TrailComplete";
import { TrailCover, RewardChips, Meta, Spinner, pageShell, btnPrimary, btnGhost } from "../../../components/wago-drops/trails/trailBits";
import { formatReward } from "../../../utils/wagoReward";
import { haversineM } from "../../../utils/wagoPinPrivacy";
import { getDeviceHash } from "../../../utils/fingerprint";

const TrailMap = dynamic(() => import("../../../components/wago-drops/trails/TrailMap"), { ssr: false });

const UNAVAIL = {
  paused: "Temporarily unavailable", exhausted: "Fully claimed right now", ended: "Drop has ended", removed: "Being replaced",
};

function StopRow({ s, mode, selected, onClick }) {
  const done = s.state === "done", hot = s.state === "current" || s.state === "available";
  return (
    <button onClick={onClick} style={{
      display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", cursor: "pointer",
      background: selected ? "#f3fae9" : "#fff", border: `1.5px solid ${selected ? "#7dc832" : V2.borderSoft}`, borderRadius: 16, padding: "10px 12px",
      opacity: s.state === "upcoming" ? 0.7 : 1,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: done ? "#5ba622" : hot ? "#f5b800" : "#b9c9b3", color: "#fff", fontWeight: 800, fontSize: 15,
      }}>{done ? "✓" : s.position}</div>
      {s.image_url && <CoverImage src={s.image_url} height={44} radius={10} style={{ width: 44, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
        <div style={{ fontSize: 12, color: T.muted }}>
          {done ? "Claimed" : s.unavailable ? UNAVAIL[s.unavailable] : s.state === "current" ? "Next up" : s.state === "available" ? "Any order" : "Coming up"}
          {Number(s.reward_amount) > 0 ? ` · ${formatReward(s)}` : ""}
        </div>
      </div>
    </button>
  );
}

export default function TrailDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status: authStatus } = useSession();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [selId, setSelId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const posRef = useRef(null);

  const load = useCallback(async () => {
    if (!id) return;
    const p = posRef.current;
    const qs = p ? `?userLat=${p.lat}&userLng=${p.lng}` : "";
    try {
      const r = await fetch(`/api/wago-drops/trails/${id}${qs}`);
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Trail not found"); return; }
      setData(d);
    } catch { setErr("Couldn't load this Trail."); }
  }, [id]);

  useEffect(() => { if (authStatus !== "loading") load(); }, [load, authStatus, session?.user?.google_id]);
  // Refresh while walking: picks up claims made on the drop page or elsewhere.
  useEffect(() => {
    if (data?.progress?.status !== "active") return;
    const t = setInterval(load, 20000);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [data?.progress?.status, load]);

  const onUserPos = useCallback(pos => {
    const prev = posRef.current;
    if (!prev || haversineM(prev.lat, prev.lng, pos.lat, pos.lng) > 8) { posRef.current = pos; setUserPos(pos); load(); }
  }, [load]);

  async function start() {
    if (!session) return signIn("google");
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/wago-drops/trails/${id}/start`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(d.error || "Couldn't start this Trail.");
    await load();
    setBusy(false);
  }

  async function claim(stop) {
    if (!userPos) return setMsg("Turn on location to claim.");
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/wago-drops/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: stop.location_id, userLat: userPos.lat, userLng: userPos.lng, deviceHash: await getDeviceHash() }),
      });
      const d = await r.json();
      if (!r.ok) setMsg(d.error || "Claim failed");
      else setMsg("Claimed! 🎉");
    } catch { setMsg("Claim failed"); }
    await load();
    setBusy(false);
  }

  if (err) return (
    <Shell session={session}><div style={{ textAlign: "center", padding: "50px 0" }}><Wago pose="shrug" size={140} /><p style={{ color: T.muted }}>{err}</p><Link href="/wago-drops/trails" style={btnGhost}>All Trails</Link></div></Shell>
  );
  if (!data) return <Shell session={session}><Spinner /></Shell>;

  const { trail, stops, progress } = data;
  const active = progress?.status === "active";
  const completed = progress?.status === "completed";
  const expired = progress?.status === "expired";
  const sel = stops.find(s => s.id === selId) || null;
  const dist = sel && userPos && sel.revealed ? Math.round(haversineM(userPos.lat, userPos.lng, sel.lat, sel.lng)) : null;
  const canClaim = active && sel && sel.state !== "done" && !sel.unavailable && sel.revealed && dist != null && dist <= sel.claim_radius_m;
  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;

  return (
    <Shell session={session} title={trail.name}>
      <TrailCover src={trail.cover_image_url} height={230} radius={22}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(13,42,5,0) 40%, rgba(13,42,5,0.65) 100%)" }} />
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, color: "#fff" }}>
          <div style={{ fontFamily: "'Fredoka',serif", fontSize: 34, fontWeight: 700, lineHeight: 1.05, textShadow: "0 2px 10px rgba(0,0,0,.4)" }}>{trail.name}</div>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.95 }}>{[trail.city, trail.completion_mode === "ordered" ? "Follow in order" : "Any order"].filter(Boolean).join("  ·  ")}</div>
        </div>
      </TrailCover>

      <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
        <Meta trail={trail} stopCount={stops.length} />
        <RewardChips trail={trail} />
        {trail.description && <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: T.muted }}>{trail.description}</p>}

        {completed && <TrailComplete trail={trail} progress={progress} stopCount={stops.length} onChanged={load} />}

        {expired && (
          <div style={{ textAlign: "center", background: "#fff", borderRadius: 18, padding: 20, border: `1px solid ${V2.borderSoft}` }}>
            <Wago pose="sleep" size={120} />
            <div style={{ fontWeight: 800, fontSize: 17 }}>This Trail has ended</div>
            <div style={{ color: T.muted, fontSize: 13.5, marginTop: 4 }}>You claimed {progress.done} of {progress.total} stops before it closed.</div>
          </div>
        )}

        {trail.window === "ended" && !progress && (
          <div style={{ textAlign: "center", background: "#fff", borderRadius: 18, padding: 20 }}><Wago pose="sleep" size={110} /><div style={{ fontWeight: 800 }}>This Trail has ended</div></div>
        )}

        {active && (
          <div style={{ background: "#fff", borderRadius: 18, padding: "12px 14px", border: `1px solid ${V2.borderSoft}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
              <span>Your progress</span><span>{progress.done} / {progress.total} stops</span>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: "#e6efdc", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: V2.gradientGrassBtn, transition: "width .4s" }} /></div>
          </div>
        )}

        {!completed && !expired && trail.window !== "ended" && (
          <>
            <TrailMap stops={stops} selectedId={selId} onSelect={s => setSelId(s.id)} onUserPos={active ? onUserPos : undefined} height={active ? 400 : 300} />

            {sel && (
              <div style={{ background: "#fff", borderRadius: 18, padding: 14, border: "1.5px solid #7dc832", display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Stop {sel.position}: {sel.label}</div>
                {sel.hint && <div style={{ fontSize: 13.5, color: T.muted }}>💡 {sel.hint}</div>}
                {!sel.revealed && <div style={{ fontSize: 13, color: T.muted }}>Get within {sel.reveal_radius_m} m to reveal the exact spot. The pin shows the general area only.</div>}
                {sel.unavailable && sel.state !== "done" && <div style={{ fontSize: 13, color: T.red, fontWeight: 600 }}>{UNAVAIL[sel.unavailable]} — your progress is safe. Check back soon.</div>}
                {dist != null && sel.state !== "done" && <div style={{ fontSize: 13, fontWeight: 700 }}>{dist} m away (need {sel.claim_radius_m} m)</div>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {canClaim && <button disabled={busy} onClick={() => claim(sel)} style={{ ...btnPrimary, padding: "10px 20px", opacity: busy ? 0.6 : 1 }}>Claim stop</button>}
                  {active && sel.state !== "done" && <Link href={`/wago-drops/drop/${sel.location_id}`} style={{ ...btnGhost, padding: "10px 18px", fontSize: 13 }}>Open drop</Link>}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              {stops.map(s => <StopRow key={s.id} s={s} mode={trail.completion_mode} selected={s.id === selId} onClick={() => setSelId(s.id === selId ? null : s.id)} />)}
            </div>
          </>
        )}

        {msg && <div style={{ fontSize: 13.5, fontWeight: 600, color: /claimed|🎉/i.test(msg) ? V2.grassDark : T.red, textAlign: "center" }}>{msg}</div>}

        {!progress && trail.window === "live" && (
          <div style={{ textAlign: "center", paddingTop: 4 }}>
            <button onClick={start} disabled={busy || authStatus === "loading"} style={{ ...btnPrimary, width: "100%", padding: "15px 24px", fontSize: 16, opacity: busy ? 0.6 : 1 }}>
              {session ? "Start Trail" : "Sign in to start"}
            </button>
            <div style={{ fontSize: 12, color: T.dim, marginTop: 8 }}>Browse freely — signing in is only needed to start. A verified wallet is only needed to collect token rewards.</div>
          </div>
        )}
        {!progress && trail.window === "upcoming" && <div style={{ textAlign: "center", fontWeight: 700, color: T.muted }}>Opens {new Date(trail.starts_at).toLocaleString()}</div>}
        {active && <div style={{ textAlign: "center" }}><Link href="/wago-drops/trails/mine" style={{ ...btnGhost, fontSize: 13 }}>Leave for now — progress is saved</Link></div>}
      </div>
    </Shell>
  );
}

function Shell({ session, title, children }) {
  return (
    <>
      <Head><title>{title ? `${title} · WAGO Trails` : "WAGO Trails"}</title></Head>
      <div style={pageShell}>
        <WagoDropsNav session={session} />
        <WagoDropsBottomNav />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px clamp(14px,4vw,28px) 100px" }}>
          <Link href="/wago-drops/trails" style={{ fontSize: 13, fontWeight: 700, color: T.muted, textDecoration: "none", display: "inline-block", marginBottom: 10 }}>← All Trails</Link>
          {children}
        </div>
      </div>
    </>
  );
}
