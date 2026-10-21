import { useState, useEffect } from "react";
import { bannerSrc, bannerFallbackUrl } from "../utils/groveBanners";

// Banner artwork with a safe fallback: if the real asset is missing or fails to load, the development
// placeholder scene is used (and labelled when showTag is set) — never a broken image.
export default function GroveBanner({ banner, height = 200, children, scrim = false, showTag = false, radius = 16, style }) {
  const id = banner?.id || "default";
  const [src, setSrc] = useState(() => bannerSrc(banner));
  const [fallback, setFallback] = useState(!banner?.art_path);
  useEffect(() => { setSrc(bannerSrc(banner)); setFallback(!banner?.art_path); }, [banner?.id, banner?.art_path]); // eslint-disable-line
  return (
    <div style={{ position: "relative", height, borderRadius: radius, overflow: "hidden", background: "#cfe8c0", ...style }}>
      <img src={src} alt="" draggable={false}
        onError={() => { if (!fallback) { setSrc(bannerFallbackUrl(id)); setFallback(true); } }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "72% 50%" }} />
      {scrim && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(6,24,4,.72) 0%,rgba(6,24,4,.45) 42%,rgba(6,24,4,0) 75%)" }} />}
      {showTag && fallback && (
        <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", background: "rgba(0,0,0,.55)", color: "#fff", padding: "3px 8px", borderRadius: 10 }}>Placeholder art</span>
      )}
      {children}
    </div>
  );
}
