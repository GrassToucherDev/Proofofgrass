// Keeps long-lived tabs / home-screen apps from running an old build.
//  * Checks /api/version when the app comes back to the foreground (and every 10 min while visible).
//  * If a newer build is live: the next page navigation becomes a full page load (so new code is
//    used), and a small "new version" bar offers a refresh. It never reloads on its own while someone
//    is on a page, so nothing in progress (an upload, a caption) is lost.
//  * If a page chunk fails to load (deleted after a deploy), it falls back to a full page load.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || null;
const CHECK_EVERY_MS = 10 * 60 * 1000;

export default function VersionGuard() {
  const router = useRouter();
  const staleRef = useRef(false);
  const [stale, setStale] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!BUILD_ID) return;
    let lastCheck = 0;
    const check = async () => {
      if (document.visibilityState === "hidden" || staleRef.current) return;
      if (Date.now() - lastCheck < 15000) return;       // don't hammer on rapid focus changes
      lastCheck = Date.now();
      try {
        const r = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const { id } = await r.json();
        if (id && id !== BUILD_ID) { staleRef.current = true; setStale(true); }
      } catch { /* offline or blocked: try again later */ }
    };

    check();
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    const onShow = (e) => { if (e.persisted) check(); };   // back/forward cache restore
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", onShow);
    const timer = setInterval(check, CHECK_EVERY_MS);

    // New build live → turn the next client-side navigation into a full load.
    const onRouteStart = (url) => {
      if (!staleRef.current) return;
      window.location.assign(url);
      router.events.emit("routeChangeError");
      throw "Aborted client navigation: reloading for new version";   // stops the router (documented pattern)
    };
    // A page chunk that no longer exists after a deploy: full load of the target page.
    const onRouteError = (err, url) => {
      if (err?.cancelled) return;
      if (/Loading (CSS )?chunk|ChunkLoadError|Failed to fetch dynamically imported/i.test(String(err?.message || err))) {
        window.location.assign(url);
      }
    };
    router.events.on("routeChangeStart", onRouteStart);
    router.events.on("routeChangeError", onRouteError);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", onShow);
      clearInterval(timer);
      router.events.off("routeChangeStart", onRouteStart);
      router.events.off("routeChangeError", onRouteError);
    };
  }, [router.events]);

  if (!stale || dismissed) return null;
  return (
    <div role="status" style={{
      position: "fixed", left: 12, right: 12, zIndex: 9990,
      bottom: "calc(76px + env(safe-area-inset-bottom))",
      maxWidth: 420, margin: "0 auto", display: "flex", alignItems: "center", gap: 10,
      background: "#0d2a05", color: "#fff", borderRadius: 14, padding: "10px 12px 10px 14px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
    }}>
      <span style={{ flex: 1 }}>A new version of Proof of Grass is ready.</span>
      <button onClick={() => window.location.reload()} style={{
        background: "#7dc832", color: "#0d2a05", border: "none", borderRadius: 999,
        padding: "8px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", minHeight: 36 }}>Refresh</button>
      <button aria-label="Dismiss" onClick={() => setDismissed(true)} style={{
        background: "transparent", color: "rgba(255,255,255,0.7)", border: "none", fontSize: 18, cursor: "pointer", padding: "4px 6px", minHeight: 36 }}>×</button>
    </div>
  );
}
