import { useState, useEffect, useCallback } from "react";

// ── Install tracking helpers ──────────────────────────────────────────────────
const STORAGE_KEYS = {
  dismissed:    "pog_install_dismissed_at",
  installed:    "pog_install_completed",
  promptShown:  "pog_install_prompt_shown_count",
  lastShown:    "pog_install_last_shown",
};

const DISMISS_COOLDOWN_DAYS = 14;

function trackEvent(event, detail = {}) {
  try {
    const log = JSON.parse(localStorage.getItem("pog_install_log") || "[]");
    log.push({ event, detail, at: new Date().toISOString() });
    localStorage.setItem("pog_install_log", JSON.stringify(log.slice(-50)));
  } catch {}
}

function shouldShowPrompt({ streak, proofCount }) {
  try {
    // Don't show if already installed
    if (localStorage.getItem(STORAGE_KEYS.installed)) return false;
    // Don't show if dismissed recently
    const dismissedAt = localStorage.getItem(STORAGE_KEYS.dismissed);
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_COOLDOWN_DAYS) return false;
    }
    // Show only after 3+ proofs OR 3+ streak days
    return proofCount >= 3 || streak >= 3;
  } catch {
    return false;
  }
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOSSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function InstallPrompt({ streak = 0, proofCount = 0 }) {
  const [show,        setShow]        = useState(false);
  const [platform,    setPlatform]    = useState(null); // "ios" | "android" | null
  const [deferredEvt, setDeferredEvt] = useState(null); // Android beforeinstallprompt
  const [installed,   setInstalled]   = useState(false);
  const [iosStep,     setIosStep]     = useState(false); // show iOS instructions

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneMode()) return; // Already installed

    // Android — capture install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredEvt(e);
      if (shouldShowPrompt({ streak, proofCount })) {
        setPlatform("android");
        setShow(true);
        trackEvent("prompt_shown", { platform: "android" });
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS Safari — no programmatic install, show manual instructions
    if (isIOSSafari() && shouldShowPrompt({ streak, proofCount })) {
      setPlatform("ios");
      setShow(true);
      trackEvent("prompt_shown", { platform: "ios" });
    }

    // Track successful install
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
      localStorage.setItem(STORAGE_KEYS.installed, Date.now().toString());
      trackEvent("install_completed");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [streak, proofCount]);

  const handleInstall = useCallback(async () => {
    if (platform === "android" && deferredEvt) {
      trackEvent("install_started", { platform: "android" });
      deferredEvt.prompt();
      const { outcome } = await deferredEvt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setShow(false);
        localStorage.setItem(STORAGE_KEYS.installed, Date.now().toString());
        trackEvent("install_completed", { platform: "android" });
      } else {
        trackEvent("install_declined", { platform: "android" });
      }
      setDeferredEvt(null);
    } else if (platform === "ios") {
      setIosStep(true);
      trackEvent("install_started", { platform: "ios" });
    }
  }, [platform, deferredEvt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(STORAGE_KEYS.dismissed, Date.now().toString());
    trackEvent("prompt_dismissed", { platform });
  }, [platform]);

  // Already installed — show celebration briefly
  if (installed) return <InstallSuccess onClose={() => setInstalled(false)} />;

  if (!show) return null;

  const T = {
    bg: "#0e100b", bg2: "#141710", border: "rgba(147,168,90,0.25)",
    olive: "#93a85a", gold: "#c8a84b", white: "#f0efea",
    dim: "rgba(240,239,234,0.45)",
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleDismiss} style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
        backdropFilter:"blur(4px)", zIndex:9998,
      }} />

      {/* Modal */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:9999,
        background:T.bg, borderTop:`1px solid ${T.border}`,
        borderRadius:"20px 20px 0 0",
        padding:"24px 24px calc(24px + env(safe-area-inset-bottom, 0px))",
        boxShadow:"0 -20px 60px rgba(0,0,0,0.5)",
        animation:"slideUp 0.3s ease",
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        {!iosStep ? (
          // ── Main prompt ────────────────────────────────────────────────
          <>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
              <img src="/touchgrass-transparent.png" alt=""
                style={{ width:52, height:52, borderRadius:12,
                  border:`1px solid ${T.border}`, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:T.white, marginBottom:3 }}>
                  🌞 Install Proof of Grass
                </div>
                <div style={{ fontSize:12, color:T.dim, lineHeight:1.5 }}>
                  Add to your home screen for faster streak tracking, missions, and reminders.
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={handleInstall} style={{
                flex:1, padding:"13px 0", background:T.olive, color:"#080a06",
                border:"none", borderRadius:10, fontSize:14, fontWeight:700,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                letterSpacing:"0.04em",
              }}>
                {platform === "ios" ? "Show Me How" : "Install"}
              </button>
              <button onClick={handleDismiss} style={{
                padding:"13px 18px", background:"transparent",
                border:`1px solid ${T.border}`, borderRadius:10,
                fontSize:13, fontWeight:600, color:T.dim,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              }}>
                Maybe Later
              </button>
            </div>
            <div style={{ textAlign:"center", marginTop:10, fontSize:10, color:"rgba(240,239,234,0.2)" }}>
              Won't ask again for 14 days if dismissed
            </div>
          </>
        ) : (
          // ── iOS instructions ───────────────────────────────────────────
          <>
            <div style={{ fontFamily:"'Georgia',serif", fontSize:18, fontWeight:700,
              color:T.white, marginBottom:6 }}>Add to Home Screen</div>
            <div style={{ fontSize:12, color:T.dim, marginBottom:20 }}>
              Follow these steps in Safari:
            </div>
            {[
              { step:"1", icon:"📤", label:"Tap the Share button", sub:"(the box with an arrow at the bottom of your screen)" },
              { step:"2", icon:"➕", label:"Tap Add to Home Screen", sub:"Scroll down in the share sheet if needed" },
              { step:"3", icon:"✓",  label:"Tap Add", sub:"Proof of Grass will appear on your home screen" },
            ].map(s => (
              <div key={s.step} style={{ display:"flex", gap:14, marginBottom:16,
                alignItems:"flex-start" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
                  background:`rgba(147,168,90,0.15)`,
                  border:`1px solid ${T.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:16 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.white }}>{s.label}</div>
                  <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>{s.sub}</div>
                </div>
              </div>
            ))}
            {/* Arrow pointing to share button */}
            <div style={{ textAlign:"center", padding:"12px 0",
              borderTop:`1px solid rgba(255,255,255,0.06)`, marginTop:8 }}>
              <div style={{ fontSize:28 }}>⬇️</div>
              <div style={{ fontSize:11, color:T.dim }}>Tap the share icon below</div>
            </div>
            <button onClick={() => setIosStep(false)} style={{
              width:"100%", padding:"12px 0", marginTop:12,
              background:"transparent", border:`1px solid ${T.border}`,
              borderRadius:10, fontSize:13, color:T.dim, cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",
            }}>Back</button>
          </>
        )}
      </div>
    </>
  );
}

// ── Install Success Modal ─────────────────────────────────────────────────────
function InstallSuccess({ onClose }) {
  const T = {
    bg:"#0e100b", border:"rgba(147,168,90,0.25)",
    olive:"#93a85a", white:"#f0efea", dim:"rgba(240,239,234,0.45)",
  };
  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
        backdropFilter:"blur(4px)", zIndex:9998 }} />
      <div style={{
        position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        zIndex:9999, width:"min(340px, 90vw)",
        background:T.bg, border:`1px solid ${T.border}`,
        borderRadius:16, padding:28, textAlign:"center",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize:52, marginBottom:16 }}>🌱</div>
        <div style={{ fontFamily:"'Georgia',serif", fontSize:20, fontWeight:700,
          color:T.white, marginBottom:8 }}>Proof of Grass Installed</div>
        <div style={{ fontSize:13, color:T.dim, lineHeight:1.6, marginBottom:24 }}>
          You're ready to build your streak from your home screen.
        </div>
        <button onClick={onClose} style={{
          width:"100%", padding:"13px 0", background:T.olive,
          color:"#080a06", border:"none", borderRadius:10,
          fontSize:14, fontWeight:700, cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",
        }}>
          Let's Go 🌿
        </button>
      </div>
    </>
  );
}

// ── Streak banner (shown after Day 7 if not installed) ───────────────────────
export function InstallBanner({ streak = 0 }) {
  const [show, setShow] = useState(false);
  const [deferredEvt, setDeferredEvt] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneMode()) return;
    if (localStorage.getItem(STORAGE_KEYS.installed)) return;
    if (streak < 7) return;
    const dismissed = localStorage.getItem("pog_banner_dismissed_at");
    if (dismissed) {
      const days = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (days < 7) return;
    }
    setShow(true);
    const handler = (e) => { e.preventDefault(); setDeferredEvt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [streak]);

  const handleInstall = async () => {
    if (deferredEvt) {
      deferredEvt.prompt();
      const { outcome } = await deferredEvt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(STORAGE_KEYS.installed, Date.now().toString());
        trackEvent("install_completed", { source: "banner" });
      }
    } else if (isIOSSafari()) {
      alert("Tap the Share button → Add to Home Screen");
    }
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pog_banner_dismissed_at", Date.now().toString());
    trackEvent("banner_dismissed");
  };

  if (!show) return null;

  return (
    <div style={{
      background:"rgba(147,168,90,0.08)",
      border:"1px solid rgba(147,168,90,0.25)",
      borderRadius:10, padding:"12px 14px",
      display:"flex", alignItems:"center", gap:12,
      margin:"12px 0", flexWrap:"wrap",
    }}>
      <span style={{ fontSize:18, flexShrink:0 }}>🌞</span>
      <div style={{ flex:1, minWidth:160 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#f0efea", marginBottom:2 }}>
          Tip: Install Proof of Grass
        </div>
        <div style={{ fontSize:11, color:"rgba(240,239,234,0.5)" }}>
          Add to your home screen so you never miss a streak.
        </div>
      </div>
      <div style={{ display:"flex", gap:7, flexShrink:0 }}>
        <button onClick={handleInstall} style={{
          background:"#93a85a", color:"#080a06", border:"none",
          borderRadius:7, padding:"6px 12px", fontSize:11,
          fontWeight:700, cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",
        }}>Install</button>
        <button onClick={handleDismiss} style={{
          background:"transparent", color:"rgba(240,239,234,0.4)",
          border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:7, padding:"6px 10px", fontSize:11,
          cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
        }}>✕</button>
      </div>
    </div>
  );
}