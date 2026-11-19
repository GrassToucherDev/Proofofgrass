// Generic bottom sheet: builds a share card image, then Share / Post on X / Copy caption.
// render: () => Promise<dataUrl>. Used for the leaderboard rank card (badge sheet has its own copy).
import { useState, useEffect } from "react";

import { withShareTags } from "../utils/shareTags";

export default function ShareCardSheet({ title, render, caption: rawCaption, filename, onClose }) {
  const caption = withShareTags(rawCaption);
  const [img, setImg] = useState(null);
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMob, setIsMob] = useState(false);

  useEffect(() => { setIsMob(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)); }, []);
  useEffect(() => {
    let dead = false; setImg(null); setErr(false);
    render().then((u) => { if (!dead) setImg(u); }).catch(() => { if (!dead) setErr(true); });
    return () => { dead = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const copy = async () => { try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {} };
  const share = async () => {
    const dl = () => { const a = document.createElement("a"); a.href = img; a.download = filename; a.click(); };
    if (isMob && navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(img)).blob(); const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title, text: caption }); else dl();
      } catch (e) { if (e.name !== "AbortError") dl(); }
    } else dl();
  };
  const postX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`, "_blank", "noopener");

  const btn = { border: "none", cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, borderRadius: 999, padding: "14px 20px", minHeight: 50, width: "100%" };
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(13,42,5,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", borderRadius: "24px 24px 0 0", padding: "18px 16px calc(24px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Fredoka',system-ui,sans-serif", fontWeight: 700, fontSize: 22, color: "#0d2a05" }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ ...btn, width: 40, minHeight: 40, padding: 0, background: "#eef7e6", color: "#1f6b12", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid #cfe3bf", background: "#eef6e2", aspectRatio: "1080 / 1350", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          {img ? <img src={img} alt={title} style={{ width: "100%", display: "block" }} />
            : <span style={{ color: "#2d5a1a", fontWeight: 700 }}>{err ? "Couldn't build the card." : "Building your card…"}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button disabled={!img} onClick={share} style={{ ...btn, background: "linear-gradient(135deg,#7dc832,#5ba622)", color: "#fff", opacity: img ? 1 : .5 }}>{isMob && typeof navigator !== "undefined" && navigator.share ? "Share card" : "Download card"}</button>
          <button onClick={postX} style={{ ...btn, background: "#e6f3d6", color: "#2d5a1a", border: "1px solid #c9e4ad" }}>𝕏 Post on X</button>
          <button onClick={copy} style={{ ...btn, background: "#e6f3d6", color: "#2d5a1a", border: "1px solid #c9e4ad" }}>{copied ? "✓ Caption copied" : "📋 Copy caption"}</button>
        </div>
      </div>
    </div>
  );
}
