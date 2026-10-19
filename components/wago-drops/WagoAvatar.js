// Account avatar for WAGO Drops. Shows the Google profile picture; if there isn't one (or it fails
// to load, which Google's image host sometimes does), shows the Touch Grass mark instead.
import { useState } from "react";

export default function WagoAvatar({ src, size = 40, border = "1px solid rgba(255,255,255,0.12)", style }) {
  const [failed, setFailed] = useState(false);
  const base = { width: size, height: size, borderRadius: "50%", border, flexShrink: 0, objectFit: "cover", ...style };
  if (src && !failed) {
    return <img src={src} alt="" style={base} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  }
  return (
    <span aria-hidden="true" style={{ ...base, display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "rgba(125,200,50,0.18)" }}>
      <img src="/touchgrass-transparent.png" alt="" style={{ width: "62%", height: "62%", objectFit: "contain" }} />
    </span>
  );
}
